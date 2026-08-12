# React and Vite Frontend Policy

## Runtime model

- Build a client-rendered React SPA with Vite.
- Use TanStack Router file-based routing through its Vite plugin. Do not add a second router or a framework runtime.
- Use generated Orval functions and TanStack Query hooks for HTTP communication and remote server state.
- Use React Hook Form for editable form state. Let the repository overlay select whether validation uses native rules,
  focused handwritten validators, or schemas generated from the executable contract.
- Do not duplicate request contracts in handwritten frontend schemas when the selected generator can derive them from
  the same OpenAPI authority.
- Keep browser code independent from backend persistence entities and provider payloads.

## Source hierarchy

Use this predictable application shape:

```text
src/
  routes/                    # File routes and route-level composition only
  modules/<feature>/         # Product behavior owned by one feature
    api/                     # Feature query options or generated-client adapters
    config/                  # Feature constants when they have real ownership
    forms/                   # Form models and form-specific validation
    mappers/                 # Representation changes, only when a boundary exists
    ui/                      # Feature components
    view-models/             # UI-oriented models when API models are insufficient
  shared/
    api/generated/           # Ignored Orval output; never edit manually
    config/                  # Cross-feature runtime configuration
    hooks/                   # Proven cross-feature hooks
    layout/                  # Application shell and shared layout composition
    lib/                     # Small, named technical helpers; never a dumping ground
    ui/                      # Local shadcn primitives and stable shared components
  router.tsx                 # Router construction
  routeTree.gen.ts           # TanStack Router generated route tree
  main.tsx                   # Browser bootstrap only
```

- Keep the same role directories across features when those roles exist. Do not add empty directories merely to fill the template.
- Do not import one feature's internals from another feature. Promote a responsibility to `shared` only after cross-feature ownership is proven.
- Do not create generic `utils`, `helpers`, `services`, or `components` buckets.
- Keep tests beside the component, hook, or feature they protect.

## Route boundaries

- A route file declares the path, validates route-owned search parameters, resolves route-level guards, and composes the owning feature view.
- Keep data transformation, forms, tables, upload behavior, and mutation workflows out of route files.
- Use typed `Link`, route params, and search params. Do not assemble internal URLs with string concatenation.
- Use layout routes for authentication and application-shell boundaries.
- Treat the generated route tree as generated code: never edit it manually and exclude it from formatting and linting rewrites.
- Route-level code splitting is allowed when a meaningful screen boundary exists; do not split trivial fragments.

## Shared UI and shadcn

- Store local shadcn source components under `shared/ui` and the `cn` helper under `shared/lib`.
- Registry components are owned source code after generation: inspect them, preserve accessibility, and update them intentionally.
- A repository may vendor the complete upstream shadcn catalog once when its overlay explicitly chooses that strategy. Product code still imports only components required by a real flow.
- Do not build a component showcase, barrel-export the entire catalog, or wrap every primitive preemptively.
- Centralize visual tokens as CSS custom properties. Feature components consume semantic tokens instead of hardcoded brand colors.
- Prefer composition and explicit variants over growing boolean-prop combinations.

## Server and client state

- Centralize credentials and base-URL behavior in generated-client configuration.
- Never put authentication tokens in React state, URL state, `localStorage`, or `sessionStorage`; derive authentication from the session endpoint.
- Use query keys and invalidation deliberately after mutations. OpenAPI tags organize generated code but do not invalidate caches automatically.
- Select TanStack Query primitives from the accepted pagination contract and repository overlay; do not reinterpret one strategy as another in the client.
- Use paginated `useQuery` primitives with the page state in the query key and `keepPreviousData` for page-number collections.
- Use TanStack infinite-query primitives for cursor-paginated collections. Treat cursors as opaque and use the server-provided continuation value.
- Do not mirror query results into local state. Use local component state only for ephemeral interaction.
- Preserve existing content during background refresh; do not replace it with a full-screen spinner.

## Forms and errors

- Express simple UX rules with native attributes and the repository-selected React Hook Form validation strategy.
- Keep local refinements limited to interaction rules that the executable contract cannot represent faithfully.
- Frontend validation improves interaction only; the backend remains the trust boundary.
- Map field-level server validation to the owning control and stable Problem Details codes to translated, actionable feedback.
- Translate generated validation issues through stable codes, paths, and limits; never display generated messages raw.
- Do not expose raw server details, stack traces, or transport errors to users.
- Disable or guard duplicate submissions while preserving keyboard and screen-reader feedback.
- Move focus to the first invalid field when appropriate and announce asynchronous outcomes.

## Rendering and effects

- Keep render functions pure and compute derived values during render.
- Use effects only to synchronize React with an external system or lifecycle that cannot be expressed declaratively.
- Do not use effects to copy props, query results, or other state into state.
- Apply memoization only for measured costs or identity-sensitive APIs.

## User states

Every asynchronous screen or action deliberately handles:

- initial loading;
- empty data;
- recoverable error with a safe retry;
- permission or authentication loss;
- mutation in progress;
- success confirmation;
- stale or temporarily unavailable remote status.

Use shared state primitives when presentation is consistent, while feature copy and recovery behavior remain feature-owned.

## Accessibility and interface quality

- Use semantic HTML, associated labels, predictable headings, keyboard operation, visible focus, and meaningful accessible names.
- Use native elements before custom ARIA roles.
- Preserve focus across dialogs, mutations, and route transitions.
- Do not use color as the only carrier of status; pair it with text, iconography, or shape.
- Maintain sufficient contrast and a minimum 44-pixel interactive target where the design permits it.

## Internationalization

- Keep user-visible copy in translation resources, not inline in components or server payloads.
- Use stable translation keys grouped by feature and intent, not by visual position.
- Keep technical identifiers, Problem Details codes, and enum values untranslated; translate them at the presentation boundary.
- Format dates, numbers, ages, and progress with locale-aware platform APIs.
- Do not concatenate translated fragments into sentences.

## Performance

- Optimize observed or structurally clear costs only.
- Keep route and feature bundles coherent and avoid accidental large dependencies.
- Let TanStack Query provide caching and request deduplication instead of custom caches.
- Lazy-load expensive optional UI only when it creates a meaningful initial-load benefit.
