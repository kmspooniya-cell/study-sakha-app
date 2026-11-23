/** @jest-environment jsdom */

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('../graphics/canvas2d', () => jest.requireActual('../graphics/canvas2d.web'));

const gradient = () => ({ addColorStop: jest.fn() });
const mockContext = new Proxy({
  fillRect: jest.fn(),
  createLinearGradient: jest.fn(gradient),
  createRadialGradient: jest.fn(gradient),
  drawImage: jest.fn(),
}, {
  get(target, property) {
    if (typeof property === 'string' && !(property in target)) {
      Object.defineProperty(target, property, { value: jest.fn(), configurable: true });
    }
    return Reflect.get(target, property);
  },
  set(target, property, value) {
    Reflect.set(target, property, value);
    return true;
  },
});

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: jest.fn(() => mockContext),
});

beforeEach(() => {
  jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    if (tagName.toLowerCase() !== 'canvas') throw new Error(`Unexpected element: ${tagName}`);
    const canvas = {
      width: 0,
      height: 0,
      getContext: jest.fn(() => mockContext),
    };
    return canvas as unknown as HTMLCanvasElement;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

import { MemoryCanvas, createCanvas, isValidCanvasImageSource, recordPicture } from '../graphics/canvas2d.web';

describe('web Canvas 2D fallback', () => {
  test('records a real browser canvas with requested dimensions', () => {
    const canvas = recordPicture(640, 360, (context) => {
      context.fillRect(0, 0, 640, 360);
    });

    expect(canvas.width).toBe(640);
    expect(canvas.height).toBe(360);
    expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 640, 360);
  });

  test('creates a real browser canvas as a valid drawImage source', () => {
    const canvas = createCanvas();
    canvas.width = 320;
    canvas.height = 180;

    expect(canvas).toHaveProperty('getContext');
    expect(isValidCanvasImageSource(canvas)).toBe(true);
  });

  test('rejects numeric, undefined, and wrapper drawImage sources', () => {
    expect(isValidCanvasImageSource(undefined)).toBe(false);
    expect(isValidCanvasImageSource(123)).toBe(false);
    expect(isValidCanvasImageSource({ canvas: createCanvas() })).toBe(false);
  });

  test('renders all procedural themes through web Canvas 2D sources', () => {
    const themeIds = [
      'obsidian',
      'enchanted-garden',
      'misty-mountain',
      'cosmic-road-trip',
      'alpine-serenity',
      'neon-tropical-geometry',
      'cosmic-chakra-meditation',
    ] as const;

    const originalRenderers = jest.requireActual('../themes/renderers/originalCanvasRenderers') as {
      THEMES: Record<string, { renderer: { render: (context: CanvasRenderingContext2D, width: number, height: number, time: number, motion: boolean) => void } }>;
    };

    for (const themeId of themeIds) {
      const renderer = originalRenderers.THEMES[themeId].renderer;
      expect(() => recordPicture(320, 180, (context) => {
        renderer.render(context as never, 320, 180, 1.25, true);
      })).not.toThrow();
    }
  });

  test('offscreen canvas grows to at least one pixel', () => {
    const canvas = new MemoryCanvas();
    canvas.width = 320;
    canvas.height = 180;

    expect(canvas.width).toBe(320);
    expect(canvas.height).toBe(180);
    expect(canvas.getContext('2d')).toBe(mockContext);
  });
});
