# Quickstart: Patient Profile Photos

This guide validates the accepted feature after implementation. Use synthetic images and identities only.

## Prerequisites

- Node.js 24 and the repository npm lockfile installed.
- Docker with the repository's PostgreSQL and MinIO services available.
- A safe `.env.local` derived from `.env.example`; never use or record production credentials.

## Start Migrated Dependencies

```bash
npm exec nx -- run infrastructure:up
npm exec nx -- run database:validate
npm exec nx -- run database:migrate
```

Expected result: PostgreSQL and MinIO are healthy and the full Liquibase chain applies `004-patient-profile-photos.xml` without changing applied history.

## Generate The Executable Client

```bash
npm exec nx -- run web:generate-api
```

Expected result: ignored OpenAPI and Orval outputs contain multipart create/update mutations, `hasPhoto`, and the authenticated binary photo operation. No generated file is edited manually or staged.

## Focused Automated Validation

```bash
npm exec nx -- test api
npm exec nx -- test web
npm exec nx -- lint api
npm exec nx -- lint web
npm exec nx -- typecheck api
npm exec nx -- typecheck web
npm exec nx -- build api
npm exec nx -- build web
```

Run the repository workflow's `nx affected` commands before delivery; do not replace Nx project selection with manual filters.

## Manual Product Validation

Use synthetic JPEG, PNG, and WebP files. Include one valid small image, one image exactly 5 MiB if a deterministic fixture generator is available, one file one byte over the limit, one corrupt image, and one file whose extension or browser type disagrees with its bytes. Do not commit these files.

### Create

1. Create a patient without a photo and confirm the existing direct workspace transition.
2. Select a valid photo and confirm preparing then selected review, with zero network mutation before submit.
3. Replace and remove the selection without losing valid patient fields.
4. Submit a valid selected photo and confirm one patient with one current identity.
5. Confirm unsupported, oversized, empty, and corrupt files produce localized corrections and no patient request.

### Edit

1. Open Edit patient from the workspace in desktop `1440×900` and compact `390×900`.
2. Change identity fields while keeping the photo; confirm `createdAt`, scans, and print requests are unchanged.
3. Add, replace, and remove a photo in separate runs.
4. Confirm Save changes is unavailable with no effective change, invalid input, or while pending.
5. Force a failed update and confirm the prior patient remains authoritative while edited values remain recoverable.

### Identity And Security

1. Confirm directory and workspace use the same current photo while the full name remains visible.
2. Confirm no-photo and failed-image states show Unicode-correct initials without blocking navigation.
3. Request a missing, foreign, and no-photo patient photo; confirm indistinguishable safe not-found behavior.
4. Inspect patient JSON, browser storage, application logs, and network headers: no storage key, provider host, original filename, image bytes in JSON, credentials, or public/pre-signed URL may appear.
5. Replace or remove a photo and confirm the former authorized route no longer returns its bytes.

## Container And Diff Validation

```bash
npm exec nx -- run api:container
npm exec nx -- run web:container
git diff --check
git status --short
```

Expected result: both images build with the locked dependencies, only intended feature artifacts and source changes are present, generated outputs remain ignored, and no protected data or runtime file is staged.
