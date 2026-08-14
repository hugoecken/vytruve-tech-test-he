import { createFileRoute } from '@tanstack/react-router';
import { PatientsPage } from '@/modules/patients/ui/patients-page';

/** Protected patient directory index route. */
export const Route = createFileRoute('/_authenticated/patients/')({
  component: PatientsRouteComponent,
});

/**
 * Renders the authenticated patient directory.
 *
 * @returns The patient collection page.
 */
function PatientsRouteComponent(): React.JSX.Element {
  return <PatientsPage />;
}
