# Data Model: Patient Profile Photos

## Patient

The existing owner-scoped patient record remains the only durable product entity changed by this feature.

| Field | Persistence | Rules |
| --- | --- | --- |
| `id` | Existing UUID primary key | Stable across every edit. |
| `accountId` | Existing UUID foreign key | Derived from the authenticated session and never editable. |
| `firstName` | Existing `varchar(100)` | Trimmed; 1–100 grapheme clusters. |
| `lastName` | Existing `varchar(100)` | Trimmed; 1–100 grapheme clusters. |
| `age` | Existing `smallint` | Integer from 0 through 150. |
| `createdAt` | Existing timezone-safe timestamp | Never changes during editing. |
| `photoStorageKey` | New nullable `varchar(36)` | Server-generated opaque UUID; never public. |
| `photoFormat` | New nullable `varchar(4)` | Only `jpeg`, `png`, or `webp`, detected from content. |
| `photoSizeBytes` | New nullable integer | From 1 through 5,242,880 inclusive. |

### Database invariants

- `photoStorageKey`, `photoFormat`, and `photoSizeBytes` are either all null or all non-null.
- Existing ownership, age, account foreign key, deterministic pagination index, and created timestamp remain unchanged.
- The database stores no original filename, image URL, image bytes, photo history, or provider metadata.

## Patient Photo

`Patient Photo` is the application view of the three nullable patient columns plus one private object. It is not a separate table or public resource representation.

| Value | Owner | Lifetime |
| --- | --- | --- |
| `storageKey` | API-generated private storage key | Referenced by exactly one current patient state. |
| `format` | Server content validator | Replaced or cleared atomically with the patient row. |
| `sizeBytes` | Bounded multipart input | Used to verify streamed object integrity. |
| bytes | Existing private MinIO bucket | Written before persistence; removed after failed persistence or after the row stops referencing the former key. |

## Local Photo Selection

Ephemeral browser state only; never persisted or placed in a query cache.

| Field | Rules |
| --- | --- |
| `file` | One browser `File`, at most 5 MiB. |
| `status` | `preparing`, `selected`, or `invalid`. |
| `failure` | Safe localized category: type, size, or decode. |
| local preview URL | Created only by the mounted preview image and revoked by its React 19 ref cleanup. |

## Photo Decision

The update request uses one explicit decision:

| Value | File | Confirmed result |
| --- | --- | --- |
| `keep` | Forbidden | Retain existing photo metadata and bytes. |
| `replace` | Required and valid | Reference the new object and retire the prior object. |
| `remove` | Forbidden | Clear all photo metadata and retire the prior object. |

For creation, omission means no photo and one valid file means create with photo; no separate decision field is needed.

## State Transitions

### Local selection

```text
empty -> preparing -> selected
empty -> preparing -> invalid
selected -> preparing -> selected
selected -> remove -> empty
invalid -> choose -> preparing
any local state -> cancel/close -> discarded
```

An obsolete async decode result is ignored when a replacement, removal, close, or cancel has changed the current selection token.

### Confirmed patient state

```text
no photo + create without file -> no photo
no photo + create with file -> current photo
no photo + replace -> current photo
current photo + keep -> same current photo
current photo + replace -> new current photo
current photo + remove -> no photo
```

### Failure consistency

- Validation or storage-write failure changes no patient row.
- Database failure after a new write triggers exact-key removal; the prior confirmed patient remains authoritative.
- Replacement or removal commit clears the former key from the only owner-scoped lookup before physical deletion is attempted.
- Former object cleanup failure leaves no product route to the bytes and produces only a safe operational log event.

## Public Representation

`PatientResponse` keeps the existing `id`, `firstName`, `lastName`, `age`, and `createdAt`, and adds only:

| Field | Type | Meaning |
| --- | --- | --- |
| `hasPhoto` | boolean | Whether the current patient row has a complete photo metadata set. |

The client constructs the authenticated application route from `id`; the response never contains a photo URL or private metadata.
