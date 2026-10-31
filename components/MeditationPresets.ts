import Ionicons from '@expo/vector-icons/Ionicons';

import pureCosmicWavesAudio from '../assets/audio_library/pure_cosmic_waves.mp3';
import rainSound from '../assets/Sounds/calming_rain.mp3';
import cosmicSound from '../assets/Sounds/cosmic_ambient.mp3';
import forestSound from '../assets/Sounds/forest_crickets.mp3';
import nightSound from '../assets/Sounds/night_time_sounds.mp3';
import oceanSound from '../assets/Sounds/ocean_waves.mp3';
import relaxingNightSound from '../assets/Sounds/relaxing_night_sounds.mp3';
import riverSound from '../assets/Sounds/small_river.mp3';
import bowlSound from '../assets/Sounds/tibetan_bowl.mp3';
import windSound from '../assets/Sounds/zen_wind.mp3';

export type MeditationSoundItem = {
  id: string;
  name: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  source: any;
  isDownloadable?: boolean;
  downloadUrl?: string;
  filename?: string;
  sizeBytes?: number;
};

export const MEDITATION_SOUND_LIST: MeditationSoundItem[] = [
  {
    id: 'pure_cosmic_waves',
    name: 'Pure Cosmic Waves',
    subtitle: 'Deep harmonic cosmic waves (10 mins)',
    icon: 'sparkles-outline',
    source: pureCosmicWavesAudio,
    isDownloadable: true,
    downloadUrl: '/api/audio/pure_cosmic_waves.mp3',
    filename: 'pure_cosmic_waves.mp3',
    sizeBytes: 9756716,
  },
  { id: 'tibetan_bowl', name: 'Tibetan Singing Bowl', subtitle: '432 Hz healing resonance', icon: 'musical-notes-outline', source: bowlSound },
  { id: 'ocean_waves', name: 'Ocean Waves', subtitle: 'Rhythmic deep surf swell', icon: 'boat-outline', source: oceanSound },
  { id: 'forest_crickets', name: 'Forest Calm', subtitle: 'Twilight canopy ambience', icon: 'leaf-outline', source: forestSound },
  { id: 'calming_rain', name: 'Gentle Rain', subtitle: 'Soft rhythmic raindrops', icon: 'rainy-outline', source: rainSound },
  { id: 'cosmic_ambient', name: 'Cosmic Atmosphere', subtitle: 'Deep space 108 Hz drone', icon: 'planet-outline', source: cosmicSound },
  { id: 'zen_wind', name: 'Zen Mountain Wind', subtitle: 'Gentle bamboo breeze', icon: 'cloudy-outline', source: windSound },
  { id: 'small_river', name: 'Peaceful River', subtitle: 'Running crystal stream', icon: 'water-outline', source: riverSound },
  { id: 'night_time_sounds', name: 'Night Ambience', subtitle: 'Peaceful crickets & stars', icon: 'moon-outline', source: nightSound },
  { id: 'relaxing_night', name: 'Deep Night Calm', subtitle: 'Still nocturnal tranquility', icon: 'sparkles-outline', source: relaxingNightSound },
];

export type MeditationPresetId =
  | 'pure_cosmic_waves'
  | 'calm_breathing'
  | 'ocean_waves'
  | 'forest_calm'
  | 'rain_relaxation'
  | 'cosmic_meditation'
  | 'zen_garden';

export type MeditationPreset = {
  id: MeditationPresetId;
  title: string;
  subtitle: string;
  description: string;
  defaultSoundId: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  gradient: [string, string, string];
  isDownloadable?: boolean;
  downloadSize?: string;
};

export const MEDITATION_PRESETS: MeditationPreset[] = [
  {
    id: 'pure_cosmic_waves',
    title: 'Pure Cosmic Waves',
    subtitle: 'Radiant heart chakra & golden nebula',
    description: 'Enlightened lotus meditator with a blazing golden heart center, breathing cosmic nebula, and ascending stardust.',
    defaultSoundId: 'pure_cosmic_waves',
    icon: 'sunny-outline',
    accentColor: '#FFB800',
    gradient: ['#020814', '#081D2E', '#01060D'],
    isDownloadable: true,
    downloadSize: '9.3 MB',
  },
  {
    id: 'calm_breathing',
    title: 'Calm Breathing',
    subtitle: 'Expanding & contracting glowing orb',
    description: 'A slowly pulsating luminous orb with soft breathing cycles to ground your awareness.',
    defaultSoundId: 'tibetan_bowl',
    icon: 'ellipse-outline',
    accentColor: '#5AC8FA',
    gradient: ['#0A1326', '#0E1D3A', '#081020'],
  },
  {
    id: 'ocean_waves',
    title: 'Ocean Waves',
    subtitle: 'Peaceful undulating sea crests',
    description: 'Layered tidal wave horizons surging and receding in tranquil harmony.',
    defaultSoundId: 'ocean_waves',
    icon: 'water-outline',
    accentColor: '#007AFF',
    gradient: ['#07162E', '#0A254D', '#051124'],
  },
  {
    id: 'forest_calm',
    title: 'Forest Calm',
    subtitle: 'Tranquil canopy with shimmering fireflies',
    description: 'Gently swaying woodland tree layers with soft light rays and drifting pollen motes.',
    defaultSoundId: 'forest_crickets',
    icon: 'leaf-outline',
    accentColor: '#34C759',
    gradient: ['#081D14', '#0E2E20', '#05140D'],
  },
  {
    id: 'rain_relaxation',
    title: 'Rain & Relaxation',
    subtitle: 'Soft falling rain & water ripples',
    description: 'Gentle angled raindrops and expanding concentric puddle ripples in quiet mist.',
    defaultSoundId: 'calming_rain',
    icon: 'rainy-outline',
    accentColor: '#5E9EFF',
    gradient: ['#0A162B', '#112240', '#07101F'],
  },
  {
    id: 'cosmic_meditation',
    title: 'Cosmic Meditation',
    subtitle: 'Drifting galaxy, nebula & stars',
    description: 'A slow-turning stellar nebula with shimmering constellations and deep atmospheric space.',
    defaultSoundId: 'cosmic_ambient',
    icon: 'planet-outline',
    accentColor: '#AF52DE',
    gradient: ['#120B24', '#1F113D', '#0C0717'],
  },
  {
    id: 'zen_garden',
    title: 'Zen Garden',
    subtitle: 'Swirling sand ripples & peaceful breeze',
    description: 'Raked sand ripple rings expanding quietly around smooth river stones with floating petals.',
    defaultSoundId: 'zen_wind',
    icon: 'flower-outline',
    accentColor: '#FF9500',
    gradient: ['#1E160A', '#2D210F', '#140E06'],
  },
];

export function getSoundById(id: string): MeditationSoundItem {
  return (
    MEDITATION_SOUND_LIST.find((item) => item.id === id) ?? MEDITATION_SOUND_LIST[0]
  );
}

export function getPresetById(id: MeditationPresetId): MeditationPreset {
  return (
    MEDITATION_PRESETS.find((item) => item.id === id) ?? MEDITATION_PRESETS[0]
  );
}
