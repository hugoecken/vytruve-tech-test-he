# OpenAPI and Client Generation Policy

## Authority chain

1. Nest controller routes, concrete DTO classes, validation decorators, and Swagger metadata define the executable HTTP contract.
2. `@nestjs/swagger` emits the OpenAPI document.
3. Orval consumes that document and generates the React HTTP client and TanStack Query hooks.
4. Application code consumes generated exports through stable feature boundaries.

Do not maintain a competing handwritten OpenAPI file or handwritten duplicate client.

## Nest contract design

- Use concrete classes, not TypeScript interfaces, for request and response DTOs that need runtime reflection.
- Describe response DTOs and every relevant status code.
- Keep operation identifiers stable so generated function names do not churn. Give every operation a concise summary and add a description only for non-obvious observable behavior.
- Give every success response an explicit outcome description. Give every Problem Details status an endpoint-specific cause description while keeping its shared RFC schema centralized.
- Add explicit Swagger metadata where TypeScript reflection is insufficient, including enums, arrays, optional fields, multipart uploads, and cookies.
- Define each public enum once in executable backend code, publish it with a stable
  OpenAPI `enumName`, and consume the Orval-generated frontend type. Do not
  redeclare the same values manually in frontend source.
- Keep `class-validator` as runtime validation authority. Swagger decorators document; they do not validate.
- Never expose TypeORM entities or provider payloads as public schemas.

## Tags and servers

- Assign every operation one stable feature or resource tag and declare each
  root Tag Object with a concise description. Root declarations make the
  taxonomy explicit and control documentation and generated-client grouping.
- Tags may organize Orval output, including `tags-split`, but they are not
  cache-invalidation semantics. Configure mutation invalidation explicitly
  against stable operation identifiers and generated query keys.
- Do not hardcode environment-specific origins in the contract. Omit `servers`
  when clients should use the current or runtime-configured origin; declare a
  server only when the contract owns a genuinely stable public endpoint.

## Transport naming

- Name transport classes by their wire role rather than with the generic
  `Dto` suffix.
- Use `*Request` for inbound body schemas and `*Response` for returned resource
  or projection schemas.
- Use `*ListResponse` only for an intentionally complete bounded collection and
  `*PageResponse` for a paginated `items` and `pageInfo` wrapper.
- Use `*Query` for a concrete class that groups HTTP query parameters.
- Give nested transport objects an equally explicit role, such as
  `*InfoResponse` or `*ItemResponse`; do not fall back to a bare resource noun.
- Keep the full resource name even when two role words meet:
  `PrintRequestResponse` is clearer than renaming the `PrintRequest` resource.
- Keep Nest transport files identifiable with the `*.dto.ts` suffix and put the
  role in the filename stem, for example `scan-response.dto.ts`,
  `create-scan-request.dto.ts`, or `scan-search-query.dto.ts`.
- Do not append `Dto` after an explicit role suffix and do not use a transport
  suffix on application, domain, persistence, provider, or frontend view
  models.

## Deterministic generation

- Emit the document from the same application bootstrap configuration used by runtime and tests.
- Provide Nx targets for OpenAPI emission and Orval generation.
- Pin generator configuration and dependencies through the package lock.
- Regenerate in CI and fail when generation or consumer type-checking fails.
- Keep generated documents and source files ignored by Git under the current repository decision.

## Generated code rules

- Never edit generated code manually.
- Avoid broad formatter or lint rewrites over generated directories.
- Configure Orval for the repository's selected HTTP client and TanStack Query behavior in one authoritative configuration.
- Wrap a generated call only to add application semantics, not to rename every function mechanically.
- Do not put authentication tokens in generated client state. Browser requests use the HTTP-only cookie with credentials configured centrally.

## Change protocol

When a contract changes, update DTOs/controllers and tests first, emit OpenAPI, regenerate Orval, type-check the frontend, and inspect the public diff for accidental breaking changes.
