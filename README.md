# Vytruve Technical Assessment

Specification-driven React and NestJS implementation of the Vytruve technical assessment.

## Current stage

The repository contains the accepted product specification, design handoff, technical plan, and the executable
foundation. Product workflows remain deliberately deferred to their owning delivery issues.

The current foundation provides:

- an Nx monorepo with React/Vite and NestJS applications;
- strict TypeScript, ESLint, Prettier, type-check, and build targets;
- PostgreSQL and private MinIO services through Docker Compose; and
- an empty Liquibase XML migration chain executed only in a disposable container.

It does not yet expose a product API endpoint or render product UI.

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

`database/db.changelog-master.xml` is intentionally empty during the foundation stage. Product tables belong to the
backend delivery that owns their invariants.

## Applications

Start the local API and Web processes in separate terminals:

```bash
npm exec nx -- serve api
npm exec nx -- serve web
```

The API validates `NODE_ENV` and `API_PORT` before listening and reserves the `/api` prefix. The Web application
mounts React without rendering a product screen.

## Quality commands

```bash
npm exec nx -- format:check
npm exec nx -- run-many -t lint,typecheck,build --projects=api,web --nxBail
```

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

- Backend product modules, persistence mappings, storage adapters, printing integration, and OpenAPI
- Backend unit and HTTP integration tests
- Tailwind CSS, shadcn/ui, the Premium registry, routing, forms, and product screens
- Frontend component and browser tests
- GitHub Actions and deployment
