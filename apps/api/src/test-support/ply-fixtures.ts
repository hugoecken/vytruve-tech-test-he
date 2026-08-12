/** Supported binary byte order used by synthetic PLY fixtures. */
type BinaryEncoding = 'binary_big_endian' | 'binary_little_endian';

/** Smallest representative non-empty ASCII triangle accepted by the API. */
export const ASCII_TRIANGLE_PLY = Buffer.from(
  [
    'ply',
    'format ascii 1.0',
    'element vertex 3',
    'property float x',
    'property float y',
    'property float z',
    'element face 1',
    'property list uchar int vertex_indices',
    'end_header',
    '0 0 0',
    '1 0 0',
    '0 1 0',
    '3 0 1 2',
    '',
  ].join('\n'),
  'ascii',
);

/**
 * Builds a minimal binary triangle without retaining any supplied scan artifact.
 *
 * @param encoding Supported PLY byte order.
 * @returns Complete synthetic PLY 1.0 bytes.
 */
export function createBinaryTrianglePly(encoding: BinaryEncoding): Buffer {
  const header = Buffer.from(
    [
      'ply',
      `format ${encoding} 1.0`,
      'element vertex 3',
      'property float x',
      'property float y',
      'property float z',
      'element face 1',
      'property list uchar int vertex_indices',
      'end_header',
      '',
    ].join('\n'),
    'ascii',
  );
  const body = Buffer.alloc(49);
  const littleEndian = encoding === 'binary_little_endian';
  const coordinates = [0, 0, 0, 1, 0, 0, 0, 1, 0];
  coordinates.forEach((coordinate, index) => {
    const offset = index * 4;
    if (littleEndian) {
      body.writeFloatLE(coordinate, offset);
    } else {
      body.writeFloatBE(coordinate, offset);
    }
  });
  body.writeUInt8(3, 36);
  [0, 1, 2].forEach((vertexIndex, index) => {
    const offset = 37 + index * 4;
    if (littleEndian) {
      body.writeInt32LE(vertexIndex, offset);
    } else {
      body.writeInt32BE(vertexIndex, offset);
    }
  });
  return Buffer.concat([header, body]);
}
