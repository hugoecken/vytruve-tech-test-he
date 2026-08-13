# Vytruve Figma Profile

This overlay defines repository-specific Figma governance. It deliberately contains no visual snapshot; inspect the
canonical Figma files for current composition, components, and tokens.

## Authority Boundaries

- [`spec.md`](../../../../specs/001-orthoprosthetist-printing-workflow/spec.md) owns observable product behavior and
  acceptance criteria.
- [`plan.md`](../../../../specs/001-orthoprosthetist-printing-workflow/plan.md) owns architecture and implementation
  strategy.
- `Vytruve — Product Design` owns the accepted visual composition of product screens.
- `Vytruve — UI Library` owns reusable visual components, variants, styles, and design tokens.
- Runtime CSS owns the application implementation of the UI Library tokens; it does not become a second design
  authority.
- GitHub issues and pull requests own design and implementation execution scope. They do not create a parallel visual
  roadmap.

## Canonical Figma Files

- [Vytruve — UI Library](https://www.figma.com/design/9oqYbfn0vqiXIeCcE2lPTZ) is the single shared component and
  token authority. It adopts the purchased shadcn.design Premium kit with the repository-selected Nova, Light, and
  Lucide configuration.
- [Vytruve — Product Design](https://www.figma.com/design/tnvp3CFNnb4aC6VWTkK2BI) is the single product-screen
  authority. Its explicitly approved work in `Ready for Development` is accepted for implementation.

## Consumption Rules

- Build product screens from linked UI Library instances whenever a matching library responsibility exists.
- Keep product-semantic assemblies in Product Design and domain-neutral primitives in the UI Library.
- Do not detach instances, redraw an available library component, duplicate tokens, or hardcode a visual value when
  the UI Library exposes an appropriate variable or style.
- Inspect the current canonical Figma source instead of copying visual values, component inventories, frame IDs, or
  screen geometry into Spec Kit artifacts or repository guidance.
- Return discoveries that change observable behavior to `spec.md`. Review visual-only changes in Product Design and
  update runtime CSS or components only through their owning implementation scope.

## Status

The current Product Design has explicit user approval for implementation. Promotion to `Shipped` remains gated by
runtime implementation, supported-viewport comparison, and accessibility review.
