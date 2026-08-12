# Feature Specification: Orthoprosthetist Printing Workflow

**Feature Branch**: `docs/product-specification`

**Created**: 2026-08-11

**Last clarified**: 2026-08-12

**Status**: Accepted

**Input**: Define the observable MVP experience for orthoprosthetists who manage patients, handle 3D scans, and request socket printing through the supplied printing center.

## Authority And Scope

- The supplied product brief owns the non-negotiable product scope, required stack, delivery constraints, and assessment criteria.
- The supplied printing center contract owns provider capabilities and constraints. Provider credentials, contact details, and operational addresses are protected data and are not reproduced here.
- The three supplied sample scans provide acceptance evidence only. Their names, contents, and personal metadata are not reproduced here.
- Once explicitly accepted, this specification owns the future observable product behavior and terminology.
- Figma owns visual composition after acceptance. It may choose components, density, responsive composition, and layout, but may not add or remove behavior defined here.
- A future technical plan may translate this specification into architecture. Except for the mandated React frontend and NestJS backend, this document does not select implementation technologies.

## Source Requirement Matrix

| ID     | Safe source requirement                                                                                        | Product or delivery binding           | Acceptance binding |
| ------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------ |
| SR-001 | Provide an application for orthoprosthetists to manage patients and request and follow 3D printing of sockets. | US2, US3, US4; FR-011, FR-014, FR-031 | SC-001             |
| SR-002 | Use React for the frontend and NestJS for the backend.                                                         | DC-001                                | SC-013             |
| SR-003 | Allow a user to create an account and sign in.                                                                 | US1; FR-001–FR-009                    | SC-002             |
| SR-004 | Allow an authenticated account to create and list only its own patients, with first name, last name, and age.  | US2; FR-015–FR-021                    | SC-003, SC-011     |
| SR-005 | Allow an authenticated account to upload and download patient 3D scans.                                        | US3; FR-022–FR-030                    | SC-004, SC-009     |
| SR-006 | Allow an eligible uploaded scan to be submitted for printing and eventually reach a successful outcome.        | US4; FR-031–FR-040                    | SC-005, SC-007     |
| SR-007 | List a patient's print requests with their references, associated scans, statuses, and progress.               | US4; FR-041–FR-044                    | SC-006, SC-007     |
| SR-008 | Handle validation, errors, and printing center unavailability deliberately.                                    | US1–US4; FR-047–FR-052                | SC-008, SC-010     |
| SR-009 | Document setup, execution, choices, and trade-offs for reviewers.                                              | DC-002                                | SC-014             |
| SR-010 | Maintain a meaningful Git history suitable for review.                                                         | DC-003                                | SC-014             |
| SR-011 | Present clear architecture and code organization.                                                              | DC-004                                | SC-013             |
| SR-012 | Disclose and explain AI-assisted work in the delivery documentation.                                           | DC-005                                | SC-014             |
| SR-013 | Authenticate all printing center operations without exposing provider credentials.                             | FR-049; DC-006                        | SC-011, SC-014     |
| SR-014 | Submit a scan with a generated unique reference of at most 15 characters.                                      | US4; FR-032–FR-034                    | SC-005             |
| SR-015 | Represent the printing center's concurrent-capacity rejection as a recoverable product state.                  | US4-AS5; FR-039, FR-048               | SC-008             |
| SR-016 | Derive a clear lifecycle from the provider's pending, scheduled, successful, and failed job information.       | US4; FR-035–FR-038, FR-042–FR-044     | SC-006, SC-007     |
| SR-017 | Reconcile printing jobs by stable identifiers and reference without blindly repeating an ambiguous submission. | US4-AS3; FR-034, FR-040               | SC-005             |
| SR-018 | Accept all three supplied sample scans while enforcing a safe bounded PLY profile.                             | US3-AS3; FR-024–FR-027                | SC-009             |

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Establish An Authenticated Session (Priority: P1)

An orthoprosthetist creates an account or signs in, chooses the interface language, and reaches the requested authorized destination. The session can be restored or ended without exposing credentials or patient information.

**Why this priority**: Every patient, scan, and printing action depends on a secure account boundary.

**Independent Test**: Starting with no session, create an account or sign in, reload the application to restore the session, change language, and sign out. This delivers a complete authenticated entry and exit flow without requiring patient data.

**Acceptance Scenarios**:

1. **US1-AS1** — **Given** no session and a new email address, **When** the user submits matching valid passwords, **Then** the account is created, an authenticated session starts, and the patient directory opens.
2. **US1-AS2** — **Given** no session and an existing account, **When** the user submits valid credentials, **Then** an authenticated session starts and the previously requested authorized destination opens, or the patient directory opens when none was requested.
3. **US1-AS3** — **Given** an email address that differs from an existing account only by letter case, **When** account creation is submitted, **Then** creation is rejected as an existing account without creating a duplicate.
4. **US1-AS4** — **Given** invalid fields or nonmatching password confirmation, **When** account creation is submitted, **Then** each actionable validation issue is associated with its field and focus moves to the first invalid field.
5. **US1-AS5** — **Given** invalid credentials, temporary rate limitation, or no network, **When** sign-in fails, **Then** a localized, accessible, actionable state is shown without revealing whether an account exists.
6. **US1-AS6** — **Given** a valid persisted session, **When** the application starts, **Then** a restoration state is shown until the authorized destination is resolved.
7. **US1-AS7** — **Given** an expired session while viewing authorized content, **When** the next protected operation is resolved, **Then** authentication is requested and the authorized destination can be restored after sign-in, while unsubmitted sensitive form content is discarded.
8. **US1-AS8** — **Given** an authenticated session, **When** the user signs out, **Then** protected content is no longer available and the authentication destination opens.
9. **US1-AS9** — **Given** an authenticated session, **When** the user changes language from the profile menu, **Then** the interface switches between French and English and retains the preference for later visits.

---

### User Story 2 - Create And Open A Patient (Priority: P1)

An authenticated orthoprosthetist uses the patient directory as the primary destination, reviews a paginated table of owned patients, creates a patient, and opens that patient's workspace.

**Why this priority**: A patient is the ownership and navigation context for every scan and print request.

**Independent Test**: With an authenticated empty account, create a valid patient and verify that the new patient's workspace opens. Return to the directory and open the same patient from the table.

**Acceptance Scenarios**:

1. **US2-AS1** — **Given** an authenticated account with no patients, **When** the directory loads, **Then** an empty state explains the next action and offers patient creation.
2. **US2-AS2** — **Given** owned patients, **When** the directory loads, **Then** the patient table shows each patient's full name, age, date added, and opening action.
3. **US2-AS3** — **Given** a patient list with a next page, **When** the user activates Next and later Previous, **Then** the adjacent cursor page is shown without claiming a total count.
4. **US2-AS4** — **Given** the patient creation action, **When** the user enters valid first name, last name, and age, **Then** one patient is created and its workspace opens directly.
5. **US2-AS5** — **Given** invalid patient fields, **When** creation is submitted, **Then** localized field errors identify every actionable correction and no patient is created.
6. **US2-AS6** — **Given** a creation request in progress, **When** the user repeats the submit interaction, **Then** no duplicate patient is created.
7. **US2-AS7** — **Given** already displayed patients, **When** a background refresh fails, **Then** the table remains visible with a non-blocking warning and an explicit retry action.
8. **US2-AS8** — **Given** an identifier owned by another account or unknown to the current account, **When** it is requested, **Then** no patient information or existence signal is disclosed.

---

### User Story 3 - Add And Retrieve A Patient 3D Scan (Priority: P2)

Within one patient workspace, an orthoprosthetist reviews a paginated scan table, selects and uploads a valid PLY scan, and downloads an available scan without leaving the patient context.

**Why this priority**: A validated 3D scan is the production input and must remain unambiguously linked to its patient.

**Independent Test**: Open an owned patient with no scans, upload each supplied sample scan in turn, verify its safe metadata in the table, and download it.

**Acceptance Scenarios**:

1. **US3-AS1** — **Given** an owned patient with no scans, **When** the workspace loads, **Then** the scan region shows an empty state and an upload action.
2. **US3-AS2** — **Given** a selected file, **When** validation begins, **Then** the selected name and size are reviewable and upload progress or pending feedback is announced.
3. **US3-AS3** — **Given** any of the three supplied sample scans, **When** it is uploaded, **Then** the scan is accepted and appears once in the scan table with a safe identifier, PLY format, size, date added, download action, and print-request action.
4. **US3-AS4** — **Given** a file that is too large, not PLY 1.0, structurally invalid, or empty, **When** upload is attempted, **Then** it is rejected before becoming an eligible scan and the reason is localized.
5. **US3-AS5** — **Given** valid scan content and unavailable storage, **When** upload fails, **Then** no successful upload is implied and the user can retry deliberately.
6. **US3-AS6** — **Given** an available scan, **When** download is requested, **Then** the PLY content is downloaded without navigating away from the workspace.
7. **US3-AS7** — **Given** temporarily unavailable scan storage, **When** download is requested, **Then** the existing workspace remains visible and an actionable unavailability message is shown.
8. **US3-AS8** — **Given** multiple scan pages, **When** Previous or Next is activated, **Then** the adjacent cursor page is shown without a fabricated total.
9. **US3-AS9** — **Given** an owned patient workspace opens, **When** its content becomes available, **Then** patient identity remains visible, `TAB-PATIENT-SCANS` is selected by default, and only the scan collection panel is displayed.
10. **US3-AS10** — **Given** scan rows are already displayed and an upload file is selected, **When** the file is rejected, **Then** the scan table remains visible, the upload context remains open with the selected file, and the localized validation reason is shown within that context so another file can be chosen.
11. **US3-AS11** — **Given** the scan upload context opens without a file, **When** it is displayed, **Then** its file-selection surface opens the system file chooser and its upload confirmation remains disabled.
12. **US3-AS12** — **Given** one file has been selected, **When** it is reviewable, **Then** its name, size, validation state, and removal action are grouped together, and upload confirmation is enabled only while that selection is valid.

---

### User Story 4 - Request And Follow Printing (Priority: P2)

Within the same patient workspace, an orthoprosthetist requests printing of an eligible scan and follows the request from confirmation through queued or active production to completion or failure.

**Why this priority**: Printing is the business outcome of the workflow and must remain safe when the external result is delayed or ambiguous.

**Independent Test**: From an owned patient with an eligible scan, submit one print request, observe it immediately in the tracking table, and exercise pending, queued, in-progress, completed, failed, capacity, and ambiguous-confirmation outcomes.

**Acceptance Scenarios**:

1. **US4-AS1** — **Given** an eligible scan with no non-terminal print request, **When** printing is requested once, **Then** one system reference is generated and a confirmation-pending row appears immediately.
2. **US4-AS2** — **Given** a print submission in progress or a non-terminal print request for the scan, **When** the action is activated again, **Then** a duplicate submission is prevented and the existing request is surfaced.
3. **US4-AS3** — **Given** an ambiguous submission outcome, **When** confirmation is not received, **Then** the request remains confirmation pending, the application reconciles by its stable reference, and it does not blindly submit again.
4. **US4-AS4** — **Given** a confirmed request scheduled for future production, **When** it is shown, **Then** its visible state is queued and Estimated progress is 0%.
5. **US4-AS5** — **Given** the printing center has reached concurrent capacity, **When** a new request is rejected, **Then** no accepted job is implied and a localized retry-later state is shown.
6. **US4-AS6** — **Given** production has started and has not ended, **When** timing information is refreshed, **Then** the state is in progress and Estimated progress is time-based and capped at 99%.
7. **US4-AS7** — **Given** a successful provider outcome, **When** it is refreshed, **Then** the state is completed, Estimated progress is 100%, and reprinting the scan becomes available.
8. **US4-AS8** — **Given** a failed provider outcome, **When** it is refreshed, **Then** the state is failed, no percentage implies progress toward success, and reprinting the scan becomes available.
9. **US4-AS9** — **Given** already displayed print requests, **When** background refresh fails, **Then** the rows remain visible with their last known update and a non-blocking warning.
10. **US4-AS10** — **Given** no eligible scan, **When** the printing region is reviewed, **Then** the unavailable action is explained and scan upload is offered in the same workspace.
11. **US4-AS11** — **Given** multiple print-request pages, **When** Previous or Next is activated, **Then** the adjacent cursor page is shown without a fabricated total.
12. **US4-AS12** — **Given** a print request is accepted from `TAB-PATIENT-SCANS`, **When** submission succeeds, **Then** `TAB-PATIENT-PRINTS` becomes selected and the accepted request is visible in `TBL-PRINTS` without leaving the patient workspace.

### Edge Cases

- Leading and trailing whitespace is removed from email and patient name input before validation; meaningful Unicode characters inside names are preserved.
- Age boundaries 0 and 150 are valid; decimal, negative, and greater values are invalid.
- Password length is measured as user-perceived characters and accepts the inclusive boundaries of 12 and 128.
- A scan whose extension is `.ply` but whose content is not a valid non-empty PLY 1.0 mesh is rejected.
- An otherwise valid scan of exactly 25 MiB is accepted; a larger scan is rejected.
- Repeated activation, navigation, or delayed feedback must not create duplicate patients or print requests.
- If the account loses access to a resource during a view, the next protected operation removes inaccessible content without revealing a different owner.
- A confirmed request without usable scheduling information remains queued at 0% until active production or a terminal outcome can be inferred from confirmed information.
- Localized dates, numbers, and sizes preserve the underlying value while adapting presentation to the selected language.
- An unknown application path or unavailable deep link displays a localized not-found fallback without revealing whether a protected resource exists and offers a safe return to the appropriate authenticated or unauthenticated destination.

## Experience Contract For Figma

### Canonical Terminology

- **Patient** identifies the owned clinical record.
- **3D scan** identifies an accepted PLY mesh associated with one Patient.
- **Print request** identifies one submission and tracking lifecycle for one 3D scan.
- **Printing center** identifies the external production service without exposing provider-specific implementation details.
- **Estimated progress** identifies a derived, non-guaranteed indication and is never labelled simply as Progress.
- The generic term **file** is used only while a user is selecting local content. After validation begins, the product uses **3D scan** or a specific validation error.

### Destinations

| ID                    | Destination       | Required content and transitions                                                                                                                                                                                                     |
| --------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DST-AUTH              | Authentication    | Sign in and account creation are mutually reachable. The browser preference selects the initial supported language without exposing a manual language control. Success opens the requested authorized destination or `DST-PATIENTS`. |
| DST-PATIENTS          | Patient directory | This is the primary authenticated destination. It contains `TBL-PATIENTS`, `ACT-PATIENT-CREATE`, pagination, and the patient creation flow. Successful creation opens `DST-PATIENT-WORKSPACE`.                                       |
| DST-PATIENT-WORKSPACE | Patient workspace | This single destination keeps patient identity visible and exposes `TBL-SCANS` and `TBL-PRINTS` through `NAV-PATIENT-SECTIONS`. Upload, download, printing, and tracking occur without separate scan or printing destinations.       |

There is no dashboard. Figma may use pages, dialogs, sheets, or inline regions for bounded actions, provided these three destinations and transitions remain recognizable.

### System Fallback

| ID            | Label     | Required behavior                                                                                                                                                                                         |
| ------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SYS-NOT-FOUND | Not found | A localized fallback for unknown application paths and unavailable deep links. It is not a primary destination and MUST offer a safe return to `DST-PATIENTS` when authenticated or `DST-AUTH` otherwise. |

The fallback MUST use neutral product language, MUST NOT reveal whether a protected patient, 3D scan, or Print request exists, and MUST remain visually consistent with the MedTech workspace.

### Patient Workspace Navigation

| ID                   | Label           | Required behavior                                                                                                                                         |
| -------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NAV-PATIENT-SECTIONS | Patient content | An internal tab list within `DST-PATIENT-WORKSPACE`; patient identity remains visible and exactly one associated collection panel is displayed at a time. |
| TAB-PATIENT-SCANS    | 3D scans        | Selected by default when the workspace opens; displays `TBL-SCANS` and its upload, download, printing, state, and pagination behavior.                    |
| TAB-PATIENT-PRINTS   | Print requests  | Displays `TBL-PRINTS` and its tracking, state, and pagination behavior; becomes selected after a print request is accepted.                               |

The tabs do not create destinations, routes, or a sidebar. On compact screens both triggers occupy the available width and provide touch targets of at least 44 pixels. The navigation structure may accommodate future peer sections, but the MVP exposes only these two tabs.

### Functional Tables

| ID           | Collection             | Required columns or information                                              | Required row actions                    | Pagination                                                   |
| ------------ | ---------------------- | ---------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------ |
| TBL-PATIENTS | Owned patients         | Patient full name, Age, Added                                                | `ACT-PATIENT-OPEN`                      | Previous/Next using available cursors; no total is invented. |
| TBL-SCANS    | Patient 3D scans       | Safe identifier, Format, Size, Added                                         | `ACT-SCAN-DOWNLOAD`, `ACT-PRINT-CREATE` | Previous/Next using available cursors; no total is invented. |
| TBL-PRINTS   | Patient print requests | Reference, Associated scan, Status, Estimated progress, temporal information | No mandatory row action                 | Previous/Next using available cursors; no total is invented. |

Desktop and mobile retain a tabular representation. On compact screens, essential information and actions remain available. Figma may choose horizontal scrolling or reduce secondary information, but it may not replace these collections with unrelated card-based navigation or remove their pagination position.

### Print Lifecycle Derivation

| Visible state        | Confirmed information                                                                                   | Estimated progress                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Confirmation pending | The product has submitted once but has not yet confirmed a printing-center job by its stable reference. | No percentage.                                                                                                                                        |
| Queued               | A job is confirmed, has no terminal outcome, and its scheduled production start is in the future.       | 0%.                                                                                                                                                   |
| In progress          | A job is confirmed, has no terminal outcome, and its scheduled production start has been reached.       | Time-based across the scheduled production interval and capped at 99%; it remains 99% if the interval elapses before a terminal outcome is confirmed. |
| Completed            | The printing center confirms success.                                                                   | 100%.                                                                                                                                                 |
| Failed               | The printing center confirms failure.                                                                   | No percentage.                                                                                                                                        |

Scheduled start and end information remains visibly estimated. A derived time position never replaces the last confirmed lifecycle outcome.

### Action Index

| ID                  | Action                                                     | Availability rule                                                                                |
| ------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| ACT-LANGUAGE-CHANGE | Change language                                            | Available from the authenticated profile menu.                                                   |
| ACT-AUTH-SIGN-IN    | Sign in                                                    | Available in the sign-in mode; pending prevents duplicate submission.                            |
| ACT-AUTH-SIGN-UP    | Create account                                             | Available in the account-creation mode; pending prevents duplicate submission.                   |
| ACT-AUTH-SIGN-OUT   | Sign out                                                   | Available from every authenticated destination without competing with the primary task.          |
| ACT-PATIENT-CREATE  | Create patient                                             | Available from `DST-PATIENTS`.                                                                   |
| ACT-PATIENT-OPEN    | Open patient                                               | Available for each row in `TBL-PATIENTS`.                                                        |
| ACT-SCAN-UPLOAD     | Upload 3D scan                                             | Available in `DST-PATIENT-WORKSPACE`; confirmation is disabled until one valid file is selected. |
| ACT-SCAN-DOWNLOAD   | Download 3D scan                                           | Available for retrievable rows in `TBL-SCANS`.                                                   |
| ACT-PRINT-CREATE    | Request printing                                           | Available only for a valid scan without a non-terminal request.                                  |
| ACT-PAGE-PREVIOUS   | Show previous page                                         | Enabled only when a previous cursor exists.                                                      |
| ACT-PAGE-NEXT       | Show next page                                             | Enabled only when a next cursor exists.                                                          |
| ACT-RETRY           | Retry a safe read or explicitly restart a failed operation | Never represents a blind retry of an ambiguous print submission.                                 |

### Required State Index

Every identifier below must be traceable in future Figma evidence. Related states may share a frame when their differences remain explicit and reviewable.

| Area              | State IDs                                                                                                                                                                            | Observable requirement                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication    | AUTH-INITIAL, AUTH-PENDING, AUTH-VALIDATION, AUTH-ACCOUNT-EXISTS, AUTH-CREDENTIALS-INVALID, AUTH-RATE-LIMITED, AUTH-NETWORK-UNAVAILABLE, AUTH-RESTORING, AUTH-SESSION-EXPIRED        | Distinguish entry, field correction, safe account-level failures, session restoration, and reauthentication.                          |
| Patients          | PATIENTS-LOADING, PATIENTS-EMPTY, PATIENTS-LIST, PATIENTS-PAGINATING, PATIENT-CREATE-PENDING, PATIENT-CREATE-SUCCESS, PATIENT-CREATE-ERROR, PATIENTS-REFRESH-DEGRADED                | Preserve existing table data during pagination and degraded refresh; creation success transitions to the new workspace.               |
| 3D scans          | SCANS-EMPTY, SCAN-SELECTED, SCAN-UPLOADING, SCAN-CONTENT-INVALID, SCAN-TOO-LARGE, SCAN-UPLOAD-SUCCESS, SCAN-STORAGE-UNAVAILABLE, SCAN-DOWNLOAD-UNAVAILABLE                           | Explain eligibility and keep the patient workspace stable through upload and storage outcomes.                                        |
| Print requests    | PRINT-NO-ELIGIBLE-SCAN, PRINT-SUBMITTING, PRINT-CONFIRMATION-PENDING, PRINT-CAPACITY-REACHED, PRINT-QUEUED, PRINT-IN-PROGRESS, PRINT-COMPLETED, PRINT-FAILED, PRINT-REFRESH-DEGRADED | Surface safety around duplicate prevention, ambiguous confirmation, provider capacity, lifecycle, estimated progress, and stale data. |
| System navigation | ROUTE-NOT-FOUND                                                                                                                                                                      | Explain that the requested page is unavailable without exposing protected-resource existence and provide one safe return action.      |

## Requirements _(mandatory)_

### Functional Requirements

#### Authentication And Localization

- **FR-001**: The product MUST offer account creation using email, password, and password confirmation.
- **FR-002**: Email identity MUST be unique without regard to letter case and MUST be normalized for surrounding whitespace before comparison.
- **FR-003**: A password MUST contain between 12 and 128 user-perceived characters, inclusive.
- **FR-004**: Password confirmation MUST match the submitted password before account creation can proceed.
- **FR-005**: The product MUST offer sign-in using email and password and MUST use a generic failure response that does not disclose whether an account exists.
- **FR-006**: Sign-in and account creation MUST link to one another from `DST-AUTH`.
- **FR-007**: The product MUST restore a valid authenticated session at startup and MUST provide sign-out from every authenticated destination.
- **FR-008**: After successful authentication, the product MUST open the requested authorized destination, or `DST-PATIENTS` when no such destination exists.
- **FR-009**: After session expiry, successful reauthentication MUST restore the requested authorized destination but MUST NOT restore unsubmitted sensitive form content.
- **FR-010**: The product MUST support French and English, initially select the browser preference when supported, fall back to English, expose `ACT-LANGUAGE-CHANGE` from the authenticated profile menu, and persist the explicit choice.

#### Navigation And Patient Ownership

- **FR-011**: The authenticated experience MUST contain only `DST-PATIENTS` and `DST-PATIENT-WORKSPACE` as primary destinations and MUST NOT introduce a dashboard.
- **FR-012**: `DST-PATIENTS` MUST be the primary destination after authentication and MUST expose `TBL-PATIENTS` and `ACT-PATIENT-CREATE`.
- **FR-013**: Successful patient creation and `ACT-PATIENT-OPEN` MUST open `DST-PATIENT-WORKSPACE` for the selected patient.
- **FR-014**: `DST-PATIENT-WORKSPACE` MUST keep patient identity visible and MUST expose `TAB-PATIENT-SCANS` and `TAB-PATIENT-PRINTS` through `NAV-PATIENT-SECTIONS`, with exactly one collection panel visible at a time, `TAB-PATIENT-SCANS` selected by default, and no separate destination, route, or sidebar.
- **FR-015**: An account MUST be able to list, create, and open only patients it owns.
- **FR-016**: Requests for unknown patients and patients owned by another account MUST be indistinguishable and MUST reveal no patient data.
- **FR-017**: Patient creation MUST require a non-empty Unicode first name and last name, each limited to 100 characters after surrounding whitespace is removed.
- **FR-018**: Patient creation MUST require an integer age between 0 and 150, inclusive.
- **FR-019**: `TBL-PATIENTS` MUST show Patient full name, Age, Added, and `ACT-PATIENT-OPEN` for each visible row.
- **FR-020**: Patient creation MUST prevent duplicate submission while pending and MUST open the single created patient's workspace after success.
- **FR-021**: Patient editing and deletion MUST NOT be offered in this MVP.

#### 3D Scans

- **FR-022**: An account MUST be able to list, upload, and download 3D scans only within an owned patient's workspace.
- **FR-023**: Scan upload MUST preserve the current patient workspace and scan table, MUST provide a keyboard-operable file-selection surface that opens the system file chooser, MUST group the selected file's name, size, validation state, and removal action within one bounded upload context, MUST disable confirmation until one valid file is selected, and MUST keep a localized file-specific validation reason in that same context until the selection is removed or corrected.
- **FR-024**: A scan MUST be no larger than 25 MiB.
- **FR-025**: A scan MUST be a PLY 1.0 file using ASCII, binary little-endian, or binary big-endian encoding.
- **FR-026**: A scan MUST contain a structurally valid, non-empty mesh; a `.ply` filename alone MUST NOT establish validity.
- **FR-027**: All three supplied sample scans MUST be accepted by the scan rules.
- **FR-028**: `TBL-SCANS` MUST show a safe scan identifier, Format, Size, Added, `ACT-SCAN-DOWNLOAD`, and `ACT-PRINT-CREATE` for each visible row.
- **FR-029**: A successful upload MUST add the scan once to `TBL-SCANS`; a failed upload MUST NOT imply that a usable scan exists.
- **FR-030**: Scan download MUST preserve the current patient workspace and MUST distinguish unavailable storage from a successful download.

#### Print Requests And Estimated Progress

- **FR-031**: `ACT-PRINT-CREATE` MUST be available only for a validated scan with no non-terminal print request.
- **FR-032**: The system MUST generate the print reference; users MUST NOT enter or edit it.
- **FR-033**: Every print reference MUST be unique and contain at most 15 characters.
- **FR-034**: The same stable reference MUST identify submission, reconciliation, and subsequent tracking of one print request.
- **FR-035**: The visible print lifecycle MUST distinguish confirmation pending, queued, in progress, completed, and failed.
- **FR-036**: A confirmation-pending request MUST NOT display a percentage and MUST prevent resubmission of the same scan while reconciliation is unresolved.
- **FR-037**: A queued request MUST display Estimated progress as 0%; an in-progress request MUST display a time-based estimate capped at 99%; a completed request MUST display 100%.
- **FR-038**: A failed request MUST NOT display a percentage that implies continued progress toward success.
- **FR-039**: A printing-center capacity rejection MUST NOT create an accepted request and MUST explain that submission may be retried later.
- **FR-040**: An ambiguous submission outcome MUST be reconciled by the stable reference and MUST NOT be blindly submitted again.
- **FR-041**: `TBL-PRINTS` MUST show Reference, Associated scan, Status, Estimated progress, and available production dates or last-known timing information.
- **FR-042**: A print request accepted by the product MUST appear immediately in `TBL-PRINTS`, initially as confirmation pending when provider confirmation is not yet known, and MUST select `TAB-PATIENT-PRINTS` so the accepted request is visible.
- **FR-043**: Only one confirmation-pending, queued, or in-progress request MAY exist for a scan at one time.
- **FR-044**: A new print request for the same scan MAY be created after its previous request is completed or failed.

#### Collections, Errors, Accessibility, And Privacy

- **FR-045**: `TBL-PATIENTS`, `TBL-SCANS`, and `TBL-PRINTS` MUST use Previous and Next cursor navigation, MUST communicate whether each direction is available, and MUST NOT invent a server total or arbitrary page count.
- **FR-046**: Desktop and mobile MUST retain a tabular representation of all three collections and keep essential information and actions available on compact screens.
- **FR-047**: Every state in the Required State Index MUST have explicit, localized, perceivable feedback and a safe next action when recovery is possible.
- **FR-048**: User-visible error translation MUST be selected from stable problem codes and local context, never from raw backend or printing-center messages.
- **FR-049**: The product MUST NOT expose provider credentials, authentication material, or internal provider details to users or committed evidence.
- **FR-050**: When a background refresh fails after data has been displayed, the existing data MUST remain visible with a non-blocking warning, its last-known nature, and an explicit retry action.
- **FR-051**: Pending mutations MUST prevent repeated activation from creating duplicate accounts, patients, scans, or print requests.
- **FR-052**: All destinations, tables, actions, forms, messages, and state changes MUST support keyboard navigation, visible focus, accessible names, programmatic field associations, and announcements for asynchronous feedback.
- **FR-053**: Touch targets MUST be usable on compact screens, and no status, validation result, or available action MAY rely on color alone.
- **FR-054**: The product MUST minimize displayed and retained personal data to the defined account and patient fields and MUST make no claim of GDPR, HDS, medical-device, or other formal certification.
- **FR-055**: Unknown application paths and unavailable deep links MUST display `SYS-NOT-FOUND` with localized, non-disclosing language and one safe return action to `DST-PATIENTS` for an authenticated account or `DST-AUTH` otherwise.

### Key Entities

- **Account**: An orthoprosthetist's ownership boundary, identified by a normalized unique email and associated with an authenticated session and language preference.
- **Patient**: A record owned by exactly one Account, with a Unicode first name, Unicode last name, integer age, and system-recorded date added.
- **3D scan**: A PLY mesh owned through one Patient, with a safe identifier, PLY format, byte size, and system-recorded date added. Original content is never part of specification evidence.
- **Print request**: A printing attempt for exactly one 3D scan, identified by a generated stable reference and carrying a visible lifecycle state, Estimated progress when meaningful, and available production or update times.

### Entity Relationships And Invariants

- One Account owns zero or more Patients; a Patient has exactly one owning Account.
- One Patient owns zero or more 3D scans; a 3D scan belongs to exactly one Patient.
- One 3D scan has zero or more Print requests over time, but no more than one non-terminal Print request at a time.
- Ownership checks apply transitively from Account to Patient, 3D scan, and Print request.
- A Print request keeps its generated reference for its entire lifecycle.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All four independently testable user stories can be completed from their stated starting condition without introducing a dashboard or leaving the required patient context.
- **SC-002**: Account creation, sign-in, restoration, expiry, and sign-out pass every US1 acceptance scenario in both French and English; authenticated language selection persists without adding a pre-authentication control.
- **SC-003**: Patient creation accepts both boundary ages, rejects every invalid boundary class, creates exactly one record per valid submission, and exposes no cross-account patient information.
- **SC-004**: A user can open one patient workspace with persistent patient identity, use the default `TAB-PATIENT-SCANS`, and upload and then download an accepted scan without navigating to a separate scan destination.
- **SC-005**: Repeated activation and ambiguous provider responses produce at most one non-terminal print request and one stable reference for the intended scan.
- **SC-006**: Every tracked print request displays exactly one of the five canonical lifecycle states and presents Estimated progress according to the 0%, capped-99%, 100%, or no-percentage invariant.
- **SC-007**: An accepted print request selects `TAB-PATIENT-PRINTS`, appears in tracking immediately, can be followed to completed or failed, and permits reprinting only after a terminal state.
- **SC-008**: Every required validation, network, storage, capacity, session, and refresh-degradation state has localized feedback and a safe next action without losing already displayed data.
- **SC-009**: All three supplied sample scans are accepted; files over 25 MiB, empty meshes, structurally invalid meshes, and unsupported content are rejected before print eligibility.
- **SC-010**: One hundred percent of background refresh failures preserve the last displayed table rows and visibly distinguish them from freshly confirmed data.
- **SC-011**: Ownership and secret-exposure review finds zero cross-account disclosures and zero provider credentials or authentication material in user-visible or committed evidence.
- **SC-012**: Every destination, table, action, required state, source requirement, functional requirement, and success criterion is addressable by a stable identifier for Figma and acceptance review.
- **SC-013**: The delivered product uses the mandated React frontend and NestJS backend and passes the architecture and code-organization review defined by the brief.
- **SC-014**: A reviewer can set up and run the delivered repository, understand its choices and trade-offs, inspect meaningful Git history, and identify the declared AI-assisted workflow from the README and repository evidence.
- **SC-015**: Every unknown path and unavailable deep link displays the localized `ROUTE-NOT-FOUND` state, reveals no protected-resource existence, and returns the user to the appropriate safe destination through one keyboard-accessible action.

## Delivery Constraints

- **DC-001 — Mandated stack**: The delivered frontend uses React and the delivered backend uses NestJS. This is the only application technology choice fixed by this specification.
- **DC-002 — Reviewer documentation**: The delivery includes a README covering setup, execution, architecture choices, and material trade-offs.
- **DC-003 — Reviewable history**: Git history communicates intentional, bounded increments and remains suitable for technical review.
- **DC-004 — Maintainability evidence**: Architecture and code organization are reviewable against the brief's assessment criteria without adding product scope.
- **DC-005 — AI disclosure**: The README explains material AI assistance and how the author reviewed and validated the result.
- **DC-006 — Provider protection**: Printing-center authentication is handled outside user-visible behavior and committed evidence; no credential or protected provider detail enters this specification.

## Non-Goals

- Editing or deleting patients.
- Deleting 3D scans.
- Cancelling print requests.
- Password recovery or password change.
- Multi-factor authentication or external identity providers.
- Administration, account management, or cross-account collaboration.
- A dashboard, analytics, advanced search, sorting controls, or configurable page sizes.
- Notifications, messaging, billing, payment, or deployment.
- Clinical decision support, diagnostic claims, regulatory certification, or medical-device claims.
- 3D visualization, mesh editing, or scan transformation.

## Assumptions

- The target user is an orthoprosthetist using the product for an intentionally narrow patient-to-print workflow.
- A printing request represents a socket-production job for the selected patient scan.
- Printing-center timing is an estimate; the application clearly labels derived progress as Estimated progress.
- The printing center may be delayed or temporarily unavailable, so the last confirmed state remains preferable to invented freshness.
- Cursor availability, rather than a total record count, is sufficient for the bounded Previous/Next navigation required by the MVP.
- Figma will provide desktop and compact-screen evidence after this specification is accepted, using the stable identifiers defined here.

## Repository Specification Constraints

- Follow the language, requirement identifiers, and acceptance binding selected by repository guidance.
- Preserve authoritative technical tokens exactly as required by the repository.
- Keep the specification free of implementation choices and external task state, except for source-mandated delivery constraints explicitly identified as `DC-xxx`.
- Record acceptance only through the immutable repository mechanism selected by its guidance.
