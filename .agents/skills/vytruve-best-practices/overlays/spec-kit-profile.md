# Vytruve Spec Kit Profile

This overlay supplies repository-specific values for the portable specification-driven-development policy.

## Pinned integration

- Supported release: `v0.15.0`
- Official source: `https://github.com/github/spec-kit.git@v0.15.0`
- CLI package: `specify-cli==0.15.0`
- Coding-agent integration: `codex` in skills mode
- Script type: `sh`
- Repository preset: `repository-governance==1.1.0`, priority `1`
- Core skills: `.agents/skills/speckit-*/SKILL.md`
- Shared infrastructure: `.specify/**`
- Local feature selector: `.specify/feature.json`, always ignored by Git

Install and initialize with:

```bash
uv tool install specify-cli --force --from git+https://github.com/github/spec-kit.git@v0.15.0
specify init --here --force --integration codex --integration-options="--skills" --script sh
```

Core skills, scripts, templates, workflows, and manifests are generated. Never edit them manually. Repository
adaptation uses the installed preset, this overlay, and the router.

The Codex integration status reports the ten `speckit-*` skills as modified because the registered preset
intentionally composes or replaces every command after the core manifest is written. This expected warning is valid
only when all ten skills declare generated Spec Kit provenance, the nine active commands contain the registered
repository preflight/completion guards, `speckit-taskstoissues` contains only the disabled body, and the shared Spec
Kit manifest reports no missing or modified files.

## Feature and identifiers

- MVP feature directory: `specs/001-orthoprosthetist-printing-workflow/`
- Source-requirement identifiers: `SR-001`, `SR-002`, ...
- Functional-requirement identifiers: `FR-001`, `FR-002`, ...
- Success-criterion identifiers: `SC-001`, `SC-002`, ...
- Specification and supporting human-facing artifacts: English
- Feature persistence: committed historical directory; delivered intent changes require a new feature directory

## Acceptance and binding

The current user must explicitly accept the exact candidate before its status changes to `Accepted`. After merge, the
owning implementation issue records:

```text
Specification: specs/001-orthoprosthetist-printing-workflow/spec.md @ <full-commit-sha>
Requirements: FR-001…FR-n
Success criteria: SC-001…SC-n
```

GitHub issue #2 owns specification authoring and acceptance evidence. GitHub issue #4 owns technical-plan approval.
Issues #5 onward own implementation scope. A changed binding invalidates dependent plans, tasks, evidence, and
approvals until explicitly reconciled.

## Applicability

- Governance-only issue #1 is an allowed no-spec change because it creates no product, experience, permission,
  contract, or runtime-architecture intent.
- Specification issue #2 may write only the candidate specification, clarifications, and requirements checklist.
- Product design issue #3 requires the accepted specification and may not introduce unrecorded observable intent.
- Planning issue #4 may create plan and derived artifacts for the accepted specification and approved design.
- Runtime issues require a valid specification binding, approved plan, GitHub scope, and routed source gates.

## Execution authority

- GitHub issues own priority, dependencies, assignment, scope, and delivery state.
- Pull requests own review of the exact implementation head.
- `tasks.md` is a derived checklist only.
- `speckit-taskstoissues` is disabled and must perform no mutation.
- Spec Kit performs no autonomous branch, issue, pull-request, review, merge, release, or Figma operation.

## Verification and upgrades

Use the pinned CLI to run `specify version`, `specify check`, `specify integration status`, `specify preset list`, and
`specify preset resolve`. Verify manifest hashes, generated-skill provenance, preset composition, the disabled
`taskstoissues` body, internal links, and portable-reference boundaries before publication.

Preview upgrades in isolation. Any version change requires its own GitHub scope, compatibility decision, CLI-driven
regeneration, and complete governance validation; never hand-merge generated upstream changes.
