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
