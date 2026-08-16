# Feature Specification: Scan Upload Preview

**Feature Branch**: `docs/scan-upload-preview-spec`

**Created**: 2026-08-16

**Status**: Accepted

**Input**: Let an authenticated orthoprosthetist inspect the exact local PLY scan selected for upload, keep the existing preview layout stable while it prepares, and use clear French encoding terminology.

## Authority And Scope

- This feature follows the delivered Orthoprosthetist Printing Workflow and Interactive Scan Preview specifications.
- The delivered specifications remain historical authority for patient ownership, accepted PLY encodings, upload limits, private scan handling, existing scan consultation, download, and printing.
- This feature adds a temporary local preview to the existing scan-upload review step and corrects two presentation defects in the delivered scan preview.
- The three supplied sample scans remain local acceptance evidence only. Their names, contents, and personal metadata are not reproduced in committed or design evidence.
- Once explicitly accepted, this specification owns the new pre-upload preview behavior. Figma may compose that behavior visually without adding or removing it.

## User Scenarios & Testing

### User Story 1 - Inspect A Selected Scan Before Upload (Priority: P1)

An authenticated orthoprosthetist selects a local PLY scan, inspects the exact selected file interactively, and then decides whether to submit, replace, or remove it.

**Why this priority**: Visual review before submission helps the user catch an incorrect file without creating a patient scan that must be revisited later.

**Independent Test**: Select one supported local PLY file, verify that no upload begins, rotate, zoom, and reset its preview, then explicitly submit the same selected file.

**Acceptance Scenarios**:

1. **Given** the scan-upload overlay is open with no file selected, **When** the user selects a file that passes the existing local type and size checks, **Then** preparation of a local preview begins without sending the file or making a scan request.
2. **Given** a selected file produces a ready preview, **When** the user rotates, zooms, or resets it, **Then** the complete selected mesh remains available for review and the file is not submitted.
3. **Given** a selected file and its preview are visible, **When** the user explicitly confirms the existing upload action, **Then** the unmodified selected file is submitted once through the existing upload workflow.
4. **Given** a selected file is visible, **When** the user replaces it, **Then** only the replacement remains selected and one new local preview attempt begins for that replacement.
5. **Given** a selected file is visible, **When** the user removes it, **Then** its preview and temporary content disappear and the upload returns to its initial empty state.

---

### User Story 2 - Keep Preview Controls Stable During Preparation (Priority: P2)

An authenticated orthoprosthetist sees the complete preview layout immediately, without the control bar appearing later and shifting the overlay.

**Why this priority**: A stable first render makes both existing-scan and pre-upload preview feel intentional and prevents controls from unexpectedly moving surrounding content.

**Independent Test**: Open an existing scan and select a local upload file while preparation is deliberately delayed; in both flows, verify that the viewport and all five disabled controls are present from the first rendered state and become enabled in place.

**Acceptance Scenarios**:

1. **Given** an existing scan is opened, **When** its preview code or content is still preparing, **Then** the viewport and five icon controls are rendered together and the controls are unavailable.
2. **Given** a selected upload file is preparing locally, **When** the preview becomes ready, **Then** the same five controls become available without changing the preview area's occupied space.
3. **Given** either preview is ready, **When** the user operates it through pointer, touch, keyboard, or icon controls, **Then** its established rotation, zoom, and reset behavior remains available.

---

### User Story 3 - Recover Without Losing The Upload Choice (Priority: P3)

An authenticated orthoprosthetist receives concise feedback when a selected file cannot be previewed and can still replace, remove, or deliberately upload the selected file under the existing validation rules.

**Why this priority**: Local graphics availability is a review aid, not the authority for upload validity, so a preview limitation must not invent a new file-acceptance rule.

**Independent Test**: Select a locally valid file while preview rendering is unavailable; verify safe feedback, no automatic request, continued access to replace and remove, and one deliberate upload only when the user confirms.

**Acceptance Scenarios**:

1. **Given** a selected file cannot produce a local preview, **When** the unavailable state is shown, **Then** the file summary and existing upload actions remain available with localized non-technical feedback.
2. **Given** local preview is unavailable, **When** the user does not confirm upload, **Then** no scan request occurs.
3. **Given** local preview is unavailable but the file passes the existing local checks, **When** the user explicitly confirms upload, **Then** the server remains the authority that accepts or rejects the file.
4. **Given** any local preview state, **When** the overlay closes, **Then** the selected file, temporary content, viewpoint, and preview resources are discarded.

### Edge Cases

- A selected file fails the existing extension or size checks before preview preparation.
- A structurally invalid file passes the simple local checks but cannot produce a preview.
- A valid scan has no display colors.
- A valid scan uses any one of the existing accepted PLY encodings.
- The browser cannot provide the graphics capability or temporary resources required for preview.
- The user replaces or removes a file while preview preparation is in progress.
- The user closes the overlay while preview preparation is in progress.
- The user selects the same file again after removing it.
- The user switches between pointer, touch, and keyboard interaction.

## Stable Interaction Index

### Contexts

| ID | Meaning | Observable boundary |
| --- | --- | --- |
| `SCAN-UPLOAD-EMPTY` | Existing upload overlay before selection | Shows the existing file chooser and no preview. |
| `SCAN-UPLOAD-SELECTED` | One local file selected for review | Shows the file summary, preview state, and existing upload decision. |

### Actions

| ID | Label | Availability |
| --- | --- | --- |
| `ACT-SCAN-UPLOAD-CHOOSE` | Choose PLY file | Available in the empty state and when replacing a selection. |
| `ACT-SCAN-UPLOAD-REMOVE` | Remove selected file | Available while a file is selected. |
| `ACT-SCAN-UPLOAD-SUBMIT` | Add scan | Available according to the existing upload validation and pending rules. |
| `ACT-UPLOAD-PREVIEW-ROTATE-LEFT` | Rotate left | Visible but unavailable during preparation; available when the local preview is ready. |
| `ACT-UPLOAD-PREVIEW-ROTATE-RIGHT` | Rotate right | Visible but unavailable during preparation; available when the local preview is ready. |
| `ACT-UPLOAD-PREVIEW-ZOOM-IN` | Zoom in | Visible but unavailable during preparation; available when the local preview is ready. |
| `ACT-UPLOAD-PREVIEW-ZOOM-OUT` | Zoom out | Visible but unavailable during preparation; available when the local preview is ready. |
| `ACT-UPLOAD-PREVIEW-RESET` | Reset view | Visible but unavailable during preparation; available when the local preview is ready. |

### Preview States

| ID | Meaning | Observable requirement |
| --- | --- | --- |
| `SCAN-UPLOAD-PREVIEW-PREPARING` | The selected file is being prepared locally | Progress is announced; the viewport and five unavailable controls are already present. |
| `SCAN-UPLOAD-PREVIEW-READY` | The selected mesh is interactive | The viewport, gestures, and all five icon controls are available. |
| `SCAN-UPLOAD-PREVIEW-UNAVAILABLE` | The selected file cannot be displayed locally | File summary and upload decisions remain available with safe feedback. |

## Requirements

### Functional Requirements

- **FR-001**: Selecting a file that passes the existing local extension and size checks MUST automatically begin exactly one local preview attempt for that selection and MUST NOT make a patient, scan, storage, or upload request.
- **FR-002**: The local preview MUST represent the exact selected file without transforming, replacing, persisting, or submitting it before `ACT-SCAN-UPLOAD-SUBMIT` is explicitly activated.
- **FR-003**: Every structurally valid, non-empty PLY scan accepted by the existing scan rules MUST be eligible for local preview, including ASCII, binary little-endian, and binary big-endian content up to the existing 25 MiB limit.
- **FR-004**: `SCAN-UPLOAD-PREVIEW-PREPARING` MUST announce localized progress and MUST render the preview viewport plus all five icon controls together; the controls MUST remain unavailable until the preview becomes ready.
- **FR-005**: `SCAN-UPLOAD-PREVIEW-READY` MUST present one centered, fitted mesh, preserve display colors when present, use one neutral non-diagnostic treatment when absent, and support rotation, zoom, and reset through pointer, touch, keyboard, and all five icon controls.
- **FR-006**: The five icon controls MUST occupy the same one-row control area from preparation through readiness in desktop and compact layouts and MUST become available without moving or resizing that area.
- **FR-007**: Replacing a selected file MUST discard the previous local preview and begin exactly one attempt for only the replacement; removing the file MUST return to `SCAN-UPLOAD-EMPTY`.
- **FR-008**: Preview failure, malformed or empty content, unavailable graphics capability, and insufficient temporary resources MUST produce `SCAN-UPLOAD-PREVIEW-UNAVAILABLE` with localized non-technical feedback and MUST preserve the selected file summary plus the existing replace, remove, and eligible submit actions.
- **FR-009**: Local preview availability MUST NOT replace or weaken existing client checks or server validation. A locally valid selected file MAY still be submitted explicitly when preview is unavailable, and the server MUST remain the authority that accepts or rejects it.
- **FR-010**: Closing the upload overlay, replacing or removing the file, or completing an upload MUST discard the affected temporary file content, viewpoint, and preview session; no local preview content MAY persist in browser storage or application logs.
- **FR-011**: Existing-scan preview preparation MUST render its viewport and five unavailable icon controls together from the first rendered state, then enable those same controls in place when ready without changing retrieval, retry, metadata, download, print, or close behavior.
- **FR-012**: French scan encoding values MUST be presented as `Binaire (little-endian)` and `Binaire (big-endian)` while the corresponding PLY technical values and English copy remain unchanged.
- **FR-013**: The upload preview states and actions MUST support English and French, keyboard navigation, visible focus, accessible names, announced asynchronous feedback, and usable desktop and compact layouts; pointer and touch interaction with the preview MUST NOT accidentally close the overlay.
- **FR-014**: Local preview MUST NOT create a public or storage-provider URL, expose original filenames beyond the existing local file summary, place selected content in tests, screenshots, designs, or committed evidence, or change patient, scan, download, printing, ownership, retention, API, database, storage, or deployment behavior.

### Key Entities

- **Selected upload file**: The one local PLY file currently chosen in the existing upload overlay. It is temporary and is submitted only after explicit confirmation.
- **Local preview session**: One temporary visual review of one selected upload file, beginning after selection passes existing local checks and ending when the selection changes, disappears, uploads, or the overlay closes.
- **Viewpoint**: The temporary orientation and zoom used during one local preview session. Reset restores its initial fitted state; ending the session discards it.

### Entity Relationships And Invariants

- One Local preview session belongs to exactly one Selected upload file.
- At most one local preview attempt is active for the current selection.
- The file represented by the Local preview session is the same unmodified selection offered to the existing explicit upload action.
- Preview readiness never determines server-side upload validity.
- Selected file content and Viewpoint never outlive their upload overlay session.

## Success Criteria

### Measurable Outcomes

- **SC-001**: One hundred percent of tested locally valid file selections begin exactly one preview attempt and perform zero network requests before explicit upload confirmation.
- **SC-002**: All three supplied sample scans and one representative of each accepted PLY encoding reach `SCAN-UPLOAD-PREVIEW-READY`, display one complete mesh, and support every ready-state interaction.
- **SC-003**: Each supplied sample becomes interactive within three seconds after its local bytes become available on the reference review workstation and a supported current browser.
- **SC-004**: The viewport and five-control area's measured position and dimensions remain unchanged between the first preparing render and the ready state in both existing-scan and upload-preview flows at desktop and compact review sizes.
- **SC-005**: Pointer and touch gestures plus all five icon controls rotate, zoom, or reset the selected mesh according to their accessible names, remain on one row, and do not dismiss the upload overlay.
- **SC-006**: One hundred percent of tested replacement, removal, close, successful-upload, malformed-content, and unavailable-rendering cases retain no superseded local preview session, selected bytes, or Viewpoint.
- **SC-007**: One hundred percent of tested preview failures send no automatic request, preserve the eligible upload decision, reveal no protected or technical detail, and allow the user to replace or remove the selection.
- **SC-008**: English and French review finds every upload-preview state and action localized, keyboard reachable, visibly focused, programmatically named, and announced where asynchronous feedback changes.
- **SC-009**: French review finds zero occurrences of `petit-boutiste` or `gros-boutiste`; the two binary encodings remain distinguishable with the approved technical wording.
- **SC-010**: Existing scan upload, existing-scan preview, download, metadata consultation, print-request creation, patient navigation, ownership, private-retention, and server-validation acceptance tests pass without changed outcomes.
- **SC-011**: Protected-data review finds zero selected scan bytes, supplied sample names, public or storage-provider URLs, storage identifiers, or protected content in persistent browser state, logs, tests, designs, screenshots, and committed evidence.

## Non-Goals

- Automatic upload immediately after file selection.
- Making local preview success a new upload-validity rule.
- Clinical interpretation, diagnosis, regulatory claims, or medical-device behavior.
- Measurement, annotation, cutting planes, mesh editing, repair, transformation, or export.
- Comparing scans or saving, sharing, or restoring a Viewpoint.
- Thumbnail generation, preview persistence, offline preview, or background preloading.
- Public or pre-signed storage URLs.
- Server-side rendering, mesh conversion, reduced copies, or alternate preview formats.
- Changing upload limits, accepted encodings, server validation, patient data, storage, download, printing, ownership, retention, deployment, or migrations.

## Assumptions

- Local preview is a verification aid, not a source of clinical truth and not the authority for file validity.
- A current browser without the required graphics capability receives `SCAN-UPLOAD-PREVIEW-UNAVAILABLE`; the user may still submit a locally eligible file for authoritative server validation.
- The existing explicit upload confirmation remains the only action that sends the selected file.
- The supplied samples remain local protected evidence and are sufficient for bounded manual review alongside synthetic encoding representatives.
- Figma will define the accepted desktop and compact upload composition after this specification is merged, using the stable identifiers defined here.

## Repository Specification Constraints

- Follow the language, requirement identifiers, and acceptance binding selected by repository guidance.
- Preserve authoritative technical tokens exactly as required by the repository.
- Keep the specification free of implementation choices and external task state.
- Record acceptance only through the immutable repository mechanism selected by its guidance.
