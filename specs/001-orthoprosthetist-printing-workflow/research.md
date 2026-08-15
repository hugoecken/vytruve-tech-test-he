# Technical Research: Orthoprosthetist Printing Workflow

**Status**: Accepted

This document records decisions that support [`plan.md`](plan.md). It does not replace the accepted specification, executable contracts, or implementation evidence.

## Runtime And Workspace

### Node.js 24 LTS, npm, and Nx 23

**Decision**: Pin Node.js 24 LTS and npm for dependency installation. Use Nx 23 as the only workspace task orchestrator through `npm exec nx -- …`.

**Rationale**: Node 24 is an LTS release suitable for production applications. Nx provides project selection, dependency-aware pipelines, parallel execution, affected execution, and caching across the required React and NestJS applications. npm remains responsible for installing the locked dependency graph, not for duplicating project orchestration. [Node.js release schedule](https://nodejs.org/en/about/previous-releases), [Nx task orchestration](https://nx.dev/docs/features/run-tasks)

**Alternatives considered**:

- Independent frontend and backend repositories: rejected because the assessment is one deliverable with shared contract generation and validation.
- npm scripts as the primary orchestrator: rejected because it would make Nx decorative and duplicate dependency ordering.
- Nx Cloud: rejected because remote execution and monitoring are not required for this assessment.

### React 19/Vite and NestJS 11/Express

**Decision**: Use a client-rendered React 19 SPA built by Vite and a NestJS 11 REST API on the default Express platform.

**Rationale**: React and NestJS are source-mandated. Vite is the proportional SPA runtime, while Express is required by the selected Nest file-upload integration. Server Components require a framework/runtime architecture not needed by this client-rendered product.

**Alternatives considered**:

- Next.js and React Server Components: rejected because they add a server-rendering runtime not requested by the brief or product flows.
- NestJS Fastify: rejected because Express/Multer is the direct documented upload path and no measured Fastify need exists.
- Separate microservices: rejected because five cohesive modules inside one API are sufficient.

## Backend Structure And Persistence

### Feature-first NestJS modules

**Decision**: Use `AccountsModule`, `AuthModule`, `PatientsModule`, `ScansModule`, and `PrintingModule`, with thin controllers, constructor-injected providers, and explicit API, persistence, and provider mappers.

**Rationale**: Nest modules are encapsulation boundaries; controllers translate HTTP, and providers own application behavior. The structure keeps one readable vertical path without hiding business behavior in framework hooks. [NestJS modules](https://docs.nestjs.com/modules), [NestJS controllers](https://docs.nestjs.com/controllers), [NestJS providers](https://docs.nestjs.com/providers)

**Alternatives considered**:

- One generic CRUD module: rejected because ownership, storage, and printing each have distinct invariants.
- CQRS, command bus, event bus, or background workers: rejected because no accepted asynchronous delivery requirement needs them.
- Generic repositories or base services: rejected because TypeORM already exposes repositories and feature queries differ meaningfully.

### PostgreSQL, TypeORM runtime mapping, and Liquibase XML

**Decision**: PostgreSQL owns relational state and constraints. Nest injects TypeORM repositories for runtime access. Liquibase XML is the sole schema authority; TypeORM `synchronize` and migrations remain disabled.

**Rationale**: Nest documents `TypeOrmModule.forFeature()` and `@InjectRepository()` for feature-scoped repositories. Liquibase root changelogs can include ordered feature changelogs, and platform-independent XML change types express the required tables and unique constraint without handwritten SQL. Keeping one schema owner prevents drift. [NestJS database integration](https://docs.nestjs.com/techniques/database), [TypeORM migration setup](https://typeorm.io/docs/migrations/setup/), [Liquibase changelog structure](https://docs.liquibase.com/community/implementation-guide-5-0/set-up-your-changelog-structure), [Liquibase unique constraint](https://docs.liquibase.com/reference-guide/change-types/adduniqueconstraint)

**Alternatives considered**:

- `synchronize: true`: rejected because automatic schema mutation is unsafe and conflicts with an auditable migration chain.
- TypeORM migrations: rejected because they would create a second migration mechanism and require handwritten TypeScript/SQL the repository deliberately avoids.
- Prisma: rejected because TypeORM is the selected Nest integration and changing ORM adds no product value.
- SQLite: rejected because PostgreSQL constraints, concurrency behavior, and production parity are part of the design.

### Nullable active slot for print concurrency

**Decision**: Persist `active_slot=true` for non-terminal print requests and `active_slot=null` for terminal history; enforce unique `(scan_id, active_slot)` plus a state/slot check constraint.

**Rationale**: PostgreSQL unique constraints allow multiple rows containing `NULL` while preventing two `(scan_id, true)` rows. This protects the one-active-request invariant under concurrency using standard Liquibase change types and preserves unlimited terminal history.

**Alternatives considered**:

- Application-only pre-check: rejected because two concurrent requests could both pass.
- Partial unique index: valid PostgreSQL design but rejected because the selected slot constraint is expressible without database-specific SQL.
- Overwriting one print row: rejected because the accepted product needs lifecycle history and reprinting after terminal outcomes.

## Authentication And Security

### Argon2id and one short-lived cookie JWT

**Decision**: Hash passwords with `argon2` Argon2id using explicit `memoryCost=65536` KiB, `timeCost=3`,
`parallelism=4`, `hashLength=32`, and version `0x13`. Issue one 30-minute HS256 JWT containing only `sub`,
`iat`, and `exp` in an HTTP-only cookie.

**Rationale**: Nest recommends maintained bcrypt or Argon2 packages rather than custom hashing. The selected values make
the maintained `argon2` package defaults explicit, so upgrades cannot silently change the work factor. A short-lived
cookie token meets the narrow single-browser assessment flow while keeping credentials outside browser JavaScript.
Issuer, audience, signature, and expiry validation prevent accepting tokens outside their intended context.
[NestJS encryption and hashing](https://docs.nestjs.com/security/encryption-and-hashing),
[NestJS authentication](https://docs.nestjs.com/security/authentication),
[`node-argon2` project](https://github.com/ranisalt/node-argon2)

**Alternatives considered**:

- Custom password derivation: rejected as unsafe and unnecessary.
- Token in `localStorage`: rejected because it exposes bearer material to browser JavaScript.
- Refresh tokens or server-side session storage: rejected because a 30-minute reauthentication boundary is sufficient and simpler.
- External identity provider: rejected because account creation is part of the requested implementation and no federation requirement exists.

### CORS and authentication throttling

**Decision**: Restrict credentialed CORS to the configured web origin. Rate-limit registration and sign-in to five attempts per minute per trusted client IP.

**Rationale**: Nest exposes configurable CORS and route-specific throttling. The chosen bound reduces brute-force and creation abuse without adding a distributed rate-limit store for a single-instance assessment. Proxy trust must be explicit before forwarded IPs are accepted. [NestJS CORS](https://docs.nestjs.com/security/cors), [NestJS rate limiting](https://docs.nestjs.com/security/rate-limiting)

**Alternatives considered**:

- Wildcard credentialed CORS: rejected because it is invalid and unsafe.
- Redis throttler storage: rejected until multi-instance deployment exists.
- CAPTCHA: rejected because it adds external UX and provider scope not present in the specification.

## Files And External Printing

### Private MinIO object storage

**Decision**: Store validated PLY objects in one private MinIO bucket under opaque random keys. Upload server-side, persist only required metadata, stream authorized downloads, and compensate the exact new object when database persistence fails.

**Rationale**: MinIO supplies a maintained S3-compatible JavaScript SDK for streamed object operations. Nest provides Multer/`ParseFilePipe` upload primitives and `StreamableFile` for response streaming. This demonstrates a real external storage boundary without exposing a bucket, object key, or presigned URL. [MinIO JavaScript SDK](https://docs.min.io/aistor/developers/sdk/javascript/api/), [NestJS file upload](https://docs.nestjs.com/techniques/file-upload), [NestJS streaming files](https://docs.nestjs.com/techniques/streaming-files)

**Alternatives considered**:

- Local filesystem storage: simpler but rejected because the selected assessment deliberately demonstrates a replaceable S3-compatible boundary.
- PostgreSQL binary storage: rejected because it couples large file streaming to relational persistence.
- Browser-direct or presigned uploads: rejected because they complicate authorization, validation, and CORS without an accepted scale requirement.
- Original filename as key: rejected because it is untrusted, identifying, collision-prone input.

### Bounded PLY validation

**Decision**: Enforce the exact 25 MiB boundary at Multer and application validation, parse a bounded PLY 1.0 header and body for ASCII, binary little-endian, and binary big-endian, and require a non-empty mesh.

**Rationale**: Extension and MIME metadata cannot establish valid scan content. Bounded parsing accepts the supplied evidence while preventing unbounded allocation and malformed counter traversal. Uploads use the dedicated file-validation path rather than the JSON request schema stack.

**Alternatives considered**:

- Extension/MIME-only validation: rejected as an untrusted client assertion.
- Full geometric or medical validation: rejected as outside the brief and disproportionate.
- Loading arbitrary file sizes into memory: rejected because the product defines an exact bounded input.

### Non-idempotent printing submission and reconciliation

**Decision**: Persist a unique reference and local reservation before a single provider POST. Never retry an ambiguous POST. Reconcile subsequent reads by reference, then by provider identifier when known.

**Rationale**: A timeout or connection reset after a non-idempotent POST does not prove rejection. Persisted identity allows safe lookup without provider-wide listing and prevents duplicate production. Capacity rejection is definite and removes the local reservation; ambiguity remains `confirmation_pending`.

**Alternatives considered**:

- Automatic POST retries: rejected because they may create duplicate physical jobs.
- Provider global-list search: rejected because it is unscoped and unnecessary when reference lookup exists.
- Queue/worker reconciliation: rejected because bounded read-triggered reconciliation and client refresh are adequate for the MVP.

## HTTP Contract And Generation

### Nest code-first OpenAPI and two Orval outputs

**Decision**: Nest DTOs, controllers, runtime validation, and Swagger metadata own the HTTP contract. One emitted OpenAPI document feeds two Orval outputs: native Fetch/TanStack Query in `tags-split` mode and Zod Mini 4 schemas in `*.zod.ts` files.

**Rationale**: Concrete Nest classes are available to runtime reflection and validation. Orval explicitly documents separate HTTP-client and Zod outputs, including the distinct extension to avoid filename conflicts. One upstream contract prevents manual enum and request-shape duplication. [NestJS OpenAPI types](https://docs.nestjs.com/openapi/types-and-parameters), [Orval client with Zod](https://orval.dev/docs/guides/client-with-zod/), [Orval Zod guide](https://orval.dev/docs/guides/zod/)

**Alternatives considered**:

- Handwritten frontend types or schemas: rejected because they duplicate the executable contract.
- Zod as backend runtime authority: rejected because Nest `class-validator` remains the server trust boundary.
- One mixed Orval output: rejected because Orval documents separate client and Zod configurations and separate filenames.
- Axios: rejected because native Fetch is sufficient and avoids a second transport dependency.

### RFC 9457 Problem Details

**Decision**: Serialize every public error as `application/problem+json` with stable codes and safe field violations.

**Rationale**: One predictable transport shape lets the frontend distinguish authentication, validation, ownership concealment, storage, capacity, provider ambiguity, and internal failures without parsing human messages. Translation remains a presentation responsibility.

**Alternatives considered**:

- Endpoint-specific ad hoc error bodies: rejected because they create branching and contract drift.
- Raw exception or provider messages: rejected because they are unstable and may contain sensitive implementation detail.

## Frontend Architecture

### TanStack Router file routes and auth guard

**Decision**: Use TanStack Router's Vite file-route plugin. A pathless authenticated layout uses `beforeLoad` to restore/check the session and preserve only a validated internal destination.

**Rationale**: File routing is the TanStack-recommended approach and generates type-safe route linkage. `beforeLoad` runs before child loaders and is the documented boundary for authentication redirects. [TanStack Router file-based routing](https://tanstack.com/router/latest/docs/routing/file-based-routing), [TanStack authenticated routes](https://tanstack.com/router/latest/docs/framework/react/guide/authenticated-routes)

**Alternatives considered**:

- React Router: rejected because the repository has selected one router and wants generated file routes.
- Component-level redirect effects: rejected because they can render protected composition before routing resolves and duplicate route policy.
- Arbitrary return URLs: rejected because external or malformed redirects create an open-redirect risk.

### TanStack Query server-page state

**Decision**: Use generated paginated-query options keyed by the zero-based server page and fixed page size. Preserve the preceding result with `placeholderData: keepPreviousData` while the adjacent page loads.

**Rationale**: The product needs simple Previous/Next navigation without filtering, infinite loading, or direct access to arbitrary pages. TanStack Query documents page state in the query key and `keepPreviousData` for this exact server-paginated interaction. Retry is configured as a function: once for network/5xx reads, never for `401` or other `4xx`, and never for mutations. [TanStack paginated queries](https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries), [TanStack query retries](https://tanstack.com/query/latest/docs/framework/react/guides/query-retries)

**Alternatives considered**:

- Cursor pagination: rejected because the collections have no filters or infinite-loading behavior and the additional token codec is disproportionate to this MVP.
- Server totals: rejected because Previous/Next needs only the current page and authoritative `hasNext` state.
- Mirroring query data into React state: rejected because it creates a competing cache.

### shadcn/ui rendering with TanStack Table headless behavior

**Decision**: Render all controls with local shadcn/ui source. Use TanStack Table only for column definitions, core rows, and manual pagination state. Keep three feature tables composed through one small shell.

**Rationale**: shadcn's own Data Table guide combines the shadcn Table primitive with TanStack Table and explicitly warns that data tables differ by domain; it recommends extraction only when reuse is proven. This matches separate patient, scan, and print tables without a universal configurable component. [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/base/data-table), [shadcn/ui Table](https://ui.shadcn.com/docs/components/base/table)

**Alternatives considered**:

- shadcn Table without TanStack Table: viable for static markup but rejected because explicit reusable column and manual pagination state are valuable here.
- A universal data grid: rejected because sorting, filters, selection, visibility, and configurable page sizes are non-goals.
- TanStack visual components: rejected because TanStack Table is intentionally headless and shadcn is the accepted visual authority.

### React Hook Form with generated Zod Mini request schemas

**Decision**: Use generated Zod Mini schemas only for the three JSON mutations: account creation, sign-in, and patient creation. Compose minimal local refinements for password confirmation, grapheme counting, and trimmed non-empty names. Use `zodResolver`; validate on first submit, then on change after failure.

**Rationale**: The schemas remain derived from OpenAPI while React Hook Form owns interaction state. Zod Mini provides the same validation capability through a tree-shakable functional API. Server validation remains mandatory. [Zod Mini](https://zod.dev/packages/mini), [React Hook Form resolvers](https://github.com/react-hook-form/resolvers)

**Alternatives considered**:

- React Hook Form validators only: rejected because they would repeat OpenAPI-expressible constraints by hand.
- Zod for file uploads: rejected because content validation belongs to the dedicated upload boundary and the backend parser.
- Displaying generated Zod messages: rejected because they are not stable localization contracts.

## Observability

### Built-in Nest JSON logging

**Decision**: Configure Nest `ConsoleLogger` with `json: true` and use class-context `Logger` instances for selected operational events.

**Rationale**: Nest directly supports parseable JSON logging. The built-in stack meets this small service's needs without an additional logger integration. [NestJS logger](https://docs.nestjs.com/techniques/logger)

**Alternatives considered**:

- Pino or Winston: rejected because no forwarding, custom sink, or measured throughput need exists.
- Request/response logging: rejected because payloads may contain credentials or patient information and routine traces add noise.

## Resolved Questions

The accepted user plan fixes the runtime, persistence, storage, session, routing, query, table, form-schema,
transport, and deferred-test choices. Implementation may still pin compatible patch versions during scaffolding
without changing these architectural decisions.

## Verification And Promotion

The delivery sources in this section were consulted on 2026-08-15.

### One required verification job on Node.js 24

**Decision**: Keep the four existing Nx projects and expose one readable GitHub Actions `verify` job. Install the lockfile with Node.js 24 and `npm ci`; resolve explicit base/head revisions with the official `nrwl/nx-set-shas` action, derive the deployable-project JSON once in `verify`, then use `nx format:check` and `nx affected` for project checks before running the existing contract-generation target, health/revision tests, and affected-graph conformance checks. Skip production before environment approval when the JSON result is empty. Pin every third-party action to the full commit of its current stable major release, disable persisted checkout credentials, and give each job a finite timeout.

**Rationale**: The current workspace already resolves `api`, `web`, `database`, and `infrastructure` with direct targets for every repository gate. Nx affected uses Git revisions plus the project graph to select changed projects and their dependants; using that same graph for CI and release avoids a second ownership mechanism. The official SHA resolver bases push calculations on the last successful workflow, so changes from a failed run remain selected later. One stable protected-branch job remains easier to review than a matrix or reusable-workflow layer. [Nx affected](https://nx.dev/docs/features/ci-features/affected), [Nx GitHub Actions integration](https://nx.dev/docs/features/ci-features/github-integration), [Nx commands](https://nx.dev/docs/reference/nx-commands), [Nx `nx.json` reference](https://nx.dev/reference/nx-json), [`nrwl/nx-set-shas`](https://github.com/nrwl/nx-set-shas)

**Alternatives considered**:

- Nx Cloud, Agents, Replay, remote caching, and self-healing CI: rejected because issue #14 requires a minimal assessment pipeline and the repository has only four local projects.
- One job per tool or project: rejected because it multiplies protected checks and service setup without improving this repository's evidence.
- `nx run-many` across every project: rejected because it ignores the workspace graph's affected calculation and performs unrelated work.
- A handwritten second-pass manifest comparison: rejected because Orval already cleans its configured outputs and the generated contracts are immediately consumed by type checking, tests, and production builds.

### Permanent `develop` integration and reviewed `main` promotion

**Decision**: Make `develop` the ordinary protected integration branch and `main` the protected production-promotion branch. The same workflow verifies pull requests to both branches and the exact pushed `main` revision. A workflow guard rejects a `main` pull request whose head is not `develop`; production jobs run only after the exact pushed `main` revision passes `verify`.

**Rationale**: GitHub workflow branch filters can distinguish pull-request bases and push branches, while protected branches can require pull requests, reviews, conversation resolution, and named status checks. This directly represents the accepted two-stage review path without a custom release branch family. [GitHub workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)

The current repository overlays still name `main` as ordinary integration. They must be updated first during implementation, before any branch or workflow mutation. Spec Kit planning does not create `develop` or change repository settings.

**Alternatives considered**:

- Deploy every merge to `develop`: rejected because `develop` is accepted as integration, not production authority.
- Direct feature-to-`main` promotions: rejected because they bypass the accepted integrated revision.
- A tag-driven release path: rejected because issue #14 explicitly assigns production promotion to reviewed `develop`-to-`main` pull requests.

### Protected production environment and serialized releases

**Decision**: Only production jobs reference the GitHub `production` environment. The environment owns the Dokploy credential and approval. A queued, non-cancelling concurrency group serializes production releases.

**Rationale**: GitHub environment secrets become available only to jobs that reference the environment and only after configured protection rules pass. Workflow concurrency can prevent overlapping release state; the release path must queue rather than cancel because a cancelled migration or rollout would leave ambiguous external state. [GitHub deployment environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments), [GitHub workflow concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)

**Alternatives considered**:

- Repository-wide production secrets: rejected because pull-request verification must have no production authority.
- `cancel-in-progress`: rejected because superseding an active migration or deployment is unsafe.
- Parallel component deployment: rejected because migration-before-API-before-Web is an accepted failure boundary.

## Images And Runtime Delivery

### Three immutable public GHCR images

**Decision**: Build one migration image, one API image, and one Web image only when selected. Use repository-owned multi-stage Dockerfiles for API and Web, the official Liquibase image for migration, full commit-SHA Action pins, source-revision labels, and the GitHub commit as the immutable human-readable tag. Capture the registry-returned `sha256` digest, then promote that digest to the component's mutable `production` pull pointer immediately before its ordered Dokploy stage. Make the three packages public through a documented one-time operation.

**Rationale**: Docker multi-stage builds separate build tools from the final runtime. GitHub's documented container-publishing path uses `GITHUB_TOKEN`, supports GHCR, and exposes the pushed digest. The digest and SHA tag preserve immutable identity; the `production` tag exists only because Dokploy's Auto Deploy webhook deploys the image reference configured on the application. Revision-aware health prevents a successful webhook enqueue from being mistaken for successful rollout. [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/), [GitHub publishing Docker images](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images)

**Alternatives considered**:

- Build from source on the VPS: rejected because it enlarges production authority and makes the deployed result less reproducible.
- Mutable `latest` deployment without a recorded digest and revision check: rejected because rollback and audit cannot identify exact bytes.
- One global application image or production Compose stack: rejected because migration, API, and Web have different lifecycle, health, and rollback semantics.
- Private packages with long-lived registry credentials: rejected because the assessment accepts public artifacts and Dokploy needs only immutable pull access.

### Nx affected as the sole change-selection authority

**Decision**: Resolve the comparison base with `nrwl/nx-set-shas`, then query `nx show projects --affected --base=<last-successful> --head=<source> --withTarget=container --json` for production selection. Configure project-scoped named inputs and dependency-aware lockfile handling in Nx so root inputs affect only the projects that consume them. Do not add a custom path selector or duplicate file-glob map in GitHub Actions.

**Rationale**: Nx documents `show projects --affected` as the current structured affected-project query and exposes base/head, file-fixture, target-filter, and JSON options. Named inputs express root-file ownership in the project model, while `projectsAffectedByDependencyUpdates: "auto"` maps lockfile changes back to projects whose resolved dependencies changed. Restricting the query to the `container` target naturally excludes retained infrastructure without a second selector. [Nx commands](https://nx.dev/docs/reference/nx-commands), [Nx inputs and named inputs](https://nx.dev/docs/reference/inputs), [Nx affected dependency updates](https://nx.dev/docs/features/ci-features/affected#marking-projects-affected-by-dependency-updates)

**Alternatives considered**:

- Deploy all three components after every promotion: rejected because issue #14 explicitly requires component-selective promotion.
- GitHub path filters: rejected because they would duplicate project ownership outside Nx.
- A dependency-free path-mapping helper: rejected because it would create a second change graph that could drift from Nx.
- A fifth delivery project: rejected because the existing four projects already own the deployable and retained boundaries.

### Dokploy Schedule Job and Auto Deploy webhooks

**Decision**: Provision PostgreSQL as a retained Dokploy database, Liquibase as a manually triggered `dokploy-server` Schedule Job, API/Web as independent Docker applications with Auto Deploy enabled, and MinIO as the sole service in one independent Compose resource. Use the pinned official `@dokploy/cli` to await the migration job and the application webhooks plus revision-aware health routes for API/Web completion evidence.

**Rationale**: Dokploy documents that a Server Job can invoke Docker through the Dokploy container's socket, while `schedule.runManually` awaits the command result. This makes Liquibase a real barrier. By contrast, the official Auto Deploy handler enqueues an application deployment and returns `200` before it finishes, so API/Web require a bounded check for the expected revision. These official primitives remove the need for a repository-owned API client or deployment polling state machine. [Dokploy Schedule Jobs](https://docs.dokploy.com/docs/core/schedule-jobs), [Dokploy Schedule API](https://docs.dokploy.com/docs/api/reference-schedule), [Dokploy Auto Deploy](https://docs.dokploy.com/docs/core/auto-deploy), [Dokploy CLI](https://docs.dokploy.com/docs/cli), [Auto Deploy handler at inspected revision](https://github.com/Dokploy/dokploy/blob/b976c7b4f74b09ac6434f128d808fd8fccc6cfaa/apps/dokploy/pages/api/deploy/%5BrefreshToken%5D.ts)

**Alternatives considered**:

- SSH commands or copied source: rejected because Dokploy already owns the target lifecycle and SSH would broaden secrets and host authority.
- One production Compose stack: rejected because an application-only change must not recreate PostgreSQL or MinIO.
- A custom `dokploy.mjs` client: rejected because the official CLI, webhook, and health contracts already cover the required boundaries.
- Using the application webhook for Liquibase: rejected because webhook acceptance is asynchronous and cannot block later stages.

### One-shot Liquibase migration before applications

**Decision**: Run the official Liquibase `update` command directly in a one-shot migration image from a blocking Dokploy Server Schedule Job before any selected application. Retain Liquibase tracking tables in PostgreSQL. Do not add a shell wrapper, automatic rollback, forced unlock, or production `validate`/`status` stage.

**Rationale**: Liquibase applies undeployed changes sequentially and records them in `DATABASECHANGELOG`; this is the required retained release ledger. The Nx migration target depends on changelog validation, so verification expresses `validate` before the ephemeral `update` without a workflow script or a redundant post-update status command. Production retains one auditable mutation command. [Liquibase `validate`](https://docs.liquibase.com/secure/reference-guide-5-2/database-inspection-change-tracking-and-utility-commands/validate), [Liquibase `update`](https://docs.liquibase.com/reference-guide/init-update-and-rollback-commands/update)

**Alternatives considered**:

- TypeORM schema synchronization or migrations: rejected because Liquibase is already the sole accepted schema authority.
- Automatic database rollback: rejected because schema rollback is not reliably lossless and issue #14 permits only application-image rollback.
- An always-running migration application: rejected because schema application is a bounded release step, not a runtime service.

### MinIO-only retained Compose resource

**Decision**: Keep MinIO private, retained, and outside routine selection. The production Compose file contains exactly the MinIO service, one named volume, the internal port, and the external Dokploy network. For this bounded prototype, the API uses the existing root credential variables and idempotently creates the fixed private bucket when absent.

**Rationale**: MinIO's maintained JavaScript SDK supports bucket existence checks and creation from the API boundary. Isolating the service prevents routine API/Web changes from recreating object storage, while avoiding speculative bootstrap containers and policy automation. [MinIO JavaScript API](https://docs.min.io/aistor/developers/sdk/javascript/api/)

**Alternatives considered**:

- Put MinIO beside PostgreSQL/API/Web in one Compose stack: rejected because unrelated releases could affect retained scan storage.
- Publish the console or S3 host port: rejected because neither is a product surface.
- Automate scoped MinIO identity provisioning now: deferred because it adds a separate administrative boundary beyond the assessment; the root-credential prototype trade-off remains explicit.

### Manual application-digest rollback only

**Decision**: Provide a separate environment-approved workflow that accepts one component (`api` or `web`) and one prior digest, validates both, redeploys exactly that artifact, and repeats its health check. Routine failures stop forward delivery and never trigger rollback automatically.

**Rationale**: Immutable per-component images make application recovery bounded and auditable. Database reversal is excluded, so every schema change paired with an API change must remain compatible with the immediately previous API image or return to planning before release.

**Alternatives considered**:

- Automatic rollback after a failed health check: rejected because it would make a second production mutation without reviewer approval and might be incompatible with an applied schema.
- Rebuild a prior commit: rejected because a rebuild is not guaranteed to reproduce the original image bytes.
- Database rollback: rejected because the accepted recovery contract explicitly excludes it.
