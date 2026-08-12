# Tasks: Orthoprosthetist Printing Workflow

**Status**: Accepted

**Input**: Design documents in `specs/001-orthoprosthetist-printing-workflow/`

**Prerequisites**: Accepted `spec.md`, candidate `plan.md`, `research.md`, `data-model.md`, `contracts/http-api.md`, and `design-handoff.md`

## Execution Rules

- This checklist derives implementation work; it does not create or replace GitHub issues.
- Every task names its intended repository path. Create only directories required by the task being executed.
- `[P]` means the task may run in parallel with other `[P]` tasks in the same phase because it owns different files.
- `[USx]` identifies the independently testable user story supported by the task.
- No test implementation belongs to this checklist. Backend tests are owned by issue #9, frontend tests by issue #12,
  and CI quality gates by issue #14.
- Generated OpenAPI, Orval, Zod, and TanStack Router outputs remain ignored and must never be edited manually.

## Phase 1: Workspace Setup

**Purpose**: Establish the minimal Nx runtime and local dependencies without product behavior.

- [ ] T001 Initialize the npm-backed Nx 23 workspace and scaffold React 19/Vite at `apps/web/` and NestJS 11/Express at `apps/api/`, preserving `main` as the integration branch
- [ ] T002 Add only the accepted runtime and build dependencies to `package.json` and lock them in `package-lock.json`, including PostgreSQL, TypeORM, Liquibase orchestration, MinIO, Orval, Zod Mini, React Hook Form, i18next, TanStack Router/Query/Table, shadcn/ui, and Lucide React
- [ ] T003 [P] Configure strict shared TypeScript, ESLint, Prettier, and Nx defaults in `tsconfig.base.json`, `eslint.config.mjs`, `.prettierignore`, `nx.json`, `apps/api/tsconfig*.json`, and `apps/web/tsconfig*.json`
- [ ] T004 [P] Define PostgreSQL and private MinIO services, health checks, and named volumes in `infrastructure/compose.yaml`
- [ ] T005 [P] Document safe environment names in `.env.example`, ignore local values in `.gitignore`, and define typed runtime configuration entry points in `apps/api/src/config/` and `apps/web/src/shared/config/`
- [ ] T006 Add authoritative Nx targets for infrastructure lifecycle, Liquibase migration, OpenAPI emission, Orval generation, and application serving in `infrastructure/project.json`, `database/project.json`, `apps/api/project.json`, and `apps/web/project.json`

**Checkpoint**: A clean checkout can install dependencies and start or stop local infrastructure exclusively through the documented npm and Nx boundary.

---

## Phase 2: Blocking Technical Foundations

**Purpose**: Establish the contract, persistence, transport, generation, and UI foundations shared by every story.

**Critical**: No user-story implementation starts until this phase is complete.

- [ ] T007 Initialize `database/db.changelog-master.xml` and the Liquibase configuration under `database/`, with TypeORM synchronization and TypeORM migrations disabled
- [ ] T008 Configure the PostgreSQL `DataSource`, naming, repository injection, and transaction boundary in `apps/api/src/database/` without a generic repository abstraction
- [ ] T009 Configure the Nest bootstrap in `apps/api/src/main.ts` and `apps/api/src/app.module.ts` with `/api`, strict global validation, bounded CORS with credentials, JSON logging, configuration validation, and OpenAPI metadata without an environment-specific server
- [ ] T010 Implement centralized RFC 9457 Problem Details mapping, stable field violations, request-instance handling, and safe internal-error translation in `apps/api/src/common/errors/`
- [ ] T011 Implement the strict `page`/`pageSize` query DTO and `PageInfoResponse` convention for deterministic server pagination ordered by `createdAt DESC, id DESC`
- [ ] T012 Define deterministic OpenAPI emission and two Orval outputs in `apps/api/src/openapi/`, `orval.config.ts`, and `.gitignore`: native Fetch plus TanStack Query with `tags-split`, and separate Zod Mini `*.zod.ts` schemas
- [ ] T013 Implement the typed native Fetch transport in `apps/web/src/shared/api/http/` with `credentials: include`, correct `FormData` handling, typed Problem Details, no payload logging, and the accepted retry classification
- [ ] T014 [P] Configure TanStack Query defaults, mutation retry behavior, i18next browser-language initialization, and the root providers in `apps/web/src/shared/query/`, `apps/web/src/shared/i18n/`, and `apps/web/src/main.tsx`
- [ ] T015 [P] Configure TanStack Router file generation, authenticated/public layouts, safe internal redirect validation, and route context in `apps/web/vite.config.ts`, `apps/web/src/router.tsx`, and `apps/web/src/routes/`
- [ ] T016 [P] Install the required shadcn/ui source primitives and exact accepted CSS tokens in `apps/web/src/shared/ui/`, `apps/web/src/shared/lib/cn.ts`, and `apps/web/src/styles/globals.css` without a competing visual component library
- [ ] T017 Compose a lightweight server-pagination table shell from shadcn Table/Pagination and headless TanStack Table behavior in `apps/web/src/shared/ui/data-table/`, without sorting, search, selection, totals, or a universal domain table
- [ ] T018 Create the compact authenticated header, profile menu, language control, sign-out action slot, dialog/drawer responsive overlay boundary, and shared feedback primitives in `apps/web/src/shared/layout/` and `apps/web/src/shared/ui/`

**Checkpoint**: The workspace has one executable contract chain, one error model, one server-pagination convention, one visual authority, and no duplicated transport schemas.

---

## Phase 3: User Story 1 — Establish an Authenticated Session (Priority: P1)

**Goal**: Create an account, sign in, restore a session, change language after authentication, and sign out without exposing credentials.

**Independent acceptance**: Starting signed out, a reviewer can create an account, reach the patient directory, restore the cookie-backed session, switch language from the profile menu, sign out, and safely reauthenticate to an authorized destination.

- [ ] T019 [P] [US1] Create the account schema, normalized case-insensitive email uniqueness, and audit dates in `database/changelog/001-accounts-patients.xml` (FR-001–FR-003, FR-054; SC-002, SC-011)
- [ ] T020 [P] [US1] Implement `AccountEntity` and dedicated persistence/API mappers in `apps/api/src/accounts/persistence/` and `apps/api/src/accounts/mappers/` (FR-002, FR-054)
- [ ] T021 [US1] Implement account lookup and creation ownership in `apps/api/src/accounts/accounts.module.ts` and `apps/api/src/accounts/application/` without account-management endpoints (FR-001–FR-003)
- [ ] T022 [P] [US1] Define `CreateAccountRequest`, `CreateSessionRequest`, `AccountSessionResponse`, OpenAPI cookie metadata, and stable auth operation identifiers in `apps/api/src/auth/dto/` (FR-001–FR-010, FR-048–FR-049)
- [ ] T023 [US1] Implement Argon2id with `memoryCost=65536` KiB, `timeCost=3`, `parallelism=4`, `hashLength=32`, and version `0x13`; add HS256 JWT issue/verification, the 30-minute `vytruve_session` cookie, issuer/audience checks, and sanitized auth logging in `apps/api/src/auth/security/` (FR-003, FR-005, FR-007, FR-049, FR-054; SC-002, SC-011)
- [ ] T024 [US1] Implement registration, sign-in, restoration, sign-out, IP throttling, generic authentication failure, and the authentication guard in `apps/api/src/auth/application/`, `apps/api/src/auth/auth.controller.ts`, and `apps/api/src/auth/auth.module.ts` (FR-001–FR-009, FR-016, FR-047–FR-051; SC-001–SC-002, SC-008, SC-011)
- [ ] T025 [P] [US1] Implement generated-schema React Hook Form sign-in and sign-up forms with only password-confirmation and grapheme-length refinements in `apps/web/src/modules/auth/forms/` and `apps/web/src/modules/auth/ui/` (FR-001, FR-003–FR-006, FR-048, FR-051–FR-053; SC-002, SC-008)
- [ ] T026 [US1] Implement `/sign-in` and `/sign-up`, startup restoration, safe redirect return, session-expiry behavior, and authenticated sign-out in `apps/web/src/routes/`, `apps/web/src/modules/auth/api/`, and `apps/web/src/modules/auth/hooks/` (FR-006–FR-010, FR-047–FR-050, FR-052–FR-053; SC-001–SC-002, SC-008)
- [ ] T027 [US1] Add English and French authentication, profile-menu, validation, and Problem Details translations in `apps/web/src/shared/i18n/locales/en/` and `apps/web/src/shared/i18n/locales/fr/`, persisting only the non-sensitive locale preference (FR-010, FR-047–FR-048, FR-052; SC-002, SC-008)

**Checkpoint**: US1 is independently demonstrable without any patient, scan, or printing data.

---

## Phase 4: User Story 2 — Create and Open a Patient (Priority: P1)

**Goal**: List owned patients, create exactly one valid patient, and open the persistent patient workspace.

**Independent acceptance**: From an authenticated empty directory, a reviewer creates one patient at boundary-valid input, lands in that patient workspace, returns to the paginated directory, and cannot infer another account's resources.

- [ ] T028 [P] [US2] Extend `database/changelog/001-accounts-patients.xml` with the patient table, ownership foreign key, field constraints, and owner/createdAt/id pagination index (FR-015–FR-018, FR-054; SC-003, SC-011)
- [ ] T029 [P] [US2] Implement `PatientEntity` plus dedicated persistence and API mappers in `apps/api/src/patients/persistence/` and `apps/api/src/patients/mappers/` (FR-015–FR-019)
- [ ] T030 [P] [US2] Define patient request, response, page, and query DTOs with OpenAPI metadata in `apps/api/src/patients/dto/` (FR-017–FR-019, FR-045, FR-048)
- [ ] T031 [US2] Implement owned patient list/create/read use cases, indistinguishable not-found behavior, server pagination, and operational logging in `apps/api/src/patients/application/` (FR-012–FR-021, FR-045, FR-049, FR-051, FR-054; SC-003, SC-011)
- [ ] T032 [US2] Expose the three patient operations in `apps/api/src/patients/patients.controller.ts` and wire `PatientsModule` in `apps/api/src/patients/patients.module.ts` (FR-012–FR-020, FR-045, FR-047–FR-049)
- [ ] T033 [P] [US2] Implement the patients TanStack Table definition, controlled server-page state, loading/empty/stale states, and open action in `apps/web/src/modules/patients/ui/patient-table/` (FR-012, FR-019, FR-045–FR-047, FR-050, FR-052–FR-053; SC-001, SC-010)
- [ ] T034 [P] [US2] Implement the generated-schema React Hook Form patient creation flow in shadcn Dialog/Drawer in `apps/web/src/modules/patients/forms/` and `apps/web/src/modules/patients/ui/create-patient/` (FR-017–FR-020, FR-047–FR-048, FR-051–FR-053; SC-003, SC-008)
- [ ] T035 [US2] Implement `/patients` and `/patients/$patientId` composition, post-create navigation, persistent identity card, and `NAV-PATIENT-SECTIONS` with scans selected by default in `apps/web/src/routes/` and `apps/web/src/modules/patients/ui/` (FR-011–FR-014, FR-020–FR-021, FR-046, FR-052–FR-053; SC-001, SC-003–SC-004)
- [ ] T036 [US2] Add professional English and French patient-directory, creation, pagination, empty, stale, and ownership-safe copy in `apps/web/src/shared/i18n/locales/en/patients.json` and `apps/web/src/shared/i18n/locales/fr/patients.json` (FR-047–FR-048, FR-052, FR-054; SC-008, SC-012)

**Checkpoint**: US2 works with authentication and patient persistence while both patient-workspace tables may still be empty.

---

## Phase 5: User Story 3 — Add and Retrieve a Patient 3D Scan (Priority: P2)

**Goal**: Validate one patient PLY scan, store it privately, list it, and download it without losing patient context.

**Independent acceptance**: In an owned patient workspace, a reviewer selects one valid supplied scan, uploads it once, sees it in the scan table, and downloads its streamed content; invalid or oversized content remains local to the upload overlay.

- [ ] T037 [P] [US3] Create the scan schema and patient/createdAt/id index in `database/changelog/002-scans.xml`, storing only an opaque object key, validated encoding, byte size, and technical dates (FR-022, FR-024–FR-030, FR-049, FR-054; SC-004, SC-009, SC-011)
- [ ] T038 [P] [US3] Implement `ScanEntity` plus separate persistence and API mappers in `apps/api/src/scans/persistence/` and `apps/api/src/scans/mappers/` (FR-022, FR-028, FR-054)
- [ ] T039 [P] [US3] Implement the bounded PLY 1.0 header/body/mesh validator for ASCII and both binary byte orders in `apps/api/src/scans/validation/` without trusting extension or MIME (FR-024–FR-027; SC-009)
- [ ] T040 [P] [US3] Implement the private MinIO adapter, random object-key generation, exact-object cleanup, and authorized object streaming in `apps/api/src/scans/storage/` (FR-022, FR-029–FR-030, FR-049, FR-054; SC-004, SC-011)
- [ ] T041 [US3] Implement scan list/upload/download orchestration with object-first persistence compensation and ownership checks in `apps/api/src/scans/application/` (FR-022–FR-030, FR-043, FR-047–FR-051; SC-004, SC-008–SC-011)
- [ ] T042 [P] [US3] Define scan page/response/query DTOs and multipart upload contract in `apps/api/src/scans/dto/`, exposing print eligibility but never storage keys (FR-022–FR-030, FR-045, FR-048–FR-049)
- [ ] T043 [US3] Expose scan list/upload/content operations with `ParseFilePipe`, the exact 26,214,400-byte limit, and `StreamableFile` in `apps/api/src/scans/scans.controller.ts` and `apps/api/src/scans/scans.module.ts` (FR-022–FR-030, FR-045, FR-047–FR-049; SC-004, SC-009)
- [ ] T044 [P] [US3] Implement the scans TanStack Table definition, controlled server-page state, download behavior, and print-eligibility action state in `apps/web/src/modules/scans/ui/scan-table/` (FR-022, FR-028, FR-030–FR-031, FR-045–FR-047, FR-050, FR-052–FR-053; SC-004, SC-010)
- [ ] T045 [US3] Implement the single-file upload Dialog/Drawer, keyboard-operable drop zone, Attachment states, removal/retry actions, dedicated file validation, and duplicate-submit guard in `apps/web/src/modules/scans/ui/scan-upload/` (FR-023–FR-027, FR-029, FR-047–FR-048, FR-051–FR-053; SC-004, SC-008–SC-009)
- [ ] T046 [US3] Add professional English and French scan, validation, storage, download, and stale-data translations in `apps/web/src/shared/i18n/locales/en/scans.json` and `apps/web/src/shared/i18n/locales/fr/scans.json` (FR-023, FR-047–FR-050, FR-052; SC-008, SC-010)

**Checkpoint**: US3 is complete without requiring the real printing provider or a print request.

---

## Phase 6: User Story 4 — Request and Follow Printing (Priority: P2)

**Goal**: Submit an eligible scan once, reconcile ambiguous outcomes safely, and follow canonical printing status and estimated progress.

**Independent acceptance**: From an eligible scan, a reviewer confirms printing, sees the prints tab open immediately, follows one stable reference through the canonical lifecycle, and can reprint only after a terminal state.

- [ ] T047 [P] [US4] Create the print-request schema, canonical status check, nullable `active_slot`, unique `(scan_id, active_slot)` constraint, reference uniqueness, and parent pagination index in `database/changelog/003-printing.xml` (FR-031–FR-044, FR-049, FR-054; SC-005–SC-007, SC-011)
- [ ] T048 [P] [US4] Implement `PrintRequestEntity` plus separate persistence, API, and provider mappers in `apps/api/src/printing/persistence/` and `apps/api/src/printing/mappers/` (FR-032–FR-043)
- [ ] T049 [P] [US4] Define and validate printing-provider request/response models, bounded timeouts, safe error categories, and sanitized logging in `apps/api/src/printing/provider/` (FR-034–FR-040, FR-048–FR-049; SC-005, SC-008, SC-011)
- [ ] T050 [US4] Implement stable 12-character reference generation, pre-submission reservation, one-shot provider POST, capacity cleanup, ambiguous confirmation persistence, reference-first reconciliation, and no blind retry in `apps/api/src/printing/application/` (FR-031–FR-044, FR-049, FR-051; SC-005–SC-007, SC-011)
- [ ] T051 [US4] Implement read-time estimated progress, canonical public state mapping, terminal `active_slot` release, reprint eligibility, and owned patient listing in `apps/api/src/printing/application/` (FR-035–FR-044; SC-005–SC-007)
- [ ] T052 [P] [US4] Define print request/page/query DTOs and stable public enums with OpenAPI `enumName` values in `apps/api/src/printing/dto/` (FR-031–FR-045, FR-048)
- [ ] T053 [US4] Expose print creation and patient print-list operations in `apps/api/src/printing/printing.controller.ts` and wire `PrintingModule` in `apps/api/src/printing/printing.module.ts` (FR-031–FR-045, FR-047–FR-049; SC-005–SC-008)
- [ ] T054 [P] [US4] Implement the print-request TanStack Table definition, canonical status badges, estimated-progress display, controlled server-page state, and stale-data behavior in `apps/web/src/modules/printing/ui/print-table/` (FR-035–FR-046, FR-050, FR-052–FR-053; SC-006–SC-007, SC-010)
- [ ] T055 [US4] Implement the print confirmation Dialog/Drawer, mutation duplicate guard, accepted-request cache insertion, and automatic switch to the prints tab in `apps/web/src/modules/printing/ui/create-print-request/` (FR-031–FR-044, FR-047–FR-051, FR-052–FR-053; SC-005, SC-007–SC-008)
- [ ] T056 [US4] Implement visible-tab polling every five seconds for at most five minutes, active-request filtering, manual refresh fallback, and preservation of cached rows in `apps/web/src/modules/printing/hooks/` (FR-035–FR-050; SC-006–SC-008, SC-010)
- [ ] T057 [US4] Add professional English and French printing lifecycle, progress, capacity, confirmation-pending, failure, and stale-refresh translations in `apps/web/src/shared/i18n/locales/en/printing.json` and `apps/web/src/shared/i18n/locales/fr/printing.json` (FR-035–FR-050, FR-052; SC-006–SC-008, SC-010)

**Checkpoint**: All four user stories are executable, independently reviewable, and connected through the accepted patient workspace.

---

## Phase 7: Cross-Cutting Product Completion

**Purpose**: Close requirements that span routes and stories without adding optional product scope.

- [ ] T058 Implement localized public and authenticated `SYS-NOT-FOUND` route fallbacks with one safe keyboard-accessible return action in `apps/web/src/routes/$.tsx` and `apps/web/src/modules/system/ui/not-found-view.tsx` (FR-047–FR-048, FR-052–FR-055; SC-008, SC-012, SC-015)
- [ ] T059 Audit all mutation and query call sites under `apps/web/src/modules/` for the accepted retry policy, preserved stale content, explicit recovery, and absence of raw generated/server/provider messages (FR-047–FR-051; SC-008, SC-010–SC-011)
- [ ] T060 Audit all routes, overlays, tabs, tables, forms, feedback, focus restoration, accessible names, live announcements, color-independent states, and 44-pixel compact targets under `apps/web/src/` against `design-handoff.md` (FR-046–FR-047, FR-052–FR-053; SC-012)
- [ ] T061 Regenerate OpenAPI, native Fetch/TanStack Query output, Zod Mini output, and the TanStack route tree through Nx; resolve consumers without editing generated files in `apps/web/src/shared/api/generated/` or `apps/web/src/routeTree.gen.ts` (FR-048–FR-049; SC-013)
- [ ] T062 Document setup, architecture decisions, AI-assisted workflow, security boundaries, deferred test ownership, and authoritative Nx commands in `README.md` without copying credentials or personal source data (FR-049, FR-054; SC-011, SC-013–SC-014)
- [ ] T063 Reconcile the implemented routes and components against every Ready for Development frame identifier recorded in `specs/001-orthoprosthetist-printing-workflow/design-handoff.md`, recording only genuine approved deviations in `README.md` (FR-011–FR-055; SC-001–SC-015)

**Checkpoint**: The application scope is complete. Test evidence and automation remain intentionally deferred to their owning issues.

---

## Requirement Coverage

| Requirement range | Primary implementation tasks |
| --- | --- |
| FR-001–FR-010 | T019–T027 |
| FR-011–FR-021 | T028–T036 |
| FR-022–FR-030 | T037–T046 |
| FR-031–FR-044 | T047–T057 |
| FR-045–FR-046 | T011, T017, T033, T044, T054 |
| FR-047–FR-051 | T010, T013–T014, T018, T024–T027, T031–T036, T041–T046, T049–T059 |
| FR-052–FR-053 | T016–T018, T025–T027, T033–T036, T044–T046, T054–T060 |
| FR-054 | T019–T024, T028–T031, T037–T041, T047–T050, T062 |
| FR-055 | T058 |
| SC-001–SC-004 | T019–T046 |
| SC-005–SC-007 | T047–T057 |
| SC-008–SC-012 | T010–T018, T024–T027, T031–T036, T039–T046, T049–T060 |
| SC-013–SC-014 | T001–T018, T061–T063 |
| SC-015 | T058 |

## Dependencies and Delivery Order

1. Phase 1 establishes the workspace and blocks every later phase.
2. Phase 2 establishes shared technical boundaries and blocks all user stories.
3. US1 must complete before authenticated stories can be demonstrated.
4. US2 depends on US1 and establishes the patient context used by US3 and US4.
5. US3 depends on US2 and provides the eligible scan required by US4.
6. US4 depends on US3.
7. Phase 7 follows the selected MVP stories and introduces no new domain capability.

Within a phase, `[P]` tasks may proceed concurrently only when their listed files do not overlap. Database changelog
edits sharing `001-accounts-patients.xml` remain sequential even when their domain responsibilities differ.

## Deliberately Deferred Evidence

- Issue #9 adds Jest unit tests and controlled printing-provider adapter contract tests.
- Issue #12 adds Vitest, Testing Library, Router, Query, Table, React Hook Form/Zod, i18n, and accessibility tests.
- Issue #14 adds format, lint, typecheck, build, focused test, OpenAPI, and Orval CI gates.

No task in this file may pre-empt those owners by adding test code or CI configuration.
