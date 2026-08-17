import { HttpStatus, Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { ProblemCode } from '@api/http/problem-code';
import { ProblemDetailsException } from '@api/http/problem-details.exception';
import type {
  PatientPhotoFormat,
  PatientPhotoInput,
} from '../models/patient.model';

/** Inclusive byte limit selected for one private patient photo. */
export const MAX_PATIENT_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

const MEDIA_TYPES: Record<PatientPhotoFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** Validates bounded untrusted image content through Sharp. */
@Injectable()
export class PatientPhotoValidator {
  /**
   * Detects format, checks the declaration, and forces complete pixel decoding.
   *
   * @param content Bounded multipart bytes.
   * @param declaredMediaType Untrusted browser-provided media type.
   * @returns Validated content with server-owned metadata.
   * @throws Stable patient-photo validation problems.
   */
  async validate(
    content: Buffer,
    declaredMediaType: string,
  ): Promise<PatientPhotoInput> {
    if (content.length > MAX_PATIENT_PHOTO_SIZE_BYTES) {
      throw photoProblem(
        HttpStatus.PAYLOAD_TOO_LARGE,
        ProblemCode.PATIENT_PHOTO_TOO_LARGE,
        'Patient photo too large',
        'The patient photo exceeds the 5 MiB size limit.',
      );
    }
    if (content.length === 0) {
      throw invalidContentProblem();
    }
    if (!Object.values(MEDIA_TYPES).includes(declaredMediaType)) {
      throw unsupportedTypeProblem();
    }

    try {
      const image = sharp(content, { failOn: 'error' });
      const metadata = await image.metadata();
      if (!isPatientPhotoFormat(metadata.format)) {
        throw unsupportedTypeProblem();
      }
      const mediaType = MEDIA_TYPES[metadata.format];
      if (declaredMediaType !== mediaType) {
        throw unsupportedTypeProblem();
      }
      await image.stats();
      return {
        content,
        format: metadata.format,
        mediaType,
        sizeBytes: content.length,
      };
    } catch (error) {
      if (error instanceof ProblemDetailsException) {
        throw error;
      }
      throw invalidContentProblem();
    }
  }
}

/** Narrows Sharp's detected format to the accepted still-image set. */
function isPatientPhotoFormat(value?: string): value is PatientPhotoFormat {
  return value === 'jpeg' || value === 'png' || value === 'webp';
}

/** Creates the stable unsupported-image problem. */
function unsupportedTypeProblem(): ProblemDetailsException {
  return photoProblem(
    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    ProblemCode.PATIENT_PHOTO_UNSUPPORTED_TYPE,
    'Unsupported patient photo',
    'The patient photo must be a JPEG, PNG, or WebP image.',
  );
}

/** Creates the stable invalid-image problem. */
function invalidContentProblem(): ProblemDetailsException {
  return photoProblem(
    HttpStatus.UNPROCESSABLE_ENTITY,
    ProblemCode.PATIENT_PHOTO_INVALID_CONTENT,
    'Invalid patient photo',
    'The patient photo could not be decoded safely.',
  );
}

/** Creates one safe patient-photo validation problem. */
function photoProblem(
  status: number,
  code: ProblemCode,
  title: string,
  detail: string,
): ProblemDetailsException {
  return new ProblemDetailsException({ code, detail, status, title });
}
