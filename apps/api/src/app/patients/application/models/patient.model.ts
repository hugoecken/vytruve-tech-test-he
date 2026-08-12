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

/** Application input for one server-paginated patient collection read. */
export interface ListPatientsQuery {
  page: number;
  pageSize: number;
}

/** Server-paginated patient collection page without a fabricated total. */
export interface PatientPageModel {
  hasNext: boolean;
  items: PatientModel[];
  page: number;
  pageSize: number;
}
