# Logging Policy

## Runtime logger

- Use Nest's built-in `Logger` in providers and controllers and a JSON-configured `ConsoleLogger` at application bootstrap.
- Create loggers with the owning class or feature as context.
- Do not add Pino, Winston, or another logging stack without an observed requirement that the built-in logger cannot meet.
- Keep one machine-readable JSON event per line.

## What to log

Log operational events that help diagnose the system:

- application start and configuration validation outcome;
- migration and service readiness outcome;
- authentication success/failure category without identity data;
- external-provider operation, safe technical reference, duration, status category, and reconciliation outcome;
- unexpected internal failures at the layer that converts them to an operational outcome.

Do not log routine controller entry/exit, every repository call, whole request/response objects, or expected validation errors at error level.

## Levels

- `error`: unexpected failures requiring investigation or an exhausted external operation.
- `warn`: degraded but handled behavior, suspicious auth activity, or an ambiguous provider result awaiting reconciliation.
- `log`: meaningful lifecycle and completed operational events.
- `debug` and `verbose`: local diagnosis only; disabled or deliberately controlled in normal production operation.

## Sensitive-data denylist

Never log:

- names, email addresses, or other personal identifiers;
- original filenames, uploaded file bodies, parsed content, or multipart payloads;
- cookies, JWTs, authorization headers, passwords, or hashes;
- API keys, database URLs, secrets, or full environment values;
- raw provider bodies or exception objects that may contain request configuration.

Use internal resource identifiers or a deliberately non-sensitive provider reference only when necessary for support.

## Error ownership

- Log once at the layer that has enough context to act or translate the failure.
- Do not catch, log, and rethrow at every layer.
- Public Problem Details responses and internal logs serve different audiences; neither should expose sensitive values.
- Frontend production code must not rely on ad hoc `console` logging. Show safe user-facing feedback and use tested state transitions.
