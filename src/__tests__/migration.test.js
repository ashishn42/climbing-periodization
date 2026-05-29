import { describe, it, expect, beforeEach } from 'vitest';
import { runMigrations, SCHEMA_VERSION, generatePreseededSessions } from '../logic.js';

// ─── Migration system ─────────────────────────────────────────────────────────

function makeStore(initial = {}) {
  const data = { ...initial };
  return {
    get: (k) => data[k] ?? null,
    set: (k, v) => { data[k] = v; },
    getAll: () => data,
  };
}

describe('runMigrations', () => {
  it('stamps schemaVersion on fresh store', () => {
    const store = makeStore();
    runMigrations(store);
    expect(store.get('schemaVersion')).toBe(String(SCHEMA_VERSION));
  });

  it('does not overwrite existing data during migration', () => {
    const store = makeStore({
      sessions: JSON.stringify({ '2024-01-01': { blocks: [], rpe: 7, computedLoad: 50 } }),
      fingerLog: JSON.stringify({ '2024-01-01': { left: 1, right: 0 } }),
    });
    runMigrations(store);
    // Existing data should still be there
    const sessions = JSON.parse(store.get('sessions'));
    expect(sessions['2024-01-01'].computedLoad).toBe(50);
    const fingers = JSON.parse(store.get('fingerLog'));
    expect(fingers['2024-01-01'].left).toBe(1);
  });

  it('does not re-run if already at current version', () => {
    const store = makeStore({ schemaVersion: String(SCHEMA_VERSION) });
    const spy = [];
    const originalGet = store.get.bind(store);
    store.set = (k, v) => { spy.push(k); store[k] = v; };
    runMigrations(store);
    // Should not have set anything extra (already up to date)
    expect(spy.filter(k => k !== 'schemaVersion')).toHaveLength(0);
  });

  it('is idempotent — running twice produces same result', () => {
    const store = makeStore();
    runMigrations(store);
    const v1 = store.get('schemaVersion');
    runMigrations(store);
    expect(store.get('schemaVersion')).toBe(v1);
  });
});

// ─── Pre-seeded sessions ──────────────────────────────────────────────────────

describe('generatePreseededSessions', () => {
  it('generates sessions in the past', () => {
    const sessions = generatePreseededSessions(null);
    const keys = Object.keys(sessions);
    expect(keys.length).toBeGreaterThan(0);

    const today = new Date().toISOString().split('T')[0];
    keys.forEach(k => {
      expect(k <= today).toBe(true);
    });
  });

  it('all sessions are tagged isPreSeeded: true', () => {
    const sessions = generatePreseededSessions(null);
    Object.values(sessions).forEach(s => {
      expect(s.isPreSeeded).toBe(true);
    });
  });

  it('all sessions have valid YYYY-MM-DD keys', () => {
    const sessions = generatePreseededSessions(null);
    Object.keys(sessions).forEach(k => {
      expect(k).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('all sessions have positive computedLoad', () => {
    const sessions = generatePreseededSessions(null);
    Object.values(sessions).forEach(s => {
      expect(s.computedLoad).toBeGreaterThan(0);
    });
  });

  it('only generates sessions for training days (Tue/Thu/Sat/Sun)', () => {
    const sessions = generatePreseededSessions(null);
    const TRAINING_DAYS = ['Tue', 'Thu', 'Sat', 'Sun'];
    Object.values(sessions).forEach(s => {
      expect(TRAINING_DAYS).toContain(s.day);
    });
  });

  it('generates roughly 4 weeks of data (16 sessions: 4 days × 4 weeks)', () => {
    const sessions = generatePreseededSessions(null);
    // Should be around 16, exact count depends on calendar
    expect(Object.keys(sessions).length).toBeGreaterThanOrEqual(12);
    expect(Object.keys(sessions).length).toBeLessThanOrEqual(20);
  });

  it('does not generate duplicate date keys', () => {
    const sessions = generatePreseededSessions(null);
    const keys = Object.keys(sessions);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it('sessions have required fields', () => {
    const sessions = generatePreseededSessions(null);
    Object.values(sessions).forEach(s => {
      expect(s).toHaveProperty('date');
      expect(s).toHaveProperty('day');
      expect(s).toHaveProperty('blocks');
      expect(s).toHaveProperty('rpe');
      expect(s).toHaveProperty('completed', true);
      expect(Array.isArray(s.blocks)).toBe(true);
    });
  });
});
