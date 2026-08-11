# Vytruve Repository Instructions

These instructions apply to the entire repository.

## Communication and language

- Speak French with the user.
- Write source code, configuration, documentation, specification artifacts, commit messages, issues, and pull
  requests in English unless the user explicitly requests otherwise.
- Keep technical tokens, identifiers, protocol values, and cited source wording exact.

## Required guidance

- Start every repository task by reading `.agents/skills/vytruve-best-practices/SKILL.md` and only the references it
  routes for the affected boundary.
- Keep `.agents/skills/vytruve-best-practices/references/` portable. Put repository, product, runtime, provider,
  branch, path, port, and design identities in `overlays/`.
- Treat the supplied technical-test brief as the non-negotiable product source. Do not commit its contact details or
  supplied credentials.
- Treat accepted Spec Kit artifacts, GitHub execution items, Figma evidence, plans, source contracts, and tests
  according to the authority order defined by the repository profile.
- Fail closed when required intent, acceptance, planning, source evidence, or authorization is missing.

## Specification-driven delivery

- Do not implement observable product behavior before its exact `spec.md` snapshot is explicitly accepted.
- Do not implement runtime architecture before the matching `plan.md` is approved.
- Keep `tasks.md` derived and local to one feature; never convert it automatically into GitHub issues.
- Keep `.specify/feature.json` local and ignored. It selects a working feature but owns no shared state.
- Return design or implementation discoveries that change user-visible intent to the specification before continuing.

## Delivery standard

- Optimize for a focused technical assessment: production-minded, readable, testable, and secure without speculative
  infrastructure or empty abstractions.
- Prefer official framework primitives and repository-configured tools over custom mechanisms.
- Add a layer only when it owns a real responsibility or protects a meaningful boundary.
- Preserve user changes and keep commits and pull requests coherent and reviewable.
- Do not commit, push, create or edit issues, open pull requests, or merge unless the user explicitly authorizes it.

## Protected data and generated artifacts

- Never commit secrets, provider credentials, cookies, tokens, passwords, patient data, scan content, original
  filenames, local databases, logs, runtime storage, or supplied sample files.
- Use synthetic data in documentation, designs, tests, screenshots, and examples.
- Keep generated Spec Kit core files manifest-owned and manually immutable.
- Keep future OpenAPI and generated clients derivative, reproducible, ignored, and manually immutable unless an
  accepted plan deliberately changes that policy.

## Validation

- Select validation proportionally from the routed risk policy before editing.
- Run focused checks first and broaden them when a shared, security, contract, persistence, or workflow boundary
  changes.
- Always run `git diff --check` and inspect the final diff for protected data and generated-artifact violations.
- Report exactly what ran, what passed, what was skipped, and why.
