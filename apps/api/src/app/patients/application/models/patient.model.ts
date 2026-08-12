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

/** Decoded deterministic cursor boundary for a patient collection. */
export interface PatientCursorModel {
  createdAt: Date;
  id: string;
}

/** Application input for one forward patient collection read. */
export interface ListPatientsQuery {
  cursor?: string;
  pageSize: number;
}

/** Forward-only patient collection page without a fabricated total. */
export interface PatientPageModel {
  hasNext: boolean;
  items: PatientModel[];
  nextCursor: string | null;
}
