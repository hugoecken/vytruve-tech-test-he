# Vytruve Product Design Profile

## Current authority

- No canonical Figma product-design file exists during issue #1.
- Issue #3 creates the canonical file only after issue #2's specification is accepted.
- Product screens start from a blank canvas; only approved external component assets may be imported.

## Intended lifecycle

- Foundations and reusable assets precede composed business patterns.
- Product screens begin in `400 - Exploration`.
- Explicit human approval is required for promotion to `500 - In Design`, `600 - Ready for Development`, and
  `700 - Shipped`.
- Every screen and meaningful state cites applicable user-story, `FR-xxx`, and `SC-xxx` identifiers.
- A design discovery that changes observable intent returns to the candidate specification before promotion.

## Intended visual and component direction

- Audience: orthoprosthetics and clinical 3D-printing professionals.
- Direction: restrained MedTech clarity, operational confidence, legibility, efficiency, accessible contrast, and a
  modest distinctive character without decorative excess.
- Implementation reference: shadcn/ui with Tailwind-compatible semantic tokens and Lucide icons.
- External Figma reference: inspect the selected Shadcn Design resource during issue #3 and import only components
  required by the accepted workflows.
- Imported assets must become reusable Figma components with properties, variants, Auto Layout, nested instances,
  and token bindings; screenshots and flattened copies are not acceptable.

Issue #3 will record the final file URL, page names, viewports, token values, component inventory, and accepted frame
identifiers. Do not invent those values before that issue.
