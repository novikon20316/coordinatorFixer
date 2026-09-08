# Security & privacy model

This system stores prospective and enrolled students' personal data (name,
academic history, GPA, background). This document describes how it's
protected and what to check before this ever handles real student records.

## Data handled

`Student` records ([shared/src/types/student.ts](shared/src/types/student.ts))
currently hold: full name, previous college, degree field/type, GPA,
background text, and application status. No national ID, contact details, or
financial data are stored today. If a future feature adds any of those, it
needs the same read/write scoping described below - update this file when it
does.

## Access model

- **Authentication**: Firebase Auth (email/password, plus optional Google/Apple
  sign-in - see README's "Google & Apple sign-in" section for the console
  setup each needs). No client-side signup for the underlying app account -
  the single `system_admin` is bootstrapped once
  (`server/scripts/bootstrap-admin.ts`), and every `coordinator` is created by
  an admin via `POST /api/users` with a `facultyId`. Google/Apple sign-in
  reuses that same account when the emails match (Firebase's default
  provider-linking behavior) - it is not itself a way to create a new app
  account. A Firebase Auth session with no matching `users/{uid}` profile
  (e.g. someone signs in with Google using an email an admin never
  provisioned) is shown a "not registered" screen; Firestore rules already
  deny it read access to everything else.
- **Roles**: `ADMIN` (one person) and `COORDINATOR` (everyone else), stored
  server-side in `users/{uid}` in Firestore. A user's role is never read from
  anything the client sends - the server and the Firestore rules both
  re-derive it from that document on every request.
- **Disabling access**: `isActive: false` on a `users/{uid}` doc immediately
  blocks that account, both for API calls (`server/src/middleware/auth.ts`)
  and for direct Firestore reads (`firebase/firestore.rules`) - no need to
  delete the Firebase Auth account. Admin-only endpoint:
  `PATCH /api/users/:uid/active`.
- **Firestore rules deny all client writes.** See
  [firebase/firestore.rules](firebase/firestore.rules). Coordinators/admin can
  *read* `students` for the dashboard; every write (create, status change,
  delete, role/account management) goes through the Express server's Admin
  SDK, which authenticates the caller and checks their role before writing.
  If a new feature needs a new kind of write, add a server endpoint for it -
  don't open a new Firestore write rule.

## Server hardening (`server/src/index.ts`)

- `helmet()` for baseline security headers.
- CORS origin allowlist (`CLIENT_ORIGINS`, comma-separated) instead of
  reflecting every origin.
- `express-rate-limit` on all of `/api` (300 req/15min, IP-keyed).
- 256kb JSON body limit (this API has no file uploads).
- Generic `{"error": "Internal server error"}` on 500s - real detail goes to
  the server log only, never to the client, so a stack trace or Firestore
  field name never leaks to a caller.
- `trust proxy` only turns on when `TRUST_PROXY=1` is set, for when this is
  deployed behind a reverse proxy (Cloud Run, Render). Leave unset locally.

## Secrets

- `server/.env`, `web/.env.local`, `mobile/.env`, and any
  `*serviceAccountKey.json` are gitignored - never commit them (verify with
  `git check-ignore -v <file>` if unsure).
- The Firebase web `apiKey` in `web`/`mobile` env files is a public client
  identifier, not a secret - Firebase's own docs cover this. Security comes
  from the Firestore rules and server auth checks, not from hiding it.
- The Admin SDK service account key (`FIREBASE_PRIVATE_KEY` in
  `server/.env`) **is** a secret - it can read/write the entire database with
  no rule checks. If it's ever exposed (committed, pasted somewhere,
  leaked), revoke it immediately: Firebase Console → Project Settings →
  Service Accounts → manage keys, or `gcloud iam service-accounts keys list`
  / `keys delete` for `firebase-adminsdk-fbsvc@coordinatorfixer.iam.gserviceaccount.com`,
  then generate a new one.

## Dev scripts (`server/scripts/`)

`dev-get-id-token.ts` mints a real ID token for any uid (used to test protected
API routes without knowing that account's password) and `dev-delete-user.ts`
deletes an account outright. Both require the same service account key
everything else here does, so they don't grant any access beyond what
`server/.env` already has - but treat them like the bootstrap script: local
dev/testing tools, not something to expose or run against production data
without thinking about it first.

## Firestore project (`coordinatorfixer`)

- Region: `me-west1` (Tel Aviv) - lowest latency and keeps student data
  physically in Israel.
- Delete protection: **enabled** (`gcloud firestore databases update
  --delete-protection`) - the database itself can't be deleted by accident.
- Point-in-Time Recovery: **not enabled yet** (it has an ongoing storage
  cost). Worth turning on before this holds real student data, for
  protection against accidental bad writes/deletes, not just infra loss.

## Before this handles real student data

- [x] Enable Email/Password sign-in in the Firebase Console - done.
- [x] Run `server/scripts/bootstrap-admin.ts <email>` for the real admin
      account, then set a real password via the app's "Forgot Password" flow -
      done for `dor.novik15@gmail.com`.
- [x] Google sign-in enabled in the Firebase Console; confirmed it links to
      the existing account by email (same uid, both `password` and
      `google.com` show up in that Auth user's `providerData`) rather than
      creating a separate one.
- [ ] Apple: still needs the Apple Developer Portal setup (Services ID, Sign
      In with Apple key) before enabling the provider in Firebase - see
      README. Only the account owner can do this step.
- [x] `firebase deploy --only firestore:rules` - done 2026-09-08. **This was
      missed for the entire time between writing firebase/firestore.rules and
      this date** - the project ran on Firestore's implicit deny-all default
      the whole time, which is exactly why every client-side Firestore read
      (the dashboard, and the "not registered" screen wrongly showing for the
      actual admin after Google sign-in) was silently broken despite the repo
      always having the intended rules. **Re-deploy after every future change
      to firebase/firestore.rules** - nothing enforces this automatically,
      and a correct rules file sitting undeployed in the repo protects
      nothing and looks identical to a correct one from `git log` alone.
- [ ] Set `CLIENT_ORIGINS` to the real deployed web URL (plus `TRUST_PROXY=1`
      if deployed behind Cloud Run/Render) instead of just localhost.
- [ ] Consider Firebase App Check on `web`/`mobile` - it stops a copied
      `apiKey` from being used outside this app's own clients to call
      Firestore or the API directly.
- [ ] Consider enabling MFA on the admin's own Firebase Auth account (it's
      the one account with unrestricted write access to everything).
- [ ] Decide a retention/deletion policy for rejected/withdrawn applications
      rather than keeping them indefinitely by default.

## Where these patterns came from

The access-control and hardening patterns above were adapted (not copied
wholesale) from a security/privacy audit of a related HIT system at
`organization-all-system` on this machine - specifically the lesson that
**client-writable Firestore rules for privileged data are the recurring
critical-severity bug**, and that server-mediated writes with a
deny-by-default rules file avoid the whole class of it. That other system's
audit also covers things with no equivalent surface here yet (chat, file
uploads, admin impersonation, 2FA) - re-check this document rather than
assuming it covers those if this app grows into that territory.
