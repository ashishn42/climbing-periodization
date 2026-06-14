import { describe, it, expect, beforeEach } from 'vitest';

// Direct localStorage round-trip tests (no app import needed)

describe('localStorage availability', () => {
  it('is available in test environment', () => {
    expect(() => localStorage.setItem('test', 'x')).not.toThrow();
    expect(localStorage.getItem('test')).toBe('x');
    localStorage.removeItem('test');
    expect(localStorage.getItem('test')).toBeNull();
  });

  it('round-trips JSON correctly', () => {
    const data = { sessions: { '2024-01-01': { rpe: 7, computedLoad: 54 } }, ts: Date.now() };
    const json = JSON.stringify(data);
    localStorage.setItem('roundtrip_test', json);
    const back = JSON.parse(localStorage.getItem('roundtrip_test'));
    expect(back).toEqual(data);
    localStorage.removeItem('roundtrip_test');
  });

  it('returns null for missing keys', () => {
    expect(localStorage.getItem('__definitely_missing__')).toBeNull();
  });

  it('overwrites existing key', () => {
    localStorage.setItem('k', 'v1');
    localStorage.setItem('k', 'v2');
    expect(localStorage.getItem('k')).toBe('v2');
    localStorage.removeItem('k');
  });
});

describe('storage data integrity', () => {
  it('large session object round-trips without loss', () => {
    const sessions = {};
    for (let i = 0; i < 100; i++) {
      const d = new Date(2024, 0, i + 1).toISOString().split('T')[0];
      sessions[d] = {
        date: d,
        blocks: [
          { name: 'Climbing', type: 'climbing', intensity: 'climbing_moderate', actualMin: 60 },
          { name: 'Fingers', type: 'fingers', intensity: 'fingers_moderate', actualMin: 18 },
        ],
        rpe: 7,
        computedLoad: 72,
        notes: `Session ${i}`,
      };
    }
    const json = JSON.stringify(sessions);
    localStorage.setItem('sessions', json);
    const back = JSON.parse(localStorage.getItem('sessions'));
    expect(JSON.stringify(back)).toBe(json);
  });

  it('all known app keys can be written and read', () => {
    const knownKeys = [
      'sessions', 'fingerLog', 'currentPhase', 'travelMode',
      'phaseStartDate', 'lastExportTs', 'schemaVersion',
      'backup_0', 'backup_1', 'backup_2', 'backup_3', 'backup_4',
    ];
    knownKeys.forEach(k => {
      localStorage.setItem(k, 'test_value');
      expect(localStorage.getItem(k)).toBe('test_value');
    });
  });
});

// ─── Timer session restore (endAt-based) ──────────────────────────────────────

// Mirrors the restoreTimerSession logic from App.jsx
function restoreTimerSession() {
  const TIMER_KEY = 'timerSession';
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.phase || s.phase === 'done') return null;
    if (s.isPaused) return s;
    const remaining = s.endAt
      ? Math.max(0, Math.ceil((s.endAt - Date.now()) / 1000))
      : Math.max(0, s.timeLeft - Math.floor((Date.now() - (s.savedAt ?? Date.now())) / 1000));
    if (remaining <= 0) { localStorage.removeItem(TIMER_KEY); return null; }
    return { ...s, timeLeft: remaining, isPaused: true };
  } catch (e) { return null; }
}

describe('restoreTimerSession', () => {
  const KEY = 'timerSession';
  beforeEach(() => localStorage.removeItem(KEY));

  it('returns null when no session saved', () => {
    expect(restoreTimerSession()).toBeNull();
  });

  it('returns null for done phase', () => {
    localStorage.setItem(KEY, JSON.stringify({ phase: 'done', timeLeft: 0 }));
    expect(restoreTimerSession()).toBeNull();
  });

  it('returns paused session as-is', () => {
    const s = { phase: 'work', timeLeft: 5, set: 1, rep: 2, isPaused: true };
    localStorage.setItem(KEY, JSON.stringify(s));
    expect(restoreTimerSession()).toEqual(s);
  });

  it('calculates remaining from endAt and restores as paused', () => {
    const endAt = Date.now() + 7000; // 7 seconds from now
    localStorage.setItem(KEY, JSON.stringify({ phase: 'work', timeLeft: 99, set: 1, rep: 1, isPaused: false, endAt }));
    const result = restoreTimerSession();
    expect(result.isPaused).toBe(true);
    expect(result.timeLeft).toBeGreaterThanOrEqual(6);
    expect(result.timeLeft).toBeLessThanOrEqual(7);
  });

  it('returns null when endAt is already past', () => {
    const endAt = Date.now() - 5000; // 5 seconds ago
    localStorage.setItem(KEY, JSON.stringify({ phase: 'work', timeLeft: 5, set: 1, rep: 1, isPaused: false, endAt }));
    expect(restoreTimerSession()).toBeNull();
  });

  it('falls back to savedAt+timeLeft when endAt missing', () => {
    const savedAt = Date.now() - 3000; // saved 3 seconds ago with 10s left
    localStorage.setItem(KEY, JSON.stringify({ phase: 'rest', timeLeft: 10, set: 1, rep: 1, isPaused: false, savedAt }));
    const result = restoreTimerSession();
    expect(result.isPaused).toBe(true);
    expect(result.timeLeft).toBeGreaterThanOrEqual(6);
    expect(result.timeLeft).toBeLessThanOrEqual(7);
  });
});
