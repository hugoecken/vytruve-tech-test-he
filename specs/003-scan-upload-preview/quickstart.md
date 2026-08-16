# Quickstart: Validate Scan Upload Preview

**Status**: Accepted with plan fingerprint `aaf4389c8b48aa46cde771f5198785d3453643d1610892ffdfd5f29d64a77c2c`

## Prerequisites

- Node.js 24 and the locked npm workspace installed.
- Local API and Web development environment configured through the repository runbook.
- An authenticated synthetic patient with permission to add scans.
- Supplied PLY samples available only outside the repository for manual review.

Never copy supplied samples, original filenames, patient data, credentials, screenshots, or decoded geometry into Git, tests, documentation, Figma, logs, or build artifacts.

## Focused automated checks

Run the narrow Web tests first:

```bash
npm exec nx -- test web
```

Expected evidence:

- both existing-scan and upload-preview preparing states contain the five disabled controls immediately;
- selecting a locally eligible synthetic PLY calls `arrayBuffer()` once, starts one local preview attempt, and performs zero requests, including under Strict Mode;
- the same controls enable in place when the renderer becomes ready;
- replacement, removal, close, and successful upload dispose the previous renderer;
- preview failure remains safe and does not disable an otherwise eligible Add scan action;
- upload, Download, Print, metadata, and existing Retry behaviors do not regress;
- French encoding copy uses the accepted wording;
- an unknown synthetic PLY header directive fails safely without writing its text or values to the console.

## Nx-owned validation

Resolve the comparison range through the repository workflow, then let Nx select every affected project:

```bash
npm exec nx -- affected -t lint typecheck test build
npm exec nx -- affected -t container
```

Do not replace this with a handwritten project list or deployment filter.

## Bundle inspection

After the affected build, inspect `dist/apps/web` and its Vite manifest or chunk graph. Three.js, `PLYLoader`, `OrbitControls`, and both preview experiences must remain in deferred output; the eager toolbar module must not pull them into the initial entry chunk.

## Manual product review

Review desktop at `1440×900` and compact at `390×900` in current evergreen browsers:

1. Open an existing scan while throttling module loading. Confirm that the viewport and five disabled controls appear together, then enable without moving.
2. Open Add scan and select each supplied local sample without recording its name or content. Confirm that no request occurs before Add scan.
3. Verify preparing, ready, rotate, zoom, reset, replacement, removal, cancel, close, and successful upload cleanup.
4. Force WebGL2 unavailability or renderer failure. Confirm safe feedback, no local Retry button, and preserved eligible Add scan action.
5. Repeat compact review with pointer, keyboard, touch emulation, visible focus, and drawer gestures.
6. Review English and French, including `Binaire (little-endian)` and `Binaire (big-endian)`.

## Final safety checks

```bash
git diff --check
git status --short
```

Inspect the complete diff and build output for protected data, selected scan bytes, supplied sample names, storage URLs, credentials, logs, generated-client edits, and accidental eager Three.js imports.
