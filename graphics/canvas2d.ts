import {
  BlendMode,
  BlurStyle,
  ClipOp,
  PaintStyle,
  Skia,
  StrokeCap,
  StrokeJoin,
  TileMode,
} from '@shopify/react-native-skia';
import type { SkCanvas, SkImage, SkMaskFilter, SkPaint, SkPath, SkPicture, SkShader } from '@shopify/react-native-skia';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

function disposeSkiaObject(obj: unknown) {
  if (obj && typeof (obj as { dispose?: () => void }).dispose === 'function') {
    (obj as { dispose: () => void }).dispose();
  }
}

type ColorStop = { offset: number; color: string };
type Gradient = {
  kind: 'linear' | 'radial';
  values: number[];
  stops: ColorStop[];
  addColorStop: (offset: number, color: string) => void;
};
type PaintStyleValue = string | Gradient;
type CanvasState = {
  fillStyle: PaintStyleValue;
  strokeStyle: PaintStyleValue;
  globalAlpha: number;
  globalCompositeOperation: string;
  lineWidth: number;
  lineCap: string;
  lineJoin: string;
  miterLimit: number;
  shadowBlur: number;
  shadowColor: string;
};

const blendModes: Record<string, BlendMode> = {
  'source-over': BlendMode.SrcOver,
  lighter: BlendMode.Plus,
  'destination-out': BlendMode.DstOut,
  'source-atop': BlendMode.SrcATop,
};

function initialState(): CanvasState {
  return {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    miterLimit: 10,
    shadowBlur: 0,
    shadowColor: 'rgba(0, 0, 0, 0)',
  };
}

function shaderFor(style: PaintStyleValue): SkShader | null {
  if (typeof style === 'string') return null;
  const stops = style.stops.length ? style.stops : [{ offset: 0, color: 'transparent' }];
  const colors = stops.map(({ color }) => Skia.Color(color));
  const positions = stops.map(({ offset }) => offset);
  if (style.kind === 'linear') {
    const [x0, y0, x1, y1] = style.values;
    return Skia.Shader.MakeLinearGradient(
      Skia.Point(x0, y0),
      Skia.Point(x1, y1),
      colors,
      positions,
      TileMode.Clamp,
    );
  }
  const [x0, y0, r0, x1, y1, r1] = style.values;
  return Skia.Shader.MakeTwoPointConicalGradient(
    Skia.Point(x0, y0),
    Math.max(0, r0),
    Skia.Point(x1, y1),
    Math.max(0.001, r1),
    colors,
    positions,
    TileMode.Clamp,
  );
}

class CanvasGradient2D {
  readonly stops: ColorStop[] = [];

  constructor(readonly kind: Gradient['kind'], readonly values: number[]) {}

  addColorStop(offset: number, color: string) {
    this.stops.push({ offset: Math.max(0, Math.min(1, offset)), color });
    this.stops.sort((left, right) => left.offset - right.offset);
  }
}

export class Canvas2DContext {
  private path: SkPath = Skia.Path.Make();
  private hasCurrentPoint = false;
  private state = initialState();
  private readonly stack: Array<{ state: CanvasState }> = [];

  constructor(private readonly canvas: SkCanvas) {}

  get fillStyle() { return this.state.fillStyle; }
  set fillStyle(value: PaintStyleValue) { this.state.fillStyle = value; }
  get strokeStyle() { return this.state.strokeStyle; }
  set strokeStyle(value: PaintStyleValue) { this.state.strokeStyle = value; }
  get globalAlpha() { return this.state.globalAlpha; }
  set globalAlpha(value: number) { this.state.globalAlpha = Math.max(0, Math.min(1, value)); }
  get globalCompositeOperation() { return this.state.globalCompositeOperation; }
  set globalCompositeOperation(value: string) { this.state.globalCompositeOperation = value; }
  get lineWidth() { return this.state.lineWidth; }
  set lineWidth(value: number) { this.state.lineWidth = value; }
  get lineCap() { return this.state.lineCap; }
  set lineCap(value: string) { this.state.lineCap = value; }
  get lineJoin() { return this.state.lineJoin; }
  set lineJoin(value: string) { this.state.lineJoin = value; }
  get miterLimit() { return this.state.miterLimit; }
  set miterLimit(value: number) { this.state.miterLimit = value; }
  get shadowBlur() { return this.state.shadowBlur; }
  set shadowBlur(value: number) { this.state.shadowBlur = value; }
  get shadowColor() { return this.state.shadowColor; }
  set shadowColor(value: string) { this.state.shadowColor = value; }

  createLinearGradient(x0: number, y0: number, x1: number, y1: number) {
    return new CanvasGradient2D('linear', [x0, y0, x1, y1]);
  }

  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) {
    return new CanvasGradient2D('radial', [x0, y0, r0, x1, y1, r1]);
  }

  beginPath() {
    disposeSkiaObject(this.path);
    this.path = Skia.Path.Make();
    this.hasCurrentPoint = false;
  }

  dispose() {
    disposeSkiaObject(this.path);
  }
  moveTo(x: number, y: number) {
    this.path.moveTo(x, y);
    this.hasCurrentPoint = true;
  }
  lineTo(x: number, y: number) {
    this.path.lineTo(x, y);
    this.hasCurrentPoint = true;
  }
  bezierCurveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number) {
    this.path.cubicTo(x1, y1, x2, y2, x, y);
    this.hasCurrentPoint = true;
  }
  quadraticCurveTo(x1: number, y1: number, x: number, y: number) {
    this.path.quadTo(x1, y1, x, y);
    this.hasCurrentPoint = true;
  }
  closePath() { this.path.close(); }
  rect(x: number, y: number, width: number, height: number) {
    this.path.addRect(Skia.XYWHRect(x, y, width, height));
    this.hasCurrentPoint = true;
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise = false) {
    this.ellipse(x, y, radius, radius, 0, startAngle, endAngle, anticlockwise);
  }

  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
    anticlockwise = false,
  ) {
    const fullTurn = Math.PI * 2;
    let sweep = endAngle - startAngle;
    if (!anticlockwise && sweep >= fullTurn) sweep = fullTurn;
    else if (anticlockwise && sweep <= -fullTurn) sweep = -fullTurn;
    else if (anticlockwise) while (sweep > 0) sweep -= fullTurn;
    else while (sweep < 0) sweep += fullTurn;

    if (
      rotation === 0 &&
      !this.hasCurrentPoint &&
      Math.abs(sweep) >= fullTurn - 0.0001 &&
      radiusX > 0 &&
      radiusY > 0 &&
      typeof this.path.addOval === 'function'
    ) {
      this.path.addOval(Skia.XYWHRect(x - radiusX, y - radiusY, radiusX * 2, radiusY * 2));
      this.hasCurrentPoint = true;
      return;
    }

    const steps = Math.max(8, Math.ceil(Math.abs(sweep) * Math.max(radiusX, radiusY) / 5));
    const cosRotation = Math.cos(rotation);
    const sinRotation = Math.sin(rotation);
    for (let index = 0; index <= steps; index++) {
      const angle = startAngle + (sweep * index) / steps;
      const px = radiusX * Math.cos(angle);
      const py = radiusY * Math.sin(angle);
      const pointX = x + px * cosRotation - py * sinRotation;
      const pointY = y + px * sinRotation + py * cosRotation;
      if (index === 0 && this.hasCurrentPoint) this.path.lineTo(pointX, pointY);
      else if (index === 0) this.path.moveTo(pointX, pointY);
      else this.path.lineTo(pointX, pointY);
      this.hasCurrentPoint = true;
    }
    if (Math.abs(sweep) >= fullTurn - 0.0001) this.path.close();
  }

  private makePaint(
    style: PaintStyleValue,
    isStroke: boolean,
    shadow = false,
  ): { paint: SkPaint; shader: SkShader | null; maskFilter: SkMaskFilter | null } {
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setStyle(isStroke ? PaintStyle.Stroke : PaintStyle.Fill);
    paint.setStrokeWidth(this.state.lineWidth);
    paint.setStrokeMiter(this.state.miterLimit);
    paint.setStrokeCap(this.state.lineCap === 'round' ? StrokeCap.Round : this.state.lineCap === 'square' ? StrokeCap.Square : StrokeCap.Butt);
    paint.setStrokeJoin(this.state.lineJoin === 'round' ? StrokeJoin.Round : this.state.lineJoin === 'bevel' ? StrokeJoin.Bevel : StrokeJoin.Miter);
    paint.setBlendMode(blendModes[this.state.globalCompositeOperation] ?? BlendMode.SrcOver);
    paint.setAlphaf(this.state.globalAlpha);

    let shader: SkShader | null = null;
    let maskFilter: SkMaskFilter | null = null;
    if (shadow) {
      paint.setColor(Skia.Color(this.state.shadowColor));
      if (!isWeb) {
        maskFilter = Skia.MaskFilter.MakeBlur(BlurStyle.Normal, Math.max(0.1, this.state.shadowBlur / 2), true);
        paint.setMaskFilter(maskFilter);
      }
    } else if (typeof style === 'string') {
      paint.setColor(Skia.Color(style));
    } else {
      shader = shaderFor(style);
      paint.setShader(shader);
    }
    return { paint, shader, maskFilter };
  }

  private drawPath(style: PaintStyleValue, isStroke: boolean, path = this.path) {
    if (this.state.shadowBlur > 0 && this.state.shadowColor !== 'rgba(0, 0, 0, 0)') {
      const shadowRes = this.makePaint(style, isStroke, true);
      this.canvas.drawPath(path, shadowRes.paint);
      disposeSkiaObject(shadowRes.paint);
      disposeSkiaObject(shadowRes.maskFilter);
      disposeSkiaObject(shadowRes.shader);
    }
    const res = this.makePaint(style, isStroke);
    this.canvas.drawPath(path, res.paint);
    disposeSkiaObject(res.paint);
    disposeSkiaObject(res.maskFilter);
    disposeSkiaObject(res.shader);
  }

  fill() { this.drawPath(this.state.fillStyle, false); }
  stroke() { this.drawPath(this.state.strokeStyle, true); }
  clip() { this.canvas.clipPath(this.path, ClipOp.Intersect, true); }

  fillRect(x: number, y: number, width: number, height: number) {
    const rectPath = Skia.Path.Rect(Skia.XYWHRect(x, y, width, height));
    this.drawPath(this.state.fillStyle, false, rectPath);
    disposeSkiaObject(rectPath);
  }

  save() {
    this.canvas.save();
    this.stack.push({ state: { ...this.state } });
  }

  restore() {
    this.canvas.restore();
    const saved = this.stack.pop();
    if (saved) this.state = saved.state;
  }

  translate(x: number, y: number) { this.canvas.translate(x, y); }
  scale(x: number, y: number) { this.canvas.scale(x, y); }
  rotate(radians: number) { this.canvas.rotate((radians * 180) / Math.PI, 0, 0); }

  drawImage(image: MemoryCanvas, x: number, y: number) {
    const rasterImage = image.imageSnapshot();
    const picture = rasterImage ? null : image.snapshot();
    if (!rasterImage && !picture) return;

    const needsLayer =
      this.state.globalAlpha < 0.999 ||
      this.state.shadowBlur > 0 ||
      this.state.globalCompositeOperation !== 'source-over';

    if (!needsLayer && rasterImage) {
      this.canvas.drawImage(rasterImage, x, y);
      return;
    }

    if (!needsLayer && picture) {
      this.canvas.save();
      this.canvas.translate(x, y);
      this.canvas.drawPicture(picture);
      this.canvas.restore();
      return;
    }

    const res = this.makePaint('#ffffff', false);
    let imageFilter: ReturnType<typeof Skia.ImageFilter.MakeBlur> | null = null;
    if (!isWeb && this.state.shadowBlur > 0) {
      imageFilter = Skia.ImageFilter.MakeBlur(
        this.state.shadowBlur / 2,
        this.state.shadowBlur / 2,
        TileMode.Decal,
      );
      res.paint.setImageFilter(imageFilter);
    }
    this.canvas.saveLayer(res.paint, Skia.XYWHRect(
      x - this.state.shadowBlur,
      y - this.state.shadowBlur,
      image.width + this.state.shadowBlur * 2,
      image.height + this.state.shadowBlur * 2,
    ));
    this.canvas.translate(x, y);
    if (rasterImage) {
      this.canvas.drawImage(rasterImage, 0, 0);
    } else if (picture) {
      this.canvas.drawPicture(picture);
    }
    this.canvas.restore();
    disposeSkiaObject(imageFilter);
    disposeSkiaObject(res.paint);
    disposeSkiaObject(res.maskFilter);
    disposeSkiaObject(res.shader);
  }
}

export class MemoryCanvas {
  private _width = 0;
  private _height = 0;
  private context: Canvas2DContext | null = null;
  private recorder: ReturnType<typeof Skia.PictureRecorder> | null = null;
  private picture: SkPicture | null = null;
  private image: SkImage | null = null;

  get width() { return this._width; }
  set width(value: number) {
    if (value !== this._width) {
      this._width = value;
      this.reset();
    }
  }
  get height() { return this._height; }
  set height(value: number) {
    if (value !== this._height) {
      this._height = value;
      this.reset();
    }
  }

  getContext() {
    if (!this.context) this.reset();
    return this.context;
  }

  private finalizeRecording() {
    if (!this.recorder) return;
    const pic = this.recorder.finishRecordingAsPicture();
    disposeSkiaObject(this.recorder);
    this.recorder = null;
    this.context?.dispose();
    this.context = null;

    if (
      !isWeb &&
      this._width > 0 &&
      this._height > 0 &&
      typeof Skia.Surface?.MakeOffscreen === 'function'
    ) {
      const surface = Skia.Surface.MakeOffscreen(
        Math.max(1, Math.ceil(this._width)),
        Math.max(1, Math.ceil(this._height)),
      );
      if (surface) {
        try {
          const offscreen = surface.getCanvas();
          offscreen.clear(Skia.Color('transparent'));
          offscreen.drawPicture(pic);
          surface.flush();
          const raster = surface.makeImageSnapshot();
          if (raster) {
            this.image = raster;
            disposeSkiaObject(pic);
            return;
          }
        } finally {
          disposeSkiaObject(surface);
        }
      }
    }
    this.picture = pic;
  }

  imageSnapshot(): SkImage | null {
    if (!this.image && !this.picture && this.recorder) {
      this.finalizeRecording();
    }
    return this.image;
  }

  snapshot() {
    if (!this.picture && !this.image && this.recorder) {
      this.finalizeRecording();
    }
    return this.picture;
  }

  private reset() {
    this.context?.dispose();
    this.context = null;
    disposeSkiaObject(this.image);
    this.image = null;
    disposeSkiaObject(this.picture);
    this.picture = null;
    disposeSkiaObject(this.recorder);
    this.recorder = Skia.PictureRecorder();
    const canvas = this.recorder.beginRecording(Skia.XYWHRect(0, 0, Math.max(1, this._width), Math.max(1, this._height)));
    this.context = new Canvas2DContext(canvas);
  }
}

export function createCanvas() {
  return new MemoryCanvas();
}

export function recordPicture(width: number, height: number, draw: (context: Canvas2DContext) => void) {
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, width, height));
  const ctx = new Canvas2DContext(canvas);
  try {
    draw(ctx);
    return recorder.finishRecordingAsPicture();
  } finally {
    ctx.dispose();
    disposeSkiaObject(recorder);
  }
}