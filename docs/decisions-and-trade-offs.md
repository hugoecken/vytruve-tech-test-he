# Decisions and Trade-offs

[Back to the main README](../README.md)

This assessment favors explicit, testable boundaries over speculative infrastructure. The accepted
[technical plan](../specs/001-orthoprosthetist-printing-workflow/plan.md) owns the architecture; this document records
the reviewer-facing consequences of the delivered choices.

## Consequential decisions

| Decision                                                                     | Why it fits this assessment                                                                        | Consequence or trade-off                                                                                                             |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| One Nx monorepo for Web, API, database, and infrastructure                   | Keeps task discovery, affected selection, caching, and CI in one official workspace graph.         | npm remains installation and alias ownership; Nx remains execution ownership. No custom executor or parallel build system was added. |
| React SPA with typed file routing                                            | Matches the mandated frontend and the bounded authenticated product surface.                       | No server rendering or frontend framework runtime; production uses unprivileged Nginx with SPA fallback.                             |
| NestJS feature modules with narrow application and infrastructure boundaries | Keeps authentication, patients, scans, printing, and health independently reviewable.              | The project avoids generic repository, CQRS, event-bus, and utility layers that the MVP does not need.                               |
| PostgreSQL mapped by TypeORM, schema evolved only by Liquibase               | Separates runtime persistence mapping from durable schema history and deployment order.            | TypeORM synchronization and migrations stay disabled; production database rollback is intentionally unsupported.                     |
| Private MinIO behind an application storage port                             | Preserves scan ownership and keeps object details out of browser contracts.                        | Database metadata and object bytes are not transactional, so upload uses narrow compensation if metadata persistence fails.          |
| HTTP-only short-lived JWT cookie                                             | Keeps the token outside browser JavaScript while supporting a simple stateless session boundary.   | There is no refresh-token, password-recovery, MFA, or server-side revocation subsystem in this time-boxed MVP.                       |
| Code-first OpenAPI and Orval generation                                      | Makes Nest DTOs, validation, and Swagger metadata the single executable HTTP authority.            | Generated OpenAPI, clients, models, and schemas are ignored and must be regenerated before verification.                             |
| Look-ahead server pagination                                                 | Proves Previous and Next availability without a total-count query or invented page count.          | The product deliberately does not display totals or arbitrary page numbers.                                                          |
| Persist before non-idempotent printing submission                            | Prevents duplicate production requests and provides a stable reconciliation identity.              | An ambiguous outcome remains pending until explicit status reconciliation; automatic write retry is forbidden.                       |
| Persisted print lists separated from provider refresh                        | Keeps the last safe application state available when the external provider is slow or unavailable. | Status is refreshed once on page open or manually; there is no automatic polling or background worker.                               |
| Independent Dokploy resources with Nx-affected promotion                     | Retains PostgreSQL and MinIO while deploying only changed migration, API, or Web components.       | The release workflow is ordered and finite, but it does not claim high availability or zero downtime.                                |
| Focused unit, adapter-contract, and component tests                          | Protects owned behavior without rebuilding framework internals or contacting the real provider.    | There is no large end-to-end browser suite or production-provider test in this assessment.                                           |

Local and Dokploy Compose definitions currently track `minio/minio:latest` so an operator can use the current MinIO
release without maintaining an obsolete release label. This is less reproducible than an immutable digest. A
longer-lived production system should adopt an explicit update and rollback policy, test the selected digest, and pin
that digest between planned upgrades.

## Deliberately excluded or deferred

The delivered product does not implement patient editing or deletion, scan deletion, print cancellation, password
recovery, MFA, notifications, billing, dashboards, advanced search, or administrative workflows. Those are product
scope decisions, not missing hidden endpoints.

Given more assessment time, the next evidence would be:

- browser-level end-to-end coverage against ephemeral PostgreSQL and MinIO;
- a manual keyboard and assistive-technology audit across the canonical responsive screens;
- backup and restore drills for PostgreSQL, MinIO, and retained Dokploy configuration;
- least-privilege production MinIO credentials instead of root-style bootstrap credentials;
- explicit monitoring and alerting around readiness, migration, storage, and reconciliation events;
- a tested immutable MinIO upgrade policy; and
- load and failure-injection evidence before making availability or zero-downtime claims.

No GDPR, HDS, medical-device, disaster-recovery, high-availability, or zero-downtime certification is claimed.

The final production dependency audit reports no known runtime vulnerability. The complete development toolchain still
reports upstream transitive advisories through the current Nx/webpack graph, including an image parser for which npm
offers no patched release. Those packages are absent from the production dependency audit, but they remain a build-time
risk to review when Nx publishes a compatible resolution. A forced major downgrade was rejected because it would
replace a disclosed tooling risk with an unplanned workspace migration.

## AI-assisted workflow

AI assistance was used to analyze the supplied brief, maintain specification and plan traceability, translate accepted
behavior into code and tests, review documentation, and operate bounded GitHub and deployment tasks. It did not own
product acceptance, production authorization, or final engineering responsibility.

The author retained control by:

- explicitly accepting specification and architecture gates before implementation;
- reviewing focused diffs and preserving coherent issue, branch, commit, and pull-request history;
- using repository-defined Nx, Docker, framework, and provider boundaries instead of generated custom control planes;
- running the documented format, lint, type-check, test, build, migration, generation, image, CI, and deployment checks;
- keeping generated artifacts reproducible and excluding protected values and supplied sample content; and
- approving external mutations such as GitHub protection, image publication, Dokploy deployment, and production
  promotion.

Every delivered claim remains the author's responsibility regardless of which bounded step used AI assistance.
