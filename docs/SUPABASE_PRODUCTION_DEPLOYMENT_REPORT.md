# Study Sakha Production Supabase Deployment Report

Date: 2026-11-25  
Project: study-sakha-app (edjazjfylnpvqykpdtiq)  
Region: South Asia (Mumbai)

## Result

Production deployment completed and live verification passed.

- Project identity: PASS; linked ref exactly edjazjfylnpvqykpdtiq, ACTIVE_HEALTHY.
- Connectivity: PASS; PostgreSQL 17.11 read-only query succeeded.
- Backup: PASS; schema dump at /tmp/study-sakha-production-DSLxOa.sql, 77,934 bytes.
- History: PASS; all 17 local migrations through 202611250003 are recorded remotely.
- Corrective migration: APPLIED; 202611250002.
- Account Sync migration: APPLIED; 202611250001.
- RPC repair: APPLIED; 202611250003 fixed the ambiguous RETURNING column defect found by the live test.

## Live verification

Account Sync table, indexes, RLS, owner policies, anonymous revokes, authenticated read-only ACL, RPC security properties, and Realtime publication were verified. Auth provisioning functions/trigger, all eight Student-content policies, room tables/RLS/policies/member-profile RPC, and room Realtime publication entries were verified. Supabase schema lint reported no errors.

The rolled-back authenticated test passed owner initial push at version 1, stale rejection, correct version 2 update, duplicate retry rejection, and zero cross-user rows. No test-created data remains.

## Application validation

- pnpm run lint: PASS.
- pnpm run test:ci: PASS — 35 suites, 156 tests.
- Focused Account Sync test: PASS — 1 suite, 4 tests.
- Expo config validation: PASS.
- expo-doctor: NOT AVAILABLE in this workspace.

## Remaining blockers

Real second-user Realtime delivery, physical Android runtime behavior, Maestro, MobSF, and deployed Vercel/Gemini checks remain unverified. Existing user data was preserved; no DROP, TRUNCATE, reset, or user-data deletion was performed.
