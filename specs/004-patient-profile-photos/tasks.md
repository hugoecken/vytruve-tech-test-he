# Tasks: Patient Profile Photos

**Input**: Accepted design documents from `specs/004-patient-profile-photos/`

**Prerequisites**: Accepted `spec.md`, approved `plan.md`, approved Figma section `425:3`, `research.md`, `data-model.md`, `contracts/`, and `quickstart.md`

**Tests**: Required by the accepted specification and validation plan. Write each focused test group before the implementation it proves and confirm that the new assertions fail for the expected reason.

**Organization**: Tasks are grouped by user story so each accepted outcome remains independently testable. This derived checklist creates no GitHub execution items.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it changes different files and has no dependency on an incomplete task.
- **[Story]**: Maps the task to its accepted user story.
- Every task names its target path.

## Phase 1: Setup

**Purpose**: Add only the two dependencies selected by the approved plan.

- [ ] T001 Add `sharp@^0.35.3` and `file-type@^22.0.2` with the npm lockfile in `package.json` and `package-lock.json`

---

## Phase 2: Foundational Boundaries

**Purpose**: Establish the private-storage, persistence, validation, and patient-response foundations shared by all stories.

**Critical**: Complete this phase before starting a user-story phase.

- [ ] T002 [P] Add provider-level contract coverage for bounded put, stat, stream, remove, readiness, safe key handling, and provider failures in `apps/api/src/storage/minio-private-object-storage.adapter.spec.ts`
- [ ] T003 Implement the minimal `PrivateObjectStoragePort`, MinIO adapter, and Nest module selected by the plan in `apps/api/src/storage/private-object-storage.port.ts`, `apps/api/src/storage/minio-private-object-storage.adapter.ts`, and `apps/api/src/storage/private-object-storage.module.ts`
- [ ] T004 Rewire scans and health checks to the shared private-storage token without changing their behavior in `apps/api/src/app/scans/application/ports/scan-storage.port.ts`, `apps/api/src/app/scans/infrastructure/storage/minio-scan-storage.adapter.ts`, `apps/api/src/app/scans/scans.module.ts`, and `apps/api/src/app/health/health.service.ts`
- [ ] T005 [P] Append the nullable photo metadata columns and all-null-or-all-present constraint, then map them through the patient model in `database/changelog/004-patient-profile-photos.xml`, `database/db.changelog-master.xml`, `apps/api/src/app/patients/infrastructure/persistence/patient.entity.ts`, `apps/api/src/app/patients/application/models/patient.model.ts`, and `apps/api/src/app/patients/infrastructure/persistence/mappers/patient-persistence.mapper.ts`
- [ ] T006 [P] Add synthetic JPEG, PNG, WebP, empty, oversized, unsupported, and corrupt-content tests in `apps/api/src/app/patients/application/validation/patient-photo.validator.spec.ts`
- [ ] T007 Implement bounded authoritative photo validation, upload parsing, and stable safe problem codes in `apps/api/src/app/patients/application/validation/patient-photo.validator.ts`, `apps/api/src/app/patients/api/pipes/patient-photo-upload.pipe.ts`, and `apps/api/src/http/problem-code.ts`
- [ ] T008 Add `hasPhoto` to the patient API representation without exposing storage metadata in `apps/api/src/app/patients/api/dto/patient-response.dto.ts` and `apps/api/src/app/patients/api/mappers/patient-api.mapper.ts`

**Checkpoint**: The shared storage adapter preserves scan behavior, the full migration is append-only, photo validation is bounded, and patient JSON exposes only `hasPhoto`.

---

## Phase 3: User Story 1 — Create A Patient With An Optional Photo (Priority: P1) MVP

**Goal**: Preserve no-photo creation and allow one locally reviewed private photo to be confirmed with the patient in one explicit submission.

**Traceability**: FR-001–FR-005, FR-010, FR-014, FR-016–FR-018; SC-001–SC-003, SC-007, SC-009–SC-010.

**Independent Test**: Create one patient without a photo, then create another after selecting, reviewing, replacing, and confirming a supported photo; verify zero mutation before submit and one confirmed patient result.

### Tests for User Story 1

- [ ] T009 [P] [US1] Add no-photo, valid-photo, validation-failure, storage-failure, persistence-failure compensation, and duplicate-submit service tests in `apps/api/src/app/patients/application/services/patients.service.spec.ts`
- [ ] T010 [P] [US1] Add local preparing, selected, replace, remove, invalid, obsolete-decode, Blob cleanup, and zero-request tests in `apps/web/src/modules/patients/ui/patient-photo-field.test.tsx`
- [ ] T011 [P] [US1] Extend patient creation tests for no-photo regression, multipart photo creation, pending protection, retryable failure, and direct workspace navigation in `apps/web/src/modules/patients/ui/patients-page.test.tsx`

### Implementation for User Story 1

- [ ] T012 [US1] Convert patient creation to the documented optional multipart contract and Swagger responses in `apps/api/src/app/patients/api/dto/create-patient-request.dto.ts` and `apps/api/src/app/patients/api/controllers/patients.controller.ts`
- [ ] T013 [US1] Confirm patient metadata and an optional validated private object as one creation result with exact-key compensation in `apps/api/src/app/patients/application/services/patients.service.ts` and `apps/api/src/app/patients/patients.module.ts`
- [ ] T014 [US1] Emit OpenAPI and regenerate the ignored Orval mutations and Zod Mini request schemas through the `api:openapi` and `web:generate-api` targets configured by `apps/api/project.json` and `apps/web/project.json`
- [ ] T015 [US1] Build the shared patient fields and local photo state composition with official shadcn primitives and React 19 ref cleanup in `apps/web/src/modules/patients/ui/patient-form-fields.tsx` and `apps/web/src/modules/patients/ui/patient-photo-field.tsx`
- [ ] T016 [US1] Submit the existing create flow as generated multipart data while preserving field state, pending behavior, and navigation in `apps/web/src/modules/patients/ui/patient-create-overlay.tsx`
- [ ] T017 [US1] Add concise English and French create-photo, preparing, validation, replace, remove, pending, and safe-error copy in `apps/web/src/shared/i18n/locales/en.json` and `apps/web/src/shared/i18n/locales/fr.json`

**Checkpoint**: User Story 1 passes independently with and without a photo, and local selection performs no mutation before Create patient.

---

## Phase 4: User Story 2 — Update An Owned Patient (Priority: P1)

**Goal**: Edit owned identity fields and explicitly keep, add, replace, or remove one private photo as one confirmed update.

**Traceability**: FR-006–FR-010, FR-014–FR-018; SC-004–SC-005, SC-007–SC-010.

**Independent Test**: Update each identity field while keeping the current photo, then separately add, replace, and remove a photo; verify the patient ID, creation date, scans, and print requests do not change.

### Tests for User Story 2

- [ ] T018 [P] [US2] Add owner-scoped keep, add, replace, remove, row-lock, no-partial-update, new-object compensation, former-object cleanup, and indistinguishable-not-found tests in `apps/api/src/app/patients/application/services/patients.service.spec.ts`
- [ ] T019 [P] [US2] Add prefilled, unchanged, keep, replace, remove, pending, cancel, close, failed-save, and successful-refresh tests in `apps/web/src/modules/patients/ui/patient-edit-overlay.test.tsx`
- [ ] T020 [P] [US2] Extend workspace tests for the accessible Edit patient action, responsive overlay, preserved scan tab, and refreshed identity in `apps/web/src/modules/patients/ui/patient-workspace-page.test.tsx`

### Implementation for User Story 2

- [ ] T021 [US2] Add the complete multipart update DTO and owner-scoped `PATCH /api/patients/:patientId` contract in `apps/api/src/app/patients/api/dto/update-patient-request.dto.ts` and `apps/api/src/app/patients/api/controllers/patients.controller.ts`
- [ ] T022 [US2] Implement the scoped EntityManager transaction, owned row lock, explicit photo decision, compensation, and post-commit former-object cleanup in `apps/api/src/app/patients/application/services/patients.service.ts`
- [ ] T023 [US2] Regenerate the ignored OpenAPI/Orval artifacts after the update contract through the targets configured by `apps/api/project.json` and `apps/web/project.json`
- [ ] T024 [US2] Implement the responsive edit flow by composing the shared patient fields and photo field in `apps/web/src/modules/patients/ui/patient-edit-overlay.tsx`
- [ ] T025 [US2] Connect Edit patient, generated update mutation, exact query invalidation, and image refresh without changing workspace destinations in `apps/web/src/modules/patients/ui/patient-workspace-page.tsx`
- [ ] T026 [US2] Add concise English and French edit, save, unchanged, keep, replace, remove, pending, and safe-error copy in `apps/web/src/shared/i18n/locales/en.json` and `apps/web/src/shared/i18n/locales/fr.json`

**Checkpoint**: User Story 2 passes independently for identity-only and every explicit photo decision, with no partial confirmed state.

---

## Phase 5: User Story 3 — Recognize Patients Consistently (Priority: P2)

**Goal**: Show the same current photo or Unicode-correct initials beside the full name in the directory and workspace.

**Traceability**: FR-011–FR-013, FR-016–FR-019; SC-005–SC-006, SC-009–SC-011.

**Independent Test**: Render owned patients with a photo, no photo, and unavailable photo content in both identity surfaces; verify the full name, fallback, row activation, pagination, scans, and printing remain available.

### Tests for User Story 3

- [ ] T027 [P] [US3] Add owner-scoped current-photo streaming, exact headers, missing/foreign/no-photo concealment, object mismatch, and storage-unavailable tests in `apps/api/src/app/patients/application/services/patients.service.spec.ts`
- [ ] T028 [P] [US3] Add Unicode grapheme initials, current photo, failed-image fallback, full-name, and non-interactive avatar tests in `apps/web/src/modules/patients/ui/patient-identity.test.tsx`
- [ ] T029 [P] [US3] Extend directory and workspace tests for consistent identity, existing row keyboard activation, pagination, scans, and printing in `apps/web/src/modules/patients/ui/patients-page.test.tsx` and `apps/web/src/modules/patients/ui/patient-workspace-page.test.tsx`

### Implementation for User Story 3

- [ ] T030 [US3] Add authenticated current-photo streaming with private no-store headers and safe owner concealment in `apps/api/src/app/patients/application/services/patients.service.ts` and `apps/api/src/app/patients/api/controllers/patients.controller.ts`
- [ ] T031 [US3] Regenerate and inspect the ignored binary photo operation and updated patient models through the targets configured by `apps/api/project.json` and `apps/web/project.json`
- [ ] T032 [US3] Implement locale-aware initials and the official shadcn photo-or-fallback composition in `apps/web/src/modules/patients/lib/patient-identity.ts` and `apps/web/src/modules/patients/ui/patient-identity.tsx`
- [ ] T033 [US3] Use the shared identity composition in the existing directory row and workspace header without changing navigation in `apps/web/src/modules/patients/ui/patients-page.tsx` and `apps/web/src/modules/patients/ui/patient-workspace-page.tsx`

**Checkpoint**: User Story 3 passes independently for photo, no-photo, and image-failure states in desktop and compact layouts.

---

## Phase 6: User Story 4 — Recover Without Partial Or Exposed Changes (Priority: P2)

**Goal**: Make every creation, update, cleanup, ownership, and private-content failure safe and deliberately retryable.

**Traceability**: FR-014–FR-019; SC-007–SC-011.

**Independent Test**: Force validation, storage-write, transaction, cleanup, missing-object, foreign-patient, failed-create, and failed-update outcomes; verify prior confirmed state, safe feedback, deliberate retry, and zero protected disclosure.

### Tests for User Story 4

- [ ] T034 [P] [US4] Complete API failure-path assertions for stable Problem Details, compensation outcomes, safe logging, former-photo inaccessibility, and scan-storage regression in `apps/api/src/app/patients/application/services/patients.service.spec.ts`, `apps/api/src/app/scans/application/services/scans.service.spec.ts`, and `apps/api/src/storage/minio-private-object-storage.adapter.spec.ts`
- [ ] T035 [P] [US4] Complete Web recovery assertions for retained form state, deliberate retry, discarded temporary content, inaccessible confirmed image fallback, localization, focus, and announcements in `apps/web/src/modules/patients/ui/patients-page.test.tsx`, `apps/web/src/modules/patients/ui/patient-edit-overlay.test.tsx`, and `apps/web/src/modules/patients/ui/patient-photo-field.test.tsx`

### Implementation for User Story 4

- [ ] T036 [US4] Reconcile safe patient-photo error translation and metadata-free operational logging across `apps/api/src/app/patients/application/services/patients.service.ts`, `apps/api/src/http/problem-details.filter.ts`, and `apps/api/src/storage/minio-private-object-storage.adapter.ts`
- [ ] T037 [US4] Reconcile localized retry, pending, invalid, and fallback presentation without clearing valid user input in `apps/web/src/modules/patients/ui/patient-create-overlay.tsx`, `apps/web/src/modules/patients/ui/patient-edit-overlay.tsx`, and `apps/web/src/modules/patients/ui/patient-photo-field.tsx`

**Checkpoint**: Every accepted failure path retains the correct confirmed authority and exposes no private storage or ownership detail.

---

## Phase 7: Polish And Cross-Cutting Validation

**Purpose**: Document the delivered boundary and prove the full contract, migration, regression, accessibility, and delivery evidence.

- [ ] T038 [P] Add concise patient-photo implementation notes and explicit trade-offs in `docs/backend-and-data.md` and `docs/frontend.md`
- [ ] T039 Run OpenAPI emission, Orval generation, API/Web focused tests, lint, typecheck, build, and full Liquibase validation using the targets in `apps/api/project.json`, `apps/web/project.json`, and `database/project.json`
- [ ] T040 Compare desktop `1440×900` and compact `390×900` create, edit, validation, directory, and workspace behavior with Figma nodes `425:7`, `425:33`, `425:55`, `425:63`, `425:71`, `425:77`, and `431:558`, including English, French, keyboard, focus, and announcements
- [ ] T041 Build the API and Web containers, run the repository workflow's `nx affected` targets without manual filtering, then inspect `git diff --check`, generated/ignored files, secrets, protected data, synthetic fixtures, and the complete changed workset

---

## Dependencies And Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts after plan approval.
- **Foundational (Phase 2)**: Depends on T001 and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2; this is the smallest demonstrable slice.
- **User Story 2 (Phase 4)**: Depends on Phase 2 and reuses the shared form/photo composition established by US1.
- **User Story 3 (Phase 5)**: Depends on Phase 2 and can be developed independently of the mutation stories.
- **User Story 4 (Phase 6)**: Depends on US1, US2, and US3 because it proves their combined recovery boundary.
- **Polish (Phase 7)**: Depends on every selected story.

### Within Each Story

1. Add focused tests and confirm the new assertions fail for the expected missing behavior.
2. Implement the API model/service/controller behavior before regenerating its client.
3. Regenerate through Nx; never edit OpenAPI or Orval output manually.
4. Implement the Web composition against generated contracts and official local components.
5. Pass the independent checkpoint before moving to the next dependent story.

### Parallel Opportunities

- T002, T005, and T006 affect separate foundational files; T003 follows T002 and T007 follows T006.
- The API and Web test-first tasks inside each story can run in parallel.
- US3 can start after Phase 2 while US1 and US2 are in progress, provided no shared-file edits overlap.
- T038 can run while final automated validation is being prepared.

## Parallel Examples

### User Story 1

```text
T009: API creation and compensation tests
T010: Local photo field tests
T011: Patient creation flow tests
```

### User Story 2

```text
T018: API update and ownership tests
T019: Edit overlay tests
T020: Workspace edit integration tests
```

### User Story 3

```text
T027: Authenticated photo-stream tests
T028: Identity component and Unicode initials tests
T029: Directory/workspace regression tests
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational phases.
2. Complete User Story 1.
3. Run its API/Web focused tests and manual create-flow checkpoint.
4. Continue to the remaining accepted stories in the same delivery branch; do not deploy a partial schema or contract.

### Complete Delivery

1. Deliver US1 create behavior.
2. Deliver US2 edit behavior on the same shared photo field and generated contract.
3. Deliver US3 identity presentation and authenticated photo stream.
4. Close the combined failure boundary with US4.
5. Run all Phase 7 evidence before review and let Nx select affected projects for CI and deployment.

## Notes

- Keep every change traceable to issue #64, the accepted spec, approved plan, or approved Figma evidence.
- Use only synthetic images and identities in tests and evidence; never commit supplied files, patient data, original filenames, credentials, or runtime storage.
- Keep generated OpenAPI and Orval outputs ignored and manually immutable.
- Preserve existing scan, printing, authentication, pagination, localization, and deployment behavior.
- Do not add a photo table, public URL, second bucket, gallery, worker, queue, outbox, generic repository, or custom UI system.
