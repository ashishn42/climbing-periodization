# Progress

## Work plan

1. **Requirements / UATs** — rediscuss and lock app requirements as acceptance tests ← IN PROGRESS
2. **Build** — implement to those requirements
3. **Tests** — Vitest test suite covering all UATs; pre-commit hook to run before every commit
4. **Security review** — fully local, no network calls, localStorage only, safe for public GitHub
5. **Public repo + self-hosting** — README steps for anyone to fork and deploy their own instance
6. **Deploy to Vercel** — free tier, accessible only to owner (password-protect or Vercel Auth)
7. **Configurability** — TBD (discuss what should be user-configurable vs hardcoded)

---

## Requirements / Feature additions (locked 2026-05-29)

### R1 — Pre-seeded ACWR baseline
- On first launch (empty storage), auto-generate 4 weeks of synthetic Capacity sessions
- Sessions use planned load values from the Capacity phase week multipliers
- Flagged `isPreSeeded: true` so they are visually distinct everywhere they appear
- ACWR bar chart + history list renders pre-seeded bars in a muted/different color
- Pre-seeded sessions do NOT block the restore prompt (if user has real data to import, import wins)
- Decision needed: anchor date — pre-seeded weeks go back from `phaseStartDate` if set, otherwise from today

### R2 — S&C detailed workout views
- Replace all "See training folder" placeholders with actual exercise prescriptions
- Each S&C block gets an expand/collapse detail view (tap to open)
- Prescriptions defined per exercise type AND per phase (capacity vs strength vs power vs powerEndurance vs peak)
- Exercises to define: Pull, Push + lateral raises, Legs, Wrist, Core + lower back, Neck, Shoulder
- Detail shows: exercise name, sets × reps or time, load guidance, rest

### R3 — Tests in repo, remove Settings self-tests
- Port `runSelfTests` and `runStorageRoundTrip` out of the Settings UI and into Vitest test files
- Remove the self-test UI panel from Settings entirely
- Test coverage:
  - Schema validation (sessions, fingerLog key formats, value ranges)
  - Load calc fixtures (known inputs → expected output)
  - ACWR calc fixtures
  - Pre-seed logic
  - Storage read/write/migration
  - Data integrity: no existing data lost across schema versions
- Pre-commit hook (`.husky` or plain `git hooks/pre-commit`) that runs `npm test` and blocks commit on failure

### R4 — Export / Import / Backup UX
- Single unified "Data" section (not buried in Settings)
- Auto-backups: always visible, labeled by date + session count
- Manual export: one tap, clear iOS instructions (Share → Save to Files)
- Import: file picker, shows preview before committing ("found X sessions, Y finger entries from DATE to DATE")
- Import should MERGE (not replace) by default, with option to replace

### R5 — Utils tab: Timer + Counter
- New tab in bottom nav: "Utils" (or "Tools")
- **Timer**:
  - Configurable work/rest intervals (primary use: hangboarding)
  - Protocol format: rounds × sets × (work_seconds / rest_seconds) + set_rest_seconds
  - Example: Repeaters = 6 sets × 6 reps × (7s on / 3s off), 2 min between sets
  - Audio cues on transitions (Web Audio API beep — no server needed)
  - Save/load named protocols (stored in localStorage)
  - Visual: large countdown, current set/rep indicator, next interval label
- **Counter**: port existing `climbing-counter-app.jsx` — single/by-grade/by-type modes

### R6 — Data integrity / schema migration
- Add `schemaVersion` key to localStorage (start at `1`)
- Migration system: on app load, check version, run any pending migrations in order
- Migrations are additive only — never delete fields, only add or rename with backups
- Each migration is a pure function: `(oldData) → newData` + version bump
- Test each migration with known before/after fixtures
- Pre-seed data counts as schema-aware (tagged, not raw sessions)

---

## Current state

App is a React PWA (Vite). Source in `src/App.jsx` (~3200 lines). Repo linked to Vercel but not yet deployed.

## Done

- [x] Built full 12-week periodized training app in Claude artifact (previous conversation)
- [x] Exported as PWA zip (`climbing-app-pwa.zip`) with Vite scaffold
- [x] Copied PWA into this repo (`climbing-periodization`)
- [x] Cleaned up Claude artifact storage residue:
  - Replaced fake-async `safeStorage` (with `send_` prefix + `{value,source}` return shape) with plain sync `storage` wrapper over `localStorage`
  - Added one-time migration IIFE to move data from old `send_*` keys to plain keys
  - Removed all `await` from storage calls and async from functions that no longer need it
  - Updated self-tests and storage inspector accordingly
- [x] Updated `.gitignore` (added `.vercel`, `coverage/`, etc.)
- [x] Updated `README.md`
- [x] Added `progress.md`

## Known bugs (from last Claude artifact session, to verify/fix)

- [ ] Export button broken
- [ ] 3 self-tests failing
- [ ] 0 backups showing despite saves

## Done (continued)

- [x] R6 — Schema migration system (`runMigrations` in logic.js, stamps `schemaVersion`, runs on startup)
- [x] R1 — Pre-seeded ACWR baseline (4 weeks of Capacity sessions generated on first launch, tagged `isPreSeeded: true`, shown at 55% opacity with "baseline" badge)
- [x] R2 — S&C detail views (Push+Pull, Legs, Shoulder, Core from PDF; expand/collapse on each block)
- [x] R3 — Tests moved to repo (46 tests in `src/__tests__/`); self-test UI removed from Settings; pre-commit hook blocks on test failure
- [x] R5 — Utils tab added (Timer with protocol save/load + audio cues; Counter with single/grade/type modes)
- [x] ACWR bug fix — acute now included in chronic (RA-ACWR canonical, was previously excluded)
- [x] Broad allowlist in `.claude/settings.json` (no more permission prompts)
- [x] `src/logic.js` — pure functions extracted (calcLoggedLoad, calcACWR, getCurrentWeek, validateSessions, validateFingerLog, runMigrations, generatePreseededSessions)
- [x] `src/sc-workouts.js` — S&C workout content from PDF

## Next

- [ ] R4 — Export/Import/Backup UX (streamline, improve preview on import)
- [ ] Run locally, verify full app flow
- [ ] Security review
- [ ] Deploy to Vercel (password-protect)
- [ ] Public repo self-hosting docs

## Decisions made

- `safeStorage` async wrapper removed — plain sync `localStorage` calls only
- `send_` prefix removed, one-time migration handles existing data
- Export uses `window.open(blob_url, '_blank')` — iOS Safari ignores `<a download>`
- RA-ACWR: acute included in chronic, days-available = calendar days since start
- Load weights: 3.7× spread (not 6×)
- Wed is now **rest** for all main phases (S&C moved off Wed)
- Push+Pull merged into one block (was separate Pull + Push blocks)
- Push+Pull + Legs moved from Wed → **Sunday** (after light climbing)
- Shoulder moved from Sun → **Thursday** (after climbing, before Neck)
- Travel mode keeps its own Wed S&C session (different structure, unchanged)
