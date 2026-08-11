# REST Pagination Policy

## Choose the strategy deliberately

- Keep a collection unpaginated only when its maximum size is explicitly bounded by the product.
- Use page-number pagination when users need stable page navigation or direct access to a numbered page.
- Use cursor pagination for append-heavy or frequently changing collections, load-more interfaces, and infinite navigation.
- Do not expose both page-number and cursor semantics on the same endpoint.

Record the selected strategy, request parameters, ordering, cursor behavior, and response shape in the repository overlay.

## Shared response contract

- Name paginated response schemas with the `*PageResponse` suffix.
- Return resource representations in `items`.
- Return navigation metadata in `pageInfo`.
- Always expose `pageInfo.hasNext` so clients do not infer navigation state from item counts.
- Expose a total only when the product requires it and the owning data source can provide it at acceptable cost.
- Keep paginated endpoints deterministically ordered and include a unique tie-breaker.

## Cursor pagination

- Use an optional opaque `cursor` parameter and a bounded `pageSize` parameter unless an external contract requires different names.
- Name a framework-required class grouping those query parameters with the
  `*Query` suffix rather than `*Dto` or `*Request`.
- Return `pageInfo.nextCursor` when another page exists; otherwise return `null`.
- Define one direction per endpoint unless bidirectional navigation is a real requirement.
- Build the next cursor from the final returned item, never from the look-ahead item.
- Fetch one item beyond `pageSize` to calculate `hasNext` without a count query.
- Treat cursors as transport tokens: clients store and return them but do not construct or interpret them.
- Version cursor payloads and validate them strictly before applying them to a query.
- Bind cursor semantics to active filters and sort order. If those inputs change, the previous cursor is invalid.
- Reject malformed, unsupported, expired, or context-incompatible cursors with the repository's stable validation error contract.
- Do not place secrets or personal data in a cursor. Encode opacity is not encryption.

## Page-number pagination

- Use zero-based `page` and positive `pageSize` query parameters unless an external contract requires different names.
- Return the effective `page` and `pageSize` in `pageInfo`.
- Prefer `hasNext` over a total count when the UI does not require a known final page.
- Define how out-of-range pages behave and keep that behavior stable.

## Persistence and client behavior

- Apply ownership and filter predicates before pagination.
- Use indexes aligned with the filter and deterministic ordering columns.
- Keep query bounds enforced on the server even when clients validate them.
- Generated clients must consume the published contract rather than recreate pagination types manually.
- A client requesting the next page must pass the navigation value returned by the preceding response.
- Reset accumulated pages whenever filters, ownership context, or sort order changes.

## Completion check

Before completing a paginated endpoint, verify that:

- request and response schemas are explicit in OpenAPI;
- ordering is deterministic and backed by an appropriate index;
- the server enforces the page-size bounds;
- ownership and filters cannot be bypassed through a cursor;
- first-page, final-page, empty-page, and invalid-navigation behavior are defined;
- client generation can represent the response without handwritten contract duplication.
