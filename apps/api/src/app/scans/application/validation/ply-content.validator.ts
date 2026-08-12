import { HttpStatus, Injectable } from '@nestjs/common';
import { ProblemCode } from '../../../../http/problem-code';
import { ProblemDetailsException } from '../../../../http/problem-details.exception';
import {
  ScanEncoding,
  type ScanEncoding as ScanEncodingValue,
} from '../models/scan.model';

const HEADER_LIMIT_BYTES = 65_536;
const NUMERIC_TOKEN_LIMIT_BYTES = 128;

/** Scalar layouts accepted by PLY 1.0. */
const SCALAR_TYPES = {
  char: { bytes: 1, integer: true, signed: true },
  double: { bytes: 8, integer: false, signed: true },
  float: { bytes: 4, integer: false, signed: true },
  float32: { bytes: 4, integer: false, signed: true },
  float64: { bytes: 8, integer: false, signed: true },
  int: { bytes: 4, integer: true, signed: true },
  int16: { bytes: 2, integer: true, signed: true },
  int32: { bytes: 4, integer: true, signed: true },
  int8: { bytes: 1, integer: true, signed: true },
  short: { bytes: 2, integer: true, signed: true },
  uchar: { bytes: 1, integer: true, signed: false },
  uint: { bytes: 4, integer: true, signed: false },
  uint16: { bytes: 2, integer: true, signed: false },
  uint32: { bytes: 4, integer: true, signed: false },
  uint8: { bytes: 1, integer: true, signed: false },
  ushort: { bytes: 2, integer: true, signed: false },
} as const;

type ScalarType = keyof typeof SCALAR_TYPES;

/** One scalar value declared on a PLY element. */
interface ScalarProperty {
  kind: 'scalar';
  name: string;
  type: ScalarType;
}

/** One length-prefixed list declared on a PLY element. */
interface ListProperty {
  countType: ScalarType;
  itemType: ScalarType;
  kind: 'list';
  name: string;
}

type PropertyDeclaration = ListProperty | ScalarProperty;

/** Bounded structural declaration for one PLY element. */
interface ElementDeclaration {
  count: number;
  name: string;
  properties: PropertyDeclaration[];
}

/** Trusted PLY header facts used to validate the body. */
interface PlyHeader {
  bodyOffset: number;
  elements: ElementDeclaration[];
  encoding: ScanEncodingValue;
  faceIndicesProperty: ListProperty;
  vertexCount: number;
}

/** Trusted metadata returned after full bounded PLY validation. */
export interface ValidatedPly {
  encoding: ScanEncodingValue;
}

/** Distinguishes unsupported file formats from malformed supported PLY content. */
class UnsupportedPlyError extends Error {}

/** Marks malformed content that was rejected by an explicit parser invariant. */
class InvalidPlyError extends Error {}

/** Validates supported PLY 1.0 meshes without trusting extension or MIME metadata. */
@Injectable()
export class PlyContentValidator {
  /**
   * Validates the complete size-bounded PLY structure and non-empty mesh.
   *
   * @param content Untrusted bytes already bounded by the upload transport.
   * @returns Trusted PLY encoding metadata.
   * @throws SCAN_UNSUPPORTED_TYPE when the content is not a supported PLY 1.0 encoding.
   * @throws SCAN_INVALID_CONTENT when the supported PLY structure is inconsistent.
   */
  validate(content: Buffer): ValidatedPly {
    try {
      const header = parseHeader(content);
      if (header.encoding === ScanEncoding.ASCII) {
        validateAsciiBody(content, header);
      } else {
        validateBinaryBody(content, header);
      }
      return { encoding: header.encoding };
    } catch (error) {
      if (error instanceof UnsupportedPlyError) {
        throw new ProblemDetailsException({
          code: ProblemCode.SCAN_UNSUPPORTED_TYPE,
          detail: 'The uploaded file is not a supported PLY 1.0 scan.',
          status: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
          title: 'Unsupported scan type',
        });
      }
      if (error instanceof InvalidPlyError) {
        throw new ProblemDetailsException({
          code: ProblemCode.SCAN_INVALID_CONTENT,
          detail: 'The uploaded PLY scan is malformed, empty, or inconsistent.',
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          title: 'Invalid scan content',
        });
      }
      throw error;
    }
  }
}

/**
 * Parses and validates the bounded ASCII header shared by all supported encodings.
 *
 * @param content Complete size-bounded upload.
 * @returns Trusted declarations needed for body validation.
 * @throws When the header is unsupported, malformed, or does not describe a mesh.
 */
function parseHeader(content: Buffer): PlyHeader {
  if (
    content.length < 4 ||
    content[0] !== 0x70 ||
    content[1] !== 0x6c ||
    content[2] !== 0x79 ||
    (content[3] !== 0x0a && content[3] !== 0x0d)
  ) {
    throw new UnsupportedPlyError();
  }
  const bodyOffset = findBodyOffset(content);
  const headerBytes = content.subarray(0, bodyOffset);
  assertAsciiBytes(headerBytes);
  const lines = headerBytes
    .toString('ascii')
    .replaceAll('\r\n', '\n')
    .split('\n');

  if (lines[0] !== 'ply') {
    throw new UnsupportedPlyError();
  }
  const format =
    /^format (ascii|binary_little_endian|binary_big_endian) 1\.0$/.exec(
      lines[1] ?? '',
    );
  if (format === null) {
    throw new UnsupportedPlyError();
  }

  const elements: ElementDeclaration[] = [];
  const elementNames = new Set<string>();
  let currentElement: ElementDeclaration | undefined;
  for (const line of lines.slice(2)) {
    if (line === 'end_header') {
      break;
    }
    if (line === '' || /^(comment|obj_info)( |$)/.test(line)) {
      continue;
    }

    const elementMatch = /^element ([A-Za-z_][A-Za-z0-9_]*) (\d+)$/.exec(line);
    if (elementMatch !== null) {
      const count = Number(elementMatch[2]);
      if (
        !Number.isSafeInteger(count) ||
        count < 0 ||
        count > content.length ||
        elementNames.has(elementMatch[1])
      ) {
        throw new InvalidPlyError('Invalid PLY element declaration');
      }
      currentElement = {
        count,
        name: elementMatch[1],
        properties: [],
      };
      elementNames.add(currentElement.name);
      elements.push(currentElement);
      continue;
    }

    if (currentElement === undefined) {
      throw new InvalidPlyError('PLY property has no element');
    }
    currentElement.properties.push(parseProperty(line, currentElement));
  }

  const vertex = elements.find(({ name }) => name === 'vertex');
  const face = elements.find(({ name }) => name === 'face');
  const bodyLength = content.length - bodyOffset;
  const declaredRecords = elements.reduce(
    (total, element) => total + element.count,
    0,
  );
  if (
    vertex === undefined ||
    face === undefined ||
    vertex.count < 1 ||
    face.count < 1 ||
    !Number.isSafeInteger(declaredRecords) ||
    declaredRecords > bodyLength ||
    elements.some(
      ({ count, properties }) => count > 0 && properties.length === 0,
    )
  ) {
    throw new InvalidPlyError('PLY does not contain a non-empty mesh');
  }
  for (const coordinate of ['x', 'y', 'z']) {
    if (
      !vertex.properties.some(
        (property) =>
          property.kind === 'scalar' && property.name === coordinate,
      )
    ) {
      throw new InvalidPlyError('PLY vertex coordinates are incomplete');
    }
  }
  const faceIndicesProperty = face.properties.find(
    (property): property is ListProperty =>
      property.kind === 'list' &&
      (property.name === 'vertex_index' || property.name === 'vertex_indices'),
  );
  if (
    faceIndicesProperty === undefined ||
    !SCALAR_TYPES[faceIndicesProperty.itemType].integer
  ) {
    throw new InvalidPlyError('PLY faces do not declare vertex indices');
  }

  return {
    bodyOffset,
    elements,
    encoding: parseScanEncoding(format[1]),
    faceIndicesProperty,
    vertexCount: vertex.count,
  };
}

/**
 * Maps a validated PLY format token to the public scan encoding.
 *
 * @param value Format token captured from the PLY header.
 * @returns Supported scan encoding.
 * @throws When the format token is not supported.
 */
function parseScanEncoding(value: string): ScanEncodingValue {
  switch (value) {
    case 'ascii':
      return ScanEncoding.ASCII;
    case 'binary_little_endian':
      return ScanEncoding.BINARY_LITTLE_ENDIAN;
    case 'binary_big_endian':
      return ScanEncoding.BINARY_BIG_ENDIAN;
    default:
      throw new UnsupportedPlyError();
  }
}

/**
 * Parses one supported scalar or list property declaration.
 *
 * @param line Header line declaring a property.
 * @param element Element that owns the property.
 * @returns Validated property declaration.
 * @throws When syntax, type, or name uniqueness is invalid.
 */
function parseProperty(
  line: string,
  element: ElementDeclaration,
): PropertyDeclaration {
  const scalar = /^property ([a-z0-9]+) ([A-Za-z_][A-Za-z0-9_]*)$/.exec(line);
  const list =
    /^property list ([a-z0-9]+) ([a-z0-9]+) ([A-Za-z_][A-Za-z0-9_]*)$/.exec(
      line,
    );
  const name = scalar?.[2] ?? list?.[3];
  if (
    name === undefined ||
    element.properties.some((property) => property.name === name)
  ) {
    throw new InvalidPlyError('Invalid or duplicate PLY property');
  }

  if (scalar !== null && isScalarType(scalar[1])) {
    return { kind: 'scalar', name, type: scalar[1] };
  }
  if (
    list !== null &&
    isScalarType(list[1]) &&
    SCALAR_TYPES[list[1]].integer &&
    isScalarType(list[2])
  ) {
    return {
      countType: list[1],
      itemType: list[2],
      kind: 'list',
      name,
    };
  }
  throw new InvalidPlyError('Unsupported PLY property type');
}

/**
 * Validates every ASCII record and face index using a bounded token cursor.
 *
 * @param content Complete upload bytes.
 * @param header Trusted header declarations.
 * @throws When a scalar, list, face, or trailing byte is invalid.
 */
function validateAsciiBody(content: Buffer, header: PlyHeader): void {
  const cursor = new AsciiTokenCursor(content, header.bodyOffset);
  for (const element of header.elements) {
    for (let record = 0; record < element.count; record += 1) {
      validateAsciiRecord(cursor, element, header);
    }
  }
  if (cursor.next() !== undefined) {
    throw new InvalidPlyError('PLY body has trailing values');
  }
}

/**
 * Validates one ASCII element record against its property declarations.
 *
 * @param cursor Token reader confined to the uploaded buffer.
 * @param element Current element declaration.
 * @param header Header facts used for face-index checks.
 * @throws When a scalar or list value violates its declared type.
 */
function validateAsciiRecord(
  cursor: AsciiTokenCursor,
  element: ElementDeclaration,
  header: PlyHeader,
): void {
  for (const property of element.properties) {
    if (property.kind === 'scalar') {
      parseAsciiScalar(cursor.requireNext(), property.type);
      continue;
    }

    const count = parseAsciiInteger(cursor.requireNext(), property.countType);
    assertListCount(count, cursor.remainingBytes);
    assertFaceListCount(element, property, header, count);
    for (let index = 0; index < count; index += 1) {
      const value = parseAsciiScalar(cursor.requireNext(), property.itemType);
      if (element.name === 'face' && property === header.faceIndicesProperty) {
        assertFaceIndex(value, count, header.vertexCount);
      }
    }
  }
}

/**
 * Validates every binary record using its declared byte order.
 *
 * @param content Complete upload bytes.
 * @param header Trusted header declarations.
 * @throws When a record is truncated, inconsistent, or contains trailing bytes.
 */
function validateBinaryBody(content: Buffer, header: PlyHeader): void {
  const cursor = new BinaryCursor(
    content,
    header.bodyOffset,
    header.encoding === ScanEncoding.BINARY_LITTLE_ENDIAN,
  );
  for (const element of header.elements) {
    for (let record = 0; record < element.count; record += 1) {
      for (const property of element.properties) {
        if (property.kind === 'scalar') {
          cursor.read(property.type);
          continue;
        }
        const count = cursor.readInteger(property.countType);
        assertListCount(count, cursor.remainingBytes);
        assertFaceListCount(element, property, header, count);
        for (let index = 0; index < count; index += 1) {
          const value = cursor.read(property.itemType);
          if (
            element.name === 'face' &&
            property === header.faceIndicesProperty
          ) {
            assertFaceIndex(value, count, header.vertexCount);
          }
        }
      }
    }
  }
  if (cursor.remainingBytes !== 0) {
    throw new InvalidPlyError('PLY body has trailing bytes');
  }
}

/**
 * Requires at least three vertex indices for every declared face.
 *
 * @param element Current element declaration.
 * @param property Current list property.
 * @param header Header facts identifying the face-index list.
 * @param count Parsed list count.
 * @throws When a face cannot form a polygon.
 */
function assertFaceListCount(
  element: ElementDeclaration,
  property: ListProperty,
  header: PlyHeader,
  count: number,
): void {
  if (
    element.name === 'face' &&
    property === header.faceIndicesProperty &&
    count < 3
  ) {
    throw new InvalidPlyError('PLY face contains fewer than three vertices');
  }
}

/**
 * Enforces a polygonal face and a vertex index inside the declared vertex range.
 *
 * @param value Parsed face index.
 * @param listCount Number of indices in this face.
 * @param vertexCount Declared number of vertices.
 * @throws When the face has fewer than three vertices or references an absent one.
 */
function assertFaceIndex(
  value: number,
  listCount: number,
  vertexCount: number,
): void {
  if (
    listCount < 3 ||
    !Number.isInteger(value) ||
    value < 0 ||
    value >= vertexCount
  ) {
    throw new InvalidPlyError('PLY face references invalid vertices');
  }
}

/**
 * Keeps list traversal bounded by bytes that remain in the upload.
 *
 * @param count Parsed list size.
 * @param remainingBytes Bytes that can still contain list values.
 * @throws When the list count is negative or cannot fit in the remaining body.
 */
function assertListCount(count: number, remainingBytes: number): void {
  if (!Number.isSafeInteger(count) || count < 0 || count > remainingBytes) {
    throw new InvalidPlyError('Invalid PLY list count');
  }
}

/**
 * Parses one ASCII scalar according to its declared numeric type.
 *
 * @param token Untrusted numeric token.
 * @param type Declared PLY scalar type.
 * @returns Finite numeric value inside the declared range.
 * @throws When syntax, range, or finiteness is invalid.
 */
function parseAsciiScalar(token: string, type: ScalarType): number {
  if (SCALAR_TYPES[type].integer) {
    return parseAsciiInteger(token, type);
  }
  const value = Number(token);
  if (!Number.isFinite(value)) {
    throw new InvalidPlyError('Invalid PLY floating-point value');
  }
  return value;
}

/**
 * Parses one ASCII integer and enforces the exact declared range.
 *
 * @param token Untrusted integer token.
 * @param type Declared integer scalar type.
 * @returns Parsed integer.
 * @throws When the token is not a valid in-range integer.
 */
function parseAsciiInteger(token: string, type: ScalarType): number {
  const descriptor = SCALAR_TYPES[type];
  if (!descriptor.integer || !/^[+-]?\d+$/.test(token)) {
    throw new InvalidPlyError('Invalid PLY integer value');
  }
  const value = Number(token);
  const bits = descriptor.bytes * 8;
  const minimum = descriptor.signed ? -(2 ** (bits - 1)) : 0;
  const maximum = descriptor.signed ? 2 ** (bits - 1) - 1 : 2 ** bits - 1;
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new InvalidPlyError('PLY integer is outside its declared range');
  }
  return value;
}

/**
 * Locates the body while preventing an unbounded header scan.
 *
 * @param content Complete uploaded bytes.
 * @returns Offset immediately following the `end_header` line.
 * @throws When the terminator is absent from the bounded header region.
 */
function findBodyOffset(content: Buffer): number {
  const inspectedLength = Math.min(content.length, HEADER_LIMIT_BYTES);
  let lineStart = 0;
  for (let index = 0; index < inspectedLength; index += 1) {
    if (content[index] !== 0x0a) {
      continue;
    }
    const lineEnd =
      index > lineStart && content[index - 1] === 0x0d ? index - 1 : index;
    if (content.toString('ascii', lineStart, lineEnd) === 'end_header') {
      return index + 1;
    }
    lineStart = index + 1;
  }
  throw new InvalidPlyError('PLY header terminator is missing');
}

/**
 * Rejects non-ASCII or unsafe control bytes in textual PLY regions.
 *
 * @param bytes Header bytes that must remain plain ASCII.
 * @throws When a byte is outside the accepted textual range.
 */
function assertAsciiBytes(bytes: Buffer): void {
  for (const byte of bytes) {
    if (
      byte > 0x7f ||
      (byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d)
    ) {
      throw new InvalidPlyError('PLY text contains invalid bytes');
    }
  }
}

/**
 * Narrows a header token to one supported scalar type.
 *
 * @param value Untrusted header type name.
 * @returns Whether the name is part of the supported PLY scalar set.
 */
function isScalarType(value: string): value is ScalarType {
  return Object.hasOwn(SCALAR_TYPES, value);
}

/** Reads bounded ASCII numeric tokens without allocating the entire body as text. */
class AsciiTokenCursor {
  private offset: number;

  /**
   * Creates a cursor positioned at the first body byte.
   *
   * @param content Complete upload buffer.
   * @param bodyOffset Validated body start.
   */
  constructor(
    private readonly content: Buffer,
    bodyOffset: number,
  ) {
    this.offset = bodyOffset;
  }

  /** @returns Number of bytes still available for bounded list checks. */
  get remainingBytes(): number {
    return this.content.length - this.offset;
  }

  /**
   * Returns the next token after skipping ASCII whitespace.
   *
   * @returns Next ASCII token or undefined at the end of the body.
   * @throws When a token contains unsafe bytes or exceeds the numeric bound.
   */
  next(): string | undefined {
    while (
      this.offset < this.content.length &&
      isAsciiWhitespace(this.content[this.offset])
    ) {
      this.offset += 1;
    }
    if (this.offset === this.content.length) {
      return undefined;
    }
    const start = this.offset;
    while (
      this.offset < this.content.length &&
      !isAsciiWhitespace(this.content[this.offset])
    ) {
      const byte = this.content[this.offset];
      if (byte < 0x21 || byte > 0x7e) {
        throw new InvalidPlyError('PLY ASCII body contains invalid bytes');
      }
      this.offset += 1;
      if (this.offset - start > NUMERIC_TOKEN_LIMIT_BYTES) {
        throw new InvalidPlyError('PLY numeric token is too long');
      }
    }
    return this.content.toString('ascii', start, this.offset);
  }

  /**
   * Returns one required body token.
   *
   * @returns Next ASCII token.
   * @throws When the declared record is truncated.
   */
  requireNext(): string {
    const token = this.next();
    if (token === undefined) {
      throw new InvalidPlyError('PLY ASCII body is truncated');
    }
    return token;
  }
}

/** Reads declared scalar values directly from a bounded binary body. */
class BinaryCursor {
  private offset: number;

  /**
   * Creates a binary cursor with the encoding byte order.
   *
   * @param content Complete upload buffer.
   * @param bodyOffset Validated body start.
   * @param littleEndian Whether multibyte scalars use little-endian order.
   */
  constructor(
    private readonly content: Buffer,
    bodyOffset: number,
    private readonly littleEndian: boolean,
  ) {
    this.offset = bodyOffset;
  }

  /** @returns Number of unread body bytes. */
  get remainingBytes(): number {
    return this.content.length - this.offset;
  }

  /**
   * Reads one declared scalar and advances the cursor.
   *
   * @param type Declared PLY scalar type.
   * @returns Finite decoded numeric value.
   * @throws When the body is truncated or contains a non-finite float.
   */
  read(type: ScalarType): number {
    const descriptor = SCALAR_TYPES[type];
    if (this.remainingBytes < descriptor.bytes) {
      throw new InvalidPlyError('PLY binary body is truncated');
    }
    const view = new DataView(
      this.content.buffer,
      this.content.byteOffset + this.offset,
      descriptor.bytes,
    );
    const value = readDataView(view, type, this.littleEndian);
    this.offset += descriptor.bytes;
    if (!Number.isFinite(value)) {
      throw new InvalidPlyError('PLY binary body contains a non-finite value');
    }
    return value;
  }

  /**
   * Reads one scalar that must be declared as an integer.
   *
   * @param type Declared PLY integer type.
   * @returns Decoded integer.
   * @throws When the declaration is not integral.
   */
  readInteger(type: ScalarType): number {
    if (!SCALAR_TYPES[type].integer) {
      throw new InvalidPlyError('PLY list count is not an integer');
    }
    return this.read(type);
  }
}

/**
 * Reads one scalar from a DataView using PLY aliases and byte order.
 *
 * @param view Exact scalar byte view.
 * @param type Declared PLY scalar type.
 * @param littleEndian Whether multibyte scalars use little-endian order.
 * @returns Decoded scalar value.
 */
function readDataView(
  view: DataView,
  type: ScalarType,
  littleEndian: boolean,
): number {
  switch (type) {
    case 'char':
    case 'int8':
      return view.getInt8(0);
    case 'uchar':
    case 'uint8':
      return view.getUint8(0);
    case 'short':
    case 'int16':
      return view.getInt16(0, littleEndian);
    case 'ushort':
    case 'uint16':
      return view.getUint16(0, littleEndian);
    case 'int':
    case 'int32':
      return view.getInt32(0, littleEndian);
    case 'uint':
    case 'uint32':
      return view.getUint32(0, littleEndian);
    case 'float':
    case 'float32':
      return view.getFloat32(0, littleEndian);
    case 'double':
    case 'float64':
      return view.getFloat64(0, littleEndian);
  }
}

/**
 * Recognizes PLY ASCII whitespace bytes.
 *
 * @param byte Untrusted body byte.
 * @returns Whether the byte separates ASCII tokens.
 */
function isAsciiWhitespace(byte: number): boolean {
  return byte === 0x09 || byte === 0x0a || byte === 0x0d || byte === 0x20;
}
