# Tasks: Interactive Scan Preview

**Status**: Candidate

**Input**: Accepted [`spec.md`](spec.md), candidate [`plan.md`](plan.md), [`research.md`](research.md), [`data-model.md`](data-model.md), [`contracts/interactive-scan-preview-ui.md`](contracts/interactive-scan-preview-ui.md), and [`quickstart.md`](quickstart.md)

**Tests**: Required by the accepted specification and planning authority. Write each focused test group first and observe the intended failure before its implementation task.

**Boundary**: This derived checklist remains local to feature `002-interactive-scan-preview`. It must not create GitHub issues.

## Phase 1: Setup

**Purpose**: Add only the maintained dependencies and generated-client capability required by the accepted architecture.

- [ ] T001 Add `three@^0.185.1` and `@types/three@^0.185.1` to `package.json` and `package-lock.json` through npm, preserving the existing npm workspace (FR-004, FR-006–FR-007)
- [ ] T002 Enable the official Orval TanStack Query abort signal in `orval.config.ts`, regenerate with `npm exec nx -- run web:generate-api`, and verify the ignored generated `useDownloadPatientScan` hook consumes the query signal without manual generated edits (FR-003, FR-010, FR-012)

**Checkpoint**: The locked dependency graph and generated query boundary are ready; no user-visible behavior exists yet.

---

## Phase 2: Shared UI Foundation

**Purpose**: Make the existing responsive overlay composition-capable without a preview-specific API.

- [ ] T003 Extend `apps/web/src/shared/ui/responsive-details-overlay.tsx` with only `contentClassName?: string`, applying it to desktop `DialogContent` while preserving compact Drawer behavior and every existing consumer (FR-011, FR-013)

**Checkpoint**: The overlay can accept the approved desktop width without boolean-prop proliferation.

---

## Phase 3: User Story 1 — Inspect an Owned Scan (Priority: P1) 🎯 MVP

**Goal**: Keep metadata immediate, then render and manipulate one explicitly requested private PLY preview.

**Independent acceptance**: Open one owned scan without a content request, activate Preview once, and inspect a complete fitted mesh through gestures and all five visible controls while metadata remains available.

### Tests for User Story 1

- [ ] T004 [P] [US1] Extend `apps/web/src/modules/scans/ui/scans-panel.test.tsx` with a request counter proving metadata-only opening, one request after Preview, announced preparation, retained metadata, and unchanged Print and Download actions (FR-001–FR-002, FR-005–FR-006, FR-013; SC-001, SC-009)
- [ ] T005 [P] [US1] Create `apps/web/src/modules/scans/lib/scan-preview-renderer.test.ts` with small synthetic ASCII, binary little-endian, and binary big-endian PLY buffers proving non-empty parsing, fitted setup, fixed lighting, vertex-color preservation, neutral fallback, missing-normal computation, event-driven rendering, five commands, resize, and disposal (FR-004, FR-006–FR-007, FR-010; SC-002–SC-005, SC-007)
- [ ] T006 [P] [US1] Create `apps/web/src/modules/scans/ui/scan-preview-experience.test.tsx` with a mocked renderer facade proving ready-state announcement and exact forwarding of rotate left/right, zoom in/out, and reset from accessible controls (FR-005–FR-006, FR-011; SC-005, SC-008)

### Implementation for User Story 1

- [ ] T007 [US1] Implement `apps/web/src/modules/scans/lib/scan-preview-renderer.ts` with WebGL2 validation, direct `PLYLoader.parse(ArrayBuffer)`, finite non-empty geometry checks, conditional normals, centering and bounding-sphere camera fit, fixed ambient/directional lighting, vertex/neutral material selection, event-driven `OrbitControls`, pixel-ratio cap, `ResizeObserver`, the six-method facade, and idempotent cleanup (FR-004, FR-006–FR-007, FR-010, FR-012; SC-002–SC-005, SC-007, SC-010)
- [ ] T008 [US1] Implement the idle boundary and deferred import in `apps/web/src/modules/scans/ui/scan-preview.tsx`, loading `scan-preview-experience.tsx` through React lazy/Suspense only after Preview intent (FR-001–FR-002, FR-005, FR-012; SC-001, SC-003)
- [ ] T009 [US1] Implement the successful query and DOM lifecycle in `apps/web/src/modules/scans/ui/scan-preview-experience.tsx`: generated hook, `retry: false`, `gcTime: 0`, mount/focus/reconnect refetches disabled, Blob-to-ArrayBuffer conversion without URL, React 19 callback-ref cleanup, renderer handle, five shadcn controls, polite status, and `data-base-ui-swipe-ignore` (FR-002–FR-007, FR-010–FR-012; SC-002–SC-005, SC-007–SC-008, SC-010)
- [ ] T010 [US1] Integrate `ScanPreview` and the accepted desktop/compact composition into `apps/web/src/modules/scans/ui/scans-panel.tsx`, then add complete English and French idle/preparing/ready/control copy to `apps/web/src/shared/i18n/locales/en.json` and `apps/web/src/shared/i18n/locales/fr.json` (FR-001, FR-005–FR-007, FR-011, FR-013; SC-001, SC-004–SC-005, SC-008–SC-009)

**Checkpoint**: US1 is independently demonstrable with synthetic data and one locally supplied scan; failure recovery may still be incomplete.

---

## Phase 4: User Story 2 — Recover Without Losing Context (Priority: P2)

**Goal**: Collapse all retrieval and preparation failures into one safe state with deliberate one-request retry and complete session cleanup.

**Independent acceptance**: Cause retrieval, malformed-content, WebGL2, and temporary-resource failures; metadata remains visible, no technical detail appears, and only explicit Retry starts one new attempt.

### Tests for User Story 2

- [ ] T011 [P] [US2] Extend `apps/web/src/modules/scans/ui/scan-preview-experience.test.tsx` with retrieval failure, Blob conversion failure, zero mount/focus/reconnect refetches, one explicit refetch, duplicate-retry prevention, query-content eviction, close-during-fetch cancellation, renderer disposal, and clean reopening evidence (FR-003, FR-005, FR-008–FR-010, FR-012; SC-006–SC-007, SC-010)
- [ ] T012 [P] [US2] Extend `apps/web/src/modules/scans/lib/scan-preview-renderer.test.ts` with empty/malformed/non-finite PLY, unavailable WebGL2, construction failure, late cleanup, and dispose-once evidence without exposing error details (FR-008, FR-010, FR-012; SC-006–SC-007, SC-010)

### Implementation for User Story 2

- [ ] T013 [US2] Complete the unavailable/retry state in `apps/web/src/modules/scans/ui/scan-preview-experience.tsx` with one generic callback path, an attempt key, disabled concurrent actions, and `refetch({ cancelRefetch: false })`; add localized safe feedback and Retry copy to both locale files (FR-003, FR-005, FR-008–FR-009, FR-011–FR-012; SC-006, SC-008, SC-010)
- [ ] T014 [US2] Complete close and failure cleanup across `scan-preview.tsx`, `scan-preview-experience.tsx`, and `scan-preview-renderer.ts`, ensuring an aborted or late asynchronous result cannot recreate a renderer and reopening starts at Idle (FR-010, FR-012; SC-007, SC-010)

**Checkpoint**: Both user stories are independently executable and every accepted preview state has focused evidence.

---

## Phase 5: Completion and Evidence

**Purpose**: Prove non-regression, deferred loading, product fidelity, Nx ownership, and protected-data safety.

- [ ] T015 Extend `apps/web/src/modules/scans/ui/scans-panel.test.tsx` with final Preview/Download/Print non-regression and compact gesture-boundary assertions, preserving existing tests rather than replacing them (FR-011, FR-013; SC-005, SC-009)
- [ ] T016 [P] Add the bounded interactive-preview note and deferred-loading/privacy boundary to `docs/frontend.md`, linking to the canonical Figma design while leaving detailed mechanics in these Spec Kit artifacts (FR-012–FR-013; SC-010)
- [ ] T017 Run `npm exec nx -- test web`, `lint web`, `typecheck web`, and `build web`; inspect Vite output to prove Three.js is deferred; run `npm exec nx -- run web:container`; then execute the workflow-equivalent `nx affected` checks from [`quickstart.md`](quickstart.md) without manual project selection (SC-001–SC-010)
- [ ] T018 Review all three supplied samples locally at 1440×900 and 390×900 with mouse, keyboard, and touch emulation; cover every accepted encoding, measure post-retrieval readiness, and record only pass/fail evidence without filenames, bytes, or screenshots (SC-002–SC-008, SC-010)
- [ ] T019 Run Nx format checking, `git diff --check`, final diff inspection, and protected-data/generated-artifact scans; verify no scan fixture, original filename, storage URL/key, credential, debug log, manual generated edit, direct `useEffect`, eager Three.js import, or non-Nx change selector is present (FR-012–FR-013; SC-009–SC-010)

**Checkpoint**: Issue #53 has complete local implementation evidence and is ready for review and promotion through the existing Git workflow.

---

## Requirement Coverage

| Requirement | Primary tasks |
| --- | --- |
| FR-001–FR-002 | T004, T008–T010 |
| FR-003 | T002, T011, T013 |
| FR-004 | T001, T005, T007 |
| FR-005–FR-007 | T004–T010 |
| FR-008–FR-009 | T011–T014 |
| FR-010 | T002, T005, T007, T009, T011–T014 |
| FR-011 | T003, T006, T009–T010, T013, T015 |
| FR-012 | T002, T005, T007–T009, T011–T014, T016, T019 |
| FR-013 | T003–T004, T010, T015–T016, T019 |
| SC-001–SC-005 | T004–T010, T017–T018 |
| SC-006–SC-008 | T006, T009–T014, T017–T018 |
| SC-009–SC-010 | T002, T004–T005, T007, T009, T011–T017, T019 |

## Dependencies and Execution Order

1. T001–T002 establish the dependency and generated query boundary.
2. T003 can proceed independently but must finish before T010.
3. T004–T006 are written and observed failing before T007–T010.
4. T007 precedes T009; T008 and T007 may proceed independently after their tests.
5. T011–T012 are written and observed failing after the US1 checkpoint, before T013–T014.
6. T015–T019 follow both story checkpoints.

Tasks marked `[P]` modify different files or independent evidence and may run concurrently only when their listed paths do not overlap.

## Delivery Strategy

1. Deliver the smallest functional slice through US1: intent, authenticated retrieval, one viewer, five controls, and metadata preservation.
2. Add US2 recovery and cleanup without changing the successful path.
3. Complete documentation, real-browser local evidence, Nx checks, container build, and protected-data review.
4. Stop if implementation discovery changes any observable requirement or accepted Figma composition; return that change to the owning authority before continuing.
