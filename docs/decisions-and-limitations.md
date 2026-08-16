# Decisions and Limitations

[Back to the main README](../README.md)

The accepted [technical plan](../specs/001-orthoprosthetist-printing-workflow/plan.md) owns the architecture. This page
summarizes the choices a reviewer is most likely to question and their honest consequences.

## Consequential decisions

| Decision                                       | Why                                                                                    | Trade-off                                                                            |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| One Nx monorepo                                | One graph for Web, API, database, infrastructure, CI, caching, and affected selection. | Shared root inputs can correctly rebuild more than one project.                      |
| React SPA with typed routes                    | Fits the bounded authenticated product and required React stack.                       | No server rendering; Nginx provides SPA fallback.                                    |
| Focused NestJS feature boundaries              | Keeps authentication, patients, scans, printing, and health independently readable.    | No generic repository, CQRS, event bus, or speculative service split.                |
| Liquibase schema with TypeORM mapping          | Separates durable schema history from runtime persistence.                             | Database rollback is unsupported; changes must be backward compatible.               |
| Private MinIO behind the API                   | Preserves ownership and hides object-storage details.                                  | PostgreSQL and MinIO are not transactional; upload uses narrow compensation.         |
| HTTP-only short-lived JWT                      | Keeps tokens outside browser JavaScript with a small stateless session boundary.       | No refresh token, MFA, recovery, or server-side revocation subsystem.                |
| Code-first OpenAPI and generated Web clients   | Keeps one executable HTTP contract rooted in Nest DTOs and validation.                 | Generated output must be refreshed before verification and is never edited manually. |
| Look-ahead pagination                          | Provides Previous/Next without an extra total-count query.                             | The UI deliberately shows no total or arbitrary page numbers.                        |
| Reserve before printing submission             | Prevents duplicate physical requests and creates a reconciliation identity.            | Ambiguous outcomes remain pending instead of being hidden by retries.                |
| Persisted list separated from provider refresh | Keeps last safe state visible when the provider is unavailable.                        | Refresh is explicit; there is no polling worker.                                     |
| Independent Dokploy resources                  | Retains data services and deploys only Nx-selected application stages.                 | The release is ordered and finite but does not claim zero downtime.                  |

Local and Dokploy MinIO definitions track `minio/minio:latest`. This avoids keeping a known obsolete release label but
is less reproducible than a tested digest. A long-lived system should define an explicit upgrade policy and pin the
approved digest between planned upgrades.

## Deliberately excluded

The MVP does not include patient editing or deletion, scan deletion, print cancellation, password recovery, MFA,
notifications, billing, dashboards, advanced search, or administrative workflows. These are product-scope choices,
not hidden unfinished endpoints.

It also makes no GDPR, HDS, medical-device, disaster-recovery, high-availability, or zero-downtime certification claim.

## Next evidence with more time

- browser end-to-end tests against ephemeral PostgreSQL and MinIO;
- manual keyboard and assistive-technology review across canonical responsive screens;
- PostgreSQL, MinIO, and Dokploy backup/restore drills;
- least-privilege production MinIO credentials after bootstrap;
- monitoring and alerting for readiness, migration, storage, and reconciliation;
- a tested immutable MinIO upgrade policy; and
- load and failure-injection evidence before availability claims.

The production dependency audit reports no known runtime vulnerability. The development graph retains disclosed
upstream Nx/webpack advisories without a compatible current fix; an unplanned major downgrade was not treated as a
responsible security solution. See [Testing and quality](testing-and-quality.md#honest-limits).

The rationale and human/AI responsibility split behind these decisions is documented in
[AI-assisted engineering workflow](ai-assisted-workflow.md).
