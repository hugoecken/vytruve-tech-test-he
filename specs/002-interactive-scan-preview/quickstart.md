# Quickstart: Interactive Scan Preview Review

**Status**: Accepted with the automatic-loading plan reconciliation approved on 2026-08-16

This guide defines the implementation evidence for issue #53. Use synthetic PLY data in automated tests. Keep the three supplied review samples outside Git, Figma, screenshots, and logs.

## 1. Install and generate

```bash
npm install
npm exec nx -- run web:generate-api
```

Confirm that Orval output is regenerated from source and remains ignored. Never edit `apps/web/src/shared/api/generated/` manually.

## 2. Focused automated checks

```bash
npm exec nx -- test web
npm exec nx -- lint web
npm exec nx -- typecheck web
npm exec nx -- build web
```

The focused suite must prove:

- opening details produces exactly one content request and announces preparation;
- ready content preserves metadata and wires all five commands;
- Retry is explicit and produces exactly one new request;
- closing aborts or discards query content and disposes renderer resources;
- invalid PLY and unavailable WebGL2 use the same safe fallback;
- ASCII and both binary byte orders are covered with small synthetic buffers;
- Download and Print retain their previous outcomes.

## 3. Deferred-chunk check

After `web:build`, inspect `dist/apps/web/assets/` and the Vite manifest/chunk graph. Confirm that Three.js, `PLYLoader`, and `OrbitControls` are reachable only from a deferred preview chunk and are absent from the initial application entry.

## 4. Nx affected evidence

Use the workflow's immutable base and head revisions. Locally, after fetching `develop`:

```bash
npm exec nx -- affected -t lint,typecheck,test,build --base=develop --head=HEAD
npm exec nx -- show projects --affected --base=develop --head=HEAD --withTarget=container
npm exec nx -- run web:container
```

Nx remains the sole project-selection authority. Do not replace this with path filters or manual project lists. A lockfile change may legitimately affect both Web and API.

## 5. Manual product review

Review each supplied local sample without copying its name or bytes into evidence.

### Desktop — 1440 × 900

1. Open scan details and verify metadata appears while exactly one preparation request starts automatically.
2. Verify the complete centered mesh, vertex colors or neutral fallback, pointer rotation, wheel/pinch zoom, all five icon-only toolbar controls on one row, reset, and keyboard focus.
3. Confirm preparing and ready states contain no privacy badge or public/storage-URL explanation.
4. Close during preparing and ready states, then reopen and verify one new request with a fitted initial view.

### Compact — 390 × 900

1. Repeat the state flow with touch emulation.
2. Confirm canvas gestures do not dismiss the drawer.
3. Confirm content scrolls, controls remain operable, metadata remains readable, and dismissal still works outside the viewer.

For each local sample, measure from completed HTTP retrieval to ready interaction. The result must remain within three seconds on the review workstation.

## 6. Final repository checks

```bash
npm exec nx -- format:check --base=develop --head=HEAD
git diff --check
git status --short
```

Inspect the final diff and built artifacts for scan bytes, supplied filenames, patient data, Blob or MinIO URLs, storage identifiers, credentials, debug logs, generated-source edits, and eager Three.js imports. Record exactly which checks passed and any manual evidence that was skipped.
