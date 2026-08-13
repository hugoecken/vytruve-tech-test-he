import { createFileRoute } from '@tanstack/react-router';

/** Protected patient destination reserved for the next frontend slice. */
export const Route = createFileRoute('/_authenticated/patients')({
  component: PatientsOutletComponent,
});

/**
 * Keeps the protected shell free of provisional patient UI.
 *
 * @returns No route content until the patient slice is implemented.
 */
function PatientsOutletComponent(): null {
  return null;
}
