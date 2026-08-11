# Git Workflow

## Delivery units

- Load the repository Git overlay for its integration branch, delivery lots, branch names, and publication rules.
- Make each delivery unit coherent, reviewable, and independently validated.
- Do not add roadmap governance or subdivide work into issues that do not produce a reviewable outcome unless the repository explicitly requires it.

## Working sequence

1. Start from an up-to-date `main` when authorized.
2. Create a short branch for the current delivery unit.
3. Make focused changes and validate them before staging.
4. Stage only intended files and inspect the staged diff.
5. Commit an atomic coherent state with an English conventional message.
6. Push and open a pull request only when explicitly authorized.

## Hygiene

- Never discard or rewrite user work to clean the tree.
- Never commit `.env`, credentials, runtime uploads, personal data, logs, database files, caches, or ignored generated artifacts.
- Keep the package lock in the same commit as dependency changes.
- Avoid drive-by formatting and unrelated refactors.
- Use a dedicated fix commit during review unless the user explicitly requests history rewriting.

## Review content

An issue or pull request should be concise and explain scope, important decisions, validation, manual verification, and deferred trade-offs. Link the issue from the pull request when used. Do not claim a check passed unless its exact command completed successfully.
