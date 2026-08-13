# Design Handoff: Orthoprosthetist Printing Workflow

**Status**: Accepted

**Canonical Figma file**: [Vytruve — Product Design](https://www.figma.com/design/tnvp3CFNnb4aC6VWTkK2BI)

**Visual authority**: the exact accepted nodes in `Ready for Development`, bound by the repository [Figma profile](../../.agents/skills/vytruve-best-practices/overlays/figma-profile.md). The former Product Design is historical evidence only.

## Route And Screen Mapping

| Route | Access | Primary Figma evidence | Runtime composition |
| --- | --- | --- | --- |
| `/sign-in` | Public-only | `95:3`, `95:42` | `Authentication`, sign-in form, safe redirect search |
| `/sign-up` | Public-only | `95:78`, `95:123` | `Authentication`, account form with local password confirmation |
| `/patients` | Authenticated | `96:260`, `96:392`, `96:502`, `96:626` | `AppShell`, patient directory, creation Dialog/Drawer |
| `/patients/$patientId` | Authenticated | `97:1152`, `97:1347` | Patient identity, patient-section Tabs, exactly one table panel |
| Public not found | Public | `116:2947`, `116:3031` | `NotFound` returning safely to `/sign-in` |
| Authenticated not found or unavailable deep link | Authenticated | `116:2791`, `116:2875` | `NotFound` returning safely to `/patients` |

TanStack Router file routes use a public-only auth layout and a pathless authenticated layout. `beforeLoad` resolves session state before protected composition and retains only a validated internal pathname for post-authentication return.

## Ready Frame Matrix

Node URLs follow `https://www.figma.com/design/tnvp3CFNnb4aC6VWTkK2BI?node-id=<colon-replaced-with-hyphen>`.

| Scenario | Desktop | Compact | Runtime owner |
| --- | --- | --- | --- |
| Sign in | `95:3` | `95:42` | `modules/auth` |
| Create account | `95:78` | `95:123` | `modules/auth` |
| Patient directory list | `96:260` | `96:392` | `modules/patients` |
| Patient loading and empty | `96:502` | `96:626` | `modules/patients` |
| Patient creation | `96:738` | `96:794` | `modules/patients` |
| Populated patient workspace | `97:1152` | `97:1347` | patient route composition |
| Scan upload — selection | `97:1502` | `97:1551` | `modules/scans` |
| Scan upload — valid file | `97:1599` | `97:1648` | `modules/scans` |
| Scan upload — recoverable error | `106:1955` | `106:2005` | `modules/scans` |
| Print submission and lifecycle | `107:2159` | `107:2432` | `modules/printing` |
| Degraded workspace refresh | `108:2461` | `108:2601` | Query error presentation in patient workspace |
| Profile menu | `96:849` | `96:899` | shared application header plus auth/i18n actions |
| French account stress | — | `95:165` | `modules/auth` locale verification |
| French directory stress | `96:924` | — | `modules/patients` locale verification |
| French workspace stress | — | `109:2700` | patient workspace locale verification |
| Authenticated not found | `116:2791` | `116:2875` | authenticated fallback route |
| Public not found | `116:2947` | `116:3031` | root fallback route |

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

- Consume the published UI Library variables and styles directly; do not duplicate their numeric values in the
  Product Design or application feature layers.
- Issue #19 customizes only the Clinical Teal color aliases. Typography, spacing, radius, density, shadows, component
  structure, and variant APIs remain vendor-native.
- Preserve the minimum `44px` compact interaction target required by the accepted specification without changing the
  visual API of the underlying Premium component.

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
| `ServerPaginatedTableShell` | Surface, horizontal overflow, body slot, Previous/Page/Next | Columns, sorting, filtering, selection, totals |
| `ServerPagination` | Controlled page index and page-size state | Server totals or arbitrary page-count invention |

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
- Previous decrements the controlled page index; Next increments it only when `pageInfo.hasNext` is true.

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
- Use the official Vytruve wordmark asset. Select its light or dark treatment for sufficient contrast instead of
  placing an artificial background behind it. Do not substitute the brand for action-specific Lucide icons such as
  Print.
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
