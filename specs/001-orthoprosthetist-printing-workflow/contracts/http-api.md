# HTTP API Contract Design

**Status**: Accepted

This document designs the public HTTP boundary. The future executable authority is the OpenAPI document emitted from NestJS controllers, concrete DTO classes, validation decorators, and Swagger metadata.

## Global Contract

- Base path: `/api`
- Media type: `application/json`, except multipart upload, PLY download, and Problem Details
- Authentication: `vytruve_session` HTTP-only cookie
- Identifiers: lowercase canonical UUID strings
- Dates: ISO 8601 UTC date-time strings
- Unknown JSON properties: rejected
- Public response DTOs never contain password material, JWTs, MinIO keys, provider identifiers, credentials, or raw provider values
- OpenAPI omits `servers`; the browser uses its runtime-configured API origin

## OpenAPI Taxonomy

| Tag | Description |
| --- | --- |
| `Authentication` | Account registration and browser-managed session lifecycle. |
| `Patients` | Owner-scoped patient records. |
| `Scans` | Validated patient PLY scans and authorized content streaming. |
| `Printing` | Patient print submission and lifecycle tracking. |

Every operation has exactly one tag, one stable `operationId`, a concise summary, and endpoint-specific response descriptions.

## Session Cookie

| Attribute | Value |
| --- | --- |
| Name | `vytruve_session` |
| Token | HS256 JWT with `sub`, `iat`, and `exp` only |
| Lifetime | 1,800 seconds |
| `HttpOnly` | `true` |
| `SameSite` | `Lax` |
| `Path` | `/api` |
| `Secure` | `true` in production; `false` only for local HTTP development |

The server verifies signature, issuer, audience, and expiry. Logout clears the cookie with matching path, SameSite, and Secure behavior. The token never appears in a response body.

## Shared DTOs

### AccountSessionResponse

| Field | Type | Rules |
| --- | --- | --- |
| `accountId` | UUID string | Authenticated account identifier |
| `email` | string | Normalized account email |
| `expiresAt` | date-time string | JWT expiry expressed for session UI decisions |

### PageInfoResponse

| Field | Type | Rules |
| --- | --- | --- |
| `hasNext` | boolean | Authoritative next-page availability |
| `page` | integer | Current zero-based server page |
| `pageSize` | integer | Effective bounded page size |

### ServerPageQuery

| Query parameter | Type | Required | Rules |
| --- | --- | --- | --- |
| `page` | integer | No | Default `0`; minimum `0` |
| `pageSize` | integer | No | Default `20`; minimum `1`; maximum `50` |

Every page is ordered by `createdAt DESC, id DESC`. The server uses `skip = page * pageSize`, fetches one look-ahead row, returns at most `pageSize` items, and reports whether another page exists without executing a total-count query.

### ProblemDetailsResponse

Content type: `application/problem+json`.

| Field | Type | Rules |
| --- | --- | --- |
| `type` | URI string | Stable documentation URI or `about:blank` |
| `title` | string | Stable English error category, not localized presentation copy |
| `status` | integer | HTTP status code |
| `detail` | string | Safe explanation without internal or provider content |
| `instance` | string | Request path or safe request identifier |
| `code` | string enum | Stable application error code |
| `violations` | `FieldViolationResponse[]` | Present only for field validation failures |

### FieldViolationResponse

| Field | Type | Rules |
| --- | --- | --- |
| `field` | string | Stable request-property path |
| `code` | string | Stable validation code such as `REQUIRED`, `INVALID_EMAIL`, `MIN_LENGTH`, `MAX_LENGTH`, `OUT_OF_RANGE`, or `MUST_BE_INTEGER` |

Violations never contain rejected values or generated `class-validator` messages.

## Authentication Operations

Registration and sign-in are rate-limited to five attempts per minute per trusted client IP.

### POST `/api/auth/accounts`

- `operationId`: `createAccount`
- Summary: Create an account and start a session.
- Authentication: Public
- Request: `CreateAccountRequest`
- Success: `201 Created`, `AccountSessionResponse`, session cookie, and `Location: /api/auth/session`

`CreateAccountRequest`:

| Field | Type | Rules |
| --- | --- | --- |
| `email` | string | Trimmed, valid email, maximum 320 characters; compared case-insensitively |
| `password` | string | 12 through 128 Unicode grapheme clusters |

Password confirmation is a frontend form-only field. It must match before this request is sent and is not persisted or transmitted.

Errors:

| Status | Code | Cause |
| --- | --- | --- |
| `400` | `VALIDATION_FAILED` | Request fields or shape are invalid. |
| `409` | `ACCOUNT_ALREADY_EXISTS` | The normalized email is already registered. |
| `429` | `AUTH_RATE_LIMITED` | The client IP exceeded the registration limit. |
| `500` | `INTERNAL_ERROR` | The account could not be created safely. |

### POST `/api/auth/sessions`

- `operationId`: `createSession`
- Summary: Start an authenticated session.
- Authentication: Public
- Request: `CreateSessionRequest`
- Success: `200 OK`, `AccountSessionResponse`, and session cookie

`CreateSessionRequest` contains `email` and `password` with the same transport bounds as registration.

Errors:

| Status | Code | Cause |
| --- | --- | --- |
| `400` | `VALIDATION_FAILED` | Request fields or shape are invalid. |
| `401` | `AUTHENTICATION_FAILED` | Credentials are invalid; account existence is not disclosed. |
| `429` | `AUTH_RATE_LIMITED` | The client IP exceeded the sign-in limit. |
| `500` | `INTERNAL_ERROR` | Authentication could not be completed safely. |

### GET `/api/auth/session`

- `operationId`: `getSession`
- Summary: Restore the current authenticated session.
- Authentication: Session cookie
- Success: `200 OK`, `AccountSessionResponse`

Errors:

| Status | Code | Cause |
| --- | --- | --- |
| `401` | `AUTHENTICATION_REQUIRED` | The cookie is absent, invalid, or expired. |
| `500` | `INTERNAL_ERROR` | Session restoration failed unexpectedly. |

### DELETE `/api/auth/session`

- `operationId`: `deleteSession`
- Summary: End the current browser session.
- Authentication: Session cookie when present
- Success: `204 No Content` and a matching expired cookie

Logout is idempotent from the browser's perspective; an absent or expired cookie still results in the cleared-cookie response.

## Patient Operations

### PatientResponse

| Field | Type | Rules |
| --- | --- | --- |
| `id` | UUID string | Safe patient identifier |
| `firstName` | string | Trimmed Unicode value |
| `lastName` | string | Trimmed Unicode value |
| `age` | integer | `0…150` |
| `createdAt` | date-time string | Date added |

### PatientPageResponse

```text
items: PatientResponse[]
pageInfo: PageInfoResponse
```

### GET `/api/patients`

- `operationId`: `listPatients`
- Summary: List patients owned by the current account.
- Query: `ServerPageQuery`
- Success: `200 OK`, `PatientPageResponse`

Errors: `400 VALIDATION_FAILED`, `401 AUTHENTICATION_REQUIRED`, `500 INTERNAL_ERROR`.

### POST `/api/patients`

- `operationId`: `createPatient`
- Summary: Create an owned patient record.
- Request: `CreatePatientRequest`
- Success: `201 Created`, `PatientResponse`, and `Location: /api/patients/{id}`

`CreatePatientRequest`:

| Field | Type | Rules |
| --- | --- | --- |
| `firstName` | string | Trimmed, non-empty Unicode, maximum 100 grapheme clusters |
| `lastName` | string | Trimmed, non-empty Unicode, maximum 100 grapheme clusters |
| `age` | integer | `0…150` inclusive |

Errors: `400 VALIDATION_FAILED`, `401 AUTHENTICATION_REQUIRED`, `500 INTERNAL_ERROR`.

### GET `/api/patients/{patientId}`

- `operationId`: `getPatient`
- Summary: Get one patient owned by the current account.
- Path: canonical UUID `patientId`
- Success: `200 OK`, `PatientResponse`

Errors: `400 VALIDATION_FAILED` for malformed UUID, `401 AUTHENTICATION_REQUIRED`, `404 PATIENT_NOT_FOUND` for unknown or foreign-owned resources, `500 INTERNAL_ERROR`.

## Scan Operations

### ScanEncoding

Stable OpenAPI enum name: `ScanEncoding`.

- `ascii`
- `binary_little_endian`
- `binary_big_endian`

### ScanResponse

| Field | Type | Rules |
| --- | --- | --- |
| `id` | UUID string | Safe scan identifier |
| `format` | string enum | Always `ply` in the MVP |
| `encoding` | `ScanEncoding` | Validated PLY encoding |
| `sizeBytes` | integer | `1…26214400` |
| `createdAt` | date-time string | Upload date |
| `printingAvailable` | boolean | True only when no non-terminal request exists |

The response never includes an original filename, MIME claim, storage key, bucket, ETag, URL, or provider data.

### ScanPageResponse

```text
items: ScanResponse[]
pageInfo: PageInfoResponse
```

### GET `/api/patients/{patientId}/scans`

- `operationId`: `listPatientScans`
- Summary: List validated scans for an owned patient.
- Query: `ServerPageQuery`
- Success: `200 OK`, `ScanPageResponse`

Errors: `400 VALIDATION_FAILED`, `401 AUTHENTICATION_REQUIRED`, `404 PATIENT_NOT_FOUND`, `500 INTERNAL_ERROR`.

### POST `/api/patients/{patientId}/scans`

- `operationId`: `createPatientScan`
- Summary: Validate and store one patient PLY scan.
- Description: Accepts exactly one multipart field named `file`; content is validated independently of extension and browser MIME metadata.
- Request content type: `multipart/form-data`
- Success: `201 Created`, `ScanResponse`, and `Location: /api/patients/{patientId}/scans/{id}/content`

Errors:

| Status | Code | Cause |
| --- | --- | --- |
| `400` | `VALIDATION_FAILED` | The path or multipart shape is invalid or the file is missing. |
| `401` | `AUTHENTICATION_REQUIRED` | No valid session exists. |
| `404` | `PATIENT_NOT_FOUND` | The patient is unknown or foreign-owned. |
| `413` | `SCAN_TOO_LARGE` | The file exceeds 26,214,400 bytes. |
| `415` | `SCAN_UNSUPPORTED_TYPE` | The content is not a supported PLY 1.0 encoding. |
| `422` | `SCAN_INVALID_CONTENT` | The PLY structure is malformed, empty, inconsistent, or truncated. |
| `503` | `SCAN_STORAGE_UNAVAILABLE` | The object could not be stored or compensated safely. |
| `500` | `INTERNAL_ERROR` | Metadata persistence failed unexpectedly. |

### GET `/api/patients/{patientId}/scans/{scanId}/content`

- `operationId`: `downloadPatientScan`
- Summary: Stream an authorized patient PLY scan.
- Success: `200 OK`, streamed body, `Content-Type: application/octet-stream`, exact `Content-Length` when known, and a safe generated attachment name based on the scan identifier

Errors: `400 VALIDATION_FAILED`, `401 AUTHENTICATION_REQUIRED`, `404 PATIENT_NOT_FOUND`, `404 SCAN_NOT_FOUND`, `503 SCAN_STORAGE_UNAVAILABLE`, `500 INTERNAL_ERROR`.

## Printing Operations

### PrintRequestStatus

Stable OpenAPI enum name: `PrintRequestStatus`.

- `confirmation_pending`
- `queued`
- `in_progress`
- `completed`
- `failed`

### PrintRequestResponse

| Field | Type | Rules |
| --- | --- | --- |
| `id` | UUID string | Safe local request identifier |
| `reference` | string | Unique 12-character system reference |
| `scanId` | UUID string | Associated safe scan identifier |
| `status` | `PrintRequestStatus` | One canonical state |
| `estimatedProgress` | integer or `null` | `null`, `0…99`, or `100` according to status |
| `scheduledStartAt` | date-time or `null` | Validated provider estimate |
| `scheduledEndAt` | date-time or `null` | Validated provider estimate |
| `lastObservedAt` | date-time or `null` | Last validated provider observation |
| `createdAt` | date-time string | Local request creation time |

Provider identifiers and raw status values never appear.

### PrintRequestPageResponse

```text
items: PrintRequestResponse[]
pageInfo: PageInfoResponse
```

### POST `/api/patients/{patientId}/scans/{scanId}/print-requests`

- `operationId`: `createPrintRequest`
- Summary: Submit one eligible scan for printing.
- Description: Persists one stable reference before the single non-idempotent provider submission; ambiguous results return the local confirmation-pending resource and are never retried blindly.
- Request body: None
- Success: `201 Created`, `PrintRequestResponse`, and `Location: /api/patients/{patientId}/print-requests`

Definite provider confirmation may return `queued`, `in_progress`, `completed`, or `failed`; an ambiguous transport outcome returns `confirmation_pending` with `201` because the local accepted resource now owns reconciliation.

Errors:

| Status | Code | Cause |
| --- | --- | --- |
| `400` | `VALIDATION_FAILED` | A path identifier is malformed. |
| `401` | `AUTHENTICATION_REQUIRED` | No valid session exists. |
| `404` | `PATIENT_NOT_FOUND` | The patient is unknown or foreign-owned. |
| `404` | `SCAN_NOT_FOUND` | The scan is unknown, foreign-owned, or not in the patient. |
| `409` | `PRINT_REQUEST_CONFLICT` | The scan already has a non-terminal request. |
| `503` | `PRINTING_CAPACITY_REACHED` | The printing center definitively rejected the request for capacity; no accepted local request remains. |
| `503` | `PRINTING_UNAVAILABLE` | A definite non-ambiguous provider/configuration failure prevented submission. |
| `500` | `INTERNAL_ERROR` | Local reference or reservation persistence failed. |

### GET `/api/patients/{patientId}/print-requests`

- `operationId`: `listPatientPrintRequests`
- Summary: List a patient's persisted print requests.
- Description: Returns the bounded persisted lifecycle projection without contacting the printing provider, so provider latency cannot delay rows or pagination.
- Query: `ServerPageQuery`
- Success: `200 OK`, `PrintRequestPageResponse`

Errors: `400 VALIDATION_FAILED`, `401 AUTHENTICATION_REQUIRED`, `404 PATIENT_NOT_FOUND`, `500 INTERNAL_ERROR`.

### GET `/api/patients/{patientId}/print-requests/statuses`

- `operationId`: `refreshPatientPrintRequests`
- Summary: Refresh a patient's print-request statuses.
- Description: Reads the same bounded persisted page, reconciles its active rows through their persisted reference and known provider identifier, persists validated observations, and returns the resulting lifecycle projection. Repeating the operation never submits a new print request.
- Query: `ServerPageQuery`
- Success: `200 OK`, `PrintRequestPageResponse`

Errors: `400 VALIDATION_FAILED`, `401 AUTHENTICATION_REQUIRED`, `404 PATIENT_NOT_FOUND`, `503 PRINTING_UNAVAILABLE` when one or more non-terminal rows cannot be refreshed through the provider, `500 INTERNAL_ERROR`.

A provider reconciliation failure rejects only the independent status-refresh request. TanStack Query retains the persisted or previously refreshed page and the frontend displays the refresh warning without blocking rows or pagination. A provider `404` for an unresolved stable reference is not an integration failure and leaves the durable `confirmation_pending` row unchanged.

## Stable Problem Codes

| Code | Default status | Frontend category |
| --- | --- | --- |
| `VALIDATION_FAILED` | `400` | Field or request correction |
| `AUTHENTICATION_REQUIRED` | `401` | Reauthenticate and preserve only safe destination |
| `AUTHENTICATION_FAILED` | `401` | Generic credential correction |
| `AUTH_RATE_LIMITED` | `429` | Retry later |
| `ACCOUNT_ALREADY_EXISTS` | `409` | Account-creation correction |
| `PATIENT_NOT_FOUND` | `404` | Non-disclosing unavailable resource |
| `SCAN_NOT_FOUND` | `404` | Non-disclosing unavailable resource |
| `SCAN_TOO_LARGE` | `413` | Choose a file within the limit |
| `SCAN_UNSUPPORTED_TYPE` | `415` | Choose a supported PLY encoding |
| `SCAN_INVALID_CONTENT` | `422` | Remove or replace the selected file |
| `SCAN_STORAGE_UNAVAILABLE` | `503` | Deliberate upload/download retry |
| `PRINT_REQUEST_CONFLICT` | `409` | Open the existing request |
| `PRINTING_CAPACITY_REACHED` | `503` | Retry later; no accepted request |
| `PRINTING_UNAVAILABLE` | `503` | Keep last-known state and retry a safe read |
| `INTERNAL_ERROR` | `500` | Generic safe recovery |

## Generated Client Behavior

- Native Fetch always uses `credentials: 'include'`.
- The request mutator does not set `Content-Type` for `FormData`; the browser owns its multipart boundary.
- Non-success responses are parsed as `ProblemDetailsResponse` when possible and become one typed `ApiProblem` error.
- Malformed error bodies become `INTERNAL_ERROR` without exposing response text.
- Query retry: one retry only for network failures or `5xx`; none for `401` or other `4xx`.
- Mutation retry: always disabled.
- OpenAPI tags group generated files; application code explicitly invalidates generated query keys after successful mutations.
- Generated enums are the only frontend transport-enum definitions.

## OpenAPI Generation Rules

- Use concrete `*Request`, `*Response`, `*PageResponse`, and `*Query` classes stored in `*.dto.ts` files.
- Add explicit metadata for enums, arrays, nullable values, cookie auth, multipart input, PLY binary output, and all error responses.
- Give every success and error response an endpoint-specific description.
- Publish `ScanEncoding` and `PrintRequestStatus` once with stable `enumName` values.
- Never expose TypeORM entities, application commands, MinIO SDK types, or provider payloads.
- Emit the document from the same bootstrap configuration as runtime, then run both Orval outputs from that exact document.
