import { useEffect, useState } from 'react';
import type { SkPicture } from '@shopify/react-native-skia';
import { recordPicture } from '../graphics/canvas2d';
import { mainRenderers, previewRenderers } from '../themes';
import type { ThemeId } from '../types';

export function useProceduralPicture(
  themeId: ThemeId,
  width: number,
  height: number,
  active: boolean,
  motion: boolean,
  preview = false,
) {
  const [picture, setPicture] = useState<SkPicture | null>(null);
  const renderer = preview ? previewRenderers[themeId] : mainRenderers[themeId].renderer;
  const isStatic = mainRenderers[themeId].isStatic === true;

  useEffect(() => {
    if (!active || width < 1 || height < 1) return;
    let frame = 0;
    let lastFrame = 0;
    let mounted = true;

    const draw = (timestamp: number) => {
      if (!mounted) return;
      if (lastFrame === 0 || (motion && !isStatic && timestamp - lastFrame >= 34)) {
        const nextPicture = recordPicture(width, height, (context) => {
          renderer.render(context, width, height, timestamp / 1000, motion);
        });
        setPicture(nextPicture);
        lastFrame = timestamp || 1;
      }
      if (motion && !isStatic) frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => {
      mounted = false;
      cancelAnimationFrame(frame);
    };
  }, [active, height, isStatic, motion, renderer, width]);

  return picture;
}