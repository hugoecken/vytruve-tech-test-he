# Risk-Based Validation Policy

## Select checks before editing

Choose validation based on the boundary changed, not the file count.

| Change                          | Minimum focused validation                                             | Broader validation trigger                     |
| ------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------- |
| Documentation or agent guidance | skill/link checks, Markdown formatting, `git diff --check`             | Router, authority, or command changes          |
| React component or form         | affected unit tests, lint, type-check                                  | Shared UI, routing, auth, generated types      |
| Nest provider or controller     | affected Jest tests, lint, type-check                                  | Global pipes, guards, filters, public contract |
| HTTP contract                   | backend tests, OpenAPI emission, Orval generation, frontend type-check | Breaking shape or shared error behavior        |
| Entity or migration             | full migration chain on PostgreSQL, persistence tests                  | Constraints, relations, destructive changes    |
| Authentication or authorization | focused unit tests for owned decisions                                | Cookie, guard, CORS, ownership, secrets        |
| File storage                    | validation, compensation, authorization, streaming tests               | Format, path handling, or storage-root changes |
| External HTTP adapter           | adapter contract tests and application failure tests                   | Timeout, retry, ambiguity, status mapping      |
| Nx or CI configuration          | affected targets plus a representative clean run                       | Dependency graph, cache inputs, generators     |

## Execution order

1. Run the narrow test that proves the changed behavior.
2. Run affected lint and type-check targets.
3. Run generation or migration checks when an authority changed.
4. Run affected builds and focused contract checks for integration-sensitive work.
5. Run `git diff --check` and inspect the final diff for secrets, personal data, uploads, and generated artifacts.

## Failure discipline

- Fix failures caused by the change.
- Do not suppress a check, weaken an assertion, or exclude a file merely to obtain green output.
- Report unrelated pre-existing failures separately with evidence.
- If a required check cannot run, state the exact blocker and the residual risk.

## Proportionality

Do not run every suite after every comment edit. Conversely, do not call a security, persistence, file, provider, or contract change complete based only on linting or a mocked unit test.
