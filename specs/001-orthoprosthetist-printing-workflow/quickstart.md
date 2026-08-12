# Quickstart And Validation Guide

**Status**: Accepted

This guide defines the intended clean-reviewer workflow. Commands become executable authority only after the workspace is scaffolded and each Nx target is verified. Until then, they are planned interfaces.

## Prerequisites

- Node.js 24 LTS
- npm supplied with the selected Node release
- Docker with Docker Compose v2
- Free local ports `3000`, `4200`, `5432`, `9000`, and `9001`

No global Nx, Nest, Vite, Liquibase, Orval, PostgreSQL, or MinIO installation is required.

## Install Dependencies

```bash
npm install
```

npm owns dependency installation and the lockfile. Workspace tasks use the repository-local Nx binary:

```bash
npm exec nx -- show projects
```

Expected projects include `api`, `web`, and `database`, plus an `infrastructure` project only when Compose targets are integrated into the Nx graph.

## Configure The Local Environment

Copy the committed safe template manually to `.env` and replace placeholders with local-only values. Never commit `.env`.

| Variable | Purpose | Safe local example shape |
| --- | --- | --- |
| `NODE_ENV` | Runtime mode | `development` |
| `API_PORT` | Nest listener | `3000` |
| `WEB_ORIGIN` | Sole credentialed CORS origin | `http://localhost:4200` |
| `DATABASE_HOST` | PostgreSQL host | `localhost` |
| `DATABASE_PORT` | PostgreSQL port | `5432` |
| `DATABASE_NAME` | Local database name | non-production placeholder |
| `DATABASE_USER` | Local database role | non-production placeholder |
| `DATABASE_PASSWORD` | Local database password | non-production placeholder |
| `JWT_SECRET` | HS256 signing secret | unique local random value |
| `JWT_ISSUER` | Expected token issuer | local identifier |
| `JWT_AUDIENCE` | Expected token audience | local identifier |
| `MINIO_ENDPOINT` | S3 endpoint host | `localhost` |
| `MINIO_PORT` | S3 endpoint port | `9000` |
| `MINIO_USE_SSL` | Local transport | `false` |
| `MINIO_ACCESS_KEY` | Development-only object-store identity | non-production placeholder |
| `MINIO_SECRET_KEY` | Development-only object-store secret | non-production placeholder |
| `MINIO_BUCKET` | Private scan bucket | local identifier |
| `PRINTING_API_BASE_URL` | Printing-center endpoint | safe configured URL |
| `PRINTING_API_KEY` | Printing-center credential | local secret only |
| `PRINTING_API_TIMEOUT_MS` | Finite provider timeout | positive integer |
| `VITE_API_BASE_URL` | Browser-safe API origin | `http://localhost:3000/api` |

Only `VITE_API_BASE_URL` is exposed to browser code. No secret uses a `VITE_` prefix.

## Start Stateful Dependencies

```bash
npm exec nx -- run infrastructure:up
```

Expected results:

- PostgreSQL becomes healthy on `localhost:5432`.
- MinIO S3 becomes healthy on `localhost:9000`.
- The development-only MinIO console is available on `localhost:9001`.
- Named Docker volumes retain local state across ordinary restarts.

Inspect status without changing it:

```bash
npm exec nx -- run infrastructure:status
```

## Apply The Database Schema

```bash
npm exec nx -- run database:migrate
```

Expected results:

- Liquibase reads `database/db.changelog-master.xml`.
- Accounts/patients, scans, and printing changelogs apply in order.
- Re-running the command reports no pending changes and performs no destructive reset.
- The API never runs TypeORM synchronization or TypeORM migrations.

## Emit The Contract And Generate The Frontend Boundary

```bash
npm exec nx -- run api:openapi
npm exec nx -- run web:generate-api
```

Expected generated outputs, all ignored by Git:

- emitted OpenAPI document;
- native Fetch functions and TanStack Query hooks grouped by tags;
- generated transport types and enums;
- Zod Mini request schemas using the `*.zod.ts` suffix.

Generation must be reproducible from a clean install. Never edit generated files.

## Start The Applications

Run both long-lived targets through Nx in separate terminals:

```bash
npm exec nx -- serve api
```

```bash
npm exec nx -- serve web
```

Expected endpoints:

- Web: `http://localhost:4200`
- API prefix: `http://localhost:3000/api`
- OpenAPI documentation: the path selected during scaffolding and recorded in the final README

The API must fail before listening when required configuration is absent or invalid. Failure output may name the variable and expected shape but never its value.

## Manual Story Validation

These are reviewer scenarios, not substitutes for the tests owned by issues #9, #12, and #13.

### 1. Account and session

1. Open `/sign-up` and create a synthetic account with matching valid passwords.
2. Confirm navigation to `/patients` and the absence of a token in the response body or browser storage.
3. Reload and confirm session restoration.
4. Change language through the authenticated profile menu.
5. Sign out and confirm protected content is unavailable.

### 2. Patient ownership

1. Create a synthetic patient at the valid age boundaries.
2. Confirm the new patient workspace opens directly.
3. Return to the directory and use Previous/Next without a displayed total.
4. Confirm an unknown deep link renders the neutral not-found fallback.

### 3. Scan storage

1. Open one owned patient and keep `3D scans` selected.
2. Select exactly one safe synthetic PLY file.
3. Confirm invalid or oversized content remains in the upload context and creates no scan row.
4. Upload a valid supported PLY and confirm one safe row appears.
5. Download the row and confirm the workspace remains open.

Do not use or commit the supplied assessment scans outside their authorized local acceptance check.

### 4. Printing

1. Request printing from one eligible scan.
2. Confirm one stable-reference row appears and the `Print requests` tab opens.
3. Confirm repeated activation does not create a second active request.
4. Observe confirmation pending, queued, in-progress, completed, and failed projections through the controlled provider.
5. Confirm ambiguous submission is reconciled without another POST.
6. Confirm capacity rejection leaves no accepted request and allows a later deliberate attempt.

## Planned Validation Targets

The final workspace will expose focused Nx targets rather than undocumented shell recipes:

```bash
npm exec nx -- format:check
npm exec nx -- run api:lint
npm exec nx -- run api:typecheck
npm exec nx -- build api
npm exec nx -- run web:lint
npm exec nx -- run web:typecheck
npm exec nx -- build web
npm exec nx -- run api:test
npm exec nx -- run api:test-http
npm exec nx -- run web:test
npm exec nx -- run web-e2e:e2e
```

The exact target names are finalized by issue #14 after the relevant test projects exist. Issue #4 runs no runtime test because it changes documentation and guidance only.

## Stop Local Dependencies

```bash
npm exec nx -- run infrastructure:down
```

Ordinary shutdown preserves named volumes. Destructive volume removal is intentionally not part of the standard quickstart.

## Troubleshooting Boundaries

- **Port already in use**: stop the conflicting local process; do not silently choose undocumented ports.
- **Migration failure**: inspect the Liquibase error and PostgreSQL health; do not enable TypeORM synchronization.
- **MinIO unavailable**: restore the dependency; do not fall back to public or filesystem storage implicitly.
- **Provider unavailable**: use the controlled fake for development evidence; never place a live credential in source or documentation.
- **Generated client drift**: regenerate from the emitted OpenAPI document; never patch generated TypeScript.
