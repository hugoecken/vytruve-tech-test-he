import { Injectable, PipeTransform } from '@nestjs/common';
import type { PatientPhotoInput } from '../../application/models/patient.model';
import { PatientPhotoValidator } from '../../application/validation/patient-photo.validator';

/** Converts one optional multipart photo into an authoritative validated value. */
@Injectable()
export class PatientPhotoUploadPipe
  implements
    PipeTransform<
      Express.Multer.File | undefined,
      Promise<PatientPhotoInput | undefined>
    >
{
  /**
   * Creates the upload boundary around the feature content validator.
   *
   * @param validator Authoritative bounded image validator.
   */
  constructor(private readonly validator: PatientPhotoValidator) {}

  /**
   * Validates one optional buffered file without retaining its original name.
   *
   * @param file Optional multipart upload from Multer memory storage.
   * @returns Validated photo or undefined when no photo was submitted.
   */
  async transform(
    file?: Express.Multer.File,
  ): Promise<PatientPhotoInput | undefined> {
    if (file === undefined) {
      return undefined;
    }
    return this.validator.validate(file.buffer, file.mimetype);
  }
}
