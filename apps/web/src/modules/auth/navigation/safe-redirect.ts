const AUTHENTICATION_PATHS = new Set(['/sign-in', '/sign-up']);

/**
 * Accepts only an internal application destination suitable after sign-in.
 *
 * @param candidate Untrusted redirect search value.
 * @returns A normalized internal path, or `/patients` when it is unsafe.
 */
export function toSafeRedirect(candidate: unknown): string {
  if (
    typeof candidate !== 'string' ||
    !candidate.startsWith('/') ||
    candidate.startsWith('//')
  ) {
    return '/patients';
  }

  const destination = new URL(candidate, window.location.origin);
  if (
    destination.origin !== window.location.origin ||
    AUTHENTICATION_PATHS.has(destination.pathname)
  ) {
    return '/patients';
  }

  return `${destination.pathname}${destination.search}${destination.hash}`;
}
