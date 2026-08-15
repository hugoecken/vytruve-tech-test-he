# Dokploy Production Handover

[Back to the main README](../../README.md)

This directory describes one bounded production environment. Routine releases never recreate PostgreSQL or MinIO and never build repository source on the VPS.

## Security prerequisite

Use Dokploy `v0.29.5` or later. Before enabling API/CLI-triggered Schedule Jobs, confirm that the vendor's `v0.29.3` security remediation has been applied to the instance. Create a dedicated release identity and restrict its production access to the narrowest permissions supported by the installed Dokploy edition.

## One-time resources

Provision these independent resources in one Dokploy project and environment:

1. `vytruve-postgres`, a retained PostgreSQL Database on `dokploy-network`.
2. `vytruve-infra-tools`, a Compose resource containing only [`minio.compose.yaml`](minio.compose.yaml).
3. `vytruve-api`, a Docker Application configured with `ghcr.io/hugoecken/vytruve-api:production`, internal port `3000`, and Auto Deploy enabled.
4. `vytruve-web`, a Docker Application configured with `ghcr.io/hugoecken/vytruve-web:production`, internal port `8080`, and Auto Deploy enabled.
5. `vytruve-migration`, a disabled-recurring Dokploy Server Schedule Job that is run manually by the release workflow.

The three GHCR packages are public so Dokploy and the migration job can pull them anonymously. Keep PostgreSQL, MinIO, and their volumes outside the API and Web application resources. Route the public origin to Web and `/api` to API without exposing PostgreSQL, MinIO, or a MinIO console port.

## Blocking migration job

Create `/etc/dokploy/vytruve/migration.env` outside the repository with owner-only permissions and these names:

```dotenv
LIQUIBASE_COMMAND_URL=
LIQUIBASE_COMMAND_USERNAME=
LIQUIBASE_COMMAND_PASSWORD=
```

Do not place values in repository, GitHub Actions, image layers, or review evidence. `/etc/dokploy` is part of Dokploy's retained configuration and must be included in the instance's protected backup process.

Configure the Schedule Job as `dokploy-server` with recurrence disabled and this single command:

```bash
docker run --rm --pull=always --network dokploy-network --env-file /etc/dokploy/vytruve/migration.env ghcr.io/hugoecken/vytruve-migration:production
```

The production workflow invokes the pinned official CLI command below and accepts only a returned `done` status:

```bash
npm exec --yes --package=@dokploy/cli@0.30.0 -- dokploy schedule run-manually --scheduleId "$DOKPLOY_MIGRATION_SCHEDULE_ID" --json
```

Liquibase owns `DATABASECHANGELOG` and `DATABASECHANGELOGLOCK`. Do not add automatic rollback, forced lock release, destructive initialization, or an always-running migration application.

## GitHub production environment

Configure these protected environment secrets:

- `DOKPLOY_API_KEY`
- `DOKPLOY_API_WEBHOOK_URL`
- `DOKPLOY_WEB_WEBHOOK_URL`

Configure these non-secret variables:

- `DOKPLOY_URL`
- `DOKPLOY_MIGRATION_SCHEDULE_ID`
- `PRODUCTION_ORIGIN`
- `CONTAINER_PLATFORM` such as `linux/amd64`

Dokploy owns all application runtime values. The API requires `APP_REVISION`, `NODE_ENV`, `API_PORT`, `WEB_ORIGIN`, JWT configuration, PostgreSQL configuration, scan limits, MinIO configuration, and printing-provider configuration. The workflow injects only the non-secret source revision at image build time. The Web build receives only its public API origin and source revision.

The GitHub `production` environment uses a custom branch policy limited to `main`, disallows administrator bypass, and requires no reviewer approval for the solo-maintainer repository. Protect `develop` and `main` with required pull requests, conversation resolution, and the `verify` check without an approval count. The workflow additionally rejects a promotion pull request whose head is not `develop`.

The official Nx SHA resolver keeps changes from a failed run in the next affected set. An empty deployable-project result skips production before approval. All jobs and remote waits have finite bounds.

## Release order and failure behavior

Nx is the sole affected-component authority. The workflow first publishes every selected immutable SHA-tagged image and records its digest. It then advances mutable pull pointers and triggers only selected stages:

1. Migration: retag the published digest as `migration:production`, then await the Schedule Job.
2. API: retag the published digest as `api:production`, call its Auto Deploy webhook, then require `/api/health/ready/<revision>`.
3. Web: retag the published digest as `web:production`, call its Auto Deploy webhook, then require `/health/<revision>`.

A migration failure leaves both application pointers and running applications unchanged. An API failure prevents Web promotion. A Web failure leaves the already healthy API running. Webhook acceptance is not deployment success; only the bounded revision-aware health request closes an application stage.

## Rollback limit

The approved rollback workflow accepts one application, one prior digest, and that image's full revision. It retags only that digest as the application's `production` pointer, triggers the same webhook, and verifies the expected revision. It never rebuilds source, runs Liquibase, reverses a changelog, restarts PostgreSQL or MinIO, or rolls back both applications in one approval.

Every schema change released with API code must use expand/backward-compatible evolution so the immediately previous API image remains a valid recovery artifact. Database rollback is intentionally unsupported.
