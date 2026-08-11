# External HTTP Integration Policy

## Adapter boundary

- Place provider HTTP details behind an adapter injected into the owning application use case.
- Use the framework's configured HTTP primitive and centralize base URL, credentials, and timeout settings.
- Keep authentication headers, multipart fields, provider paths, and provider response shapes inside the adapter.
- Map provider payloads to provider-neutral application values before returning.
- Never expose credentials or raw provider bodies to controllers, clients, logs, or public errors.

## Configuration and validation

- Validate the provider base URL, credential presence, and positive finite timeout during startup.
- Keep secret values out of source code and committed environment examples.
- Validate every provider response at runtime before trusting identifiers, dates, enums, or nested fields.
- Treat a syntactically successful but invalid response as an integration failure.

## Operation identity

- Classify each operation as idempotent, provider-idempotent through an idempotency key, or non-idempotent.
- Generate and persist a unique correlation reference before a non-idempotent submission when the provider supports lookup by reference.
- Store the provider identifier when known.
- Do not discover a caller's resource through an unscoped provider-wide list.

## Timeout and error translation

- Apply a finite connection and response timeout to every request.
- Distinguish local validation failure, provider rejection, authentication/configuration failure, throttling or capacity exhaustion, temporary unavailability, malformed response, and ambiguous transport failure.
- Translate provider outcomes into stable application errors and appropriate public HTTP semantics.
- Log only safe technical identifiers, operation name, duration, status category, attempt count, and outcome.

## Retry and ambiguity

- Retry reads only for documented transient failures, with a small bound and backoff.
- Retry a write automatically only when idempotency is guaranteed and the policy is explicit.
- Never blindly retry a non-idempotent write after a timeout, connection reset, or response parsing failure: the provider may have accepted it.
- Move ambiguous writes into a reconciliation state and resolve them through the provider's lookup capability using the persisted unique reference.
- Resume the known operation only after the lookup response is validated and coherent with local state.
- Permit a deliberate new attempt only after absence is established or after assigning a new operation identity.
- Never create an unbounded polling or retry loop.

## State mapping

- Define an explicit exhaustive mapping from provider states to application states.
- Preserve unknown or malformed states safely rather than treating them as success.
- Keep provider timestamps in a normalized timezone-safe representation.
- Store the last known state and observation time so clients can distinguish active, terminal, and temporarily unavailable conditions.

## Testing

Use a controlled HTTP server, never the real provider, to verify request authentication without credential values, request serialization, runtime response validation, timeout, error translation, retry bounds, no duplicate ambiguous write, reconciliation, state mapping, and safe logging. Use an in-memory fake adapter for application-unit tests.
