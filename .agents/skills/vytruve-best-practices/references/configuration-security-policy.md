# Configuration, Authentication, and Security Policy

## Configuration

- Load environment variables centrally with `@nestjs/config`.
- Validate and normalize required values during startup. Fail fast with the variable name and expected shape, never its value.
- Expose typed configuration grouped by concern rather than reading `process.env` throughout feature code.
- Keep secrets in local environment files or the deployment secret store. Commit only safe placeholders in `.env.example`.
- Never provide insecure production defaults for token secrets, external-service credentials, CORS origins, or database credentials.
- Treat object-storage access keys and secrets as deployment credentials. Keep them server-side, validate them at startup, and scope deployed identities to the required private bucket operations.

## Passwords

- Hash passwords with a maintained library recommended by Nest, using Argon2id by default or bcrypt when deployment constraints justify it.
- Use library defaults or documented parameters selected for the runtime; never implement cryptography or password derivation manually.
- Never log, return, or store a plaintext password.
- Return a generic authentication failure so account existence is not disclosed.

## JWT session

- Issue a short-lived JWT in an HTTP-only cookie after successful authentication.
- Set `HttpOnly`, an explicit `SameSite` policy, a narrow `Path`, and `Secure` in production.
- Keep the cookie name and lifetime centralized and verify their owned configuration with focused tests.
- Clear the cookie with matching attributes during logout.
- Never put the token in `localStorage`, `sessionStorage`, URLs, frontend logs, JavaScript-readable cookies, or response bodies.
- Derive the authenticated subject server-side from the verified token. Do not trust a user identifier supplied by the client.

## Authorization

- Apply authentication through a guard and keep public endpoints explicitly marked.
- Enforce resource ownership for every protected record, file, and external operation.
- Prefer owner-scoped repository queries so unauthorized records are not loaded.
- Use `404` instead of `403` where revealing the existence of another user's resource would leak information.

## Browser security

- Restrict CORS to configured frontend origins and enable credentials intentionally. Never combine credentialed requests with wildcard origins.
- Apply secure HTTP headers with standard Nest-compatible middleware before routes.
- Protect authentication endpoints with proportionate rate limits.
- Use CSRF protection appropriate to the selected `SameSite` and deployment model before enabling cross-site credential flows.
- Validate all input on the API even when the UI already validates it.

## Secret and data handling

Never log or commit personal identity, contact data, original filenames, uploaded content, cookies, tokens, password material, connection strings, object-storage credentials, or external-service credentials. Public errors contain safe stable codes, not underlying secret-bearing exception messages.
