import type { Page } from '../../../../pagination/page';

/** Owner-scoped patient record used inside the patient application boundary. */
export interface PatientModel {
  age: number;
  createdAt: Date;
  firstName: string;
  id: string;
  lastName: string;
}

/** Validated patient creation input with server-derived ownership. */
export interface CreatePatientCommand {
  accountId: string;
  age: number;
  firstName: string;
  lastName: string;
}

/** Server-paginated patient collection page without a fabricated total. */
export type PatientPageModel = Page<PatientModel>;
