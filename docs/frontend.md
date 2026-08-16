# Frontend

[Back to the main README](../README.md)

The frontend is a client-rendered React application built by Vite. TanStack Router owns typed navigation, TanStack
Query owns remote state, React Hook Form owns form interaction, and Orval-generated clients own API transport.

[Open the canonical Product Design in Figma](https://www.figma.com/design/tnvp3CFNnb4aC6VWTkK2BI/Vytruve-Product-Design?node-id=309-3)

## Composition

```text
apps/web/src/
  routes/              typed paths and route-level composition
  modules/             authentication, patients, scans and printing
  shared/api/          generated transport and safe error mapping
  shared/layout/       application shell and system fallbacks
  shared/query/        the single QueryClient
  shared/i18n/         English and French catalogs
  shared/ui/           local shadcn/ui primitives
```

Routes own paths and redirects, not feature behavior. Generated hooks own server state; components do not duplicate
query results into local snapshots. The session is restored before protected routes mount, and sign-out or expiry
clears account-scoped cache before navigation.

## User-facing flow

```mermaid
flowchart LR
  Auth["Sign up or sign in"] --> Directory["Patient directory"]
  Directory --> Patient["Patient workspace"]
  Patient --> Scans["3D scans"]
  Patient --> Prints["Print requests"]
  Scans --> Upload["Validate and upload PLY"]
  Scans --> Download["Authorized download"]
  Scans --> Submit["Confirm printing"]
  Submit --> Prints
```

## Collections and recovery

```mermaid
stateDiagram-v2
  [*] --> InitialLoad
  InitialLoad --> ConfirmedPage: Success
  InitialLoad --> BlockingError: Failure
  BlockingError --> InitialLoad: Retry
  ConfirmedPage --> AdjacentLoad: Previous or Next
  AdjacentLoad --> ConfirmedPage: Success
  AdjacentLoad --> BlockingError: Failure
  ConfirmedPage --> Refresh: Explicit refresh
  Refresh --> ConfirmedPage: Success
  Refresh --> LastKnownPage: Failure
  LastKnownPage --> Refresh: Retry
```

Initial and adjacent-page failures show an explicit retry state because no confirmed data exists for that query. A
background refresh failure preserves already confirmed rows and marks them as last known. Provider refresh remains
separate from persisted print-list loading, so external latency does not blank the page.

## Forms and files

JSON forms use generated Zod Mini request schemas with focused interaction-only refinements such as password
confirmation. Stable server field violations return focus and localized feedback to the owning control.

Scan upload accepts one local selection and provides early feedback, but the API remains authoritative for size and
content. Download actions use safe metadata already present in the row and never reveal storage details.

## Visual and accessibility contract

- English and French catalogs own user-facing copy and stable error mappings.
- Dates, numbers, byte sizes, and progress are locale-aware.
- Semantic headings, labels, tables, dialogs or drawers, visible focus, and live feedback support keyboard use.
- Status never relies on color alone.
- Compact layouts preserve essential tables, actions, and Previous/Next navigation.
- Figma `Ready for Development` frames own visual composition; shadcn/ui supplies implementation primitives only.

Focused component evidence is described in [Testing and quality](testing-and-quality.md). Regenerate API clients and
the route tree through the commands in [Local development](local-development.md#contracts-and-generated-clients).
