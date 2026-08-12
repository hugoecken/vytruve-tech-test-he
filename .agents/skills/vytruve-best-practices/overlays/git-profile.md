# Vytruve Git Profile

## Integration model

- Use `main` as the protected integration branch.
- Track execution through the repository's GitHub issues and pull requests.
- Use one reviewable branch and pull request per issue unless an accepted plan deliberately combines a tightly
  coupled delivery.
- Do not introduce a GitHub Project roadmap, custom lifecycle engine, Markdown delivery board, or automatic
  Spec Kit-to-issue conversion.

## Branches and commits

- Issue #1 branch: `chore/sdd-governance`.
- Use short role-prefixed branches such as `docs/product-specification`, `design/product-experience`,
  `chore/foundation`, `feat/backend-auth-patients`, and `test/backend-verification`.
- Use focused conventional commits in English.
- A commit boundary represents a coherent, valid state; do not manufacture history through empty, corrective-noise,
  or retrospective placeholder commits.
- Stage only intended paths and preserve unrelated user work.

## Specification binding

- Human acceptance and Git integration are separate gates.
- After the accepted candidate is merged, record its repository-relative path, full commit, requirement IDs, and
  success-criterion IDs in each owning implementation issue.
- Never change a binding implicitly or infer acceptance from a branch, pull request, checkmark, or Figma page.

## Pull requests

Each pull request states:

- the owning issue and exact delivered scope;
- accepted specification and plan bindings when applicable;
- important decisions and proportional trade-offs;
- validation commands and results;
- generated or protected-artifact checks;
- deliberately deferred work.

Creating or mutating branches, commits, pushes, issues, pull requests, reviews, or merges requires explicit user
authorization. Spec Kit artifacts never delegate that authority.
