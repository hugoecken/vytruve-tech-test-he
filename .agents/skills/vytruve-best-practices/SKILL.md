---
name: vytruve-best-practices
description: Use when working in the Vytruve technical-assessment repository on specification-driven development, GitHub Spec Kit, product requirements, technical planning, Figma product design, Git workflow, Nx, React/Vite, NestJS, persistence, OpenAPI/code generation, security, logging, file storage, external HTTP integration, documentation, testing, validation, or repository architecture.
---

# Vytruve Best Practices

Use this skill as the repository router. Load repository overlays first, then only the portable policies needed for the
task. Technical references explain correct implementation practice; they do not accept an optional architecture.

## Start every task

1. Read the root `AGENTS.md`.
2. Read `overlays/repository-profile.md`.
3. Classify the task with the table below.
4. Load every indicated overlay, reference, and companion skill before editing.
5. Verify the GitHub execution scope and all applicable specification, design, planning, and source gates.
6. Select validation from `references/risk-based-validation-policy.md` before implementation.

## Source router

| Signal or work area                                                     | Required guidance                                                                                                                    |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Repository authorities, phase gates, target paths                       | `overlays/repository-profile.md`                                                                                                     |
| Spec Kit setup, specification, acceptance, planning, tasks, convergence | `references/specification-driven-development.md`, `overlays/spec-kit-profile.md`                                                     |
| Git branches, commits, issues, pull requests                            | `references/git-workflow.md`, `overlays/git-profile.md`                                                                              |
| Figma foundations, components, screens, lifecycle, visual authority     | `references/figma-policy.md`, `overlays/figma-profile.md`, plus applicable Figma skills                                              |
| Any code implementation or review                                       | `$karpathy-guidelines`, `references/code-documentation-policy.md`, the accepted specification and plan, plus boundary guidance below |
| Nx generation, workspace structure, task orchestration                  | `$nx-workspace`, `$nx-generate`, `$nx-plugins`, `$nx-run-tasks`, `$link-workspace-packages` as applicable                            |
| React/Vite UI, routing, forms, server state                             | `references/frontend-web-policy.md`; use `$vercel-react-best-practices`, `$vercel-composition-patterns`, and `$shadcn` when relevant |
| Frontend unit, component, or feature tests                              | `references/frontend-testing-policy.md`                                                                                               |
| Nest modules, controllers, providers, feature structure                 | `references/backend-nestjs-policy.md`                                                                                                |
| Backend unit or adapter contract tests                                  | `references/nestjs-testing-policy.md`                                                                                                |
| TypeORM entities, repositories, transactions                            | `references/typeorm-persistence-policy.md`                                                                                           |
| Liquibase schema or data changes                                        | `references/liquibase.md`                                                                                                            |
| REST endpoints, Problem Details, status codes                           | `references/rest-endpoint-policy.md`                                                                                                 |
| Pagination or collection navigation                                     | `references/rest-pagination-policy.md` and the accepted contract                                                                     |
| DTOs, OpenAPI emission, generated clients                               | `references/openapi-codegen-policy.md`, `references/mapping-policy.md`                                                               |
| Representation mapping across boundaries                                | `references/mapping-policy.md`                                                                                                       |
| Authentication, authorization, configuration, CORS, secrets             | `references/configuration-security-policy.md`                                                                                        |
| Logs and operational diagnostics                                        | `references/logging-policy.md`                                                                                                       |
| Upload, download, object storage                                        | `references/file-storage-policy.md`, `references/configuration-security-policy.md`                                                   |
| External provider, timeout, retry, reconciliation                       | `references/external-http-integration-policy.md`, `references/logging-policy.md`, applicable testing policy                          |
| Docker, environment variables, ports, local commands                    | `references/local-runtime-policy.md` and the accepted plan                                                                           |
| Comments, TSDoc, README content                                         | `references/code-documentation-policy.md`                                                                                            |
| Any code or configuration change                                        | `references/risk-based-validation-policy.md`                                                                                         |

## Current phase gates

- Issue #1 may change governance and generated Spec Kit infrastructure without a product specification.
- Issue #2 may author and clarify the candidate product specification but may not implement it.
- Issue #3 requires the exact accepted specification before creating product screens.
- Issue #4 requires accepted specification and design evidence before approving runtime architecture.
- Issues #5 onward require the accepted specification binding and approved plan selected by their GitHub scope.
- Stop when a later issue, conversation, or generated task conflicts with an earlier accepted authority.

## Guardrails

- React and NestJS are supplied stack constraints. All other target technologies remain proposals until the approved
  technical plan selects them.
- Keep product intent out of portable references and implementation mechanics out of `spec.md`.
- Keep transport values, application values, persistence entities, provider payloads, and frontend view models
  distinct when their responsibilities differ.
- Keep cross-feature shared code small and evidence-based. Do not create generic repositories, base services, utility
  dumping grounds, CQRS, event buses, queues, or background workers preemptively.
- Never expose protected data through code, contracts, logs, errors, generated output, tests, designs, or examples.

## Completion protocol

1. Run focused validation and every broader check required by the affected authority.
2. Regenerate derivative artifacts only through their owning commands.
3. Verify internal links, accepted bindings, portable-reference boundaries, and generated-file provenance.
4. Run `git diff --check` and inspect the complete diff for protected data.
5. Report changes, decisions, commands, results, skipped checks, and the next canonical gate.
