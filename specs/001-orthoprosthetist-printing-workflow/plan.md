# Implementation Plan: Orthoprosthetist Printing Workflow

**Status**: Accepted

**Feature**: `001-orthoprosthetist-printing-workflow` | **Date**: 2026-08-15 | **Accepted specification**: [`spec.md`](spec.md), explicitly accepted on 2026-08-15; immutable replacement binding pending integration

**Visual authorities**: The canonical Figma UI Library and Product Design identified by [`figma-profile.md`](../../.agents/skills/vytruve-best-practices/overlays/figma-profile.md). Their current accepted components, tokens, and screen compositions are inspected in Figma rather than duplicated in this plan.

**Planning authority**: GitHub issue #14 owns this bounded delivery reconciliation. The user explicitly approved this corrected plan and its local implementation on 2026-08-15. Git branch mutation, GitHub settings, image publication, and production mutation remain separately gated.

## Summary

Deliver a focused React SPA and NestJS API for account authentication, owner-scoped patient records, validated PLY scan storage, and safe printing-center submission and tracking. Nx orchestrates the npm workspace. PostgreSQL owns relational integrity, Liquibase XML owns schema evolution, TypeORM owns runtime mapping, and private MinIO stores scan objects. Nest emits the OpenAPI contract; Orval derives both the Fetch/TanStack Query client and Zod Mini request schemas. shadcn/ui owns rendering while TanStack Router, Query, and Table own routing, server state, and headless table behavior respectively.

Add one readable continuous-verification job and one selective production path. Ordinary pull requests integrate into a permanent `develop` branch without production mutation; a reviewed `develop`-to-`main` promotion verifies the exact `main` revision and then builds, publishes, deploys, and health-checks only the affected migration, API, and/or Web component. PostgreSQL and MinIO remain separately provisioned retained services. GitHub Actions publishes immutable GHCR images, runs Liquibase as a blocking Dokploy Schedule Job through the official CLI, and triggers API/Web deployments through their Dokploy Auto Deploy webhooks without SSH, a custom deployment client, or VPS source builds.

The architecture deliberately excludes CQRS, queues, workers, microservices, generic repositories, speculative shared packages, refresh tokens, presigned URLs, provider-wide discovery, universal data-table abstractions, Nx Cloud, distributed CI, deployment matrices, reusable-workflow layers, Kubernetes, a global production Compose stack, SSH delivery, automatic database rollback, and speculative platform infrastructure.

## Technical Context

**Language/Version**: TypeScript on Node.js 24 LTS

**Primary Dependencies**: Nx 23, React 19, Vite, TanStack Router, TanStack Query, TanStack Table, React Hook Form, Zod Mini 4, i18next, shadcn/ui, Lucide React, NestJS 11 with Express, `@nestjs/swagger`, `@nestjs/config`, `@nestjs/typeorm`, `@nestjs/jwt`, `@nestjs/throttler`, TypeORM, Argon2, MinIO JavaScript SDK, Orval; GitHub Actions, GHCR, Docker, Nginx, Liquibase 4.33.0, and Dokploy at the delivery boundary

**Storage**: PostgreSQL for relational state; private MinIO for PLY objects; browser local storage only for the non-sensitive language preference

**Schema management**: Liquibase XML through `database/db.changelog-master.xml`; TypeORM synchronization and migrations disabled

**Testing**: Existing Jest Backend and Vitest/Testing Library frontend suites remain the product evidence; issue #14 adds Nx affected-graph conformance evidence, health/revision tests, deterministic OpenAPI/Orval drift evidence, image smoke checks, and the CI-equivalent repository gate

**Target Platform**: Modern evergreen browsers and a Node.js Linux-compatible API runtime; local PostgreSQL and MinIO run with Docker Compose; production uses Linux containers on independently configured Dokploy resources behind its existing internal network and HTTPS routing

**Project Type**: Four-project Nx monorepo containing one React/Vite SPA, one NestJS REST API, database changelogs, and local infrastructure

**Performance Goals**: Bounded 50-item collection reads; bounded 25 MiB upload parsing; streaming downloads; fast persisted print-request pages followed by one independent provider-status refresh per opened page and explicit manual refreshes

**Constraints**: HTTP-only 30-minute JWT session, strict owner isolation, no blind non-idempotent retry, no automatic print-request polling, no unbounded parsing, no raw provider or generated validation message in the UI; production credentials are environment-scoped, releases are serialized and non-cancelling, remote waits are finite, retained services are not mutated by routine delivery, and third-party Actions use full commit SHAs

**Scale/Scope**: Four product stories plus one delivery story, three authenticated resource collections, thirteen public operations, two locales, desktop and compact layouts, one external printing provider, three selectively deployable artifacts, and two retained production services

## Constitution Check

### Pre-research gate

| Gate | Result | Evidence |
| --- | --- | --- |
| Repository authority first | Pass | Root instructions and routed policies were loaded before planning. |
| Accepted intent before architecture | Pass | The user explicitly accepted the FR-001…FR-070 and SC-001…SC-024 candidate on 2026-08-15; immutable Git integration remains a separate publication gate. |
| Accepted visual authority | Pass | US5, FR-058…FR-070, and SC-018…SC-024 add no product screen, interaction, or Figma state; existing Ready for Development evidence remains unchanged. |
| GitHub execution authority | Pass | Issue #14 owns this delivery plan; no branch, issue, pull request, setting, registry, Dokploy, or production state is mutated by Spec Kit. |
| Protected data | Pass | The plan contains no supplied credential, contact, scan content, real filename, or patient data. |
| Proportionality | Pass | One verification job, three images, the repository's existing Nx graph, one blocking Dokploy Schedule Job, two independent Dokploy applications, and one MinIO-only Compose resource serve explicit accepted boundaries; speculative layers are rejected. |
| Repository guidance transition | Pass with ordered prerequisite | Current overlays name `main` as ordinary integration. Issue #14 implementation updates those repository-specific overlays before introducing `develop`; no branch mutation occurs until the user separately authorizes it. |
| Derived-task boundary | Pass | `tasks.md` will remain a local checklist and will not create GitHub issues. |

### Post-design gate

This reconciliation introduces no new product destination, product interaction, patient or printing field, product lifecycle, provider promise, or public HTTP operation. It translates accepted delivery intent into repository verification, immutable images, selective promotion, retained-service protection, finite health evidence, and component-scoped recovery. The ordered overlay transition prevents the new branch model from silently conflicting with current repository guidance. The plan preserves React and NestJS as source-mandated constraints and retains every previously accepted product architecture choice. No constitution violation requires complexity justification.

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

### Delivery topology

```text
feature branch ──reviewed PR──► develop ──reviewed promotion PR──► main
       │                           │                                  │
       └──────── verify ───────────┴──────────── verify ──────────────┤
                                                                      ▼
                                                    Nx affected project graph
                                                                      │
                                      ┌───────────────────────────────┼───────────────────────────────┐
                                      ▼                               ▼                               ▼
                              migration image                    API image                       Web image
                                      └───────────────────────────────┼───────────────────────────────┘
                                                                      ▼
                                                          public GHCR by digest
                                                                      │
                                                                      ▼
                                                     protected production environment
                                                                      │
                                      ┌───────────────────────────────┼───────────────────────────────┐
                                      ▼                               ▼                               ▼
                         Dokploy migration Schedule Job      Dokploy API app               Dokploy Web app
                                      │                               │                               │
                                      ▼                               ├──────────────► private MinIO  │
                               retained PostgreSQL ◄──────────────────┘                               │
                                      ▲                                                               │
                                      └──────────────────── existing Dokploy network ─────────────────┘
```

`develop` becomes the protected ordinary integration branch and never deploys production. `main` becomes the protected production-promotion branch. A pull request to `main` fails the required verification check unless its head branch is exactly `develop`. The first implementation step updates `repository-profile.md` and `git-profile.md` to this accepted model; creating `develop`, changing repository settings, or pushing any branch still requires separate user authorization.

### GitHub workflow gates

`.github/workflows/ci.yml` is the single verification and routine-promotion workflow:

- trigger on pull requests targeting `develop` or `main` and pushes to either branch;
- expose one required `verify` job name for both protected branches;
- use `pull_request`, never `pull_request_target`, so untrusted change verification cannot access production authority;
- fail a `main` pull request whose head is not `develop` before running the repository checks;
- derive the deployable-project JSON in `verify` and skip the production job entirely when that result is empty;
- run production only for a successful `push` to `main`, after `verify` succeeds for the same `${{ github.sha }}`;
- reference the protected `production` environment only from production jobs;
- serialize the production group with queued, non-cancelling concurrency;
- grant job-scoped least privilege: read-only source for verification and `packages: write` only while publishing selected images.

`.github/workflows/rollback.yml` is an environment-approved recovery workflow, not a release path. It accepts exactly one application component (`api` or `web`) and one previously published immutable digest from that component's GHCR repository, validates both values, and redeploys only that digest. It cannot run migrations, rebuild source, mutate PostgreSQL or MinIO, or roll back more than one application per approval.

Branch protection and environment configuration are one-time GitHub settings documented for the reviewer:

- `develop`: require a pull request, one approval, conversation resolution, and the `verify` check;
- `main`: apply the same protections, reject direct pushes, and rely on the workflow guard to allow only `develop` as the pull-request head;
- `production`: require approval, allow only protected `main`, disallow protection bypass where the repository plan supports it, and own the sole deployment secret.

### Continuous verification

The `verify` job uses Node.js 24 and `npm ci`, then runs one readable sequence:

1. ask Nx once for the deployable-project JSON and expose it to the release job;
2. run `npm exec nx -- format:check --base=<base> --head=<head>`;
3. run lint, strict type checks, and the existing Jest and Vitest suites through one `nx affected` boundary;
4. start the minimum ephemeral PostgreSQL and MinIO dependencies;
5. run the affected `database:migrate` target, whose Nx dependency validates the changelog before applying it to the ephemeral database;
6. emit OpenAPI and generate both Orval outputs from a clean generated directory, record a deterministic manifest, repeat the complete generation, and fail on any byte-level manifest difference;
7. build affected applications through `npm exec nx -- affected -t build --base=<base> --head=<head>`;
8. stop ephemeral Compose dependencies in an unconditional final step.

The workspace stays at four Nx projects: `api`, `web`, `database`, and `infrastructure`. Nx's affected graph is the sole change-selection authority for verification and release; no workflow glob table or custom changed-path selector duplicates it. CI always supplies explicit immutable base and head revisions. Infrastructure and database targets remain uncached. Delivery uses the official Dokploy CLI, Docker CLI, Auto Deploy webhooks, `curl`, and `jq`; the repository owns no custom Dokploy client or polling script.

Nx AI skills are refreshed only by running the current official skills-only command in a disposable directory, comparing the result with the repository-owned skills, and deliberately copying compatible changes. The workflow does not install or connect Nx Cloud, Replay, Agents, remote caching, or self-healing CI.

### Nx affected production authority

The official `nrwl/nx-set-shas` action resolves an immutable comparison range from the last successful workflow on the current target branch to the current source revision. The `verify` job asks Nx directly for the affected deployable projects in that range and passes its JSON result to production:

```bash
npm exec nx -- show projects \
  --affected \
  --base=<last-successful-revision> \
  --head=<source-revision> \
  --withTarget=container \
  --json
```

Only `database`, `api`, and `web` own the planned `container` target. The `infrastructure` project deliberately has no routine-release target, so retained PostgreSQL and MinIO provisioning cannot enter this result. An empty result skips the protected production job before environment approval. GitHub Actions otherwise consumes the Nx JSON result directly and contains only the stable project-to-Dokploy-resource association; it contains no file globs or parallel ownership table.

Issue #14 aligns the Nx model before using it for delivery:

- `apps/api/**`, `apps/web/**`, and `database/**` remain owned by their existing projects;
- application-consumed root files such as `package.json`, Orval configuration, and the root Docker context are represented through dependency analysis and project-scoped Nx named inputs;
- Nx's built-in root TypeScript configuration handling conservatively includes every targetable project for `tsconfig.base.json`; this official safe over-selection is retained instead of adding a manual selector exception;
- lockfile changes use the Nx JavaScript plugin's dependency-aware `projectsAffectedByDependencyUpdates: "auto"` behavior rather than marking non-Node infrastructure by default;
- repository documentation and specifications remain outside deployable project inputs;
- retained-service definitions remain owned by `infrastructure`, which has no `container` target;
- a missing named input, invalid project configuration, unavailable revision, or failed Nx graph query blocks promotion instead of falling back to every component.

Post-configuration checks on 2026-08-15 resolve an API file to `api`, a Web file to `web`, a changelog file to `database`, a specification file to no project, `package.json` and `.dockerignore` to both applications, Orval configuration to Web, and the retained MinIO definition to no deployable project. Dependency-aware lockfile handling excludes non-Node infrastructure. The root `tsconfig.base.json` retains Nx's documented conservative targetable-project behavior described above.

Conformance evidence invokes the Nx CLI with representative `--files` fixtures for database-only, API-only, Web-only, shared-application, documentation-only, retained-infrastructure, and combined changes. It asserts the resolved project names and task graph; it does not reimplement Nx selection logic.

When several deployable projects are affected, the workflow consumes the Nx result in migration, API, then Web order. A failed selected job prevents later selected jobs. An unaffected job is skipped, not treated as a failure, and its currently running resource remains untouched.

### Production images

All images use simple repository-owned Dockerfiles and a root `.dockerignore` declared as an Nx input of the application projects whose build context consumes it:

| Image | Dockerfile and context | Base | Runtime contract |
| --- | --- | --- | --- |
| `ghcr.io/hugoecken/vytruve-api` | `apps/api/Dockerfile`, repository root | `node:24-bookworm-slim` build and runtime stages | Nx production build; locked root production dependencies only; built-in non-root Node user; `3000` internal only |
| `ghcr.io/hugoecken/vytruve-web` | `apps/web/Dockerfile`, repository root | `node:24-bookworm-slim` build; `nginxinc/nginx-unprivileged:alpine` runtime | Vite build with the public API origin; static files only; listen on `8080`; `/health` returns `200`; one SPA fallback |
| `ghcr.io/hugoecken/vytruve-migration` | `database/Dockerfile`, `database/` | `liquibase/liquibase:4.33.0` | Changelog tree only; official `update` command directly; no shell wrapper or rollback command |

Multi-stage application builds copy only required output into runtime stages. Docker base images use the readable tags above without digest pins. Third-party GitHub Actions use full commit SHAs. Each selected image first receives the immutable source-commit tag and OCI source/revision labels, is pushed with the job-scoped `GITHUB_TOKEN`, and records its returned `sha256` registry digest. Packages are made public once so Dokploy needs no registry credential; the one-time visibility operation is documented and never automated with broader package authority.

The mutable `production` tag is only a Dokploy pull pointer because Auto Deploy webhooks deploy the application's configured image reference. Docker promotes the already-published digest to that tag immediately before the selected stage: migration first, API only after migration succeeds, and Web only after API succeeds. No source rebuild occurs during promotion. The immutable SHA tag and digest remain the audit and rollback identity, and revision-aware health checks prove which source revision actually became healthy.

### Independent Dokploy resources

| Resource | Type | Routine release ownership | Internal port |
| --- | --- | --- | --- |
| `vytruve-postgres` | Dokploy PostgreSQL Database | Provisioned once; never selected or restarted by release | `5432` |
| `vytruve-migration` | Dokploy Server Schedule Job running the published Liquibase image | Selected only by database inputs; its manual run blocks later selected jobs | none |
| `vytruve-api` | Dokploy Docker Application using the public GHCR `production` pointer | Selected only by API-owned or shared inputs | `3000` |
| `vytruve-web` | Dokploy Docker Application using the public GHCR `production` pointer | Selected only by Web-owned or shared inputs | `8080` |
| `vytruve-infra-tools` | Dokploy Compose containing MinIO only | Provisioned explicitly; never selected or restarted by release | `9000` |

PostgreSQL, migration containers, API, Web, and MinIO join Dokploy's existing internal network. No resource publishes a VPS host port. Dokploy's domain routing sends the public HTTPS origin to Web `8080` and `/api` to API `3000`; PostgreSQL and MinIO remain private. `infrastructure/dokploy/minio.compose.yaml` contains exactly one MinIO service, one named volume, one internal exposed port, the external Dokploy network, and the server command. It has no console exposure, bootstrap container, policy file, deployment script, or host port.

For the bounded prototype, the API receives the MinIO root values through its existing access-key variable names and creates the fixed private bucket during startup when absent. This trade-off is documented; a scoped production MinIO identity is deferred beyond the assessment.

### Dokploy control and bounded waits

The migration is a preconfigured `dokploy-server` Schedule Job. Its script contains one Docker command that runs `ghcr.io/hugoecken/vytruve-migration:production` with `--rm`, `--pull=always`, the existing `dokploy-network`, and a protected deployment-side environment file. The file is provisioned once outside the repository and contains only Liquibase runtime configuration. The job has no useful recurring schedule and is started explicitly by the workflow.

The workflow invokes the pinned official `@dokploy/cli` command `dokploy schedule run-manually --scheduleId ... --json`. This API call awaits the Docker command and returns a terminal job result. `jq -e` accepts only `status == "done"`; CLI failure, malformed JSON, `error`, or any other status blocks API and Web promotion. No repository script wraps, polls, or interprets Dokploy.

API and Web use the Auto Deploy webhook URLs copied from their Dokploy application settings. A webhook success proves only that Dokploy accepted the deployment request, because the official handler enqueues work and returns before completion. The workflow therefore verifies the expected revision through the public health route with `curl --fail --retry --retry-all-errors` and a finite retry count. The webhook URL is a production secret and neither its response body nor authentication material is logged.

The production runbook requires Dokploy `v0.29.5` or later and completion of the vendor's `v0.29.3` security remediation before enabling API/CLI-triggered Schedule Jobs. The production key is restricted to the dedicated release identity and environment to the degree supported by the installed Dokploy edition.

### Health, failure, and rollback

- API `/api/health/live` proves the process can serve requests and reports its source revision.
- API `/api/health/ready/:revision` returns success only when the running revision matches and PostgreSQL plus private MinIO are reachable; it excludes the printing provider.
- Web `/health/:revision` returns `200` directly from Nginx only when the served build carries the expected revision.
- Migration success is the one-shot `update` exit result plus the Schedule Job's terminal `done` result; there is no production `validate`, `status`, wrapper, rollback, or forced unlock.
- After each application webhook is accepted, the workflow performs its bounded revision-aware HTTPS health check through the production origin.
- Failed migration stops API and Web rollout. Failed API readiness stops Web rollout. Failed Web rollout leaves the already healthy API running.
- Routine failure never triggers automatic rollback. The approved rollback workflow restores only the selected API or Web digest and repeats its bounded health check.
- Schema changes shipped with API changes must remain compatible with the immediately previous API image; otherwise application rollback is not claimed and the change returns to planning before release.

### Production configuration

The protected GitHub `production` environment owns `DOKPLOY_API_KEY`, `DOKPLOY_API_WEBHOOK_URL`, and `DOKPLOY_WEB_WEBHOOK_URL` as secrets. It owns `DOKPLOY_URL`, `DOKPLOY_MIGRATION_SCHEDULE_ID`, `PRODUCTION_ORIGIN`, and `CONTAINER_PLATFORM` as non-secret variables. Fixed internal ports are not variables.

Dokploy owns runtime secrets and configuration:

- PostgreSQL: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`;
- migration Schedule Job: one protected deployment-side environment file containing `LIQUIBASE_COMMAND_URL`, `LIQUIBASE_COMMAND_USERNAME`, and `LIQUIBASE_COMMAND_PASSWORD`;
- API: `NODE_ENV=production`, `API_PORT=3000`, `WEB_ORIGIN`, JWT values, database host and credentials, scan-size limit, MinIO endpoint and credentials, and printing-provider configuration;
- Web build: the non-secret `VITE_API_BASE_URL=<PRODUCTION_ORIGIN>/api` value only;
- MinIO: `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`.

No runtime secret enters a workflow file, pull-request job, build argument, image layer, artifact, cache, or log.

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
- TanStack Query owns all server state. Initial and adjacent-page failures with no query data expose a localized blocking retry state; background refresh failures may keep TanStack-retained data visibly last-known. Print-request collection data and provider-refreshed status data use separate page-keyed queries so the persisted page renders without waiting for Vitruve.
- Successful reads remain fresh until an explicit mutation invalidation, page change, retry, or manual refresh. Orval-generated query functions do not consume TanStack Query's abort signal, so short safe GET requests can settle into the cache across development remounts instead of being cancelled and immediately repeated.
- The visible page indicator derives directly from `query.data.pageInfo.page`. Paginated queries include the requested page in the query key and use `keepPreviousData` only while the adjacent page is pending; no second client-side snapshot mirrors a prior response.
- shadcn/ui source components under `shared/ui` are the only visual primitives. TanStack Table supplies column, row, and pagination state without rendering.
- Patient, scan, and print-request rows expose their primary open or consultation action through one shared keyboard-accessible table-row behavior. Scan and print-request consultation reuse one shared read-only overlay composition: a desktop Dialog and a compact bottom Drawer fed exclusively from the selected TanStack Table row. Scan consultation omits scan identifiers, while print-request consultation renders Estimated progress as percentage text without the table's progress bar. Nested scan download and print controls remain independent.
- Two bounded shared recovery primitives are allowed: `CollectionLoadError` owns the no-data retry state, and `CollectionRecoveryAlert` owns background-refresh recovery when TanStack-retained rows remain visible. Each feature owns its columns, copy, and retry behavior.
- One light table shell owns the surface, horizontal overflow, and Previous/Page/Next controls; patient, scan, and print tables keep separate column definitions and feature behavior.
- No source is promoted to a shared package until at least two real consumers prove cross-feature ownership.

Reference English recovery copy remains contextualized by collection:

- Initial read: `Unable to load {collection}` and `We couldn’t load this information. Check your connection and try again.`
- Adjacent page: use the same blocking collection-load recovery as an initial read failure.
- Background refresh: `{Collection} could not be refreshed` and `Showing the last information received. Try again to check for updates.`

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

The web client loads the persisted print-request page when its tab becomes active, then enables one separate page-keyed provider-status query. During either automatic or manual status refresh, active requests use skeletons in their Status and Estimated progress cells while completed and failed values remain visible because the backend skips terminal reconciliation. The rest of the table remains available. The refresh button remains visually idle during the automatic refresh and indicates pending state only after explicit user activation. There is no automatic polling. A failed status refresh preserves the persisted or last-refreshed rows and their last-observed time.

## Validation And Test Ownership

Issue #14 adds no product-behavior tests, but it does add focused delivery-boundary tests. Automated test responsibilities are intentionally focused:

- #9: Jest unit tests and controlled printing-provider adapter contract tests.
- #12: Vitest, Testing Library, React Hook Form/Zod, Router, Query, tables, i18n, and accessibility.
- #14: CI orchestration, deterministic OpenAPI/Orval generation, Nx affected-graph conformance checks, health/revision tests, image smoke evidence, and bounded delivery/rollback checks.

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
├── quickstart.md
├── contracts/
│   └── http-api.md
└── tasks.md
```

### Executable workspace

```text
apps/
├── api/
│   ├── Dockerfile
│   └── src/
│       ├── app/
│       ├── config/
│       ├── common/
│       │   ├── errors/
│       │   └── logging/
│       └── modules/
│           ├── accounts/
│           ├── auth/
│           ├── patients/
│           ├── scans/
│           └── printing/
└── web/
    ├── Dockerfile
    ├── nginx.conf.template
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
├── Dockerfile
├── project.json
├── db.changelog-master.xml
└── changelog/
    ├── 001-accounts-patients.xml
    ├── 002-scans.xml
    └── 003-printing.xml
infrastructure/
├── compose.yaml
└── dokploy/
    ├── README.md
    └── minio.compose.yaml
.github/
└── workflows/
    ├── ci.yml
    └── rollback.yml
.dockerignore
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

The four project names and the target syntax above were resolved from the current workspace. Issue #14 may add root aliases only when they delegate directly to these Nx targets.

## Traceability Matrix

| Accepted identifiers | Technical component | Planned proof owner |
| --- | --- | --- |
| FR-001–FR-010; SC-002 | `AccountsModule`, `AuthModule`, auth routes/forms, cookie guard, i18next profile menu | #9 backend auth evidence; #12 frontend auth/i18n evidence; #14 manual story review |
| FR-011–FR-016; SC-001, SC-011, SC-015 | Router layout/fallback, owner-scoped patient queries, concealed 404 mapping | #9 ownership logic evidence; #12 Router evidence; #14 manual navigation review |
| FR-017–FR-021; SC-003 | Patient DTOs/entity/service, patient form and table | #9 patient logic evidence; #12 form/table evidence; #14 manual story review |
| FR-022–FR-030; SC-004, SC-009 | Bounded PLY validator, MinIO adapter, scan metadata, stream response, upload drawer/dialog | #9 PLY/storage logic evidence; #12 upload-state evidence; #14 manual story review |
| FR-031–FR-044; SC-005–SC-007 | Print reservation, active-slot constraint, provider adapter/reconciliation, manual status refresh and print table | #9 provider/state evidence; #12 Query/lifecycle evidence; #14 manual story review |
| FR-045–FR-046; SC-012 | Server-page contract, TanStack paginated queries, headless tables and shadcn rendering | #9 pagination logic evidence; #12 responsive table/pagination evidence; #14 manual responsive review |
| FR-047–FR-051; SC-008, SC-010 | Problem Details, typed Fetch error, localized feedback, mutation guards, stale-query preservation | #9 error logic evidence; #12 state/retry evidence; #14 manual degraded-state review |
| FR-057; SC-017 | Direct TanStack Query state, `CollectionLoadError`, `CollectionRecoveryAlert`, and collection-specific retry behavior | #12 initial/page/refresh state evidence; #14 manual collection-recovery review |
| FR-052–FR-053 | shadcn semantics, keyboard/focus/announcement behavior, 44 px compact targets | #12 accessibility evidence; #14 manual interaction review |
| FR-054; SC-011 | Minimal schemas, private storage, logging denylist, synthetic evidence | #9 security review; #14 repository scans |
| FR-055–FR-056; SC-015–SC-016 | Auth-aware not-found fallback and root route error boundary | #12 fallback evidence; #14 authenticated/public recovery review |
| FR-058–FR-060; SC-018–SC-019 | Node 24 CI, one required `verify` job, ephemeral dependencies, Liquibase and deterministic generation gates | #14 workflow inspection and CI run |
| FR-061–FR-063; SC-020–SC-021 | Protected `develop`/`main` flow, Nx affected component selection, public immutable GHCR images | #14 affected-graph conformance, image metadata/smoke checks, and protected-branch review |
| FR-064–FR-067; SC-022–SC-023 | Independent Dokploy resources, migration-before-app ordering, retained PostgreSQL/MinIO, bounded health evidence | #14 health/revision tests, controlled deployment evidence, and resource inspection |
| FR-068–FR-070; SC-024 | Production environment isolation, secret-safe diagnostics, app-digest rollback without database rollback | #14 workflow review, negative-path validation, and approved recovery rehearsal |
| SC-001 | Five story slices remain independently executable | #9 and #12 focused product evidence plus #14 delivery evidence |
| SC-013 | React/Vite and NestJS/Nx structure | #14 type-check/build and architecture review |
| SC-014 | README, quickstart, decisions, AI disclosure, reviewable Git history | #14 delivery review |

All `FR-001…FR-070` and `SC-001…SC-024` are represented above.

## Complexity Tracking

No constitution violation is present. PostgreSQL, MinIO, and the printing adapter each protect a distinct accepted boundary; Nx orchestrates the required frontend/backend repository; Liquibase replaces rather than duplicates TypeORM schema ownership; Zod generation derives from rather than competes with OpenAPI. One migration Schedule Job and two Dokploy Applications exist because migration, API, and Web have different lifecycle and rollback semantics; retained PostgreSQL and MinIO are explicitly outside routine release ownership.

## Approval Gate

This issue #14 reconciliation was explicitly accepted on 2026-08-15, including local runtime implementation. The earlier product plan remains historical evidence. Git branch mutation, GitHub settings, image publication, package-visibility changes, and production mutation remain separately gated by the owning execution item, routed source gates, and explicit user authorization where repository policy requires it.
