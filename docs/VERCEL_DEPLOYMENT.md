# Study Sakha Vercel deployment

## Architecture

- `pnpm exec expo export --platform web` produces the Expo web bundle in `dist/`.
- `api/[...path].js` exposes the existing Express app as one Vercel Node.js function.
- The local `node server.js` launcher still starts Metro, the HTTP server, and Metro WebSockets. Those code paths run only when `server.js` is the direct entry point.
- Vercel serves the Expo export as static output. SPA fallback excludes `/api`, `_expo`, assets, and files with extensions so API errors cannot become `index.html`.
- The two catalog audio files are included in the API function bundle and retain HTTP range requests. Vercel function storage is read-only and ephemeral, so this does not provide user generated audio storage.

## Variables

Public client variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_API_BASE_URL` (required for native builds; web can use the same-origin relative API)

Server-only Vercel variables:

- `GEMINI_API_KEY`
- `GEMINI_REQUEST_TIMEOUT_MS` (optional)
- `SUPABASE_AUTH_TIMEOUT_MS` (optional)

Use [.env.example](../.env.example) as the placeholder checklist. Do not put `GEMINI_API_KEY` in an `EXPO_PUBLIC_*` variable.

## Deployment commands

1. Link the repository to the intended Vercel project in the Vercel dashboard or with `vercel link`; do not create or select an unrelated project.
2. Add the variables above to the appropriate Vercel environments.
3. Run `vercel deploy` for a preview and verify `/api/health`, `/healthz`, `/api/audio-catalog`, and the exported web app.
4. Promote to production only after the preview checks pass.

The Expo web build does not need `EXPO_PUBLIC_API_BASE_URL` when it calls the same Vercel origin. Native EAS builds still need the HTTPS Vercel origin in that variable.
