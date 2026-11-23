export const THEME_IDS = [
  'obsidian',
  'enchanted-garden',
  'misty-mountain',
  'cosmic-road-trip',
  'alpine-serenity',
  'neon-tropical-geometry',
  'cosmic-chakra-meditation',
] as const;

export type ThemeId = (typeof THEME_IDS)[number];
export type ThemeRenderer = {
  render: (context: import('../graphics/canvas2d').Canvas2DContext, width: number, height: number, time?: number, motion?: boolean) => void;
};

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  mood: string;
  description: string;
  cardColor: string;
  accent: string;
  secondary: string;
  ringTrack: string;
  ringProgress: string;
  ringGlow: string;
  pill: string;
  pillBorder: string;
  pauseBackground: string;
  pauseBorder: string;
  stopBackground: string;
  stopText: string;
  timerBackdrop: string;
  isStatic: boolean;
};