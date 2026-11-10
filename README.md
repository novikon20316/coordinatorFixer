<div align="center">

# 🎓 CoordinatorFixer

### מערכת רכזי הקבלה — The Admissions Coordinator System

**One simple place for college coordinators to track every student applicant — on the web and on your phone.**

![Web](https://img.shields.io/badge/Web-Next.js-black?logo=next.js)
![Mobile](https://img.shields.io/badge/Mobile-iOS%20%26%20Android-blue?logo=expo)
![Backend](https://img.shields.io/badge/Server-Express-green?logo=express)
![Database](https://img.shields.io/badge/Data-Firebase-orange?logo=firebase)
![Language](https://img.shields.io/badge/UI-Hebrew%20(RTL)-lightgrey)

</div>

---

## 🤔 What is this?

Imagine a college office with piles of student applications. Who applied? Who got accepted? Who dropped out?

**CoordinatorFixer answers all of that in one screen.** Coordinators log in, see their students, and update each student's status with a click.

That's it. No spreadsheets. No lost papers.

---

## ✨ What can it do?

| | Feature | In plain words |
|---|---|---|
| 📊 | **Dashboard** | See all your students at a glance |
| 🙋 | **Candidates** | Review new applicants and accept or reject them |
| 🔄 | **Change status** | Move a student from "applied" to "studying" (or anything else) |
| 📚 | **Curriculum corrections** | See which courses a student still needs to complete |
| 🕓 | **History** | See who changed what, and when |
| 📈 | **Reports** | Get summaries and numbers |
| 👥 | **Manage coordinators** | The admin adds, assigns, or disables coordinators |
| 🔐 | **Secure login** | Email & password or Google (Apple coming later) |

---

## 🚦 Student statuses — explained like you're five

Every student is in exactly **one** of these boxes:

| Status | Hebrew | What it means |
|---|---|---|
| 🟡 **Registered** | נרשם | Applied — waiting for the committee to decide |
| 🟢 **Active** | פעיל | Accepted and studying 🎉 |
| 🔴 **Rejected** | לא התקבל | Not accepted (GPA under 85, or no relevant background) |
| ⚪ **Canceled** | בוטל על ידי התלמיד | The student (or coordinator) withdrew the application |

And every student is on one of two **tracks**:

- **Regular** (מן המניין) — a normal degree
- **Completion** (בהשלמה) — finishing a degree with some missing courses

---

## 👤 Who uses it?

- 👑 **Admin** — the one boss. Creates coordinator accounts and decides which faculty each one handles.
- 🧑‍💼 **Coordinator** — everyone else. Works only with the students in **their own** faculty.

> 🔒 Nobody can pretend to be an admin — roles are checked on the server, never trusted from the browser or phone.

---

## 🚀 How do I run it on my computer?

**You need:** [Node.js](https://nodejs.org) installed. That's all.

**Step 1 — Download the stuff it needs** (only once):

```bash
npm install
```

**Step 2 — Start the part you want** (each in its own terminal window):

```bash
npm run dev:server
```

```bash
npm run dev:web
```

```bash
npm run dev:mobile
```

**Step 3 — Open it:**

| What | Where |
|---|---|
| 🌐 Website | http://localhost:3000 |
| ⚙️ Server | http://localhost:4000 |
| 📱 Phone app | Scan the QR code that appears with the **Expo Go** app |

> 💡 The website and phone app need the server running to work. Start the server first.

> 🔑 You'll also need the secret `.env` files (they are **not** on GitHub, on purpose). Each folder has an `.env.example` showing what goes inside. Ask the project owner for the real values.

---

## 🗂️ What's in this folder?

```
📁 server/    → The brain. Checks who you are and talks to the database.
📁 web/       → The website you see in your browser.
📁 mobile/    → The phone app (iPhone + Android).
📁 shared/    → Stuff both the website and app use (labels, types, Hebrew text).
📁 firebase/  → Database security rules.
```

---

## 🛡️ Security

Student data is private. Read **[SECURITY.md](SECURITY.md)** to see how access is protected and what to check before using real student data.

---

<details>
<summary><b>🛠️ For developers: technical details (click to open)</b></summary>

### Tech stack

- **`shared`** — TypeScript types, status/track/role enums, and the Hebrew (`he`) label dictionary used by server and clients. More languages can be added as sibling dictionaries.
- **`server`** — Express + TypeScript REST API. Verifies Firebase Auth ID tokens, reads/writes Firestore, enforces the admin/coordinator split.
- **`web`** — Next.js (App Router), RTL Hebrew UI, server-side rendering.
- **`mobile`** — Expo (React Native + TypeScript) for iOS and Android, RTL Hebrew UI.
- **`firebase`** — `firestore.rules` (deny-all client writes) and `firestore.indexes.json`.

### Firebase project

Linked to the `coordinatorfixer` Firebase project (Firestore in `me-west1`, delete protection on). Email/Password sign-in is enabled and a `system_admin` account is bootstrapped — see `server/scripts/bootstrap-admin.ts` to create a fresh admin.

Env files (gitignored): `server/.env`, `web/.env.local`, `mobile/.env`. Each package's `*.env.example` shows the shape.

### Data model

- A **student** belongs to a **faculty** (the dashboard currently handles `data_science`; coordinators can belong to any of the college's 7 faculties) and a **track** (`REGULAR` / `COMPLETION`).
- **Status** keys: `ACTIVE`, `REGISTERED`, `REJECTED`, `CANCELED`.
- **Roles** (`admin`, `coordinator`) and faculty live in the `users` Firestore collection, server-side only.
- A user who signs in without a `users/{uid}` profile sees a clear "not registered" screen.

### Google sign-in setup

1. Firebase Console → Authentication → Sign-in method → enable **Google** (auto-creates an OAuth Web client).
2. Web: nothing else needed (`signInWithPopup`).
3. Mobile: copy the Web client ID from "Web SDK configuration" into `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `mobile/.env`.

### Apple sign-in setup (on hold)

Requires an Apple Developer Program membership ($99/year). Bundle ID: `com.coordinatorfixer.app` (`mobile/app.json`).

1. **App ID** — register `com.coordinatorfixer.app` with the **Sign In with Apple** capability (primary App ID).
2. **Services ID** — e.g. `com.coordinatorfixer.app.web`, enable Sign In with Apple, set the domain/return URL to exactly what Firebase shows.
3. **Key** — enable Sign In with Apple, link to the App ID, **download the `.p8` immediately** (one-time), note the Key ID.
4. **Team ID** — on the Apple account's Membership page.
5. Firebase Console → enable **Apple**, fill in Services ID, Team ID, Key ID, upload the `.p8`.

Testing on iOS needs an EAS dev build (not Expo Go): `npx eas build --platform ios --profile development`. The web Apple button works once the Firebase provider is configured.

</details>

---

<div align="center">

Made with ❤️ for HIT admissions coordinators

</div>
