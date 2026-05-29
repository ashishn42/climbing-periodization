// S&C workout details sourced from "Training All Workouts.pdf"
// Each entry maps to an S&C block name in the plan.

export const SC_WORKOUTS = {
  'Shoulder': {
    title: 'Shoulder Circuit Training',
    note: 'Posterior-cuff and scapular dominant. 3–4 rounds per circuit, 8–12 reps each.',
    sections: [
      {
        heading: 'Warm-up · ~5 min',
        items: [
          'Band pull-aparts — 2 × 15',
          'Wall slides — 2 × 10',
          'Shoulder CARs (controlled circles) — 5 each direction',
          'Scapular push-ups — 2 × 10',
        ],
      },
      {
        heading: 'Circuit 1 · 3–4 rounds',
        items: [
          'Bilateral ER — 8–12 reps',
          'D2 flexion — 8–12 reps',
          'Shoulder taps — 8–12 reps',
        ],
      },
      {
        heading: 'Circuit 2 · 3–4 rounds',
        items: [
          'Standing angel — 8–12 reps',
          'MVP — 8–12 reps',
          'Plank rows — 8–12 reps',
        ],
      },
      {
        heading: 'Circuit 3 · 3–4 rounds',
        items: [
          'SLB low row — 8–12 reps',
          'Goalpost press — 8–12 reps',
          'Plank thread-the-needle with weight — 8–12 reps',
        ],
      },
      {
        heading: 'Cool-down · ~5 min',
        items: [
          'Doorway pec stretch — 30s each side',
          'Cross-body shoulder stretch — 30s each side',
          'Sleeper stretch (internal rotation) — 30s each side',
          'Child\'s pose with thread-the-needle — 30s each side',
          'Neck side stretch — 20s each side',
        ],
      },
    ],
  },

  'Shoulder (light)': {
    title: 'Shoulder — Maintenance',
    note: 'Band work only. Maintenance volume — no loading.',
    sections: [
      {
        heading: 'Circuit · 2 rounds',
        items: [
          'Band pull-aparts — 15 reps',
          'Bilateral ER (light band) — 12 reps',
          'Scapular push-ups — 10 reps',
          'Standing angel (no weight) — 10 reps',
        ],
      },
      {
        heading: 'Cool-down',
        items: [
          'Doorway pec stretch — 30s each side',
          'Neck side stretch — 20s each side',
        ],
      },
    ],
  },

  'Push + Pull': {
    title: 'Pushup + Pullup Workout',
    note: 'Pull-ups first while fresh. Move directly from pull to push within each superset; rest only after the pair.',
    sections: [
      {
        heading: 'Warm-up · ~5 min',
        items: [
          'Arm circles — 20 each direction',
          'Scapular pull-ups (dead hang) — 2 × 5',
          'Band pull-aparts — 2 × 15',
          'Incline / knee push-ups — 1 × 10',
        ],
      },
      {
        heading: 'Superset A · 4 rounds (rest 90s after each round)',
        items: [
          'Pull-ups — 6–8 reps',
          'Decline pushups (feet elevated) — 12–15 reps',
        ],
      },
      {
        heading: 'Superset B · 3 rounds (rest 90s after each round)',
        items: [
          'Chin-ups — 6–8 reps',
          'Wide pushups — 12–15 reps',
        ],
      },
      {
        heading: 'Diamond pushups · 3 × 10–12 (rest 60s)',
        items: [
          'Diamond pushups — 10–12 reps',
        ],
      },
    ],
  },

  'Push + Pull (light)': {
    title: 'Push + Pull — Maintenance',
    note: 'Maintenance only. Reduce volume and load. Keep movement quality.',
    sections: [
      {
        heading: 'Superset A · 2 rounds (rest 90s)',
        items: [
          'Pull-ups (or band-assisted) — 4–6 reps',
          'Decline pushups — 8–10 reps',
        ],
      },
      {
        heading: 'Superset B · 2 rounds (rest 90s)',
        items: [
          'Chin-ups (or band-assisted) — 4–6 reps',
          'Wide pushups — 8–10 reps',
        ],
      },
    ],
  },

  'Legs': {
    title: 'Streamlined Leg Day',
    note: 'Superset A and B — do A1, rest 30s, do A2, rest 90s, repeat. C pairs run straight (no superset).',
    sections: [
      {
        heading: 'Warm-up / Mobility · 8 min',
        items: [
          'World\'s greatest stretch — 5/side',
          'Cossack squats — 8/side',
          '90/90 hip switches — 8/side',
          'Glute bridges — 15 reps',
        ],
      },
      {
        heading: 'Power Primer · 3 min',
        items: [
          'Broad jump with stuck landing — 3 × 4 reps (land soft, freeze 2s, rest 60s between sets)',
        ],
      },
      {
        heading: 'Strength Block',
        items: [
          'A1 — Bulgarian split squat · 4 × 8/leg · rest 30s → A2',
          'A2 — Single-leg RDL · 4 × 8/leg · rest 90s → A1',
          'B1 — Copenhagen plank · 3 × 20s/side · rest 30s → B2',
          'B2 — Tibialis raises · 3 × 15 · rest 90s → B1',
          'C1 — Single-leg calf raise (standing) · 3 × 15/leg · rest 60s',
          'C2 — Seated calf raise · 3 × 20 · rest 60s',
        ],
      },
      {
        heading: 'Cool-down · 8 min (hold each 45–60s)',
        items: [
          'Pigeon — glute med/min, external rotators',
          'Couch stretch — hip flexors, quads',
          'Deep squat hold — full hip/knee/ankle range',
          'Seated straddle — adductors, hamstrings',
        ],
      },
    ],
  },

  'Legs (light)': {
    title: 'Legs — Maintenance',
    note: 'Light, controlled. Supports climbing rather than competing with it.',
    sections: [
      {
        heading: 'Warm-up · 5 min',
        items: [
          'Bodyweight squats — 2 × 15',
          'Walking lunges — 2 × 8/side',
          'Glute bridges — 2 × 12',
        ],
      },
      {
        heading: 'Main · 2 rounds',
        items: [
          'Bulgarian split squat (bodyweight) — 8/leg',
          'Single-leg RDL (light) — 8/leg',
          'Calf raises — 15 reps',
        ],
      },
    ],
  },

  'Legs (with jumps)': {
    title: 'Streamlined Leg Day — Power Phase',
    note: 'Same structure as standard leg day. Power primer emphasized. Broad jumps are the key piece.',
    sections: [
      {
        heading: 'Warm-up / Mobility · 8 min',
        items: [
          'World\'s greatest stretch — 5/side',
          'Cossack squats — 8/side',
          '90/90 hip switches — 8/side',
          'Glute bridges — 15 reps',
        ],
      },
      {
        heading: 'Power Primer · 3 min (emphasized)',
        items: [
          'Broad jump with stuck landing — 3 × 4 reps (max distance, freeze 2s, rest 60s)',
        ],
      },
      {
        heading: 'Strength Block',
        items: [
          'A1 — Bulgarian split squat · 4 × 8/leg · rest 30s → A2',
          'A2 — Single-leg RDL · 4 × 8/leg · rest 90s → A1',
          'B1 — Copenhagen plank · 3 × 20s/side · rest 30s → B2',
          'B2 — Tibialis raises · 3 × 15 · rest 90s → B1',
          'C1 — Single-leg calf raise · 3 × 15/leg · rest 60s',
          'C2 — Seated calf raise · 3 × 20 · rest 60s',
        ],
      },
      {
        heading: 'Cool-down · 8 min',
        items: [
          'Pigeon — 45–60s/side',
          'Couch stretch — 45–60s/side',
          'Deep squat hold — 45–60s',
          'Seated straddle — 45–60s',
        ],
      },
    ],
  },

  'Core + lower back': {
    title: 'Climbing Core Program',
    note: 'Knee-safe, minimal equipment. Skip the day before a hard project — lat-heavy work can carry over.',
    sections: [
      {
        heading: 'Warm-up · ~5 min',
        items: [
          'Cat-cow — 8 slow reps',
          'Dead bug — 2 × 8/side',
          'Glute bridge — 2 × 10',
          'Bird dog — 2 × 6/side',
          'Dead hang — 20s',
        ],
      },
      {
        heading: 'Main program',
        items: [
          'Toe-to-bar windshield wipers — 3 × 8/side',
          'Copenhagen plank w/ top-leg lift — 3 × 20s/side',
          'Single-arm hang with knee raise — 3 × 5/side',
          'Single-leg RDL — 3 × 8/side',
          'Dragon flag (or regression) — 3 × 5–8',
          'Hollow body hold — 3 × 30s',
          'Front lever progression (optional) — 4 × 8–12s',
        ],
      },
      {
        heading: 'Cues',
        items: [
          'Shoulders engaged and pulled down on every hang',
          'Ribs tucked — no banana body on levers or hangs',
          'On leg raises: pull the bar down to your feet (lat-core link)',
          'Slow eccentrics, exhale at peak',
          'Stop a set before failure on hangs',
        ],
      },
      {
        heading: 'Cool-down · ~5 min',
        items: [
          'Cobra / sphinx stretch — 30s',
          'Child\'s pose — 45s',
          'Supine spinal twist — 30s each side',
          'Figure-4 stretch (glute) — 30s each side',
          'Hip flexor lunge stretch — 30s each side',
          'Passive dead hang — 30s',
        ],
      },
    ],
  },

  'Core (light)': {
    title: 'Core — Maintenance',
    note: 'Light maintenance. No lat-heavy movements the night before a project.',
    sections: [
      {
        heading: 'Main · 2 rounds',
        items: [
          'Hollow body hold — 30s',
          'Dead bug — 8/side',
          'Bird dog — 6/side',
          'Glute bridge — 10 reps',
        ],
      },
    ],
  },
};
