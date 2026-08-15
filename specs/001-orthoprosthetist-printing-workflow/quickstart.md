# Quickstart And Validation Guide

**Status**: Accepted

This guide defines the clean-reviewer workflow. Existing Nx runtime commands are resolved from the current workspace. Delivery commands remain local evidence until the separately authorized GitHub and Dokploy configuration is completed.

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

Expected projects are exactly `api`, `web`, `database`, and `infrastructure`.

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

These reviewer scenarios complement the focused tests owned by issues #9 and #12.

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
7. Delay the provider-status read; confirm the persisted rows, pagination, and non-status cells appear first while active-request Status and Estimated progress cells show skeletons and completed or failed values remain visible.
8. Confirm the automatic status refresh leaves the manual refresh icon visually idle, then activate the manual action and confirm only that user-triggered refresh shows its pending icon.
9. Confirm opening a page triggers one status refresh and no polling or repeated provider-status read follows after it settles.

### 5. Collection recovery

Repeat the following checks for the patient directory, the scan table, and the print-request table:

1. Fail the initial collection read before any successful response; confirm no table or row is displayed, the failure is localized and announced, and Retry can be reached and activated by keyboard.
2. Load a page, request an adjacent page, and fail that request; confirm the collection shows its localized blocking error without provisional or previous-page rows, and Retry repeats the intended safe read.
3. Load confirmed rows and fail a background refresh; confirm the rows remain visible as last-known information with a non-blocking warning and Retry.
4. Restore the collection service and activate Retry; confirm the successful response replaces the recovery state without duplicating rows or changing page position before confirmation.
5. Repeat the three failures on a compact viewport; confirm the recovery action remains visible, has an accessible name, does not rely on color, and meets the required touch-target size.

## Repository Validation Targets

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
npm exec nx -- run web:test
```

These target names resolve in the current workspace. Issue #14 composes them into one CI `verify` job and adds delivery-boundary tests without creating another Nx project.

## CI-Equivalent Validation

A clean reviewer environment runs the same ordered evidence as the protected `verify` check:

```bash
npm ci
npm exec nx -- format:check --base=<base-revision> --head=<head-revision>
npm exec nx -- affected -t lint typecheck test --base=<base-revision> --head=<head-revision>
npm exec nx -- run infrastructure:up
npm exec nx -- affected -t migrate --base=<base-revision> --head=<head-revision>
npm exec nx -- run web:generate-api
npm exec nx -- affected -t build --base=<base-revision> --head=<head-revision>
```

The migration target validates the changelog first through its Nx dependency, then applies the complete chain to the ephemeral database. The implemented workflow owns unconditional dependency shutdown even after an earlier command fails. The generation gate removes ignored outputs, emits OpenAPI and both Orval outputs, records a byte-level manifest, repeats the complete generation from clean outputs, and compares the manifests. A reviewer must not infer reproducibility from a single successful generation.

## Nx Affected Validation

Nx is the sole change-selection authority. Verification reads the deployable subset once and passes its JSON result directly to production:

```bash
npm exec nx -- show projects \
  --affected \
  --base=<last-successful-revision> \
  --head=<source-revision> \
  --withTarget=container \
  --json
```

GitHub Actions resolves these immutable revisions with the official `nrwl/nx-set-shas` action. On a push, the base is the last successful workflow revision for the branch, so a failed verification or release cannot make still-unreleased changes disappear from the next affected calculation. An empty JSON result skips production before environment approval. No custom selector, changed-path parser, or GitHub path-filter table is permitted. Focused conformance commands invoke Nx itself with `--files` fixtures:

```bash
npm exec nx -- show projects --affected --files=database/db.changelog-master.xml --withTarget=container --json
npm exec nx -- show projects --affected --files=apps/api/src/main.ts --withTarget=container --json
npm exec nx -- show projects --affected --files=apps/web/src/main.tsx --withTarget=container --json
npm exec nx -- show projects --affected --files=package.json --withTarget=container --json
npm exec nx -- show projects --affected --files=.dockerignore --withTarget=container --json
npm exec nx -- show projects --affected --files=README.md --withTarget=container --json
npm exec nx -- show projects --affected --files=infrastructure/dokploy/minio.compose.yaml --withTarget=container --json
npm exec nx -- show projects --affected --files=database/db.changelog-master.xml,apps/api/src/main.ts,apps/web/src/main.tsx --withTarget=container --json
```

They resolve respectively to:

1. `database/db.changelog-master.xml` resolves only `database`;
2. `apps/api/src/main.ts` resolves only `api`;
3. `apps/web/src/main.tsx` resolves only `web`;
4. `package.json` and `.dockerignore` resolve `api` and `web` through Nx dependency analysis and named inputs;
5. specifications and documentation resolve no deployable project;
6. the retained MinIO definition resolves only `infrastructure` before the `container` filter and no project after it;
7. the combined fixture returns `database`, `api`, and `web`;
8. invalid revisions, named inputs, or project configuration make the Nx command fail and block promotion.

Nx intrinsically treats the root `tsconfig.base.json` as an input to every targetable project, so that fixture conservatively includes `database` in addition to both applications. The release workflow keeps this official Nx result; it does not hide the safe extra migration check with a custom exception.

## Image Validation

Selected images are built from the exact verified source revision. Local smoke checks may use synthetic tags and values only:

```bash
docker build --file apps/api/Dockerfile --tag vytruve-api:review .
docker build --file apps/web/Dockerfile --tag vytruve-web:review .
docker build --file database/Dockerfile --tag vytruve-migration:review database
```

Review evidence confirms:

- API and Web final stages contain no build toolchain or development dependencies;
- the API runs as a non-root user and exposes only internal port `3000`;
- Nginx runs unprivileged on `8080`, serves `/health`, and falls back to the SPA without proxying secrets;
- the migration image runs the official Liquibase `update` command directly;
- source revision and OCI source labels are present;
- the registry-returned digest and immutable SHA tag are recorded;
- Docker promotes that digest to the mutable `production` pull pointer only immediately before its ordered stage;
- revision-aware health proves that the expected immutable source revision is running.

Image publication, package visibility changes, and registry access are external mutations and are not part of a local review command.

## Production Evidence

Production provisioning and releases require explicit user authorization and the protected `production` environment. Before any first release, inspect rather than recreate these independent resources:

- retained `vytruve-postgres` database;
- blocking `vytruve-migration` Dokploy Server Schedule Job;
- `vytruve-api` application;
- `vytruve-web` application;
- retained MinIO-only Compose resource.

For an authorized controlled release, verify the following sequence:

1. the pushed `main` revision is the exact revision that passed `verify`;
2. the Nx affected result names only expected deployable projects;
3. each selected image is published under its immutable SHA tag and captured by digest;
4. each digest is promoted to its component's `production` pull pointer only when its ordered stage begins;
5. the migration Schedule Job returns `done`, then API and Web webhooks are accepted and their expected-revision health checks pass within the finite bound;
6. API readiness verifies PostgreSQL and MinIO but not the printing provider;
7. Web `/health` responds through the production HTTPS origin;
8. unselected Dokploy resources retain their image, deployment, and storage state;
9. logs contain no credential, header, environment value, connection string, or remote body.

## Rollback Rehearsal

Use only synthetic or previously approved immutable artifacts. The recovery workflow accepts one `api` or `web` component, one matching prior `sha256` digest, and its source revision; it derives the fixed GHCR repository from the component rather than accepting a repository from the caller. Prove that it rejects migration, tags, repository-qualified references, malformed digests, and multiple components. A successful rehearsal promotes exactly one prior digest to that component's `production` pointer, triggers its webhook, and repeats the revision-aware health check. It does not rebuild source, roll back Liquibase, mutate PostgreSQL, or restart MinIO.

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
