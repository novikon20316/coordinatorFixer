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

- **Authentication**: Firebase Auth (email/password). No client-side signup -
  the single `system_admin` account is bootstrapped once
  (`server/scripts/bootstrap-admin.ts`), and every `coordinator` account is
  created by an admin via `POST /api/users`.
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

## Firestore project (`coordinatorfixer`)

- Region: `me-west1` (Tel Aviv) - lowest latency and keeps student data
  physically in Israel.
- Delete protection: **enabled** (`gcloud firestore databases update
  --delete-protection`) - the database itself can't be deleted by accident.
- Point-in-Time Recovery: **not enabled yet** (it has an ongoing storage
  cost). Worth turning on before this holds real student data, for
  protection against accidental bad writes/deletes, not just infra loss.

## Before this handles real student data

- [ ] Enable Email/Password sign-in in the Firebase Console (Authentication →
      Sign-in method) - required once; the Admin SDK can't do this itself.
- [ ] Run `server/scripts/bootstrap-admin.ts <email>` for the real admin
      account, then set a real password via the app's "Forgot Password" flow.
- [ ] Set `CLIENT_ORIGINS` to the real deployed web URL (plus `TRUST_PROXY=1`
      if deployed behind Cloud Run/Render) instead of just localhost.
- [ ] After any change to `firebase/firestore.rules`, deploy it:
      `firebase deploy --only firestore:rules` (`firebase use coordinatorfixer`
      first). A rule change sitting only in this repo protects nothing.
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
