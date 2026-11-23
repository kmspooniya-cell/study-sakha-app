# Focus Timer Native

Standalone Expo SDK 57 / React Native project converted from `../source/Focus Timer & Procedural Theme Gallery.html`.

## Run on Android

```sh
cd focus-timer-native
npm install
npx expo start
```

Open the QR code in a compatible SDK 57 development build or Expo Go. For a local Android build (Android SDK required):

```sh
npx expo run:android
```

## Build an APK

The `preview` EAS profile is configured to produce an installable APK:

```sh
npx eas-cli@latest build --profile preview --platform android
```

## Checks

```sh
npm run lint
npm test
npx expo-doctor
npx expo export --platform android
```

See [MIGRATION.md](MIGRATION.md) for preserved behavior and known rendering differences.