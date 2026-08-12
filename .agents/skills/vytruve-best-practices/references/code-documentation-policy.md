# Repository Code Documentation Policy

Read this reference before adding or changing TSDoc, JSDoc, inline comments, or repository documentation.

## Rule

Document every handwritten class and every handwritten method or function in changed code, including private methods when they form an extracted local step. When a task requests a repository-wide documentation pass, scan every handwritten source and test file and apply the same rule wherever it fits. Do not document generated files or generated methods.

Keep documentation short and useful. State the local contract, boundary, invariant, security constraint, provider quirk, failure semantics, or reason for extraction. Never narrate syntax or repeat a type signature.

## TypeScript And NestJS

- Add TSDoc to handwritten classes, interfaces, types, enums, functions, and provider boundaries.
- Document constructors when dependency ownership, configuration, or lifecycle behavior matters.
- Document controller handlers with their authentication, ownership, side-effect, or stable failure behavior; Swagger decorators remain the HTTP schema authority.
- Document service, mapper, validator, guard, pipe, filter, adapter, and persistence methods with the boundary or invariant they enforce.
- Document private functions and methods when they are extracted local steps.
- Document DTO, entity, model, and module classes at class level. Document individual properties only when their unit, format, security constraint, or compatibility rule is not already clear from the type and validation decorators.
- For React, document exported components, hooks, props, and helper functions. Do not document inline JSX callbacks, straightforward style objects, or one-line adapters merely to satisfy a count.
- Do not add comments to generated OpenAPI, Orval output, framework-generated files, or declarative configuration that is already self-explanatory.

Use this standard tag shape for significant callable boundaries:

1. Start with one short sentence describing the contract or boundary.
2. Add `@param` for every parameter of controller handlers, public application-service methods, guards, pipes, filters, validators, external or storage adapters, shared reusable functions, and the constructors of those classes.
3. Add `@returns` when a non-void result has observable meaning beyond its TypeScript type.
4. Add `@throws` for supported application, validation, authorization, provider, or operational failures. Do not enumerate incidental programming errors.

Keep tags semantic rather than ceremonial. A parameter description must explain its trust level, ownership, unit, normalization, role, or constraint instead of repeating its name and type. Mapper methods, obvious one-line adapters, inline callbacks, and self-explanatory private helpers keep their concise summary unless a tag adds real contract information.

## Inline Comments

- Explain why a non-obvious choice is necessary and link to an authority when useful.
- Put a comment beside the constraint it protects.
- Remove stale comments during the same change that makes them inaccurate.
- Do not leave commented-out code or TODOs without a concrete owner and reason.

## Tests

Use test names as the primary documentation. Add comments only for non-obvious invariants, regressions, fixtures, provider quirks, or timing assumptions. Do not annotate every setup statement or anonymous test callback.

## Repository Documentation

The final README should let a reviewer understand and run the project without reverse-engineering it. Include:

- scope and principal flows;
- architecture and key decisions;
- prerequisites and exact local commands;
- safe environment-variable setup;
- database migrations and test data;
- OpenAPI and Orval generation;
- lint, type-check, focused test, and build commands;
- known trade-offs and deliberately deferred work.

Keep commands verified and examples synthetic. Never include real credentials, personal data, uploaded filenames, or external-provider responses.

## Verification

- Inspect every handwritten file in the requested scope and explicitly exclude generated artifacts.
- Keep comments concise enough that the code remains the primary source of truth.
- Run formatting, type-checking, compilation, and the smallest relevant tests after source changes.
