import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, Activity, TrendingUp, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, Plus, Minus, Save, RotateCcw, Plane, X, ChevronDown, Trash2, Info, Timer, Hash } from 'lucide-react';
import { calcLoggedLoad, calcACWR, getCurrentWeek, runMigrations, generatePreseededSessions } from './logic.js';
import { SC_WORKOUTS } from './sc-workouts.js';

// ============================================================
// WARMUP & COOLDOWN PROTOCOLS
// ============================================================

const PROTOCOLS = {
  warmup_short: {
    name: 'Short warm-up (10–15 min)',
    steps: [
      { t: '2 min', what: 'Pulse raise: jumping jacks, jog in place, or skipping' },
      { t: '3 min', what: 'Mobility: arm circles, hip openers, leg swings, thoracic rotations' },
      { t: '2 min', what: 'Activation: scapular pull-ups (or hangs with retraction), band pull-aparts, glute bridges' },
      { t: '3–5 min', what: 'Easy climbing: 4–6 problems V0–V2, focus on movement smoothness' },
    ],
  },
  warmup_standard: {
    name: 'Standard warm-up (15–20 min)',
    steps: [
      { t: '3 min', what: 'Pulse raise: skipping, jumping jacks, or brisk walk + arm swings' },
      { t: '5 min', what: 'Mobility flow: shoulder dislocates, thoracic openers, hip openers, ankle/wrist circles, finger flossing' },
      { t: '3 min', what: 'Activation: scapular pulls, band external rotation, glute bridges, dead hangs 2×20s' },
      { t: '5–8 min', what: 'Easy climbing ladder: 2 problems V0, 2 at V1, 2 at V2, 1–2 at V3' },
      { t: '1 min', what: 'Optional: 1–2 light hangboard pulls @ 50% to prime fingers' },
    ],
  },
  warmup_power: {
    name: 'Power warm-up (25 min)',
    note: 'Power phase needs thorough nervous system prep. Don\'t skip steps.',
    steps: [
      { t: '3 min', what: 'Pulse raise: skipping or rowing' },
      { t: '5 min', what: 'Full mobility: thoracic, shoulders, hips, wrists, fingers' },
      { t: '4 min', what: 'Activation: scap pulls, banded ER, glute bridges, hollow holds' },
      { t: '5 min', what: 'Climbing ladder: V0 → V1 → V2 → V3 → V4, 1–2 problems each' },
      { t: '5 min', what: 'Progressive priming: 2–3 problems V5–V6 with explosive intent' },
      { t: '3 min', what: 'Hangboard primer: 2 × 5s @ 70%, then 2 × 3s @ 85% on 20mm' },
    ],
  },
  cooldown_standard: {
    name: 'Cool-down (5–10 min)',
    steps: [
      { t: '2 min', what: 'Easy down-climbing or walk around to lower heart rate' },
      { t: '3 min', what: 'Forearm stretches: wrist flexor 30s/side, wrist extensor 30s/side, finger flexor 30s/hand' },
      { t: '2 min', what: 'Shoulder & lat stretch: doorway pec 30s, child\'s pose with lat reach 60s' },
      { t: '2 min', what: 'Hips & legs: pigeon 30s/side, standing forearm/quad stretch' },
      { t: '1 min', what: 'Light finger flossing: gentle PIP/DIP flexion-extension, no load' },
    ],
  },
  cooldown_peak: {
    name: 'Cool-down (10 min) — recovery-focused',
    steps: [
      { t: '3 min', what: 'Easy movement: walk, light shake-out' },
      { t: '4 min', what: 'Full forearm + shoulder stretch routine — hold each stretch 45s' },
      { t: '3 min', what: 'Hip flexor + posterior chain stretch (you stood/squatted under load)' },
    ],
  },
  buffer: {
    name: 'Buffer time',
    steps: [
      { t: 'as needed', what: 'Extra rest between rounds. Use this if quality is dropping. Don\'t skip remaining rounds — slow down instead.' },
    ],
  },
  mobility_recovery: {
    name: 'Active recovery / mobility (25 min)',
    steps: [
      { t: '5 min', what: 'Easy cardio: walk, easy bike, very light jog' },
      { t: '10 min', what: 'Full-body mobility flow: cat-cow, world\'s greatest stretch, deep squat hold, thoracic rotations, shoulder dislocates' },
      { t: '5 min', what: 'Forearm-specific: wrist circles, finger flexor/extensor stretches, gentle eccentrics with light band' },
      { t: '5 min', what: 'Foam roll or massage gun on lats, traps, quads, calves' },
    ],
  },
  mobility_short: {
    name: 'Mobility (15 min)',
    steps: [
      { t: '5 min', what: 'Full-body flow: cat-cow, world\'s greatest stretch, deep squat, thoracic openers' },
      { t: '5 min', what: 'Forearm + shoulder: wrist stretches, doorway pec, lat reaches' },
      { t: '5 min', what: 'Hip + leg: pigeon, hamstring stretch, calf stretch' },
    ],
  },
};

// ============================================================
// LOAD WEIGHTS (Foster sRPE-inspired intensity weighting)
//
// Weights assume SESSION MINUTES (including warm-up, cool-down, and
// rest between efforts) — the canonical Foster (2001) sRPE methodology.
//
// Spread of 0.6 (easy climbing) → 2.2 (max fingers) = ~3.7× range,
// aligned with Foster's low/moderate/high zone ratios (typically 1:2:3).
//
// Pull is broken out separately because it directly overlaps with
// climbing's muscular and connective tissue demands (lats, biceps,
// posterior shoulder, elbow). Push/legs/core/wrist/neck don't compete
// for the same recovery pool, so they share the generic `sc` weight.
// ============================================================

const LOAD_WEIGHTS = {
  warmup: 0.3,
  cooldown: 0.1,
  skill: 0.5,
  sc: 0.6,                 // push/legs/core/wrist/neck — low overlap with climbing
  // Pull contributes to climbing recovery pool
  pull_light: 0.8,         // bodyweight pull-ups/rows, moderate effort
  pull_moderate: 1.2,      // weighted ~70–80%, 3×8 type sets
  pull_heavy: 1.6,         // heavy 5×3 @ 85%+, explosive/plyo pulls
  // Climbing by intensity
  climbing_easy: 0.6,      // V0–V4 volume, lots of rest, RPE 5–6
  climbing_moderate: 1.0,  // 4×4s, board V6–V8 circuits, RPE 7 (REFERENCE)
  climbing_hard: 1.5,      // Limit V8+, projects, power boulders, RPE 8–9
  climbing_max: 1.7,       // Campus, dynos, max-effort single moves (neural cost)
  // Fingers by intensity
  fingers_low: 0.7,        // No-hangs <70%, light repeaters
  fingers_moderate: 1.2,   // Repeaters 70–80%
  fingers_high: 2.2,       // Max hangs 90%+, min-edge, contact strength
};

// Tag each block with an intensity bucket (used for load calc).
// Pull blocks are tagged here because they overlap with climbing's
// muscular and recovery demands. Other S&C (push/legs/core/wrist/neck)
// uses the generic `sc` weight via type fallback.
const BLOCK_INTENSITY = {
  // capacity
  'Climbing|capacity|Tue': 'climbing_easy',
  'Climbing|capacity|Thu': 'climbing_easy',
  'Climbing (4×4s)|capacity|Sat': 'climbing_moderate',
  'Climbing|capacity|Sun': 'climbing_easy',
  'Fingers (repeaters)|capacity|Tue': 'fingers_moderate',
  'Fingers (no-hangs light)|capacity|Sun': 'fingers_low',
  'Push + Pull|capacity|Sun': 'pull_moderate',
  // strength
  'Climbing (limit)|strength|Tue': 'climbing_hard',
  'Climbing (board limit)|strength|Thu': 'climbing_hard',
  'Climbing (limit)|strength|Sat': 'climbing_hard',
  'Easy climb|strength|Sun': 'climbing_easy',
  'Fingers (max hangs)|strength|Tue': 'fingers_high',
  'Fingers (max hangs)|strength|Sun': 'fingers_high',
  'Push + Pull|strength|Sun': 'pull_heavy',
  // power
  'Campus|power|Tue': 'climbing_max',
  'Power boulders|power|Tue': 'climbing_hard',
  'Dynos|power|Thu': 'climbing_max',
  'Board (single hard moves)|power|Thu': 'climbing_hard',
  'Board climbing|power|Sat': 'climbing_hard',
  'Fingers (min-edge)|power|Tue': 'fingers_high',
  'Fingers (contact strength)|power|Sat': 'fingers_high',
  'Push + Pull|power|Sun': 'pull_heavy',
  // power endurance
  'Climbing (4×4s)|powerEndurance|Tue': 'climbing_moderate',
  'Board circuit|powerEndurance|Thu': 'climbing_moderate',
  'Long boulder simulation|powerEndurance|Sat': 'climbing_hard',
  'Easy climb OR rest|powerEndurance|Sun': 'climbing_easy',
  'Fingers (repeaters)|powerEndurance|Tue': 'fingers_moderate',
  'Fingers (no-hang density)|powerEndurance|Sun': 'fingers_moderate',
  'Push + Pull|powerEndurance|Sun': 'pull_moderate',
  // peak
  'Project session|peak|Tue': 'climbing_hard',
  'Easy movement|peak|Thu': 'climbing_easy',
  'Project session|peak|Sat': 'climbing_hard',
  'Push + Pull (light)|peak|Sun': 'pull_light',
  // travel
  'Climbing|travel|Tue': 'climbing_easy',
  'Climbing|travel|Sat': 'climbing_easy',
  'Pull|travel|Wed': 'pull_light',
};

// ============================================================
// PERIODIC PROGRESSION WITHIN PHASES
// Multiplier applied to volume and intensity targets.
// Hangboard %, problem grade ceiling, and climbing volume all scale with this.
// ============================================================

const WEEK_PROGRESSION = {
  capacity: [
    { week: 1, volumeMult: 1.00, intensityMult: 1.00, note: 'Base week. Establish RPE 5–7 feel. Stay disciplined — should feel easy.' },
    { week: 2, volumeMult: 1.10, intensityMult: 1.00, note: '+10% volume. Add ~5 boulders / +1 hangboard set.' },
    { week: 3, volumeMult: 1.20, intensityMult: 1.05, note: '+20% volume vs W1. Peak capacity week — fingers should feel worked but not tweaky.' },
    { week: 4, volumeMult: 0.70, intensityMult: 0.90, note: 'DELOAD week. ~70% volume. Recover for strength phase.' },
  ],
  strength: [
    { week: 1, volumeMult: 1.00, intensityMult: 1.00, note: 'Establish baseline limit grade. Hangboard at planned %.' },
    { week: 2, volumeMult: 1.00, intensityMult: 1.05, note: '+5% load on hangboard. Push one harder limit problem.' },
    { week: 3, volumeMult: 0.80, intensityMult: 0.95, note: 'Mini-deload. ~80% volume, slightly lower hangboard %.' },
  ],
  power: [
    { week: 1, volumeMult: 1.00, intensityMult: 1.00, note: 'Movement quality + intent. Speed > load.' },
    { week: 2, volumeMult: 1.00, intensityMult: 1.05, note: 'Same volume, push intent harder. Track campus rungs / dyno distance.' },
  ],
  powerEndurance: [
    { week: 1, volumeMult: 1.00, intensityMult: 1.00, note: 'Establish 4×4 baseline at V6.' },
    { week: 2, volumeMult: 1.10, intensityMult: 1.00, note: 'Shorten rests 10–15s, add 1 round to 4×4s if recovered.' },
  ],
  peak: [
    { week: 1, volumeMult: 0.60, intensityMult: 1.00, note: 'Express, don\'t build. Maintenance volume only. Send.' },
  ],
  travel: [
    { week: 1, volumeMult: 1.00, intensityMult: 1.00, note: 'Maintenance. Fingers dictate progression. Open hand only.' },
  ],
};

// ============================================================
// THE PLAN DATA
// ============================================================

const PHASES = {
  capacity: {
    name: 'Capacity',
    weeks: '1–4',
    totalWeeks: 4,
    color: '#10b981',
    description: 'Volume at V3–V6. Building tissue tolerance. Should feel too easy.',
    progression: 'W1 base → W2 +10% → W3 +20% → W4 deload to 70%.',
    sessions: {
      Tue: {
        total: '~2h',
        blocks: [
          { name: 'Warm-up', detail: '', time: 15, type: 'warmup', protocol: 'warmup_standard' },
          { name: 'Climbing', detail: '40–50 boulders V3–V5, RPE 5–7', time: 90, type: 'climbing' },
          { name: 'Fingers (repeaters)', detail: '6 × (7s/3s × 6 reps) @ 70%, 2 min rest', time: 18, type: 'fingers' },
          { name: 'Cool-down', detail: '', time: 5, type: 'cooldown', protocol: 'cooldown_standard' },
        ],
      },
      Thu: {
        total: '~2h',
        blocks: [
          { name: 'Warm-up', detail: '', time: 15, type: 'warmup', protocol: 'warmup_standard' },
          { name: 'Skill drill', detail: 'One pattern, focused practice', time: 15, type: 'skill' },
          { name: 'Climbing', detail: '30–40 boulders V2–V5', time: 60, type: 'climbing' },
          { name: 'Shoulder', detail: 'See training folder', time: 15, type: 'sc' },
          { name: 'Neck', detail: 'See training folder', time: 3, type: 'sc' },
          { name: 'Cool-down', detail: '', time: 5, type: 'cooldown', protocol: 'cooldown_standard' },
        ],
      },
      Sat: {
        total: '~1h 45m',
        blocks: [
          { name: 'Warm-up', detail: '', time: 15, type: 'warmup', protocol: 'warmup_standard' },
          { name: 'Climbing (4×4s)', detail: 'V3–V4, 4 rounds × 4 boulders, ~1 min between, 3 min between rounds', time: 45, type: 'climbing' },
          { name: 'Wrist', detail: 'See training folder', time: 8, type: 'sc' },
          { name: 'Core + lower back', detail: 'See training folder', time: 15, type: 'sc' },
          { name: 'Cool-down', detail: '', time: 5, type: 'cooldown', protocol: 'cooldown_standard' },
        ],
      },
      Sun: {
        total: '~2h',
        blocks: [
          { name: 'Warm-up', detail: '', time: 10, type: 'warmup', protocol: 'warmup_short' },
          { name: 'Climbing', detail: '20–30 easy boulders V2–V4, movement quality', time: 50, type: 'climbing' },
          { name: 'Push + Pull', detail: 'See training folder', time: 25, type: 'sc' },
          { name: 'Legs', detail: 'See training folder', time: 12, type: 'sc' },
          { name: 'Fingers (no-hangs light)', detail: '5 × 10s @ 60%, 2 min rest', time: 12, type: 'fingers' },
          { name: 'Cool-down', detail: '', time: 5, type: 'cooldown', protocol: 'cooldown_standard' },
        ],
      },
    },
  },
  strength: {
    name: 'Strength',
    weeks: '5–7',
    totalWeeks: 3,
    color: '#3b82f6',
    description: 'Limit bouldering. Max recruitment. Few attempts, heavy load, full rest.',
    progression: 'W1 base → W2 +5% load → W3 mini-deload.',
    sessions: {
      Tue: {
        total: '~2h',
        blocks: [
          { name: 'Warm-up', detail: 'Thorough — limit bouldering needs full prep', time: 20, type: 'warmup', protocol: 'warmup_standard' },
          { name: 'Climbing (limit)', detail: '6–8 problems V8–V10, 3–5 tries each, 3–5 min rest', time: 75, type: 'climbing' },
          { name: 'Fingers (max hangs)', detail: '6 × 7–10s @ 90% max, 3 min rest', time: 22, type: 'fingers' },
          { name: 'Cool-down', detail: '', time: 5, type: 'cooldown', protocol: 'cooldown_standard' },
        ],
      },
      Thu: {
        total: '~1h 45m',
        blocks: [
          { name: 'Warm-up', detail: '', time: 20, type: 'warmup', protocol: 'warmup_standard' },
          { name: 'Climbing (board limit)', detail: '5–7 problems Kilter/MoonBoard, 3–5 tries', time: 60, type: 'climbing' },
          { name: 'Shoulder', detail: 'See training folder', time: 15, type: 'sc' },
          { name: 'Neck', detail: 'See training folder', time: 3, type: 'sc' },
          { name: 'Cool-down', detail: '', time: 5, type: 'cooldown', protocol: 'cooldown_standard' },
        ],
      },
      Sat: {
        total: '~2h',
        blocks: [
          { name: 'Warm-up', detail: '', time: 20, type: 'warmup', protocol: 'warmup_standard' },
          { name: 'Climbing (limit)', detail: '6–8 problems V8–V10, different style from Tue', time: 70, type: 'climbing' },
          { name: 'Wrist', detail: 'See training folder', time: 8, type: 'sc' },
          { name: 'Core + lower back', detail: 'See training folder', time: 15, type: 'sc' },
          { name: 'Cool-down', detail: '', time: 5, type: 'cooldown', protocol: 'cooldown_standard' },
        ],
      },
      Sun: {
        total: '~1h 45m',
        blocks: [
          { name: 'Warm-up', detail: '', time: 15, type: 'warmup', protocol: 'warmup_standard' },
          { name: 'Easy climb', detail: '20 boulders V3–V5 (or skip if cooked)', time: 35, type: 'climbing' },
          { name: 'Push + Pull', detail: 'See training folder', time: 28, type: 'sc' },
          { name: 'Legs', detail: 'See training folder', time: 12, type: 'sc' },
          { name: 'Fingers (max hangs)', detail: '6 × 7s on 14–15mm @ BW or +5kg', time: 22, type: 'fingers' },
          { name: 'Cool-down', detail: '', time: 5, type: 'cooldown', protocol: 'cooldown_standard' },
        ],
      },
    },
  },
  power: {
    name: 'Power',
    weeks: '8–9',
    totalWeeks: 2,
    color: '#f59e0b',
    description: 'Explosive, short, full rest. Converting strength to speed.',
    progression: 'W1 base → W2 push intent.',
    sessions: {
      Tue: {
        total: '~2h',
        blocks: [
          { name: 'Warm-up', detail: 'Extra thorough — full nervous system prep', time: 25, type: 'warmup', protocol: 'warmup_power' },
          { name: 'Campus', detail: '4–6 sets of 1-5-9 or ladders, full rest', time: 25, type: 'climbing' },
          { name: 'Power boulders', detail: '5–6 problems (1–3 explosive moves) V8–V10, 3–5 tries, 3 min rest', time: 35, type: 'climbing' },
          { name: 'Fingers (min-edge)', detail: '5 × 5s on smallest edge @ BW, 3 min rest', time: 17, type: 'fingers' },
          { name: 'Cool-down', detail: '', time: 5, type: 'cooldown', protocol: 'cooldown_standard' },
        ],
      },
      Thu: {
        total: '~1h 45m',
        blocks: [
          { name: 'Warm-up', detail: '', time: 25, type: 'warmup', protocol: 'warmup_power' },
          { name: 'Dynos', detail: '6–8 max-distance dynos, 3 min rest', time: 25, type: 'climbing' },
          { name: 'Board (single hard moves)', detail: '4–5 problems', time: 25, type: 'climbing' },
          { name: 'Shoulder', detail: 'See training folder', time: 15, type: 'sc' },
          { name: 'Neck', detail: 'See training folder', time: 3, type: 'sc' },
          { name: 'Cool-down', detail: '', time: 5, type: 'cooldown', protocol: 'cooldown_standard' },
        ],
      },
      Sat: {
        total: '~1h 50m',
        blocks: [
          { name: 'Warm-up', detail: '', time: 25, type: 'warmup', protocol: 'warmup_power' },
          { name: 'Board climbing', detail: '5–6 short hard problems (3–6 moves), 3–5 min rest', time: 45, type: 'climbing' },
          { name: 'Fingers (contact strength)', detail: '5 × 3–5s on small edge, max intent, 3 min rest', time: 12, type: 'fingers' },
          { name: 'Wrist', detail: 'See training folder', time: 8, type: 'sc' },
          { name: 'Core + lower back', detail: 'See training folder', time: 13, type: 'sc' },
          { name: 'Cool-down', detail: '', time: 5, type: 'cooldown', protocol: 'cooldown_standard' },
        ],
      },
      Sun: {
        total: '~1h 25m',
        blocks: [
          { name: 'Warm-up', detail: '', time: 10, type: 'warmup', protocol: 'warmup_short' },
          { name: 'Push + Pull', detail: 'See training folder', time: 32, type: 'sc' },
          { name: 'Legs (with jumps)', detail: 'See training folder', time: 12, type: 'sc' },
          { name: 'Mobility / active recovery', detail: '', time: 25, type: 'cooldown', protocol: 'mobility_recovery' },
          { name: 'Cool-down', detail: '', time: 5, type: 'cooldown', protocol: 'cooldown_standard' },
        ],
      },
    },
  },
  powerEndurance: {
    name: 'Power Endurance',
    weeks: '10–11',
    totalWeeks: 2,
    color: '#ef4444',
    description: 'Sustaining power across many moves. Builds the engine.',
    progression: 'W1 base → W2 shorten rests + add round.',
    sessions: {
      Tue: {
        total: '~2h',
        blocks: [
          { name: 'Warm-up', detail: '', time: 15, type: 'warmup', protocol: 'warmup_standard' },
          { name: 'Climbing (4×4s)', detail: 'V6–V7, 4 boulders back to back (~30s rest), 3–4 min between rounds, 4 rounds', time: 50, type: 'climbing' },
          { name: 'Fingers (repeaters)', detail: '6 × (7s/3s × 6 reps) @ 75% max', time: 18, type: 'fingers' },
          { name: 'Buffer', detail: 'Extra rest between rounds if needed', time: 20, type: 'cooldown', protocol: 'buffer' },
          { name: 'Cool-down', detail: '', time: 5, type: 'cooldown', protocol: 'cooldown_standard' },
        ],
      },
      Thu: {
        total: '~1h 45m',
        blocks: [
          { name: 'Warm-up', detail: '', time: 15, type: 'warmup', protocol: 'warmup_standard' },
          { name: 'Board circuit', detail: '6 board problems V6–V8, 90s rest between, repeat circuit 2×', time: 65, type: 'climbing' },
          { name: 'Shoulder', detail: 'See training folder', time: 15, type: 'sc' },
          { name: 'Neck', detail: 'See training folder', time: 3, type: 'sc' },
          { name: 'Cool-down', detail: '', time: 5, type: 'cooldown', protocol: 'cooldown_standard' },
        ],
      },
      Sat: {
        total: '~1h 45m',
        blocks: [
          { name: 'Warm-up', detail: '', time: 15, type: 'warmup', protocol: 'warmup_standard' },
          { name: 'Long boulder simulation', detail: '5–6 attempts on 15–25 move circuit, 5 min rest between', time: 55, type: 'climbing' },
          { name: 'Wrist', detail: 'See training folder', time: 8, type: 'sc' },
          { name: 'Core + lower back', detail: 'See training folder', time: 15, type: 'sc' },
          { name: 'Cool-down', detail: '', time: 5, type: 'cooldown', protocol: 'cooldown_standard' },
        ],
      },
      Sun: {
        total: '~1h 45m',
        blocks: [
          { name: 'Warm-up', detail: '', time: 10, type: 'warmup', protocol: 'warmup_short' },
          { name: 'Easy climb OR rest', detail: '4×4s at easier grade if recovered', time: 35, type: 'climbing' },
          { name: 'Push + Pull', detail: 'See training folder', time: 25, type: 'sc' },
          { name: 'Legs', detail: 'See training folder', time: 12, type: 'sc' },
          { name: 'Fingers (no-hang density)', detail: '8 × 10s @ 70%, 90s rest', time: 12, type: 'fingers' },
          { name: 'Cool-down', detail: '', time: 5, type: 'cooldown', protocol: 'cooldown_standard' },
        ],
      },
    },
  },
  peak: {
    name: 'Peak',
    weeks: '12',
    totalWeeks: 1,
    color: '#8b5cf6',
    description: 'Send. Stop training. Express what you built.',
    progression: 'Maintenance only. No hangboard, no campus, no volume.',
    sessions: {
      Tue: {
        total: '~1h 55m',
        blocks: [
          { name: 'Warm-up', detail: '', time: 20, type: 'warmup', protocol: 'warmup_standard' },
          { name: 'Project session', detail: 'Actual project, 5–10 min rest between attempts', time: 85, type: 'climbing' },
          { name: 'Cool-down', detail: '', time: 10, type: 'cooldown', protocol: 'cooldown_peak' },
        ],
      },
      Thu: {
        total: '~1h 15m',
        blocks: [
          { name: 'Warm-up', detail: '', time: 10, type: 'warmup', protocol: 'warmup_short' },
          { name: 'Easy movement', detail: '15–20 boulders V2–V4, no projecting', time: 40, type: 'climbing' },
          { name: 'Shoulder (light)', detail: 'Band work only', time: 10, type: 'sc' },
          { name: 'Neck', detail: 'See training folder', time: 3, type: 'sc' },
          { name: 'Wrist', detail: 'See training folder', time: 5, type: 'sc' },
          { name: 'Cool-down', detail: '', time: 5, type: 'cooldown', protocol: 'cooldown_standard' },
        ],
      },
      Sat: {
        total: '~1h 50m',
        blocks: [
          { name: 'Warm-up', detail: '', time: 20, type: 'warmup', protocol: 'warmup_standard' },
          { name: 'Project session', detail: 'Same as Tue', time: 80, type: 'climbing' },
          { name: 'Core (light)', detail: 'See training folder', time: 5, type: 'sc' },
          { name: 'Cool-down', detail: '', time: 5, type: 'cooldown', protocol: 'cooldown_standard' },
        ],
      },
      Sun: {
        total: '~45m',
        blocks: [
          { name: 'Push + Pull (light)', detail: 'Maintenance only', time: 16, type: 'sc' },
          { name: 'Legs (light)', detail: 'See training folder', time: 8, type: 'sc' },
          { name: 'Mobility', detail: '', time: 15, type: 'cooldown', protocol: 'mobility_short' },
          { name: 'Cool-down', detail: '', time: 5, type: 'cooldown', protocol: 'cooldown_standard' },
        ],
      },
    },
  },
  travel: {
    name: 'Travel (Capacity-lite)',
    weeks: 'Travel',
    totalWeeks: 4,
    color: '#06b6d4',
    description: 'Reduced volume. Open hand only. Fingers compromised. Two climbing days/week.',
    progression: 'Fingers dictate progression. Two weeks symptom-free before normal loads.',
    sessions: {
      Tue: {
        total: '~1h 20m',
        blocks: [
          { name: 'Warm-up', detail: '', time: 15, type: 'warmup', protocol: 'warmup_standard' },
          { name: 'Climbing', detail: '20–30 boulders V2–V4, open hand and 3-finger drag ONLY', time: 50, type: 'climbing' },
          { name: 'Shoulder', detail: 'Band work', time: 10, type: 'sc' },
          { name: 'Cool-down', detail: '', time: 5, type: 'cooldown', protocol: 'cooldown_standard' },
        ],
      },
      Wed: {
        total: '~40m',
        blocks: [
          { name: 'Warm-up', detail: '', time: 8, type: 'warmup', protocol: 'warmup_short' },
          { name: 'Pull', detail: 'Pull-ups or rows', time: 10, type: 'sc' },
          { name: 'Push + lateral raises', detail: 'Push-ups + lat raises with water bottles', time: 10, type: 'sc' },
          { name: 'Legs', detail: 'Bulgarian split squats + single-leg RDL', time: 10, type: 'sc' },
          { name: 'Cool-down', detail: '', time: 5, type: 'cooldown', protocol: 'cooldown_standard' },
        ],
      },
      Sat: {
        total: '~1h 25m',
        blocks: [
          { name: 'Warm-up', detail: '', time: 15, type: 'warmup', protocol: 'warmup_standard' },
          { name: 'Climbing', detail: '20–30 boulders + skill drill', time: 50, type: 'climbing' },
          { name: 'Wrist', detail: 'Wrist curls with water bottle', time: 5, type: 'sc' },
          { name: 'Neck', detail: '4-direction isometrics', time: 3, type: 'sc' },
          { name: 'Core', detail: 'Plank + bird-dog + superman', time: 12, type: 'sc' },
          { name: 'Cool-down', detail: '', time: 5, type: 'cooldown', protocol: 'cooldown_standard' },
        ],
      },
    },
    daily: {
      name: 'Finger rehab (every day, including rest days)',
      detail: 'No-hangs 5 × 30–45s on 20mm edge half crimp @ 50–60% bodyweight, 1 min rest. Pain rule: 0–2/10 only.',
      time: 5,
    },
  },
};

const TYPE_COLORS = {
  warmup: '#fbbf24',
  climbing: '#10b981',
  fingers: '#ef4444',
  sc: '#3b82f6',
  skill: '#a78bfa',
  cooldown: '#9ca3af',
};

const TYPE_LABELS = {
  warmup: 'Warm-up',
  climbing: 'Climbing',
  fingers: 'Fingers',
  sc: 'S&C',
  skill: 'Skill',
  cooldown: 'Cool-down',
};

const DAYS_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ============================================================
// HELPERS
// ============================================================

const todayKey = () => new Date().toISOString().split('T')[0];
const dayOfWeek = (date) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];

function getBlockIntensity(block, phaseKey, day) {
  const key = `${block.name}|${phaseKey}|${day}`;
  if (BLOCK_INTENSITY[key]) return BLOCK_INTENSITY[key];
  if (block.type === 'climbing') return 'climbing_moderate';
  if (block.type === 'fingers') return 'fingers_moderate';
  if (block.type === 'sc' && /pull/i.test(block.name)) return 'pull_moderate';
  return block.type;
}

function calcPlannedLoad(session, phaseKey, day, weekProg) {
  if (!session) return 0;
  let load = 0;
  session.blocks.forEach(b => {
    const intensityBucket = getBlockIntensity(b, phaseKey, day);
    const weight = LOAD_WEIGHTS[intensityBucket] ?? LOAD_WEIGHTS[b.type] ?? 0.5;
    load += b.time * weight;
  });
  return Math.round(load * (weekProg?.volumeMult ?? 1) * (weekProg?.intensityMult ?? 1));
}

// One-time migration: move data from the old `send_` prefixed keys to plain keys.
(function migrateSendPrefix() {
  const keys = ['currentPhase','travelMode','phaseStartDate','sessions','fingerLog','lastExportTs',
    'backup_0','backup_1','backup_2','backup_3','backup_4'];
  keys.forEach(k => {
    const old = localStorage.getItem(`send_${k}`);
    if (old !== null && localStorage.getItem(k) === null) {
      localStorage.setItem(k, old);
      localStorage.removeItem(`send_${k}`);
    }
  });
})();

const storage = {
  set(key, value) { localStorage.setItem(key, value); },
  get(key) { return localStorage.getItem(key); },
  delete(key) { localStorage.removeItem(key); },
};

// Run schema migrations and stamp version
runMigrations(storage);

// ============================================================
// MAIN APP
// ============================================================

// Shared export helper used by both Today banner and Settings.
// Opens the JSON in a new tab so iOS users can Share → Save to Files.
async function shareOrOpenBlob(filename, blob) {
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: blob.type })] })) {
    const file = new File([blob], filename, { type: blob.type });
    await navigator.share({ files: [file], title: filename });
  } else {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}

function doExport(sessions, fingerLog) {
  const data = { sessions, fingerLog, exportedAt: new Date().toISOString() };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const filename = `climbing-backup-${new Date().toISOString().split('T')[0]}.json`;
  shareOrOpenBlob(filename, blob);
}

export default function ClimbingApp() {
  const [view, setView] = useState('today');
  const [currentPhase, setCurrentPhase] = useState('capacity');
  const [travelMode, setTravelMode] = useState(false);
  const [phaseStartDate, setPhaseStartDate] = useState(null);
  const [sessions, setSessions] = useState({});
  const [fingerLog, setFingerLog] = useState({});
  const [loading, setLoading] = useState(true);
  const [backupVersion, setBackupVersion] = useState(0);
  const [viewingDay, setViewingDay] = useState(null);
  const [logDate, setLogDate] = useState(null);
  const [returnView, setReturnView] = useState(null); // view to go back to after editing from History
  const [lastExportTs, setLastExportTs] = useState(null);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);

  useEffect(() => {
    try {
      const phase = storage.get('currentPhase');
      const travel = storage.get('travelMode');
      const startDate = storage.get('phaseStartDate');
      const sess = storage.get('sessions');
      const fingers = storage.get('fingerLog');
      const lastExp = storage.get('lastExportTs');

      if (phase) setCurrentPhase(phase);
      if (travel) setTravelMode(travel === 'true');
      if (startDate) setPhaseStartDate(startDate);
      if (fingers) setFingerLog(JSON.parse(fingers));
      if (lastExp) setLastExportTs(lastExp);

      // Load or pre-seed sessions
      if (sess && sess !== '{}') {
        setSessions(JSON.parse(sess));
      } else {
        // First launch — pre-seed 4 weeks of Capacity baseline for ACWR
        const seeded = generatePreseededSessions(startDate || null);
        setSessions(seeded);
        storage.set('sessions', JSON.stringify(seeded));
        writeBackupImmediate(seeded, {});
      }

      const hasAnyData = (sess && sess !== '{}') || (fingers && fingers !== '{}');
      const hasBackups = checkForBackups();
      if (!hasAnyData && !hasBackups) setShowRestorePrompt(true);
    } catch (e) { console.log('Load error', e); }
    setLoading(false);
  }, []);

  const checkForBackups = () => {
    for (let i = 0; i < 5; i++) {
      if (storage.get(`backup_${i}`)) return true;
    }
    return false;
  };

  const persistPhase = (phase) => {
    setCurrentPhase(phase);
    storage.set('currentPhase', phase);
  };
  const persistTravel = (mode) => {
    setTravelMode(mode);
    storage.set('travelMode', String(mode));
  };
  const persistStartDate = (date) => {
    setPhaseStartDate(date);
    storage.set('phaseStartDate', date);
  };
  const persistLastExport = (ts) => {
    setLastExportTs(ts);
    storage.set('lastExportTs', ts);
  };

  const writeBackupImmediate = (sessionsData, fingerData) => {
    try {
      for (let i = 4; i > 0; i--) {
        const prev = storage.get(`backup_${i - 1}`);
        if (prev) storage.set(`backup_${i}`, prev);
      }
      storage.set('backup_0', JSON.stringify({
        ts: new Date().toISOString(),
        sessions: sessionsData,
        fingerLog: fingerData,
      }));
    } catch (e) { console.log('Backup failed', e); }
  };

  const writeBackup = (sessionsData, fingerData) => {
    writeBackupImmediate(sessionsData, fingerData);
    setBackupVersion(v => v + 1);
  };

  const persistSessions = (next) => {
    setSessions(next);
    storage.set('sessions', JSON.stringify(next));
    writeBackup(next, fingerLog);
  };
  const persistFingers = (next) => {
    setFingerLog(next);
    storage.set('fingerLog', JSON.stringify(next));
    writeBackup(sessions, next);
  };

  const activePhaseKey = travelMode ? 'travel' : currentPhase;
  const activePhase = PHASES[activePhaseKey];
  const currentWeek = getCurrentWeek(phaseStartDate, activePhase.totalWeeks);
  const weekProg = WEEK_PROGRESSION[activePhaseKey]?.[currentWeek - 1] ?? WEEK_PROGRESSION[activePhaseKey]?.[0];

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <style>{globalCSS}</style>

      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.appTitle}>SEND</div>
          <div style={{ ...styles.phaseBadge, background: activePhase.color }}>
            {activePhase.name} · W{currentWeek}/{activePhase.totalWeeks}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{
              ...styles.travelToggleHeader,
              background: travelMode ? '#06b6d4' : '#1f2937',
              color: travelMode ? '#000' : '#9ca3af',
            }}
            onClick={() => persistTravel(!travelMode)}
            title={travelMode ? 'Travel mode ON' : 'Travel mode OFF'}
          >
            <Plane size={14} />
          </button>
          <button style={styles.settingsBtn} onClick={() => setView('settings')}>⚙</button>
        </div>
      </header>

      <main style={styles.main}>
        {view === 'today' && (
          <TodayView
            phase={activePhase}
            phaseKey={activePhaseKey}
            weekProg={weekProg}
            currentWeek={currentWeek}
            sessions={sessions}
            fingerLog={fingerLog}
            setView={setView}
            lastExportTs={lastExportTs}
            onExport={() => {
              doExport(sessions, fingerLog);
              persistLastExport(new Date().toISOString());
            }}
          />
        )}
        {view === 'week' && (
          <WeekView
            phase={activePhase}
            phaseKey={activePhaseKey}
            weekProg={weekProg}
            currentWeek={currentWeek}
            sessions={sessions}
            onSelectDay={(d) => setViewingDay(d)}
          />
        )}
        {view === 'log' && (
          <LogView
            sessions={sessions}
            onUpdate={persistSessions}
            phase={activePhase}
            phaseKey={activePhaseKey}
            weekProg={weekProg}
            initialDate={logDate}
            onClearInitialDate={() => setLogDate(null)}
            onBack={returnView ? () => { setView(returnView); setReturnView(null); } : null}
          />
        )}
        {view === 'acwr' && (
          <HistoryView
            sessions={sessions}
            fingerLog={fingerLog}
            onEditSession={(date) => { setLogDate(date); setView('log'); setReturnView('acwr'); }}
          />
        )}
        {view === 'fingers' && (
          <FingersView fingerLog={fingerLog} onUpdate={persistFingers} />
        )}
        {view === 'settings' && (
          <SettingsView
            currentPhase={currentPhase}
            travelMode={travelMode}
            phaseStartDate={phaseStartDate}
            onPhaseChange={persistPhase}
            onTravelToggle={persistTravel}
            onStartDateChange={persistStartDate}
            sessions={sessions}
            fingerLog={fingerLog}
            onImportSessions={persistSessions}
            onImportFingers={persistFingers}
            backupVersion={backupVersion}
            lastExportTs={lastExportTs}
            onMarkExported={() => persistLastExport(new Date().toISOString())}
          />
        )}
        {/* Always mounted so timer survives tab switches */}
        <div style={{ display: view === 'utils' ? 'block' : 'none' }}>
          <UtilsView />
        </div>
      </main>

      <nav style={styles.nav}>
        <NavButton icon={<Calendar size={18} />} label="Today" active={view === 'today'} onClick={() => setView('today')} />
        <NavButton icon={<Activity size={18} />} label="Week" active={view === 'week'} onClick={() => setView('week')} />
        <NavButton icon={<CheckCircle2 size={18} />} label="Log" active={view === 'log'} onClick={() => setView('log')} />
        <NavButton icon={<TrendingUp size={18} />} label="History" active={view === 'acwr'} onClick={() => setView('acwr')} />
        <NavButton icon={<AlertCircle size={18} />} label="Fingers" active={view === 'fingers'} onClick={() => setView('fingers')} />
        <NavButton icon={<Timer size={18} />} label="Tools" active={view === 'utils'} onClick={() => setView('utils')} />
      </nav>

      {viewingDay && (
        <DayDetailModal
          day={viewingDay}
          phase={activePhase}
          phaseKey={activePhaseKey}
          weekProg={weekProg}
          onClose={() => setViewingDay(null)}
        />
      )}

      {showRestorePrompt && (
        <RestorePromptModal
          onClose={() => setShowRestorePrompt(false)}
          onRestore={(parsed) => {
            if (parsed.sessions) persistSessions(parsed.sessions);
            if (parsed.fingerLog) persistFingers(parsed.fingerLog);
            setShowRestorePrompt(false);
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// TODAY
// ============================================================

function TodayView({ phase, phaseKey, weekProg, currentWeek, sessions, fingerLog, setView, lastExportTs, onExport }) {
  const today = new Date();
  const day = dayOfWeek(today);
  const key = todayKey();
  const session = phase.sessions[day];
  const logged = sessions[key];

  // Export banner state
  const sessionCount = Object.keys(sessions).length;
  const hasUnexportedData = sessionCount > 0 || Object.keys(fingerLog).length > 0;
  const daysSinceExport = lastExportTs
    ? Math.floor((Date.now() - new Date(lastExportTs).getTime()) / (24 * 60 * 60 * 1000))
    : null;
  // Show banner if: there's data AND (never exported OR exported >3 days ago)
  const showExportBanner = hasUnexportedData && (lastExportTs === null || daysSinceExport >= 3);

  const ExportBanner = () => {
    if (!showExportBanner) return null;
    return (
      <div style={styles.exportBanner}>
        <div style={styles.exportBannerText}>
          <strong>⚠ Backup your data</strong>
          <div style={styles.exportBannerSubtle}>
            {lastExportTs === null
              ? 'You have never exported. Save a JSON copy now in case storage is cleared.'
              : `Last exported ${daysSinceExport} days ago. Update your backup.`}
          </div>
        </div>
        <button style={styles.exportBannerBtn} onClick={onExport}>
          Export now
        </button>
      </div>
    );
  };

  if (!session) {
    return (
      <div>
        <ExportBanner />
        <div style={styles.restDay}>
          <div style={styles.restEmoji}>🛌</div>
          <h2 style={styles.h1}>Rest day</h2>
          <p style={styles.subtle}>Today is {day}. Recovery is training.</p>

          <button
            style={{ ...styles.btnSecondary, marginTop: 20, width: '100%' }}
            onClick={() => setView('log')}
          >
            Add a custom session anyway
          </button>

          {phase.daily && (
            <div style={{ ...styles.card, marginTop: 20, textAlign: 'left' }}>
              <h3 style={styles.h3}>{phase.daily.name}</h3>
              <p style={styles.subtle}>{phase.daily.detail}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const totalMin = session.blocks.reduce((s, b) => s + b.time, 0);
  const plannedLoad = calcPlannedLoad(session, phaseKey, day, weekProg);

  return (
    <div>
      <ExportBanner />
      <div style={styles.todayHeader}>
        <div>
          <div style={styles.todayDay}>{day} · {today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
          <h1 style={styles.h1}>Today's Session</h1>
        </div>
        <div style={styles.chipStack}>
          <div style={styles.timeChip}>{totalMin}m</div>
          <div style={styles.loadChip}>load {plannedLoad}</div>
        </div>
      </div>

      <p style={styles.phaseDesc}>{phase.description}</p>

      {weekProg && (
        <div style={styles.weekProgBanner}>
          <strong>Week {currentWeek}:</strong> {weekProg.note}
          <div style={styles.weekProgMath}>
            volume ×{weekProg.volumeMult.toFixed(2)} · intensity ×{weekProg.intensityMult.toFixed(2)}
          </div>
        </div>
      )}

      <div style={styles.blocks}>
        {session.blocks.map((b, i) => (
          <BlockCard key={i} block={b} weekProg={weekProg} />
        ))}
      </div>

      <div style={styles.actionBar}>
        {logged ? (
          <button style={styles.btnSecondary} onClick={() => setView('log')}>
            <CheckCircle2 size={18} /> Logged · Edit
          </button>
        ) : (
          <button style={styles.btnPrimary} onClick={() => setView('log')}>
            Log this session <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

function BlockCard({ block, weekProg }) {
  const [open, setOpen] = useState(false);
  const color = TYPE_COLORS[block.type];
  const hasProtocol = !!block.protocol && !!PROTOCOLS[block.protocol];
  const scWorkout = SC_WORKOUTS[block.name];
  const isExpandable = hasProtocol || !!scWorkout;
  const scaledTime = (weekProg && block.type !== 'warmup' && block.type !== 'cooldown')
    ? Math.round(block.time * weekProg.volumeMult)
    : block.time;
  const scaledNote = scaledTime !== block.time ? ` (was ${block.time}m at base)` : '';

  return (
    <div
      style={{ ...styles.blockCard, borderLeftColor: color, cursor: isExpandable ? 'pointer' : 'default' }}
      onClick={() => isExpandable && setOpen(!open)}
    >
      <div style={styles.blockHeader}>
        <div style={styles.blockName}>{block.name}</div>
        <div style={styles.blockRight}>
          <div style={styles.blockTime}>{scaledTime}m</div>
          {isExpandable && (
            <ChevronDown
              size={16}
              style={{ color: '#9ca3af', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            />
          )}
        </div>
      </div>
      {block.detail && <div style={styles.blockDetail}>{block.detail}{scaledNote}</div>}
      <div style={{ ...styles.blockType, color }}>{TYPE_LABELS[block.type]}</div>

      {hasProtocol && open && <ProtocolExpanded protocol={PROTOCOLS[block.protocol]} />}
      {scWorkout && open && <SCWorkoutExpanded workout={scWorkout} />}
    </div>
  );
}

function SCWorkoutExpanded({ workout }) {
  return (
    <div style={styles.protocolWrap}>
      <div style={styles.protocolName}>{workout.title}</div>
      {workout.note && <div style={styles.protocolNote}>{workout.note}</div>}
      {workout.sections.map((section, i) => (
        <div key={i} style={{ marginTop: 10 }}>
          <div style={styles.scSectionHeading}>{section.heading}</div>
          {section.items.map((item, j) => (
            <div key={j} style={styles.scSectionItem}>· {item}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ProtocolExpanded({ protocol }) {
  return (
    <div style={styles.protocolWrap}>
      <div style={styles.protocolName}>{protocol.name}</div>
      {protocol.note && <div style={styles.protocolNote}>⚠ {protocol.note}</div>}
      <div style={styles.protocolSteps}>
        {protocol.steps.map((step, i) => (
          <div key={i} style={styles.protocolStep}>
            <div style={styles.protocolStepTime}>{step.t}</div>
            <div style={styles.protocolStepWhat}>{step.what}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// WEEK
// ============================================================

function WeekView({ phase, phaseKey, weekProg, currentWeek, sessions, onSelectDay }) {
  return (
    <div>
      <h1 style={styles.h1}>{phase.name}</h1>
      <p style={styles.subtle}>Week {currentWeek} of {phase.totalWeeks} · {phase.weeks}</p>
      <p style={styles.phaseDesc}>{phase.description}</p>
      <div style={styles.progressionNote}>📊 {phase.progression}</div>
      {weekProg && (
        <div style={styles.weekProgBanner}>
          <strong>This week:</strong> {weekProg.note}
        </div>
      )}

      <p style={{ ...styles.subtle, fontSize: 12, marginTop: 20, marginBottom: 8 }}>
        Tap any day to view its session.
      </p>

      <div style={styles.weekGrid}>
        {DAYS_ORDER.map(d => {
          const s = phase.sessions[d];
          if (!s) {
            return (
              <div key={d} style={{ ...styles.weekDay, opacity: 0.5 }}>
                <div style={styles.weekDayHeader}>
                  <div style={styles.weekDayName}>{d}</div>
                </div>
                <div style={styles.weekDayLabel}>Rest day</div>
              </div>
            );
          }
          const totalMin = s.blocks.reduce((sum, b) => sum + b.time, 0);
          const plannedLoad = calcPlannedLoad(s, phaseKey, d, weekProg);
          const climbingType = s.blocks.find(b => b.type === 'climbing');
          return (
            <button
              key={d}
              style={styles.weekDayBtn}
              onClick={() => onSelectDay(d)}
            >
              <div style={styles.weekDayHeader}>
                <div style={styles.weekDayName}>{d}</div>
                <div style={styles.weekDayMeta}>
                  <span style={styles.weekDayTime}>{totalMin}m</span>
                  <span style={styles.weekDayLoad}>L{plannedLoad}</span>
                </div>
              </div>
              <div style={styles.weekDayLabel}>
                {climbingType ? climbingType.name : 'Recovery'}
              </div>
              <div style={styles.miniBlocks}>
                {s.blocks.filter(b => b.type !== 'warmup' && b.type !== 'cooldown').map((b, i) => (
                  <div
                    key={i}
                    style={{ ...styles.miniBlock, background: TYPE_COLORS[b.type] }}
                    title={b.name}
                  />
                ))}
              </div>
              <div style={styles.weekDayChevron}>
                <ChevronRight size={14} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayDetailModal({ day, phase, phaseKey, weekProg, onClose }) {
  const session = phase.sessions[day];
  const today = dayOfWeek(new Date());
  const isToday = day === today;

  if (!session) {
    return (
      <div style={styles.modalOverlay} onClick={onClose}>
        <div style={styles.modal} onClick={e => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <div>
              <div style={styles.modalDay}>{day}</div>
              <div style={styles.modalTitle}>Rest day</div>
            </div>
            <button style={styles.modalClose} onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          <p style={styles.subtle}>No session scheduled. Recovery is training.</p>
        </div>
      </div>
    );
  }

  const totalMin = session.blocks.reduce((s, b) => s + b.time, 0);
  const plannedLoad = calcPlannedLoad(session, phaseKey, day, weekProg);

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.modalDay}>
              {day} {isToday && <span style={styles.todayPill}>TODAY</span>}
            </div>
            <div style={styles.modalTitle}>{totalMin} min · load {plannedLoad}</div>
          </div>
          <button style={styles.modalClose} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {!isToday && (
          <div style={styles.peekBanner}>
            👀 Peek mode — logging available only on today's session
          </div>
        )}

        <div style={styles.blocks}>
          {session.blocks.map((b, i) => (
            <BlockCard key={i} block={b} weekProg={weekProg} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// LOG
// ============================================================

function LogView({ sessions, onUpdate, phase, phaseKey, weekProg, initialDate, onClearInitialDate, onBack }) {
  // Selected date — defaults to today, can be changed via picker.
  const [selectedDate, setSelectedDate] = useState(initialDate || todayKey());

  // Clear the initialDate prop after first use so navigating away/back resets to today.
  useEffect(() => {
    if (initialDate && onClearInitialDate) onClearInitialDate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve day-of-week from selected date (local parse to avoid TZ drift)
  const [y, m, d] = selectedDate.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const day = dayOfWeek(dateObj);
  const session = phase.sessions[day];
  const isToday = selectedDate === todayKey();
  const isPast = new Date(selectedDate) < new Date(todayKey());
  const isFuture = new Date(selectedDate) > new Date(todayKey());

  // Build form: from existing log if present, else from plan, else empty
  const buildForm = (dateKey) => {
    const existing = sessions[dateKey];
    const [yy, mm, dd] = dateKey.split('-').map(Number);
    const dt = new Date(yy, mm - 1, dd);
    const dn = dayOfWeek(dt);
    const plan = phase.sessions[dn];

    if (existing) {
      // Use existing log; if it has blocks, keep them. If legacy (no blocks), start empty.
      if (existing.blocks) return existing;
      return { ...existing, date: dateKey, day: dn, blocks: [] };
    }

    if (plan) {
      return {
        date: dateKey,
        day: dn,
        blocks: plan.blocks
          .filter(b => b.type !== 'warmup' && b.type !== 'cooldown')
          .map(b => ({
            name: b.name,
            type: b.type,
            intensity: getBlockIntensity(b, phaseKey, dn),
            plannedMin: Math.round(b.time * (weekProg?.volumeMult ?? 1)),
            actualMin: Math.round(b.time * (weekProg?.volumeMult ?? 1)),
            planned: true,
          })),
        rpe: 7,
        notes: '',
        completed: false,
      };
    }

    return { date: dateKey, day: dn, blocks: [], rpe: 7, notes: '', completed: false };
  };

  const [form, setForm] = useState(() => buildForm(selectedDate));

  // Rebuild form whenever selected date changes
  useEffect(() => {
    setForm(buildForm(selectedDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const updateBlock = (idx, patch) => {
    if (!form) return;
    const blocks = [...form.blocks];
    blocks[idx] = { ...blocks[idx], ...patch };
    setForm({ ...form, blocks });
  };

  const removeBlock = (idx) => {
    if (!form) return;
    setForm({ ...form, blocks: form.blocks.filter((_, i) => i !== idx) });
  };

  const addBlock = (type) => {
    if (!form) return;
    const defaults = {
      climbing: { name: 'Extra climbing', type: 'climbing', intensity: 'climbing_moderate', actualMin: 30 },
      fingers: { name: 'Extra fingers', type: 'fingers', intensity: 'fingers_moderate', actualMin: 10 },
      pull: { name: 'Pull', type: 'sc', intensity: 'pull_moderate', actualMin: 15 },
      sc: { name: 'Extra S&C', type: 'sc', intensity: 'sc', actualMin: 15 },
      skill: { name: 'Skill work', type: 'skill', intensity: 'skill', actualMin: 15 },
    };
    setForm({ ...form, blocks: [...form.blocks, { ...defaults[type], plannedMin: 0, planned: false }] });
  };

  const computeLoad = () => {
    if (!form) return 0;
    let total = 0;
    (form.blocks || []).forEach(b => {
      const w = LOAD_WEIGHTS[b.intensity] ?? 0.5;
      total += (b.actualMin || 0) * w;
    });
    return Math.round(total * ((form.rpe || 7) / 7));
  };

  const save = () => {
    if (!form) return;
    onUpdate({ ...sessions, [selectedDate]: { ...form, completed: true, computedLoad: computeLoad() } });
  };

  const deleteSession = () => {
    if (!confirm('Delete this session log? This cannot be undone.')) return;
    const next = { ...sessions };
    delete next[selectedDate];
    onUpdate(next);
    setForm(buildForm(selectedDate)); // reload as empty/plan-default
  };

  const isLogged = !!sessions[selectedDate];
  const currentLoad = computeLoad();
  const plannedCount = (form?.blocks || []).filter(b => b.planned).length;
  const unplannedCount = (form?.blocks || []).filter(b => !b.planned).length;

  // Convert selectedDate (YYYY-MM-DD) to readable label
  const dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // Quick-pick dates: yesterday, today, 2-3 days ago
  const quickPickDates = [];
  for (let offset = 0; offset <= 3; offset++) {
    const dt = new Date();
    dt.setDate(dt.getDate() - offset);
    const k = dt.toISOString().split('T')[0];
    const label = offset === 0 ? 'Today' : offset === 1 ? 'Yesterday' : dt.toLocaleDateString('en-US', { weekday: 'short' });
    quickPickDates.push({ key: k, label });
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        {onBack && (
          <button onClick={onBack} style={styles.backBtn}>
            <ChevronLeft size={18} /> Back
          </button>
        )}
        <h1 style={{ ...styles.h1, margin: 0 }}>Log</h1>
      </div>
      <p style={styles.subtle}>
        {isToday ? 'Today' : isPast ? 'Past date' : 'Future date'} · {dateLabel}
        {isLogged && <span style={styles.loggedBadge}> · LOGGED</span>}
      </p>

      {/* Date picker */}
      <div style={styles.card}>
        <label style={styles.label}>Date</label>
        <input
          type="date"
          value={selectedDate}
          max={todayKey()}
          onChange={e => setSelectedDate(e.target.value)}
          style={styles.dateInput}
        />
        <div style={styles.quickPickRow}>
          {quickPickDates.map(qp => (
            <button
              key={qp.key}
              style={{
                ...styles.quickPickBtn,
                background: selectedDate === qp.key ? '#10b981' : '#1f2937',
                color: selectedDate === qp.key ? '#000' : '#9ca3af',
              }}
              onClick={() => setSelectedDate(qp.key)}
            >
              {qp.label}
            </button>
          ))}
        </div>
      </div>

      {!isToday && (
        <div style={styles.peekBanner}>
          {isPast
            ? `📝 Editing log for ${dateLabel}. Plan values from ${phase.name} phase (${day}).`
            : `⚠ Logging a future date — usually you only log days you've completed.`}
        </div>
      )}

      {/* Load preview */}
      <div style={styles.loadPreview}>
        <div>
          <div style={styles.loadPreviewLabel}>SESSION LOAD</div>
          <div style={styles.loadPreviewValue}>{currentLoad}</div>
        </div>
        <div style={styles.loadPreviewHelp}>
          <Info size={14} />
          <span>minutes × intensity × RPE/7</span>
        </div>
      </div>

      {/* Blocks */}
      {(form?.blocks || []).length > 0 ? (
        <div style={styles.card}>
          <div style={styles.logBlockHeader}>
            <label style={{ ...styles.label, marginBottom: 0 }}>What you did</label>
            <div style={styles.logBlockCounts}>
              {plannedCount > 0 && <span style={styles.countPill}>{plannedCount} planned</span>}
              {unplannedCount > 0 && <span style={{...styles.countPill, background: '#422006', color: '#fde68a'}}>{unplannedCount} added</span>}
            </div>
          </div>
          <p style={styles.helperText}>
            Planned blocks are pre-filled. Set unused ones to 0 or remove them. Add anything else you did below.
          </p>
          {form.blocks.map((b, i) => (
            <BlockLogRow
              key={i}
              block={b}
              onChange={patch => updateBlock(i, patch)}
              onRemove={() => removeBlock(i)}
            />
          ))}

          <AddBlockCluster onAdd={addBlock} />
        </div>
      ) : (
        <div style={styles.card}>
          <p style={styles.subtle}>
            No planned blocks for this day. Add what you did:
          </p>
          <AddBlockCluster onAdd={addBlock} />
        </div>
      )}

      {/* RPE */}
      <div style={styles.card}>
        <label style={styles.label}>How hard did this session feel? (RPE 1–10)</label>
        <p style={styles.helperText}>
          Rate the whole session. 7 is "moderately hard." 10 is "I have nothing left."
        </p>
        <div style={styles.rpeRow}>
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button
              key={n}
              style={{ ...styles.rpeBtn, background: form?.rpe === n ? rpeColor(n) : '#1f2937', color: form?.rpe === n ? '#000' : '#fff' }}
              onClick={() => setForm({ ...form, rpe: n })}
            >
              {n}
            </button>
          ))}
        </div>
        <div style={styles.rpeHint}>
          {form?.rpe <= 4 && 'Easy — recovery'}
          {form?.rpe >= 5 && form?.rpe <= 6 && 'Moderate'}
          {form?.rpe >= 7 && form?.rpe <= 8 && 'Hard'}
          {form?.rpe >= 9 && 'Max effort'}
        </div>
      </div>

      {/* Notes */}
      <div style={styles.card}>
        <label style={styles.label}>Notes</label>
        <textarea
          style={styles.textarea}
          value={form?.notes || ''}
          onChange={e => setForm({ ...form, notes: e.target.value })}
          placeholder="Sends, tweaks, energy, conditions, sleep..."
        />
      </div>

      {/* Action bar */}
      <div style={styles.actionBar}>
        <button style={styles.btnPrimary} onClick={save}>
          <Save size={18} /> {isLogged ? 'Update' : 'Save'}
        </button>
        {isLogged && (
          <button style={styles.btnDanger} onClick={deleteSession}>
            <Trash2 size={16} /> Delete
          </button>
        )}
      </div>
    </div>
  );
}

function AddBlockCluster({ onAdd }) {
  return (
    <div style={styles.addBlockCluster}>
      <p style={{ ...styles.helperText, marginTop: 12, marginBottom: 6 }}>Add block:</p>
      <div style={styles.addBlockButtons}>
        <button style={{...styles.addBlockBtn, borderColor: TYPE_COLORS.climbing}} onClick={() => onAdd('climbing')}>
          <Plus size={14} /> Climbing
        </button>
        <button style={{...styles.addBlockBtn, borderColor: TYPE_COLORS.fingers}} onClick={() => onAdd('fingers')}>
          <Plus size={14} /> Fingers
        </button>
        <button style={{...styles.addBlockBtn, borderColor: TYPE_COLORS.sc}} onClick={() => onAdd('pull')}>
          <Plus size={14} /> Pull
        </button>
        <button style={{...styles.addBlockBtn, borderColor: TYPE_COLORS.sc}} onClick={() => onAdd('sc')}>
          <Plus size={14} /> S&C
        </button>
        <button style={{...styles.addBlockBtn, borderColor: TYPE_COLORS.skill}} onClick={() => onAdd('skill')}>
          <Plus size={14} /> Skill
        </button>
      </div>
    </div>
  );
}

function BlockLogRow({ block, onChange, onRemove }) {
  const [editingName, setEditingName] = useState(false);
  const [showIntensity, setShowIntensity] = useState(false);
  const color = TYPE_COLORS[block.type] || '#9ca3af';
  const weight = LOAD_WEIGHTS[block.intensity]?.toFixed(1) || '0.5';

  // Intensity options for this block — pull gets its own when name matches
  const isPullBlock = block.type === 'sc' && /pull/i.test(block.name);
  const intensityOptions = {
    climbing: ['climbing_easy', 'climbing_moderate', 'climbing_hard', 'climbing_max'],
    fingers: ['fingers_low', 'fingers_moderate', 'fingers_high'],
    sc: isPullBlock
      ? ['pull_light', 'pull_moderate', 'pull_heavy', 'sc']
      : ['sc'],
    skill: ['skill'],
  };
  const opts = intensityOptions[block.type] || [block.intensity];

  return (
    <div style={{ ...styles.blockLogRow, borderLeftColor: color, opacity: block.actualMin === 0 ? 0.5 : 1 }}>
      <div style={styles.blockLogTopRow}>
        <div style={styles.blockLogNameWrap}>
          {editingName ? (
            <input
              autoFocus
              type="text"
              value={block.name}
              onChange={e => onChange({ name: e.target.value })}
              onBlur={() => setEditingName(false)}
              onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
              style={styles.blockLogNameInput}
            />
          ) : (
            <div
              style={styles.blockLogName}
              onClick={() => !block.planned && setEditingName(true)}
              title={block.planned ? 'Planned block' : 'Tap to rename'}
            >
              {block.name}
              {!block.planned && <span style={styles.addedBadge}>added</span>}
            </div>
          )}
          <button
            style={styles.intensityChip}
            onClick={() => setShowIntensity(!showIntensity)}
          >
            {block.intensity.replace(/_/g, ' ')} · ×{weight}
            <ChevronDown size={10} style={{ marginLeft: 4, transform: showIntensity ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </button>
        </div>
        <button style={styles.removeBlockBtn} onClick={onRemove} title="Remove block">
          <X size={14} />
        </button>
      </div>

      {showIntensity && (
        <div style={styles.intensityPicker}>
          {opts.map(opt => (
            <button
              key={opt}
              style={{
                ...styles.intensityOption,
                background: block.intensity === opt ? color : '#1f2937',
                color: block.intensity === opt ? '#000' : '#d1d5db',
              }}
              onClick={() => { onChange({ intensity: opt }); setShowIntensity(false); }}
            >
              <div style={{ fontWeight: 700 }}>{opt.replace(/_/g, ' ')}</div>
              <div style={{ fontSize: 10, opacity: 0.7 }}>weight ×{LOAD_WEIGHTS[opt]?.toFixed(1) || '0.5'}</div>
            </button>
          ))}
        </div>
      )}

      <div style={styles.blockLogControls}>
        <button style={styles.smallBtn} onClick={() => onChange({ actualMin: Math.max(0, (block.actualMin || 0) - 5) })}>
          <Minus size={14} />
        </button>
        <input
          type="number"
          value={block.actualMin || 0}
          onChange={e => onChange({ actualMin: parseInt(e.target.value) || 0 })}
          style={styles.smallInput}
        />
        <button style={styles.smallBtn} onClick={() => onChange({ actualMin: (block.actualMin || 0) + 5 })}>
          <Plus size={14} />
        </button>
        <span style={styles.minLabel}>min</span>
        {block.planned && block.plannedMin > 0 && block.actualMin !== block.plannedMin && (
          <span style={styles.diffNote}>
            planned: {block.plannedMin}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ADD CUSTOM SESSION MODAL
// ============================================================

function RestorePromptModal({ onClose, onRestore }) {
  const [status, setStatus] = useState(null);

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed.sessions && !parsed.fingerLog) {
          setStatus({ ok: false, msg: 'File does not look like a Send backup.' });
          return;
        }
        const sCount = Object.keys(parsed.sessions || {}).length;
        const fCount = Object.keys(parsed.fingerLog || {}).length;
        setStatus({ ok: true, msg: `Loaded ${sCount} sessions and ${fCount} finger entries. Confirm to restore.`, parsed });
      } catch (err) {
        setStatus({ ok: false, msg: `Parse error: ${err.message}` });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.modalDay}>STORAGE EMPTY</div>
            <div style={styles.modalTitle}>Restore from backup?</div>
          </div>
          <button style={styles.modalClose} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={styles.warning}>
          <AlertCircle size={20} />
          <div>
            <strong>No data found in storage</strong>
            <div>If you have a backup JSON file, you can restore it now. Otherwise tap Close and start fresh.</div>
          </div>
        </div>

        <div style={{ ...styles.card, marginTop: 12 }}>
          <label style={{ ...styles.btnSecondary, width: '100%', cursor: 'pointer', display: 'flex' }}>
            📤 Choose backup file…
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFile}
              style={{ display: 'none' }}
            />
          </label>

          {status && (
            <div style={status.ok ? styles.importOk : styles.importErr}>
              {status.ok ? '✓' : '✗'} {status.msg}
            </div>
          )}

          {status?.ok && status.parsed && (
            <button
              style={{ ...styles.btnPrimary, width: '100%', marginTop: 12 }}
              onClick={() => onRestore(status.parsed)}
            >
              <Save size={18} /> Restore now
            </button>
          )}
        </div>

        <button
          style={{ ...styles.btnSecondary, width: '100%', marginTop: 12 }}
          onClick={onClose}
        >
          Start fresh
        </button>
      </div>
    </div>
  );
}

function AddSessionModal({ onClose, onSave, existingDates }) {
  const [date, setDate] = useState(todayKey());
  const [climbingMin, setClimbingMin] = useState(0);
  const [climbingIntensity, setClimbingIntensity] = useState('climbing_moderate');
  const [fingerMin, setFingerMin] = useState(0);
  const [fingerIntensity, setFingerIntensity] = useState('fingers_moderate');
  const [pullMin, setPullMin] = useState(0);
  const [pullIntensity, setPullIntensity] = useState('pull_moderate');
  const [scMin, setScMin] = useState(0);
  const [rpe, setRpe] = useState(7);
  const [notes, setNotes] = useState('');

  const exists = existingDates.includes(date);

  const computeLoad = () => {
    const climb = climbingMin * (LOAD_WEIGHTS[climbingIntensity] ?? 1);
    const fing = fingerMin * (LOAD_WEIGHTS[fingerIntensity] ?? 1);
    const pull = pullMin * (LOAD_WEIGHTS[pullIntensity] ?? 1.2);
    const sc = scMin * LOAD_WEIGHTS.sc;
    return Math.round((climb + fing + pull + sc) * (rpe / 7));
  };

  const save = () => {
    const blocks = [];
    if (climbingMin > 0) blocks.push({ name: 'Climbing', type: 'climbing', intensity: climbingIntensity, actualMin: climbingMin, plannedMin: climbingMin });
    if (fingerMin > 0) blocks.push({ name: 'Fingers', type: 'fingers', intensity: fingerIntensity, actualMin: fingerMin, plannedMin: fingerMin });
    if (pullMin > 0) blocks.push({ name: 'Pull', type: 'sc', intensity: pullIntensity, actualMin: pullMin, plannedMin: pullMin });
    if (scMin > 0) blocks.push({ name: 'Other S&C', type: 'sc', intensity: 'sc', actualMin: scMin, plannedMin: scMin });
    const d = new Date(date);
    const day = dayOfWeek(d);
    onSave({
      date,
      day,
      blocks,
      rpe,
      notes,
      completed: true,
      computedLoad: computeLoad(),
      isCustom: true,
    });
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.modalDay}>CUSTOM</div>
            <div style={styles.modalTitle}>Add session</div>
          </div>
          <button style={styles.modalClose} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={styles.card}>
          <label style={styles.label}>Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={styles.dateInput}
          />
          {exists && (
            <div style={styles.warnInline}>
              ⚠ Session already exists for this date — saving will overwrite.
            </div>
          )}
        </div>

        <div style={styles.card}>
          <label style={styles.label}>Climbing</label>
          <div style={styles.numberRow}>
            <button style={styles.numBtn} onClick={() => setClimbingMin(Math.max(0, climbingMin - 5))}><Minus size={20} /></button>
            <input type="number" value={climbingMin} onChange={e => setClimbingMin(parseInt(e.target.value) || 0)} style={styles.numInput} />
            <button style={styles.numBtn} onClick={() => setClimbingMin(climbingMin + 5)}><Plus size={20} /></button>
          </div>
          <select style={styles.select} value={climbingIntensity} onChange={e => setClimbingIntensity(e.target.value)}>
            <option value="climbing_easy">Easy (V0–V4 volume, RPE 5–6) · ×0.6</option>
            <option value="climbing_moderate">Moderate (4×4s, V6–V8 circuits) · ×1.0</option>
            <option value="climbing_hard">Hard (limit V8+, projects) · ×1.5</option>
            <option value="climbing_max">Max (campus, dynos, max moves) · ×1.7</option>
          </select>
        </div>

        <div style={styles.card}>
          <label style={styles.label}>Fingers</label>
          <div style={styles.numberRow}>
            <button style={styles.numBtn} onClick={() => setFingerMin(Math.max(0, fingerMin - 1))}><Minus size={20} /></button>
            <input type="number" value={fingerMin} onChange={e => setFingerMin(parseInt(e.target.value) || 0)} style={styles.numInput} />
            <button style={styles.numBtn} onClick={() => setFingerMin(fingerMin + 1)}><Plus size={20} /></button>
          </div>
          <select style={styles.select} value={fingerIntensity} onChange={e => setFingerIntensity(e.target.value)}>
            <option value="fingers_low">Low (no-hangs &lt;70%) · ×0.7</option>
            <option value="fingers_moderate">Moderate (repeaters 70–80%) · ×1.2</option>
            <option value="fingers_high">High (max hangs 90%+, min-edge) · ×2.2</option>
          </select>
        </div>

        <div style={styles.card}>
          <label style={styles.label}>Pull (overlaps with climbing recovery)</label>
          <div style={styles.numberRow}>
            <button style={styles.numBtn} onClick={() => setPullMin(Math.max(0, pullMin - 5))}><Minus size={20} /></button>
            <input type="number" value={pullMin} onChange={e => setPullMin(parseInt(e.target.value) || 0)} style={styles.numInput} />
            <button style={styles.numBtn} onClick={() => setPullMin(pullMin + 5)}><Plus size={20} /></button>
          </div>
          <select style={styles.select} value={pullIntensity} onChange={e => setPullIntensity(e.target.value)}>
            <option value="pull_light">Light (bodyweight pull-ups/rows) · ×0.8</option>
            <option value="pull_moderate">Moderate (weighted 70–80%, 3×8) · ×1.2</option>
            <option value="pull_heavy">Heavy (5×3 @ 85%+, explosive/plyo) · ×1.6</option>
          </select>
        </div>

        <div style={styles.card}>
          <label style={styles.label}>Other S&C (push/legs/core/wrist/neck)</label>
          <div style={styles.numberRow}>
            <button style={styles.numBtn} onClick={() => setScMin(Math.max(0, scMin - 5))}><Minus size={20} /></button>
            <input type="number" value={scMin} onChange={e => setScMin(parseInt(e.target.value) || 0)} style={styles.numInput} />
            <button style={styles.numBtn} onClick={() => setScMin(scMin + 5)}><Plus size={20} /></button>
          </div>
        </div>

        <div style={styles.card}>
          <label style={styles.label}>Overall RPE (1–10)</label>
          <div style={styles.rpeRow}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button key={n} style={{ ...styles.rpeBtn, background: rpe === n ? rpeColor(n) : '#1f2937', color: rpe === n ? '#000' : '#fff' }} onClick={() => setRpe(n)}>{n}</button>
            ))}
          </div>
        </div>

        <div style={styles.card}>
          <label style={styles.label}>Notes</label>
          <textarea style={styles.textarea} value={notes} onChange={e => setNotes(e.target.value)} placeholder="What was this?" />
        </div>

        <div style={styles.loadPreview}>
          <div>
            <div style={styles.loadPreviewLabel}>COMPUTED LOAD</div>
            <div style={styles.loadPreviewValue}>{computeLoad()}</div>
          </div>
        </div>

        <button style={{ ...styles.btnPrimary, width: '100%', marginTop: 12 }} onClick={save}>
          <Save size={18} /> Save custom session
        </button>
      </div>
    </div>
  );
}

// ============================================================
// ACWR
// ============================================================

function HistoryView({ sessions, fingerLog, onEditSession }) {
  const calc = calcACWR(sessions);
  const status = acwrStatus(calc.ratio);

  // Sort sessions newest first
  const sortedSessions = Object.entries(sessions)
    .sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div>
      <h1 style={styles.h1}>History</h1>
      <p style={styles.subtle}>All logged sessions and load over time</p>

      <div style={{ ...styles.acwrCard, borderColor: status.color }}>
        <div style={styles.acwrLabel}>Current ACWR</div>
        <div style={{ ...styles.acwrValue, color: status.color }}>
          {calc.ratio > 0 ? calc.ratio.toFixed(2) : '—'}
        </div>
        <div style={{ ...styles.acwrStatus, color: status.color }}>{status.label}</div>
        <div style={styles.acwrAction}>{status.action}</div>
      </div>

      <div style={styles.acwrStats}>
        <div style={styles.acwrStat}>
          <div style={styles.acwrStatLabel}>Acute (last 7d)</div>
          <div style={styles.acwrStatValue}>{Math.round(calc.acute)}</div>
        </div>
        <div style={styles.acwrStat}>
          <div style={styles.acwrStatLabel}>
            Chronic ({calc.weeksAvailable}-wk avg)
          </div>
          <div style={styles.acwrStatValue}>{Math.round(calc.chronic)}</div>
        </div>
      </div>

      <ACWRChart sessions={sessions} />

      {/* Full session list */}
      <div style={{ ...styles.card, marginTop: 16 }}>
        <h3 style={styles.h3}>All sessions ({sortedSessions.length})</h3>
        {sortedSessions.length === 0 ? (
          <p style={styles.subtle}>No sessions logged yet.</p>
        ) : (
          <div style={styles.sessionList}>
            {sortedSessions.map(([date, s]) => (
              <SessionListItem key={date} date={date} session={s} fingerEntry={fingerLog[date]} onEdit={onEditSession} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionListItem({ date, session, fingerEntry, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const [y, m, d] = date.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayName = dayOfWeek(dateObj);
  const dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const load = calcLoggedLoad(session);
  const blocks = session.blocks || [];
  const hasBlocks = blocks.length > 0;
  const isCustom = session.isCustom;
  const isPreSeeded = session.isPreSeeded;
  const totalMin = blocks.reduce((s, b) => s + (b.actualMin || 0), 0);

  // Determine session "type" badge based on blocks
  let sessionTypeLabel = 'Rest';
  if (hasBlocks) {
    const hasMaxClimbing = blocks.some(b => b.intensity === 'climbing_max' || b.intensity === 'climbing_hard');
    const hasMaxFingers = blocks.some(b => b.intensity === 'fingers_high');
    const hasModerate = blocks.some(b => b.intensity === 'climbing_moderate');
    if (hasMaxClimbing || hasMaxFingers) sessionTypeLabel = 'Hard';
    else if (hasModerate) sessionTypeLabel = 'Moderate';
    else if (blocks.some(b => b.type === 'climbing')) sessionTypeLabel = 'Easy';
    else sessionTypeLabel = 'S&C / Rehab';
  }

  return (
    <div
      style={{ ...styles.sessionItem, cursor: 'pointer', opacity: isPreSeeded ? 0.55 : 1 }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={styles.sessionItemHeader}>
        <div style={styles.sessionItemLeft}>
          <div style={{ ...styles.sessionItemDay, color: isPreSeeded ? '#6b7280' : '#10b981' }}>{dayName}</div>
          <div style={styles.sessionItemDate}>{dateLabel}</div>
        </div>
        <div style={styles.sessionItemMiddle}>
          <div style={styles.sessionItemType}>
            {sessionTypeLabel}
            {isCustom && <span style={styles.customBadge}>custom</span>}
            {isPreSeeded && <span style={styles.preseedBadge}>baseline</span>}
          </div>
          <div style={styles.sessionItemMeta}>
            {totalMin > 0 && <span>{totalMin}m</span>}
            {session.rpe > 0 && <span style={{ color: rpeColor(session.rpe) }}>RPE {session.rpe}</span>}
            {fingerEntry && (fingerEntry.left > 0 || fingerEntry.right > 0) && (
              <span style={{ color: painColor(Math.max(fingerEntry.left, fingerEntry.right)) }}>
                fingers {fingerEntry.left}/{fingerEntry.right}
              </span>
            )}
          </div>
        </div>
        <div style={styles.sessionItemRight}>
          <div style={styles.sessionItemLoad}>{load}</div>
          <ChevronDown
            size={14}
            style={{ color: '#6b7280', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          />
        </div>
      </div>

      {expanded && (
        <div style={styles.sessionItemExpanded}>
          {hasBlocks ? (
            <div style={styles.sessionBlocksList}>
              {blocks.map((b, i) => (
                <div key={i} style={styles.sessionBlock}>
                  <div style={styles.sessionBlockLeft}>
                    <span style={{ ...styles.sessionBlockDot, background: TYPE_COLORS[b.type] || '#9ca3af' }} />
                    <span style={styles.sessionBlockName}>{b.name}</span>
                  </div>
                  <div style={styles.sessionBlockRight}>
                    <span style={styles.sessionBlockIntensity}>
                      {b.intensity?.replace(/_/g, ' ') || ''}
                    </span>
                    <span style={styles.sessionBlockMin}>{b.actualMin || 0}m</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.sessionRestNote}>Rest day</div>
          )}
          {session.notes && (
            <div style={styles.sessionNotes}>
              <div style={styles.sessionNotesLabel}>Notes</div>
              <div style={styles.sessionNotesText}>{session.notes}</div>
            </div>
          )}
          {fingerEntry && (fingerEntry.notes || fingerEntry.left > 0 || fingerEntry.right > 0) && (
            <div style={styles.sessionFingers}>
              <div style={styles.sessionNotesLabel}>Fingers (L / R)</div>
              <div style={styles.sessionNotesText}>
                {fingerEntry.left || 0} / {fingerEntry.right || 0}
                {fingerEntry.notes && ` — ${fingerEntry.notes}`}
              </div>
            </div>
          )}
          {onEdit && (
            <button
              style={{ ...styles.btnSecondary, width: '100%', marginTop: 12 }}
              onClick={(e) => { e.stopPropagation(); onEdit(date); }}
            >
              ✏️ Edit this log
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function localDate(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d); // local midnight — avoids UTC timezone shift
}

function ACWRChart({ sessions }) {
  const now = new Date();
  const DAY = 24 * 60 * 60 * 1000;
  // 8 rolling buckets of 7 days each, bucket 0 = most recent
  const buckets = Array(8).fill(0);
  Object.entries(sessions).forEach(([k, s]) => {
    const diff = (now - localDate(k)) / DAY;
    if (diff < 0 || diff >= 56) return;
    const slot = Math.min(7, Math.floor(diff / 7));
    buckets[slot] += calcLoggedLoad(s);
  });
  // Display oldest → newest
  const weeks = [...buckets].reverse().map((total, i) => ({
    week: `W${i + 1}`,
    total: Math.round(total),
    isPreseeded: true,
  }));
  const max = Math.max(...weeks.map(w => w.total), 60);

  return (
    <div style={styles.card}>
      <h3 style={styles.h3}>Last 8 weeks (load units)</h3>
      <div style={styles.chart}>
        {weeks.map((w, i) => (
          <div key={i} style={styles.chartCol}>
            <div style={styles.chartBarWrap}>
              <div style={{ ...styles.chartBar, height: `${(w.total / max) * 100}%`, background: w.total === 0 ? '#374151' : '#10b981' }} />
            </div>
            <div style={styles.chartLabel}>{w.week}</div>
            <div style={styles.chartValue}>{w.total}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// FINGERS
// ============================================================

function FingersView({ fingerLog, onUpdate }) {
  const key = todayKey();
  const existing = fingerLog[key] || { left: 0, right: 0, notes: '' };
  const [form, setForm] = useState(existing);

  useEffect(() => {
    setForm(fingerLog[key] || { left: 0, right: 0, notes: '' });
  }, [key]);

  const save = () => {
    onUpdate({ ...fingerLog, [key]: { ...form, date: key } });
  };

  const last14 = Object.entries(fingerLog)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 14);

  const worstRecent = last14.slice(0, 7).reduce((max, [_, v]) =>
    Math.max(max, v.left || 0, v.right || 0), 0);

  return (
    <div>
      <h1 style={styles.h1}>Finger Pain Tracker</h1>
      <p style={styles.subtle}>Middle finger PIP — synovitis / collateral ligament</p>

      {worstRecent >= 3 && (
        <div style={styles.warning}>
          <AlertCircle size={20} />
          <div>
            <strong>Worst pain in last 7 days: {worstRecent}/10</strong>
            <div>You're above the 2/10 ceiling. Drop finger load 20% and reduce crimping.</div>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <label style={styles.label}>Left middle finger (0–10)</label>
        <PainSlider value={form.left} onChange={v => setForm({ ...form, left: v })} />
      </div>

      <div style={styles.card}>
        <label style={styles.label}>Right middle finger (0–10)</label>
        <PainSlider value={form.right} onChange={v => setForm({ ...form, right: v })} />
      </div>

      <div style={styles.card}>
        <label style={styles.label}>Notes</label>
        <textarea
          style={styles.textarea}
          value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })}
          placeholder="What aggravated it? What helped?"
        />
      </div>

      <button style={styles.btnPrimary} onClick={save}>
        <Save size={18} /> Save
      </button>

      <div style={{ ...styles.card, marginTop: 24 }}>
        <h3 style={styles.h3}>Last 14 days</h3>
        {last14.length === 0 ? (
          <p style={styles.subtle}>No entries yet. Log daily — even on rest days.</p>
        ) : (
          <div style={styles.fingerHistory}>
            {last14.map(([date, v]) => (
              <div key={date} style={styles.fingerRow}>
                <div style={styles.fingerDate}>{date.slice(5)}</div>
                <div style={styles.fingerBars}>
                  <div style={styles.fingerBarLabel}>L</div>
                  <div style={styles.fingerBarTrack}>
                    <div style={{ ...styles.fingerBarFill, width: `${(v.left || 0) * 10}%`, background: painColor(v.left || 0) }} />
                  </div>
                  <div style={styles.fingerVal}>{v.left || 0}</div>
                </div>
                <div style={styles.fingerBars}>
                  <div style={styles.fingerBarLabel}>R</div>
                  <div style={styles.fingerBarTrack}>
                    <div style={{ ...styles.fingerBarFill, width: `${(v.right || 0) * 10}%`, background: painColor(v.right || 0) }} />
                  </div>
                  <div style={styles.fingerVal}>{v.right || 0}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.card}>
        <h3 style={styles.h3}>Daily protocol</h3>
        <p style={styles.subtle}>
          No-hangs 5 × 30–45s on 20mm edge, half crimp, @ 50–60% bodyweight, 1 min rest between.
          Do this every day including rest days. Two full weeks symptom-free before progressing load.
        </p>
      </div>
    </div>
  );
}

function PainSlider({ value, onChange }) {
  return (
    <div>
      <div style={styles.painRow}>
        {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
          <button
            key={n}
            style={{ ...styles.painBtn, background: value === n ? painColor(n) : '#1f2937', color: value === n ? '#000' : '#9ca3af' }}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div style={styles.painHint}>
        {value === 0 && 'No pain'}
        {value >= 1 && value <= 2 && 'Acceptable — within rehab window'}
        {value >= 3 && value <= 4 && 'Above ceiling — reduce load 20%'}
        {value >= 5 && 'Stop loading. Rest and consider physio.'}
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS
// ============================================================

function SettingsView({
  currentPhase, travelMode, phaseStartDate,
  onPhaseChange, onTravelToggle, onStartDateChange,
  sessions, fingerLog, onImportSessions, onImportFingers,
  backupVersion, lastExportTs, onMarkExported,
}) {
  const [importStatus, setImportStatus] = useState(null);
  const [backups, setBackups] = useState([]);
  const [restoreStatus, setRestoreStatus] = useState(null);

  // Load backups from storage. Refresh when backupVersion bumps.
  useEffect(() => {
    const loaded = [];
    for (let i = 0; i < 5; i++) {
      try {
        const r = storage.get(`backup_${i}`);
        if (r) loaded.push({ slot: i, ...JSON.parse(r) });
      } catch (e) { /* slot empty */ }
    }
    setBackups(loaded);
  }, [backupVersion]);

  const restoreBackup = async (backup) => {
    if (!backup) return;
    onImportSessions(backup.sessions || {});
    onImportFingers(backup.fingerLog || {});
    setRestoreStatus({
      ok: true,
      msg: `Restored backup from ${new Date(backup.ts).toLocaleString()}.`,
    });
  };

  const downloadBackup = (backup) => {
    if (!backup) {
      setRestoreStatus({ ok: false, msg: 'No backup data found.' });
      return;
    }
    try {
      const sCount = Object.keys(backup.sessions || {}).length;
      const fCount = Object.keys(backup.fingerLog || {}).length;
      const data = {
        sessions: backup.sessions || {},
        fingerLog: backup.fingerLog || {},
        exportedAt: backup.ts,
        fromAutoBackup: true,
      };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const filename = `climbing-backup-slot${backup.slot}-${new Date().toISOString().split('T')[0]}.json`;
      shareOrOpenBlob(filename, blob);
      setRestoreStatus({ ok: true, msg: `Sharing backup slot ${backup.slot} (${sCount}s, ${fCount}f).` });
    } catch (e) {
      setRestoreStatus({ ok: false, msg: `Open failed: ${e.message}` });
    }
  };

  const [exportStatus, setExportStatus] = useState(null);

  const exportData = () => {
    try {
      if (!sessions || Object.keys(sessions).length === 0) {
        setExportStatus({ ok: false, msg: 'No sessions to export yet. Log something first.' });
        return;
      }
      doExport(sessions, fingerLog);
      if (onMarkExported) onMarkExported();
      setExportStatus({ ok: true, msg: `Opened ${Object.keys(sessions).length} sessions and ${Object.keys(fingerLog).length} finger entries in new tab. Tap Share → Save to Files.` });
    } catch (e) {
      setExportStatus({ ok: false, msg: `Export failed: ${e.message}` });
    }
  };

  const handleImport = (mode) => (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);

        // Validate shape
        if (!parsed.sessions && !parsed.fingerLog) {
          setImportStatus({ ok: false, msg: 'File missing sessions or fingerLog — wrong format?' });
          return;
        }

        const incomingSessions = parsed.sessions || {};
        const incomingFingers = parsed.fingerLog || {};

        let nextSessions, nextFingers;
        let summary;

        if (mode === 'replace') {
          nextSessions = incomingSessions;
          nextFingers = incomingFingers;
          summary = `Replaced all data with ${Object.keys(incomingSessions).length} sessions and ${Object.keys(incomingFingers).length} finger entries.`;
        } else {
          // Merge: incoming overrides existing on same date
          nextSessions = { ...sessions, ...incomingSessions };
          nextFingers = { ...fingerLog, ...incomingFingers };
          const newSessions = Object.keys(incomingSessions).filter(k => !sessions[k]).length;
          const updatedSessions = Object.keys(incomingSessions).filter(k => sessions[k]).length;
          const newFingers = Object.keys(incomingFingers).filter(k => !fingerLog[k]).length;
          const updatedFingers = Object.keys(incomingFingers).filter(k => fingerLog[k]).length;
          summary = `Merged: ${newSessions} new sessions, ${updatedSessions} overwritten · ${newFingers} new finger entries, ${updatedFingers} overwritten.`;
        }

        onImportSessions(nextSessions);
        onImportFingers(nextFingers);
        setImportStatus({ ok: true, msg: summary });
      } catch (err) {
        setImportStatus({ ok: false, msg: `Couldn't parse file: ${err.message}` });
      }
    };
    reader.onerror = () => setImportStatus({ ok: false, msg: 'Failed to read file.' });
    reader.readAsText(file);

    // Reset input so the same file can be re-imported if needed
    event.target.value = '';
  };

  return (
    <div>
      <h1 style={styles.h1}>Settings</h1>

      <div style={styles.card}>
        <h3 style={styles.h3}>Program start date</h3>
        <p style={styles.subtle}>
          When did you start the current phase? This determines which week you're in.
          Periodic increments (volume/intensity multipliers) follow this.
        </p>
        <input
          type="date"
          value={phaseStartDate || ''}
          onChange={e => onStartDateChange(e.target.value)}
          style={styles.dateInput}
        />
        {!phaseStartDate && (
          <div style={styles.helperText}>
            Not set — defaulting to Week 1 of the phase.
          </div>
        )}
      </div>

      <div style={styles.card}>
        <h3 style={styles.h3}>Current phase</h3>
        <p style={styles.subtle}>Override the phase if you're not following the 12-week cycle linearly.</p>
        <div style={styles.phaseGrid}>
          {Object.entries(PHASES).filter(([k]) => k !== 'travel').map(([key, p]) => (
            <button
              key={key}
              style={{ ...styles.phaseBtn, background: currentPhase === key ? p.color : '#1f2937', color: currentPhase === key ? '#000' : '#fff', fontWeight: currentPhase === key ? 700 : 400 }}
              onClick={() => onPhaseChange(key)}
            >
              <div>{p.name}</div>
              <div style={styles.phaseBtnWeeks}>{p.totalWeeks}wk</div>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.h3}>Travel mode</h3>
        <p style={styles.subtle}>Also accessible from the header. Overrides the active phase.</p>
        <button
          style={{ ...styles.toggleBtn, background: travelMode ? '#06b6d4' : '#1f2937', color: travelMode ? '#000' : '#fff' }}
          onClick={() => onTravelToggle(!travelMode)}
        >
          <Plane size={18} /> {travelMode ? 'Travel mode ON' : 'Travel mode OFF'}
        </button>
      </div>

      <div style={styles.card}>
        <h3 style={styles.h3}>Backup & restore</h3>
        <p style={styles.subtle}>
          Download all logged sessions and finger entries as JSON. Recommended before
          any app changes or when moving devices.
        </p>
        <button style={{ ...styles.btnSecondary, width: '100%' }} onClick={exportData}>
          📥 Export data (JSON)
        </button>
        {exportStatus && (
          <div style={exportStatus.ok ? styles.importOk : styles.importErr}>
            {exportStatus.ok ? '✓' : '✗'} {exportStatus.msg}
          </div>
        )}
        <div style={{ ...styles.helperText, marginTop: 8, marginBottom: 16 }}>
          Sessions logged: {Object.keys(sessions).length} · Finger entries: {Object.keys(fingerLog).length}
        </div>

        <div style={styles.importDivider} />

        <p style={{ ...styles.subtle, marginTop: 16 }}>
          Import a backup file. <strong>Merge</strong> keeps existing data and adds/overwrites
          dates from the file. <strong>Replace</strong> wipes everything and uses only the file's data.
        </p>

        <div style={styles.importRow}>
          <label style={{ ...styles.btnSecondary, flex: 1, cursor: 'pointer' }}>
            📤 Merge from file
            <input type="file" accept=".json,application/json" onChange={handleImport('merge')} style={{ display: 'none' }} />
          </label>
          <label style={{ ...styles.btnDanger, flex: 1, cursor: 'pointer' }}>
            ⚠ Replace all
            <input type="file" accept=".json,application/json" onChange={handleImport('replace')} style={{ display: 'none' }} />
          </label>
        </div>

        {importStatus && (
          <div style={importStatus.ok ? styles.importOk : styles.importErr}>
            {importStatus.ok ? '✓' : '✗'} {importStatus.msg}
          </div>
        )}
      </div>

      <div style={styles.card}>
        <h3 style={styles.h3}>Automatic backups</h3>
        <p style={styles.subtle}>
          The app keeps a rolling history of your last 5 saves. Every time you log a
          session or update finger pain, a snapshot is added here. Use this to roll
          back if something gets corrupted or if you want to undo recent edits.
        </p>

        {backups.length === 0 ? (
          <p style={{ ...styles.subtle, fontSize: 12, fontStyle: 'italic' }}>
            No backups yet. Log a session to create your first one.
          </p>
        ) : (
          <div style={styles.backupList}>
            {backups.map((b, i) => {
              const sCount = Object.keys(b.sessions || {}).length;
              const fCount = Object.keys(b.fingerLog || {}).length;
              const ts = new Date(b.ts);
              const label = i === 0 ? 'Latest' : `${i} save${i === 1 ? '' : 's'} ago`;
              return (
                <div key={b.slot} style={styles.backupItem}>
                  <div style={styles.backupItemTop}>
                    <div>
                      <div style={styles.backupItemLabel}>{label}</div>
                      <div style={styles.backupItemTs}>{ts.toLocaleString()}</div>
                    </div>
                    <div style={styles.backupItemCount}>
                      {sCount}s / {fCount}f
                    </div>
                  </div>
                  <div style={styles.backupItemActions}>
                    <button
                      style={styles.backupActionBtn}
                      onClick={() => downloadBackup(b)}
                    >
                      📥 Download
                    </button>
                    <button
                      style={{ ...styles.backupActionBtn, color: '#fbbf24' }}
                      onClick={() => restoreBackup(b)}
                    >
                      ↺ Restore
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {restoreStatus && (
          <div style={restoreStatus.ok ? styles.importOk : styles.importErr}>
            {restoreStatus.ok ? '✓' : '✗'} {restoreStatus.msg}
          </div>
        )}
      </div>

      <StorageInspectorCard />

      <div style={styles.card}>
        <h3 style={styles.h3}>Load model</h3>
        <p style={styles.subtle}>
          Session load = Σ (block minutes × intensity weight) × (RPE ÷ 7).
          Minutes include warm-up, cool-down, and rest between efforts — the canonical
          Foster (2001) sRPE method. Intensity weights range from 0.6 (easy climbing) to
          2.2 (max hangs), aligned with Foster's low/moderate/high zone ratios.
          Pull work is weighted (0.8–1.6) because it overlaps with climbing's recovery
          demands; other S&C (push/legs/core/wrist/neck) is tracked at ×0.6 since it
          doesn't compete for the same recovery pool.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// CALCULATIONS
// ============================================================

// calcACWR imported from logic.js

function acwrStatus(r) {
  if (r === 0) return { label: 'No data yet', color: '#9ca3af', action: 'Log a few sessions to see your ratio.' };
  if (r < 0.5) return { label: 'Very low', color: '#6b7280', action: 'Likely detraining. Add a session.' };
  if (r < 0.8) return { label: 'Low', color: '#f59e0b', action: 'Below sweet spot. Add load if recovered.' };
  if (r <= 1.3) return { label: 'Sweet spot', color: '#10b981', action: 'Keep building. Stay disciplined.' };
  if (r <= 1.5) return { label: 'Elevated', color: '#f59e0b', action: 'Watch closely. Consider easing off.' };
  return { label: 'Spike — injury risk', color: '#ef4444', action: 'Deload next week to ~60% volume.' };
}

function rpeColor(n) {
  if (n <= 4) return '#10b981';
  if (n <= 6) return '#84cc16';
  if (n <= 8) return '#f59e0b';
  return '#ef4444';
}

function painColor(n) {
  if (n === 0) return '#10b981';
  if (n <= 2) return '#84cc16';
  if (n <= 4) return '#f59e0b';
  return '#ef4444';
}

function NavButton({ icon, label, active, onClick }) {
  return (
    <button style={{ ...styles.navBtn, color: active ? '#10b981' : '#9ca3af' }} onClick={onClick}>
      {icon}
      <div style={styles.navLabel}>{label}</div>
    </button>
  );
}

// ============================================================
// UTILS — Timer + Counter
// ============================================================

const DEFAULT_PROTOCOLS = [
  { id: 'repeaters-7-3', name: 'Repeaters 7/3', sets: 6, reps: 6, workSec: 7, restSec: 3, setBetweenSec: 120 },
  { id: 'max-hangs-10', name: 'Max hangs 10s', sets: 6, reps: 1, workSec: 10, restSec: 180, setBetweenSec: 180 },
  { id: 'no-hangs-30', name: 'No-hangs 30s', sets: 5, reps: 1, workSec: 30, restSec: 60, setBetweenSec: 60 },
  { id: 'min-edge-5', name: 'Min-edge 5s', sets: 5, reps: 1, workSec: 5, restSec: 180, setBetweenSec: 180 },
];

function loadProtocols() {
  try {
    const raw = localStorage.getItem('timerProtocols');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return DEFAULT_PROTOCOLS;
}

function saveProtocols(protocols) {
  localStorage.setItem('timerProtocols', JSON.stringify(protocols));
}

const TIMER_KEY = 'timerSession';

function saveTimerSession(s) {
  localStorage.setItem(TIMER_KEY, JSON.stringify({ ...s, savedAt: Date.now() }));
}

function clearTimerSession() {
  localStorage.removeItem(TIMER_KEY);
}

function restoreTimerSession() {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.phase || s.phase === 'done') return null;
    if (s.isPaused) return s; // paused — restore exactly
    // Was running when app closed — subtract elapsed, restore as paused
    const elapsed = Math.floor((Date.now() - s.savedAt) / 1000);
    const remaining = s.timeLeft - elapsed;
    if (remaining <= 0) { clearTimerSession(); return null; }
    return { ...s, timeLeft: remaining, isPaused: true };
  } catch (e) { return null; }
}

function beep(ctx, freq = 880, duration = 0.12, volume = 0.4) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function UtilsView() {
  const [tab, setTab] = useState('timer');
  return (
    <div>
      <h1 style={styles.h1}>Tools</h1>
      <div style={styles.utilsTabs}>
        <button
          style={{ ...styles.utilsTab, ...(tab === 'timer' ? styles.utilsTabActive : {}) }}
          onClick={() => setTab('timer')}
        >
          Timer
        </button>
        <button
          style={{ ...styles.utilsTab, ...(tab === 'counter' ? styles.utilsTabActive : {}) }}
          onClick={() => setTab('counter')}
        >
          Counter
        </button>
      </div>
      {tab === 'timer' && <IntervalTimer />}
      {tab === 'counter' && <TapCounter />}
    </div>
  );
}

function IntervalTimer() {
  const [protocols, setProtocols] = useState(loadProtocols);
  const [editing, setEditing] = useState(false);
  const [editProto, setEditProto] = useState(null);

  // Restore persisted timer state on mount (survives tab switch + app close)
  const [restored] = useState(() => restoreTimerSession());
  const [phase, setPhase] = useState(restored?.phase ?? null);
  const [timeLeft, setTimeLeft] = useState(restored?.timeLeft ?? 0);
  const [currentSet, setCurrentSet] = useState(restored?.set ?? 1);
  const [currentRep, setCurrentRep] = useState(restored?.rep ?? 1);
  const [isPaused, setIsPaused] = useState(restored?.isPaused ?? false);
  const [selectedId, setSelectedId] = useState(restored?.protocolId ?? protocols[0]?.id ?? null);

  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);
  // Refs so interval closures always see fresh values without stale captures
  const phaseRef = useRef(phase);
  const tlRef = useRef(timeLeft);
  const setNumRef = useRef(currentSet);
  const repRef = useRef(currentRep);
  const protoRef = useRef(null);
  const selectedIdRef = useRef(selectedId);

  const proto = protocols.find(p => p.id === selectedId) ?? protocols[0];
  protoRef.current = proto;
  selectedIdRef.current = selectedId;

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { tlRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { setNumRef.current = currentSet; }, [currentSet]);
  useEffect(() => { repRef.current = currentRep; }, [currentRep]);

  const getAudioCtx = () => {
    if (!audioCtxRef.current)
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtxRef.current;
  };

  const persist = (p, tl, s, r, paused) => {
    if (!p || p === 'done') { clearTimerSession(); return; }
    saveTimerSession({ phase: p, timeLeft: tl, set: s, rep: r, isPaused: paused, protocolId: selectedIdRef.current });
  };

  const stop = useCallback(() => {
    clearInterval(intervalRef.current);
    setPhase(null); setTimeLeft(0); setCurrentSet(1); setCurrentRep(1); setIsPaused(false);
    clearTimerSession();
  }, []);

  const pause = () => {
    clearInterval(intervalRef.current);
    setIsPaused(true);
    persist(phaseRef.current, tlRef.current, setNumRef.current, repRef.current, true);
  };

  // Run a countdown interval for a given phase, calling onEnd when it reaches 0
  const runCountdown = useCallback((phaseName, seconds, s, r, onEnd) => {
    clearInterval(intervalRef.current);
    setPhase(phaseName); phaseRef.current = phaseName;
    setCurrentSet(s); setNumRef.current = s;
    setCurrentRep(r); repRef.current = r;
    setTimeLeft(seconds); tlRef.current = seconds;
    setIsPaused(false);
    persist(phaseName, seconds, s, r, false);
    let remaining = seconds;
    intervalRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining); tlRef.current = remaining;
      persist(phaseRef.current, remaining, setNumRef.current, repRef.current, false);
      if (remaining > 0 && remaining <= 3) beep(getAudioCtx(), 660, 0.08);
      if (remaining <= 0) { clearInterval(intervalRef.current); onEnd(); }
    }, 1000);
  }, []);

  const advance = useCallback((s, r) => {
    const p = protoRef.current;
    if (!p) return;
    const { sets, reps, workSec, restSec, setBetweenSec } = p;
    if (r < reps) {
      beep(getAudioCtx(), 440, 0.15);
      runCountdown('rest', restSec, s, r, () => {
        beep(getAudioCtx(), 880, 0.2);
        runCountdown('work', workSec, s, r + 1, () => advance(s, r + 1));
      });
    } else if (s < sets) {
      beep(getAudioCtx(), 330, 0.3);
      const next = () => { beep(getAudioCtx(), 880, 0.2); runCountdown('work', workSec, s + 1, 1, () => advance(s + 1, 1)); };
      if (setBetweenSec > 0) runCountdown('set-rest', setBetweenSec, s, r, next);
      else next();
    } else {
      beep(getAudioCtx(), 220, 0.5);
      setTimeout(() => beep(getAudioCtx(), 440, 0.4), 200);
      setPhase('done'); clearTimerSession();
    }
  }, [runCountdown]);

  const start = () => {
    if (!proto) return;
    runCountdown('get-ready', 3, 1, 1, () => {
      beep(getAudioCtx(), 880, 0.2);
      runCountdown('work', proto.workSec, 1, 1, () => advance(1, 1));
    });
  };

  const resume = () => {
    if (!phase || phase === 'done') return;
    const p = protoRef.current;
    if (!p) return;
    setIsPaused(false);
    // Reconstruct what happens when the current phase ends
    const s = setNumRef.current, r = repRef.current;
    const tl = tlRef.current;
    const onEnd = () => {
      if (phaseRef.current === 'work') advance(s, r);
      else if (phaseRef.current === 'rest') { beep(getAudioCtx(), 880, 0.2); runCountdown('work', p.workSec, s, r + 1, () => advance(s, r + 1)); }
      else if (phaseRef.current === 'set-rest') { beep(getAudioCtx(), 880, 0.2); runCountdown('work', p.workSec, s + 1, 1, () => advance(s + 1, 1)); }
    };
    persist(phase, tl, s, r, false);
    let remaining = tl;
    intervalRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining); tlRef.current = remaining;
      persist(phaseRef.current, remaining, setNumRef.current, repRef.current, false);
      if (remaining > 0 && remaining <= 3) beep(getAudioCtx(), 660, 0.08);
      if (remaining <= 0) { clearInterval(intervalRef.current); onEnd(); }
    }, 1000);
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const phaseColors = { 'get-ready': '#f97316', work: '#10b981', rest: '#f59e0b', 'set-rest': '#3b82f6', done: '#8b5cf6' };
  const phaseLabels = { 'get-ready': 'GET READY', work: 'HANG', rest: 'REST', 'set-rest': 'SET REST', done: 'DONE' };
  const isActive = !!phase && phase !== 'done';

  const saveEdit = () => {
    const updated = protocols.map(p => p.id === editProto.id ? editProto : p);
    setProtocols(updated); saveProtocols(updated); setEditing(false);
  };

  const addProtocol = () => {
    const np = { id: `custom-${Date.now()}`, name: 'Custom', sets: 5, reps: 6, workSec: 7, restSec: 3, setBetweenSec: 120 };
    const updated = [...protocols, np];
    setProtocols(updated); saveProtocols(updated);
    setSelectedId(np.id); setEditProto({ ...np }); setEditing(true);
  };

  const deleteProtocol = (id) => {
    if (DEFAULT_PROTOCOLS.find(d => d.id === id)) return; // don't delete defaults
    const updated = protocols.filter(p => p.id !== id);
    setProtocols(updated); saveProtocols(updated);
    if (selectedId === id) setSelectedId(updated[0]?.id ?? null);
  };

  return (
    <div>
      {/* Protocol selector */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={styles.h3}>Protocol</h3>
          <button style={styles.btnSmall} onClick={addProtocol}>+ New</button>
        </div>
        <div style={styles.protoList}>
          {protocols.map(p => (
            <div
              key={p.id}
              style={{ ...styles.protoItem, ...(p.id === selectedId ? styles.protoItemActive : {}), opacity: isActive && p.id !== selectedId ? 0.4 : 1 }}
              onClick={() => { if (!isActive) setSelectedId(p.id); }}
            >
              <div style={styles.protoItemName}>{p.name}</div>
              <div style={styles.protoItemMeta}>
                {p.sets}s × {p.reps}r · {p.workSec}/{p.restSec}s · {p.setBetweenSec}s between
              </div>
            </div>
          ))}
        </div>
        {proto && !isActive && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button style={{ ...styles.btnSmall, flex: 1 }} onClick={() => { setEditProto({ ...proto }); setEditing(true); }}>Edit</button>
            {!DEFAULT_PROTOCOLS.find(d => d.id === proto.id) && (
              <button style={{ ...styles.btnSmall, flex: 1, color: '#ef4444' }} onClick={() => deleteProtocol(proto.id)}>Delete</button>
            )}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && editProto && (
        <div style={styles.modalOverlay} onClick={() => setEditing(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>Edit Protocol</div>
              <button style={styles.modalClose} onClick={() => setEditing(false)}><X size={20} /></button>
            </div>
            {[
              { label: 'Name', key: 'name', type: 'text' },
              { label: 'Sets', key: 'sets', type: 'number' },
              { label: 'Reps per set', key: 'reps', type: 'number' },
              { label: 'Work (seconds)', key: 'workSec', type: 'number' },
              { label: 'Rest between reps (seconds)', key: 'restSec', type: 'number' },
              { label: 'Rest between sets (seconds)', key: 'setBetweenSec', type: 'number' },
            ].map(({ label, key, type }) => (
              <div key={key} style={styles.card}>
                <label style={styles.label}>{label}</label>
                <input
                  type={type}
                  value={editProto[key]}
                  onChange={e => setEditProto({ ...editProto, [key]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value })}
                  style={styles.dateInput}
                />
              </div>
            ))}
            <div style={{ padding: '0 16px 16px' }}>
              <button style={{ ...styles.btnPrimary, width: '100%' }} onClick={saveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Timer display */}
      {proto && (
        <div style={styles.card}>
          <div style={styles.timerDisplay}>
            {phase ? (
              <>
                <div style={{ ...styles.timerPhase, color: isPaused ? '#6b7280' : (phaseColors[phase] || '#fff') }}>
                  {phaseLabels[phase] ?? phase.toUpperCase()}
                  {isPaused && <span style={{ marginLeft: 8, fontSize: 10 }}>· PAUSED</span>}
                </div>
                <div style={{ ...styles.timerCountdown, color: isPaused ? '#374151' : (phaseColors[phase] || '#fff') }}>
                  {phase === 'done' ? '✓' : timeLeft}
                </div>
                {isActive && phase !== 'get-ready' && (
                  <div style={styles.timerProgress}>
                    Set {currentSet}/{proto.sets} · Rep {currentRep}/{proto.reps}
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={styles.timerIdleLabel}>{proto.name}</div>
                <div style={styles.timerIdleMeta}>
                  {proto.sets} sets × {proto.reps} reps · {proto.workSec}s on / {proto.restSec}s off · {proto.setBetweenSec}s between sets
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {!phase && (
              <button style={{ ...styles.btnPrimary, flex: 1, fontSize: 18 }} onClick={start}>Start</button>
            )}
            {isActive && !isPaused && (
              <button style={{ ...styles.btnSecondary, flex: 1 }} onClick={pause}>Pause</button>
            )}
            {isActive && isPaused && (
              <button style={{ ...styles.btnPrimary, flex: 1 }} onClick={resume}>Resume</button>
            )}
            {isActive && (
              <button style={{ ...styles.btnDanger, flex: 1 }} onClick={stop}>Stop</button>
            )}
            {phase === 'done' && (
              <button style={{ ...styles.btnSecondary, flex: 1 }} onClick={stop}>Done</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Counter ────────────────────────────────────────────────────────────────

function TapCounter() {
  const [mode, setMode] = useState('single'); // 'single' | 'grade' | 'type'
  const [counts, setCounts] = useState({});

  const GRADE_KEYS = ['V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8'];
  const TYPE_KEYS = ['Climbing reps', 'Fingers sets', 'Pull sets'];

  const activeKeys = mode === 'grade' ? GRADE_KEYS : mode === 'type' ? TYPE_KEYS : ['count'];
  const total = Object.values(counts).reduce((s, v) => s + v, 0);

  const inc = (key) => setCounts(c => ({ ...c, [key]: (c[key] || 0) + 1 }));
  const dec = (key) => setCounts(c => ({ ...c, [key]: Math.max(0, (c[key] || 0) - 1) }));
  const reset = () => setCounts({});

  return (
    <div>
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={styles.h3}>Total: {total}</h3>
          <button style={{ ...styles.btnSmall, color: '#ef4444' }} onClick={reset}>Reset</button>
        </div>
        <div style={styles.counterModes}>
          {['single', 'grade', 'type'].map(m => (
            <button
              key={m}
              style={{ ...styles.counterMode, ...(mode === m ? styles.counterModeActive : {}) }}
              onClick={() => { setMode(m); reset(); }}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {mode === 'single' && (
        <div style={styles.card}>
          <button
            style={styles.tapZone}
            onClick={() => inc('count')}
          >
            <div style={styles.tapCount}>{counts['count'] || 0}</div>
            <div style={styles.tapLabel}>TAP</div>
          </button>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button style={{ ...styles.btnSecondary, flex: 1 }} onClick={() => dec('count')}>−1</button>
            <button style={{ ...styles.btnSecondary, flex: 1 }} onClick={() => setCounts(c => ({ ...c, count: Math.max(0, (c.count || 0) - 5) }))}>−5</button>
          </div>
        </div>
      )}

      {(mode === 'grade' || mode === 'type') && (
        <div style={styles.card}>
          {activeKeys.map(key => (
            <div key={key} style={styles.counterRow}>
              <div style={styles.counterKey}>{key}</div>
              <div style={styles.counterControls}>
                <button style={styles.counterBtn} onClick={() => dec(key)}>−</button>
                <div style={styles.counterVal}>{counts[key] || 0}</div>
                <button style={{ ...styles.counterBtn, background: '#10b981', color: '#000' }} onClick={() => inc(key)}>+</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// STORAGE INSPECTOR — dumps localStorage contents to screen.
// Use when you suspect data is "missing" but want to verify whether
// it's actually gone from storage vs just not rendering.
// ============================================================

function StorageInspectorCard() {
  const [entries, setEntries] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const inspect = async () => {
    setLoading(true);
    setError(null);
    setEntries(null);
    try {
      const knownKeys = [
        'sessions', 'fingerLog', 'currentPhase', 'travelMode', 'phaseStartDate',
        'lastExportTs',
        'backup_0', 'backup_1', 'backup_2', 'backup_3', 'backup_4',
      ];

      const found = [];
      for (const key of knownKeys) {
        try {
          const v = storage.get(key);
          if (v !== null && v !== undefined) {
            found.push({ key, value: v, source: 'localStorage' });
          }
        } catch (e) { /* key doesn't exist */ }
      }
      setEntries(found);
    } catch (e) {
      setError(e.message || String(e));
    }
    setLoading(false);
  };

  // Parse a session/fingerLog value and try to summarize
  const summarize = (key, value) => {
    if (key === 'sessions' || key === 'fingerLog') {
      try {
        const parsed = JSON.parse(value);
        const count = Object.keys(parsed).length;
        const dates = Object.keys(parsed).sort();
        const range = dates.length > 0 ? `${dates[0]} → ${dates[dates.length - 1]}` : '(empty)';
        return `${count} entries · ${range}`;
      } catch (e) {
        return `unparseable: ${e.message}`;
      }
    }
    if (key.startsWith('backup_')) {
      try {
        const parsed = JSON.parse(value);
        const sCount = Object.keys(parsed.sessions || {}).length;
        const fCount = Object.keys(parsed.fingerLog || {}).length;
        return `snapshot at ${parsed.ts || '?'} · ${sCount}s/${fCount}f`;
      } catch (e) {
        return `unparseable: ${e.message}`;
      }
    }
    return `${value.length} chars`;
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.h3}>Storage inspector</h3>
      <p style={styles.subtle}>
        Shows every key currently in your storage. Use this to verify whether data
        is actually missing or just not rendering. Tap a row to see its raw contents.
      </p>

      <button
        style={{ ...styles.btnSecondary, width: '100%' }}
        onClick={inspect}
        disabled={loading}
      >
        {loading ? '⏳ Inspecting…' : '🔍 Inspect storage'}
      </button>

      {error && (
        <div style={styles.importErr}>✗ {error}</div>
      )}

      {entries !== null && (
        <div style={{ marginTop: 12 }}>
          {entries.length === 0 ? (
            <div style={styles.importErr}>
              ✗ Storage is empty — no keys found.
            </div>
          ) : (
            <>
              <div style={styles.importOk}>
                ✓ Found {entries.length} key(s) in storage
              </div>
              <div style={styles.storageList}>
                {entries.map((e, i) => (
                  <StorageEntry key={i} entry={e} summary={summarize(e.key, e.value)} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StorageEntry({ entry, summary }) {
  const [expanded, setExpanded] = useState(false);

  // Pretty-print if JSON
  let pretty = entry.value;
  try {
    pretty = JSON.stringify(JSON.parse(entry.value), null, 2);
  } catch (e) { /* not JSON, leave as-is */ }

  return (
    <div style={styles.storageEntry}>
      <button
        style={styles.storageEntryHeader}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={styles.storageEntryLeft}>
          <div style={styles.storageEntryKey}>
            {entry.key}
            {entry.source && <span style={styles.storageEntrySource}>{entry.source}</span>}
          </div>
          <div style={styles.storageEntrySummary}>{summary}</div>
        </div>
        <ChevronDown size={14} style={{
          color: '#6b7280',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }} />
      </button>
      {expanded && (
        <pre style={styles.storageEntryRaw}>{pretty}</pre>
      )}
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Manrope:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body { margin: 0; }
  input, textarea, button, select { font-family: inherit; }
  button { cursor: pointer; }
  button:active { transform: scale(0.97); }
  input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.7); }
`;

const styles = {
  app: { fontFamily: '"Manrope", -apple-system, system-ui, sans-serif', background: '#0a0a0a', color: '#f3f4f6', minHeight: '100vh', maxWidth: 560, margin: '0 auto', paddingBottom: 80, position: 'relative' },
  loadingContainer: { minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' },
  loadingText: { fontFamily: '"JetBrains Mono", monospace', fontSize: 14, letterSpacing: '0.1em' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 16px', paddingTop: 'calc(env(safe-area-inset-top) + 12px)', borderBottom: '1px solid #1f2937', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(8px)', zIndex: 10 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  appTitle: { fontFamily: '"JetBrains Mono", monospace', fontSize: 18, fontWeight: 700, letterSpacing: '0.2em', color: '#10b981' },
  phaseBadge: { fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 4, color: '#000', letterSpacing: '0.05em', textTransform: 'uppercase' },
  travelToggleHeader: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, border: 'none', borderRadius: 6 },
  main: { padding: '20px' },
  h1: { fontSize: 28, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em' },
  h3: { fontSize: 16, fontWeight: 700, margin: '0 0 8px' },
  subtle: { color: '#9ca3af', fontSize: 14, margin: '0 0 12px', lineHeight: 1.5 },
  helperText: { color: '#6b7280', fontSize: 12, marginTop: 6, marginBottom: 10, lineHeight: 1.5 },
  phaseDesc: { color: '#d1d5db', fontSize: 14, lineHeight: 1.6, marginBottom: 12, padding: '12px 14px', background: '#111827', borderRadius: 8, borderLeft: '3px solid #10b981' },
  progressionNote: { color: '#9ca3af', fontSize: 13, padding: '10px 12px', background: '#0f172a', borderRadius: 6, marginBottom: 12 },
  weekProgBanner: { background: '#0f172a', border: '1px solid #1e293b', padding: '12px 14px', borderRadius: 8, marginBottom: 20, fontSize: 13, color: '#d1d5db', lineHeight: 1.5 },
  weekProgMath: { fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: '#6b7280', marginTop: 6 },
  todayHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 12 },
  todayDay: { fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 },
  chipStack: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  timeChip: { fontFamily: '"JetBrains Mono", monospace', fontSize: 12, fontWeight: 700, color: '#10b981', background: '#064e3b', padding: '4px 8px', borderRadius: 4 },
  loadChip: { fontFamily: '"JetBrains Mono", monospace', fontSize: 11, fontWeight: 700, color: '#fde68a', background: '#422006', padding: '3px 8px', borderRadius: 4 },
  blocks: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 },
  blockCard: { background: '#111827', padding: '14px 16px', borderRadius: 8, borderLeft: '4px solid' },
  blockHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  blockRight: { display: 'flex', alignItems: 'center', gap: 8 },
  blockName: { fontWeight: 700, fontSize: 15 },
  blockTime: { fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: '#9ca3af', fontWeight: 700 },
  blockDetail: { color: '#9ca3af', fontSize: 13, marginTop: 4, lineHeight: 1.5 },
  blockType: { fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 6 },
  protocolWrap: { marginTop: 14, paddingTop: 14, borderTop: '1px solid #1f2937' },
  protocolName: { fontFamily: '"JetBrains Mono", monospace', fontSize: 11, fontWeight: 700, color: '#fbbf24', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 },
  protocolNote: { background: '#422006', color: '#fde68a', padding: '8px 10px', borderRadius: 6, fontSize: 12, marginBottom: 10, border: '1px solid #92400e' },
  protocolSteps: { display: 'flex', flexDirection: 'column', gap: 8 },
  protocolStep: { display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.5 },
  protocolStepTime: { fontFamily: '"JetBrains Mono", monospace', fontSize: 11, fontWeight: 700, color: '#10b981', minWidth: 56, background: '#064e3b', padding: '3px 6px', borderRadius: 4, textAlign: 'center', flexShrink: 0 },
  protocolStepWhat: { color: '#d1d5db', flex: 1 },
  card: { background: '#111827', padding: 16, borderRadius: 8, marginBottom: 12 },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 },
  list: { color: '#d1d5db', fontSize: 14, lineHeight: 1.7, paddingLeft: 20, margin: 0 },
  actionBar: { display: 'flex', gap: 10, marginTop: 16 },
  btnPrimary: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#10b981', color: '#000', border: 'none', padding: '14px 20px', borderRadius: 8, fontSize: 15, fontWeight: 700, flex: 1 },
  btnSecondary: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#1f2937', color: '#f3f4f6', border: 'none', padding: '14px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600 },
  numberRow: { display: 'flex', alignItems: 'center', gap: 12 },
  numBtn: { background: '#1f2937', color: '#10b981', border: 'none', width: 48, height: 48, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  numInput: { flex: 1, background: '#0a0a0a', border: '1px solid #1f2937', color: '#f3f4f6', fontSize: 24, fontWeight: 700, textAlign: 'center', padding: '12px', borderRadius: 8, fontFamily: '"JetBrains Mono", monospace' },
  smallBtn: { background: '#1f2937', color: '#10b981', border: 'none', width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  smallInput: { width: 60, background: '#0a0a0a', border: '1px solid #1f2937', color: '#f3f4f6', fontSize: 16, fontWeight: 700, textAlign: 'center', padding: '6px', borderRadius: 6, fontFamily: '"JetBrains Mono", monospace' },
  blockTimeRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1f2937', gap: 12 },
  blockTimeInfo: { flex: 1, minWidth: 0 },
  blockTimeName: { fontSize: 14, fontWeight: 600 },
  blockTimeIntensity: { fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#9ca3af', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' },
  blockTimeControls: { display: 'flex', alignItems: 'center', gap: 6 },
  rpeRow: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  rpeBtn: { flex: '1 1 calc(20% - 4px)', minWidth: 40, padding: '12px 0', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 14 },
  rpeHint: { color: '#9ca3af', fontSize: 12, marginTop: 10, textAlign: 'center' },
  textarea: { width: '100%', minHeight: 80, background: '#0a0a0a', border: '1px solid #1f2937', color: '#f3f4f6', padding: 12, borderRadius: 8, fontSize: 14, resize: 'vertical', fontFamily: 'inherit' },
  select: { width: '100%', background: '#0a0a0a', border: '1px solid #1f2937', color: '#f3f4f6', padding: '10px 12px', borderRadius: 6, fontSize: 13, marginTop: 8 },
  dateInput: { width: '100%', background: '#0a0a0a', border: '1px solid #1f2937', color: '#f3f4f6', padding: '12px', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' },
  warnInline: { color: '#fbbf24', fontSize: 12, marginTop: 8 },
  loadPreview: { background: '#0f172a', border: '1px solid #1e293b', padding: '12px 16px', borderRadius: 8, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  loadPreviewLabel: { fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#9ca3af', letterSpacing: '0.15em', marginBottom: 4 },
  loadPreviewValue: { fontFamily: '"JetBrains Mono", monospace', fontSize: 28, fontWeight: 700, color: '#fde68a', lineHeight: 1 },
  loadPreviewHelp: { display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 11, textAlign: 'right', maxWidth: 180 },
  acwrCard: { background: '#111827', padding: 24, borderRadius: 12, border: '2px solid', textAlign: 'center', marginBottom: 16 },
  acwrLabel: { fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: '#9ca3af', letterSpacing: '0.2em', textTransform: 'uppercase' },
  acwrValue: { fontFamily: '"JetBrains Mono", monospace', fontSize: 56, fontWeight: 700, margin: '8px 0', lineHeight: 1 },
  acwrStatus: { fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' },
  acwrAction: { color: '#d1d5db', fontSize: 14, marginTop: 8 },
  acwrStats: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 },
  acwrStat: { background: '#111827', padding: 14, borderRadius: 8, textAlign: 'center' },
  acwrStatLabel: { fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 },
  acwrStatValue: { fontFamily: '"JetBrains Mono", monospace', fontSize: 22, fontWeight: 700 },
  chart: { display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, marginTop: 12 },
  chartCol: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' },
  chartBarWrap: { width: '100%', height: 100, display: 'flex', alignItems: 'flex-end' },
  chartBar: { width: '100%', borderRadius: '4px 4px 0 0', transition: 'height 0.3s' },
  chartLabel: { fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#9ca3af', marginTop: 4 },
  chartValue: { fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: '#f3f4f6', fontWeight: 700 },
  restDay: { textAlign: 'center', padding: '40px 20px' },
  restEmoji: { fontSize: 64, marginBottom: 16 },
  weekGrid: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 },
  weekDay: { background: '#111827', padding: '12px 14px', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' },
  weekDayBtn: { background: '#111827', padding: '12px 14px', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', border: 'none', textAlign: 'left', width: '100%', color: '#f3f4f6' },
  weekDayHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  weekDayName: { fontFamily: '"JetBrains Mono", monospace', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#10b981' },
  weekDayMeta: { display: 'flex', gap: 8, alignItems: 'center' },
  weekDayTime: { fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: '#9ca3af' },
  weekDayLoad: { fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#fde68a', background: '#422006', padding: '1px 6px', borderRadius: 3, fontWeight: 700 },
  weekDayLabel: { fontSize: 14, color: '#d1d5db' },
  miniBlocks: { display: 'flex', gap: 3, marginTop: 4 },
  miniBlock: { height: 6, flex: 1, borderRadius: 3 },
  weekDayChevron: { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 0 },
  modal: { background: '#0a0a0a', width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', borderRadius: '16px 16px 0 0', padding: 20, border: '1px solid #1f2937', boxShadow: '0 -20px 60px rgba(0,0,0,0.6)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalDay: { fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 },
  modalTitle: { fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' },
  modalClose: { background: '#1f2937', border: 'none', color: '#f3f4f6', width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  todayPill: { background: '#10b981', color: '#000', fontSize: 9, padding: '2px 6px', borderRadius: 3, letterSpacing: '0.1em' },
  peekBanner: { background: '#0f172a', color: '#9ca3af', fontSize: 12, padding: '8px 12px', borderRadius: 6, marginBottom: 16, border: '1px solid #1e293b' },
  warning: { background: '#7f1d1d', color: '#fecaca', padding: 14, borderRadius: 8, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start', border: '1px solid #ef4444' },
  painRow: { display: 'flex', gap: 3, flexWrap: 'wrap' },
  painBtn: { flex: '1 1 calc(9.09% - 3px)', minWidth: 30, padding: '10px 0', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13 },
  painHint: { color: '#9ca3af', fontSize: 12, marginTop: 10, textAlign: 'center' },
  fingerHistory: { display: 'flex', flexDirection: 'column', gap: 6 },
  fingerRow: { display: 'flex', alignItems: 'center', gap: 8 },
  fingerDate: { fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: '#9ca3af', width: 44 },
  fingerBars: { display: 'flex', alignItems: 'center', gap: 4, flex: 1 },
  fingerBarLabel: { fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#6b7280', width: 12 },
  fingerBarTrack: { flex: 1, height: 8, background: '#1f2937', borderRadius: 4, overflow: 'hidden' },
  fingerBarFill: { height: '100%', transition: 'width 0.3s' },
  fingerVal: { fontFamily: '"JetBrains Mono", monospace', fontSize: 11, fontWeight: 700, width: 14, textAlign: 'right' },
  phaseGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  phaseBtn: { padding: '14px 12px', border: 'none', borderRadius: 8, fontSize: 14, textAlign: 'left' },
  phaseBtnWeeks: { fontFamily: '"JetBrains Mono", monospace', fontSize: 10, marginTop: 2, opacity: 0.7 },
  toggleBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14 },
  nav: { position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid #1f2937', display: 'flex', justifyContent: 'space-around', paddingTop: 8, paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' },
  navBtn: { background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 12px', flex: 1 },
  navLabel: { fontSize: 10, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.05em' },
  settingsBtn: { width: 32, height: 32, background: '#1f2937', border: 'none', borderRadius: 6, color: '#9ca3af', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },

  // Flexible Log styles
  logBlockHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8, flexWrap: 'wrap' },
  logBlockCounts: { display: 'flex', gap: 6 },
  countPill: { fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 700, color: '#10b981', background: '#064e3b', padding: '2px 8px', borderRadius: 10, letterSpacing: '0.05em', textTransform: 'uppercase' },

  blockLogRow: { background: '#0f172a', borderLeft: '3px solid', borderRadius: 6, padding: '10px 12px', marginBottom: 8 },
  blockLogTopRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  blockLogNameWrap: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 },
  blockLogName: { fontSize: 14, fontWeight: 600, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' },
  blockLogNameInput: { background: '#0a0a0a', border: '1px solid #10b981', color: '#f3f4f6', padding: '4px 8px', borderRadius: 4, fontSize: 14, fontWeight: 600, width: '100%' },
  addedBadge: { fontFamily: '"JetBrains Mono", monospace', fontSize: 9, fontWeight: 700, color: '#fde68a', background: '#422006', padding: '1px 6px', borderRadius: 3, letterSpacing: '0.05em', textTransform: 'uppercase' },
  intensityChip: { display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#9ca3af', background: '#1f2937', border: 'none', padding: '3px 8px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, cursor: 'pointer' },
  intensityPicker: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 6, marginBottom: 10, padding: 6, background: '#1f2937', borderRadius: 6 },
  intensityOption: { padding: '8px 10px', border: 'none', borderRadius: 4, textAlign: 'left', fontSize: 11, textTransform: 'capitalize' },
  removeBlockBtn: { background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, flexShrink: 0 },
  blockLogControls: { display: 'flex', alignItems: 'center', gap: 6 },
  minLabel: { fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' },
  diffNote: { fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#fbbf24', marginLeft: 'auto' },

  addBlockCluster: { marginTop: 8 },
  addBlockButtons: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  addBlockBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px dashed', borderRadius: 6, padding: '6px 12px', color: '#d1d5db', fontSize: 12, fontWeight: 600 },

  // Import UI
  importDivider: { borderTop: '1px solid #1f2937', marginTop: 8 },
  importRow: { display: 'flex', gap: 8, marginTop: 12 },
  btnDanger: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#1f2937', color: '#fecaca', border: '1px solid #7f1d1d', padding: '14px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600 },
  importOk: { background: '#064e3b', color: '#a7f3d0', padding: '10px 12px', borderRadius: 6, fontSize: 12, marginTop: 12, border: '1px solid #10b981', lineHeight: 1.4 },
  importErr: { background: '#7f1d1d', color: '#fecaca', padding: '10px 12px', borderRadius: 6, fontSize: 12, marginTop: 12, border: '1px solid #ef4444', lineHeight: 1.4 },

  // Session history list
  sessionList: { display: 'flex', flexDirection: 'column', gap: 6 },
  sessionItem: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, padding: '10px 12px' },
  sessionItemHeader: { display: 'flex', alignItems: 'center', gap: 10 },
  sessionItemLeft: { display: 'flex', flexDirection: 'column', minWidth: 48 },
  sessionItemDay: { fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: '#10b981', fontWeight: 700, letterSpacing: '0.05em' },
  sessionItemDate: { fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#9ca3af' },
  sessionItemMiddle: { flex: 1, minWidth: 0 },
  sessionItemType: { fontSize: 13, fontWeight: 700, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: 6 },
  sessionItemMeta: { fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#9ca3af', display: 'flex', gap: 8, marginTop: 2 },
  sessionItemRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 },
  sessionItemLoad: { fontFamily: '"JetBrains Mono", monospace', fontSize: 16, fontWeight: 700, color: '#fde68a' },
  customBadge: { fontFamily: '"JetBrains Mono", monospace', fontSize: 8, fontWeight: 700, color: '#fde68a', background: '#422006', padding: '1px 5px', borderRadius: 3, letterSpacing: '0.05em', textTransform: 'uppercase' },
  preseedBadge: { fontFamily: '"JetBrains Mono", monospace', fontSize: 8, fontWeight: 700, color: '#6b7280', background: '#1f2937', padding: '1px 5px', borderRadius: 3, letterSpacing: '0.05em', textTransform: 'uppercase' },
  sessionItemExpanded: { marginTop: 10, paddingTop: 10, borderTop: '1px solid #1f2937' },
  sessionBlocksList: { display: 'flex', flexDirection: 'column', gap: 4 },
  sessionBlock: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, gap: 8 },
  sessionBlockLeft: { display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 },
  sessionBlockDot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0 },
  sessionBlockName: { color: '#d1d5db', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sessionBlockRight: { display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 },
  sessionBlockIntensity: { fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' },
  sessionBlockMin: { fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: '#9ca3af', fontWeight: 700, minWidth: 28, textAlign: 'right' },
  sessionRestNote: { fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: '#6b7280', textAlign: 'center', padding: '8px 0' },
  sessionNotes: { marginTop: 10, paddingTop: 10, borderTop: '1px dashed #1f2937' },
  sessionNotesLabel: { fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 },
  sessionNotesText: { fontSize: 12, color: '#d1d5db', lineHeight: 1.5 },
  sessionFingers: { marginTop: 8, paddingTop: 8, borderTop: '1px dashed #1f2937' },

  // Backup list
  backupList: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, marginBottom: 8 },
  backupItem: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, padding: '10px 12px' },
  backupItemTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  backupItemLabel: { fontSize: 13, fontWeight: 700, color: '#f3f4f6' },
  backupItemTs: { fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#9ca3af', marginTop: 2 },
  backupItemCount: { fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#fde68a', background: '#422006', padding: '2px 6px', borderRadius: 3, fontWeight: 700 },
  backupItemActions: { display: 'flex', gap: 6 },
  backupActionBtn: { flex: 1, background: '#1f2937', color: '#d1d5db', border: 'none', padding: '8px', borderRadius: 4, fontSize: 12, fontWeight: 600 },

  // Self-tests
  testSummary: { padding: '10px 12px', borderRadius: 6, fontSize: 13, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  testTs: { fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 400, opacity: 0.8 },
  testList: { display: 'flex', flexDirection: 'column', gap: 4 },
  testRow: { background: '#0f172a', borderLeft: '3px solid', padding: '8px 10px', borderRadius: 4 },
  testRowTop: { display: 'flex', alignItems: 'center', gap: 8 },
  testIcon: { fontFamily: '"JetBrains Mono", monospace', fontSize: 14, fontWeight: 700, width: 14 },
  testName: { fontSize: 12, fontWeight: 600, color: '#d1d5db' },
  testMsg: { fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#9ca3af', marginTop: 4, marginLeft: 22 },

  // Storage inspector
  storageList: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 },
  storageEntry: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, overflow: 'hidden' },
  storageEntryHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'transparent', border: 'none', padding: '10px 12px', color: '#f3f4f6', textAlign: 'left', gap: 8 },
  storageEntryLeft: { flex: 1, minWidth: 0 },
  storageEntryKey: { fontFamily: '"JetBrains Mono", monospace', fontSize: 12, fontWeight: 700, color: '#10b981' },
  storageEntrySummary: { fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#9ca3af', marginTop: 2 },
  storageEntryRaw: { background: '#000', color: '#a7f3d0', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, padding: 12, margin: 0, overflow: 'auto', maxHeight: 300, lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-all' },

  // Export banner
  exportBanner: { background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: 8, padding: 14, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  exportBannerText: { flex: 1, minWidth: 0, color: '#fecaca', fontSize: 13, lineHeight: 1.4 },
  exportBannerSubtle: { color: '#fca5a5', fontSize: 11, marginTop: 4 },
  exportBannerBtn: { background: '#fecaca', color: '#7f1d1d', border: 'none', padding: '10px 14px', borderRadius: 6, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 },

  // Log date picker
  quickPickRow: { display: 'flex', gap: 6, marginTop: 10 },
  quickPickBtn: { flex: 1, padding: '8px 0', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' },
  loggedBadge: { display: 'inline-block', background: '#064e3b', color: '#10b981', padding: '1px 8px', borderRadius: 3, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginLeft: 6 },
  backBtn: { display: 'flex', alignItems: 'center', gap: 4, background: '#1f2937', border: 'none', color: '#9ca3af', padding: '6px 10px', borderRadius: 6, fontSize: 13, fontWeight: 600, flexShrink: 0 },

  // S&C workout detail expand
  scSectionHeading: { fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 },
  scSectionItem: { fontSize: 12, color: '#d1d5db', lineHeight: 1.6, paddingLeft: 4 },

  // Utils tab
  utilsTabs: { display: 'flex', gap: 8, marginBottom: 16 },
  utilsTab: { flex: 1, padding: '10px', border: '1px solid #1f2937', borderRadius: 8, background: 'transparent', color: '#9ca3af', fontWeight: 700, fontSize: 13 },
  utilsTabActive: { background: '#10b981', color: '#000', border: '1px solid #10b981' },

  // Timer
  timerDisplay: { textAlign: 'center', padding: '20px 0' },
  timerPhase: { fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 },
  timerCountdown: { fontFamily: '"JetBrains Mono", monospace', fontSize: 72, fontWeight: 700, lineHeight: 1, marginBottom: 8 },
  timerProgress: { fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: '#9ca3af' },
  timerIdleLabel: { fontSize: 18, fontWeight: 700, color: '#f3f4f6', marginBottom: 8 },
  timerIdleMeta: { fontSize: 12, color: '#9ca3af', lineHeight: 1.6 },
  protoList: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 },
  protoItem: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, padding: '10px 12px', cursor: 'pointer' },
  protoItemActive: { borderColor: '#10b981', background: '#0a1f14' },
  protoItemName: { fontSize: 13, fontWeight: 700, color: '#f3f4f6', marginBottom: 2 },
  protoItemMeta: { fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#9ca3af' },
  btnSmall: { background: '#1f2937', color: '#d1d5db', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600 },

  // Counter
  counterModes: { display: 'flex', gap: 8, marginTop: 10 },
  counterMode: { flex: 1, padding: '8px', border: '1px solid #1f2937', borderRadius: 6, background: 'transparent', color: '#9ca3af', fontWeight: 700, fontSize: 12 },
  counterModeActive: { background: '#10b981', color: '#000', borderColor: '#10b981' },
  tapZone: { width: '100%', background: '#0f172a', border: '2px solid #1f2937', borderRadius: 12, padding: '40px 20px', textAlign: 'center', cursor: 'pointer' },
  tapCount: { fontFamily: '"JetBrains Mono", monospace', fontSize: 80, fontWeight: 700, color: '#10b981', lineHeight: 1 },
  tapLabel: { fontFamily: '"JetBrains Mono", monospace', fontSize: 12, color: '#9ca3af', marginTop: 8, letterSpacing: '0.2em' },
  counterRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1f2937' },
  counterKey: { fontSize: 14, fontWeight: 700, color: '#f3f4f6' },
  counterControls: { display: 'flex', alignItems: 'center', gap: 12 },
  counterBtn: { width: 36, height: 36, border: 'none', borderRadius: 6, background: '#1f2937', color: '#d1d5db', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  counterVal: { fontFamily: '"JetBrains Mono", monospace', fontSize: 22, fontWeight: 700, color: '#f3f4f6', minWidth: 40, textAlign: 'center' },
};
