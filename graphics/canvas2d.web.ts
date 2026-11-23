type BrowserCanvasImageSource = CanvasImageSource;

export function isValidCanvasImageSource(source: unknown): source is BrowserCanvasImageSource {
  if (!source) return false;
  if (typeof source !== 'object') return false;
  if (typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement) return true;
  if (typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement) return true;
  if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) return true;
  if (typeof OffscreenCanvas !== 'undefined' && source instanceof OffscreenCanvas) return true;
  if (typeof SVGImageElement !== 'undefined' && source instanceof SVGImageElement) return true;
  const candidate = source as { width?: unknown; height?: unknown; getContext?: unknown };
  return typeof candidate.width === 'number'
    && typeof candidate.height === 'number'
    && typeof candidate.getContext === 'function';
}

export function guardCanvasContext(context: CanvasRenderingContext2D) {
  const nativeDrawImage = context.drawImage.bind(context);
  context.drawImage = ((source: CanvasImageSource, ...args: number[]) => {
    if (!isValidCanvasImageSource(source)) {
      const sourceName = source === null ? 'null' : source === undefined ? 'undefined' : Object.prototype.toString.call(source);
      throw new TypeError(`Canvas2D drawImage rejected invalid source: ${sourceName}`);
    }
    (nativeDrawImage as (...values: unknown[]) => void)(source, ...args);
  }) as typeof context.drawImage;
  return context;
}

export class Canvas2DContext {
  constructor(readonly context: CanvasRenderingContext2D) {}
}

export class MemoryCanvas {
  private readonly canvas: HTMLCanvasElement;

  constructor() {
    this.canvas = document.createElement('canvas');
  }

  get width() {
    return this.canvas.width;
  }

  set width(value: number) {
    this.canvas.width = Math.max(1, value);
  }

  get height() {
    return this.canvas.height;
  }

  set height(value: number) {
    this.canvas.height = Math.max(1, value);
  }

  getContext(_contextId: '2d') {
    const context = this.canvas.getContext('2d');
    return context ? guardCanvasContext(context) : null;
  }

  snapshot() {
    return this.canvas;
  }
}

export function createCanvas() {
  return document.createElement('canvas') as HTMLCanvasElement;
}

export function recordPicture(
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D) => void,
) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Browser Canvas 2D is unavailable.');
  draw(guardCanvasContext(context));
  return canvas;
}
