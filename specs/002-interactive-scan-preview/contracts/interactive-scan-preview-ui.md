# UI Contract: Interactive Scan Preview

**Status**: Candidate

## Authorities

- Accepted feature specification: [`../spec.md`](../spec.md)
- Desktop ready: Figma node `389:5324`
- Compact ready: Figma node `389:5334`
- Desktop preparing: Figma node `389:5711`
- Desktop unavailable: Figma node `389:5721`
- Canonical section: `05 · Interactive scan preview` (`389:5297`) in `Ready for Development`

Figma owns composition and visual hierarchy. The specification owns behavior. This contract binds stable states and actions to the implementation without copying design tokens into prose.

## State Contract

| Stable state | Visible content | Network behavior | Exit |
| --- | --- | --- | --- |
| `SCAN-PREVIEW-IDLE` | Metadata and Preview action | Zero content requests | Preview or close |
| `SCAN-PREVIEW-PREPARING` | Metadata and announced preparation | One active request at most | Ready, unavailable, or close |
| `SCAN-PREVIEW-READY` | Viewer, five controls, metadata | No automatic request | Interact or close |
| `SCAN-PREVIEW-UNAVAILABLE` | Generic failure, Retry, metadata | Zero automatic requests | Retry or close |

## Action Contract

| Stable action | Accessible English name | Result |
| --- | --- | --- |
| `ACT-SCAN-PREVIEW` | Preview 3D scan | Starts first attempt |
| `ACT-SCAN-PREVIEW-RETRY` | Retry preview | Starts one new attempt |
| `ACT-PREVIEW-ROTATE-LEFT` | Rotate left | Rotates and renders once |
| `ACT-PREVIEW-ROTATE-RIGHT` | Rotate right | Rotates and renders once |
| `ACT-PREVIEW-ZOOM-IN` | Zoom in | Moves closer and renders once |
| `ACT-PREVIEW-ZOOM-OUT` | Zoom out | Moves farther and renders once |
| `ACT-PREVIEW-RESET` | Reset view | Restores fitted view and renders once |

Every name has a French catalog equivalent. Toolbar buttons are visible, keyboard reachable, visibly focused, and disabled until the renderer is ready.

## Layout Contract

### Desktop

- Widen the existing dialog through `contentClassName`.
- Keep heading and close action above the content.
- Place the 4:3 viewer and toolbar beside the metadata list.
- Keep the existing footer Close action.

### Compact

- Keep the existing bottom drawer and scroll container.
- Stack viewer, toolbar, and metadata in that order.
- Apply `data-base-ui-swipe-ignore` to the interactive viewer root only.
- Preserve the existing footer Close action and drawer dismissal outside the viewer.

## Failure Contract

Retrieval, conversion, invalid/empty PLY, WebGL2, and temporary resource failures share one localized unavailable presentation. The UI must not include:

- HTTP status or server message;
- storage provider, bucket, or object key;
- original or supplied filename;
- scan bytes or decoded geometry details;
- a distinction between unknown, unavailable, and foreign-owned resources.

## Non-Regression Contract

The existing Download and Print actions remain separate from Preview. Opening details, using Preview, encountering a preview failure, retrying, or closing must not alter upload, download, print eligibility, patient selection, or scan metadata.
