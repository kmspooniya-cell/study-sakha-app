import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EdgeInsets } from 'react-native-safe-area-context';

export const BUBBLE_SIZE = 58;
export const EXPANDED_MAX_WIDTH = 336;
export const EXPANDED_MIN_WIDTH = 240;
export const EXPANDED_HEIGHT = 58;
export const BUBBLE_EDGE_PADDING = 12;
export const AUTO_COLLAPSE_MS = 3000;
export const BUBBLE_POSITION_STORAGE_KEY = 'sakha-focus-bubble-pos-v1';

export type BubblePosition = {
  x: number;
  y: number;
};

export type BubbleBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

/** Compute safe-area clamped bounds for a floating bubble of given dimensions. */
export function getBubbleBounds(
  viewportWidth: number,
  viewportHeight: number,
  insets: Pick<EdgeInsets, 'top' | 'bottom' | 'left' | 'right'>,
  bubbleWidth: number,
  bubbleHeight: number,
): BubbleBounds {
  const minX = insets.left + BUBBLE_EDGE_PADDING;
  const maxX = Math.max(minX, viewportWidth - insets.right - BUBBLE_EDGE_PADDING - bubbleWidth);
  const minY = insets.top + BUBBLE_EDGE_PADDING;
  const maxY = Math.max(minY, viewportHeight - insets.bottom - BUBBLE_EDGE_PADDING - bubbleHeight);
  return { minX, maxX, minY, maxY };
}

/** Clamp a bubble coordinate pair within safe bounds. */
export function clampBubblePosition(pos: BubblePosition, bounds: BubbleBounds): BubblePosition {
  'worklet';
  return {
    x: Math.min(Math.max(pos.x, bounds.minX), bounds.maxX),
    y: Math.min(Math.max(pos.y, bounds.minY), bounds.maxY),
  };
}

/** Compute the default resting position (bottom-right above bottom nav & safe area). */
export function getDefaultBubblePosition(
  viewportWidth: number,
  viewportHeight: number,
  insets: Pick<EdgeInsets, 'top' | 'bottom' | 'left' | 'right'>,
  isMobile: boolean,
  bottomOffset?: number,
): BubblePosition {
  const bounds = getBubbleBounds(viewportWidth, viewportHeight, insets, BUBBLE_SIZE, BUBBLE_SIZE);
  const bottomClearance = bottomOffset ?? ((isMobile ? 62 : 12) + insets.bottom);
  return clampBubblePosition(
    {
      x: bounds.maxX,
      y: viewportHeight - bottomClearance - BUBBLE_SIZE - 8,
    },
    bounds,
  );
}

/** Compute the expanded pill width clamped to the available safe viewport width. */
export function getExpandedBubbleWidth(
  viewportWidth: number,
  insets: Pick<EdgeInsets, 'left' | 'right'>,
): number {
  const available = Math.max(0, viewportWidth - insets.left - insets.right - BUBBLE_EDGE_PADDING * 2);
  return Math.max(Math.min(EXPANDED_MAX_WIDTH, available), Math.min(EXPANDED_MIN_WIDTH, available));
}

/**
 * Anchor the expanded pill around the collapsed bubble's current horizontal side
 * (expand leftward when on the right half, rightward when on the left half) and clamp safely.
 */
export function getAnchoredExpandedPosition(
  collapsedPos: BubblePosition,
  expandedWidth: number,
  viewportWidth: number,
  viewportHeight: number,
  insets: Pick<EdgeInsets, 'top' | 'bottom' | 'left' | 'right'>,
): BubblePosition {
  const bounds = getBubbleBounds(viewportWidth, viewportHeight, insets, expandedWidth, EXPANDED_HEIGHT);
  const bubbleCenterX = collapsedPos.x + BUBBLE_SIZE / 2;
  const isRightHalf = bubbleCenterX >= viewportWidth / 2;
  const targetX = isRightHalf
    ? collapsedPos.x + BUBBLE_SIZE - expandedWidth
    : collapsedPos.x;
  return clampBubblePosition({ x: targetX, y: collapsedPos.y }, bounds);
}

/** Load persisted bubble coordinates from AsyncStorage, returning null if missing or invalid. */
export async function loadBubblePosition(): Promise<BubblePosition | null> {
  try {
    const raw = await AsyncStorage.getItem(BUBBLE_POSITION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BubblePosition> | null;
    if (
      parsed &&
      typeof parsed.x === 'number' &&
      Number.isFinite(parsed.x) &&
      typeof parsed.y === 'number' &&
      Number.isFinite(parsed.y)
    ) {
      return { x: parsed.x, y: parsed.y };
    }
    return null;
  } catch {
    return null;
  }
}

/** Persist bubble coordinates independently of focus session state. */
export async function saveBubblePosition(pos: BubblePosition): Promise<void> {
  try {
    if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return;
    await AsyncStorage.setItem(
      BUBBLE_POSITION_STORAGE_KEY,
      JSON.stringify({ x: Math.round(pos.x), y: Math.round(pos.y) }),
    );
  } catch {
    // Non-fatal persistence failure
  }
}
