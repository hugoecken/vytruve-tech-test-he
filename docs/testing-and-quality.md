# Testing and Quality

[Back to the main README](../README.md)

Tests protect owned behavior at observable boundaries. They do not re-test framework internals, contact the real
printing provider, or hide missing production evidence behind broad mocked coverage.

## Evidence layers

| Layer                   | Tooling                                  | What it proves                                                                                                               |
| ----------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| API unit tests          | Jest                                     | Authentication, authorization, validation, persistence decisions, scan rules, printing states, and failures.                 |
| Provider contract tests | Jest with a controlled HTTP server       | Request shape, credential boundary, response validation, timeout, and ambiguity handling without contacting production.      |
| Web feature tests       | Vitest, Testing Library, user-event, MSW | User-visible validation, routing, recovery states, uploads, downloads, printing, localization, and accessibility boundaries. |
| Contract generation     | Nest Swagger and Orval                   | The emitted OpenAPI document can regenerate the Web transport, types, and request schemas.                                   |
| Schema verification     | Liquibase against PostgreSQL             | The complete changelog validates and applies in order.                                                                       |
| Image verification      | Docker builds and revision health        | Production definitions build and the Web image reports its embedded revision.                                                |
| CI                      | Nx affected targets                      | The exact changed project set receives proportional verification and delivery.                                               |

## Commands

Run the complete application checks:

```bash
npm exec nx -- format:check
npm exec nx -- run-many -t lint,typecheck,test,build --projects=api,web --parallel=1 --nxBail
```

Run focused test suites:

```bash
npm exec nx -- test api --runInBand
npm exec nx -- test web
```

Contract generation, Liquibase validation, image builds, and image smoke commands belong to
[Local development](local-development.md). CI applies their affected equivalents as described in
[Delivery](delivery.md).

## Current evidence

- API: 12 suites and 60 tests.
- Web: 7 files and 33 tests.
- Formatting, linting, type-checking, API/Web builds, OpenAPI emission, Orval generation, Liquibase, and all three
  production Dockerfile definitions have passed on the delivered repository.
- Revision-aware API and Web readiness passed after the production release.
- The production dependency audit reported no known runtime vulnerability.

## Honest limits

The assessment does not include a large browser end-to-end suite, real-provider test, load test, backup drill, or
formal assistive-technology audit. Those are explicit next evidence, not implicit claims.

The complete development toolchain still reports upstream transitive advisories through the current Nx and webpack
graph for which npm offers no compatible current fix. A forced major downgrade was rejected because it would replace a
disclosed build-time risk with an unplanned workspace migration.
