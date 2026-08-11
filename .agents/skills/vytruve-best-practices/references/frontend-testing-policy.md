# Frontend Testing Policy

## Test layers

- Use Vitest for frontend execution and Testing Library for component and feature behavior.
- Test pure mapping or formatting logic directly.
- Test components through accessible user interactions and observable output.
- Use Playwright for a small set of complete browser journeys against the real local API and PostgreSQL.

## Component and feature tests

- Query by role, accessible name, label, or meaningful text before test IDs.
- Exercise loading, empty, success, validation, server error, retry, and disabled-submission states where relevant.
- Mock at the network boundary with a consistent tool or inject an owned API boundary; do not mock TanStack Query internals.
- Assert cache invalidation through resulting UI behavior instead of implementation calls where practical.
- Avoid large snapshots and assertions on CSS class names unless the class itself is the behavior.

## Authentication tests

Verify that the UI:

- restores a session through the API;
- redirects or presents login when unauthenticated;
- never reads or writes an authentication token in browser storage;
- handles session expiry during an action without losing safe recoverable state.

## Playwright journeys

Load the repository's product overlay and implement the smallest set of browser journeys that covers its critical user outcomes, ownership boundaries, one representative validation failure, and one recoverable external failure.

Use synthetic seeded identities and resources. Keep tests deterministic, isolate their records, and replace real external providers with controlled substitutes.

## Accessibility

Accessible selectors are the baseline. Add focused automated accessibility checks where they provide signal, but do not treat them as a substitute for keyboard flow, focus behavior, and semantic review.

## Stability

- Wait on user-visible states or documented network outcomes, never arbitrary sleeps.
- Control dates, identifiers, and provider responses where nondeterminism affects assertions.
- Keep each test independent and clean up only its own data.
