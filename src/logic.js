// Pure logic — no React imports. Used by both App.jsx and tests.

export const LOAD_WEIGHTS = {
  warmup: 0.3,
  cooldown: 0.1,
  skill: 0.5,
  sc: 0.6,
  pull_light: 0.8,
  pull_moderate: 1.2,
  pull_heavy: 1.6,
  climbing_easy: 0.6,
  climbing_moderate: 1.0,
  climbing_hard: 1.5,
  climbing_max: 1.7,
  fingers_low: 0.7,
  fingers_moderate: 1.2,
  fingers_high: 2.2,
};

// ─── Load ─────────────────────────────────────────────────────────────────────

export function calcLoggedLoad(logged) {
  if (!logged) return 0;
  if (logged.computedLoad !== undefined) return logged.computedLoad;
  if (Array.isArray(logged.blocks) && logged.blocks.length > 0) {
    let total = 0;
    logged.blocks.forEach(b => {
      const w = LOAD_WEIGHTS[b.intensity] ?? LOAD_WEIGHTS[b.type] ?? 0.5;
      total += (b.actualMin || 0) * w;
    });
    const rpeMod = (logged.rpe || 7) / 7;
    return Math.round(total * rpeMod);
  }
  const legacy = (logged.climbingMinutes || 0) * 1.0 +
                 (logged.fingerLoadMinutes || 0) * 1.2;
  const rpeMod = (logged.rpe || 7) / 7;
  return Math.round(legacy * rpeMod);
}

export function calcPlannedLoad(session, phaseKey, day, weekProg, blockIntensity) {
  if (!session) return 0;
  let load = 0;
  session.blocks.forEach(b => {
    const key = `${b.name}|${phaseKey}|${day}`;
    let intensityBucket = blockIntensity?.[key];
    if (!intensityBucket) {
      if (b.type === 'climbing') intensityBucket = 'climbing_moderate';
      else if (b.type === 'fingers') intensityBucket = 'fingers_moderate';
      else if (b.type === 'sc' && /pull/i.test(b.name)) intensityBucket = 'pull_moderate';
      else intensityBucket = b.type;
    }
    const weight = LOAD_WEIGHTS[intensityBucket] ?? LOAD_WEIGHTS[b.type] ?? 0.5;
    load += b.time * weight;
  });
  return Math.round(load * (weekProg?.volumeMult ?? 1) * (weekProg?.intensityMult ?? 1));
}

// ─── ACWR ─────────────────────────────────────────────────────────────────────
// RA-ACWR canonical:
//   acute  = load in days 0–6 (current week), extrapolated to 7 days
//   chronic = mean of all weekly buckets INCLUDING acute
//   ratio  = acute / chronic

function localDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d); // local midnight — avoids UTC timezone shift
}

export function calcACWR(sessions) {
  const now = new Date();
  const DAY = 24 * 60 * 60 * 1000;

  const weekBuckets = [0, 0, 0, 0];
  const weekHasData = [false, false, false, false];

  Object.entries(sessions).forEach(([k, s]) => {
    const diff = (now - localDate(k)) / DAY;
    if (diff < 0 || diff >= 28) return;
    const load = calcLoggedLoad(s);
    if (load <= 0) return;
    const slot = Math.min(3, Math.floor(diff / 7));
    weekBuckets[slot] += load;
    weekHasData[slot] = true;
  });

  // Don't extrapolate — use the raw acute bucket.
  // Extrapolation would inflate chronic when the current week is partial,
  // which is misleading. Ratio < 1 on a rest day is correct and expected.
  const acuteExtrapolated = weekBuckets[0];

  // Chronic = mean of all available weekly buckets, acute extrapolated included
  const availableSlots = weekHasData.reduce((count, has, i) => {
    if (i === 0) return count + 1; // always count acute slot
    return has ? count + 1 : count;
  }, 0);

  const preAcuteTotal = weekBuckets.slice(1).reduce((s, v) => s + v, 0);
  const chronicTotal = acuteExtrapolated + preAcuteTotal;
  const chronic = availableSlots > 0 ? chronicTotal / availableSlots : 0;
  const ratio = chronic > 0 ? acuteExtrapolated / chronic : 0;
  const weeksAvailable = availableSlots;

  return { acute: acuteExtrapolated, chronic, ratio, weeksAvailable };
}

// ─── Week / phase helpers ──────────────────────────────────────────────────────

export function getCurrentWeek(phaseStartDate, phaseTotalWeeks) {
  if (!phaseStartDate) return 1;
  const start = new Date(phaseStartDate);
  const now = new Date();
  const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  const week = Math.floor(days / 7) + 1;
  return Math.max(1, Math.min(week, phaseTotalWeeks));
}

// ─── Schema validation ────────────────────────────────────────────────────────

export function validateSessions(sessions) {
  const errors = [];
  if (typeof sessions !== 'object' || sessions === null) {
    errors.push('sessions is not an object');
    return errors;
  }
  Object.entries(sessions).forEach(([key, s]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) errors.push(`bad date key: ${key}`);
    if (s.rpe !== undefined && (s.rpe < 0 || s.rpe > 10)) errors.push(`rpe out of range on ${key}`);
    if (s.date && s.date !== key) errors.push(`date field mismatch on ${key}`);
    if (Array.isArray(s.blocks)) {
      s.blocks.forEach((b, i) => {
        if (!b.name || !b.type) errors.push(`block ${i} on ${key} missing name/type`);
        if (b.actualMin !== undefined && (b.actualMin < 0 || b.actualMin > 600))
          errors.push(`block ${i} on ${key} has bad actualMin: ${b.actualMin}`);
      });
    }
  });
  return errors;
}

export function validateFingerLog(fingerLog) {
  const errors = [];
  if (typeof fingerLog !== 'object' || fingerLog === null) {
    errors.push('fingerLog is not an object');
    return errors;
  }
  Object.entries(fingerLog).forEach(([key, v]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) errors.push(`bad date key: ${key}`);
    if (v.left !== undefined && (v.left < 0 || v.left > 10)) errors.push(`left out of range on ${key}`);
    if (v.right !== undefined && (v.right < 0 || v.right > 10)) errors.push(`right out of range on ${key}`);
  });
  return errors;
}

// ─── Schema migration ─────────────────────────────────────────────────────────
// Migrations run on startup before React state loads.
// Each migration is: { version, up(store) } where store = { get, set }.

export const SCHEMA_VERSION = 1;

const MIGRATIONS = [
  // v0 → v1: stamp schema version (no data transforms needed)
  {
    version: 1,
    up(store) {
      // nothing to transform — just stamps the version
    },
  },
];

export function runMigrations(store) {
  const raw = store.get('schemaVersion');
  const currentVersion = raw ? parseInt(raw, 10) : 0;
  if (currentVersion >= SCHEMA_VERSION) return;

  MIGRATIONS.forEach(m => {
    if (m.version > currentVersion) {
      m.up(store);
    }
  });

  store.set('schemaVersion', String(SCHEMA_VERSION));
}

// ─── Pre-seeded ACWR baseline ─────────────────────────────────────────────────
// Generates 4 weeks of synthetic Capacity sessions so ACWR has a baseline
// from day one. Sessions are tagged isPreSeeded: true.

const PRESEED_DAY_LOADS = {
  // Tue: climbing easy 90m + fingers moderate 18m, RPE 6
  Tue: { blocks: [
    { name: 'Climbing', type: 'climbing', intensity: 'climbing_easy', actualMin: 90, plannedMin: 90 },
    { name: 'Fingers (repeaters)', type: 'fingers', intensity: 'fingers_moderate', actualMin: 18, plannedMin: 18 },
  ], rpe: 6 },
  // Thu: skill 15m + climbing easy 60m, RPE 6
  Thu: { blocks: [
    { name: 'Skill drill', type: 'skill', intensity: 'skill', actualMin: 15, plannedMin: 15 },
    { name: 'Climbing', type: 'climbing', intensity: 'climbing_easy', actualMin: 60, plannedMin: 60 },
  ], rpe: 6 },
  // Sat: climbing moderate 45m + core sc 15m, RPE 6
  Sat: { blocks: [
    { name: 'Climbing (4×4s)', type: 'climbing', intensity: 'climbing_moderate', actualMin: 45, plannedMin: 45 },
    { name: 'Core + lower back', type: 'sc', intensity: 'sc', actualMin: 15, plannedMin: 15 },
  ], rpe: 6 },
  // Sun: climbing easy 50m + push+pull sc 25m, RPE 5
  Sun: { blocks: [
    { name: 'Climbing', type: 'climbing', intensity: 'climbing_easy', actualMin: 50, plannedMin: 50 },
    { name: 'Push + Pull', type: 'sc', intensity: 'sc', actualMin: 25, plannedMin: 25 },
  ], rpe: 5 },
};

const WEEK_VOLUME_MULTS = [1.0, 1.0, 1.0, 1.0]; // flat — preseed is just ACWR baseline, not a training block simulation

export function generatePreseededSessions(anchorDate) {
  const sessions = {};
  const anchor = anchorDate ? new Date(anchorDate) : new Date();
  const DAY = 24 * 60 * 60 * 1000;
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate 4 weeks back from anchor
  for (let weekBack = 4; weekBack >= 1; weekBack--) {
    const mult = WEEK_VOLUME_MULTS[4 - weekBack] ?? 1.0;
    // Find the Sunday that starts this week (going back weekBack full weeks)
    const weekStartOffset = weekBack * 7;

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(anchor.getTime() - (weekStartOffset - dayOffset) * DAY);
      const dow = DOW[date.getDay()];
      const template = PRESEED_DAY_LOADS[dow];
      if (!template) continue;

      const dateKey = date.toISOString().split('T')[0];
      // Scale block minutes by volume mult
      const blocks = template.blocks.map(b => ({
        ...b,
        actualMin: Math.round(b.actualMin * mult),
        plannedMin: Math.round(b.plannedMin * mult),
      }));
      const load = calcLoggedLoad({ blocks, rpe: template.rpe });
      sessions[dateKey] = {
        date: dateKey,
        day: dow,
        blocks,
        rpe: template.rpe,
        notes: '',
        completed: true,
        computedLoad: load,
        isPreSeeded: true,
      };
    }
  }
  return sessions;
}
