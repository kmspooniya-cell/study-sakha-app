import type { ThemeRenderer } from '../../types';

declare const renderers: {
  THEMES: Record<string, { name: string; renderer: ThemeRenderer; isStatic?: boolean }>;
  PREVIEW_RENDERERS: Record<string, ThemeRenderer>;
};

export = renderers;