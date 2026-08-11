# Repository Figma Interaction Policy

Read this policy before any task that reads from, writes to, compares against, or makes a product decision in Figma.

## Authority

- The repository overlay names the only canonical design file and supported product surfaces.
- Accepted product requirements and runtime contracts own behavior, routes, permissions, data flow, copy obligations, accessibility, and reachable states.
- The canonical Figma file owns visual composition, tokens, component APIs, and approved screen specifications.
- Runtime source owns delivered behavior. Figma never activates a capability that the product requirements or code do not support.
- Keep product names, file URLs, viewports, fonts, icon libraries, and lifecycle page names in the repository overlay.

## Entry gate

1. Read the repository design overlay, product scope, relevant runtime source, and applicable Figma skills.
2. Classify the task as visual discovery, code-to-Figma calibration, Figma-to-code implementation, or visual reconciliation.
3. Inspect existing variables, styles, components, pages, and subscribed libraries before writing.
4. Build a bounded source-to-Figma inventory: tokens, component responsibilities, variants, states, slots, viewports, and ownership.
5. Stop only for an unresolved decision that materially changes behavior, ownership, token semantics, responsive intent, or provider state.

## File hierarchy

- Use three-digit numeric prefixes so page order remains stable and categories can grow without a file-wide rename.
- `000–099`: orientation. Keep `000 - Cover` first.
- `100–199`: foundations. Use `100 - Foundations`, then `110 - Colors`, `120 - Typography`, `130 - Spacing & Layout`, `140 - Radius & Effects`, and `150 - Icons` when content justifies dedicated pages.
- `210–219`: actions.
- `220–229`: status and badges.
- `230–239`: inputs.
- `240–249`: navigation.
- `250–259`: feedback.
- `260–269`: data display.
- `270–279`: overlays.
- `280–289`: structure and application shell.
- `300–399`: evidenced cross-component patterns.
- Use unnumbered `---` divider pages between foundations, reusable assets, patterns, and lifecycle pages.
- The overlay defines lifecycle page names and promotion gates.
- Do not create speculative category pages solely to occupy a reserved number. An explicitly requested library scaffold may create empty lifecycle pages because they carry durable workflow meaning.

## Token system

- Use a primitive-to-semantic variable chain for systems large enough to benefit from it.
- Primitive colors store raw values, have empty scopes, and are never bound directly to product components.
- Semantic colors alias primitives and use precise scopes such as frame fill, text fill, or stroke.
- Spacing, radius, border, size, and typography variables use their matching Figma scopes.
- Every local variable defines exact platform code syntax. Web CSS syntax includes the complete `var(--token-name)` expression.
- Never use `ALL_SCOPES`.
- Use modes only for themes or dimensions the product actually supports. Do not create a dark theme merely to demonstrate theming.
- Composite typography becomes text styles; shadows become effect styles.
- Documentation swatches and samples bind to the real variables and styles rather than duplicating raw values.

## Component ownership

- Build in dependency order: icons and small primitives before controls, controls before composed patterns.
- Reuse a matching component or library asset when its responsibility, variant API, and token model align. Otherwise create one canonical owner.
- Public component names use PascalCase. Internal subcomponents use an underscore-prefixed namespace.
- Match code props where practical: Figma uses readable `Property=Value` variants while Code Connect or documentation records exact code identifiers.
- Keep variant matrices below 30 combinations. Use component properties, instance swaps, sibling families, or internal building blocks instead of a Cartesian explosion.
- Use text properties for editable labels, booleans for optional slots, and instance swaps for icons.
- Every reusable visual property binds to a semantic variable or style. Do not hardcode a value that already has a token.
- Keep repeated controls as components and genuinely unique business composition local.
- Do not detach an instance to patch a shared defect. Correct the owning token or main component first.

## State and interaction coverage

- Model every reachable state that changes appearance, semantics, accessibility, or interaction: default, hover, focus-visible, pressed, selected, disabled, loading, invalid, warning, success, and destructive where applicable.
- Do not manufacture unsupported combinations. Document why an inapplicable combination is absent.
- Preserve a minimum 44-pixel interactive target for pointer and touch use unless platform evidence requires a different target.
- Static Figma states demonstrate appearance only. Runtime tests remain responsible for keyboard behavior, focus management, announcements, navigation, and provider interaction.

## Lifecycle

- New or materially revised screens start on the exploratory lifecycle page declared by the overlay.
- An agent must not self-approve a screen because it looks plausible.
- Promotion to a development-ready page requires explicit human approval of purpose, hierarchy, component use, state coverage, copy, responsive composition, and visual direction.
- Promotion to shipped requires delivered runtime comparison, accessibility review, and final visual reconciliation.
- Move canonical nodes between lifecycle pages rather than maintaining independent copies.

## Mutation protocol

- Keep writes sequential, incremental, idempotent, and bounded to the owning page or node.
- Return every created or mutated node ID and retain them in transient workflow state.
- Switch pages at most once per Figma execution. Split work by page when several pages are involved.
- After each mutation, verify node existence, naming, bounds, variable bindings, font status, and component lineage before continuing.
- Stop on a failed mutation, ambiguous result, missing prerequisite, or genuine decision fork. Never continue writing blindly.
- Never approximate an existing icon with primitive lines; import or reuse an editable vector.

## Documentation

- Give every foundation or component page a clear title, responsibility, usage guidance, and relevant accessibility notes.
- Keep documentation outside component bounds and use a consistent 1440-pixel documentation frame unless the overlay states otherwise.
- Document intent and non-obvious constraints, not transient task history.
- Include code syntax beside token samples so implementation can reproduce the design exactly.

## Validation

Run both passes before handoff:

### Structural pass

- Verify page order, node names, dimensions, auto-layout, component properties, variant counts, variable scopes, aliases, code syntax, text/effect styles, font availability, and instance lineage.
- Confirm every semantic alias resolves and no variable uses `ALL_SCOPES`.
- Confirm no duplicate owner, detached repair, placeholder, clipped content, or overlapping top-level node remains.

### Visual pass

- Render the complete foundation or component page after its final mutation.
- Check alignment, wrapping, contrast, interactive target size, padding, gaps, borders, radii, shadows, state differentiation, and component-set bounds.
- When implementation exists, compare Figma and runtime at the same logical viewport, theme, authentication mode, and sanitized state.
- A visually plausible screenshot without structural evidence is insufficient, and structural metadata without a rendered review is insufficient.

## Privacy and closure

- Use synthetic content only. Never place credentials, patient data, private identifiers, uploaded content, tokens, or production payloads in Figma.
- Keep transient screenshots and local workflow state outside Git.
- Report the canonical file, changed node IDs, validations, intentional omissions, and unresolved external limitations.
- Do not introduce automatic or bidirectional Figma/code synchronization.
- Use Code Connect only when the overlay authorizes it and stable published components exist.
