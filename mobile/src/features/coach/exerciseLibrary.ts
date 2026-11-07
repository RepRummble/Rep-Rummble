// The exercises the offline coach builds from. Every entry is tagged, so a plan can respect the equipment a person has,
// their experience, and anything that hurts. Pure data: no network, no AI.

export type Muscle = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'abs' | 'cardio';
export type Pattern = 'hpush' | 'vpush' | 'hpull' | 'vpull' | 'squat' | 'hinge' | 'lunge' | 'iso' | 'core' | 'carry' | 'cardio';
export type Gear = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'bar' | 'kettlebell' | 'band';
/** What a movement can aggravate. People tick what hurts and the coach avoids it. */
export type Stress = 'knee' | 'shoulder' | 'back' | 'wrist' | 'impact';
export type Kind = 'compound' | 'isolation';

export interface LibExercise {
  id: string; name: string; muscle: Muscle; pattern: Pattern; gear: Gear;
  /** 1 beginner, 2 intermediate, 3 advanced. */
  level: 1 | 2 | 3; kind: Kind; stress: Stress[]; tip: string;
  /** A hold or a timed effort: the number is seconds. */
  timed?: boolean;
}

const id = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
type O = { stress?: Stress[]; timed?: boolean };
const x = (name: string, muscle: Muscle, pattern: Pattern, gear: Gear, level: 1 | 2 | 3, kind: Kind, tip: string, o: O = {}): LibExercise =>
  ({ id: id(name), name, muscle, pattern, gear, level, kind, tip, stress: o.stress ?? [], timed: o.timed });
const C = 'compound' as const, I = 'isolation' as const;

export const LIBRARY: LibExercise[] = [
  // ── Chest ──
  x('Barbell Bench Press', 'chest', 'hpush', 'barbell', 2, C, 'Shoulder blades pinched, feet planted, lower to mid-chest.', { stress: ['shoulder'] }),
  x('Incline Barbell Bench Press', 'chest', 'hpush', 'barbell', 2, C, 'Bench at about 30 degrees. Press up and slightly back.', { stress: ['shoulder'] }),
  x('Dumbbell Bench Press', 'chest', 'hpush', 'dumbbell', 1, C, 'Lower until elbows are just below the bench, press up together.'),
  x('Incline Dumbbell Press', 'chest', 'hpush', 'dumbbell', 1, C, 'Keep wrists stacked over elbows.'),
  x('Machine Chest Press', 'chest', 'hpush', 'machine', 1, C, 'Seat height so the handles line up with mid-chest.'),
  x('Push-up', 'chest', 'hpush', 'bodyweight', 1, C, 'Body in one straight line, elbows about 45 degrees from the body.', { stress: ['wrist'] }),
  x('Incline Push-up', 'chest', 'hpush', 'bodyweight', 1, C, 'Hands on a bench or sturdy table. The easier push-up.', { stress: ['wrist'] }),
  x('Wall Push-up', 'chest', 'hpush', 'bodyweight', 1, C, 'Hands on a wall, body straight. The gentlest push-up.'),
  x('Decline Push-up', 'chest', 'hpush', 'bodyweight', 2, C, 'Feet raised. Keep your hips from sagging.', { stress: ['wrist', 'shoulder'] }),
  x('Archer Push-up', 'chest', 'hpush', 'bodyweight', 3, C, 'Shift your weight to one arm as you lower, the other arm stays straight.', { stress: ['wrist', 'shoulder'] }),
  x('Chest Dips', 'chest', 'hpush', 'bar', 2, C, 'Lean forward slightly and lower until your upper arms are parallel.', { stress: ['shoulder'] }),
  x('Band Chest Press', 'chest', 'hpush', 'band', 1, C, 'Anchor the band behind you and press straight out.'),
  x('Cable Fly', 'chest', 'iso', 'cable', 1, I, 'Slight bend in the elbows, hug an imaginary tree.'),
  x('Dumbbell Fly', 'chest', 'iso', 'dumbbell', 2, I, 'Wide arc, stop when you feel a stretch across the chest.', { stress: ['shoulder'] }),
  x('Pec Deck', 'chest', 'iso', 'machine', 1, I, 'Squeeze the handles together and pause.'),
  x('Band Chest Fly', 'chest', 'iso', 'band', 1, I, 'Arms wide, bring the band together in front of your chest.'),
  // ── Back ──
  x('Pull-up', 'back', 'vpull', 'bar', 2, C, 'Start from a full hang, lead with your chest to the bar.'),
  x('Chin-up', 'back', 'vpull', 'bar', 2, C, 'Palms toward you. Good for biceps too.'),
  x('Lat Pulldown', 'back', 'vpull', 'cable', 1, C, 'Pull the bar to your upper chest, elbows down and back.'),
  x('Weighted Pull-up', 'back', 'vpull', 'bar', 3, C, 'Same strict form, with weight added.'),
  x('Band Lat Pulldown', 'back', 'vpull', 'band', 1, C, 'Anchor high, kneel, and pull the band to your chest.'),
  x('Barbell Row', 'back', 'hpull', 'barbell', 2, C, 'Hinge forward, flat back, pull to your lower ribs.', { stress: ['back'] }),
  x('Seated Cable Row', 'back', 'hpull', 'cable', 1, C, 'Sit tall, pull the handle to your stomach, squeeze your shoulder blades.'),
  x('One-Arm Dumbbell Row', 'back', 'hpull', 'dumbbell', 1, C, 'Hand on a bench, pull the dumbbell toward your hip.'),
  x('Chest-Supported Row', 'back', 'hpull', 'machine', 1, C, 'Chest on the pad, pull elbows back.'),
  x('T-Bar Row', 'back', 'hpull', 'machine', 2, C, 'Keep your chest up and pull to your torso.', { stress: ['back'] }),
  x('Inverted Row', 'back', 'hpull', 'bar', 1, C, 'Body straight under a low bar, pull your chest to it.'),
  x('Kettlebell Row', 'back', 'hpull', 'kettlebell', 1, C, 'Flat back, pull the kettlebell toward your hip.'),
  x('Band Row', 'back', 'hpull', 'band', 1, C, 'Sit with the band around your feet, pull to your stomach.'),
  x('Superman', 'back', 'iso', 'bodyweight', 1, I, 'Lift arms and legs together, pause at the top.', { stress: ['back'] }),
  x('Reverse Snow Angel', 'back', 'iso', 'bodyweight', 1, I, 'Lie face down and sweep your arms from hips to overhead.'),
  x('Straight-Arm Pulldown', 'back', 'iso', 'cable', 2, I, 'Arms nearly straight, pull the bar to your thighs.'),
  x('Dumbbell Pullover', 'back', 'iso', 'dumbbell', 2, I, 'Lower the dumbbell behind your head, keep a slight elbow bend.', { stress: ['shoulder'] }),
  x('Back Extension', 'back', 'iso', 'bodyweight', 1, I, 'Hinge at the hips and rise to a straight line, not higher.', { stress: ['back'] }),
  // ── Shoulders ──
  x('Overhead Press', 'shoulders', 'vpush', 'barbell', 2, C, 'Squeeze your glutes, press straight up, head through at the top.', { stress: ['shoulder', 'back'] }),
  x('Dumbbell Shoulder Press', 'shoulders', 'vpush', 'dumbbell', 1, C, 'Press up and slightly in, do not arch your back.', { stress: ['shoulder'] }),
  x('Machine Shoulder Press', 'shoulders', 'vpush', 'machine', 1, C, 'Adjust the seat so the handles start at ear height.'),
  x('Arnold Press', 'shoulders', 'vpush', 'dumbbell', 2, C, 'Rotate your palms as you press.', { stress: ['shoulder'] }),
  x('Landmine Press', 'shoulders', 'vpush', 'barbell', 2, C, 'Press the bar end up and forward, friendlier on the shoulders.'),
  x('Kettlebell Press', 'shoulders', 'vpush', 'kettlebell', 1, C, 'Rack the bell, press straight up, wrist neutral.', { stress: ['shoulder'] }),
  x('Band Overhead Press', 'shoulders', 'vpush', 'band', 1, C, 'Stand on the band and press up.'),
  x('Pike Push-up', 'shoulders', 'vpush', 'bodyweight', 2, C, 'Hips high, lower the top of your head toward the floor.', { stress: ['wrist', 'shoulder'] }),
  x('Handstand Push-up', 'shoulders', 'vpush', 'bodyweight', 3, C, 'Against a wall, control the descent.', { stress: ['wrist', 'shoulder'] }),
  x('Dumbbell Lateral Raise', 'shoulders', 'iso', 'dumbbell', 1, I, 'Lead with your elbows to shoulder height, no swinging.'),
  x('Cable Lateral Raise', 'shoulders', 'iso', 'cable', 1, I, 'Constant tension all the way up.'),
  x('Band Lateral Raise', 'shoulders', 'iso', 'band', 1, I, 'Stand on the band, raise your arms out to the sides.'),
  x('Rear Delt Fly', 'shoulders', 'iso', 'dumbbell', 1, I, 'Hinge forward, open your arms like wings.'),
  x('Reverse Pec Deck', 'shoulders', 'iso', 'machine', 1, I, 'Chest on the pad, pull the handles back and apart.'),
  x('Face Pull', 'shoulders', 'iso', 'cable', 1, I, 'Pull to your face with elbows high, rotate your hands back.'),
  x('Band Pull-Apart', 'shoulders', 'iso', 'band', 1, I, 'Arms straight, pull the band apart to your chest.'),
  x('Dumbbell Front Raise', 'shoulders', 'iso', 'dumbbell', 1, I, 'Raise to eye level, no swinging.', { stress: ['shoulder'] }),
  x('Dumbbell Shrug', 'shoulders', 'iso', 'dumbbell', 1, I, 'Lift your shoulders straight up, pause, lower slowly.'),
  x('Prone Y Raise', 'shoulders', 'iso', 'bodyweight', 1, I, 'Lie face down, raise your arms in a Y.'),
  // ── Biceps ──
  x('Barbell Curl', 'biceps', 'iso', 'barbell', 1, I, 'Elbows pinned to your sides.'),
  x('Dumbbell Curl', 'biceps', 'iso', 'dumbbell', 1, I, 'Turn your palms up as you lift.'),
  x('Hammer Curl', 'biceps', 'iso', 'dumbbell', 1, I, 'Palms facing each other. Builds the forearm too.'),
  x('Incline Dumbbell Curl', 'biceps', 'iso', 'dumbbell', 2, I, 'Lie back on an incline bench for a deep stretch.'),
  x('Concentration Curl', 'biceps', 'iso', 'dumbbell', 1, I, 'Elbow against your inner thigh, slow and strict.'),
  x('Preacher Curl', 'biceps', 'iso', 'machine', 1, I, 'Arms on the pad, lower all the way down.'),
  x('Cable Curl', 'biceps', 'iso', 'cable', 1, I, 'Constant tension through the whole curl.'),
  x('Band Curl', 'biceps', 'iso', 'band', 1, I, 'Stand on the band and curl.'),
  x('Kettlebell Curl', 'biceps', 'iso', 'kettlebell', 1, I, 'Hold the horns of the bell and curl it up.'),
  // ── Triceps ──
  x('Triceps Pushdown', 'triceps', 'iso', 'cable', 1, I, 'Elbows pinned, push down until your arms are straight.'),
  x('Rope Pushdown', 'triceps', 'iso', 'cable', 1, I, 'Spread the rope at the bottom.'),
  x('Overhead Triceps Extension', 'triceps', 'iso', 'dumbbell', 1, I, 'Both hands on one dumbbell, lower behind your head.', { stress: ['shoulder'] }),
  x('Skull Crusher', 'triceps', 'iso', 'barbell', 2, I, 'Lower toward your forehead, elbows pointing up.'),
  x('Close-Grip Bench Press', 'triceps', 'hpush', 'barbell', 2, C, 'Hands shoulder-width, elbows tucked.', { stress: ['wrist'] }),
  x('Triceps Dips', 'triceps', 'vpush', 'bar', 2, C, 'Stay upright to load the triceps.', { stress: ['shoulder'] }),
  x('Bench Dip', 'triceps', 'vpush', 'bodyweight', 1, C, 'Hands on a bench behind you, lower until elbows reach 90 degrees.', { stress: ['shoulder', 'wrist'] }),
  x('Diamond Push-up', 'triceps', 'hpush', 'bodyweight', 2, C, 'Hands close together under your chest.', { stress: ['wrist'] }),
  x('Dumbbell Kickback', 'triceps', 'iso', 'dumbbell', 1, I, 'Upper arm still, straighten the elbow.'),
  x('Band Pushdown', 'triceps', 'iso', 'band', 1, I, 'Anchor the band high and push down.'),
  x('Kettlebell Overhead Extension', 'triceps', 'iso', 'kettlebell', 1, I, 'Lower the bell behind your head, extend.', { stress: ['shoulder'] }),
  // ── Quads ──
  x('Back Squat', 'quads', 'squat', 'barbell', 2, C, 'Bar on your upper back, sit down between your hips, drive up.', { stress: ['knee', 'back'] }),
  x('Front Squat', 'quads', 'squat', 'barbell', 3, C, 'Elbows high, torso upright.', { stress: ['knee', 'wrist'] }),
  x('Goblet Squat', 'quads', 'squat', 'dumbbell', 1, C, 'Hold the weight at your chest, squat deep with an upright torso.', { stress: ['knee'] }),
  x('Kettlebell Goblet Squat', 'quads', 'squat', 'kettlebell', 1, C, 'Hold the bell by the horns at your chest.', { stress: ['knee'] }),
  x('Leg Press', 'quads', 'squat', 'machine', 1, C, 'Feet shoulder-width, lower until your knees are about 90 degrees.', { stress: ['knee'] }),
  x('Hack Squat', 'quads', 'squat', 'machine', 2, C, 'Keep your back flat on the pad.', { stress: ['knee'] }),
  x('Bodyweight Squat', 'quads', 'squat', 'bodyweight', 1, C, 'Chest up, knees track over your toes.', { stress: ['knee'] }),
  x('Band Squat', 'quads', 'squat', 'band', 1, C, 'Stand on the band, hold it at your shoulders.', { stress: ['knee'] }),
  x('Pistol Squat', 'quads', 'squat', 'bodyweight', 3, C, 'Hold on to something at first. Slow and controlled.', { stress: ['knee'] }),
  x('Jump Squat', 'quads', 'squat', 'bodyweight', 2, C, 'Land softly with bent knees.', { stress: ['knee', 'impact'] }),
  x('Walking Lunge', 'quads', 'lunge', 'dumbbell', 1, C, 'Long steps, back knee just above the floor.', { stress: ['knee'] }),
  x('Reverse Lunge', 'quads', 'lunge', 'bodyweight', 1, C, 'Step back, lower, drive through your front heel. Easier on the knees than forward lunges.'),
  x('Split Squat', 'quads', 'lunge', 'bodyweight', 1, C, 'Stay in the split stance and lower straight down.', { stress: ['knee'] }),
  x('Bulgarian Split Squat', 'quads', 'lunge', 'dumbbell', 2, C, 'Back foot on a bench, lower straight down.', { stress: ['knee'] }),
  x('Step-Up', 'quads', 'lunge', 'dumbbell', 1, C, 'Step onto a bench and drive up with your front leg.'),
  x('Leg Extension', 'quads', 'iso', 'machine', 1, I, 'Pause at the top and lower slowly.', { stress: ['knee'] }),
  x('Wall Sit', 'quads', 'iso', 'bodyweight', 1, I, 'Back flat on the wall, thighs parallel to the floor.', { stress: ['knee'], timed: true }),
  // ── Hamstrings ──
  x('Romanian Deadlift', 'hamstrings', 'hinge', 'barbell', 2, C, 'Push your hips back, bar close to your legs, feel the hamstrings stretch.', { stress: ['back'] }),
  x('Dumbbell Romanian Deadlift', 'hamstrings', 'hinge', 'dumbbell', 1, C, 'Soft knees, hips back, flat back.', { stress: ['back'] }),
  x('Deadlift', 'hamstrings', 'hinge', 'barbell', 2, C, 'Bar over mid-foot, brace, push the floor away.', { stress: ['back'] }),
  x('Sumo Deadlift', 'hamstrings', 'hinge', 'barbell', 2, C, 'Wide stance, toes out, chest up.', { stress: ['back'] }),
  x('Good Morning', 'hamstrings', 'hinge', 'barbell', 3, C, 'Bar on your back, hinge forward with a flat back.', { stress: ['back'] }),
  x('Single-Leg Romanian Deadlift', 'hamstrings', 'hinge', 'dumbbell', 2, C, 'Hinge on one leg, back leg floats behind you.', { stress: ['back'] }),
  x('Kettlebell Deadlift', 'hamstrings', 'hinge', 'kettlebell', 1, C, 'Hips back, flat back, stand tall.', { stress: ['back'] }),
  x('Band Good Morning', 'hamstrings', 'hinge', 'band', 1, C, 'Band over your shoulders, hinge at the hips.'),
  x('Bodyweight Good Morning', 'hamstrings', 'hinge', 'bodyweight', 1, C, 'Hands behind your head, soft knees, hinge at the hips with a flat back.', { stress: ['back'] }),
  x('Hamstring Walkout', 'hamstrings', 'iso', 'bodyweight', 2, I, 'From a glute bridge, walk your feet out and back in with control.'),
  x('Lying Leg Curl', 'hamstrings', 'iso', 'machine', 1, I, 'Curl your heels to your glutes.'),
  x('Seated Leg Curl', 'hamstrings', 'iso', 'machine', 1, I, 'Slow and controlled on the way back.'),
  x('Nordic Curl', 'hamstrings', 'iso', 'bodyweight', 3, I, 'Anchor your feet and lower as slowly as you can.', { stress: ['knee'] }),
  x('Towel Hamstring Curl', 'hamstrings', 'iso', 'bodyweight', 2, I, 'Lie on your back with heels on a towel and slide them in and out.'),
  // ── Glutes ──
  x('Barbell Hip Thrust', 'glutes', 'hinge', 'barbell', 2, C, 'Upper back on a bench, drive your hips up, squeeze at the top.'),
  x('Dumbbell Hip Thrust', 'glutes', 'hinge', 'dumbbell', 1, C, 'Dumbbell on your hips, chin tucked.'),
  x('Glute Bridge', 'glutes', 'hinge', 'bodyweight', 1, C, 'Feet flat, drive your hips up, squeeze.'),
  x('Single-Leg Glute Bridge', 'glutes', 'hinge', 'bodyweight', 2, C, 'One foot on the floor, the other leg extended.'),
  x('Band Glute Bridge', 'glutes', 'hinge', 'band', 1, C, 'Band above your knees, push your knees out as you lift.'),
  x('Kettlebell Swing', 'glutes', 'hinge', 'kettlebell', 2, C, 'A hip hinge, not a squat. Snap your hips to float the bell.', { stress: ['back'] }),
  x('Cable Pull-Through', 'glutes', 'hinge', 'cable', 1, C, 'Hinge back and drive your hips forward.'),
  x('Sumo Squat', 'glutes', 'squat', 'dumbbell', 1, C, 'Wide stance, toes out, one dumbbell between your legs.', { stress: ['knee'] }),
  x('Curtsy Lunge', 'glutes', 'lunge', 'dumbbell', 2, C, 'Step back and across, lower with control.', { stress: ['knee'] }),
  x('Cable Kickback', 'glutes', 'iso', 'cable', 1, I, 'Kick straight back, squeeze, do not arch.'),
  x('Donkey Kick', 'glutes', 'iso', 'bodyweight', 1, I, 'On all fours, push one heel to the ceiling.'),
  x('Fire Hydrant', 'glutes', 'iso', 'bodyweight', 1, I, 'On all fours, lift your knee out to the side.'),
  x('Frog Pump', 'glutes', 'iso', 'bodyweight', 1, I, 'Soles together, knees out, lift your hips.'),
  x('Banded Lateral Walk', 'glutes', 'iso', 'band', 1, I, 'Stay low, step out to the side with tension on the band.'),
  x('Hip Abduction Machine', 'glutes', 'iso', 'machine', 1, I, 'Push your knees out against the pads.'),
  // ── Calves ──
  x('Standing Calf Raise', 'calves', 'iso', 'machine', 1, I, 'Full stretch at the bottom, pause at the top.'),
  x('Seated Calf Raise', 'calves', 'iso', 'machine', 1, I, 'Slow, full range.'),
  x('Dumbbell Calf Raise', 'calves', 'iso', 'dumbbell', 1, I, 'On a step, hold a dumbbell, rise onto your toes.'),
  x('Bodyweight Calf Raise', 'calves', 'iso', 'bodyweight', 1, I, 'On a step, full range, pause at the top.'),
  x('Single-Leg Calf Raise', 'calves', 'iso', 'bodyweight', 2, I, 'On one foot, hold a wall for balance.'),
  // ── Core ──
  x('Plank', 'abs', 'core', 'bodyweight', 1, I, 'Straight line from head to heels, squeeze your glutes.', { timed: true, stress: ['wrist'] }),
  x('Side Plank', 'abs', 'core', 'bodyweight', 1, I, 'Stack your feet, lift your hips, hold.', { timed: true, stress: ['wrist', 'shoulder'] }),
  x('Hollow Hold', 'abs', 'core', 'bodyweight', 2, I, 'Lower back pressed down, arms and legs long.', { timed: true }),
  x('Crunch', 'abs', 'core', 'bodyweight', 1, I, 'Curl your ribs toward your hips, no pulling on your neck.'),
  x('Cable Crunch', 'abs', 'core', 'cable', 1, I, 'Round your spine down, hips stay still.'),
  x('Bicycle Crunch', 'abs', 'core', 'bodyweight', 1, I, 'Slow rotation, elbow toward the opposite knee.'),
  x('Dead Bug', 'abs', 'core', 'bodyweight', 1, I, 'Lower back flat, move opposite arm and leg slowly.'),
  x('Bird Dog', 'abs', 'core', 'bodyweight', 1, I, 'Opposite arm and leg out, hold, stay level.'),
  x('Russian Twist', 'abs', 'core', 'bodyweight', 1, I, 'Lean back slightly, rotate your torso side to side.'),
  x('Lying Leg Raise', 'abs', 'core', 'bodyweight', 1, I, 'Press your lower back down and lower with control.', { stress: ['back'] }),
  x('Hanging Knee Raise', 'abs', 'core', 'bar', 2, I, 'Hang from a bar and lift your knees to your chest.'),
  x('Hanging Leg Raise', 'abs', 'core', 'bar', 3, I, 'Straight legs up, no swinging.', { stress: ['back'] }),
  x('V-up', 'abs', 'core', 'bodyweight', 2, I, 'Reach hands to feet at the top.'),
  x('Pallof Press', 'abs', 'core', 'cable', 1, I, 'Press the handle straight out and resist the rotation.'),
  x('Band Pallof Press', 'abs', 'core', 'band', 1, I, 'Anchor the band at your side, press out and resist.'),
  x('Cable Woodchop', 'abs', 'core', 'cable', 1, I, 'Rotate from your torso, hips and arms follow.'),
  x('Farmer’s Carry', 'abs', 'carry', 'dumbbell', 1, C, 'Walk tall with heavy dumbbells, shoulders back.'),
  x('Suitcase Carry', 'abs', 'carry', 'kettlebell', 1, C, 'One heavy bell in one hand, do not lean.'),
  // ── Conditioning ──
  x('Burpee', 'cardio', 'cardio', 'bodyweight', 2, C, 'Chest to the floor, jump up, clap.', { stress: ['impact', 'wrist', 'knee'] }),
  x('Jumping Jacks', 'cardio', 'cardio', 'bodyweight', 1, C, 'Land softly, keep a steady rhythm.', { timed: true, stress: ['impact'] }),
  x('High Knees', 'cardio', 'cardio', 'bodyweight', 1, C, 'Drive your knees up fast, pump your arms.', { timed: true, stress: ['impact'] }),
  x('Mountain Climber', 'cardio', 'cardio', 'bodyweight', 1, C, 'Plank position, drive your knees in fast.', { timed: true, stress: ['wrist'] }),
  x('Skater Hops', 'cardio', 'cardio', 'bodyweight', 2, C, 'Bound side to side, land on one foot.', { timed: true, stress: ['impact', 'knee'] }),
  x('Shadow Boxing', 'cardio', 'cardio', 'bodyweight', 1, C, 'Light on your feet, punch and move.', { timed: true }),
  x('Fast Walk or Jog on the Spot', 'cardio', 'cardio', 'bodyweight', 1, C, 'Keep it moving at a pace where you can still talk.', { timed: true }),
  x('Rowing Machine', 'cardio', 'cardio', 'machine', 1, C, 'Legs, then back, then arms. Smooth strokes.', { timed: true }),
  x('Stationary Bike', 'cardio', 'cardio', 'machine', 1, C, 'Steady pace, or hard-easy intervals.', { timed: true }),
  x('Treadmill Incline Walk', 'cardio', 'cardio', 'machine', 1, C, 'Incline up, no holding on.', { timed: true }),
  x('Kettlebell Clean and Press', 'cardio', 'cardio', 'kettlebell', 2, C, 'Clean the bell to the rack, press overhead.', { stress: ['shoulder'] }),
  x('Band Sprint in Place', 'cardio', 'cardio', 'band', 1, C, 'Band around your thighs, run in place with high knees.', { timed: true, stress: ['impact'] }),
];

export const ALL_MUSCLES: Muscle[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs', 'cardio'];
export const byName = new Map(LIBRARY.map((e) => [e.name.toLowerCase(), e]));

export const MUSCLE_LABEL: Record<Muscle, string> = { chest: 'Chest', back: 'Back', shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps', quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves', abs: 'Abs and core', cardio: 'Conditioning' };

/** Which equipment a person can use, from what they told the coach. Calisthenics assumes a pull-up bar. */
export function allowedGear(equipment: string, bodyStyle?: string): Gear[] {
  if (bodyStyle === 'calisthenics') return ['bodyweight', 'bar'];
  switch (equipment) {
    case 'dumbbells': return ['dumbbell', 'bodyweight'];
    case 'home_bodyweight': return ['bodyweight'];
    case 'kettlebell_bands': return ['kettlebell', 'band', 'bodyweight'];
    default: return ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'bar', 'kettlebell', 'band'];
  }
}

/** Words people use for muscles, mapped to ours (the AI says "lats" or "quadriceps"). */
export function normalizeMuscle(text: string | undefined): Muscle | null {
  const t = (text ?? '').toLowerCase();
  if (!t) return null;
  const table: [RegExp, Muscle][] = [
    [/chest|pec/, 'chest'], [/lat|back|trap|rhomboid/, 'back'], [/shoulder|delt/, 'shoulders'], [/bicep/, 'biceps'], [/tricep/, 'triceps'],
    [/quad|thigh/, 'quads'], [/hamstring/, 'hamstrings'], [/glute|hip/, 'glutes'], [/calf|calves/, 'calves'], [/abs|core|oblique|abdom/, 'abs'], [/cardio|conditioning/, 'cardio'],
  ];
  return table.find(([r]) => r.test(t))?.[1] ?? null;
}
