# Study Sakha Design System Native v1.0

This directory is a standalone source package extracted from the supplied SSDS v1.0 Master Bundle. It contains reusable Expo / React Native design tokens, theme infrastructure, components, patterns, templates, and public barrel exports.

## Scope

The package is intentionally independent of the Study Sakha application. It does not contain application screens, navigation, stores, Supabase integrations, backend code, or feature-specific business logic. It is ready for a separate future integration task.

## Architecture

- `src/theme/` — tokens, light/dark/system themes, persistence-aware `ThemeProvider`, and theme exports.
- `src/components/` — foundation, buttons, cards, layout, forms, feedback, navigation, data display, overlays, and media primitives.
- `src/patterns/` — reusable composed interaction patterns.
- `src/templates/` — reusable screen composition templates.
- `docs/` — extraction manifest, dependency inventory, source mapping, and validation report.

The public API is exposed from `src/index.ts`, with category barrels in `src/theme/index.ts`, `src/components/index.ts`, `src/patterns/index.ts`, and `src/templates/index.ts`.

## Dependencies

Runtime and peer dependency findings are documented in [`docs/DEPENDENCIES.md`](docs/DEPENDENCIES.md). No packages were installed or added to the existing repository.

## Future integration

Before integration, the consuming application should verify SDK compatibility, provide the documented peer dependencies, decide how this `ThemeProvider` coexists with the application theme, and run its own TypeScript, lint, visual, accessibility, and device checks. This extraction task does not perform that integration.

## Source fidelity

Source modules were copied from explicit `FILE PATH` declarations only. The conversion manifest records all 69 declarations and their extraction status.
