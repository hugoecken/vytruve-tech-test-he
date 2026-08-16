# UI Contract: Scan Upload Preview

**Status**: Accepted with plan fingerprint `aaf4389c8b48aa46cde771f5198785d3453643d1610892ffdfd5f29d64a77c2c`

## Authorities

- Accepted feature specification: [`../spec.md`](../spec.md) at `5c39c320b3165fb971603278ac52322699e8e7bc`
- Figma section: `06 · Scan upload preview` (`417:6028`) in `Ready for Development`
- Desktop ready: `417:6029`
- Compact ready: `417:6113`
- Desktop preparing: `417:6214`
- Desktop unavailable: `417:6297`

Figma owns composition and visual hierarchy. The specification owns behavior. This contract binds stable states and actions without duplicating CSS or Figma tokens.

## State Contract

| Stable state | Visible content | Preview request | Upload decision |
| --- | --- | --- | --- |
| `SCAN-UPLOAD-EMPTY` | Existing chooser | None | Unavailable until one eligible selection |
| `SCAN-UPLOAD-PREVIEW-PREPARING` | File summary, viewer, five disabled controls, announced progress | None | Existing eligibility preserved |
| `SCAN-UPLOAD-PREVIEW-READY` | File summary, detected PLY encoding, mesh, five enabled controls | None | Existing eligibility preserved |
| `SCAN-UPLOAD-PREVIEW-UNAVAILABLE` | File summary and safe local feedback | None | Existing eligibility preserved |

## Action Contract

| Stable action | Accessible English name | Result |
| --- | --- | --- |
| `ACT-SCAN-UPLOAD-CHOOSE` | Choose PLY file | Selects or replaces the current file |
| `ACT-SCAN-UPLOAD-REMOVE` | Remove selected file | Disposes preview and returns to empty |
| `ACT-SCAN-UPLOAD-SUBMIT` | Add scan | Runs the existing upload mutation once |
| `ACT-UPLOAD-PREVIEW-ROTATE-LEFT` | Rotate left | Rotates and renders once when ready |
| `ACT-UPLOAD-PREVIEW-ROTATE-RIGHT` | Rotate right | Rotates and renders once when ready |
| `ACT-UPLOAD-PREVIEW-ZOOM-IN` | Zoom in | Moves closer and renders once when ready |
| `ACT-UPLOAD-PREVIEW-ZOOM-OUT` | Zoom out | Moves farther and renders once when ready |
| `ACT-UPLOAD-PREVIEW-RESET` | Reset view | Restores the fitted view and renders once when ready |

The five toolbar buttons are present in the same DOM order from the first preparing render. They have no visible text, remain on one row, use existing semantic tokens, and change only from disabled to enabled when ready.

## Layout Contract

### Desktop

- Keep the existing patient workspace and responsive upload Dialog.
- Use the approved wide composition with a 4:3 viewer and toolbar beside the selected-file facts.
- Keep Cancel and Add scan in the existing footer.

### Compact

- Keep the existing scrollable upload Drawer.
- Stack viewer, toolbar, selected-file facts, then the existing footer actions.
- Apply `data-base-ui-swipe-ignore` to the interactive viewer only.

## Failure Contract

Local file-read, invalid/empty PLY, WebGL2, and temporary-resource failures share one localized unavailable presentation. The UI must not add a local Retry action or expose:

- parser, graphics, allocation, browser, or transport details;
- storage provider, bucket, object key, public URL, or Blob URL;
- supplied sample names, scan bytes, or decoded geometry;
- any new reason to block an otherwise eligible explicit upload.

Unknown PLY header directives also use this safe failure path. Their text and values are never written to the console.

## Existing Scan Correction

The existing-scan Suspense fallback renders its viewport and the same five disabled controls together. Retrieval, metadata, Retry, Download, Print, close, and query behavior remain unchanged.

## Localization Contract

- English technical encoding values remain unchanged.
- French displays `Binaire (little-endian)` and `Binaire (big-endian)`.
- French contains no `petit-boutiste` or `gros-boutiste` presentation value.
- Async state and every icon control retain localized accessible names.
