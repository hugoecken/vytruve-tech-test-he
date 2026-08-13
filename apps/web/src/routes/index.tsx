import { createFileRoute, redirect } from '@tanstack/react-router';
import { getCachedAccountSession } from '@/modules/auth/api/session-cache';

/** Neutral index route reserved until product routes are implemented. */
export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    const session = getCachedAccountSession(context.queryClient);
    throw redirect({ to: session === null ? '/sign-in' : '/patients' });
  },
});
