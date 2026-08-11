# Boundary Mapping Policy

## Model categories

Keep these representations distinct when their responsibilities differ:

- HTTP request and response DTOs;
- application commands, inputs, and views;
- domain values or aggregates;
- TypeORM entities;
- external-provider requests and responses;
- frontend forms and view models.

Do not create all categories mechanically. A direct value can cross a boundary when its meaning, validation, lifetime, and shape are genuinely identical.

Transport class names follow the role-based request, response, page, and query
conventions in `openapi-codegen-policy.md`; `Dto` is a category, not a class-name
suffix.

## Mapping ownership

- Put a mapper at the boundary it translates, never in a generic feature-level mapping bag.
- API mappers map transport inputs to application inputs and application outputs to public DTOs. Controllers delegate these translations instead of owning object construction.
- Persistence mappers map application inputs to entity creation values and entities to application or domain representations.
- Provider mappers live beside their adapter and map application values to provider payloads or untrusted provider responses to validated provider-neutral results.
- Application mappers are permitted when a translation is genuinely between application-owned model families and no API, persistence, or provider boundary owns it more precisely.
- Frontend feature boundaries map generated API types to UI-specific values only when presentation needs differ.
- Use one mapper per coherent source and target family. Do not create a repository-wide mapper registry, universal converter, or generic mapping service.

## NestJS and TypeScript backend

- Implement backend mappings as dedicated, stateless `*Mapper` classes in a `mappers` directory at the owning boundary.
- Register mappers as ordinary Nest providers with `@Injectable()` and inject them through constructors. Do not instantiate them inside controllers, services, or adapters.
- Name methods after the destination role: `toCommand`, `toModel`, `toEntity`, `toResponse`, `toRecord`, or a more precise equivalent. Use `toPageResponse` when assembling a page contract.
- Keep the mapping explicit with typed property assignment. TypeScript compilation must catch missing or incompatible values wherever the language can express them.
- Do not add AutoMapper or another runtime convention, reflection, decorator-metadata, registry, or generic transformation framework by default. Unlike compile-time MapStruct generation, these mechanisms add runtime configuration and make simple boundary translations less visible.
- Reconsider a mapping library only after repeated, predominantly mechanical mappings create demonstrated maintenance cost and a proof confirms strict unmapped-target detection, NestJS 11 compatibility, ESM/build compatibility, and clear debugging.
- A mapper may normalize boundary values, convert dates, validate provider records, translate enums exhaustively, or assemble nested responses. It must not perform I/O, repository access, authorization, orchestration, or business decisions.
- Make enum and state translations exhaustive so new values fail type-checking.
- Do not spread unknown objects into trusted models.
- Normalize dates, optional values, file metadata, and identifiers deliberately.
- Never map a client-supplied owner identifier into an authorization decision; derive ownership from the authenticated subject.

## Frontend TypeScript

- Keep generated client types at the API boundary.
- Map to a feature view or form model only when presentation, editing, normalization, or composition semantics differ.
- Do not duplicate a generated model under another name when its shape and meaning are identical.
- Prefer a focused pure function on the frontend unless a mapper class has a concrete dependency or several feature collaborators require the same instance.

## Evolution

Mapping code is a compatibility boundary. When public, persistence, or provider shapes evolve independently, update the responsible mapper and add a focused test only when the translation contains a real branch, conversion, ignored field, provider quirk, or regression risk. Do not test same-name assignments solely to prove that a mapper method exists.
