# Research: Patient Profile Photos

## One Multipart Contract Per Patient Mutation

**Decision**: Use `multipart/form-data` for `POST /api/patients` and `PATCH /api/patients/:patientId`. The create request contains the existing identity fields plus an optional photo. The update request contains the complete editable identity fields, one explicit `photoAction`, and an optional replacement photo.

**Rationale**: One request is the only simple way for the API to confirm identity fields and one photo decision as one patient result. Nest's built-in Express integration already provides `FileInterceptor`, `UploadedFile`, optional `ParseFilePipe` validation, and Multer limits; Orval already generates multipart `FormData` mutations through the repository's Fetch client. [Nest file upload](https://docs.nestjs.com/techniques/file-upload)

**Alternatives considered**:

- Separate patient and photo mutations were rejected because a successful patient request followed by a failed photo request would violate the accepted all-or-confirmed result.
- A custom content-type-switching interceptor preserving both JSON and multipart request bodies was rejected as unnecessary framework plumbing.
- Browser-direct or pre-signed uploads were rejected by the specification.

## Current Photo Metadata Lives On Patient

**Decision**: Add three nullable columns to `patient`: opaque storage key, detected format, and exact byte length. All three are absent or present together.

**Rationale**: The product permits zero or one current photo, no history, and no independent photo destination. A separate entity would add a join, repository, mapper, migration relationship, and lifecycle without owning another product concept.

**Alternatives considered**:

- A `patient_photo` table was rejected because one-to-one history, independent identity, or separate lifecycle is explicitly out of scope.
- Embedding image bytes in PostgreSQL was rejected because the repository already owns private object storage for bounded uploaded content.

## Reuse One Private MinIO Boundary

**Decision**: Promote the current scan-specific MinIO client mechanics to one API-level `PrivateObjectStoragePort` and adapter. Keep the existing configured private bucket and flat UUID keys for both scans and patient photos.

**Rationale**: MinIO's maintained JavaScript client already owns `bucketExists`, `putObject`, `statObject`, `getObject`, and `removeObject`. The provider client, bucket readiness, key validation, and provider-error translation are now genuinely cross-feature responsibilities; duplicating them would create two owners for the same private storage behavior. [MinIO JavaScript client API](https://docs.min.io/aistor/developers/sdk/javascript/api/)

**Alternatives considered**:

- A second patient-photo bucket was rejected because it adds configuration and deployment work without an accepted isolation or retention requirement.
- A second patient-only MinIO adapter was rejected as duplicated provider knowledge.
- A generic repository or broad infrastructure framework was rejected; the shared port contains only the four operations already required.

## Database-First Confirmed State With Explicit Compensation

**Decision**: Write a new object before opening a short database transaction. Use the transaction-scoped EntityManager for every locked patient read and write. Remove the new object if the transaction fails. After a committed replacement or removal, unlink the old key in PostgreSQL first, then remove the exact former object.

**Rationale**: PostgreSQL and MinIO cannot share one atomic transaction. TypeORM explicitly requires all transaction work to use the provided transactional EntityManager. Keeping MinIO calls outside the transaction avoids holding row locks during network I/O. Once the row no longer references the old key, the former photo is immediately inaccessible through the product even if physical cleanup must be retried operationally. [TypeORM transactions](https://typeorm.io/docs/transactions/)

**Alternatives considered**:

- Deleting the old object before commit was rejected because a database failure would leave the confirmed row pointing to missing content.
- Returning failure after a successful database commit was rejected because it would report a false retryable failure and risk duplicate mutation.
- A queue, outbox, or cleanup worker was rejected as disproportionate to this assessment and not required by the accepted product guarantee.

## Detect Content And Prove Full Decodability

**Decision**: Add `sharp@^0.35.3` for authoritative API validation and `file-type@^22.0.2` for browser preflight. Validate the 5 MiB limit before orchestration, detect only `jpeg`, `png`, or `webp` from content, and execute a full pixel-derived operation with Sharp's untrusted-input safety defaults before storing the original bounded bytes.

**Rationale**: Browser MIME and file extensions are untrusted. `file-type` detects binary formats from their signatures and accepts a browser `File` through `fileTypeFromBlob`, which avoids handwritten signature parsing and gives immediate mismatch feedback. Its result remains a best-effort hint, not a security boundary. Sharp accepts Buffer input, aborts invalid pixel data according to `failOn`, keeps input safety limits enabled by default, and exposes both detected metadata and pixel-derived operations. Its current package requires Node.js 20.9 or newer, which is compatible with the repository's Node.js 24 runtime. Header-only `metadata()` is insufficient because Sharp documents that it does not decode compressed pixels. [file-type](https://github.com/sindresorhus/file-type), [Sharp constructor](https://sharp.pixelplumbing.com/api-constructor/), [Sharp input metadata and statistics](https://sharp.pixelplumbing.com/api-input/)

**Alternatives considered**:

- Trusting MIME type or extension was rejected at the upload trust boundary.
- Treating signature detection as authoritative was rejected because it cannot prove that the image is decodable.
- Re-encoding every photo was rejected because the specification requests validation and storage, not transformation.

## Direct Authenticated Image Route

**Decision**: Serve `GET /api/patients/:patientId/photo` through the existing cookie-authenticated API and place that same-origin API URL directly in the official shadcn `AvatarImage`. Return `private, no-store`; return the same safe not-found result for missing, foreign, or absent content.

**Rationale**: The browser can attach the HTTP-only session cookie without exposing it to React, while the API performs owner-scoped lookup before opening MinIO. No photo URL, storage key, provider host, Blob contents, or token enters patient JSON. The shadcn Avatar explicitly composes an image with a fallback. [shadcn Avatar](https://ui.shadcn.com/docs/components/base/avatar)

**Alternatives considered**:

- Base64 in patient JSON was rejected because it bloats every collection response and exposes content to JavaScript state.
- A TanStack Query Blob cache was rejected because the browser image element already owns this exact fetch-and-render responsibility.
- Public or pre-signed URLs were rejected by the specification.

## Local Decode And Blob URL Lifecycle

**Decision**: In the file-selection event, validate size, supported extension, and the `fileTypeFromBlob` result, then await `createImageBitmap(file)` and close the resulting bitmap. Render the accepted local file through a stable React 19 callback ref that creates and revokes one Blob URL.

**Rationale**: `createImageBitmap` is a widely available browser decode primitive for Blob sources. React 19 callback refs may return cleanup functions, so the preview can release its URL on replacement or unmount without `useEffect`. [MDN createImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap), [React 19 ref cleanup](https://react.dev/blog/2024/12/05/react-19), [MDN Blob URL cleanup](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static)

**Alternatives considered**:

- `FileReader` data URLs were rejected because they copy and expand the whole file.
- An effect-driven URL lifecycle was rejected by the repository's React policy.
- A worker was rejected because 5 MiB selection and one decode do not justify another execution boundary.

## Generated Contracts Remain The Only Client Authority

**Decision**: Describe multipart and binary responses in Nest Swagger metadata, emit the OpenAPI document through `api:openapi`, and regenerate the Fetch/TanStack Query client and Zod Mini request schemas through `web:generate-api`.

**Rationale**: This preserves the current executable authority chain and gives Orval responsibility for `FormData`, generated request types, query keys, and response models. No handwritten API client or schema is needed.

**Alternatives considered**:

- A handwritten photo client or multipart schema was rejected as a second contract.
- A committed OpenAPI file was rejected because generated artifacts remain reproducible and ignored.

## Approved UI Composition Uses Existing Primitives

**Decision**: Reuse the local official shadcn Base UI `Avatar`, `Button`, `Dialog`, `Drawer`, `Field`, and `Input` components and the semantic CSS tokens already synchronized to the UI Library.

**Rationale**: The approved Figma frames use those same canonical components. shadcn's current Base UI Avatar owns image/fallback composition, while the Button API supplies consistent outline and icon sizes without manual geometry. [shadcn Avatar](https://ui.shadcn.com/docs/components/base/avatar), [shadcn Button](https://ui.shadcn.com/docs/components/base/button)

**Alternatives considered**:

- A custom upload card or avatar primitive was rejected because the repository already owns the required components.
- Premium blocks were not used because no block maps more directly than the small approved composition.
