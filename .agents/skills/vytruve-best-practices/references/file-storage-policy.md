# File Upload and Storage Policy

## Boundary

Treat uploaded files as sensitive untrusted input. The HTTP layer receives the upload, an application use case authorizes and coordinates it, a content validator enforces the project file profile, and a storage adapter owns the selected private persistence mechanics.

## Upload

- Use the Nest Express platform integration with Multer and `FileInterceptor`.
- Use `ParseFilePipe` and explicit validators for presence and maximum size.
- Enforce the size limit in Multer and repeat it in application validation where required.
- Accept only the representations declared by the project file profile. Never trust MIME type or extension alone.
- Inspect content with a bounded parser appropriate to the declared format.
- Reject malformed, unsupported, encrypted, compressed, or detectably truncated
  content with a stable Problem Details code when those representations are not
  explicitly supported. The project profile defines how much structural or
  semantic validation its bounded parser can prove.
- Keep validation streaming or bounded; never load an unbounded upload into memory.

The project overlay owns accepted formats, content rules, and the exact byte limit. Test every declared boundary.

## Storage boundary

- Keep the selected storage backend, bucket or root, endpoint, and local-runtime details in the repository overlay.
- Generate an opaque random storage key. Never use the original filename as a path.
- Persist only necessary metadata, including owner, owning-resource relationship, size, validated format, storage key, and timestamps.
- Treat the original filename as untrusted display metadata; avoid retaining it unless the product requires it and never log it.
- Keep storage private. Do not expose provider endpoints, buckets, object keys, filesystem paths, public object URLs, or credentials through the HTTP contract.
- Put provider or filesystem mechanics behind one application-owned interface when that external boundary needs substitution in tests or deployment.

### S3-compatible object storage

- Use a maintained SDK and validate endpoint, bucket, access key, and secret configuration before accepting requests.
- Ensure the configured private bucket exists during readiness initialization; never make it anonymous or publicly readable.
- Use opaque flat object keys and path-style or virtual-host addressing only as selected by the repository profile.
- Stream authorized downloads from the SDK. Read an object fully only for a bounded internal consumer and enforce the configured maximum while consuming its stream.
- Validate object metadata such as size before trusting it and translate provider failures into safe `not_found` or `unavailable` categories.
- Use deployment-scoped credentials with the narrowest practical bucket permissions. Development-only root credentials must be explicit in the repository profile and must never be reused in a deployed environment.
- Do not introduce presigned URLs, browser-direct uploads, versioning, lifecycle policies, replication, or KMS integration without a product or deployment requirement.

### Filesystem storage

When the repository profile deliberately selects local filesystem storage:

- Store bytes outside the source tree in a Git-ignored runtime directory.
- Resolve and verify every path stays below the configured root; reject traversal and symbolic-link escapes.
- Write through a temporary file in the storage root and rename atomically after validation.

## Consistency and deletion

The database and storage backend do not share a transaction. Define compensating behavior:

- remove a newly written object if metadata persistence fails;
- do not remove an existing object until authorization and database intent are established;
- make cleanup idempotent and narrowly scoped to the exact validated object key or path;
- surface orphan cleanup failures operationally without leaking paths.

## Download

- Authorize ownership before opening the object.
- Stream through Nest `StreamableFile`; do not read the full object into memory.
- Set a safe content type, content length when known, and a sanitized download name only if required.
- Return a stable not-found or storage error without exposing provider or filesystem details.

## Tests

Cover each accepted format, invalid content, exact size boundaries, backend-specific key or path safety, unauthorized access, successful streaming, missing storage objects, unavailable storage, and compensation after persistence failure. Keep fixtures minimal, synthetic, and free of real user data.
