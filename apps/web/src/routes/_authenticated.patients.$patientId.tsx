import { createFileRoute } from '@tanstack/react-router';
import { PatientWorkspacePage } from '@/modules/patients/ui/patient-workspace-page';

/** Protected patient workspace route. */
export const Route = createFileRoute('/_authenticated/patients/$patientId')({
  component: PatientWorkspaceRouteComponent,
});

/**
 * Connects the typed patient route parameter to the clinical workspace.
 *
 * @returns The patient workspace for the active route identity.
 */
function PatientWorkspaceRouteComponent() {
  const { patientId } = Route.useParams();
  return <PatientWorkspacePage key={patientId} patientId={patientId} />;
}
