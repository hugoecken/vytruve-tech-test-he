# TypeORM Persistence Policy

## Schema ownership

TypeORM entities describe runtime persistence mapping; the repository's migration tool owns the database schema. Keep `synchronize: false` and `migrationsRun: false` in development, tests, CI, and production.

## Entities

- Keep entities separate from HTTP DTOs, application inputs, provider payloads, and frontend types.
- Model explicit columns, nullability, lengths, defaults, unique constraints, indexes, and foreign keys.
- Use database-generated identifiers consistently and expose identifiers only where the public contract needs them.
- Store timestamps in a timezone-safe form and let the database or TypeORM manage lifecycle timestamps consistently.
- Use string-backed enums or constrained strings when their database representation must remain legible and migration-safe.
- Avoid eager relations. Load only the data a use case needs.
- Avoid bidirectional relations unless navigation is required in both directions.

## Repositories

- Inject feature repositories with `@InjectRepository(Entity)`.
- Query repositories from the owning application or persistence provider, never from controllers.
- Do not wrap TypeORM in a generic CRUD repository. Create a dedicated persistence adapter only when it centralizes meaningful queries or protects an application boundary.
- Use explicit query methods with deterministic ordering and bounded result sets.
- Translate expected database conflicts into stable application errors; do not expose driver errors.

## Ownership and access control

- Scope owner-bound resource queries by the authenticated subject at the database boundary whenever practical.
- Never fetch by resource identifier and authorize only after returning sensitive data.
- Enforce uniqueness and referential integrity in PostgreSQL in addition to application checks.

## Transactions

- Define a transaction around one business invariant, not an entire HTTP request by default.
- Use the transaction-scoped entity manager for every read and write inside the transaction.
- Keep network calls and slow file operations outside database transactions unless correctness requires otherwise.
- For database plus file operations, design explicit compensation and cleanup because they cannot share one atomic transaction.

## Query discipline

- Select only required fields for lists and never return entities directly from controllers.
- Make ordering explicit before using `findOne`, limits, or pagination.
- Add indexes because an observed query or constraint needs them, not preemptively.
- Inspect generated SQL when query-builder behavior is non-obvious.
