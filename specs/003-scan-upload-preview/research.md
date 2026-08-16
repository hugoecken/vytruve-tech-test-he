# Technical Research: Scan Upload Preview

**Status**: Accepted with plan fingerprint `aaf4389c8b48aa46cde771f5198785d3453643d1610892ffdfd5f29d64a77c2c`

This document supports [`plan.md`](plan.md). It does not replace the accepted specification, approved Figma evidence, current source, or implementation tests.

## Standard Local File Read

**Decision**: After the existing local checks pass, call the selected `File`'s inherited `arrayBuffer()` method once in the input change handler and pass that promise to the lazy preview lifecycle.

**Rationale**: `File` extends `Blob`, and the standard `Blob.arrayBuffer()` method returns a promise for the exact binary contents. Starting it from the user event gives each selection exactly one read even when React Strict Mode repeats callback-ref setup and cleanup. The delivered Three.js `PLYLoader.parse` accepts an `ArrayBuffer` directly, so the browser needs no `FileReader`, URL, request, conversion service, or new library. [MDN `Blob.arrayBuffer()`](https://developer.mozilla.org/en-US/docs/Web/API/Blob/arrayBuffer), [Three.js `PLYLoader.parse`](https://threejs.org/docs/pages/PLYLoader.html#parse), [React callback refs](https://react.dev/reference/react-dom/components/common#ref-callback)

**Alternatives considered**:

- `FileReader`: rejected because the promise-based platform primitive is smaller and already supported by target browsers.
- `URL.createObjectURL` plus loader URL APIs: rejected because it adds a URL lifecycle with no benefit.
- Upload then download through the API: rejected because preview must remain local before explicit confirmation.
- A Web Worker: rejected because one bounded file read and the existing measured renderer do not justify messaging and duplicated lifecycle ownership.

## One Renderer, Two Sources

**Decision**: Reuse `createScanPreviewRenderer` for authenticated downloaded content and local selected-file content, with one focused hardening change at its PLY boundary.

**Rationale**: Both sources already converge on the same bounded `ArrayBuffer`. The renderer owns parsing, validation, camera fitting, gestures, event-driven rendering, and disposal without knowing where bytes originated. Three.js documents direct PLY `ArrayBuffer` parsing and explicit renderer disposal. [Three.js `PLYLoader`](https://threejs.org/docs/pages/PLYLoader.html), [Three.js `WebGLRenderer.dispose`](https://threejs.org/docs/pages/WebGLRenderer.html#dispose)

**Alternatives considered**:

- Duplicate a local-file renderer: rejected because it would fork security checks, camera behavior, controls, tests, and cleanup.
- Generalize a cross-application 3D package: rejected because only the scans feature owns this responsibility.
- Change the API or generated client: rejected because local preview performs no transport operation.

## Safe PLY Header Boundary

**Decision**: Inspect only the bounded ASCII PLY header before parsing, accept the standard directives supported by the loader, derive the technical encoding, and reject unknown directives without logging them. Keep `PLYLoader.parse` as the only geometry parser.

**Rationale**: The PLY add-on uses a native diagnostic for unknown header lines, so a bounded header guard owns that protected-data boundary before parsing. The official loader also computes bounds before caller-side validation, where Three.js core can emit geometry diagnostics through its configurable console hook. The implementation therefore scopes that official hook to the synchronous `parse` call and restores it in `finally`; geometry parsing remains delegated to `PLYLoader`. [Three.js `PLYLoader`](https://threejs.org/docs/pages/PLYLoader.html)

**Alternatives considered**:

- Rely only on `getConsoleFunction`/`setConsoleFunction`: rejected because it does not intercept the add-on's native diagnostic for unknown directives.
- Remove the official hook entirely: rejected because the loader computes bounds before caller-side finite-coordinate validation and Three.js core can otherwise emit protected geometry diagnostics.
- Replace or vendor `PLYLoader`: rejected because maintaining a parser fork is disproportionate.
- Monkey-patch `console.log`: rejected because it changes browser-global behavior and can hide unrelated diagnostics.
- Write a complete PLY parser: rejected because the official loader already owns geometry parsing.

## Stable Suspense Presentation

**Decision**: Move only the five-button toolbar into an eager scans UI module and render it in both lazy fallbacks and ready experiences.

**Rationale**: React commits the nearest Suspense fallback while a lazy module loads. Therefore the fallback must own the final viewport and control footprint if layout is to remain stable. An eager UI-only module preserves the deferred Three.js chunk when its renderer dependency is type-only. [React 19 Suspense improvements](https://react.dev/blog/2024/12/05/react-19#improvements-to-suspense), [React `lazy`](https://react.dev/reference/react/lazy)

**Alternatives considered**:

- Keep the toolbar in each lazy module: rejected because it necessarily appears after the fallback.
- Eager-load Three.js: rejected because toolbar stability does not require the graphics dependency.
- Reserve space with an empty box: rejected because users and assistive technology need the actual disabled controls from first render.

## React 19 Cleanup

**Decision**: Use a stable callback ref returning cleanup for renderer ownership; consume the already-created read promise and do not add `useEffect`.

**Rationale**: React 19 officially calls the cleanup returned by a ref callback when the node detaches and stress-tests setup/cleanup in Strict Mode. Keeping the read outside the ref prevents duplicate reads; an `active` guard ignores a late promise completion, while cleanup disposes any created renderer. [React callback refs](https://react.dev/reference/react-dom/components/common#ref-callback)

**Alternatives considered**:

- Direct `useEffect`: rejected because the lifecycle is attached to one DOM container and repository guidance forbids unnecessary effects.
- Store resolved buffers in component or external state: rejected because bytes are not render state and must not outlive the overlay. The one pending promise is retained only by the current ephemeral selection.
- Module-global cancellation or renderer state: rejected because it could cross patient or overlay sessions.

## Upload Failure Semantics

**Decision**: Treat preview availability independently from upload eligibility. Show a safe unavailable state without a preview Retry button; retain replace, remove, cancel, and Add scan under the existing validation rules.

**Rationale**: The server remains the PLY validation authority. A graphics or local parsing limitation is not a new rejection rule, and retrying the exact same local bytes adds UI without changing the likely outcome. The existing replacement action is the meaningful recovery path.

**Alternatives considered**:

- Disable upload after preview failure: rejected because it weakens the accepted server-authority boundary.
- Add an upload-preview Retry button: rejected by the approved Figma composition and KISS recovery model.
- Display parser, WebGL, memory, or filename diagnostics: rejected because error copy must remain safe and non-technical.

## Drawer Gesture Boundary

**Decision**: Keep `data-base-ui-swipe-ignore` on the interactive preview region only.

**Rationale**: Base UI documents this attribute as the supported way to exclude a descendant from swipe dismissal across input types. It protects orbit gestures without disabling normal drawer behavior. [Base UI Drawer](https://base-ui.com/react/components/drawer#swipeable)

**Alternatives considered**:

- Disable Drawer swipe globally: rejected because it changes unrelated compact behavior.
- Add manual pointer-event suppression: rejected because it duplicates the library primitive.

## Verification Strategy

**Decision**: Extend existing Vitest and Testing Library coverage at the component boundary, keep renderer parsing tests synthetic, inspect Vite output, and perform manual real-browser review with the supplied local samples without committing them.

**Rationale**: Component tests can prove zero preview requests, stable accessible controls, lifecycle cleanup, and non-blocking failure. Existing renderer tests already isolate the jsdom/WebGL boundary. Manual review supplies real GPU evidence without leaking protected scans.

**Alternatives considered**:

- Commit supplied files or screenshots: rejected as protected-data leakage.
- Add a new browser-test framework: rejected because this focused extension does not justify new infrastructure.
- Assert Tailwind class strings as the main proof: rejected because accessible behavior and measured layout are stronger evidence.
