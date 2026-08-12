# NestJS Testing Policy

## Purpose

Use Jest to protect observable Backend behavior at the narrowest responsible boundary. Combine isolated unit tests and focused adapter contract tests without repeating assertions across layers.

Do not optimize for a coverage percentage. A valuable test names a meaningful regression, controls the inputs that cause it, and fails when that behavior breaks.

## Choose the narrowest test level

| Responsibility under test | Preferred level |
| --- | --- |
| Pure calculation, parser, validator, mapper with branching, or simple provider orchestration | Isolated unit test |
| Owned HTTP/storage/provider protocol, timeout, status, header, or payload translation | Adapter contract test against a controlled substitute |

Do not test a controller in isolation when it only delegates to an application provider. Do not reproduce framework behavior through a large application harness. Verify complex validation, authorization decisions, and orchestration at the narrowest handwritten owner.

## File placement and naming

- Co-locate isolated and adapter contract files with the handwritten subject as `*.spec.ts`.
- Name the outer `describe` after the function, class, adapter, or public capability under test.
- Group a class by public method only when it improves navigation.
- Name each test as an observable outcome plus its condition: `returns ... when ...`, `rejects ...`, `preserves ...`, or `removes ... when ...`.
- Do not use vague names such as `works`, `handles error`, or `test case 1`.

## Test anatomy

Write each test in Arrange, Act, Assert order.

- Separate the three phases with one blank line when each phase is present.
- Prefer focused variable names and test names over `Given`, `When`, or `Then` comments.
- Add a comment only for a non-obvious invariant, regression, provider quirk, or timing constraint.
- Keep one primary reason to fail per test. Multiple assertions are appropriate when they describe one result or one boundary interaction.
- Assert the complete stable value when it is small. Use asymmetric matchers only for genuinely variable fields.
- For supported errors, assert the public error type, status, and stable code rather than incidental message text or stack traces.
- Await every asynchronous result and rejection. Never mix a returned promise with a `done` callback.

## Isolated unit tests

- Construct framework-independent functions and simple providers directly with `new`.
- Use `Test.createTestingModule()` only when Nest injection or framework behavior is part of the test.
- Mock only collaborators crossing an owned boundary: repositories, storage, token or password services, clocks, queues, and external adapters.
- Do not mock the subject under test, DTOs, entities, value objects, or a framework/library merely to obtain a convenient assertion.
- Prefer explicit typed doubles containing only the methods used by the subject. Avoid broad automatic mocks whose default behavior hides missing setup.
- Configure the exceptional behavior in the test that needs it; keep the default setup minimal and successful.
- Assert collaborator calls only when ordering, authorization, compensation, idempotency, persistence, or side-effect suppression is the behavior.
- Do not unit-test mechanical decorators, property declarations, trivial accessors, or one-to-one mapping without validation or branching.

## Fixtures, builders, and doubles

- Use deterministic synthetic UUIDs, timestamps, credentials, references, files, and domain values.
- Keep the smallest valid fixture and vary only the field relevant to the test.
- Place a feature-specific factory or fake beside that feature's tests. Move it into shared test support only after more than one suite needs the same behavior.
- Let builders accept narrow overrides and return a complete valid value. Do not create a generic object-mother framework.
- Prefer an in-memory stateful fake when a workflow must be observed across several calls; prefer `jest.fn()` for one isolated collaborator outcome.
- Reset or recreate mutable doubles in `beforeEach`. Do not let a test depend on execution order.
- Never use real personal data, production-like secrets, uploaded content, or provider responses in fixtures or snapshots.

## Adapter contract tests

- Exercise an owned adapter against a controlled local protocol substitute when request construction, headers, serialization, status translation, timeout, or response validation belongs to the adapter.
- Bind a local server to an ephemeral port and close it in `afterEach` or `afterAll` according to its ownership.
- Record only the request facts needed by the assertion. Never emit credentials, file content, or sensitive payloads to test logs.
- Prove non-idempotent operations issue at most one request for each application call.
- Cover representative success, explicit rejection, malformed response, transport failure, and timeout behavior when supported by the contract.
- Never call a real external provider from an automated test.

## Lifecycle and isolation

- Use `beforeEach` and `afterEach` for mutable per-test state. Use `beforeAll` and `afterAll` only for expensive resources safely shared by the suite.
- Return or await asynchronous setup and cleanup.
- Close every application, HTTP server, stream, database handle, timer, and temporary resource owned by the suite.
- Keep clocks, UUIDs, provider responses, and timeouts deterministic when they affect assertions.
- Never use arbitrary sleeps. Await a returned promise, observable state, or bounded polling helper with a clear failure.

## Anti-patterns

Do not:

- assert that a mock returns the value it was configured to return without exercising application behavior;
- recreate framework or ORM internals in test doubles;
- reach into private methods or assert private call order;
- use broad snapshots for HTTP bodies, entities, errors, or provider payloads;
- weaken production validation, guards, constraints, or configuration for tests;
- catch an error only to assert a boolean flag;
- leave open handles, ignored promises, retained files, rows, objects, cookies, or credentials;
- silently retry a non-idempotent operation in production code or test support.

## Quality gate

Run the narrow unit suite first, then adapter contracts when their boundary changed. Finish with affected lint, type-check, build, migration validation, generated-contract checks, formatting, and diff hygiene required by the repository's risk-based validation policy.

A passing suite must be deterministic, isolated, maintainable, and capable of failing for the regression named by each test.
