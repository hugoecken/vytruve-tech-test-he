# Design Handoff: Orthoprosthetist Printing Workflow

**Status**: Accepted

**Canonical Figma file**: [Vytruve — Product Design](https://www.figma.com/design/1c0CXC7lQwsS8SqhEc7sd6)

**Visual authority**: `600 - Ready for Development`, bound by the repository [design profile](../../.agents/skills/vytruve-best-practices/overlays/design-profile.md). This handoff translates accepted composition into runtime ownership without changing product intent or Figma.

## Route And Screen Mapping

| Route | Access | Primary Figma evidence | Runtime composition |
| --- | --- | --- | --- |
| `/sign-in` | Public-only | `80:4`, `80:5` | `Authentication`, sign-in form, safe redirect search |
| `/sign-up` | Public-only | `80:143`, `80:144` | `Authentication`, account form with local password confirmation |
| `/patients` | Authenticated | `80:413`, `80:414`, `80:1082`, `80:1083` | `AppShell`, patient directory, creation Dialog/Drawer |
| `/patients/$patientId` | Authenticated | `81:1625`, `81:1626` | Patient identity, patient-section Tabs, exactly one table panel |
| Public not found | Public | `258:7813`, `258:7835` | `NotFound` returning safely to `/sign-in` |
| Authenticated not found or unavailable deep link | Authenticated | `255:7739`, `255:7765` | `NotFound` returning safely to `/patients` |

TanStack Router file routes use a public-only auth layout and a pathless authenticated layout. `beforeLoad` resolves session state before protected composition and retains only a validated internal pathname for post-authentication return.

## Ready Frame Matrix

Node URLs follow `https://www.figma.com/design/1c0CXC7lQwsS8SqhEc7sd6?node-id=<colon-replaced-with-hyphen>`.

| Scenario | Desktop | Compact | Runtime owner |
| --- | --- | --- | --- |
| Sign in | `80:4` | `80:5` | `modules/auth` |
| Create account | `80:143` | `80:144` | `modules/auth` |
| Patient directory list | `80:413` | `80:414` | `modules/patients` |
| Patient loading and empty | `80:1082` | `80:1083` | `modules/patients` |
| Patient creation | `81:1106` | `81:1107` | `modules/patients` |
| Populated patient workspace | `81:1625` | `81:1626` | patient route composition |
| Scan upload — selection | `186:3938` | `186:4130` | `modules/scans` |
| Scan upload — valid file | `193:3` | `193:539` | `modules/scans` |
| Scan upload — recoverable error | `203:7839` | `203:7919` | `modules/scans` |
| Print submission and lifecycle | `81:1827` | `81:1828` | `modules/printing` |
| Degraded workspace refresh | `81:1969` | `81:1970` | Query error presentation in patient workspace |
| Profile menu | `117:4993` | `117:4995` | shared application header plus auth/i18n actions |
| French account stress | — | `83:1808` | `modules/auth` locale verification |
| French directory stress | `83:1853` | — | `modules/patients` locale verification |
| French workspace stress | — | `83:2008` | patient workspace locale verification |
| Authenticated not found | `255:7739` | `255:7765` | authenticated fallback route |
| Public not found | `258:7813` | `258:7835` | root fallback route |

## Viewports And Layout

| Mode | Viewport | Content rule | Outer spacing |
| --- | --- | --- | --- |
| Desktop | `1440 × 900` | Maximum application width `1200` | `64px` |
| Compact | `390 × 900` | Fluid content width | `16px` |

- The header spans the viewport while its content follows the selected application-width rule.
- Authentication is split-panel on desktop and compactly stacked on mobile; desktop form content is vertically centered in its white panel.
- Collections remain semantic tables at both sizes. Compact layouts preserve identity and actions and use horizontal overflow when columns cannot fit.
- Every compact target is at least `44px`; focus remains visible without layout shift.

## Design Tokens

### Colors

| CSS token | Value | Usage |
| --- | --- | --- |
| `--background` | `#F7FAF9` | Application background |
| `--surface` | `#FFFFFF` | Cards, tables, dialogs, drawers |
| `--foreground` | `#163130` | Primary text and icons |
| `--muted-foreground` | `#637775` | Secondary copy |
| `--border` | `#D7E3E1` | Dividers and control borders |
| `--focus`, `--ring` | `#0D9488` | Focus indication |
| `--primary` | `#0F766E` | Primary actions |
| `--primary-hover` | `#115E59` | Primary hover |
| `--primary-foreground` | `#FFFFFF` | Primary action content |
| `--accent`, `--secondary` | `#CCFBF1` | Selected/supporting emphasis |
| `--muted-emphasis` | `#EEF2F1` | Inactive tab and subtle emphasis |
| `--success` | `#15803D` | Success status with text/icon |
| `--warning` | `#B45309` | Warning status with text/icon |
| `--danger`, `--destructive` | `#B42318` | Destructive/error semantics |
| `--danger-muted` | `#FEF2F2` | Error surface |
| `--info` | `#2563EB` | Informational status |
| `--overlay` | `rgb(22 49 48 / 28%)` | Dialog/drawer backdrop |

Tailwind semantic tokens alias these CSS variables. Product code never uses primitive brand hex values directly.

### Typography, spacing, radius, and effects

- Font family: Geist with Inter fallback.
- Type scale: `40/48`, `32/40`, `24/32`, `20/28`, `16/24`, `14/20`, `12/16`.
- Spacing scale: `4`, `8`, `12`, `16`, `20`, `24`, `32`, `40`, `48`, `64`.
- Radius scale: `8`, `16`, `20`, `24`, `999`; `16px` is the default product surface radius.
- Control heights: `44px` default, `36px` compact; default icon size `24px`.
- One soft elevation: `0 8px 24px -8px rgb(22 49 48 / 10%)`.

## Component Ownership

### Shared shadcn/ui source

Store local source components under `apps/web/src/shared/ui/`. Import only what the accepted flows use:

- `Button`, `Input`, `Field`, and `Select`
- `Table` primitives
- `Dialog`, `Drawer`, `DropdownMenu`, and `Tabs`
- `Badge`, `Progress`, `Alert`, `Toast`, `Skeleton`, and `Spinner`
- `Card` and single-file `Attachment`

The local registry source is owned application code after generation. Preserve its semantics and accessibility; do not wrap each primitive mechanically.

### Shared composed components

| Component | Responsibility | Excludes |
| --- | --- | --- |
| `AppShell` | Header and main content frame | Feature navigation or dashboard |
| `AppHeader` | Brand mark and profile trigger | Inline language or sign-out actions |
| `ProfileMenu` | Language selection and sign-out | Account management |
| `NotFound` | Neutral fallback and one safe return | Resource-existence detail |
| `CursorTableShell` | Surface, horizontal overflow, body slot, Previous/Page/Next | Columns, sorting, filtering, selection, totals |
| `CursorPagination` | Local page index and cursor-history controls | Server totals or reverse cursor invention |

### Feature compositions

| Feature | Components |
| --- | --- |
| Authentication | `Authentication`, `SignInForm`, `SignUpForm`, `AuthenticationFeedback` |
| Patients | `PatientDirectory`, `PatientTable`, `PatientCreationDialog`, `PatientCreationDrawer`, `PatientForm` |
| Scans | `ScanTable`, `ScanUploadDialog`, `ScanUploadDrawer`, `ScanAttachment` |
| Printing | `PrintTable`, `PrintRequestDialog`, `PrintRequestDrawer`, `PrintRequestSummary` |
| Patient workspace | `PatientIdentity`, `PatientSectionTabs`, active feature panel |

Feature components compose shared primitives. They are not copied visual implementations.

## Table Contract

TanStack Table is headless and shadcn Table is visual.

| Table | Desktop columns | Compact essentials |
| --- | --- | --- |
| Patients | Patient, Age, Created, Action | Patient, Age, Action; created date remains available through horizontal access when retained |
| Scans | 3D scan, Format, Size, Uploaded, Actions | 3D scan, Format, Actions; size/date remain horizontally accessible |
| Prints | Reference, 3D scan, Status, Estimated progress, Production start | Reference, Status, Estimated progress; remaining columns remain horizontally accessible |

- Headers and cell content share the same left inset for every column, including actions.
- Row separators extend across the full rendered table width.
- Action icons use accessible names and 44px compact hit targets even when the glyph is smaller.
- The shell renders `Previous · Page n · Next`, with no total, row count, selection count, page-size selector, sorting, search, or column controls.
- Previous navigates only among already fetched TanStack Query pages; Next uses `pageInfo.nextCursor` when needed.

## Patient Workspace Tabs

- Use the local shadcn Tabs source and the `PatientSectionTabs` composition.
- Patient identity remains visible above the tab list.
- `3D scans` is selected by default; only one table panel is mounted visibly at a time.
- After a successful print mutation, activate `Print requests` and surface the accepted row.
- Compact triggers divide the full available width and keep a minimum 44px height.
- Selected text uses foreground, not green text; the inactive trigger uses `--muted-emphasis`.
- No separator line, nested route, sidebar, or third placeholder section is introduced.

## Forms And Feedback

- React Hook Form owns field state, focus, and submission state.
- Generated Zod Mini request schemas validate JSON constraints. Local composition validates confirmation and grapheme/trim rules.
- Validation summary never replaces field association. Focus moves to the first invalid control after submit.
- Error copy comes from stable Problem Details or local validation codes; generated messages remain internal.
- Recoverable background read failures keep existing content and show one non-blocking warning with an explicit retry.
- Success toasts may dismiss automatically. Error feedback remains until acknowledged or the failing context changes.

## Overlay Behavior

- Desktop bounded actions use shadcn Dialog plus the accepted modal backdrop.
- Compact bounded actions use shadcn Drawer as a bottom sheet.
- Dialog and Drawer share the same semantic content component, validation, and action ordering.
- Drawers include bottom safe-area padding and at least `24px` between the action row and sheet edge.
- Upload surfaces accept exactly one file. The Attachment spans the available content width and exposes remove; upload-failure state additionally exposes deliberate retry.
- The primary confirmation action is disabled until valid submission input exists.

## Icons And Brand

- Use Lucide React for interface icons: `CirclePlus`, `UserRound`, `CloudUpload`, `Download`, `Printer`, `ChevronLeft`, `ChevronRight`, `CircleCheck`, `CircleX`, `CircleAlert`, `Clock`, `RefreshCw`, `Languages`, and `LogOut`.
- Icon color follows the button or control foreground token, including disabled upload actions.
- Use the repository brand asset in a square container; do not substitute the logo for action-specific Lucide icons such as Print.
- Every icon-only action has an accessible name and visible focus.

## Localization

- English and French strings live in feature-scoped i18next resources.
- The browser selects the initial supported locale; unsupported locales fall back to English.
- Only the authenticated profile menu exposes manual selection.
- Persist only the locale identifier in non-sensitive local storage.
- Use `Intl` for date, number, byte-size, age, and percentage presentation.
- Preserve the French stress frames as layout acceptance evidence; do not concatenate translated fragments.

## Implementation Review Checklist

- [ ] Each route matches one accepted destination or fallback.
- [ ] Every composed screen is traceable to the frame matrix above.
- [ ] Semantic tokens match exact values; no product hex values are hardcoded.
- [ ] shadcn/ui owns visual primitives; TanStack Table remains headless.
- [ ] Desktop and compact collections remain tables with aligned headers/cells and full-width separators.
- [ ] Patient identity and the two-section tab invariant remain intact.
- [ ] Dialog/Drawer pairs reuse one content component and preserve spacing/focus behavior.
- [ ] English and French copy survive their accepted stress frames.
- [ ] Keyboard, focus, announcements, touch targets, and non-color status cues match FR-052–FR-053.
- [ ] No protected or provider data appears in UI, analytics, logs, fixtures, or screenshots.
