# HTTP Contract: Patient Profile Photos

The executable contract remains the NestJS controllers, DTOs, validation decorators, and Swagger metadata. This document fixes the intended shape for planning; it is not a handwritten OpenAPI authority.

All routes require the existing HTTP-only session cookie. Missing and foreign patients are indistinguishable.

## Create Patient

`POST /api/patients`

Content type: `multipart/form-data`

| Part | Type | Required | Rules |
| --- | --- | --- | --- |
| `firstName` | string | yes | Existing trimmed grapheme rules. |
| `lastName` | string | yes | Existing trimmed grapheme rules. |
| `age` | integer-compatible form value | yes | Existing integer 0–150 rule. |
| `photo` | binary | no | JPEG, PNG, or WebP; 1–5,242,880 bytes; fully decodable. |

Success: `201 Created`, existing `Location: /api/patients/{patientId}`, and `PatientResponse`.

Relevant failures: `400`, `401`, `413`, `415`, `422`, `503`, and safe `500`.

The endpoint writes no patient when the optional photo cannot be validated or stored.

## Update Patient

`PATCH /api/patients/{patientId}`

Content type: `multipart/form-data`

| Part | Type | Required | Rules |
| --- | --- | --- | --- |
| `firstName` | string | yes | Complete current or changed value. |
| `lastName` | string | yes | Complete current or changed value. |
| `age` | integer-compatible form value | yes | Complete current or changed value. |
| `photoAction` | `keep \| replace \| remove` | yes | Explicit current-photo decision. |
| `photo` | binary | conditional | Required only for `replace`; forbidden otherwise. |

Success: `200 OK` and the updated `PatientResponse`. Patient identity and the photo decision are persisted as one confirmed row state. `createdAt`, ownership, scans, and print requests remain unchanged.

Relevant failures: `400`, `401`, `404`, `413`, `415`, `422`, `503`, and safe `500`.

## Get Patient Photo

`GET /api/patients/{patientId}/photo`

Success: `200 OK` with the stored bytes and:

- `Content-Type: image/jpeg`, `image/png`, or `image/webp` from detected server metadata;
- exact `Content-Length`;
- `Cache-Control: private, no-store`;
- no `Content-Disposition`, original filename, storage key, or provider header.

Failures:

- `400` for an invalid UUID;
- `401` without a valid session;
- the same `404 PATIENT_NOT_FOUND` for missing, foreign, or no-current-photo states;
- `503 PATIENT_PHOTO_STORAGE_UNAVAILABLE` for a referenced object that is missing, inconsistent, or unavailable;
- safe `500` for an unexpected internal failure.

## Patient Response

```text
{
  id: uuid,
  firstName: string,
  lastName: string,
  age: integer,
  createdAt: date-time,
  hasPhoto: boolean
}
```

`PatientPageResponse.items` uses the same representation. No photo bytes or private metadata are embedded in JSON.

## Stable Photo Problems

| Status | Code | Meaning |
| --- | --- | --- |
| `413` | `PATIENT_PHOTO_TOO_LARGE` | File exceeds 5 MiB. |
| `415` | `PATIENT_PHOTO_UNSUPPORTED_TYPE` | Content is not JPEG, PNG, or WebP. |
| `422` | `PATIENT_PHOTO_INVALID_CONTENT` | Declared supported image cannot be fully decoded. |
| `503` | `PATIENT_PHOTO_STORAGE_UNAVAILABLE` | Private object storage cannot complete the authorized operation safely. |

Field violations continue to use the existing `VALIDATION_FAILED` Problem Details shape. Public details contain no filename, bytes, key, provider response, or path.
