import {
  AmbientLight,
  DirectionalLight,
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  getConsoleFunction,
  setConsoleFunction,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';

const CAMERA_FOV = 45;
const HEADER_LIMIT_BYTES = 65_536;
const ROTATION_STEP = Math.PI / 12;
const ZOOM_FACTOR = 0.8;
const ASCII_DECODER = new TextDecoder();
const PLY_HEADER_DIRECTIVES = new Set([
  'comment',
  'element',
  'format',
  'obj_info',
  'property',
]);

/** PLY encodings rendered and presented by the scan preview. */
export type ScanPreviewEncoding =
  | 'ascii'
  | 'binary_big_endian'
  | 'binary_little_endian';

/** Commands exposed by one mounted private scan preview. */
export interface ScanPreviewRenderer {
  dispose(): void;
  reset(): void;
  rotateLeft(): void;
  rotateRight(): void;
  zoomIn(): void;
  zoomOut(): void;
}

/** Inputs required to create one container-owned preview. */
interface CreateScanPreviewRendererOptions {
  container: HTMLDivElement;
  data: ArrayBuffer;
  onReady: (encoding: ScanPreviewEncoding) => void;
  onUnavailable: () => void;
}

/**
 * Creates one event-driven Three.js preview owned by the supplied container.
 *
 * @param options Private PLY bytes, mount node and safe lifecycle callbacks.
 * @returns The bounded command facade, or null when preparation fails safely.
 */
export function createScanPreviewRenderer({
  container,
  data,
  onReady,
  onUnavailable,
}: CreateScanPreviewRendererOptions): ScanPreviewRenderer | null {
  let controls: OrbitControls | null = null;
  let geometry: BufferGeometry | null = null;
  let material: MeshStandardMaterial | null = null;
  let renderer: WebGLRenderer | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let disposed = false;

  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2');
    if (context === null) {
      throw new Error('WebGL2 unavailable');
    }

    const encoding = inspectPlyHeader(data);
    geometry = parsePrivatePly(data);
    assertDisplayableGeometry(geometry);
    if (!geometry.hasAttribute('normal')) {
      geometry.computeVertexNormals();
    }
    geometry.center();
    geometry.computeBoundingSphere();
    const sphere = geometry.boundingSphere;
    if (
      sphere === null ||
      !Number.isFinite(sphere.radius) ||
      sphere.radius <= 0
    ) {
      throw new Error('Invalid mesh bounds');
    }

    const hasVertexColors = geometry.hasAttribute('color');
    material = new MeshStandardMaterial({
      color: hasVertexColors ? 0xffffff : 0x94a3b8,
      metalness: 0.05,
      roughness: 0.72,
      side: DoubleSide,
      vertexColors: hasVertexColors,
    });

    const scene = new Scene();
    scene.add(new AmbientLight(0xffffff, 1.8));
    const keyLight = new DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(1, 1.5, 2);
    scene.add(keyLight);
    scene.add(new Mesh(geometry, material));

    const camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.001, 1000);
    fitCamera(camera, sphere.radius);

    renderer = new WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas,
      context,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.append(canvas);

    const render = () => renderer?.render(scene, camera);
    const resize = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer?.setSize(width, height, false);
      render();
    };

    controls = new OrbitControls(camera, canvas);
    controls.autoRotate = false;
    controls.enableDamping = false;
    controls.enablePan = false;
    controls.minDistance = sphere.radius * 0.5;
    controls.maxDistance = sphere.radius * 10;
    controls.target.set(0, 0, 0);
    controls.update();
    controls.saveState();
    controls.addEventListener('change', render);

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const dispose = () => {
      if (disposed) return;
      disposed = true;
      controls?.removeEventListener('change', render);
      resizeObserver?.disconnect();
      controls?.dispose();
      geometry?.dispose();
      material?.dispose();
      renderer?.dispose();
      canvas.remove();
    };

    const preview: ScanPreviewRenderer = {
      dispose,
      reset: () => {
        controls?.reset();
        render();
      },
      rotateLeft: () => {
        controls?.rotateLeft(ROTATION_STEP);
        render();
      },
      rotateRight: () => {
        controls?.rotateLeft(-ROTATION_STEP);
        render();
      },
      zoomIn: () => {
        controls?.dollyIn(ZOOM_FACTOR);
        render();
      },
      zoomOut: () => {
        controls?.dollyOut(ZOOM_FACTOR);
        render();
      },
    };
    onReady(encoding);
    return preview;
  } catch {
    resizeObserver?.disconnect();
    controls?.dispose();
    geometry?.dispose();
    material?.dispose();
    renderer?.dispose();
    renderer?.domElement.remove();
    onUnavailable();
    return null;
  }
}

/** Parses guarded bytes while suppressing Three.js core geometry diagnostics. */
function parsePrivatePly(data: ArrayBuffer): BufferGeometry {
  const previousConsole = getConsoleFunction();
  setConsoleFunction(() => undefined);
  try {
    return new PLYLoader().parse(data);
  } finally {
    setConsoleFunction(previousConsole);
  }
}

/** Validates the bounded textual header before the official loader sees it. */
function inspectPlyHeader(data: ArrayBuffer): ScanPreviewEncoding {
  const bytes = new Uint8Array(data);
  const headerEnd = findPlyHeaderEnd(bytes);
  const headerBytes = bytes.subarray(0, headerEnd);
  for (const byte of headerBytes) {
    if (
      byte > 0x7f ||
      (byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d)
    ) {
      throw new Error('Invalid PLY header');
    }
  }
  const lines = ASCII_DECODER.decode(headerBytes)
    .replace(/\r\n?/g, '\n')
    .split('\n');
  if (lines[0] !== 'ply') {
    throw new Error('Invalid PLY header');
  }
  const format =
    /^format (ascii|binary_little_endian|binary_big_endian) 1\.0$/.exec(
      lines[1] ?? '',
    );
  if (format === null) {
    throw new Error('Unsupported PLY format');
  }
  for (const line of lines.slice(2)) {
    if (line === 'end_header') break;
    if (line === '') continue;
    const directive = line.split(/\s+/, 1)[0];
    if (directive === undefined || !PLY_HEADER_DIRECTIVES.has(directive)) {
      throw new Error('Unsupported PLY header');
    }
  }
  return format[1] as ScanPreviewEncoding;
}

/** Finds a newline-terminated PLY header without inspecting unbounded bytes. */
function findPlyHeaderEnd(bytes: Uint8Array): number {
  const inspectedLength = Math.min(bytes.length, HEADER_LIMIT_BYTES);
  let lineStart = 0;
  for (let index = 0; index < inspectedLength; index += 1) {
    if (bytes[index] !== 0x0a) continue;
    const lineEnd =
      index > lineStart && bytes[index - 1] === 0x0d ? index - 1 : index;
    const line = ASCII_DECODER.decode(bytes.subarray(lineStart, lineEnd));
    if (line === 'end_header') return index + 1;
    lineStart = index + 1;
  }
  throw new Error('Missing PLY header terminator');
}

/** Rejects empty or non-finite geometry before renderer construction. */
function assertDisplayableGeometry(geometry: BufferGeometry): void {
  const positions = geometry.getAttribute('position');
  if (positions === undefined || positions.count === 0) {
    throw new Error('Empty mesh');
  }
  for (let index = 0; index < positions.count; index += 1) {
    if (
      !Number.isFinite(positions.getX(index)) ||
      !Number.isFinite(positions.getY(index)) ||
      !Number.isFinite(positions.getZ(index))
    ) {
      throw new Error('Invalid mesh coordinates');
    }
  }
}

/** Fits a stable initial camera around centered geometry. */
function fitCamera(camera: PerspectiveCamera, radius: number): void {
  const verticalFov = (CAMERA_FOV * Math.PI) / 180;
  const distance = (radius / Math.sin(verticalFov / 2)) * 1.2;
  camera.near = Math.max(radius / 1000, 0.001);
  camera.far = distance + radius * 10;
  camera.position.copy(
    new Vector3(0.65, 0.45, 1).normalize().multiplyScalar(distance),
  );
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}
