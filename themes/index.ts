import originalRenderers from './renderers/originalCanvasRenderers';
import type { ThemeDefinition, ThemeId, ThemeRenderer } from '../types';

export const themeDefinitions: ThemeDefinition[] = [
  {
    id: 'cosmic-chakra-meditation', name: 'Cosmic Chakra Meditation', mood: 'Seven Chakras • Static',
    description: 'Luminous lotus-pose figure, 12-petal purple mandala, filigree body art & seven aligned chakras.',
    cardColor: '#24133f', accent: '#79d9e8', secondary: 'rgba(216,181,245,0.84)',
    ringTrack: 'rgba(201,165,240,0.24)', ringProgress: '#f3b6ea', ringGlow: 'rgba(182,75,191,0.54)',
    pill: 'rgba(30,15,58,0.62)', pillBorder: 'rgba(201,165,240,0.34)', pauseBackground: 'rgba(64,34,114,0.80)', pauseBorder: 'rgba(121,217,232,0.36)', stopBackground: '#c654b8', stopText: '#ffffff', timerBackdrop: 'rgba(28,14,52,0.34)', isStatic: true,
  },
  {
    id: 'neon-tropical-geometry', name: 'Neon Tropical Geometry', mood: 'Neon Geometry • Static',
    description: 'Glowing hot-pink neon hexagon framed by sculptural Monstera leaves, palm fronds & glossy 3D spheres.',
    cardColor: '#10060f', accent: '#ff25c8', secondary: 'rgba(255,196,240,0.80)',
    ringTrack: 'rgba(255,105,218,0.22)', ringProgress: '#ff4dd4', ringGlow: 'rgba(255,37,200,0.56)',
    pill: 'rgba(20,7,19,0.66)', pillBorder: 'rgba(255,82,212,0.34)', pauseBackground: 'rgba(54,18,56,0.82)', pauseBorder: 'rgba(255,120,224,0.34)', stopBackground: '#f01d9e', stopText: '#ffffff', timerBackdrop: 'rgba(16,6,15,0.22)', isStatic: true,
  },
  {
    id: 'alpine-serenity', name: 'Alpine Serenity', mood: 'Stillwater • Static Alpine',
    description: 'Completely still snow-capped alpine peaks, evergreen forests & mirror-calm turquoise water.',
    cardColor: '#122827', accent: '#83b9b6', secondary: 'rgba(228,238,234,0.86)',
    ringTrack: 'rgba(231,232,220,0.28)', ringProgress: '#e7e8dc', ringGlow: 'rgba(131,185,182,0.45)',
    pill: 'rgba(16,39,38,0.56)', pillBorder: 'rgba(231,232,220,0.28)', pauseBackground: 'rgba(23,56,56,0.78)', pauseBorder: 'rgba(131,185,182,0.32)', stopBackground: '#d9645b', stopText: '#ffffff', timerBackdrop: 'rgba(14,36,35,0.42)', isStatic: true,
  },
  {
    id: 'cosmic-road-trip', name: 'Cosmic Road Trip', mood: 'Cinematic • Sunset & Stars',
    description: 'Two friends atop a vintage blue camper van watching a pink sunset & Milky Way over a glowing valley.',
    cardColor: '#061b3a', accent: '#28b9f0', secondary: 'rgba(212,232,255,0.84)',
    ringTrack: 'rgba(167,123,213,0.28)', ringProgress: '#ff6bbd', ringGlow: 'rgba(240,68,166,0.52)',
    pill: 'rgba(7,24,56,0.56)', pillBorder: 'rgba(255,107,189,0.30)', pauseBackground: 'rgba(16,48,98,0.78)', pauseBorder: 'rgba(40,185,240,0.34)', stopBackground: '#f044a6', stopText: '#ffffff', timerBackdrop: 'rgba(6,22,52,0.38)', isStatic: false,
  },
  {
    id: 'enchanted-garden', name: 'Enchanted Garden', mood: 'Bioluminescent • Midnight',
    description: 'Exotic glowing lotus blooms, luminous midnight botanicals & drifting golden fireflies.',
    cardColor: '#070a18', accent: '#4ef5e1', secondary: 'rgba(196,224,255,0.78)',
    ringTrack: 'rgba(135,205,255,0.22)', ringProgress: '#7cf7ff', ringGlow: 'rgba(96,238,255,0.45)',
    pill: 'rgba(11,14,34,0.56)', pillBorder: 'rgba(130,195,255,0.24)', pauseBackground: 'rgba(34,44,88,0.76)', pauseBorder: 'rgba(124,247,255,0.28)', stopBackground: '#f05568', stopText: '#ffffff', timerBackdrop: 'rgba(6,9,26,0.36)', isStatic: false,
  },
  {
    id: 'misty-mountain', name: 'Misty Mountain', mood: 'Pastel Sunrise • Alpine',
    description: 'Six layered alpine ranges veiled in flowing pink mist beneath a dreamy pastel sunrise sky.',
    cardColor: '#1b2236', accent: '#f7b3a8', secondary: 'rgba(255,241,238,0.85)',
    ringTrack: 'rgba(255,244,240,0.32)', ringProgress: '#ffe5da', ringGlow: 'rgba(255,210,196,0.52)',
    pill: 'rgba(23,30,48,0.46)', pillBorder: 'rgba(255,240,236,0.32)', pauseBackground: 'rgba(35,48,72,0.76)', pauseBorder: 'rgba(255,232,226,0.28)', stopBackground: '#e86262', stopText: '#ffffff', timerBackdrop: 'rgba(22,30,48,0.34)', isStatic: false,
  },
  {
    id: 'obsidian', name: 'Obsidian', mood: 'Minimal • Default',
    description: 'Matte deep charcoal canvas with precision micro-grid texture and distraction-free focus glow.',
    cardColor: '#0e1016', accent: '#34c769', secondary: 'rgba(255,255,255,0.62)',
    ringTrack: 'rgba(255,255,255,0.16)', ringProgress: 'rgba(255,255,255,0.85)', ringGlow: 'rgba(255,255,255,0.18)',
    pill: 'rgba(28,30,38,0.72)', pillBorder: 'rgba(255,255,255,0.11)', pauseBackground: 'rgba(54,67,87,0.85)', pauseBorder: 'rgba(148,175,214,0.18)', stopBackground: '#eb5349', stopText: '#101216', timerBackdrop: 'rgba(12,14,20,0.22)', isStatic: false,
  },
];

export const themeById = Object.fromEntries(themeDefinitions.map((theme) => [theme.id, theme])) as Record<ThemeId, ThemeDefinition>;
export const mainRenderers = originalRenderers.THEMES as Record<ThemeId, { name: string; renderer: ThemeRenderer; isStatic?: boolean }>;
export const previewRenderers = originalRenderers.PREVIEW_RENDERERS as Record<ThemeId, ThemeRenderer>;