# Vytruve Figma Profile

This overlay supplies repository-specific design values to the portable Figma and web policies.

## Authority

- Operational Roadmap: GitHub issues and pull requests. Issue #19 owns the Premium design-system reconciliation;
  issue #11 owns the later runtime implementation. No GitHub Project or parallel roadmap is required.
- Capability behavior and interaction authority: the accepted product specification at its exact owning Git commit.
- Accepted visual composition: exact nodes in the canonical Product Design file after explicit current-user approval.
- Delivered behavior and accessibility: current runtime source and supported responsive web surfaces.
- The pre-reconciliation Product Design file is read-only visual evidence during issue #19 and becomes historical
  evidence after the replacement is approved. Do not migrate, copy, or reuse its components as future-design
  authority.

No base style, palette, typography, radius, density, component treatment, product pattern, or screen composition is
approved by continuity from the vendor kit, historical design, or pre-reconciliation runtime.

## Canonical Design Set

- `Vytruve — UI Library` is the single shared library. It contains the adopted and configured shadcn.design Premium
  Pro kit, foundations, variables, styles, Lucide icons, reusable component masters, variants, and domain-neutral
  primitives. It preserves the vendor-native organization and update model and contains no Vytruve product screen.
  The authorized source file is the purchased August 2026 Pro kit in the Blockout Pro Vytruve folder. Its canonical
  URL is [Vytruve — UI Library](https://www.figma.com/design/9oqYbfn0vqiXIeCcE2lPTZ). It was configured from the
  August 2026 Pro kit on 2026-08-13 and published as library
  `lk-2230ded416e58006fdc929b532a360d5aa12fa04f58463b674b549628ce06125e17e35fc5340330e81e3b3b3c84154c821b7bd86103e5ac8289968555912b907`.
- `Vytruve — Product Design` is the single product-design file. It contains Vytruve product patterns, journeys,
  assembled screens, reachable states, responsive compositions, and lifecycle evidence. It consumes linked instances
  from the UI Library and does not duplicate library-owned components. Its canonical working URL is
  [Vytruve — Product Design](https://www.figma.com/design/tnvp3CFNnb4aC6VWTkK2BI). Product nodes remain candidates
  until explicit acceptance and promotion to `Ready for Development`.
- A product-semantic assembly remains a Product Design pattern. Only a proven domain-neutral reusable responsibility
  may extend the UI Library through separately owned scope.

During reconciliation, the existing [historical Product Design](https://www.figma.com/design/1c0CXC7lQwsS8SqhEc7sd6)
remains visual evidence only. It retains no component, token, or future-screen ownership.

## Accepted Product Design

- The Product Design contains 31 annotated frames in `Ready for Development`: 15 desktop frames at `1440 × 900` and
  16 compact frames at `390 × 900`.
- The accepted set contains 28 English frames and three French localization-stress frames.
- Native frame annotations preserve requirement and success-criterion traceability for accepted visual scenarios.
- Adopted product patterns cover authentication, the application header, profile actions, patient identity,
  server-paginated patient/scan/print tables, tabs, empty/loading/degraded states, file attachment states,
  dialogs, compact drawers, and authenticated/public fallbacks.
- Product patterns use linked Premium library instances for reusable visual components. Local components are limited
  to semantic Vytruve assemblies; no detached or unresolved instance is accepted.
- The current user explicitly approved the complete set on 2026-08-13. `In Design` and `Shipped` are empty.

Accepted frame IDs:

- Authentication: `95:3`, `95:42`, `95:78`, `95:123`, `95:165`.
- Patient directory: `96:260`, `96:392`, `96:502`, `96:626`, `96:738`, `96:794`, `96:849`, `96:899`, `96:924`.
- Patient workspace: `97:1152`, `97:1347`, `97:1502`, `97:1551`, `97:1599`, `97:1648`, `106:1955`, `106:2005`,
  `107:2159`, `107:2432`, `108:2461`, `108:2601`, `109:2700`.
- Resource fallbacks: `116:2791`, `116:2875`, `116:2947`, `116:3031`.

## Product Design Organization

Use these durable pages in order:

1. `Cover`
2. `Patterns`
3. `In Design`
4. `Ready for Development`
5. `Shipped`

Use `Exploration` only as a temporary page for an active bounded design question. It is not a lifecycle state and may
be absent. Selected work moves to `In Design`; rejected, superseded, or inconclusive alternatives are removed.

`In Design → Ready for Development → Shipped` is the only product-design lifecycle. Promotion to Ready for Development
requires explicit current-user approval and resolved frame-level traceability. Promotion to Shipped requires
implementation, supported-platform comparison, accessibility review, and final visual reconciliation.

## Library Adoption

- Preserve the complete eligible vendor kit and all supplied visual modes. Select Nova Style, Light Mode, and Lucide
  as the active Vytruve assessment configuration.
- Keep Lucide as the sole icon library after applying the vendor's documented icon-selection procedure.
- Use the vendor's native Tailwind, Style, Mode, and Typeset collections, styles, components, variants, slots,
  customization model, and update procedure.
- Customize colors only in issue #19. Keep vendor typography, radius, spacing, density, shadows, structure, and
  component APIs unchanged.
- Use the accepted Clinical Teal values through the vendor Style-to-Mode alias chain: primary `#0F766E`, primary hover
  `#115E59`, accent `#CCFBF1`, background `#F7FAF9`, surface `#FFFFFF`, foreground `#163130`, muted foreground
  `#637775`, border `#D7E3E1`, focus `#0D9488`, success `#15803D`, warning `#B45309`, danger `#B42318`, and info
  `#2563EB`.
- Treat examples, blocks, templates, and plugin output as optional composition material, never as product behavior or
  automatic implementation authority.

## Licensed Workflow Boundary

- Registry namespace: `@shadcndesign`, authenticated only through the ignored local
  `SHADCNDESIGN_LICENSE_KEY` value.
- Selected runtime compatibility: React 19, Tailwind CSS 4, Base UI, Nova, CSS variables, and Lucide.
- Vendor Agent Skills are local licensed inputs. Keep their payloads, customer material, caches, and authentication
  state outside Git. Repository guidance and the accepted specification take precedence over vendor instructions.
- The `@shadcndesign/skills-codex` registry item was retrieved through the authenticated shadcn CLI on 2026-08-13.
  Its ignored local payload is identified by these SHA-256 checksums:
  - `generate-code/SKILL.md`: `0d6c9dafa82536379e9814cdde115e4fd594bcb6ddc8280d05874750e1c65a76`;
  - `import-variables/SKILL.md`: `399ca608c1ac961691bfbbcd6cf2516d527fde0dc112a931c551c4925de9554c`;
  - `import-variables/scripts/convert-colors.js`:
    `8924929d48ae88a052f27b26ad3bb45da3dfe621ea180093ed3617ae4ab9501b`.
- Record the exact kit version, retrieval date, publication state, component lineage, active modes, accepted Product
  Design frame IDs, and future Tailwind variable mapping after final validation.
- The initial publication reported 33 vendor-owned unused-property warnings. They do not invalidate the library and
  must not be "fixed" by altering the purchased component API without a separately reviewed vendor-update task.
- Intake a later vendor update only through an explicitly owned task that records version evidence, reviews licensing,
  inspects affected consumers, and invalidates only approvals affected by material component changes.

## Deferred Integration

Application product screens, code generation, bulk Premium blocks or templates, token export, variable
synchronization, generated application assets, and Code Connect remain unavailable until separately owned work
activates them against stable Figma and runtime components.
