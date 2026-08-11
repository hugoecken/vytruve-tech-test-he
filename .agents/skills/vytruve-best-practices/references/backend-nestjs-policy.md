# NestJS Backend Policy

## Purpose

Build a feature-first NestJS API whose framework boundaries are explicit and whose architecture stays proportional to the behavior being delivered.

## Feature modules

- Give each business capability one owning module.
- Keep `AppModule` focused on composition and global infrastructure.
- Export only providers that another module genuinely consumes. Modules are encapsulation boundaries, not folders with decorative metadata.
- Avoid global modules, circular references, and `forwardRef` unless the domain relationship truly requires them and the trade-off is documented.

Organize each feature by business capability first and technical role second:

```text
feature/
├── api/
│   ├── controllers/
│   ├── dto/
│   └── mappers/, guards/, decorators/, pipes/, cookies/, or models/ as implemented
├── application/
│   ├── models/
│   └── services/, mappers/, use-cases/, or validation/ as implemented
├── domain/
├── infrastructure/
│   ├── persistence/
│   ├── provider/
│   └── storage/
└── feature.module.ts
```

- Keep the Nest feature module at the feature root as its composition point.
- Create a role directory when that role has an implementation, even if it
  initially contains one file; predictable navigation and symmetry across
  features are the purposes of this convention. Controllers belong in
  `api/controllers`, application services in `application/services`, and
  transport DTOs in `api/dto`. Boundary mappers belong in the narrowest owning
  `mappers` directory: for example `api/mappers`,
  `infrastructure/persistence/mappers`, or
  `infrastructure/provider/mappers`.
- Do not create empty directories, placeholder classes, ports, interfaces, or
  layers merely to complete the tree.
- Create `domain/` only when the feature owns pure business concepts or
  invariants that are meaningfully independent of application orchestration.
- Add narrower directories such as `api/guards`, `api/pipes`, `api/mappers`,
  `application/validation`, `infrastructure/persistence`, or
  `infrastructure/provider` when their role is concrete. A role directory is
  not a license to mix unrelated responsibilities: do not use generic `impl`,
  `utils`, `helpers`, or cross-feature `services` dumping grounds.
- Keep focused tests beside the source they verify unless the repository owns a
  dedicated black-box test project.

## Controllers

Controllers own HTTP translation only:

- parse route, query, cookie, and body inputs through Nest primitives;
- delegate one use case to an application provider;
- delegate transport/application conversion to the owning API mapper and return the mapped public response with the intended status code;
- never query repositories, manipulate files, or call providers directly;
- never implement authorization using an owner identifier supplied by the client.

Use concrete DTO classes at transport boundaries. Keep decorators and HTTP concerns out of application and domain values.

## Providers and dependency injection

- Use constructor injection and depend on the narrowest meaningful capability.
- Keep providers singleton-scoped by default. Request scope needs an observed requirement because it affects performance and dependency graphs.
- Name providers after their responsibility, not vague roles such as `Manager`, `Helper`, or `CommonService`.
- Do not use service locators or retrieve dependencies manually from the Nest container in business code.
- Keep framework-free logic directly instantiable when possible.

## Application, domain, and infrastructure

- Application providers coordinate a use case, enforce orchestration rules, and define transaction boundaries.
- Domain objects or policies own business invariants only when those invariants are richer than simple validated data.
- Infrastructure adapters own TypeORM, private object or file storage, token implementation details, and external providers.
- Create an interface or token for an external boundary when it enables substitution or protects provider-specific semantics. Do not create an interface for every class.
- Keep provider and persistence types from leaking into the public API.
- Keep application services under the owning feature's
  `application/services` directory and application models under
  `application/models`; keep entities under `infrastructure/persistence` and
  external adapter types beside their adapter.

## Cross-cutting behavior

- Register strict validation, error translation, logging, security middleware, and OpenAPI configuration centrally at bootstrap.
- Use guards for authentication and authorization decisions, interceptors for genuine cross-cutting transformations, and exception filters for consistent HTTP error serialization.
- Do not hide core feature behavior in decorators, interceptors, or middleware.

## Rejection criteria

Reject designs that introduce empty layers, generic repository wrappers, a shared `utils` dumping ground, CQRS, event buses, or microservices without a concrete requirement. Prefer one readable vertical path from controller to use case to owned adapters.
