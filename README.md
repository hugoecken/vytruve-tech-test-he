# Vytruve Technical Assessment

Specification-driven React and NestJS implementation of the Vytruve technical assessment.

## Current stage

The repository contains the accepted product specification, design handoff, technical plan, executable foundation,
and the complete backend product workflow.

The current implementation provides:

- an Nx monorepo with React/Vite and NestJS applications;
- strict TypeScript, ESLint, Prettier, type-check, and build targets;
- PostgreSQL and private MinIO services through Docker Compose;
- a Liquibase XML schema executed only in a disposable container;
- cookie-based account registration and authentication; and
- owner-scoped patient creation, retrieval, and server-side pagination;
- content-validated PLY uploads stored in a private MinIO bucket; and
- owner-authorized scan listing and byte-for-byte content streaming; and
- duplicate-safe print submission, reconciliation, lifecycle tracking, and estimated progress.

It does not yet implement the product UI.

## Prerequisites

- Node.js 24 LTS
- npm 10
- Docker with Docker Compose

No global Nx, NestJS, Vite, Liquibase, PostgreSQL, or MinIO installation is required.

## Install

Install the locked dependencies from a clean checkout:

```bash
npm ci
```

npm owns dependency installation only. Nx owns workspace task execution through the repository-local binary.

## Local configuration

Create the ignored local environment file once:

```bash
cp .env.example .env
```

The committed example contains development-only placeholders. Never reuse them outside local development and never
commit `.env`.

## Local infrastructure

Start PostgreSQL and MinIO:

```bash
npm exec nx -- run infrastructure:up
```

Inspect their status or stop their containers without deleting development volumes:

```bash
npm exec nx -- run infrastructure:status
npm exec nx -- run infrastructure:down
```

Docker Compose remains the native service orchestrator. The Nx targets provide one discoverable workspace interface
without wrapping Compose through npm scripts.

| Service       | Local address           |
| ------------- | ----------------------- |
| Web           | `http://localhost:4200` |
| API           | `http://localhost:3000` |
| PostgreSQL    | `localhost:5432`        |
| MinIO S3      | `http://localhost:9000` |
| MinIO Console | `http://localhost:9001` |

## Database migrations

Liquibase is fully dockerized. Each command starts a disposable container, waits for PostgreSQL to become healthy,
uses the read-only XML changelog mount, and exits when the operation completes.

```bash
npm exec nx -- run database:validate
npm exec nx -- run database:status
npm exec nx -- run database:migrate
npm exec nx -- run database:rollback
```

`database/db.changelog-master.xml` is the schema authority. TypeORM maps the resulting tables at runtime with schema
synchronization and TypeORM migrations disabled.

## Applications

Start the local API and Web processes in separate terminals:

```bash
npm exec nx -- serve api
npm exec nx -- serve web
```

The API validates every required runtime setting before listening under `/api`. It exposes account session and
owner-scoped patient, scan, and print-request endpoints. `MAX_SCAN_SIZE_BYTES` configures the upload boundary and
defaults to the accepted 25 MiB product limit in `.env.example`. Scan uploads accept one structurally valid PLY 1.0
mesh within that limit, ignore client filenames and MIME claims, and expose neither object keys nor MinIO details. The
private bucket is created through the official MinIO client when the API starts.

Printing uses the following required settings:

| Variable                  | Purpose                                                    |
| ------------------------- | ---------------------------------------------------------- |
| `PRINTING_API_BASE_URL`   | Absolute HTTP(S) base URL of the printing-center API       |
| `PRINTING_API_KEY`        | API credential supplied only at the provider HTTP boundary |
| `PRINTING_API_TIMEOUT_MS` | Positive request timeout in milliseconds                   |

The committed example uses a reserved `.invalid` URL and a local placeholder key. Replace them only in the ignored
`.env` file. The integration persists a unique reference before submission, sends the scan with a single POST, and
never retries that non-idempotent request automatically. If the result is ambiguous, the reservation remains in
`confirmation_pending` and later reads reconcile it by stable reference before consulting the provider identifier.
Terminal observations release the scan for a later print request. The Web application mounts React without rendering
a product screen.

Generate the code-first OpenAPI contract without serving a public Swagger interface:

```bash
npm exec nx -- run api:openapi
```

The ignored output is written to `generated/openapi.json`. It is a generated contract and must not be edited by hand.
Swagger remains pinned to the selected release; the targeted npm override keeps its transitive YAML parser on
the patched compatible release validated by this generation command.

## Quality commands

```bash
npm exec nx -- format:check
npm exec nx -- run-many -t lint,typecheck,build --projects=api,web --nxBail
```

Run the focused Backend verification suites with:

```bash
npm exec nx -- test api --runInBand
```

This command runs colocated unit and printing-provider contract tests with synthetic values. The provider contract
tests use a controlled local HTTP server and never contact the real printing provider.

Use Nx to inspect the resolved workspace rather than relying only on partial project files:

```bash
npm exec nx -- show projects --json
npm exec nx -- show project api --json
npm exec nx -- show project web --json
```

## Workflow

1. Establish repository and Spec Kit governance.
2. Specify and clarify the complete MVP.
3. Explore and approve the responsive product design.
4. Translate accepted intent into a decision-complete technical plan.
5. Implement and verify each approved delivery issue.

The project uses GitHub issues and pull requests for execution state. Spec Kit artifacts describe accepted intent,
technical translation, and derived tasks without creating a competing roadmap.

## Deferred work

- Tailwind CSS, shadcn/ui, the Premium registry, routing, forms, and product screens
- Frontend component and feature tests
- GitHub Actions and deployment
