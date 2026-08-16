import {
  AmbientLight,
  BufferGeometry,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  type PerspectiveCamera,
  type Scene,
} from 'three';
import { afterEach, beforeEach, vi } from 'vitest';
import { createScanPreviewRenderer } from '@/modules/scans/lib/scan-preview-renderer';

const graphics = vi.hoisted(() => {
  const controls: FakeOrbitControls[] = [];
  const renderers: FakeWebGLRenderer[] = [];
  const state = {
    failControlsConstruction: false,
    failRendererConstruction: false,
  };

  class FakeWebGLRenderer {
    readonly dispose = vi.fn();
    readonly domElement: HTMLCanvasElement;
    readonly render = vi.fn();
    readonly setPixelRatio = vi.fn();
    readonly setSize = vi.fn();

    constructor(options?: { canvas?: HTMLCanvasElement }) {
      if (state.failRendererConstruction) {
        throw new Error('synthetic renderer construction failure');
      }
      this.domElement = options?.canvas ?? document.createElement('canvas');
      renderers.push(this);
    }
  }

  class FakeOrbitControls {
    autoRotate = true;
    enableDamping = true;
    enablePan = true;
    maxDistance = Number.POSITIVE_INFINITY;
    minDistance = 0;
    readonly dollyIn = vi.fn();
    readonly dollyOut = vi.fn();
    readonly dispose = vi.fn();
    readonly reset = vi.fn();
    readonly rotateLeft = vi.fn();
    readonly saveState = vi.fn();
    readonly target = {
      x: 0,
      y: 0,
      z: 0,
      set: vi.fn((x: number, y: number, z: number) => {
        this.target.x = x;
        this.target.y = y;
        this.target.z = z;
      }),
    };
    readonly update = vi.fn();
    private readonly listeners = new Map<string, Set<() => void>>();

    constructor() {
      if (state.failControlsConstruction) {
        throw new Error('synthetic controls construction failure');
      }
      controls.push(this);
    }

    addEventListener(type: string, listener: () => void) {
      const registered = this.listeners.get(type) ?? new Set();
      registered.add(listener);
      this.listeners.set(type, registered);
    }

    removeEventListener(type: string, listener: () => void) {
      this.listeners.get(type)?.delete(listener);
    }

    emit(type: string) {
      this.listeners.get(type)?.forEach((listener) => listener());
    }
  }

  return { controls, FakeOrbitControls, FakeWebGLRenderer, renderers, state };
});

vi.mock('three', async (importOriginal) => ({
  ...(await importOriginal<typeof import('three')>()),
  WebGLRenderer: graphics.FakeWebGLRenderer,
}));

vi.mock('three/addons/controls/OrbitControls.js', () => ({
  OrbitControls: graphics.FakeOrbitControls,
}));

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  readonly disconnect = vi.fn();

  constructor(readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }

  observe = vi.fn();
}

describe('scan preview renderer', () => {
  beforeEach(() => {
    graphics.controls.length = 0;
    graphics.renderers.length = 0;
    graphics.state.failControlsConstruction = false;
    graphics.state.failRendererConstruction = false;
    FakeResizeObserver.instances.length = 0;
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      {} as WebGL2RenderingContext,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([
    ['ASCII with vertex colors', () => createAsciiPly(true), true],
    ['binary little-endian without colors', createBinaryPly, false],
  ])('prepares and disposes a synthetic %s mesh', (_encoding, data, colors) => {
    const container = createContainer();
    const onReady = vi.fn();
    const onUnavailable = vi.fn();

    const preview = createScanPreviewRenderer({
      container,
      data: data(),
      onReady,
      onUnavailable,
    });

    expect(preview).not.toBeNull();
    expect(onReady).toHaveBeenCalledOnce();
    expect(onUnavailable).not.toHaveBeenCalled();
    expect(container).toContainElement(container.querySelector('canvas'));
    expect(graphics.renderers[0]?.setPixelRatio).toHaveBeenCalledWith(
      Math.min(window.devicePixelRatio, 2),
    );
    expect(graphics.renderers[0]?.render).toHaveBeenCalled();
    const scene = graphics.renderers[0]?.render.mock.calls[0]?.[0] as Scene;
    expect(scene.children.some((child) => child instanceof AmbientLight)).toBe(
      true,
    );
    expect(
      scene.children.some((child) => child instanceof DirectionalLight),
    ).toBe(true);
    const mesh = scene.children.find((child) => child instanceof Mesh) as Mesh;
    expect(mesh.material).toBeInstanceOf(MeshStandardMaterial);
    expect((mesh.material as MeshStandardMaterial).vertexColors).toBe(colors);
    if (!colors) {
      expect((mesh.material as MeshStandardMaterial).color.getHex()).toBe(
        0x94a3b8,
      );
    }
    expect(mesh.geometry.hasAttribute('normal')).toBe(true);
    const camera = graphics.renderers[0]?.render.mock.calls[0]?.[1] as
      | PerspectiveCamera
      | undefined;
    expect(camera?.position.length()).toBeGreaterThan(0);
    expect(graphics.controls[0]).toMatchObject({
      autoRotate: false,
      enableDamping: false,
      enablePan: false,
    });

    const initialRenderCount = graphics.renderers[0]?.render.mock.calls.length;
    FakeResizeObserver.instances[0]?.callback(
      [],
      FakeResizeObserver.instances[0] as unknown as ResizeObserver,
    );
    expect(graphics.renderers[0]?.render).toHaveBeenCalledTimes(
      (initialRenderCount ?? 0) + 1,
    );

    preview?.rotateLeft();
    preview?.rotateRight();
    preview?.zoomIn();
    preview?.zoomOut();
    preview?.reset();
    expect(graphics.controls[0]?.rotateLeft).toHaveBeenNthCalledWith(
      1,
      Math.PI / 12,
    );
    expect(graphics.controls[0]?.rotateLeft).toHaveBeenNthCalledWith(
      2,
      -Math.PI / 12,
    );
    expect(graphics.controls[0]?.dollyIn).toHaveBeenCalledWith(0.8);
    expect(graphics.controls[0]?.dollyOut).toHaveBeenCalledWith(0.8);
    graphics.controls[0]?.emit('change');
    expect(graphics.renderers[0]?.render.mock.calls.length).toBeGreaterThan(1);

    preview?.dispose();
    preview?.dispose();
    expect(graphics.controls[0]?.dispose).toHaveBeenCalledOnce();
    expect(graphics.renderers[0]?.dispose).toHaveBeenCalledOnce();
    expect(FakeResizeObserver.instances[0]?.disconnect).toHaveBeenCalledOnce();
    expect(container.querySelector('canvas')).not.toBeInTheDocument();
  });

  it.each([
    ['empty', createAsciiPlyWithVertices([])],
    ['malformed', encodeAscii('not a PLY file')],
    ['non-finite', createAsciiPlyWithVertices(['0 0 0', 'NaN 1 0', '0 1 0'])],
  ])('rejects %s content through the same safe callback', (_kind, data) => {
    const onReady = vi.fn();
    const onUnavailable = vi.fn();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const preview = createScanPreviewRenderer({
      container: createContainer(),
      data,
      onReady,
      onUnavailable,
    });

    expect(preview).toBeNull();
    expect(onReady).not.toHaveBeenCalled();
    expect(onUnavailable).toHaveBeenCalledOnce();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('fails safely when WebGL2 is unavailable', () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
    const onUnavailable = vi.fn();

    const preview = createScanPreviewRenderer({
      container: createContainer(),
      data: createAsciiPly(true),
      onReady: vi.fn(),
      onUnavailable,
    });

    expect(preview).toBeNull();
    expect(onUnavailable).toHaveBeenCalledOnce();
    expect(graphics.renderers).toHaveLength(0);
  });

  it.each(['renderer', 'controls'] as const)(
    'cleans partial resources after %s construction fails',
    (failure) => {
      const container = createContainer();
      const geometryDispose = vi.spyOn(BufferGeometry.prototype, 'dispose');
      const materialDispose = vi.spyOn(
        MeshStandardMaterial.prototype,
        'dispose',
      );
      graphics.state.failRendererConstruction = failure === 'renderer';
      graphics.state.failControlsConstruction = failure === 'controls';
      const onUnavailable = vi.fn();

      const preview = createScanPreviewRenderer({
        container,
        data: createAsciiPly(true),
        onReady: vi.fn(),
        onUnavailable,
      });

      expect(preview).toBeNull();
      expect(onUnavailable).toHaveBeenCalledOnce();
      expect(geometryDispose).toHaveBeenCalledOnce();
      expect(materialDispose).toHaveBeenCalledOnce();
      expect(container.querySelector('canvas')).not.toBeInTheDocument();
      if (failure === 'controls') {
        expect(graphics.renderers[0]?.dispose).toHaveBeenCalledOnce();
      }
    },
  );
});

function createContainer(): HTMLDivElement {
  const container = document.createElement('div');
  Object.defineProperties(container, {
    clientHeight: { configurable: true, value: 300 },
    clientWidth: { configurable: true, value: 400 },
  });
  return container;
}

function createAsciiPly(withColors: boolean): ArrayBuffer {
  const colorProperties = withColors
    ? ['property uchar red', 'property uchar green', 'property uchar blue']
    : [];
  const vertices = withColors
    ? ['0 0 0 255 0 0', '1 0 0 0 255 0', '0 1 0 0 0 255']
    : ['0 0 0', '1 0 0', '0 1 0'];
  const encoded = new TextEncoder().encode(
    [
      'ply',
      'format ascii 1.0',
      'element vertex 3',
      'property float x',
      'property float y',
      'property float z',
      ...colorProperties,
      'element face 1',
      'property list uchar int vertex_indices',
      'end_header',
      ...vertices,
      '3 0 1 2',
    ].join('\n'),
  );
  const result = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(result).set(encoded);
  return result;
}

function createAsciiPlyWithVertices(vertices: string[]): ArrayBuffer {
  return encodeAscii(
    [
      'ply',
      'format ascii 1.0',
      `element vertex ${vertices.length}`,
      'property float x',
      'property float y',
      'property float z',
      'end_header',
      ...vertices,
    ].join('\n'),
  );
}

function encodeAscii(value: string): ArrayBuffer {
  const encoded = new TextEncoder().encode(value);
  const result = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(result).set(encoded);
  return result;
}

function createBinaryPly(): ArrayBuffer {
  const header = new TextEncoder().encode(
    [
      'ply',
      'format binary_little_endian 1.0',
      'element vertex 3',
      'property float x',
      'property float y',
      'property float z',
      'element face 1',
      'property list uchar int vertex_indices',
      'end_header',
      '',
    ].join('\n'),
  );
  const body = new ArrayBuffer(3 * 3 * 4 + 1 + 3 * 4);
  const view = new DataView(body);
  const vertices = [0, 0, 0, 1, 0, 0, 0, 1, 0];
  vertices.forEach((value, index) => view.setFloat32(index * 4, value, true));
  let offset = vertices.length * 4;
  view.setUint8(offset, 3);
  offset += 1;
  [0, 1, 2].forEach((value, index) =>
    view.setInt32(offset + index * 4, value, true),
  );
  const result = new Uint8Array(header.length + body.byteLength);
  result.set(header);
  result.set(new Uint8Array(body), header.length);
  return result.buffer;
}
