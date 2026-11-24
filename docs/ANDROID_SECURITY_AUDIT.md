# Study Sakha Android Security Audit

**Status:** BLOCKED — no release APK was available for MobSF.

Docker is installed (`29.9.2`). The Android build cannot currently produce an APK because the Codespace has no Android SDK. No APK was uploaded to a public service and no security finding is claimed.

## Static configuration observations

- Client configuration contains Supabase URL and publishable key only; service-role and Gemini secrets remain server-side by design.
- The Android package is `com.anonymous.agonpreview`.
- The generated release manifest contains Internet, audio foreground-service, notification, vibration and storage/media permissions. These must be reviewed against the final merged release manifest.
- The debug manifest enables cleartext traffic for debug builds. This must not be copied into release output.
- The application currently has `android:allowBackup="true"` in the generated manifest. Confirm the final release backup policy with product/security owners before publishing.
- No signing certificate or final release artifact was available for verification.

## Required local MobSF procedure

Only run against the private APK on a trusted local Docker host:

```bash
docker run -it --rm -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest
```

Open the local MobSF instance, upload the release APK, and inspect secrets, permissions, exported components, cleartext traffic, debuggability, backups, signing, storage and dependency findings. Save the exported report under `artifacts/mobsf/` and classify every item as confirmed, potential, informational or false positive.

