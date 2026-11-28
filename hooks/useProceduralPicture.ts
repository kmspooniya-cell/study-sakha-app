import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { SkPicture } from '@shopify/react-native-skia';
import { recordPicture } from '../graphics/canvas2d';
import { mainRenderers, previewRenderers } from '../themes';
import type { ThemeId } from '../types';

function disposePicture(pic: SkPicture | null | undefined) {
  if (Platform.OS === 'web') return;
  if (pic && typeof (pic as unknown as { dispose?: () => void }).dispose === 'function') {
    (pic as unknown as { dispose: () => void }).dispose();
  }
}

export function useProceduralPicture(
  themeId: ThemeId,
  width: number,
  height: number,
  active: boolean,
  motion: boolean,
  preview = false,
) {
  const [picture, setPicture] = useState<SkPicture | null>(null);
  const previousPictureRef = useRef<SkPicture | null>(null);
  const disposeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainEntry = mainRenderers[themeId] ?? mainRenderers.obsidian;
  const renderer = preview
    ? (previewRenderers[themeId] ?? previewRenderers.obsidian)
    : mainEntry.renderer;
  const isStatic = mainEntry.isStatic === true;

  useEffect(() => {
    if (!active || width < 1 || height < 1) return;
    let frame = 0;
    let lastFrame = 0;
    let mounted = true;

    const draw = (timestamp: number) => {
      if (!mounted) return;
      if (lastFrame === 0 || (motion && !isStatic && timestamp - lastFrame >= 34)) {
        try {
          const nextPicture = recordPicture(width, height, (context) => {
            renderer.render(context, width, height, timestamp / 1000, motion);
          });
          setPicture((prev) => {
            if (prev && prev !== nextPicture) {
              const stale = previousPictureRef.current;
              previousPictureRef.current = prev;
              if (stale && stale !== prev && stale !== nextPicture) {
                disposePicture(stale);
              }
            }
            return nextPicture;
          });
          lastFrame = timestamp || 1;
        } catch (reason) {
          console.error(`Procedural theme rendering failed for ${themeId}:`, reason);
        }
      }
      if (motion && !isStatic) frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => {
      mounted = false;
      cancelAnimationFrame(frame);
      if (disposeTimerRef.current) clearTimeout(disposeTimerRef.current);
      const stale = previousPictureRef.current;
      previousPictureRef.current = null;
      if (stale) {
        disposeTimerRef.current = setTimeout(() => disposePicture(stale), 120);
      }
    };
  }, [active, height, isStatic, motion, renderer, themeId, width]);

  return picture;
}