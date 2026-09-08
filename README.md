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
2. **Apple** (iOS only) - needs an Apple Developer Program membership ($99/year), which only you can set up. The app's bundle identifier is `com.coordinatorfixer.app` (`mobile/app.json` - change it now if you'd rather use something else, since it's effectively permanent once you first submit to the App Store).

   At [developer.apple.com/account](https://developer.apple.com/account), under **Certificates, Identifiers & Profiles**:
   1. **Identifiers → "+" → App IDs** - register `com.coordinatorfixer.app` (if it's not there yet from a prior EAS run) and check the **Sign In with Apple** capability on it, "Enable as a primary App ID".
   2. **Identifiers → "+" → Services IDs** - create one, e.g. identifier `com.coordinatorfixer.app.web`, description "CoordinatorFixer". Enable **Sign In with Apple** on it, click Configure, and set the domain/return URL to *exactly* what Firebase shows you in the next step (do that step first if the Services ID form is open in another tab, so you have the real URL instead of guessing).
   3. **Keys → "+"** - name it, enable **Sign In with Apple**, associate it with the App ID from step 1, register, then **download the `.p8` file immediately** - Apple only lets you download it once. Note the **Key ID** shown on this page.
   4. Your **Team ID** is on the account's Membership page (top-right area, or Membership Details) - a 10-character code.
   - Then: Firebase Console → Authentication → Sign-in method → enable **Apple**, and fill in the Services ID (from step 2), Team ID, Key ID, and upload the `.p8` file (all from above). Firebase shows the exact OAuth redirect URL to use in step 2 right on this screen.
   - `mobile/app.json` already sets `ios.usesAppleSignIn: true` and the `expo-apple-authentication` plugin - but that native module (and therefore testing the Apple button on a phone) requires an EAS/custom dev-client build, not plain Expo Go: `npx eas build --platform ios --profile development` (needs an Expo account, `eas-cli`, and this same Apple Developer membership - EAS will prompt to create/select the matching provisioning profile).
   - The web app's Apple button works via `signInWithPopup` once the Firebase provider above is configured - no EAS/native build needed for web.

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
