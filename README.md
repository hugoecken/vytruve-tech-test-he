# Vytruve Technical Assessment

A specification-driven React and NestJS application for orthoprosthetists to manage patients, store private 3D scans,
and submit and follow socket-printing requests.

The delivered journey covers:

1. account registration, sign-in, session restoration, language selection, and sign-out;
2. owner-scoped patient creation, pagination, and patient workspaces;
3. bounded PLY 1.0 upload, private MinIO storage, and authorized download; and
4. duplicate-safe print submission, provider reconciliation, status tracking, and estimated progress.

Patient editing or deletion, scan deletion, print cancellation, password recovery, MFA, notifications, billing, and
clinical or regulatory claims are deliberately outside this assessment.

## Documentation

This README is the reviewer entry point. Detailed facts have one owner:

- [Architecture](docs/architecture.md) — system boundaries, data ownership, backend structure, storage, printing, and
  contract generation;
- [Authentication and security](docs/authentication-and-security.md) — session lifecycle, authorization, validation,
  Problem Details, configuration, and protected-data boundaries;
- [Frontend](docs/frontend.md) — routes, server state, forms, localization, responsive behavior, accessibility, and
  frontend tests;
- [Decisions and trade-offs](docs/decisions-and-trade-offs.md) — consequential choices, limitations, deferred work,
  and AI-assistance details; and
- [Dokploy production handover](infrastructure/dokploy/README.md) — production resources, images, migration order,
  health verification, failure behavior, and rollback.

The accepted specification and plan remain the product and technical authorities under
[`specs/001-orthoprosthetist-printing-workflow/`](specs/001-orthoprosthetist-printing-workflow/). `tasks.md` is a
derived planning artifact rather than live delivery state; GitHub issues and pull requests own execution. The documents
above explain the delivered implementation without replacing those authorities.

## Prerequisites

- Node.js 24 LTS
- npm 10
- Docker with Docker Compose

No global Nx, NestJS, Vite, PostgreSQL, MinIO, or Liquibase installation is required.

## Quick start

Install the locked dependency graph from a clean checkout:

```bash
npm ci
```

Create the ignored local configuration file. Its committed source contains synthetic development placeholders only:

```bash
cp .env.example .env.local
```

The printing-provider URL and key placeholders allow the application to start, but real print submission requires the
credential supplied separately with the assessment. Put it only in `.env.local`; never commit it.

Start retained local dependencies and apply the Liquibase changelog:

```bash
npm exec nx -- run infrastructure:up
npm exec nx -- run database:migrate
```

Start the API and Web development servers together through Nx:

```bash
npm start
```

| Service       | Local address               |
| ------------- | --------------------------- |
| Web           | `http://localhost:4200`     |
| API           | `http://localhost:3000/api` |
| PostgreSQL    | `127.0.0.1:5432`            |
| MinIO S3      | `http://127.0.0.1:9000`     |
| MinIO console | `http://127.0.0.1:9001`     |

Stop the two application processes with `Ctrl+C`, then stop local infrastructure without deleting its named volumes:

```bash
npm exec nx -- run infrastructure:down
```

PostgreSQL and MinIO data survive normal stop/start cycles. No reset alias is provided because deleting reviewer data
must remain an explicit Docker operation.

## Configuration ownership

`.env.example` is the complete local variable inventory. The API validates required values before listening; the Web
bundle receives only `VITE_API_BASE_URL`, which is safe for browser users.

| Context                        | Configuration source                              | Rule                                                                                                              |
| ------------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Local                          | ignored `.env.local` copied from `.env.example`   | Development placeholders are allowed; real provider credentials remain local.                                     |
| Pull-request verification      | synthetic `.env.local` copied from `.env.example` | No production secret or mutation authority is available.                                                          |
| Production application runtime | Dokploy application environment                   | Database, MinIO, JWT, CORS, scan-limit, and provider values are injected at runtime.                              |
| Production release             | GitHub `production` environment                   | Dokploy webhooks and API key are secrets; URLs, schedule identity, origin, and platform are non-secret variables. |
| Image build                    | GitHub Actions build arguments                    | Only the source revision and public Web API origin enter images.                                                  |

See [Authentication and security](docs/authentication-and-security.md#configuration-boundaries) and the
[Dokploy handover](infrastructure/dokploy/README.md#github-production-environment) for the exact variable names. Never
store a token in browser storage or expose a server secret through a `VITE_` variable.

## Command reference

Nx owns task selection, dependencies, parallelism, and caching. npm owns dependency installation and the single
reviewer-facing `npm start` alias.

### Infrastructure and database

```bash
npm exec nx -- run infrastructure:up
npm exec nx -- run infrastructure:status
npm exec nx -- run infrastructure:down

npm exec nx -- run database:validate
npm exec nx -- run database:status
npm exec nx -- run database:migrate
npm exec nx -- run database:rollback
```

Liquibase runs in a disposable container. It is the schema authority; TypeORM schema synchronization and TypeORM
migrations are disabled. `database:rollback` reverts only the most recent local change set and is not a production
rollback mechanism.

### Contracts and generated clients

```bash
npm exec nx -- run api:openapi
npm exec nx -- run web:generate-api
```

`web:generate-api` depends on `api:openapi` and emits ignored Orval Fetch/TanStack Query clients, types, and Zod Mini
request schemas. Never edit `generated/openapi.json`, `apps/web/src/shared/api/generated/`, or
`apps/web/src/routeTree.gen.ts` by hand.

### Quality and builds

```bash
npm exec nx -- format:check
npm exec nx -- run-many -t lint,typecheck,test,build --projects=api,web --parallel=1 --nxBail
```

Focused suites remain independently runnable:

```bash
npm exec nx -- test api --runInBand
npm exec nx -- test web
```

Build all production image definitions locally with synthetic revision inputs:

```bash
npm exec nx -- run web:generate-api
npm exec nx -- run-many -t container --projects=database,api,web --parallel=1 --nxBail
```

Smoke-check the self-contained Web image and its revision-aware health endpoint:

```bash
docker run --rm --detach --name vytruve-web-smoke --publish 127.0.0.1:8080:8080 vytruve-web:local
curl --fail http://127.0.0.1:8080/health/0000000000000000000000000000000000000000
docker stop vytruve-web-smoke
```

The API image depends on PostgreSQL and MinIO, so its production smoke check belongs to the ordered Dokploy release
rather than a second local orchestration path.

Inspect the resolved workspace rather than relying on partial project files:

```bash
npm exec nx -- show projects --json
npm exec nx -- show project api --json
npm exec nx -- show project web --json
```

The GitHub `verify` job applies the affected equivalents of formatting, Liquibase migration, contract generation,
linting, type-checking, tests, and builds. It uses the official Nx SHA resolver and always stops its temporary Compose
dependencies.

## Delivery snapshot

`develop` is the ordinary integration branch and cannot deploy. A reviewed `develop` to `main` promotion verifies the
exact revision and releases only projects selected by `nx affected` that expose a `container` target. Selected stages
run in migration, API, then Web order. GHCR images are public for anonymous Dokploy pulls, while production secrets
remain in GitHub and Dokploy stores rather than image layers.

The Git history follows bounded issue branches and pull requests so a reviewer can trace specification, design,
implementation, verification, and delivery decisions without retrospective placeholder commits.

The deployed topology intentionally keeps PostgreSQL and MinIO independent from application releases. Revision-aware
health checks prove the exact API and Web artifact after each webhook. Application rollback restores one previous
image digest and never reverses Liquibase or recreates retained services. Operational detail belongs to the
[Dokploy production handover](infrastructure/dokploy/README.md).

## AI assistance

AI assistance supported specification analysis, implementation, tests, documentation, and bounded delivery work. The
author retained decision and mutation authority, reviewed every delivered diff, ran the stated verification, and kept
credentials, supplied scans, generated output, and personal source material outside Git. See
[Decisions and trade-offs](docs/decisions-and-trade-offs.md#ai-assisted-workflow) for the review boundary.
