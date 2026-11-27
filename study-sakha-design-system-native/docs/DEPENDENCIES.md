# Dependencies

This inventory is based on imports in the 69 extracted modules and the supplied bundle guidance. No dependency was installed or added to the root application.

| Package | Role | Usage | Version known in repository | Classification | Present in existing repository |
| --- | --- | --- | --- | --- | --- |
| `react` | Component runtime and hooks | All components, provider, patterns, templates | `19.2.3` | Peer/runtime | Yes |
| `react-native` | Native UI primitives, animation, gestures, dimensions, accessibility | All UI modules | `0.86.3` | Peer/runtime | Yes |
| `expo` | Target Expo runtime | Package target per bundle guidance | `~57.0.31` (installed `57.0.33`) | Peer/runtime | Yes |
| `react-native-safe-area-context` | Safe-area insets and views | ThemeProvider, layouts, navigation, overlays | `~5.7.0` | Runtime | Yes |
| `@react-native-async-storage/async-storage` | Persisted theme preferences and custom presets | `ThemeProvider.tsx` | `2.2.0` | Runtime | Yes |
| `lucide-react-native` | Icons | Icon foundation and icon-bearing components | `^1.77.0` | Runtime | Yes |
| `react-native-svg` | SVG primitives | `CircularProgress` and icon peer dependency | `15.15.4` | Runtime | Yes |
| `expo-font` | Optional font loading support | Not imported by extracted modules; listed by bundle guidance | `~57.0.4` | Optional runtime | Yes |
| `@expo-google-fonts/noto-sans-devanagari` | Optional Hindi font | Recommended by bundle guidance, not imported | Unspecified | Optional runtime | No |

The package has no package manifest of its own because this task is source organization only. A future integration/package-publication task should make dependency and peer-dependency policy explicit for the consuming app.
