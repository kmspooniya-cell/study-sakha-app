import Ionicons from '@expo/vector-icons/Ionicons';

import deepPositiveEnergyAudio from '../assets/audio_library/deep_positive_energy.mp3';
import pureCosmicWavesAudio from '../assets/audio_library/pure_cosmic_waves.mp3';

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
    id: 'deep_positive_energy',
    name: 'Deep Positive Energy',
    subtitle: '30-Minute deep meditation music for positive energy (10 mins tuned)',
    icon: 'water-outline',
    source: deepPositiveEnergyAudio,
    isDownloadable: true,
    downloadUrl: '/api/audio/deep_positive_energy.mp3',
    filename: 'deep_positive_energy.mp3',
    sizeBytes: 6000726,
  },
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
];

export type MeditationPresetId = 'deep_positive_energy' | 'pure_cosmic_waves';

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
    id: 'deep_positive_energy',
    title: 'Deep Positive Energy',
    subtitle: 'Radiant inner peace & healing energy mandala',
    description: 'Immersive deep meditation with a breathing sacred mandala, radiant healing aura, expanding cyan & golden wave pulses, and floating stardust.',
    defaultSoundId: 'deep_positive_energy',
    icon: 'flower-outline',
    accentColor: '#00F0FF',
    gradient: ['#020814', '#06172D', '#010814'],
    isDownloadable: true,
    downloadSize: '5.7 MB',
  },
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
