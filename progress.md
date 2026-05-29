# Progress

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

## Known bugs (from last Claude artifact session, to verify/fix)

- [ ] Export button broken
- [ ] 3 self-tests failing
- [ ] 0 backups showing despite saves

## Next

- [ ] Run locally, verify app loads and self-tests pass
- [ ] Fix any remaining bugs
- [ ] Deploy to Vercel
- [ ] Test on iPhone (PWA install, Export flow)

## Decisions made

- `safeStorage` async wrapper removed — plain sync `localStorage` calls only
- `send_` prefix removed, one-time migration handles existing data
- Export uses `window.open(blob_url, '_blank')` — iOS Safari ignores `<a download>`
- RA-ACWR: acute included in chronic, days-available = calendar days since start
- Load weights: 3.7× spread (not 6×)
- Wed is S&C-only (no climbing); Neck stays Thu
