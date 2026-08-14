import { createFileRoute, Outlet } from '@tanstack/react-router';

/** Protected patient route layout. */
export const Route = createFileRoute('/_authenticated/patients')({
  component: PatientsLayoutComponent,
});

/**
 * Renders the active patient directory or workspace child route.
 *
 * @returns The active nested patient route.
 */
function PatientsLayoutComponent(): React.JSX.Element {
  return <Outlet />;
}
