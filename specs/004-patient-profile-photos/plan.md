# Implementation Plan: Patient Profile Photos

**Branch**: `docs/patient-profile-photos-plan` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

**Input**: Accepted feature specification at `specs/004-patient-profile-photos/spec.md` @ `a493e190c47fad34d216b5c64bcd2e309808c258`

## Summary

Extend the existing owner-scoped patient vertical with optional private JPEG, PNG, or WebP content, full patient identity editing, and a consistent photo-or-initials presentation. Keep the implementation bounded: store one nullable photo metadata set directly on `patient`, reuse the existing private MinIO bucket through one shared adapter, submit create and update forms as multipart requests, and serve the current photo only through an authenticated API stream. PostgreSQL remains the confirmed-state authority; explicit compensation removes a newly written object when persistence fails, while a committed replacement or removal makes the former object unreachable before best-effort cleanup.

## Technical Context

**Language/Version**: TypeScript 6.0 on Node.js 24 LTS; React 19 browser client

**Primary Dependencies**: NestJS 11, TypeORM 0.3.31, PostgreSQL 18, MinIO JavaScript client 8.0.7, `sharp` 0.35.3, `file-type` 22.0.2, React Hook Form 7.85, TanStack Query 5.101, Orval 8.24, shadcn/ui Base UI primitives, i18next 26

**Storage**: PostgreSQL for patient and current-photo metadata; the existing private MinIO bucket for bounded image bytes; no browser or public object storage

**Testing**: Jest 30 for API services and validation, Vitest 4 with Testing Library and MSW for Web behavior, Liquibase 4.33 validation and full migration chain

**Target Platform**: Existing Linux API container and evergreen desktop/compact browsers

**Project Type**: Nx monorepo containing a NestJS API, React/Vite SPA, Liquibase database project, and Docker infrastructure project

**Performance Goals**: Preserve the current page size of 10 patients; stream confirmed photos instead of embedding them in collection JSON; keep local previews and server validation bounded by the accepted 5 MiB limit

**Constraints**: Authenticated owner scope; no public or pre-signed URL; no original filename or storage key in contracts or logs; no partial confirmed patient state; no more than one current photo; no direct `useEffect`; generated OpenAPI/Orval artifacts remain ignored and manually immutable

**Scale/Scope**: One existing patient table, one optional image per patient, two patient forms, two identity surfaces, English and French, desktop and compact compositions

## Constitution Check

*GATE: Passed before research and re-checked after Phase 1 design.*

- **Repository authority**: The plan is bound to issue #64, the accepted specification snapshot, and the explicitly approved Figma section `425:3` in `Ready for Development`.
- **Accepted intent**: The plan implements `FR-001…FR-019` and `SC-001…SC-011` without adding patient deletion, image editing, public storage, or another product destination.
- **Architecture authority**: The implementation stays inside the delivered NestJS, React/Vite, PostgreSQL, MinIO, Liquibase, OpenAPI/Orval, shadcn/ui, and Nx architecture.
- **Operational authority**: This candidate changes no runtime source before explicit plan approval and creates no Spec Kit-derived GitHub issues.
- **Protected data**: Only synthetic images and identities may enter tests, documentation, designs, or screenshots. Original filenames, image bytes, storage keys, credentials, and personal data remain out of logs and committed evidence.
- **Generated artifacts**: Nest DTOs and controllers remain the executable contract; OpenAPI and Orval outputs are regenerated through Nx and remain ignored.
- **KISS check**: No new application, bucket, queue, outbox, gallery, image transformation pipeline, generic repository, or parallel contract is introduced. The only new shared boundary is the already cross-feature MinIO client responsibility.

Post-design re-check: passed. The data model, HTTP contract, UI contract, and compensation rules remain within the accepted specification and current source boundaries. The post-commit orphan risk is recorded explicitly rather than hidden behind a speculative background system.

## Project Structure

### Documentation (this feature)

```text
specs/004-patient-profile-photos/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── http-api.md
│   └── ui.md
└── tasks.md                 # Created only after plan approval
```

### Source Code (repository root)

```text
apps/api/src/
├── app/patients/
│   ├── api/
│   │   ├── controllers/patients.controller.ts
│   │   ├── dto/
│   │   ├── mappers/patient-api.mapper.ts
│   │   └── pipes/patient-photo-upload.pipe.ts
│   ├── application/
│   │   ├── models/patient.model.ts
│   │   ├── services/patients.service.ts
│   │   └── validation/patient-photo.validator.ts
│   └── infrastructure/persistence/
│       ├── patient.entity.ts
│       └── mappers/patient-persistence.mapper.ts
├── app/scans/                 # Adopts the shared private-storage token
└── storage/
    ├── private-object-storage.module.ts
    ├── private-object-storage.port.ts
    └── minio-private-object-storage.adapter.ts

apps/web/src/
├── modules/patients/
│   ├── lib/patient-identity.ts
│   └── ui/
│       ├── patient-create-overlay.tsx
│       ├── patient-edit-overlay.tsx
│       ├── patient-form-fields.tsx
│       ├── patient-identity.tsx
│       └── patient-photo-field.tsx
├── shared/api/generated/      # Ignored Orval output; never edited manually
└── shared/ui/                  # Existing official Avatar, Button, Dialog and Drawer

database/
├── changelog/004-patient-profile-photos.xml
└── db.changelog-master.xml

docs/
├── backend.md
└── frontend.md
```

**Structure Decision**: Keep the behavior inside the existing patients vertical. Promote only the already shared MinIO client mechanics to `apps/api/src/storage`; patient-specific validation, orchestration, persistence, presentation, and tests remain in the patient feature. Reuse the repository's generated clients and official shadcn primitives instead of adding wrappers or a second UI system.

## Delivery Design

### API and persistence

- Append Liquibase changelog `004-patient-profile-photos.xml`; production history already exists, so applied changelogs remain immutable.
- Add nullable `photo_storage_key`, `photo_format`, and `photo_size_bytes` columns to `patient`, with one all-null-or-all-present constraint. A separate photo table is unnecessary because the accepted model permits exactly one current photo and no history.
- Convert `POST /api/patients` to one multipart contract containing the existing identity fields plus an optional `photo`. The no-photo user outcome and route remain unchanged.
- Add `PATCH /api/patients/:patientId` with the complete editable identity fields, a generated `photoAction` value (`keep`, `replace`, or `remove`), and an optional replacement file.
- Add `GET /api/patients/:patientId/photo` to stream only the current owned photo with its validated media type, exact length, and `Cache-Control: private, no-store`.
- Add `hasPhoto` to patient responses. Do not expose a photo URL, key, original filename, provider value, or photo metadata not required by the UI.
- Use `sharp` with its untrusted-input safety defaults to detect JPEG, PNG, or WebP and perform a complete pixel decode. Multer and the feature pipe enforce the 5 MiB inclusive limit before application orchestration.

### Storage and consistency

- Replace the scan-specific MinIO adapter/token with one `PrivateObjectStoragePort` registered by `PrivateObjectStorageModule`; scans keep their existing public problems and behavior while patients translate the same provider-neutral failures into patient-photo problems.
- Keep the existing configured private bucket and flat UUID object keys. This requires no new environment variable, MinIO resource, public policy, or Dokploy change.
- Write a new photo before the database transaction. Inside the transaction, use only its scoped EntityManager, lock the owned patient row for update, and persist the full identity plus photo decision as one row state.
- If the database transaction fails, remove the new object before returning the failure. If that compensation fails, return the safe storage-unavailable problem and log only the operation and outcome.
- After a successful replacement or removal commit, the old key is no longer reachable through any API response or lookup. Remove that exact object after commit. A cleanup failure is logged safely but does not turn a committed patient update into a false failure.
- Do not add a queue or outbox for this bounded assessment. The accepted product guarantee is immediate inaccessibility through the product; rare post-commit orphan cleanup remains the explicit operational trade-off.

### Web experience

- Compose create and edit flows from feature-owned `PatientFormFields` and `PatientPhotoField`; avoid a generic form framework.
- Use the official local shadcn `Avatar`, `Button`, `Dialog`, `Drawer`, `Field`, and `Input` sources and semantic CSS tokens already synchronized with the UI Library.
- Validate size, extension, and content signature with `fileTypeFromBlob`, then use `createImageBitmap(file)` to prove local decodability. Treat this as immediate UX feedback only; the API remains authoritative. Keep the exact `File` only in ephemeral component state and issue no request until Create patient or Save changes.
- Render the selected file through a React 19 callback ref that creates and revokes its Blob URL. Replacement, removal, close, cancel, and unmount all dispose the prior local URL without `useEffect`.
- Render confirmed content with the authenticated API photo route as `AvatarImage.src`; the HTTP-only cookie remains the credential boundary and `AvatarFallback` owns missing or failed images.
- Derive initials with `Intl.Segmenter` using the active locale so the first user-perceived character of each trimmed name is preserved.
- Invalidate the exact patient and patient-page query keys after a successful update. Key the image instance to the query refresh so an unchanged authenticated route reloads after a replacement.
- Keep names visible beside avatars, preserve row activation, and use icon-only edit treatment only with a localized accessible name.

### Generated contracts and documentation

- Update Nest DTOs, Swagger metadata, status descriptions, and stable Problem Details codes first.
- Run `web:generate-api`; consume the generated multipart mutation types, patient response, query keys, and Zod Mini request schemas. Never hand-edit generated output.
- Add short implementation notes to `docs/backend.md` and `docs/frontend.md`; keep detailed trade-offs in these feature artifacts.

## Validation Strategy

1. **Focused API**: patient service orchestration, content validation for synthetic JPEG/PNG/WebP and corrupt files, ownership concealment, create/update compensation, old-object cleanup semantics, and authenticated streaming.
2. **Focused Web**: no-photo creation regression; preparing, selected, replace, remove and invalid local states; zero request before submit; edit keep/replace/remove; photo and initials identity; failed confirmed image fallback; keyboard and localized accessible names.
3. **Contract**: emit OpenAPI, regenerate Orval, inspect multipart bodies and binary photo response, and type-check both applications.
4. **Persistence**: validate and execute the full Liquibase chain on PostgreSQL, then start the API against the migrated schema.
5. **Regression**: existing scan upload/preview/download, patient pagination/opening, printing, authentication, and collection tests selected by Nx.
6. **Build and delivery**: Nx affected lint, typecheck, test, build and container targets; no manual project filtering or deployment trigger.
7. **Final safety**: `git diff --check`, ignored/generated artifact inspection, secret and protected-data scan, desktop `1440×900` and compact `390×900` comparison against approved Figma nodes.

## Complexity Tracking

No constitution violation requires an exception.
