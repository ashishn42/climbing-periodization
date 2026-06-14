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
          'Band pull-aparts — hold band at chest height with straight arms, pull apart horizontally until band touches chest squeezing shoulder blades together — 2 × 15',
          'Wall slides — stand with back flat against wall, arms in goalpost position; slide forearms up the wall overhead keeping wrists and elbows in contact throughout — 2 × 10',
          'Shoulder controlled articular rotations (CARs) — brace core and rotate arm in the largest circle possible, moving only at the shoulder joint; go slow and own every degree of range — 5 each direction',
          'Scapular push-ups — in plank with straight arms, retract shoulder blades (let chest sink between arms), then protract (push floor away); elbows stay locked the whole time — 2 × 10',
        ],
      },
      {
        heading: 'Circuit 1 · 3–4 rounds',
        items: [
          'Band bilateral external rotation — elbows bent 90° and pinned to sides, band between hands; rotate both forearms outward against band resistance, pause at end range — 8–12 reps',
          'PNF D2 flexion (sword draw) — start with hand near opposite hip, sweep diagonally up and across body to overhead rotating palm outward as you rise; reverse slowly — 8–12 reps',
          'Shoulder taps — in high plank, lift one hand and tap opposite shoulder while keeping hips square and still; alternate sides — 8–12 reps each side',
        ],
      },
      {
        heading: 'Circuit 2 · 3–4 rounds',
        items: [
          'Band standing angel — hold band behind back with arms straight at sides; pull band apart horizontally like a back-of-body pull-apart, squeezing rear delts and scapular retractors — 8–12 reps',
          'Lateral raises — stand with a light dumbbell in each hand at your sides; raise both arms straight out to the sides until they reach shoulder height, then lower slowly; do not shrug or swing — 10–12 reps',
          'Mountain victory pose — stand tall with arms raised in a wide V overhead, thumbs pointing behind you; hold briefly squeezing glutes and pulling shoulder blades down and together — 8–12 reps',
          'Plank rows — in plank with one hand gripping dumbbell on floor, row elbow to hip while resisting rotation; lower slowly — 8–12 reps each side',
        ],
      },
      {
        heading: 'Circuit 3 · 3–4 rounds',
        items: [
          'Single-leg low row — balance on one leg with slight hip hinge, row band or cable from low anchor to hip driving elbow back; keep shoulders down and spine neutral — 8–12 reps each side',
          'Goalpost press — arms at shoulder height with elbows bent 90° (goalpost position); press both arms straight overhead then return to goalpost; control the descent — 8–12 reps',
          'Plank thread-the-needle with weight — in side plank, hold weight in top hand; reach arm under body threading through the gap, then extend back up to ceiling rotating through thoracic spine — 8–12 reps each side',
        ],
      },
      {
        heading: 'Cool-down · ~5 min',
        items: [
          'Doorway pec stretch — stand in doorway with forearms on frame at 90°, lean body forward until you feel a stretch across the chest and front of shoulders — 30s each side',
          'Cross-body shoulder stretch — bring one arm straight across chest, use other hand to gently pull elbow toward you; feel the stretch in the back of the shoulder — 30s each side',
          'Sleeper stretch — lie on your side on the stretching arm with elbow bent 90°; use other hand to gently press forearm toward the floor, stretching the posterior shoulder capsule — 30s each side',
          'Child\'s pose with thread-the-needle — from child\'s pose with one arm extended, slide the other arm under your body along the floor until shoulder drops to ground; feel the thoracic rotation and shoulder opening — 30s each side',
          'Neck side stretch — gently tilt ear toward shoulder, relax jaw and let the weight of your head provide the stretch; stretches upper trap and scalene — 20s each side',
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
          'Band pull-aparts — hold band at chest height with straight arms, pull apart horizontally until band touches chest squeezing shoulder blades together — 15 reps',
          'Band bilateral external rotation (light band) — elbows bent 90° and pinned to sides; rotate both forearms outward against light band resistance, pause briefly at end range — 12 reps',
          'Lateral raises — light dumbbell in each hand; raise arms straight out to the sides to shoulder height, lower slowly; no shrugging — 10 reps',
          'Scapular push-ups — in plank with straight arms, retract then protract shoulder blades without bending elbows; serratus anterior focus — 10 reps',
          'Band standing angel (no weight) — hold band behind back with straight arms, pull apart horizontally squeezing rear delts; bodyweight version if no band available — 10 reps',
        ],
      },
      {
        heading: 'Cool-down',
        items: [
          'Doorway pec stretch — stand in doorway with forearms on frame at 90°, lean forward until you feel the stretch across chest and front of shoulders — 30s each side',
          'Neck side stretch — gently tilt ear toward shoulder, let the weight of your head provide the stretch; upper trap and scalene — 20s each side',
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
          'Arm circles — extend arms straight at shoulder height and make large controlled circles, forward then backward; loosen the shoulder capsule before loading — 20 each direction',
          'Scapular pull-ups (dead hang) — hang with arms fully straight; without bending elbows, depress and retract shoulder blades to lift body slightly, then release fully; activates serratus and lower traps — 2 × 5',
          'Band pull-aparts — hold band at chest height with straight arms, pull apart horizontally until band touches chest squeezing shoulder blades together — 2 × 15',
          'Incline / knee push-ups — hands elevated on bench or on knees; lower chest to surface keeping elbows at 45° from body, press back up; primes the push pattern without full load — 1 × 10',
        ],
      },
      {
        heading: 'Superset A · 4 rounds (rest 90s after each round)',
        items: [
          'Pull-ups — overhand grip shoulder-width apart; pull elbows down and back until chin clears bar, lower fully under control to a dead hang each rep — 6–8 reps',
          'Decline pushups (feet elevated) — feet on bench, hands on floor; lower chest toward floor keeping body rigid, press back up; foot elevation shifts emphasis to upper chest and anterior delt — 12–15 reps',
        ],
      },
      {
        heading: 'Superset B · 3 rounds (rest 90s after each round)',
        items: [
          'Chin-ups — underhand (supinated) grip shoulder-width apart; pull until chin clears bar, lower slowly; supinated grip recruits more bicep than pull-up — 6–8 reps',
          'Wide pushups — hands wider than shoulders; lower chest to floor with elbows flaring to the sides, press back up; wider stance increases pec stretch at bottom — 12–15 reps',
        ],
      },
      {
        heading: 'Diamond pushups · 3 × 10–12 (rest 60s)',
        items: [
          'Diamond pushups — hands together under chest forming a diamond shape with index fingers and thumbs; lower chest toward hands keeping elbows tracking close to body; isolates triceps and inner chest — 10–12 reps',
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
          'Pull-ups (or band-assisted) — overhand grip, pull elbows down until chin clears bar and lower fully; loop resistance band over bar and under knees to reduce effective bodyweight if needed — 4–6 reps',
          'Decline pushups — feet elevated on bench, hands on floor; lower chest under control and press back up — 8–10 reps',
        ],
      },
      {
        heading: 'Superset B · 2 rounds (rest 90s)',
        items: [
          'Chin-ups (or band-assisted) — underhand grip, pull until chin clears bar; use band for assistance the same way as pull-ups — 4–6 reps',
          'Wide pushups — hands wider than shoulders; lower chest to floor with elbows flaring, press back up — 8–10 reps',
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
          'World\'s greatest stretch — from a lunge, place same-side hand inside front foot; rotate top arm to ceiling opening chest, then thread it back down; cycles through hip flexor, thoracic spine, and groin — 5/side',
          'Cossack squats — stand with feet wide; shift weight to one side sinking into a deep lateral squat while keeping the other leg straight and foot flat; alternate sides; opens hips and loads single-leg stability — 8/side',
          '90/90 hip switches — sit with both knees bent at 90°, one in front and one to the side; rotate hips to flip both knees to the opposite 90/90; trains hip internal and external rotation actively — 8/side',
          'Glute bridges — lie on back with knees bent and feet flat; drive hips to ceiling squeezing glutes at top, lower slowly; keep ribs tucked and avoid hyperextending the lower back — 15 reps',
        ],
      },
      {
        heading: 'Power Primer · 3 min',
        items: [
          'Broad jump with stuck landing — athletic stance, swing arms back then explode forward jumping for maximum distance; land softly absorbing through hips and knees, freeze completely for 2 seconds before resetting; trains explosive hip extension and deceleration — 3 × 4 reps (rest 60s between sets)',
        ],
      },
      {
        heading: 'Strength Block',
        items: [
          'A1 · Bulgarian split squat — rear foot elevated on bench, front foot far enough forward that shin stays vertical at bottom; lower back knee toward floor, drive through front heel to stand; single-leg strength and hip stability — 4 × 8/leg · rest 30s → A2',
          'A2 · Single-leg RDL — stand on one leg with slight knee bend; hinge at hip sending torso forward and free leg behind, lower weight toward floor keeping spine neutral; feel hamstring load then drive hip forward to return — 4 × 8/leg · rest 90s → A1',
          'B1 · Copenhagen plank — side plank with top foot resting on a chair or bench; hold body in a rigid straight line from head to heel; adductor and lateral core anti-collapse hold — 3 × 20s/side · rest 30s → B2',
          'B2 · Tibialis raises — stand with heels on a step or against a wall, toes raised; lower toes toward the floor then dorsiflex (pull up) against gravity; strengthens tibialis anterior and protects knees — 3 × 15 · rest 90s → B1',
          'C1 · Single-leg calf raise (standing) — stand on one foot on edge of step with heel hanging off; lower heel below step level then rise up on toes as high as possible; full ankle range of motion — 3 × 15/leg · rest 60s',
          'C2 · Seated calf raise — seated with knees at 90° and weight resting on lower thighs; raise heels as high as possible then lower slowly; seated position isolates soleus rather than gastrocnemius — 3 × 20 · rest 60s',
        ],
      },
      {
        heading: 'Cool-down · 8 min (hold each 45–60s)',
        items: [
          'Pigeon stretch — from plank, bring one shin forward across body parallel to the front of your mat; extend rear leg straight back and sink hips toward floor; stretches glute med, glute min, and external hip rotators — 45–60s/side',
          'Couch stretch — kneel with rear shin resting up a wall or couch behind you, front foot on floor in lunge; drive hips forward and stand tall; intense stretch through hip flexor and quad of the rear leg — 45–60s/side',
          'Deep squat hold — feet shoulder-width, toes slightly out; sink into the deepest squat possible holding something for balance if needed; relaxes hips, ankles, and lower back progressively — 45–60s',
          'Seated straddle — sit with legs spread wide, fold forward between knees keeping spine long rather than rounding; feel adductors and hamstrings lengthen — 45–60s',
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
          'Bodyweight squats — feet shoulder-width, toes slightly out; sit back and down keeping chest tall and knees tracking over toes, stand by driving through heels — 2 × 15',
          'Walking lunges — step forward and lower back knee toward floor keeping front shin vertical; push off front foot to step through into next lunge — 2 × 8/side',
          'Glute bridges — lie on back with knees bent and feet flat; drive hips to ceiling squeezing glutes at top, lower slowly — 2 × 12',
        ],
      },
      {
        heading: 'Main · 2 rounds',
        items: [
          'Bulgarian split squat (bodyweight) — rear foot on bench, front foot forward; lower back knee toward floor, drive through front heel to stand; bodyweight only, focus on balance and depth — 8/leg',
          'Single-leg RDL (light) — balance on one leg, hinge at hip sending hands toward floor and free leg behind keeping spine neutral; return by driving hip forward — 8/leg',
          'Calf raises — both feet on edge of step with heels hanging; lower heels then rise up on toes as high as possible; slow controlled descent — 15 reps',
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
          'World\'s greatest stretch — from a lunge, place same-side hand inside front foot; rotate top arm to ceiling opening chest, then thread it back down; cycles through hip flexor, thoracic spine, and groin — 5/side',
          'Cossack squats — feet wide; shift weight to one side sinking into a deep lateral squat while the other leg stays straight; alternate sides; opens hips and loads single-leg stability — 8/side',
          '90/90 hip switches — sit with both knees at 90°, one in front and one to the side; rotate hips to flip both knees to the opposite 90/90; trains hip rotation actively — 8/side',
          'Glute bridges — lie on back with knees bent and feet flat; drive hips to ceiling squeezing glutes at top, lower slowly — 15 reps',
        ],
      },
      {
        heading: 'Power Primer · 3 min (emphasized)',
        items: [
          'Broad jump with stuck landing — explode forward for maximum distance, land softly absorbing through hips and knees, freeze for 2 seconds; this is the key power piece this phase — prioritize distance and landing quality — 3 × 4 reps (rest 60s between sets)',
        ],
      },
      {
        heading: 'Strength Block',
        items: [
          'A1 · Bulgarian split squat — rear foot elevated on bench, front foot far forward; lower back knee toward floor, drive through front heel; single-leg strength and hip stability — 4 × 8/leg · rest 30s → A2',
          'A2 · Single-leg RDL — hinge at hip sending torso forward and free leg behind, lower weight toward floor with neutral spine; drive hip forward to return — 4 × 8/leg · rest 90s → A1',
          'B1 · Copenhagen plank — side plank with top foot on bench; hold rigid straight line from head to heel; adductor and lateral core hold — 3 × 20s/side · rest 30s → B2',
          'B2 · Tibialis raises — heels on step or against wall, toes raised; lower then pull toes back up against gravity; strengthens tibialis anterior — 3 × 15 · rest 90s → B1',
          'C1 · Single-leg calf raise — one foot on step edge, heel hanging; lower heel below step then rise to toes; full ankle range — 3 × 15/leg · rest 60s',
          'C2 · Seated calf raise — seated at 90°, weight on thighs; raise heels high then lower slowly; isolates soleus — 3 × 20 · rest 60s',
        ],
      },
      {
        heading: 'Cool-down · 8 min',
        items: [
          'Pigeon stretch — shin forward across body, rear leg extended back; sink hips to floor stretching glute and external hip rotators — 45–60s/side',
          'Couch stretch — rear shin up against wall, front foot in lunge; drive hips forward to stretch hip flexor and quad — 45–60s/side',
          'Deep squat hold — sink into deepest squat possible, relax hips, ankles, and lower back progressively — 45–60s',
          'Seated straddle — legs spread wide, fold forward keeping spine long; stretches adductors and hamstrings — 45–60s',
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
          'Cat-cow — on hands and knees, exhale and round spine upward (cat), then inhale letting belly drop and chest lift (cow); move slowly through each vertebra — 8 slow reps',
          'Dead bug — lie on back, arms straight to ceiling, hips and knees at 90°; press lower back into floor and lower one arm overhead while extending the opposite leg toward floor simultaneously; return and switch — 2 × 8/side',
          'Glute bridge — lie on back with knees bent and feet flat; drive hips to ceiling squeezing glutes, lower slowly; keep ribs tucked and spine neutral — 2 × 10',
          'Bird dog — on hands and knees, extend one arm forward and opposite leg back simultaneously keeping hips perfectly level; hold briefly then return without rotating the spine — 2 × 6/side',
          'Dead hang — hang from bar with arms fully straight and shoulders relaxed to ears; let spine decompress; breathe and let the lats soften — 20s',
        ],
      },
      {
        heading: 'Main program',
        items: [
          'Toe-to-bar windshield wipers — hang from bar and raise straight legs to the bar; rotate both legs side to side like windshield wipers while keeping the upper body still; oblique and lat-core integration — 3 × 8/side',
          'Copenhagen plank with top-leg lift — side plank with top foot resting on a bench; lift the bottom leg up to meet it, hold briefly, then lower; adductor load added on top of lateral stability — 3 × 20s/side',
          'Single-arm hang with knee raise — hang from one arm; drive the same-side knee up toward chest in a controlled movement without swinging the body; anti-rotation core and grip strength — 3 × 5/side',
          'Single-leg RDL — stand on one leg with slight knee bend; hinge at hip sending torso forward and free leg behind, keeping spine neutral; feel the hamstring load then drive hip forward to return — 3 × 8/side',
          'Dragon flag (or regression) — lie on bench gripping uprights behind head; keeping body rigid from shoulders to feet, lower toward bench as slowly as possible then raise back up; regression: bend knees to tuck or use partial range — 3 × 5–8',
          'Hollow body hold — lie on back pressing lower back into floor; arms by ears and legs straight out low; hold this dish shape without letting the arch return to the lower back — 3 × 30s',
          'Front lever progression (optional) — from dead hang, raise body to horizontal with arms straight (or tuck/straddle/single-leg if needed); maintain hollow body tension throughout; very high lat and core demand — 4 × 8–12s',
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
          'Cobra / sphinx stretch — lie face down; press up onto hands (cobra) or forearms (sphinx) lifting chest while hips stay on floor; decompresses lumbar spine and stretches the anterior core — 30s',
          'Child\'s pose — kneel with big toes touching, sit back on heels and reach arms forward along the floor; let the spine lengthen and lower back open with gravity — 45s',
          'Supine spinal twist — lie on back and pull one knee across body toward the opposite side while keeping both shoulders flat on the floor; feel the thoracic and lumbar rotation release — 30s each side',
          'Figure-4 stretch — lie on back and cross one ankle over the opposite knee forming a figure-4; pull both legs toward chest until you feel a deep stretch in the glute and piriformis — 30s each side',
          'Hip flexor lunge stretch — low lunge with back knee on the floor; drive hips forward and stand tall while keeping core braced; targets psoas and hip flexors shortened from climbing — 30s each side',
          'Passive dead hang — hang from bar with full bodyweight, arms and shoulders completely relaxed; decompress the spine and let the shoulder girdle tractioned open — 30s',
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
          'Hollow body hold — lie on back pressing lower back into floor; arms by ears, legs straight and low; hold the dish shape without letting the lower back arch — 30s',
          'Dead bug — arms to ceiling, hips and knees at 90°; press lower back down and lower opposite arm and leg simultaneously, return and switch — 8/side',
          'Bird dog — on hands and knees, extend one arm forward and opposite leg back keeping hips level; return without rotating — 6/side',
          'Glute bridge — on back, knees bent and feet flat; drive hips to ceiling squeezing glutes, lower slowly — 10 reps',
        ],
      },
    ],
  },

  'Wrist': {
    title: 'Wrist Health',
    note: 'Light weight only. This is maintenance and injury prevention, not strength training. Stop if anything hurts.',
    sections: [
      {
        heading: 'Do this first · 2 min',
        items: [
          'Wrist circles — rest your forearm on your knee, hand hanging free; make slow full circles with your wrist clockwise then anticlockwise; go to the edge of your range without pain — 10 each direction',
        ],
      },
      {
        heading: 'Main · 2–3 rounds',
        items: [
          'Reverse wrist curl — forearm resting on knee, palm facing down, hold light weight; lower the weight by dropping your knuckles toward the floor, then curl the back of your hand up as high as it goes; this is the side climbers almost never train — 15 reps',
          'Wrist curl — same position, palm facing up now; lower the weight by letting it roll to your fingertips, then curl your palm up toward you — 15 reps',
          'Hammer rotation — hold a hammer or a dumbbell by its end so the weight is offset; forearm on knee, thumb pointing up; rotate your palm all the way down then all the way up, slow and controlled — 12 each direction',
          'Side to side tilt — same offset grip, thumb up; tilt the weight toward your thumb side (up), then toward your pinky side (down); full range, slow — 12 each direction',
        ],
      },
      {
        heading: 'Finish · 1 min',
        items: [
          'Finger splay with band — loop a rubber band around all five fingertips; slowly open your hand against the band as wide as you can, hold 1 second, close; balances out all the gripping from climbing — 15 reps',
        ],
      },
    ],
  },

  'Neck': {
    title: 'Neck — Easy',
    note: 'No heavy loading. Just fixing the damage from spending hours looking up at routes. Takes 3 minutes.',
    sections: [
      {
        heading: '3 minutes, no equipment',
        items: [
          'Chin tucks — sit or stand tall; slide your head straight back like you\'re trying to make a double chin, hold 5 seconds, release; undoes the forward head position you get from looking up at the wall all session — 10 reps',
          'Isometric press — place your palm against your forehead and push your head forward against your hand without letting it move; hold 10 seconds; repeat on the back of your head, then each side; strengthens the neck without any range of motion — 10s each direction',
          'Slow neck rotations — turn your head to look over one shoulder as far as comfortable, pause, come back through centre and look the other way; keep your shoulders still — 8 each side',
          'Neck circles — drop your chin to your chest and slowly roll your head in a half circle from shoulder to shoulder; do not roll all the way back; just the front half — 5 each direction',
        ],
      },
    ],
  },
};
