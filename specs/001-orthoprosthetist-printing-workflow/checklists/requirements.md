# Specification Quality Checklist: Orthoprosthetist Printing Workflow

**Purpose**: Validate that the functional specification is complete, traceable, safe, and ready for human acceptance before Figma exploration or technical planning

**Created**: 2026-08-11

**Feature**: [spec.md](../spec.md)

**Note**: This checklist tests the quality of the requirements themselves. It does not validate an implementation.

## Content Quality

- [x] CHK001 The specification describes observable user and business behavior rather than implementation design, except for React and NestJS mandated by SR-002. [Spec §Authority And Scope, §Delivery Constraints]
- [x] CHK002 The language is understandable to product, design, and engineering reviewers without requiring access to source code. [Spec]
- [x] CHK003 Every mandatory template section contains concrete content and no template placeholder remains. [Spec]
- [x] CHK004 Canonical terminology is consistent: Patient, 3D scan, Print request, Printing center, and Estimated progress. [Spec]
- [x] CHK005 The scope remains proportional to the supplied MVP and does not introduce an alternative product. [Spec §Non-Goals]

## Source Traceability

- [x] CHK006 Every safe source requirement has one `SR-xxx` row with a product or delivery binding and an `SC-xxx` acceptance binding. [Spec §Source Requirement Matrix]
- [x] CHK007 Every `SR-xxx` maps to at least one user scenario, `FR-xxx`, or explicitly qualified `DC-xxx`, and to at least one `SC-xxx`. [Spec §Source Requirement Matrix]
- [x] CHK008 The mandated authentication, patient, scan, printing, progress, validation, README, architecture, Git-history, and AI-disclosure requirements are preserved without weakening. [Spec §Source Requirement Matrix]
- [x] CHK009 Printing-center capacity, reference length, lifecycle, and ambiguous-submission constraints are represented without exposing provider credentials or protected operational details. [Spec SR-013–SR-017]
- [x] CHK010 Acceptance of all three supplied sample scans is required without including their names, contents, or personal metadata. [Spec SR-018, FR-027, SC-009]

## Scenario And Requirement Completeness

- [x] CHK011 The four user stories are prioritized, independently testable, and cover authentication, patients, scans, and printing. [Spec §User Scenarios & Testing]
- [x] CHK012 Every acceptance scenario uses explicit Given/When/Then conditions and has a stable identifier. [Spec US1-AS1–US4-AS14, including US2-AS9–US2-AS10, US3-AS13–US3-AS15, US4-AS13–US4-AS14]
- [x] CHK013 No `[NEEDS CLARIFICATION]` marker or unresolved alternative remains. [Spec]
- [x] CHK014 Every `FR-xxx` is atomic enough to test, uses a normative term, and identifies observable behavior or a source-mandated constraint. [Spec §Functional Requirements]
- [x] CHK015 Every `SC-xxx` is measurable through acceptance evidence and avoids unsupported market or performance claims. [Spec §Measurable Outcomes]
- [x] CHK016 Boundary conditions for password length, patient names, age, scan size, PLY validity, print reference length, and estimated progress are explicit. [Spec §Edge Cases, §Functional Requirements]
- [x] CHK017 Entity ownership, relationships, cardinality, and print terminality invariants are internally consistent. [Spec §Key Entities, §Entity Relationships And Invariants]
- [x] CHK018 The non-goals explicitly exclude editing, deletion, cancellation, recovery, MFA, administration, dashboard, advanced search, notifications, billing, deployment, and clinical or regulatory claims. [Spec §Non-Goals]

## Experience Readiness For Figma

- [x] CHK019 Authentication, patient directory, and patient workspace are the only primary destinations and each has a stable `DST-xxx` identifier. [Spec §Destinations]
- [x] CHK020 Patient identity remains visible while the scan and print-request collections use two internal tabs within one patient workspace, without separate destinations, routes, or a sidebar. [Spec DST-PATIENT-WORKSPACE, NAV-PATIENT-SECTIONS, FR-014]
- [x] CHK021 Every required table has a `TBL-xxx` identifier, required information, row actions, and server-pagination rule. [Spec §Functional Tables]
- [x] CHK022 Every user action needed by the four journeys has an `ACT-xxx` identifier and an explicit availability or safety rule. [Spec §Action Index]
- [x] CHK023 Every required authentication, patient, scan, print, and system-navigation state has a stable identifier and observable intent. [Spec §Required State Index]
- [x] CHK024 The specification leaves visual composition, components, density, and compact-layout strategy to Figma without weakening required information or actions. [Spec §Authority And Scope, §Functional Tables]
- [x] CHK025 Desktop and mobile requirements preserve tabular collections, essential actions, and Previous/Next navigation without inventing totals. [Spec FR-045–FR-046]
- [x] CHK042 Patient workspace navigation exposes only `TAB-PATIENT-SCANS` and `TAB-PATIENT-PRINTS`, selects scans by default, displays one collection panel at a time, and selects print requests after an accepted submission. [Spec US3-AS9, US4-AS12, FR-014, FR-042]
- [x] CHK043 Scan validation preserves the displayed scan table and keeps selected-file feedback within the bounded upload context until correction or dismissal. [Spec US3-AS10, FR-023]
- [x] CHK044 Scan upload separates file selection from confirmation, keeps confirmation disabled without a valid selection, and groups removal plus file-specific feedback with the selected attachment. [Spec US3-AS11–US3-AS12, FR-023]
- [x] CHK045 The not-found fallback is explicitly a system state rather than a fourth primary destination, uses non-disclosing language, and exposes one safe return action. [Spec SYS-NOT-FOUND, FR-055]

## Error, Degradation, And Safety Quality

- [x] CHK026 Initial loading, initial-load failure, empty, pagination, page failure, pending, success, validation, network, session-expiry, storage, capacity, ambiguous-confirmation, failure, degraded-refresh, and unknown-route states are all specified where relevant. [Spec §Required State Index]
- [x] CHK027 Background refresh failure explicitly preserves displayed data, marks it as last known, and provides a safe retry across all three collections. [Spec FR-050, FR-057, SC-010]
- [x] CHK048 Initial collection-read failure shows no table or row and offers a localized, accessible retry across patients, scans, and print requests. [Spec US2-AS9, US3-AS13, US4-AS13, FR-057]
- [x] CHK049 Adjacent-page failure preserves only the last confirmed rows and page indicator, never presents the requested page as loaded, and offers a localized, accessible retry across all three collections. [Spec US2-AS10, US3-AS14, US4-AS14, FR-057, SC-017]
- [x] CHK028 Duplicate prevention covers repeated account, patient, scan, and print interactions, while ambiguous printing forbids blind resubmission. [Spec FR-040, FR-051]
- [x] CHK029 Cross-account access reveals neither resource data nor resource existence. [Spec FR-015–FR-016, SC-011]
- [x] CHK030 Confirmation pending, queued, in progress, completed, and failed have non-misleading Estimated progress rules. [Spec FR-035–FR-038, SC-006]

## Localization And Accessibility

- [x] CHK031 French and English behavior, browser preference, English fallback, persistence, and authenticated profile-menu access are unambiguous; authentication screens expose no manual language control. [Spec US1-AS9, FR-010]
- [x] CHK032 User-visible failures are derived from stable problem codes rather than raw backend or printing-center messages. [Spec FR-048]
- [x] CHK033 Keyboard navigation, visible focus, accessible names, field associations, and asynchronous announcements cover every destination and interaction. [Spec FR-052]
- [x] CHK034 Compact-screen touch targets and non-color status communication are explicit acceptance requirements. [Spec FR-053]
- [x] CHK035 Localized date, number, and size presentation preserves underlying values. [Spec §Edge Cases]
- [x] CHK046 The not-found fallback is localized, keyboard accessible, independent of color, and safe for both authenticated and unauthenticated contexts. [Spec FR-052–FR-055, SC-015]
- [x] CHK047 The unexpected-error fallback is localized, hides technical details, and exposes one keyboard-accessible retry action. [Spec SYS-UNEXPECTED-ERROR, FR-056, SC-016]

## Data Protection And Delivery Boundaries

- [x] CHK036 The specification contains no contact details, provider credential, secret, supplied scan bytes, original sample filename, or real personal data. [Spec]
- [x] CHK037 Data minimization is required without claiming GDPR, HDS, medical-device, or other formal certification. [Spec FR-054]
- [x] CHK038 React and NestJS are the only application technologies fixed by the specification. [Spec DC-001]
- [x] CHK039 README, reviewable Git history, maintainability, and AI disclosure remain delivery constraints rather than invented user features. [Spec DC-002–DC-005]
- [x] CHK040 The status changed to `Accepted` only after explicit human approval, and the accepted artifact contains no plan, task list, implementation, or Figma artifact. [Spec header]
- [x] CHK041 Requirements, scenarios, state definitions, entity invariants, non-goals, and success criteria contain no internal contradiction. [Spec]

## Notes

- Check items only after inspecting the cited specification evidence.
- Any unchecked item blocks acceptance and must be resolved in the specification rather than deferred to implementation.
