# Implementation Plan: Orthoprosthetist Printing Workflow

**Status**: Accepted

**Feature**: `001-orthoprosthetist-printing-workflow` | **Date**: 2026-08-12 | **Specification**: [`spec.md`](spec.md) at `b1cd82fe1347afe4221931cf1301710f7bf34721`

**Design evidence**: [`design-profile.md`](../../.agents/skills/vytruve-best-practices/overlays/design-profile.md) at `c0a65411f83effa5024dec6405d0147a34da05a6`

**Planning authority**: GitHub issue #4. Acceptance authorizes publication of these planning artifacts but no application code or Figma change.

## Summary

Deliver a focused React SPA and NestJS API for account authentication, owner-scoped patient records, validated PLY scan storage, and safe printing-center submission and tracking. Nx orchestrates the npm workspace. PostgreSQL owns relational integrity, Liquibase XML owns schema evolution, TypeORM owns runtime mapping, and private MinIO stores scan objects. Nest emits the OpenAPI contract; Orval derives both the Fetch/TanStack Query client and Zod Mini request schemas. shadcn/ui owns rendering while TanStack Router, Query, and Table own routing, server state, and headless table behavior respectively.

The architecture deliberately excludes CQRS, queues, workers, microservices, generic repositories, speculative shared packages, refresh tokens, presigned URLs, provider-wide discovery, and universal data-table abstractions.

## Technical Context

**Language/Version**: TypeScript on Node.js 24 LTS

**Primary Dependencies**: Nx 23, React 19, Vite, TanStack Router, TanStack Query, TanStack Table, React Hook Form, Zod Mini 4, i18next, shadcn/ui, Lucide React, NestJS 11 with Express, `@nestjs/swagger`, `@nestjs/config`, `@nestjs/typeorm`, `@nestjs/jwt`, `@nestjs/throttler`, TypeORM, Argon2, MinIO JavaScript SDK, Orval

**Storage**: PostgreSQL for relational state; private MinIO for PLY objects; browser local storage only for the non-sensitive language preference

**Schema management**: Liquibase XML through `database/db.changelog-master.xml`; TypeORM synchronization and migrations disabled

**Testing**: Deliberately deferred to issues #9, #12, and #13; issue #14 owns the final CI gates

**Target Platform**: Modern evergreen browsers and a Node.js Linux-compatible API runtime; local PostgreSQL and MinIO run with Docker Compose

**Project Type**: Nx monorepo containing one React/Vite SPA, one NestJS REST API, database changelogs, and local infrastructure

**Performance Goals**: Bounded 50-item collection reads; bounded 25 MiB upload parsing; streaming downloads; active print polling every five seconds only while visible and for at most five minutes

**Constraints**: HTTP-only 30-minute JWT session, strict owner isolation, no blind non-idempotent retry, no unbounded parsing or polling, no raw provider or generated validation message in the UI, no test implementation in feature delivery issues

**Scale/Scope**: Four user stories, three authenticated resource collections, twelve public operations, two locales, desktop and compact layouts, and one external printing provider

## Constitution Check

### Pre-research gate

| Gate | Result | Evidence |
| --- | --- | --- |
| Repository authority first | Pass | Root instructions and routed policies were loaded before planning. |
| Accepted intent before architecture | Pass | `spec.md` is accepted at the immutable commit above. |
| Accepted design evidence | Pass | The design profile binds the Ready for Development frames and exact tokens. |
| GitHub execution authority | Pass | Issue #4 owns planning; no task or Git state is mutated by Spec Kit. |
| Protected data | Pass | The plan contains no supplied credential, contact, scan content, real filename, or patient data. |
| Proportionality | Pass | Two applications and two stateful dependencies serve explicit requirements; speculative layers are rejected. |
| Derived-task boundary | Pass | `tasks.md` will remain a local checklist and will not create GitHub issues. |

### Post-design gate

Phase 1 introduces no new observable destination, action, field, lifecycle, or provider promise. Every public contract and technical component maps to the accepted specification. The plan preserves React and NestJS as source-mandated constraints and treats all other technologies as the technical choices owned by this candidate. No constitution violation requires complexity justification.

## Architecture

### Runtime topology

```text
Browser :4200
  └── React/Vite SPA
      ├── TanStack Router
      ├── TanStack Query + generated Orval Fetch client
      ├── TanStack Table + shadcn/ui Table
      └── React Hook Form + generated Zod Mini schemas
             │ credentials: include
             ▼
NestJS/Express API :3000
  ├── AccountsModule
  ├── AuthModule
  ├── PatientsModule
  ├── ScansModule ───────────────► private MinIO :9000
  └── PrintingModule ────────────► printing-center HTTP API
             │
             ▼
PostgreSQL :5432 ◄── Liquibase migration process
```

The MinIO console is available only for local development on port `9001`. Application processes remain local Nx tasks; Docker Compose owns only PostgreSQL and MinIO.

### Backend module ownership

| Module | Owns | Does not own |
| --- | --- | --- |
| `AccountsModule` | Account entity, normalized email lookup, password hash persistence | Public account-management endpoints or session policy |
| `AuthModule` | Registration, sign-in, restoration, sign-out, JWT, cookie, guard, throttling | Patient authorization or browser token storage |
| `PatientsModule` | Patient creation, owner-scoped lookup and pagination | Scan or print orchestration |
| `ScansModule` | Scan metadata, bounded PLY validation, MinIO adapter, compensation, streaming | Provider printing semantics |
| `PrintingModule` | Stable references, active-request invariant, provider adapter, reconciliation, state and progress projection | Object-storage internals or global provider listing |

Each feature is organized by business capability and then by `api`, `application`, optional `domain`, and `infrastructure`. Controllers parse HTTP input, delegate one application operation, and map its result. Dedicated stateless Nest providers own API, persistence, and provider mappings at their respective boundaries.

### Frontend ownership

- File routes declare paths, route search, safe redirects, guards, and feature-view composition only.
- Feature modules own forms, mutation workflows, tables, error translation, and view-specific mapping.
- TanStack Query owns all server state. Existing data remains visible during background refresh failures.
- shadcn/ui source components under `shared/ui` are the only visual primitives. TanStack Table supplies column, row, and pagination state without rendering.
- One light table shell owns the surface, horizontal overflow, and Previous/Page/Next controls; patient, scan, and print tables keep separate column definitions and feature behavior.
- No source is promoted to a shared package until at least two real consumers prove cross-feature ownership.

## Security Model

### Credentials and session

- Hash passwords with Argon2id using explicit `argon2` parameters: `memoryCost=65536` KiB, `timeCost=3`,
  `parallelism=4`, `hashLength=32`, and version `0x13`; never log password material or hashes.
- Sign one HS256 JWT containing only `sub`, `iat`, and `exp`; verify signature, issuer, audience, and expiry.
- Store the JWT only in `vytruve_session` with `HttpOnly`, `SameSite=Lax`, `Path=/api`, `Max-Age=1800`, and `Secure` in production.
- Clear the cookie with exactly the same scope attributes. Do not introduce refresh tokens, server-side sessions, external identity providers, or JavaScript-readable tokens.
- Limit account creation and sign-in to five attempts per minute per trusted client IP. Proxy trust must be explicit when deployed behind a proxy.

### Browser and resource boundaries

- CORS accepts only the configured web origin and credentials.
- Every protected resource lookup includes the authenticated account identifier before data leaves PostgreSQL.
- Unknown and foreign-owned resources both return `PATIENT_NOT_FOUND` or `SCAN_NOT_FOUND` with `404` as applicable.
- Safe internal redirect validation accepts only known application paths, never an origin, protocol-relative path, credential, query-supplied form value, or protected payload.
- The persisted browser language key is non-sensitive and contains only a supported locale identifier.

### Data and diagnostics

- Configuration is validated before the API listens; error messages name an invalid variable but never its value.
- Nest `ConsoleLogger` emits one JSON object per line. Class-context `Logger` calls record operational categories only.
- Logs exclude names, emails, original filenames, scan content, request bodies, cookies, JWTs, hashes, connection strings, provider bodies, and credentials.
- Public errors use safe Problem Details codes. Internal exceptions are logged once where an operational outcome can be chosen.

## Data And Consistency

The complete relational model and state transitions are defined in [`data-model.md`](data-model.md).

- Liquibase `db.changelog-master.xml` includes three ordered XML changelogs: accounts/patients, scans, and printing.
- TypeORM uses `synchronize: false` and `migrationsRun: false` everywhere. It provides entities and repositories only.
- A nullable `active_slot` column plus unique `(scan_id, active_slot)` constraint makes concurrent active-print creation a database-enforced invariant without handwritten SQL. Active states store `true`; terminal states store `null`, which PostgreSQL permits multiple times in a unique constraint.
- The status-to-slot relationship is also checked so runtime code cannot persist a terminal request as active or an active request as terminal.
- Scan upload writes exactly one opaque MinIO object before metadata persistence and removes exactly that object if persistence fails. Neither system pretends to provide a distributed transaction.

## Public HTTP And Generation

[`contracts/http-api.md`](contracts/http-api.md) is the human-readable contract design. Runtime authority will be Nest DTOs, controllers, validation decorators, and Swagger metadata.

1. Nest emits one OpenAPI document with stable `operationId` values, feature tags, explicit enums, cookies, multipart bodies, response descriptions, and no hardcoded environment server.
2. Orval runs two outputs over that same document:
   - native Fetch functions and TanStack Query hooks in `tags-split` mode;
   - Zod Mini 4 request schemas in `*.zod.ts` files.
3. Both generated outputs and the emitted document remain ignored and immutable by hand.
4. Frontend code imports generated enums and request/response types rather than duplicating them.

### Error contract

Every public failure is `application/problem+json` with RFC 9457 members `type`, `title`, `status`, `detail`, and `instance`, plus stable `code`. Validation failures add `violations: Array<{ field: string; code: string }>` without rejected values. The Fetch boundary parses this shape into one typed frontend error. i18next selects copy from `code`, `violations[].code`, and local action context; raw backend, provider, Fetch, or Zod messages never reach the UI.

## Printing Integration

1. Generate a cryptographically random 12-character reference and persist a `confirmation_pending` reservation before the non-idempotent POST.
2. Send the authorized scan stream once with a finite connection/response timeout.
3. Validate the provider response before mapping it to provider-neutral application values.
4. On capacity rejection, remove the local reservation and return `PRINTING_CAPACITY_REACHED`; no accepted request remains.
5. On an ambiguous transport result, keep `confirmation_pending`, return the local request, and prohibit a second POST.
6. Later reads reconcile first by stable reference and then, when known, by provider identifier. They never use a global provider list.
7. Map provider states exhaustively to the five public states. Unknown or malformed data remains non-successful and operationally visible.

The web client polls active print requests every five seconds only when `document.visibilityState` is visible, for at most five minutes per active viewing window. It then exposes manual refresh. Poll failure preserves cached rows and their last-observed time.

## Validation And Test Ownership

This planning issue adds no runtime tests. Test responsibilities are intentionally exclusive:

- #9: Jest units, Nest HTTP/Supertest, PostgreSQL and MinIO Testcontainers, and a controlled fake provider.
- #12: Vitest, Testing Library, React Hook Form/Zod, Router, Query, tables, i18n, and accessibility.
- #13: responsive Playwright journeys against a controlled full stack.
- #14: formatting, lint, type-check, builds, test levels, and OpenAPI/Orval reproducibility in CI.

Implementation tasks in issues #5–#8, #10, and #11 must create production behavior only and must not absorb those test scopes.

## Observability

- Log application startup and validated readiness without configuration values.
- Log authentication result categories without account identifiers or emails.
- Log printing operation name, internal request UUID or safe stable reference, duration, mapped status category, and reconciliation outcome.
- Warn on ambiguous submission, failed compensation, and degraded dependency state.
- Do not log routine controller entry, repository calls, validation errors, payloads, or raw exceptions that may contain request configuration.

## Project Structure

### Documentation for this feature

```text
specs/001-orthoprosthetist-printing-workflow/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── design-handoff.md
├── quickstart.md
├── contracts/
│   └── http-api.md
└── tasks.md
```

### Executable workspace

```text
apps/
├── api/
│   └── src/
│       ├── app/
│       ├── config/
│       ├── common/
│       │   ├── errors/
│       │   ├── logging/
│       │   └── pagination/
│       └── modules/
│           ├── accounts/
│           ├── auth/
│           ├── patients/
│           ├── scans/
│           └── printing/
└── web/
    └── src/
        ├── routes/
        ├── modules/
        │   ├── auth/
        │   ├── patients/
        │   ├── scans/
        │   └── printing/
        ├── shared/
        │   ├── api/generated/
        │   ├── config/
        │   ├── layout/
        │   ├── lib/
        │   └── ui/
        ├── router.tsx
        ├── routeTree.gen.ts
        └── main.tsx
database/
├── project.json
├── db.changelog-master.xml
└── changelog/
    ├── 001-accounts-patients.xml
    ├── 002-scans.xml
    └── 003-printing.xml
infrastructure/
└── compose.yaml
```

**Structure decision**: Nx owns four projects or project boundaries: `api`, `web`, `database`, and `infrastructure` only when Compose targets benefit from graph orchestration. No `libs/` or package-level shared contract is created because OpenAPI generation already owns the API/frontend boundary and no other reuse is proven.

## Runtime Commands And Ports

`npm install` installs dependencies. Root aliases may expose common workflows, but every workspace task delegates to Nx and every Nx target invokes its native tool directly.

| Purpose | Authoritative command | Port |
| --- | --- | --- |
| Start PostgreSQL and MinIO | `npm exec nx -- run infrastructure:up` | `5432`, `9000`, `9001` |
| Apply Liquibase | `npm exec nx -- run database:migrate` | `5432` |
| Serve API | `npm exec nx -- serve api` | `3000` |
| Serve web | `npm exec nx -- serve web` | `4200` |
| Emit OpenAPI | `npm exec nx -- run api:openapi` | N/A |
| Generate clients | `npm exec nx -- run web:generate-api` | N/A |

Exact generated project names and target syntax must be verified after scaffolding before the quickstart becomes runtime authority.

## Traceability Matrix

| Accepted identifiers | Technical component | Planned proof owner |
| --- | --- | --- |
| FR-001–FR-010; SC-002 | `AccountsModule`, `AuthModule`, auth routes/forms, cookie guard, i18next profile menu | #9 backend auth evidence; #12 frontend auth/i18n evidence; #13 US1 journey |
| FR-011–FR-016; SC-001, SC-011, SC-015 | Router layout/fallback, owner-scoped patient queries, concealed 404 mapping | #9 ownership HTTP evidence; #12 Router evidence; #13 navigation/fallback journey |
| FR-017–FR-021; SC-003 | Patient DTOs/entity/service, patient form and table | #9 patient boundary evidence; #12 form/table evidence; #13 US2 journey |
| FR-022–FR-030; SC-004, SC-009 | Bounded PLY validator, MinIO adapter, scan metadata, stream response, upload drawer/dialog | #9 file/storage evidence; #12 upload-state evidence; #13 US3 journey |
| FR-031–FR-044; SC-005–SC-007 | Print reservation, active-slot constraint, provider adapter/reconciliation, polling and print table | #9 provider/state evidence; #12 Query/lifecycle evidence; #13 US4 journey |
| FR-045–FR-046; SC-012 | Cursor contract, TanStack infinite queries, headless tables and shadcn rendering | #9 cursor HTTP evidence; #12 responsive table/pagination evidence; #13 desktop/compact journeys |
| FR-047–FR-051; SC-008, SC-010 | Problem Details, typed Fetch error, localized feedback, mutation guards, stale-query preservation | #9 error evidence; #12 state/retry evidence; #13 degraded journeys |
| FR-052–FR-053 | shadcn semantics, keyboard/focus/announcement behavior, 44 px compact targets | #12 accessibility evidence; #13 responsive interaction evidence |
| FR-054; SC-011 | Minimal schemas, private storage, logging denylist, synthetic evidence | #9 security review; #14 repository scans |
| FR-055; SC-015 | Auth-aware TanStack Router not-found fallback | #12 fallback evidence; #13 authenticated/public fallback journeys |
| SC-001 | Four story slices remain independently executable | #9, #12, and #13 combined story evidence |
| SC-013 | React/Vite and NestJS/Nx structure | #14 type-check/build and architecture review |
| SC-014 | README, quickstart, decisions, AI disclosure, reviewable Git history | #14 delivery review |

All `FR-001…FR-055` and `SC-001…SC-015` are represented above.

## Complexity Tracking

No constitution violation is present. PostgreSQL, MinIO, and the printing adapter each protect a distinct accepted boundary; Nx orchestrates the required frontend/backend repository; Liquibase replaces rather than duplicates TypeORM schema ownership; Zod generation derives from rather than competes with OpenAPI.

## Approval Gate

The user explicitly accepted this plan on 2026-08-12. Runtime implementation remains gated by the merged immutable
plan commit recorded in issues #5–#14, their individual GitHub scope, and every routed source gate. `tasks.md` remains
derived and advisory; it never authorizes implementation by itself.
