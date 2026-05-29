# Send — Climbing Training Tracker

Personal training tracker. React + Vite. Deploys to Vercel.

## Run locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. Edits hot-reload. Data persists in your browser's localStorage for `localhost:5173`.

## Deploy to Vercel (one time, ~10 minutes)

### Prereq: GitHub repo

1. Go to https://github.com/new
2. Create a repo (private is fine), e.g. `send-climbing`
3. Don't initialize with README — leave it empty
4. On your laptop, push this folder:

```bash
cd climbing-app-pwa
git init
git add .
git commit -m "Initial"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/send-climbing.git
git push -u origin main
```

### Connect Vercel

1. Go to https://vercel.com — click "Sign Up", choose "Continue with GitHub"
2. Authorize Vercel to access your GitHub
3. Once in the Vercel dashboard, click **"Add New..."** → **"Project"**
4. Find `send-climbing` in the list, click **Import**
5. Vercel auto-detects Vite — leave all settings as-is
6. Click **Deploy**
7. Wait ~30 seconds. You get a URL like `send-climbing.vercel.app`

### Install on your iPhone

1. Open the Vercel URL in **Safari** (not Chrome — iOS PWA install only works in Safari)
2. Tap the **Share** button at the bottom
3. Scroll down, tap **Add to Home Screen**
4. Name it "Send" → Add
5. App icon appears on your home screen. Tap it — opens fullscreen, no browser chrome.

## Updating

Push to GitHub → Vercel auto-deploys.

```bash
git add -A && git commit -m "your message" && git push
```

Wait ~30 seconds, refresh the app on your phone. New version is live.

## Data

All your sessions and finger entries live in your phone's localStorage, scoped to the Vercel domain. They survive code updates. They survive iOS restarts. They do NOT survive:

- Clearing Safari history/data
- Uninstalling the home-screen app (depends on iOS version — sometimes survives, sometimes not)
- Switching browsers (each browser has its own localStorage)

**Use Settings → Export data weekly** to keep a JSON backup in iCloud/Files.

## Project structure

- `src/App.jsx` — the entire app, single file (~3200 lines)
- `src/main.jsx` — React mount point
- `index.html` — entry, PWA meta tags
- `public/manifest.json` — PWA manifest (icon, name, theme)
- `public/icon-*.png` — app icons
- `vite.config.js` — build config (minimal)
- `package.json` — dependencies (React 18, lucide-react)

## Storage layer

`safeStorage` in `App.jsx` is now backed by localStorage only. Keys are prefixed `send_` to avoid collision with other apps on the same domain. The async API shape is kept identical to the Claude artifact version so the rest of the code is unchanged.

## What's different from the Claude artifact version

Only the storage layer. All training plans, calculations, UI, tests, etc. are identical.
