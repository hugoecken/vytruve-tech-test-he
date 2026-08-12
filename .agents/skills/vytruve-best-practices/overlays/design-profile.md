# Vytruve Product Design Profile

## Canonical authority

- Canonical file: [Vytruve — Product Design](https://www.figma.com/design/1c0CXC7lQwsS8SqhEc7sd6).
- Accepted specification: `specs/001-orthoprosthetist-printing-workflow/spec.md`.
- Base accepted specification commit: `2dd91218cf0d9114fd440efbfbd9843987c9036c`.
- Issue #3 owns the accepted product-design delivery and its explicitly accepted specification clarifications.
- `600 - Ready for Development` contains the canonical development-ready product evidence.
- `500 - In Design` and `400 - Exploration` are empty after promotion. `700 - Shipped` remains empty until runtime
  comparison, accessibility review, and visual reconciliation are complete.
- Figma owns visual composition within the accepted specification. It does not add routes, capabilities, permissions,
  data, or provider behavior.

## Page hierarchy

- `000 - Cover`.
- Foundations: `100 - Foundations`, `110 - Colors`, `120 - Typography`, `130 - Spacing & Layout`,
  `140 - Radius & Effects`, and `150 - Icons`.
- Reusable assets: `210 - Actions`, `220 - Status`, `230 - Inputs`, `240 - Navigation`, `250 - Feedback`,
  `260 - Data Display`, `270 - Overlays`, and `280 - Application Structure`.
- Business patterns: `300 - Authentication`, `310 - Patient Directory`, `320 - Patient Creation`,
  `330 - Patient Workspace`, `340 - Scan Management`, and `350 - Print Request & Tracking`.
- Lifecycle: `400 - Exploration`, `500 - In Design`, `600 - Ready for Development`, and `700 - Shipped`.
- Unnumbered `---` pages separate foundations, reusable assets, patterns, and lifecycle pages.

## Viewports and layout

- Desktop product viewport: `1440 × 900`; maximum application content width: `1200`; outer margin: `64`.
- Compact product viewport: `390 × 900`; outer margin: `16`; minimum interactive target: `44`.
- Documentation canvas: `2076` wide for component and pattern pages, with desktop and compact variants aligned on
  the same row.
- Responsive collections remain tables. Compact tables preserve essential information and actions, may scroll
  horizontally, and use `Previous · Page n · Next` without an invented total.

## Tokens

### Semantic colors

| Token                | Value                                 | Web syntax                            |
| -------------------- | ------------------------------------- | ------------------------------------- |
| Background           | `#F7FAF9`                             | `var(--background)`                   |
| Surface              | `#FFFFFF`                             | `var(--surface)`                      |
| Foreground           | `#163130`                             | `var(--foreground)`                   |
| Muted foreground     | `#637775`                             | `var(--muted-foreground)`             |
| Border               | `#D7E3E1`                             | `var(--border)`                       |
| Focus / ring         | `#0D9488`                             | `var(--focus)`, `var(--ring)`         |
| Primary              | `#0F766E`                             | `var(--primary)`                      |
| Primary hover        | `#115E59`                             | `var(--primary-hover)`                |
| Primary foreground   | `#FFFFFF`                             | `var(--primary-foreground)`           |
| Accent / secondary   | `#CCFBF1`                             | `var(--accent)`, `var(--secondary)`   |
| Muted emphasis       | `#EEF2F1`                             | `var(--muted-emphasis)`               |
| Success              | `#15803D`                             | `var(--success)`                      |
| Warning              | `#B45309`                             | `var(--warning)`                      |
| Danger / destructive | `#B42318`                             | `var(--danger)`, `var(--destructive)` |
| Danger muted         | `#FEF2F2`                             | `var(--danger-muted)`                 |
| Info                 | `#2563EB`                             | `var(--info)`                         |
| Overlay              | `#163130` at `28%` in `ModalBackdrop` | `var(--overlay)`                      |

Semantic colors alias primitive variables. Primitive variables have no Figma scopes and are never bound directly to
product components.

### Dimensions and effects

- Spacing: `4`, `8`, `12`, `16`, `20`, `24`, `32`, `40`, `48`, and `64` through `var(--space-*)`.
- Radius: `8`, `16`, `20`, `24`, and `999` through `var(--radius-sm|md|lg|xl|full)`; `16` is the standard product
  surface radius.
- Borders: `1` default and `2` focus through `var(--border-width-default|focus)`.
- Controls: `44` default, `36` compact, `44` minimum target, and `24` default icon size.
- Elevation: `Elevation/Soft`, using a `0 8 24 -8` shadow at `10%` foreground opacity.

### Typography

- Typeface: Geist. If unavailable in implementation tooling, use Inter as the deterministic fallback.
- Display and headings: `40/48`, `32/40`, `24/32`, and `20/28`, SemiBold.
- Body: `16/24` and `14/20`, Regular.
- Caption: `12/16`, Regular.
- Labels: `16/24` and `14/20`, Medium.

## Component inventory

### Foundations and reusable components

- Lucide assets: `CirclePlus`, `UserRound`, `CloudUpload`, `Download`, `Printer`, `ChevronLeft`, `ChevronRight`,
  `CircleCheck`, `CircleX`, `CircleAlert`, `Clock`, `RefreshCw`, `Languages`, and `LogOut`.
- Actions: `Button` and `IconButton`, limited to Primary, Outline, and Ghost styles; Default and Compact sizes; and
  Default, Hover, Focus, Pressed, and Disabled states.
- Status and feedback: `Badge`, `Progress`, `Alert`, `Toast`, `Skeleton`, `Spinner`, and `EmptyState`.
- Inputs: `Field`, `Input`, and `Select`.
- Navigation: `BackLink`, `AppHeader`, `BrandMark`, and `Tabs/PatientSection`.
- Data display: `Card`, `Table/Cell`, `Table/Placeholder`, `DataTableShell`, `Pagination`, and single-file
  `Attachment`.
- Overlays: `DropdownMenu`, `DropdownMenu/Item`, `Dialog`, `Drawer`, and `ModalBackdrop`.
- Application structure: `AppShell` and `NotFound`.

### Business patterns

- Authentication: `Authentication` and `AuthenticationFeedback`.
- Patient directory: `PatientTable` and `PatientDirectory`.
- Patient creation: `PatientForm` and `PatientCreation`.
- Patient workspace: `PatientSectionTabs`, `PatientWorkspace`, `ScanUploadContent`, and `ScanUploadOverlay`.
- Scan management: `ScanTable` and `ScanManagement`.
- Printing: `PrintTable`, `PrintTracking`, `PrintRequestSummary`, and `PrintRequestConfirmation`.

The canonical component owner must be fixed rather than detaching instances. The implementation reference is
shadcn/ui with TanStack Table composition, Tailwind-compatible semantic tokens, and Lucide React icons. No Code
Connect mapping is authorized before stable runtime components exist.

## Ready for Development evidence

Node URLs use `https://www.figma.com/design/1c0CXC7lQwsS8SqhEc7sd6?node-id=<id-with-hyphen>`.

| Evidence                              | Desktop    | Compact    | Requirement binding                                                                                                 |
| ------------------------------------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| Sign in                               | `80:4`     | `80:5`     | US1; FR-005–FR-009, FR-052–FR-053; SC-001, SC-002, SC-008                                                           |
| Create account                        | `80:143`   | `80:144`   | US1; FR-001–FR-004, FR-006, FR-051–FR-053; SC-001–SC-002, SC-008                                                    |
| Patient directory — list              | `80:413`   | `80:414`   | US2; FR-011–FR-012, FR-015, FR-019, FR-021, FR-045–FR-046, FR-052–FR-053; SC-001, SC-003, SC-012                    |
| Patient directory — loading and empty | `80:1082`  | `80:1083`  | US2; FR-012, FR-019–FR-020, FR-045, FR-047, FR-052–FR-053; SC-003, SC-008, SC-012                                   |
| Patient creation                      | `81:1106`  | `81:1107`  | US2; FR-017–FR-018, FR-020, FR-051–FR-052; SC-003, SC-008                                                           |
| Patient workspace — populated         | `81:1625`  | `81:1626`  | US2–US3; FR-013–FR-014, FR-022–FR-023, FR-028, FR-030, FR-045–FR-046, FR-052–FR-053; SC-001, SC-004, SC-008, SC-012 |
| Scan upload — select file             | `186:3938` | `186:4130` | US3; FR-022–FR-029, FR-047–FR-048, FR-051–FR-053; SC-004, SC-008–SC-009                                             |
| Scan upload — valid file              | `193:3`    | `193:539`  | US3; FR-022–FR-029, FR-047–FR-048, FR-051–FR-053; SC-004, SC-008–SC-009                                             |
| Scan upload — recoverable error       | `203:7839` | `203:7919` | US3; FR-022–FR-029, FR-047–FR-048, FR-051–FR-053; SC-004, SC-008–SC-009                                             |
| Print submission and lifecycle        | `81:1827`  | `81:1828`  | US4; FR-031–FR-044, FR-049, FR-051–FR-053; SC-005–SC-008                                                            |
| Degraded workspace refresh            | `81:1969`  | `81:1970`  | US2, US4; FR-047–FR-050, FR-052; SC-008, SC-010                                                                     |
| Profile menu open                     | `117:4993` | `117:4995` | US1; FR-007, FR-010, FR-052; SC-002, SC-012                                                                         |
| French directory stress               | `83:1853`  | —          | US2; FR-019, FR-045–FR-046, FR-052; SC-003, SC-012                                                                  |
| French account-creation stress        | —          | `83:1808`  | US1; FR-001–FR-004, FR-010, FR-052–FR-053; SC-002, SC-008                                                           |
| French workspace stress               | —          | `83:2008`  | US3–US4; FR-010, FR-014, FR-022, FR-031, FR-045–FR-046, FR-052–FR-053; SC-004, SC-007, SC-012                       |
| Not found — authenticated             | `255:7739` | `255:7765` | FR-008, FR-016, FR-047, FR-052–FR-055; SC-008, SC-011–SC-012, SC-015                                                |
| Not found — unauthenticated           | `258:7813` | `258:7835` | FR-008, FR-016, FR-047, FR-052–FR-055; SC-008, SC-011–SC-012, SC-015                                                |

Component-state matrices on the business-pattern pages provide the complete reachable state coverage referenced by
these product frames, including authentication feedback, patient loading and pagination, upload states, printing
lifecycle, and degraded refresh.

## Handoff validation

- The Ready page contains 31 canonical frames in three sections: core scenarios, French localization stress, and
  system fallback.
- Every product frame is exactly `1440 × 900` or `390 × 900` and retains its original node ID after promotion.
- Structural inspection found no frame overlap, section overflow, broken instance, or active placeholder.
- Visual inspection covered every Ready section and both responsive viewports.
- `500 - In Design` is empty after canonical promotion; no independent design copies remain.
- Promotion to `700 - Shipped` requires delivered runtime comparison, accessibility review, and final visual
  reconciliation.
