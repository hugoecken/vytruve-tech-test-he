# Tasks: Scan Upload Preview

**Status**: Derived from accepted plan fingerprint `aaf4389c8b48aa46cde771f5198785d3453643d1610892ffdfd5f29d64a77c2c`

**Input**: Accepted [`spec.md`](spec.md), [`plan.md`](plan.md), [`research.md`](research.md), [`data-model.md`](data-model.md), [`contracts/scan-upload-preview-ui.md`](contracts/scan-upload-preview-ui.md), and [`quickstart.md`](quickstart.md)

**Tests**: Required by the accepted specification. Add each focused regression test before its implementation and observe the intended failure.

**Boundary**: This checklist is derived only for issue #63. It must not create or replace GitHub execution items.

## Phase 1: Setup

**Purpose**: Confirm that the delivered workspace already owns every required dependency and target.

- [X] T001 Verify the locked React 19, Three.js 0.185.1, Base UI 1.7, Vite 8, TypeScript 6, and Vitest 4 dependencies in `package.json` and `package-lock.json`, and inspect the resolved Web targets with `npm exec nx -- show project web --json` without changing the manifests

**Checkpoint**: No dependency, generator, API, storage, or workspace-structure change is required.

---

## Phase 2: User Story 1 — Inspect A Selected Scan Before Upload (Priority: P1) 🎯 MVP

**Goal**: Preview and manipulate the exact locally selected eligible PLY without sending it before explicit upload.

**Independent Test**: Select one synthetic PLY, observe one local read and zero requests, use all five controls, then explicitly submit the unchanged `File` once.

### Tests for User Story 1

- [X] T002 [P] [US1] Extend `apps/web/src/modules/scans/lib/scan-preview-renderer.test.ts` with synthetic ASCII, binary little-endian, binary big-endian, encoding callback, and unknown-header/no-console evidence (FR-002–FR-003, FR-005, FR-010, FR-014; SC-002, SC-011)
- [X] T003 [P] [US1] Extend `apps/web/src/modules/scans/ui/scan-upload-overlay.test.tsx` with exactly one `arrayBuffer()` call per eligible selection under Strict Mode, zero pre-submit requests, the five ready commands, unchanged explicit upload, replacement, and removal (FR-001–FR-007, FR-009–FR-010; SC-001–SC-006)

### Implementation for User Story 1

- [X] T004 [US1] Harden `apps/web/src/modules/scans/lib/scan-preview-renderer.ts` with one bounded standard-directive PLY header inspection, technical encoding callback, and a synchronous official Three.js console hook restored in `finally`, while keeping `PLYLoader` as the sole geometry parser (FR-002–FR-003, FR-005, FR-010, FR-014)
- [X] T005 [US1] Add the eager `apps/web/src/modules/scans/ui/scan-preview-toolbar.tsx` and deferred `scan-upload-preview.tsx` plus `scan-upload-preview-experience.tsx`, using the existing renderer facade, semantic tokens, React 19 callback-ref cleanup, and no `useEffect` (FR-002–FR-006, FR-010, FR-013–FR-014)
- [X] T006 [US1] Integrate one ephemeral `{ file, previewData }` selection and the approved desktop/compact local-preview composition into `apps/web/src/modules/scans/ui/scan-upload-overlay.tsx`, retaining the original `File`, existing validation, and explicit mutation (FR-001–FR-003, FR-007, FR-009–FR-010, FR-013–FR-014)

**Checkpoint**: The local preview is independently usable and sends nothing before Add scan.

---

## Phase 3: User Story 2 — Keep Preview Controls Stable During Preparation (Priority: P2)

**Goal**: Render the final viewport and toolbar footprint from the first preparing frame in both preview flows.

**Independent Test**: Delay both lazy preview modules and verify that the same five disabled controls appear with the viewport, then enable in place without reordering or resizing.

### Tests for User Story 2

- [X] T007 [P] [US2] Create `apps/web/src/modules/scans/ui/scan-preview.test.tsx` proving the existing-scan Suspense fallback includes the complete disabled toolbar before the deferred module resolves (FR-004, FR-006, FR-011, FR-013; SC-004–SC-005)
- [X] T008 [US2] Extend `apps/web/src/modules/scans/ui/scan-upload-overlay.test.tsx` with announced preparing state, stable disabled-to-enabled accessible controls, one-row order, and compact gesture-boundary evidence (FR-004, FR-006, FR-013; SC-004–SC-005, SC-008)

### Implementation for User Story 2

- [X] T009 [US2] Reuse `scan-preview-toolbar.tsx` from both Suspense fallbacks and ready experiences in `scan-preview.tsx`, `scan-preview-experience.tsx`, `scan-upload-preview.tsx`, and `scan-upload-preview-experience.tsx`, preserving deferred Three.js imports and existing scan retrieval/Retry behavior (FR-004, FR-006, FR-011, FR-013)
- [X] T010 [US2] Add concise upload-preview state and encoding presentation copy to `apps/web/src/shared/i18n/locales/en.json` and `fr.json`, using `Binaire (little-endian)` and `Binaire (big-endian)` with no privacy, storage, or public-URL explanation (FR-012–FR-014; SC-008–SC-009)

**Checkpoint**: Both preview flows render one stable, localized, accessible control footprint.

---

## Phase 4: User Story 3 — Recover Without Losing The Upload Choice (Priority: P3)

**Goal**: Keep an eligible upload available when its local preview cannot be displayed and discard every superseded session.

**Independent Test**: Force read, malformed-content, WebGL2, and renderer failures; observe safe feedback without Retry or technical detail, then replace, remove, close, or deliberately submit.

### Tests for User Story 3

- [X] T011 [US3] Extend `apps/web/src/modules/scans/ui/scan-upload-overlay.test.tsx` with read rejection, malformed PLY, unavailable renderer, late completion, replace/remove/close/success cleanup, safe copy, no local Retry, and preserved eligible submit evidence (FR-007–FR-010, FR-013–FR-014; SC-006–SC-008, SC-011)

### Implementation for User Story 3

- [X] T012 [US3] Complete tagged preparation state and safe unavailable rendering in `apps/web/src/modules/scans/ui/scan-upload-preview-experience.tsx`, ensuring callback-ref cleanup disposes once and ignores late promise completion without changing upload eligibility (FR-007–FR-010, FR-013–FR-014)

**Checkpoint**: Every accepted local-preview failure and cleanup path is independently covered.

---

## Phase 5: Completion And Evidence

**Purpose**: Prove focused behavior, non-regression, deferred loading, Nx ownership, visual fidelity, and protected-data safety.

- [X] T013 Run `npm exec nx -- test web`, `lint web`, `typecheck web`, `build web`, and `run web:container`; inspect the Vite output to confirm Three.js remains deferred (SC-001–SC-011)
- [X] T014 Run the workflow-equivalent `npm exec nx -- affected -t lint typecheck test build` and `npm exec nx -- affected -t container`; review desktop `1440×900` and compact `390×900` with only local supplied samples; then run Prettier, `git diff --check`, and protected-data/generated-artifact scans (SC-001–SC-011)

**Checkpoint**: Issue #63 is ready for review and promotion through `develop` to `main`.

---

## Requirement Coverage

| Requirement | Primary tasks |
| --- | --- |
| FR-001–FR-003 | T002–T006 |
| FR-004–FR-006 | T002–T009 |
| FR-007–FR-010 | T003, T006, T011–T012 |
| FR-011 | T007, T009 |
| FR-012–FR-014 | T002, T004–T012 |
| SC-001–SC-003 | T002–T006, T013–T014 |
| SC-004–SC-005 | T007–T009, T013–T014 |
| SC-006–SC-008 | T003, T008, T011–T014 |
| SC-009–SC-011 | T002, T004, T010–T014 |

## Dependencies And Execution Order

1. T001 confirms that no setup mutation is needed.
2. T002–T003 are written and observed failing before T004–T006.
3. T007–T008 are written and observed failing before T009–T010.
4. T011 is written and observed failing before T012.
5. T013–T014 follow all three story checkpoints.

Tasks marked `[P]` touch different files and may run concurrently only when their listed paths do not overlap.

## Delivery Strategy

1. Deliver US1 as the smallest useful local-preview slice.
2. Reuse its eager toolbar for the US2 stability correction.
3. Add US3 failure semantics without changing server validation or upload eligibility.
4. Stop if implementation changes observable intent or the approved Figma composition; return that discovery to the owning authority.
