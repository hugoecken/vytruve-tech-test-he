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
const ROTATION_STEP = Math.PI / 12;
const ZOOM_FACTOR = 0.8;

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
  onReady: () => void;
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
    onReady();
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

/** Parses untrusted private content without letting Three.js log its geometry. */
function parsePrivatePly(data: ArrayBuffer): BufferGeometry {
  const previousConsole = getConsoleFunction();
  setConsoleFunction(() => undefined);
  try {
    return new PLYLoader().parse(data);
  } finally {
    setConsoleFunction(previousConsole);
  }
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
