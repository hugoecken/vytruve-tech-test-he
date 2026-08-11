# REST Endpoint Policy

## Resources and routes

- Use plural nouns for collections and stable identifiers for members.
- Use nested routes only when the child is owned by or meaningful only within the parent.
- Represent actions as resources or state transitions when that improves clarity; do not force awkward CRUD semantics.
- Keep public paths independent of TypeORM table names and external-provider routes.

## HTTP behavior

- `200 OK`: successful retrieval or update with a response body.
- `201 Created`: successful resource creation; provide a `Location` header when practical.
- `204 No Content`: successful operation with no response representation.
- `400 Bad Request`: malformed syntax or structurally invalid request.
- `401 Unauthorized`: missing or invalid authentication.
- `403 Forbidden`: authenticated but not allowed.
- `404 Not Found`: missing resource, including cases where concealment prevents ownership disclosure.
- `409 Conflict`: uniqueness or state conflict.
- `413 Content Too Large`: upload exceeds the accepted limit.
- `415 Unsupported Media Type`: unsupported upload representation.
- `422 Unprocessable Content`: syntactically valid input that violates content-level rules.
- `502 Bad Gateway` or `503 Service Unavailable`: translated provider failures, selected by semantics.

Do not return `200` for failures. Do not leak stack traces, database errors, filesystem paths, or provider response bodies.

## OpenAPI operation documentation

- Give every endpoint a stable `operationId` and a concise action-oriented `summary`.
- Add an operation `description` when ownership, pagination, streaming, idempotency, reconciliation, or another observable behavior is not obvious from the summary.
- Give every documented success and error response an explicit description of the endpoint outcome.
- Describe why each Problem Details status can occur in the endpoint context. Do not use a format-only description such as `Problem Details response`; the shared schema already communicates the format.
- Keep descriptions short, factual, and free of implementation details, sensitive data, and promises the executable contract does not enforce.

## Validation

- Use concrete DTO classes with `class-validator`.
- Configure one global `ValidationPipe` with transformation, whitelisting, and rejection of non-whitelisted properties.
- Validate route parameters and uploaded files with Nest pipes.
- Validate cross-field and business invariants in the application layer.
- Repeat all trust-boundary validation on the server regardless of frontend validation.

## Problem Details

Serialize public errors as `application/problem+json` following RFC 9457, with:

- `type`: stable documentation URI or `about:blank`;
- `title`: short category;
- `status`: HTTP status;
- `detail`: safe user-relevant explanation;
- `instance`: request path or request-specific identifier when useful;
- `code`: stable application code used by clients and tests.

Validation errors may include a stable structured field list, but must not reproduce sensitive values.

## Collections

- Return deterministic ordering.
- Keep collection queries bounded.
- Return an unpaginated collection only when the product gives it an explicit maximum size.
- Load `rest-pagination-policy.md` when a collection is not explicitly bounded. Keep strategy-specific facts in the repository overlay.
