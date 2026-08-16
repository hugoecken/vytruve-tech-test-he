# Feature Specification: Interactive Scan Preview

**Feature Branch**: `docs/interactive-scan-preview-spec`

**Created**: 2026-08-16

**Status**: Accepted

**Input**: Allow an authenticated orthoprosthetist to inspect an owned private PLY scan interactively from the existing scan-details overlay without weakening privacy or changing download and printing workflows.

## Authority And Scope

- This feature extends the accepted Orthoprosthetist Printing Workflow specification at commit `2dd91218cf0d9114fd440efbfbd9843987c9036c`.
- The earlier specification remains authoritative except where this feature deliberately narrows its 3D-visualization non-goal to one read-only scan preview.
- Existing patient and scan ownership, accepted PLY encodings, upload limits, private-storage rules, download behavior, and print-request behavior remain unchanged.
- The three supplied sample scans provide local acceptance evidence only. Their names, contents, and personal metadata are not reproduced in committed or design evidence.
- Once explicitly accepted, this specification owns the observable preview behavior. Figma may compose that behavior visually without adding or removing it.

## User Scenarios & Testing

### User Story 1 - Inspect An Owned Scan (Priority: P1)

An authenticated orthoprosthetist opens an existing scan, reviews its safe metadata immediately, and deliberately starts an interactive preview to confirm that the uploaded shape is the intended scan.

**Why this priority**: Visual verification is the feature's primary value and must not slow or weaken the existing metadata consultation path.

**Independent Test**: Open one owned scan, confirm that no scan content is retrieved until Preview is activated, then rotate, zoom, and reset a valid mesh while its metadata remains available.

**Acceptance Scenarios**:

1. **Given** an owned scan row is visible, **When** the user opens its details, **Then** the existing safe metadata appears without retrieving the scan content.
2. **Given** scan details are open in the idle preview state, **When** the user activates Preview, **Then** one preparation state is announced and content retrieval begins for that selected scan.
3. **Given** a valid accepted PLY scan has been prepared, **When** the preview becomes ready, **Then** the user can inspect one centered mesh without losing the scan metadata or patient context.
4. **Given** a ready preview, **When** the user uses pointer or touch gestures or the visible controls, **Then** the mesh can be rotated, zoomed, and restored to its initial fitted view.
5. **Given** the scan contains display colors, **When** it is previewed, **Then** those colors remain visible; otherwise, the complete shape remains visible with one neutral treatment.

---

### User Story 2 - Recover Without Losing Context (Priority: P2)

An authenticated orthoprosthetist receives clear, safe feedback when a preview cannot be retrieved or displayed and can deliberately retry without losing the already loaded scan metadata.

**Why this priority**: Preview is an optional consultation aid. Its failure must not make the existing scan workflow unusable or disclose protected details.

**Independent Test**: Induce retrieval, malformed-content, unavailable-rendering, and resource-limit failures; confirm that each preserves metadata, shows the same safe recovery category, and retries only after explicit activation.

**Acceptance Scenarios**:

1. **Given** preview preparation fails, **When** the failure is presented, **Then** the metadata remains visible with localized non-technical feedback and one explicit Retry action.
2. **Given** a preview failure is visible, **When** the user does not activate Retry, **Then** no additional content retrieval occurs.
3. **Given** a preview failure is visible, **When** the user activates Retry, **Then** one new preparation attempt begins for the same selected scan.
4. **Given** an unknown, unavailable, or foreign-owned scan, **When** preview retrieval fails, **Then** no protected content, storage detail, or existence signal is revealed.
5. **Given** a preview is loading, ready, or unavailable, **When** the user closes the details overlay, **Then** the patient workspace remains selected and a later opening starts with metadata and an idle preview.

### Edge Cases

- A valid scan has no display colors.
- A scan accepted by the existing upload rules uses any one of the three supported PLY encodings.
- The content becomes unavailable after its metadata was listed.
- The retrieved content cannot be prepared as a non-empty mesh.
- The browser cannot provide the graphics capability or temporary resources required for preview.
- The user closes the overlay while content is being retrieved or prepared.
- The user repeatedly activates a preview control or uses gestures while the viewport changes size.
- The user switches between pointer, touch, and keyboard interaction.

## Stable Interaction Index

### Destinations And Context

| ID | Meaning | Observable boundary |
| --- | --- | --- |
| `DST-PATIENT-WORKSPACE` | Existing owned patient workspace | Remains selected before, during, and after preview. |
| `SCAN-SELECTED` | Existing read-only scan details | Shows already-loaded safe metadata before any preview request. |

### Actions

| ID | Label | Availability |
| --- | --- | --- |
| `ACT-SCAN-PREVIEW` | Preview 3D scan | Available from idle scan details. |
| `ACT-SCAN-PREVIEW-RETRY` | Retry preview | Available only after a preview failure. |
| `ACT-PREVIEW-ROTATE-LEFT` | Rotate left | Available when the preview is ready. |
| `ACT-PREVIEW-ROTATE-RIGHT` | Rotate right | Available when the preview is ready. |
| `ACT-PREVIEW-ZOOM-IN` | Zoom in | Available when the preview is ready. |
| `ACT-PREVIEW-ZOOM-OUT` | Zoom out | Available when the preview is ready. |
| `ACT-PREVIEW-RESET` | Reset view | Available when the preview is ready. |

### Preview States

| ID | Meaning | Observable requirement |
| --- | --- | --- |
| `SCAN-PREVIEW-IDLE` | No preview has been requested | Metadata is available and scan content has not been retrieved for preview. |
| `SCAN-PREVIEW-PREPARING` | Content is being retrieved or prepared | Progress is announced and repeated activation cannot create parallel attempts. |
| `SCAN-PREVIEW-READY` | The mesh is interactive | The viewport, gestures, and all five visible controls are available. |
| `SCAN-PREVIEW-UNAVAILABLE` | The attempt cannot produce a preview | Metadata remains available with safe feedback and explicit retry. |

## Requirements

### Functional Requirements

- **FR-001**: Opening `SCAN-SELECTED` MUST continue to show the safe metadata already loaded by the scan collection and MUST NOT retrieve scan content for preview.
- **FR-002**: `ACT-SCAN-PREVIEW` MUST be the only transition from `SCAN-PREVIEW-IDLE` to `SCAN-PREVIEW-PREPARING`, and one activation MUST start no more than one retrieval attempt for the selected scan.
- **FR-003**: Preview content MUST remain within the existing authenticated patient-and-scan ownership boundary; unknown, unavailable, and foreign-owned scans MUST disclose neither protected content nor distinguishable existence information.
- **FR-004**: Every structurally valid, non-empty PLY scan accepted by the existing scan rules MUST be eligible for preview, including ASCII, binary little-endian, and binary big-endian content up to the existing 25 MiB limit.
- **FR-005**: `SCAN-PREVIEW-PREPARING` MUST provide localized perceivable feedback until the attempt becomes ready or unavailable and MUST prevent parallel attempts for the same open preview.
- **FR-006**: `SCAN-PREVIEW-READY` MUST present one centered, fitted mesh and MUST support rotation and zoom through pointer and touch gestures plus `ACT-PREVIEW-ROTATE-LEFT`, `ACT-PREVIEW-ROTATE-RIGHT`, `ACT-PREVIEW-ZOOM-IN`, `ACT-PREVIEW-ZOOM-OUT`, and `ACT-PREVIEW-RESET`.
- **FR-007**: A preview MUST preserve display colors supplied by the scan when present and MUST use one neutral, non-diagnostic treatment when they are absent.
- **FR-008**: Retrieval failure, malformed or empty preview content, unavailable graphics capability, and insufficient temporary resources MUST all preserve scan metadata in `SCAN-PREVIEW-UNAVAILABLE`, present localized non-technical feedback, and expose only `ACT-SCAN-PREVIEW-RETRY` as the preview recovery action.
- **FR-009**: `ACT-SCAN-PREVIEW-RETRY` MUST start exactly one deliberate new attempt and MUST NOT run automatically.
- **FR-010**: Closing scan details MUST discard the active preview session, its temporary scan content, and its changed viewpoint; reopening the scan MUST begin at `SCAN-PREVIEW-IDLE` without changing the selected patient workspace.
- **FR-011**: Preview states and actions MUST support English and French, keyboard navigation, visible focus, accessible names, announced asynchronous feedback, and usable desktop and compact-screen layouts; pointer and touch interaction with the preview MUST NOT accidentally close the details overlay.
- **FR-012**: Preview MUST NOT create a public or storage-provider URL, persist scan content or camera state, expose original filenames or storage identifiers, or place scan content in application logs, tests, screenshots, designs, or committed evidence.
- **FR-013**: Existing scan download, scan upload, print-request creation, scan metadata consultation, patient navigation, and retention behavior MUST remain unchanged when preview is idle, active, unavailable, or closed.

### Key Entities

- **3D scan**: The existing owned, private PLY mesh selected from one patient's scan collection. Preview adds no persisted scan field or lifecycle state.
- **Preview session**: One temporary consultation of one selected 3D scan, beginning with explicit user intent and ending when scan details close. It contains no persisted user or clinical data.
- **Viewpoint**: The temporary orientation and zoom used during one Preview session. Reset restores its initial fitted state; closing discards it.

### Entity Relationships And Invariants

- One Preview session belongs to exactly one selected 3D scan within its existing Patient and Account ownership chain.
- At most one preview attempt is active within one open scan-details overlay.
- Preview availability never changes upload validity, download availability, or print eligibility.
- Preview content and Viewpoint never outlive their Preview session.

## Success Criteria

### Measurable Outcomes

- **SC-001**: One hundred percent of tested scan-details openings issue zero preview-content retrievals before `ACT-SCAN-PREVIEW` is activated.
- **SC-002**: All three supplied sample scans and one representative of each accepted PLY encoding reach `SCAN-PREVIEW-READY`, display one complete mesh, and support every ready-state interaction.
- **SC-003**: Each supplied sample scan becomes interactive within three seconds after its content retrieval completes on the reference review workstation and a supported current browser.
- **SC-004**: One hundred percent of tested scans with display colors preserve those colors, and one hundred percent of tested scans without display colors remain fully perceivable with the neutral treatment.
- **SC-005**: Pointer and touch gestures plus all five visible controls rotate, zoom, or reset the mesh as labelled in both the desktop and compact layouts without dismissing the overlay.
- **SC-006**: One hundred percent of tested retrieval, malformed-content, unavailable-rendering, and temporary-resource failures preserve metadata, reveal no protected detail, and perform zero further retrievals until Retry is explicitly activated.
- **SC-007**: One hundred percent of tested close operations during idle, preparing, ready, and unavailable states return a later opening to `SCAN-PREVIEW-IDLE` with no retained scan content or Viewpoint.
- **SC-008**: English and French review finds every preview state and action localized, keyboard reachable, visibly focused, programmatically named, and announced where asynchronous feedback changes.
- **SC-009**: Existing scan upload, download, metadata consultation, print-request creation, patient navigation, and private-retention acceptance tests pass without changed outcomes.
- **SC-010**: Protected-data review finds zero scan bytes, original filenames, public or storage-provider URLs, storage identifiers, or protected-resource existence signals in persistent browser state, logs, tests, designs, screenshots, and committed evidence.

## Non-Goals

- Clinical interpretation, diagnosis, regulatory claims, or medical-device behavior.
- Measurement, annotation, cutting planes, mesh editing, repair, transformation, or export.
- Comparing scans or saving, sharing, or restoring a Viewpoint.
- Thumbnail generation, preview persistence, offline preview, or background preloading.
- Public or pre-signed storage URLs.
- Server-side rendering, mesh conversion, reduced copies, or alternate preview formats.
- Changing scan upload limits, accepted encodings, validation, download, printing, ownership, or retention.
- Adding another application, service, worker, queue, or persisted entity.

## Assumptions

- Preview is a verification aid for the user who uploaded or selected the scan, not a source of clinical truth.
- Users may have normal network latency; SC-003 measures preparation after retrieval so it does not claim control over transfer time.
- A current browser without the required graphics capability receives `SCAN-PREVIEW-UNAVAILABLE`; the product does not promise a second rendering mode.
- The supplied samples remain local protected evidence and are sufficient for the bounded manual review alongside synthetic encoding representatives.
- Figma will define the accepted desktop and compact composition after this specification is merged, using the stable identifiers defined here.

## Repository Specification Constraints

- Follow the language, requirement identifiers, and acceptance binding selected by repository guidance.
- Preserve authoritative technical tokens exactly as required by the repository.
- Keep the specification free of implementation choices and external task state.
- Record acceptance only through the immutable repository mechanism selected by its guidance.
