# Technical Research: Interactive Scan Preview

**Status**: Candidate

This document records implementation decisions supporting [`plan.md`](plan.md). It does not replace the accepted specification, Figma evidence, or implementation tests.

## Existing Authenticated Content Query

**Decision**: Reuse `useDownloadPatientScan` for `GET /api/patients/:patientId/scans/:scanId/content`. Enable Orval's official query `signal` option, regenerate through Nx, and configure the preview use with `retry: false`, `gcTime: 0`, all automatic refetch triggers disabled, and explicit intent.

**Rationale**: The generated hook already owns credentials, ownership-safe errors, response typing, and its stable key. TanStack Query supports dependent/lazy execution through `enabled`, deliberate retry through `refetch`, and suppression of a concurrent refetch through `cancelRefetch: false`. Orval can generate query cancellation from TanStack's `AbortSignal`, avoiding a handwritten fetch path. [TanStack Query dependent queries](https://tanstack.com/query/latest/docs/framework/react/guides/dependent-queries), [TanStack Query `useQuery`](https://tanstack.com/query/latest/docs/framework/react/reference/useQuery), [Orval query signal](https://orval.dev/docs/reference/configuration/output/#signal)

**Alternatives considered**:

- Call `fetch` or `downloadPatientScan` manually: rejected because it bypasses the requested generated hook and duplicates query ownership.
- Add a preview endpoint or presigned MinIO URL: rejected because the authenticated content operation already enforces the correct boundary and public storage URLs are forbidden.
- Keep Orval `signal: false`: rejected because an unmounted preview would not consume TanStack's cancellation signal.
- Automatic retries or mount, focus, and reconnect refetches: rejected because every retrieval attempt must follow explicit intent.

## Blob-to-ArrayBuffer Boundary

**Decision**: Keep the generated content response as a `Blob`, call `blob.arrayBuffer()` inside the lazy viewer lifecycle, and pass only the resulting buffer to the renderer.

**Rationale**: The existing transport maps binary HTTP bodies to Blob and Download relies on that contract. `PLYLoader.parse` accepts an `ArrayBuffer` directly. Conversion preserves one transport model without creating an object URL or changing OpenAPI. The 25 MiB upload limit bounds the temporary copy.

**Alternatives considered**:

- Blob URL plus `PLYLoader.load`: rejected because it creates an unnecessary URL lifecycle and hides the direct authenticated-memory boundary.
- Change the shared HTTP client to return every binary response as `ArrayBuffer`: rejected because it would disturb Download and broaden the feature.
- Persist the buffer in component state, IndexedDB, or local storage: rejected because preview content must end with the overlay session.

## Three.js Addons and Deferred Loading

**Decision**: Add `three@^0.185.1` and matching types. Import `PLYLoader` and `OrbitControls` from official `three/addons` entry points inside one React-lazy feature chunk.

**Rationale**: `PLYLoader.parse` supports raw PLY buffers and returns `BufferGeometry`. `OrbitControls` supplies bounded rotate and zoom gestures without a bespoke gesture layer. React lazy defers module code until the preview subtree is first rendered. [PLYLoader](https://threejs.org/docs/pages/PLYLoader.html), [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html), [React `lazy`](https://react.dev/reference/react/lazy)

**Alternatives considered**:

- Custom PLY parser or canvas renderer: rejected because maintained Three.js primitives already own both responsibilities.
- Eager global Three.js import: rejected because most scan-detail openings never request a preview.
- WebGPU or a second fallback renderer: rejected because the accepted target is WebGL2 with one explicit unavailable state.
- Web Worker: rejected because the bounded local evidence does not justify worker messaging, duplicated buffers, or another lifecycle.

## Event-Driven Rendering and Disposal

**Decision**: Disable damping, pan, and auto-rotate; render only after setup, OrbitControls changes, toolbar commands, and resize. Dispose all CPU/GPU and listener-owning resources when the ref detaches.

**Rationale**: OrbitControls requires a loop only when damping or auto-rotate is enabled. Its change event is sufficient for gesture-driven updates. Three.js requires explicit renderer disposal for GPU resources. This yields no idle render cost and one clear owner. [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html), [WebGLRenderer disposal](https://threejs.org/docs/pages/WebGLRenderer.html#dispose)

**Alternatives considered**:

- Permanent `requestAnimationFrame`: rejected because the preview is static between interactions.
- Shared renderer singleton: rejected because it would outlive the private overlay session and complicate ownership.
- WebGL context loss as routine cleanup: rejected because documented disposal of owned resources is sufficient.

## React 19 Lifecycle

**Decision**: Use one stable callback ref returning cleanup to own asynchronous Blob conversion, renderer creation, and disposal. Do not use `useEffect`.

**Rationale**: React 19 calls the cleanup returned from a ref callback when the node detaches and stress-tests setup/cleanup in Strict Mode. This directly matches a DOM-bound imperative renderer. [React callback refs](https://react.dev/reference/react-dom/components/common#ref-callback)

**Alternatives considered**:

- Direct `useEffect`: rejected by repository guidance and unnecessary for a lifecycle attached to one DOM node.
- Module-global viewer state: rejected because it could retain protected content across overlays.
- A generic external-store wrapper: rejected because no shared subscription consumer exists.

## Geometry Preparation

**Decision**: Require a non-empty finite position attribute and bounding sphere, compute normals only when absent, center geometry, and fit a perspective camera from the sphere. Use a lit vertex-color material when colors exist and the same neutral lit material otherwise, under fixed ambient and directional lights.

**Rationale**: The accepted API validates PLY structure, but the browser must still fail safely if stored or transferred content cannot produce a displayable mesh. Bounding-sphere fitting works independently of absolute scan coordinates and avoids product-specific measurements.

**Alternatives considered**:

- Trust every loader result: rejected because empty or non-finite geometry cannot produce a safe ready state.
- Recompute all normals: rejected because supplied normals should be preserved.
- Diagnostic color maps, measurements, or annotations: rejected as clinical and product scope expansion.

## Responsive Gesture Boundary

**Decision**: Add `data-base-ui-swipe-ignore` only to the viewer's interactive root.

**Rationale**: Base UI documents this attribute for descendants that must opt out of swipe dismissal across input types. It protects mesh gestures while leaving the rest of the compact drawer dismissible. [Base UI Drawer](https://base-ui.com/react/components/drawer#swipeable)

**Alternatives considered**:

- Disable drawer swiping globally: rejected because it changes an existing interaction beyond the viewer.
- Stop every pointer event manually: rejected because it duplicates Base UI's supported mechanism and risks accessibility regressions.

## Verification Strategy

**Decision**: Test the user state machine with Testing Library/MSW and test the renderer with real `PLYLoader` parsing plus faked WebGLRenderer/OrbitControls boundaries. Use small generated-in-test ASCII and binary PLY buffers only. Complete with manual review of supplied local samples and Nx-owned checks.

**Rationale**: jsdom cannot provide a production WebGL2 stack, but it can verify orchestration, accessibility, cleanup, and geometry preparation when only the browser/GPU adapters are faked. Real-browser review supplies the missing graphics evidence without committing protected scans.

**Alternatives considered**:

- Commit supplied samples: rejected as protected-data leakage.
- Snapshot canvas pixels in jsdom: rejected because it does not exercise a real GPU and creates brittle evidence.
- Add Playwright or visual-regression infrastructure: rejected because the repository does not currently own it and one focused feature does not justify it.
