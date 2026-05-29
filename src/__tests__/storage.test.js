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
