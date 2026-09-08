# מערכת רכזי הקבלה (Administrative Coordinator)

Monorepo (npm workspaces) with four packages:

- **`shared`** — TypeScript types, status/track/role enums, and the Hebrew (`he`) label dictionary used by both the server and clients. Additional languages get added here later as sibling dictionaries.
- **`server`** — Express + TypeScript REST API. Verifies Firebase Auth ID tokens, reads/writes Firestore, enforces the admin/coordinator role split.
- **`web`** — Next.js (App Router) website, RTL Hebrew UI, server-side rendering.
- **`mobile`** — Expo (React Native + TypeScript) app for iOS and Android, RTL Hebrew UI.
- **`firebase`** — `firestore.rules` (deny-all client writes; see [SECURITY.md](SECURITY.md)) and `firestore.indexes.json`.

See [SECURITY.md](SECURITY.md) for the full access-control model and a checklist to run through before this holds real student data.

## Status

Linked to the `coordinatorfixer` Firebase project (Firestore in `me-west1`, delete protection on). Local `.env` files for `server`/`web`/`mobile` are already populated (gitignored - see `*.env.example` in each package if you need to regenerate them). Email/Password sign-in is enabled and the `system_admin` account (`dor.novik15@gmail.com`) is bootstrapped - see `server/scripts/bootstrap-admin.ts` if a project ever needs a fresh admin.

## Google & Apple sign-in

The login screen has "המשך עם Google" / "המשך עם Apple" buttons and the client-side code (web + mobile) is fully wired up, but each provider needs one manual step in a console before it actually works - neither is scriptable via the Firebase/Google Cloud CLI:

1. **Google** - Firebase Console → Authentication → Sign-in method → enable **Google**. This auto-creates an OAuth "Web client" for the project.
   - Web needs nothing further - Firebase's `signInWithPopup` picks it up automatically.
   - Mobile needs that Web client's ID: Firebase Console → Authentication → Sign-in method → Google → "Web SDK configuration" → copy the Web client ID → set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `mobile/.env`.
2. **Apple** (iOS only) - this one needs an Apple Developer Program membership, which only you can set up:
   - In the [Apple Developer portal](https://developer.apple.com/account): enable the "Sign In with Apple" capability on the app's identifier, create a Services ID, and create a Sign In with Apple key (note the Team ID and Key ID).
   - Firebase Console → Authentication → Sign-in method → enable **Apple**, and paste in the Team ID, Key ID, and the private key file from that step.
   - `mobile/app.json` already sets `ios.usesAppleSignIn: true` and the `expo-apple-authentication` plugin - but that native module (and therefore testing the Apple button) requires an EAS/custom dev-client build, not plain Expo Go.

Either provider signing a user in who has no `users/{uid}` Firestore profile (i.e. an admin never created their account) is handled - they see a clear "not registered" screen instead of a broken dashboard, since Firestore rules already deny them read access to everything.

## Domain model

A **student** record belongs to a **faculty** (the dashboard itself only handles `data_science` for now, though coordinators can belong to any of the college's 7 real faculties - see below) and a **track**:

| Track key    | Hebrew label     |
|--------------|-------------------|
| `REGULAR`    | מן המניין          |
| `COMPLETION` | בהשלמה             |

Each student has a **status**:

| Status key   | Hebrew label                 | Meaning |
|--------------|-------------------------------|---------|
| `ACTIVE`     | פעיל                           | Student has started studying at the college |
| `REGISTERED` | נרשם                           | Currently under review by the acceptance committee |
| `REJECTED`   | לא התקבל                       | GPA below 85, or no relevant background |
| `CANCELED`   | בוטל על ידי התלמיד              | Student withdrew, or the coordinator canceled the application |

Roles: **admin** (single system owner) and **coordinator** (everyone else, each assigned to one faculty). Role and faculty are stored server-side in the `users` Firestore collection and never trusted from the client. The admin manages coordinator accounts from the "ניהול רכזים" screen (web: `/coordinators`, mobile: same menu item) - creates the account, assigns its faculty, and can disable it later without deleting it.

## Getting started

```bash
npm install
```

```bash
# Server (http://localhost:4000)
npm run dev:server

# Website (http://localhost:3000)
npm run dev:web

# Mobile (Expo dev server)
npm run dev:mobile
```

`server/.env`, `web/.env.local`, and `mobile/.env` already hold real `coordinatorfixer` credentials (gitignored - each package's `.env*.example` shows the shape if you ever need to regenerate them, e.g. after rotating the service account key).
