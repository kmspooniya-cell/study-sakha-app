const expoPreset = require('jest-expo/jest-preset');

module.exports = {
  ...expoPreset,
  preset: 'jest-expo',
  testMatch: ['<rootDir>/test/**/*.test.tsx'],
  // React Native's export condition selects Lucide's ESM entrypoint. Jest's
  // existing Expo preset can consume the package's CommonJS build directly.
  moduleNameMapper: {
    ...expoPreset.moduleNameMapper,
    '^lucide-react-native$': '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
    '^lucide-react-native/icons$': '<rootDir>/node_modules/lucide-react-native/dist/cjs/icons/index.js',
    '^lucide-react-native/icons/(.*)$': '<rootDir>/node_modules/lucide-react-native/dist/cjs/icons/$1.js',
  },
};
