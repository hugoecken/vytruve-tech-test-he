# Vytruve Repository Profile

This overlay supplies repository-specific values to portable policies. It does not accept optional product or
architecture decisions.

## Repository identity

- Repository: `hugoecken/vytruve-tech-test-he`
- Integration branch: `main`
- Artifact language: English
- User conversation language: French
- Package manager reserved for the executable workspace: npm
- Runtime reserved for the executable workspace: Node.js 24 LTS

## Authority order

1. Root `AGENTS.md` and the routed repository guidance govern agent behavior.
2. The supplied technical-test brief owns non-negotiable source requirements.
3. The explicitly accepted `specs/001-orthoprosthetist-printing-workflow/spec.md` snapshot owns observable MVP intent.
4. Accepted Figma evidence in `600 - Ready for Development` owns visual composition only within that specification.
5. The approved feature `plan.md` owns technical translation after issue #4.
6. GitHub issues and pull requests own execution scope, dependencies, review, and delivery state.
7. Current source, generated contracts, migrations, and tests own delivered executable behavior.

When a higher authority is missing or conflicts with a lower artifact, stop at the owning gate. Conversation state,
screenshots, local feature selection, and derived tasks are never parallel authorities.

## Current repository stage

- Issue #1 established governance.
- Issue #2 accepted the product specification at commit `2dd91218cf0d9114fd440efbfbd9843987c9036c`.
- Issue #3 produced explicitly approved responsive product evidence in `600 - Ready for Development` of the
  canonical Figma file.
- Issue #4 has an explicitly accepted technical plan that selects the executable application architecture. Runtime
  work still requires the merged immutable plan binding in its owning implementation issue.
- React and NestJS remain mandated by the supplied brief; the accepted plan owns every additional architecture choice.

## Accepted issue #4 decisions

The accepted issue #4 plan selects:

- native Fetch with Orval-generated TanStack Query hooks in a `tags-split` output;
- a second Orval output deriving Zod Mini v4 request schemas from the same OpenAPI document;
- React Hook Form with generated schemas for JSON mutation forms and focused local refinements only;
- TanStack Table as the headless table engine and shadcn/ui as the complete visual authority;
- dedicated testing ownership in issues #9, #12, and #13, with no implementation tests added by issues #5–#8,
  #10, or #11.

These values become executable authority only through the merged plan binding recorded in the owning implementation
issue.

## Repository paths

- Root instructions: `AGENTS.md`
- Project router: `.agents/skills/vytruve-best-practices/SKILL.md`
- Portable policies: `.agents/skills/vytruve-best-practices/references/`
- Repository overlays: `.agents/skills/vytruve-best-practices/overlays/`
- Spec Kit infrastructure: `.specify/`
- Future feature artifacts: `specs/001-orthoprosthetist-printing-workflow/`

## Source safety

The assessment materials contain contact details and a live provider credential. Read them only from the supplied
local evidence. Record safe functional traceability in issue #2 without committing those sensitive values or the raw
source documents.

## Portability boundary

- `references/` contains reusable technical policies only.
- `overlays/` contains this repository's names, paths, branches, versions, workflow phases, and future design
  coordinates.
- Before completing a guidance change, scan portable references for repository names, product vocabulary, provider
  details, paths, branches, ports, environment variables, issue identifiers, and design identifiers.
