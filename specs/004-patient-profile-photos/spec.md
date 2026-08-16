# Feature Specification: Patient Profile Photos

**Feature Branch**: `docs/patient-profile-photos-spec`

**Created**: 2026-08-16

**Status**: Accepted

**Input**: Let an authenticated orthoprosthetist create and update an owned patient profile with an optional private photo, review a selected photo before submission, and recognize patients consistently through their photo or an accessible initials fallback.

## Authority And Scope

- This feature extends the delivered Orthoprosthetist Printing Workflow specification at commit `2dd91218cf0d9114fd440efbfbd9843987c9036c`.
- The earlier specification remains authoritative for authentication, patient ownership, patient field validation, directory pagination, patient workspace navigation, scans, printing, localization, and safe error behavior except where this feature deliberately replaces its patient-editing non-goal.
- Patient deletion remains excluded. This feature allows only creation and owner-scoped updates to first name, last name, age, and one optional patient photo.
- A patient photo is a private recognition aid. It is not clinical evidence and must never be the only way to identify or open a patient.
- Once explicitly accepted, this specification owns the observable patient-photo and patient-editing behavior. Figma may compose that behavior visually without adding or removing it.

## User Scenarios & Testing

### User Story 1 - Create A Patient With An Optional Photo (Priority: P1)

An authenticated orthoprosthetist can create a patient exactly as today or select and review one optional photo before submitting the patient.

**Why this priority**: Creation must remain quick for every patient while allowing the user to confirm the optional identity photo before private content is sent.

**Independent Test**: Create one patient without a photo, then create another after selecting, reviewing, replacing, and confirming a supported photo; verify that neither selection sends data before the existing Create patient action is submitted.

**Acceptance Scenarios**:

1. **Given** the patient-creation flow is open, **When** the user submits valid first name, last name, and age without selecting a photo, **Then** one patient is created and its workspace opens exactly as before.
2. **Given** a supported photo is selected, **When** the local review becomes available, **Then** the user can see the exact selected image, its safe file summary, and actions to replace or remove it before submission.
3. **Given** a selected photo is being reviewed, **When** the user replaces it, **Then** only the replacement remains selected and reviewable.
4. **Given** a selected photo is being reviewed, **When** the user removes it, **Then** creation returns to the no-photo state without clearing valid patient fields.
5. **Given** valid patient fields and an eligible selected photo, **When** the user submits creation, **Then** one patient and its photo are confirmed together and the new workspace shows that photo.
6. **Given** a selected file has an unsupported format, exceeds 5 MiB, or cannot be decoded as its declared format, **When** it is reviewed, **Then** a localized file-specific correction is shown and the patient cannot be submitted with that file.

---

### User Story 2 - Update An Owned Patient (Priority: P1)

An authenticated orthoprosthetist can open an edit flow from an owned patient workspace, update identity fields, and keep, replace, add, or remove the patient's photo.

**Why this priority**: Patient details change and mistakes happen. The user needs one clear way to keep the record recognizable and accurate without recreating it.

**Independent Test**: Open one owned patient, change each editable identity field, keep the current photo, then separately add, replace, and remove a photo; verify each successful update in both the workspace and directory.

**Acceptance Scenarios**:

1. **Given** an owned patient workspace is open, **When** the user activates Edit patient, **Then** the current first name, last name, age, and photo state are available in an accessible desktop dialog or compact bottom drawer.
2. **Given** valid changed identity fields, **When** the user saves without changing the photo, **Then** the updated values are shown and the existing photo remains unchanged.
3. **Given** a patient without a photo, **When** the user selects, reviews, and saves an eligible photo, **Then** the patient displays that photo after the update succeeds.
4. **Given** a patient with a photo, **When** the user selects, reviews, and saves a replacement, **Then** only the replacement is displayed after the update succeeds.
5. **Given** a patient with a photo, **When** the user removes it and saves, **Then** the patient uses the initials fallback after the update succeeds.
6. **Given** the edit flow contains no effective change, **When** it is reviewed, **Then** saving is unavailable and no update is sent.
7. **Given** an update is pending, **When** the user repeats the save interaction, **Then** no duplicate or parallel update is created.
8. **Given** the user cancels editing or closes the edit flow, **When** it ends, **Then** no patient value or photo changes and temporary photo content is discarded.

---

### User Story 3 - Recognize Patients Consistently (Priority: P2)

An authenticated orthoprosthetist can recognize an owned patient by the same photo or initials fallback in the patient directory and patient workspace while the full name remains available.

**Why this priority**: A consistent visual identity speeds recognition, but names must remain the authoritative and accessible identification.

**Independent Test**: Review patients with a photo, without a photo, and with unavailable photo content in the directory and workspace; verify consistent identity, full-name access, and row navigation.

**Acceptance Scenarios**:

1. **Given** an owned patient has an available photo, **When** the patient appears in the directory or workspace, **Then** the same current photo is shown with the full patient name still visible and programmatically available.
2. **Given** an owned patient has no photo, **When** the patient appears in the directory or workspace, **Then** localized accessible initials derived from the current first and last names are shown without changing the full name, age, added date, or opening action.
3. **Given** private photo content is temporarily unavailable or cannot be rendered, **When** patient identity is displayed, **Then** the initials fallback is used without exposing storage or failure details and the rest of the patient workflow remains available.
4. **Given** a successful identity or photo update, **When** the user returns to the patient directory, **Then** the updated identity is shown without creating a second patient or changing its added date.

---

### User Story 4 - Recover Without Partial Or Exposed Changes (Priority: P2)

An authenticated orthoprosthetist receives safe feedback when creation, editing, or private-photo handling fails and can retry without exposing or partially applying protected information.

**Why this priority**: Patient identity and private content must remain consistent even when storage or network operations fail.

**Independent Test**: Induce validation, unavailable-storage, failed-update, foreign-patient, and missing-photo outcomes; verify safe feedback, retained confirmed data, deliberate recovery, and no protected existence signal.

**Acceptance Scenarios**:

1. **Given** patient creation with a photo cannot be completed, **When** failure is presented, **Then** no patient is presented as created, the entered form state remains available for deliberate retry, and no submitted photo becomes accessible.
2. **Given** an existing patient update cannot be completed, **When** failure is presented, **Then** the previously confirmed identity and photo remain authoritative and the edited form state remains available for correction or deliberate retry.
3. **Given** a photo replacement or removal succeeds, **When** the former photo is requested later, **Then** it is no longer accessible through the product.
4. **Given** a patient or photo is unknown or owned by another account, **When** it is requested or changed, **Then** no patient data, photo content, or distinguishable existence signal is disclosed.

### Edge Cases

- A selected file has a supported extension but its content is not a decodable image of the declared format.
- A supported image is exactly 5 MiB or exceeds the limit by one byte.
- A photo is unusually wide, tall, small, or contains transparency.
- A user replaces or removes a selected photo while local review is still preparing.
- A user closes the create or edit flow while photo review or submission is pending.
- A patient's names contain meaningful Unicode characters, combining characters, or leading and trailing whitespace.
- A patient update changes the names used to derive initials while no photo is present.
- Previously confirmed photo content becomes unavailable after patient metadata has loaded.
- The patient directory page containing an updated patient is not currently displayed.
- Network or private-storage availability changes between photo selection and submission.

## Stable Interaction Index

### Destinations And Contexts

| ID | Meaning | Observable boundary |
| --- | --- | --- |
| `DST-PATIENTS` | Existing owned patient directory | Continues to provide patient creation, pagination, and row opening while adding the current photo or initials identity. |
| `DST-PATIENT-WORKSPACE` | Existing owned patient workspace | Continues to own scans and print requests while exposing the current patient identity and edit action. |
| `PATIENT-CREATE` | Existing patient-creation flow | Adds one optional local photo-selection and review region without making photo mandatory. |
| `PATIENT-EDIT` | Owner-scoped patient-edit flow | Presents current editable identity fields and exactly one current photo state. |

### Actions

| ID | Label | Availability |
| --- | --- | --- |
| `ACT-PATIENT-CREATE` | Create patient | Existing action; submits valid identity fields with or without one eligible selected photo. |
| `ACT-PATIENT-EDIT` | Edit patient | Available from an owned patient workspace. |
| `ACT-PATIENT-SAVE` | Save changes | Available only when the edit flow has at least one valid effective change and no submission is pending. |
| `ACT-PATIENT-PHOTO-CHOOSE` | Choose photo | Available in create and edit flows when adding or replacing a photo. |
| `ACT-PATIENT-PHOTO-REMOVE` | Remove photo | Available for a selected local photo and for an existing patient photo during editing. |
| `ACT-PATIENT-FORM-CANCEL` | Cancel | Ends create or edit without submitting changes. |

### Photo States

| ID | Meaning | Observable requirement |
| --- | --- | --- |
| `PATIENT-PHOTO-EMPTY` | No current or selected photo | Shows the accessible initials fallback and permits choosing a photo. |
| `PATIENT-PHOTO-PREPARING` | A local selection is being decoded for review | Announces progress, keeps patient fields available, and sends no request. |
| `PATIENT-PHOTO-SELECTED` | One eligible local photo is ready for review | Shows the exact selection and permits replacement or removal before submission. |
| `PATIENT-PHOTO-INVALID` | The local selection is not eligible | Shows a localized file-specific correction and prevents submission with that file. |
| `PATIENT-PHOTO-EXISTING` | The patient has a confirmed private photo | Shows the current photo during editing and permits replacement or removal. |
| `PATIENT-PHOTO-FALLBACK` | Confirmed photo content is absent or unavailable | Shows accessible initials without exposing the reason or storage details. |

## Requirements

### Functional Requirements

- **FR-001**: `PATIENT-CREATE` MUST continue to accept the existing valid first name, last name, and age without a photo and MUST allow no more than one optional photo selection.
- **FR-002**: `ACT-PATIENT-PHOTO-CHOOSE` MUST accept JPEG, PNG, and WebP images up to 5 MiB inclusive; unsupported, oversized, empty, or undecodable selections MUST enter `PATIENT-PHOTO-INVALID` with a localized file-specific correction.
- **FR-003**: An eligible photo selection MUST enter `PATIENT-PHOTO-PREPARING` and then `PATIENT-PHOTO-SELECTED`, showing the exact local selection and a safe file summary without making a patient, photo, storage, or submission request.
- **FR-004**: Replacing a local photo selection MUST discard the previous selection and review; removing it MUST return to the preceding no-photo or existing-photo state without clearing valid patient fields.
- **FR-005**: `ACT-PATIENT-CREATE` MUST create exactly one owned patient with the valid selected photo or no photo, prevent duplicate submission while pending, and open the created patient's workspace after success.
- **FR-006**: `DST-PATIENT-WORKSPACE` MUST expose `ACT-PATIENT-EDIT` for its owned patient without changing the existing scan and print-request destinations or their default selection.
- **FR-007**: `PATIENT-EDIT` MUST present the current first name, last name, integer age, and photo state and MUST allow the user to change first name, last name, and age under the existing validation rules while keeping, adding, replacing, or removing one photo.
- **FR-008**: `ACT-PATIENT-SAVE` MUST remain unavailable when the edit flow has no effective change or contains an invalid field or photo and MUST prevent parallel submissions while an update is pending.
- **FR-009**: A successful save MUST apply the validated identity and photo decision as one confirmed patient update, preserve the patient's identity and added date, and make the current values visible in the workspace and directory.
- **FR-010**: Canceling or closing create or edit MUST submit no change and MUST discard unsubmitted local photo content and review state.
- **FR-011**: A patient with an available photo MUST show the same current photo in `DST-PATIENTS` and `DST-PATIENT-WORKSPACE`; a patient without renderable photo content MUST show `PATIENT-PHOTO-FALLBACK` derived from the current first and last names.
- **FR-012**: Photo and initials presentation MUST keep the patient's full name visible and programmatically available, MUST not become a separate patient-opening action, and MUST preserve existing row pointer and keyboard activation.
- **FR-013**: Initials MUST be derived from the first user-perceived character of the trimmed first and last names, preserve meaningful Unicode characters, and update when either name changes.
- **FR-014**: Creation with a photo and updates to identity or photo MUST either complete as one confirmed result or retain the previously confirmed state; a failed operation MUST NOT present a partial patient, partial field update, or inaccessible new photo as successful.
- **FR-015**: Successful photo replacement or removal MUST make the former photo inaccessible through the product, without changing the patient, its scans, its print requests, or its added date.
- **FR-016**: Every patient and photo create, read, update, replace, and remove operation MUST remain authenticated and owner-scoped; unknown and foreign-owned resources MUST reveal neither protected content nor distinguishable existence information.
- **FR-017**: Patient photo content MUST be delivered only within the authenticated ownership boundary and MUST NOT expose a public or pre-signed object URL, storage key, original filename, provider detail, or protected content through errors or logs.
- **FR-018**: Patient photo selection, validation, review, fallback, create, edit, pending, error, and success behavior MUST support English and French, keyboard navigation, visible focus, accessible names, announced asynchronous feedback, and usable desktop and compact layouts.
- **FR-019**: Existing patient pagination, opening, age and name validation, scan upload and preview, scan download, print-request creation and tracking, authentication, localization, ownership, and retention behavior MUST remain unchanged except for the patient identity and edit capabilities defined here.

### Key Entities

- **Patient**: The existing owned clinical record with first name, last name, integer age, added date, scans, and print requests. This feature adds one optional current photo and owner-scoped editing of its identity fields.
- **Patient photo**: The optional current private recognition image for one Patient. It has no independent product destination, public address, history, or clinical meaning.
- **Local photo selection**: One temporary image chosen for creation or editing and reviewed before submission. It is not a confirmed Patient photo until the owning patient operation succeeds.
- **Patient identity presentation**: The full patient name combined with the current photo or derived initials fallback in the directory and workspace.

### Entity Relationships And Invariants

- One Patient belongs to exactly one authenticated Account and has zero or one current Patient photo.
- One Patient photo belongs to exactly one Patient and inherits that Patient's ownership boundary.
- One create or edit flow has at most one Local photo selection, and that selection never outlives the flow.
- Patient identity presentation always includes the full name and exactly one photo-or-initials treatment.
- Replacing or removing a Patient photo creates no user-visible gallery, history, or second current photo.
- Patient updates never change ownership, added date, scans, print requests, or the identity of the Patient record.

## Success Criteria

### Measurable Outcomes

- **SC-001**: One hundred percent of tested patient creations without a photo complete with the same required fields, single-submit behavior, and direct workspace transition as the delivered flow.
- **SC-002**: One hundred percent of tested JPEG, PNG, and WebP selections at or below 5 MiB can be reviewed before submission, while unsupported, oversized, empty, and undecodable files produce a localized correction and zero photo submissions.
- **SC-003**: One hundred percent of tested photo selections, replacements, and removals send zero patient or photo requests before Create patient or Save changes is explicitly activated.
- **SC-004**: A user can update any combination of first name, last name, age, and photo decision in one edit flow in under two minutes, including local photo review.
- **SC-005**: One hundred percent of successful create and edit cases show one consistent current identity in the patient workspace and directory without changing the patient's added date, scans, or print requests.
- **SC-006**: One hundred percent of patients without renderable photo content show initials derived from their current names while the full name remains visible and programmatically available in desktop and compact layouts.
- **SC-007**: One hundred percent of tested cancel, close, replacement, removal, failed-create, and failed-update paths retain no unsubmitted local photo content after the flow ends and never present partial changes as successful.
- **SC-008**: One hundred percent of tested former photos are inaccessible through the product after a successful replacement or removal, while the current patient remains available.
- **SC-009**: Owner and protected-data review finds zero foreign photo disclosures, distinguishable foreign-patient signals, public or pre-signed object URLs, storage keys, original filenames, provider details, photo bytes in logs, or protected content in committed evidence.
- **SC-010**: English and French review finds every new state and action localized, keyboard reachable, visibly focused, programmatically named, and announced where asynchronous feedback changes.
- **SC-011**: Existing patient creation, pagination, row opening, scan upload and preview, scan download, printing, authentication, localization, ownership, and retention acceptance tests pass without changed outcomes beyond the explicitly added patient identity and editing behavior.

## Non-Goals

- Patient deletion, merging, archiving, or transfer between accounts.
- More than one current photo, photo galleries, photo history, or restoring a replaced photo.
- Photo cropping, rotation, filters, annotations, editing, or automatic enhancement.
- Webcam, camera capture, drag-and-drop-only interaction, or remote photo import.
- Using photos for biometric identification, authentication, diagnosis, clinical interpretation, or regulatory claims.
- Making a photo mandatory or replacing the visible patient full name with visual identity alone.
- Public, pre-signed, or storage-provider photo URLs.
- Changing age to date of birth or adding other patient fields.
- Changing scan, printing, authentication, deployment, or patient-deletion behavior.

## Assumptions

- JPEG, PNG, and WebP cover the common still-image formats needed for this bounded workflow; animated and multi-image behavior is not promised.
- A 5 MiB inclusive limit allows a practical patient photo while keeping selection and submission bounded.
- Photo aspect ratio does not affect eligibility; Figma will define a consistent visual crop without modifying or editing the stored selection.
- The existing first-name, last-name, and age validation remains authoritative for both creation and editing.
- The existing added date represents patient creation and therefore does not change after editing.
- Figma will define desktop and compact create, edit, review, fallback, pending, validation, and safe-error composition after this specification is merged, using the stable identifiers defined here.

## Repository Specification Constraints

- Follow the language, requirement identifiers, and acceptance binding selected by repository guidance.
- Preserve authoritative technical tokens exactly as required by the repository.
- Keep the specification free of implementation choices and external task state.
- Record acceptance only through the immutable repository mechanism selected by its guidance.
