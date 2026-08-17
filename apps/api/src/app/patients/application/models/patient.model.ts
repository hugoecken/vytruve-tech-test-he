import type { Page } from '@api/pagination/page';
import type { Readable } from 'node:stream';

/** Server-detected still-image formats accepted for private patient photos. */
export type PatientPhotoFormat = 'jpeg' | 'png' | 'webp';

/** Private current-photo metadata kept inside the application boundary. */
export interface PatientPhotoModel {
  format: PatientPhotoFormat;
  sizeBytes: number;
  storageKey: string;
}

/** Validated new-photo input whose bytes have not yet been persisted. */
export interface PatientPhotoInput {
  content: Buffer;
  format: PatientPhotoFormat;
  mediaType: string;
  sizeBytes: number;
}

/** Authorized current-photo stream returned only after owner scope succeeds. */
export interface PatientPhotoContent {
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
  stream: Readable;
}

/** Owner-scoped patient record used inside the patient application boundary. */
export interface PatientModel {
  age: number;
  createdAt: Date;
  firstName: string;
  id: string;
  lastName: string;
  photo: PatientPhotoModel | null;
}

/** Validated patient creation input with server-derived ownership. */
export interface CreatePatientCommand {
  accountId: string;
  age: number;
  firstName: string;
  lastName: string;
  photo?: PatientPhotoInput;
}

/** Complete owner-scoped patient update with one explicit photo decision. */
export interface UpdatePatientCommand {
  accountId: string;
  age: number;
  firstName: string;
  lastName: string;
  patientId: string;
  photo?: PatientPhotoInput;
  photoAction: 'keep' | 'remove' | 'replace';
}

/** Server-paginated patient collection page without a fabricated total. */
export type PatientPageModel = Page<PatientModel>;
