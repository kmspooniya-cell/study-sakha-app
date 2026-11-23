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
import type { SkCanvas, SkPaint, SkPath, SkPicture, SkShader } from '@shopify/react-native-skia';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

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
    this.path = Skia.Path.Make();
    this.hasCurrentPoint = false;
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

  private makePaint(style: PaintStyleValue, isStroke: boolean, shadow = false): SkPaint {
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setStyle(isStroke ? PaintStyle.Stroke : PaintStyle.Fill);
    paint.setStrokeWidth(this.state.lineWidth);
    paint.setStrokeMiter(this.state.miterLimit);
    paint.setStrokeCap(this.state.lineCap === 'round' ? StrokeCap.Round : this.state.lineCap === 'square' ? StrokeCap.Square : StrokeCap.Butt);
    paint.setStrokeJoin(this.state.lineJoin === 'round' ? StrokeJoin.Round : this.state.lineJoin === 'bevel' ? StrokeJoin.Bevel : StrokeJoin.Miter);
    paint.setBlendMode(blendModes[this.state.globalCompositeOperation] ?? BlendMode.SrcOver);
    paint.setAlphaf(this.state.globalAlpha);

    if (shadow) {
      paint.setColor(Skia.Color(this.state.shadowColor));
      if (!isWeb) {
        paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, Math.max(0.1, this.state.shadowBlur / 2), true));
      }
    } else if (typeof style === 'string') {
      paint.setColor(Skia.Color(style));
    } else {
      paint.setShader(shaderFor(style));
    }
    return paint;
  }

  private drawPath(style: PaintStyleValue, isStroke: boolean, path = this.path) {
    if (this.state.shadowBlur > 0 && this.state.shadowColor !== 'rgba(0, 0, 0, 0)') {
      this.canvas.drawPath(path, this.makePaint(style, isStroke, true));
    }
    this.canvas.drawPath(path, this.makePaint(style, isStroke));
  }

  fill() { this.drawPath(this.state.fillStyle, false); }
  stroke() { this.drawPath(this.state.strokeStyle, true); }
  clip() { this.canvas.clipPath(this.path, ClipOp.Intersect, true); }

  fillRect(x: number, y: number, width: number, height: number) {
    this.drawPath(this.state.fillStyle, false, Skia.Path.Rect(Skia.XYWHRect(x, y, width, height)));
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
    const picture = image.snapshot();
    if (!picture) return;

    const paint = this.makePaint('#ffffff', false);
    if (!isWeb && this.state.shadowBlur > 0) {
      paint.setImageFilter(Skia.ImageFilter.MakeBlur(
        this.state.shadowBlur / 2,
        this.state.shadowBlur / 2,
        TileMode.Decal,
      ));
    }
    this.canvas.saveLayer(paint, Skia.XYWHRect(
      x - this.state.shadowBlur,
      y - this.state.shadowBlur,
      image.width + this.state.shadowBlur * 2,
      image.height + this.state.shadowBlur * 2,
    ));
    this.canvas.translate(x, y);
    this.canvas.drawPicture(picture);
    this.canvas.restore();
  }
}

export class MemoryCanvas {
  private _width = 0;
  private _height = 0;
  private context: Canvas2DContext | null = null;
  private recorder: ReturnType<typeof Skia.PictureRecorder> | null = null;
  private picture: SkPicture | null = null;

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

  snapshot() {
    if (!this.picture && this.recorder) {
      this.picture = this.recorder.finishRecordingAsPicture();
      this.recorder = null;
    }
    return this.picture;
  }

  private reset() {
    this.context = null;
    this.picture = null;
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
  draw(new Canvas2DContext(canvas));
  return recorder.finishRecordingAsPicture();
}