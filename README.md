# מערכת רכזי הקבלה (Administrative Coordinator)

Monorepo (npm workspaces) with four packages:

- **`shared`** — TypeScript types, status/track/role enums, and the Hebrew (`he`) label dictionary used by both the server and clients. Additional languages get added here later as sibling dictionaries.
- **`server`** — Express + TypeScript REST API. Verifies Firebase Auth ID tokens, reads/writes Firestore, enforces the admin/coordinator role split.
- **`web`** — Next.js (App Router) website, RTL Hebrew UI, server-side rendering.
- **`mobile`** — Expo (React Native + TypeScript) app for iOS and Android, RTL Hebrew UI.
- **`firebase`** — `firestore.rules` (deny-all client writes; see [SECURITY.md](SECURITY.md)) and `firestore.indexes.json`.

See [SECURITY.md](SECURITY.md) for the full access-control model and a checklist to run through before this holds real student data.

## Status

Linked to the `coordinatorfixer` Firebase project (Firestore in `me-west1`, delete protection on). Local `.env` files for `server`/`web`/`mobile` are already populated (gitignored - see `*.env.example` in each package if you need to regenerate them).

**One manual step left before login works:** open the [Firebase Console](https://console.firebase.google.com/u/0/project/coordinatorfixer/authentication/providers) → Authentication → Sign-in method → enable **Email/Password**. This can't be done from the CLI/Admin SDK. Once it's on, run:

```bash
cd server && npx tsx scripts/bootstrap-admin.ts dor.novik15@gmail.com
```

then use "שכחתי סיסמה" (Forgot Password) on the login screen with that email to set your own password - the bootstrap script never sets or sees one.

## Domain model

A **student** record belongs to a **faculty** (only `data_science` exists for now, more will be added later) and a **track**:

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

Roles: **admin** (single system owner) and **coordinator** (everyone else). Role is stored server-side in the `users` Firestore collection and is never trusted from the client.

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
