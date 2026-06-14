import { describe, it, expect } from 'vitest';
import {
  calcLoggedLoad,
  calcACWR,
  validateSessions,
  validateFingerLog,
  LOAD_WEIGHTS,
  getCurrentWeek,
  localDateKey,
} from '../logic.js';

// ─── Load calc ────────────────────────────────────────────────────────────────

describe('calcLoggedLoad', () => {
  it('easy climbing 90m @ RPE 7 = 54', () => {
    const session = {
      blocks: [{ name: 'Climbing', type: 'climbing', intensity: 'climbing_easy', actualMin: 90 }],
      rpe: 7,
    };
    expect(calcLoggedLoad(session)).toBe(54); // 90 * 0.6 * (7/7)
  });

  it('strength session: limit 75m + max hangs 22m @ RPE 9 = 207', () => {
    const session = {
      blocks: [
        { name: 'Climbing (limit)', type: 'climbing', intensity: 'climbing_hard', actualMin: 75 },
        { name: 'Fingers (max hangs)', type: 'fingers', intensity: 'fingers_high', actualMin: 22 },
      ],
      rpe: 9,
    };
    const expected = Math.round((75 * 1.5 + 22 * 2.2) * (9 / 7));
    expect(calcLoggedLoad(session)).toBe(expected);
  });

  it('empty blocks = 0', () => {
    expect(calcLoggedLoad({ blocks: [], rpe: 7 })).toBe(0);
  });

  it('null = 0', () => {
    expect(calcLoggedLoad(null)).toBe(0);
  });

  it('legacy format (climbingMinutes) yields > 0', () => {
    const session = { climbingMinutes: 60, fingerLoadMinutes: 10, rpe: 7 };
    expect(calcLoggedLoad(session)).toBeGreaterThan(0);
  });

  it('computedLoad field is used when present', () => {
    const session = { blocks: [], rpe: 7, computedLoad: 99 };
    expect(calcLoggedLoad(session)).toBe(99);
  });

  it('RPE scaling: same session RPE 10 > RPE 5', () => {
    const make = (rpe) => ({
      blocks: [{ type: 'climbing', intensity: 'climbing_moderate', actualMin: 60 }],
      rpe,
    });
    expect(calcLoggedLoad(make(10))).toBeGreaterThan(calcLoggedLoad(make(5)));
  });

  it('climbing/fingers/pull weights spread is ~3.7x (not 6x)', () => {
    // climbing_easy (0.6) to fingers_high (2.2) = 3.67x — the canonical spread
    const trainingWeights = [
      LOAD_WEIGHTS.climbing_easy, LOAD_WEIGHTS.climbing_moderate,
      LOAD_WEIGHTS.climbing_hard, LOAD_WEIGHTS.climbing_max,
      LOAD_WEIGHTS.fingers_low, LOAD_WEIGHTS.fingers_moderate, LOAD_WEIGHTS.fingers_high,
      LOAD_WEIGHTS.pull_light, LOAD_WEIGHTS.pull_moderate, LOAD_WEIGHTS.pull_heavy,
    ];
    const max = Math.max(...trainingWeights);
    const min = Math.min(...trainingWeights);
    expect(max / min).toBeLessThan(5);
    expect(max / min).toBeGreaterThan(2.5);
  });
});

// ─── ACWR ─────────────────────────────────────────────────────────────────────

function dateKey(daysBack) {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function makeSession(daysBack, load) {
  return [dateKey(daysBack), { blocks: [], rpe: 7, computedLoad: load }];
}

describe('calcACWR', () => {
  it('returns zero ratio when no sessions', () => {
    const { ratio } = calcACWR({});
    expect(ratio).toBe(0);
  });

  it('ratio = 1 when same load in all weeks', () => {
    const sessions = Object.fromEntries([
      makeSession(0, 100),
      makeSession(8, 100),
      makeSession(15, 100),
    ]);
    const { ratio } = calcACWR(sessions);
    expect(ratio).toBeCloseTo(1.0, 1);
  });

  it('ratio > 1 when recent load spikes', () => {
    const sessions = Object.fromEntries([
      makeSession(0, 200),  // acute spike
      makeSession(8, 50),
      makeSession(15, 50),
    ]);
    const { ratio } = calcACWR(sessions);
    expect(ratio).toBeGreaterThan(1.0);
  });

  it('ratio < 1 when recent load drops', () => {
    const sessions = Object.fromEntries([
      makeSession(0, 30),   // light recent
      makeSession(8, 150),
      makeSession(15, 150),
    ]);
    const { ratio } = calcACWR(sessions);
    expect(ratio).toBeLessThan(1.0);
  });

  it('ignores sessions older than 28 days', () => {
    const withOld = Object.fromEntries([
      makeSession(0, 100),
      makeSession(8, 100),
      makeSession(30, 9999), // older than 28d — should be ignored
    ]);
    const withoutOld = Object.fromEntries([
      makeSession(0, 100),
      makeSession(8, 100),
    ]);
    expect(calcACWR(withOld).ratio).toBeCloseTo(calcACWR(withoutOld).ratio, 2);
  });

  it('returns finite values', () => {
    const sessions = Object.fromEntries([makeSession(0, 100), makeSession(10, 100)]);
    const { ratio, acute, chronic } = calcACWR(sessions);
    expect(isFinite(ratio)).toBe(true);
    expect(isFinite(acute)).toBe(true);
    expect(isFinite(chronic)).toBe(true);
  });
});

// ─── Schema validation ────────────────────────────────────────────────────────

describe('validateSessions', () => {
  it('passes for empty object', () => {
    expect(validateSessions({})).toHaveLength(0);
  });

  it('passes for valid session', () => {
    const sessions = {
      '2024-01-15': {
        date: '2024-01-15',
        blocks: [{ name: 'Climbing', type: 'climbing', actualMin: 60 }],
        rpe: 7,
      },
    };
    expect(validateSessions(sessions)).toHaveLength(0);
  });

  it('catches bad date key', () => {
    const sessions = { 'not-a-date': { blocks: [], rpe: 7 } };
    expect(validateSessions(sessions).length).toBeGreaterThan(0);
  });

  it('catches RPE out of range', () => {
    const sessions = { '2024-01-15': { blocks: [], rpe: 15 } };
    expect(validateSessions(sessions).length).toBeGreaterThan(0);
  });

  it('catches malformed block', () => {
    const sessions = {
      '2024-01-15': {
        blocks: [{ actualMin: 60 }], // missing name and type
        rpe: 7,
      },
    };
    expect(validateSessions(sessions).length).toBeGreaterThan(0);
  });

  it('returns errors for non-object', () => {
    expect(validateSessions(null).length).toBeGreaterThan(0);
    expect(validateSessions('bad').length).toBeGreaterThan(0);
  });
});

describe('validateFingerLog', () => {
  it('passes for empty object', () => {
    expect(validateFingerLog({})).toHaveLength(0);
  });

  it('passes for valid entry', () => {
    const log = { '2024-01-15': { left: 2, right: 0 } };
    expect(validateFingerLog(log)).toHaveLength(0);
  });

  it('catches pain value > 10', () => {
    const log = { '2024-01-15': { left: 11, right: 0 } };
    expect(validateFingerLog(log).length).toBeGreaterThan(0);
  });

  it('catches bad date key', () => {
    const log = { 'today': { left: 2, right: 0 } };
    expect(validateFingerLog(log).length).toBeGreaterThan(0);
  });
});

// ─── getCurrentWeek ───────────────────────────────────────────────────────────

describe('getCurrentWeek', () => {
  it('returns 1 when no start date', () => {
    expect(getCurrentWeek(null, 4)).toBe(1);
  });

  it('returns 1 on day 0', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(getCurrentWeek(today, 4)).toBe(1);
  });

  it('returns 2 after 7 days', () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    expect(getCurrentWeek(d.toISOString().split('T')[0], 4)).toBe(2);
  });

  it('clamps to totalWeeks', () => {
    const d = new Date();
    d.setDate(d.getDate() - 100);
    expect(getCurrentWeek(d.toISOString().split('T')[0], 4)).toBe(4);
  });
});

// ─── localDateKey ─────────────────────────────────────────────────────────────

describe('localDateKey', () => {
  it('returns YYYY-MM-DD in local timezone', () => {
    const d = new Date(2025, 0, 5); // Jan 5 2025 local midnight
    expect(localDateKey(d)).toBe('2025-01-05');
  });

  it('zero-pads month and day', () => {
    expect(localDateKey(new Date(2025, 8, 3))).toBe('2025-09-03'); // Sep 3
  });

  it('does not drift to next day due to UTC offset', () => {
    // Simulate a date that is e.g. Dec 31 local but Jan 1 in UTC
    // new Date(2025, 11, 31, 23, 0) = Dec 31 at 11pm local
    const d = new Date(2025, 11, 31, 23, 0, 0);
    expect(localDateKey(d)).toBe('2025-12-31');
  });

  it('defaults to today', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(localDateKey()).toBe(expected);
  });
});
