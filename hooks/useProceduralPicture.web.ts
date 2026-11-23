import { useEffect, useState } from 'react';
import { recordPicture } from '../graphics/canvas2d.web';
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
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
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
        try {
          const nextCanvas = recordPicture(width, height, (context) => {
            renderer.render(context as never, width, height, timestamp / 1000, motion);
          });
          setCanvas(nextCanvas);
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
    };
  }, [active, height, isStatic, motion, renderer, themeId, width]);

  return canvas;
}
