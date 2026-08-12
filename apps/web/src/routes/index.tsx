import { createFileRoute } from '@tanstack/react-router';

/** Neutral index route reserved until product routes are implemented. */
export const Route = createFileRoute('/')({
  component: IndexRouteComponent,
});

/**
 * Keeps the foundation free of provisional product UI.
 *
 * @returns No visible content during the frontend foundation stage.
 */
function IndexRouteComponent(): null {
  return null;
}
