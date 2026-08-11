# Local Runtime Policy

## Goal

A reviewer must be able to start the database, API, and web application with short documented commands and receive actionable failures when a dependency is missing.

## Process model

- Run PostgreSQL and any repository-selected local object storage with Docker Compose.
- Run the API and Vite dev server as local Nx processes during development.
- Do not containerize the application merely for symmetry unless deployment or evaluation requires it.
- Add a health endpoint that distinguishes application availability from dependency readiness when that distinction is useful.

## Docker Compose

- Pin a supported PostgreSQL image version.
- Use named volumes and service health checks for stateful infrastructure.
- Expose only the local port needed for development.
- Use development-only placeholder credentials in Compose or `.env.example`; never reuse production-like secrets.
- Keep startup idempotent and avoid destructive initialization scripts.

## Environment variables

- Maintain a safe `.env.example` with descriptions or obvious placeholders.
- Validate required configuration before listening on the API port.
- Keep frontend-exposed variables limited to values safe for any browser user.
- Never prefix secrets for Vite exposure.
- Normalize selected storage endpoints or roots, private bucket names, and numeric limits at startup.

## Nx commands

- Expose short root npm scripts as the stable interface for common repository-wide workflows, and make application workflow scripts delegate to Nx.
- Use `npm exec nx -- ...` for graph inspection and granular project execution so the repository-local Nx binary is authoritative.
- Keep npm responsible for dependency installation and command aliases; keep Nx responsible for project selection, target dependencies, parallel execution, and caching.
- Let Nx targets invoke their configured native tools directly rather than routing back through root npm scripts.
- Keep external local infrastructure under its native orchestrator unless integrating it into the Nx graph provides a concrete dependency or validation benefit.
- Inspect project configuration before documenting a command.
- Prefer one named target over long undocumented shell recipes.
- Keep CI and local targets aligned so validation does not rely on a separate implementation.

## Runtime artifacts

Keep database and object-storage volumes, uploads, generated clients, emitted OpenAPI, logs, coverage, caches, and build output outside Git. Never delete broad directories during cleanup; target only the exact validated runtime resource.
