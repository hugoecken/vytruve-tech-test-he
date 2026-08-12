import { HttpStatus, Injectable } from '@nestjs/common';
import { ProblemCode } from '../../../../http/problem-code';
import { ProblemDetailsException } from '../../../../http/problem-details.exception';
import type { PatientCursorModel } from '../../application/models/patient.model';

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

/** Versioned internal payload carried by an opaque patient cursor. */
interface PatientCursorPayload {
  createdAt: string;
  id: string;
  version: 1;
}

/** Encodes and validates opaque patient pagination cursors. */
@Injectable()
export class PatientCursorCodec {
  /**
   * Encodes the last visible row into a versioned transport token.
   *
   * @param cursor Deterministic patient ordering boundary.
   * @returns Opaque versioned cursor safe for the public API.
   */
  encode(cursor: PatientCursorModel): string {
    const payload: PatientCursorPayload = {
      createdAt: cursor.createdAt.toISOString(),
      id: cursor.id,
      version: 1,
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  /**
   * Validates the cursor schema, timestamp, UUID, and version.
   *
   * @param cursor Untrusted cursor query value.
   * @returns Deterministic row boundary for the TypeORM query.
   * @throws INVALID_CURSOR when the cursor cannot be decoded safely.
   */
  decode(cursor: string): PatientCursorModel {
    try {
      if (!BASE64URL_PATTERN.test(cursor)) {
        throw new Error('Malformed cursor');
      }
      const payload: unknown = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      );
      if (!isPatientCursorPayload(payload)) {
        throw new Error('Invalid cursor payload');
      }
      const createdAt = new Date(payload.createdAt);
      if (
        Number.isNaN(createdAt.getTime()) ||
        createdAt.toISOString() !== payload.createdAt
      ) {
        throw new Error('Invalid cursor timestamp');
      }
      return { createdAt, id: payload.id };
    } catch {
      throw invalidCursor();
    }
  }
}

/**
 * Validates the exact decoded cursor payload without accepting extra fields.
 *
 * @param value Parsed but untrusted JSON cursor body.
 * @returns Whether the payload matches the accepted version-one schema.
 */
function isPatientCursorPayload(value: unknown): value is PatientCursorPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const expected = ['createdAt', 'id', 'version'];
  return (
    keys.length === expected.length &&
    keys.every((key, index) => key === expected[index]) &&
    typeof record.createdAt === 'string' &&
    typeof record.id === 'string' &&
    UUID_V4_PATTERN.test(record.id) &&
    record.version === 1
  );
}

/** @returns The single safe response for every invalid cursor category. */
function invalidCursor(): ProblemDetailsException {
  return new ProblemDetailsException({
    code: ProblemCode.INVALID_CURSOR,
    detail: 'The pagination cursor is invalid or no longer applicable.',
    status: HttpStatus.BAD_REQUEST,
    title: 'Invalid cursor',
  });
}
