# Climbing Periodization App

Personal bouldering training tracker — V7–V9 climber. React PWA, deployed to Vercel.

## Stack

- React 18 + Vite
- Single-file component (`src/App.jsx`)
- Plain `localStorage` for persistence
- No backend

## Features

- 12-week mesocycle: Capacity → Strength → Power → Power Endurance → Peak
- Foster sRPE load tracking + Gabbett RA-ACWR load management
- Daily session logging with plan pre-fill
- Finger PIP pain tracker (L/R, 0–10)
- Rolling 5-slot automatic backups
- Export/Import JSON (iOS: opens in new tab → Share → Save to Files)
- Self-tests + storage inspector in Settings
- Travel mode (capacity-lite, 2 days/week)

## Weekly skeleton

| Day | Activity |
|-----|----------|
| Mon | Rest |
| Tue | Hardest climbing + fingers |
| Wed | S&C only (Pull + Push + Lat raises + Legs) |
| Thu | Climbing only + Neck |
| Fri | Rest |
| Sat | Climbing + Wrist + Core + lower back |
| Sun | Light climbing + Shoulder + Fingers (light) |

## Dev

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Deploy

Linked to Vercel. Push to `main` → auto-deploys.

## Data

Lives in browser localStorage scoped to the Vercel domain. Survives code updates and iOS restarts.  
Use **Settings → Export** weekly to keep a JSON backup in iCloud/Files.
