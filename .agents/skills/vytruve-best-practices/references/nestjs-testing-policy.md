# NestJS Testing Policy

## Purpose

Use Jest to protect observable Backend behavior at the narrowest responsible boundary. Combine isolated unit tests, adapter contract tests, and a small HTTP integration suite without repeating the same assertion at every level.

Do not optimize for a coverage percentage. A valuable test names a meaningful regression, controls the inputs that cause it, and fails when that behavior breaks.

## Choose the narrowest test level

| Responsibility under test | Preferred level |
| --- | --- |
| Pure calculation, parser, validator, mapper with branching, or simple provider orchestration | Isolated unit test |
| Nest dependency injection, provider override, guard, pipe, filter, interceptor, or module wiring | Nest testing module |
| Owned HTTP/storage/provider protocol, timeout, status, header, or payload translation | Adapter contract test against a controlled substitute |
| Routing, global application configuration, cookies, validation, authorization, persistence, multipart, streaming, or public errors | HTTP integration test through Supertest |

Do not test a controller in isolation when it only delegates to an application provider. Do not repeat every DTO decorator case through HTTP. Use one representative HTTP case to prove the global boundary, then test complex validation at its owning unit.

## File placement and naming

- Co-locate isolated and adapter contract files with the handwritten subject as `*.spec.ts`.
- Keep black-box Nest application files in the repository's API end-to-end project as `*.e2e-spec.ts`.
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

## HTTP integration tests

- Build the real module graph with `Test.createTestingModule({ imports: [AppModule] })`.
- Override only true external boundaries or deliberately controlled infrastructure behaviors before calling `compile()`.
- Create a real Nest application, apply the same exported bootstrap configuration used in production, then call `app.init()`.
- Send requests through Supertest using `app.getHttpServer()`; do not require a separately started API process or a fixed application port.
- Close the application in `afterAll`, including when setup partially fails.
- Use a real database engine for SQL semantics, constraints, transactions, and migration-backed behavior. Never substitute SQLite for PostgreSQL behavior.
- Initialize the schema through the repository's migration authority. Application ORM synchronization must remain disabled.
- Use dedicated test infrastructure that cannot modify retained development or user data.
- Keep suites sequential when they share database or object-storage state.
- Reset only test-owned rows and objects between tests. Do not drop broad schemas, buckets, volumes, or directories from test code.
- Use a controlled stateful fake for external non-idempotent providers so workflows can observe submission and later status without network access.

## Containerized test dependencies

- Prefer official Testcontainers modules for throwaway infrastructure when the repository already requires Docker and behavior depends on the real engine.
- Start shared expensive containers once in the test runner's global setup, publish only serializable connection values through environment configuration, and stop every container and network in global teardown.
- Use random mapped host ports. Do not reserve fixed test ports or reuse development services.
- Apply the real migration authority before the application module is compiled. Never replace migration execution with ORM schema synchronization.
- Run one-shot migration containers on a private container network and copy migration resources into the container rather than depending on host-specific bind paths.
- Keep the external service under application development out of Testcontainers when a controlled in-memory fake gives a safer deterministic boundary and a separate adapter contract test already proves its protocol.
- Keep container-backed suites sequential when they share one database or object store, and reset only their application-owned records and objects between scenarios.
- Preserve startup diagnostics without printing credentials, connection strings, uploaded content, or provider payloads.

## HTTP evidence

Cover the smallest set of public workflows that proves:

- global validation, transformation, unknown-property rejection, and the public error media type;
- authentication cookie creation, attributes, use, expiration or logout behavior, and protected-route denial;
- ownership concealment for missing and foreign resources;
- database persistence and deterministic collection navigation;
- multipart validation, private object storage, authorized streaming, and representative storage failure translation;
- external-operation submission, observation, definitive rejection, ambiguous outcome, and safe reconciliation.

Assert status, relevant headers, stable response fields, and durable observable outcomes. Avoid endpoint-by-endpoint duplication when a lower-level test already proves the branch.

## Lifecycle and isolation

- Use `beforeEach` and `afterEach` for mutable per-test state. Use `beforeAll` and `afterAll` only for expensive resources safely shared by the suite.
- Return or await asynchronous setup and cleanup.
- Close every application, HTTP server, stream, database handle, timer, and temporary resource owned by the suite.
- Keep clocks, UUIDs, provider responses, and timeouts deterministic when they affect assertions.
- Never use arbitrary sleeps. Await a returned promise, observable state, or bounded polling helper with a clear failure.
- Disable parallel execution for suites sharing the same external test infrastructure unless isolation has been proven.

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

Run the narrow unit suite first, then the affected lint and type-check targets. Run adapter contracts and HTTP integration when their boundaries changed. Finish with the affected build, migration validation, generated-contract checks, formatting, and diff hygiene required by the repository's risk-based validation policy.

A passing suite must be deterministic, isolated, maintainable, and capable of failing for the regression named by each test.
