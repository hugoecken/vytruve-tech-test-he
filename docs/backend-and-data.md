# Backend and Data

[Back to the main README](../README.md)

The NestJS API is the trust boundary for accounts, patients, scans, printing, and health. PostgreSQL owns relational
state, Liquibase owns schema history, and MinIO owns private scan bytes.

## Feature structure

```text
apps/api/src/
  accounts/       account identity and password persistence
  auth/           registration, sessions, cookie and JWT boundaries
  patients/       owner-scoped patient records and pagination
  scans/          PLY validation, private storage and download
  printing/       reservation, provider calls and reconciliation
  health/         liveness and revision-aware readiness
  shared/         proven HTTP, validation and persistence foundations
```

Each feature keeps HTTP DTOs and controllers at the edge, use-case coordination in its application boundary, and
TypeORM, MinIO, cryptographic, or provider mechanics behind concrete infrastructure adapters. Shared code exists only
for responsibilities genuinely used across features.

## Data model

```mermaid
erDiagram
  ACCOUNT ||--o{ PATIENT : owns
  PATIENT ||--o{ SCAN : contains
  SCAN ||--o{ PRINT_REQUEST : submits

  ACCOUNT {
    uuid id
    string email
    string password_hash
  }
  PATIENT {
    uuid id
    uuid account_id
    string first_name
    string last_name
    int age
  }
  SCAN {
    uuid id
    uuid patient_id
    string storage_key
    string format
    string encoding
    int size_bytes
  }
  PRINT_REQUEST {
    uuid id
    uuid scan_id
    string reference
    string provider_id
    string status
    boolean active_slot
  }
```

| Owner             | Stored responsibility                                                                          | Never exposed publicly                                  |
| ----------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| PostgreSQL        | Accounts, ownership, patient data, scan metadata, print references, and last safe print state. | Password hashes and persistence details.                |
| MinIO             | PLY bytes under application-generated UUID keys.                                               | Bucket details, object keys, and original filenames.    |
| Printing provider | External production-job state.                                                                 | Credential, raw payloads, and provider-specific errors. |

## Schema ownership

`database/db.changelog-master.xml` is the schema authority. Liquibase records durable history in
`DATABASECHANGELOG`; TypeORM uses `synchronize: false` and `migrationsRun: false`.

Production changelogs are append-only. Schema changes must remain backward compatible with the immediately previous
API image because application rollback intentionally does not reverse Liquibase.

## Scan storage

```mermaid
sequenceDiagram
  actor User as Orthoprosthetist
  participant API as NestJS API
  participant DB as PostgreSQL
  participant Store as Private MinIO

  User->>API: Upload one bounded PLY file
  API->>API: Verify session, ownership, size and PLY structure
  API->>Store: Store bytes under an opaque UUID key
  API->>DB: Persist safe scan metadata
  alt Metadata persistence fails
    API->>Store: Remove that exact new object
  end
  API-->>User: Safe scan representation or Problem Details
```

Filename and MIME claims are not trusted. Downloads repeat patient and scan ownership checks, validate the stored
size, and stream bytes through the API under a synthetic filename. The narrow compensation protects new uploads
without adding a queue or speculative cleanup service.

## Executable HTTP contract

```mermaid
flowchart LR
  Nest["Controllers, DTOs and Swagger metadata"] -->|"api:openapi"| Contract["Ignored OpenAPI document"]
  Contract -->|"web:generate-api"| Client["Orval Fetch and Query clients"]
  Contract -->|"web:generate-api"| Schemas["Zod Mini request schemas"]
  Client --> Web["React features"]
  Schemas --> Forms["React Hook Form"]
```

NestJS remains the runtime contract authority. Generated files are derivative, reproducible, ignored, and never
edited manually. See [Local development](local-development.md#contracts-and-generated-clients) for commands and
[Testing and quality](testing-and-quality.md) for synchronization evidence.
