// Public catalog of the training content members get in the app.
// Everything here is original Reprummble content. When an exercise has its own
// licensed or self-recorded demo, set `videoUrl` (and optionally `posterUrl`).

export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Equipment = 'none' | 'dumbbells' | 'bands' | 'gym';
export type Focus = 'full-body' | 'upper' | 'lower' | 'core' | 'cardio' | 'mobility';
export type Muscle =
  | 'chest' | 'back' | 'shoulders' | 'arms' | 'core'
  | 'glutes' | 'quads' | 'hamstrings' | 'calves' | 'hip-flexors';

export interface Exercise {
  slug: string;
  name: string;
  primary: Muscle;
  muscles: Muscle[];
  equipment: Equipment;
  level: Level;
  steps: string[];
  tips: string[];
  easier?: string;
  harder?: string;
  videoUrl?: string;
  posterUrl?: string;
}

export interface WorkoutMove {
  exercise: string; // Exercise slug
  reps?: string;
  seconds?: number;
}

export interface Workout {
  slug: string;
  name: string;
  focus: Focus;
  level: Level;
  equipment: Equipment;
  minutes: number;
  format: 'circuit' | 'sets' | 'intervals';
  rounds: number;
  restSeconds: number;
  summary: string;
  moves: WorkoutMove[];
  pro?: boolean;
}

export interface Program {
  slug: string;
  name: string;
  goal: string;
  level: Level;
  equipment: Equipment;
  weeks: number;
  summary: string;
  week: { day: string; workout?: string }[]; // workout slug, or a rest/active-recovery day
  phases: { weeks: string; title: string; detail: string }[];
  pro?: boolean;
}

export interface Challenge {
  slug: string;
  name: string;
  days: number;
  focus: Focus;
  level: Level;
  summary: string;
  exercise: string; // Exercise slug
  unit: 'reps' | 'seconds';
  start: number;
  end: number;
  restEvery: number; // every Nth day is a rest day
}

export const LEVELS: Record<Level, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const EQUIPMENT: Record<Equipment, string> = {
  none: 'No equipment',
  dumbbells: 'Dumbbells',
  bands: 'Resistance bands',
  gym: 'Full gym',
};

export const FOCUS: Record<Focus, string> = {
  'full-body': 'Full body',
  upper: 'Upper body',
  lower: 'Lower body',
  core: 'Core',
  cardio: 'Cardio & HIIT',
  mobility: 'Mobility',
};

export const MUSCLES: Record<Muscle, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  core: 'Core & abs',
  glutes: 'Glutes',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
  'hip-flexors': 'Hip flexors',
};

export const EXERCISES: Exercise[] = [
  // Chest
  {
    slug: 'push-up', name: 'Push-up', primary: 'chest', muscles: ['chest', 'shoulders', 'arms', 'core'], equipment: 'none', level: 'beginner',
    steps: ['Start in a high plank, hands slightly wider than shoulders.', 'Brace your core so your body forms one straight line.', 'Lower your chest until it is a fist-height from the floor.', 'Press the floor away to return to the top.'],
    tips: ['Keep elbows about 45° from your body, not flared out.', 'Do not let your hips sag or pike up.'],
    easier: 'Hands on a bench or wall (incline push-up).', harder: 'Feet elevated or add a 3-second lowering phase.',
  },
  {
    slug: 'incline-push-up', name: 'Incline push-up', primary: 'chest', muscles: ['chest', 'shoulders', 'arms'], equipment: 'none', level: 'beginner',
    steps: ['Place hands on a sturdy bench, table, or step.', 'Walk feet back until your body is straight.', 'Lower your chest to the edge.', 'Push back up, keeping your core tight.'],
    tips: ['The higher the surface, the easier the move.', 'Move slowly — control beats speed.'],
    harder: 'Use a lower surface until you reach the floor.',
  },
  {
    slug: 'dumbbell-floor-press', name: 'Dumbbell floor press', primary: 'chest', muscles: ['chest', 'arms', 'shoulders'], equipment: 'dumbbells', level: 'beginner',
    steps: ['Lie on your back, knees bent, a dumbbell in each hand.', 'Start with upper arms on the floor, elbows at about 45°.', 'Press both dumbbells up until arms are straight.', 'Lower until your upper arms lightly touch the floor.'],
    tips: ['Pause briefly with elbows on the floor — no bouncing.', 'Keep wrists stacked over elbows.'],
  },
  {
    slug: 'dumbbell-bench-press', name: 'Dumbbell bench press', primary: 'chest', muscles: ['chest', 'shoulders', 'arms'], equipment: 'gym', level: 'intermediate',
    steps: ['Lie on a flat bench with feet planted.', 'Hold dumbbells above your chest, palms forward.', 'Lower them to the sides of your chest under control.', 'Press back up and slightly together.'],
    tips: ['Keep shoulder blades pulled back into the bench.', 'Do not let the weights drift over your face.'],
  },
  // Back
  {
    slug: 'superman', name: 'Superman hold', primary: 'back', muscles: ['back', 'glutes'], equipment: 'none', level: 'beginner',
    steps: ['Lie face down with arms stretched overhead.', 'Lift arms, chest, and legs a few inches off the floor.', 'Hold, squeezing your glutes and upper back.', 'Lower slowly and repeat.'],
    tips: ['Look at the floor to keep your neck neutral.', 'Small lift, strong squeeze — height is not the goal.'],
  },
  {
    slug: 'dumbbell-row', name: 'Single-arm dumbbell row', primary: 'back', muscles: ['back', 'arms'], equipment: 'dumbbells', level: 'beginner',
    steps: ['Hinge forward with one hand on a bench or your knee.', 'Let the dumbbell hang straight down.', 'Pull it toward your hip, leading with your elbow.', 'Lower slowly until your arm is straight.'],
    tips: ['Keep your back flat and hips square.', 'Think “elbow to back pocket”, not “hand to chest”.'],
  },
  {
    slug: 'band-pull-apart', name: 'Band pull-apart', primary: 'back', muscles: ['back', 'shoulders'], equipment: 'bands', level: 'beginner',
    steps: ['Hold a band in front of you at shoulder height, arms straight.', 'Pull the band apart until it touches your chest.', 'Squeeze your shoulder blades together.', 'Return slowly to the start.'],
    tips: ['Keep ribs down — do not arch your lower back.', 'Great as a warm-up before pushing exercises.'],
  },
  {
    slug: 'pull-up', name: 'Pull-up', primary: 'back', muscles: ['back', 'arms', 'core'], equipment: 'gym', level: 'advanced',
    steps: ['Hang from a bar with hands just outside shoulder width.', 'Pull your shoulder blades down and back.', 'Pull until your chin clears the bar.', 'Lower all the way to a full hang.'],
    tips: ['Avoid swinging — keep legs still and core braced.', 'Every rep starts from a full hang.'],
    easier: 'Band-assisted or negative-only pull-ups.',
  },
  // Shoulders
  {
    slug: 'pike-push-up', name: 'Pike push-up', primary: 'shoulders', muscles: ['shoulders', 'arms'], equipment: 'none', level: 'intermediate',
    steps: ['Start in a downward-dog position, hips high.', 'Bend your elbows to lower the top of your head toward the floor.', 'Stop just before your head touches.', 'Press back up to straight arms.'],
    tips: ['Keep hips high to load the shoulders, not the chest.', 'Elbows track back, not straight out.'],
  },
  {
    slug: 'dumbbell-shoulder-press', name: 'Dumbbell shoulder press', primary: 'shoulders', muscles: ['shoulders', 'arms', 'core'], equipment: 'dumbbells', level: 'beginner',
    steps: ['Stand tall with dumbbells at shoulder height, palms forward.', 'Brace your core and squeeze your glutes.', 'Press the weights overhead until arms are straight.', 'Lower back to shoulder height with control.'],
    tips: ['Do not lean back to finish the rep.', 'Biceps finish next to your ears.'],
  },
  {
    slug: 'lateral-raise', name: 'Lateral raise', primary: 'shoulders', muscles: ['shoulders'], equipment: 'dumbbells', level: 'beginner',
    steps: ['Stand with light dumbbells at your sides.', 'With a slight bend in the elbows, raise arms out to the sides.', 'Stop at shoulder height.', 'Lower slowly over two to three seconds.'],
    tips: ['Use a lighter weight than you think.', 'Lead with elbows, not hands.'],
  },
  // Arms
  {
    slug: 'bicep-curl', name: 'Bicep curl', primary: 'arms', muscles: ['arms'], equipment: 'dumbbells', level: 'beginner',
    steps: ['Stand with dumbbells at your sides, palms forward.', 'Keep elbows pinned to your sides.', 'Curl the weights up toward your shoulders.', 'Lower all the way down slowly.'],
    tips: ['No swinging — if you need momentum, go lighter.', 'Squeeze at the top for one second.'],
  },
  {
    slug: 'bench-dip', name: 'Bench dip', primary: 'arms', muscles: ['arms', 'shoulders', 'chest'], equipment: 'none', level: 'beginner',
    steps: ['Sit on the edge of a bench or chair, hands next to your hips.', 'Slide forward so your hips are off the seat.', 'Bend your elbows to lower your hips toward the floor.', 'Press back up to straight arms.'],
    tips: ['Keep your back close to the bench.', 'Stop at about 90° at the elbow.'],
    easier: 'Bend your knees and keep feet close.', harder: 'Straighten your legs or elevate your feet.',
  },
  {
    slug: 'diamond-push-up', name: 'Diamond push-up', primary: 'arms', muscles: ['arms', 'chest'], equipment: 'none', level: 'intermediate',
    steps: ['Start in a high plank with hands together under your chest, forming a diamond.', 'Lower your chest toward your hands.', 'Keep elbows close to your sides.', 'Press back up.'],
    tips: ['Do these from your knees if form breaks down.'],
  },
  // Core
  {
    slug: 'plank', name: 'Forearm plank', primary: 'core', muscles: ['core', 'shoulders'], equipment: 'none', level: 'beginner',
    steps: ['Rest on forearms with elbows under shoulders.', 'Extend legs behind you, toes on the floor.', 'Squeeze glutes and brace as if about to be poked in the stomach.', 'Hold, breathing steadily.'],
    tips: ['Straight line from head to heels.', 'Quality over time — stop when your hips drop.'],
    easier: 'Knees on the floor.', harder: 'Lift one foot, or reach one arm forward.',
  },
  {
    slug: 'side-plank', name: 'Side plank', primary: 'core', muscles: ['core', 'glutes', 'shoulders'], equipment: 'none', level: 'intermediate',
    steps: ['Lie on your side, forearm under your shoulder.', 'Stack your feet and lift your hips.', 'Form a straight line from head to feet.', 'Hold, then switch sides.'],
    tips: ['Push the floor away with your forearm.', 'Do not let your top hip roll forward.'],
  },
  {
    slug: 'dead-bug', name: 'Dead bug', primary: 'core', muscles: ['core', 'hip-flexors'], equipment: 'none', level: 'beginner',
    steps: ['Lie on your back, arms up, knees bent at 90° over hips.', 'Press your lower back into the floor.', 'Slowly extend the opposite arm and leg toward the floor.', 'Return and switch sides.'],
    tips: ['Your lower back must stay flat the whole time.', 'Move slowly and exhale as you extend.'],
  },
  {
    slug: 'bicycle-crunch', name: 'Bicycle crunch', primary: 'core', muscles: ['core', 'hip-flexors'], equipment: 'none', level: 'beginner',
    steps: ['Lie on your back, hands lightly behind your head.', 'Lift shoulders and feet off the floor.', 'Bring one elbow toward the opposite knee as the other leg extends.', 'Switch sides in a slow pedalling motion.'],
    tips: ['Rotate through your ribs, not your elbows.', 'Do not pull on your neck.'],
  },
  {
    slug: 'mountain-climber', name: 'Mountain climber', primary: 'core', muscles: ['core', 'shoulders', 'hip-flexors', 'quads'], equipment: 'none', level: 'beginner',
    steps: ['Start in a high plank.', 'Drive one knee toward your chest.', 'Quickly switch legs, like running in place.', 'Keep your hips level throughout.'],
    tips: ['Shoulders stay over wrists.', 'Slow it down to make it a core exercise; speed it up for cardio.'],
  },
  // Glutes
  {
    slug: 'glute-bridge', name: 'Glute bridge', primary: 'glutes', muscles: ['glutes', 'hamstrings', 'core'], equipment: 'none', level: 'beginner',
    steps: ['Lie on your back, knees bent, feet flat and hip-width apart.', 'Press through your heels to lift your hips.', 'Squeeze your glutes at the top.', 'Lower slowly.'],
    tips: ['Ribs down — do not over-arch your lower back.', 'Pause for one second at the top.'],
    harder: 'Single-leg bridge, or a dumbbell on your hips.',
  },
  {
    slug: 'hip-thrust', name: 'Dumbbell hip thrust', primary: 'glutes', muscles: ['glutes', 'hamstrings'], equipment: 'dumbbells', level: 'intermediate',
    steps: ['Sit with upper back against a bench, dumbbell on your hips.', 'Plant feet hip-width apart.', 'Drive hips up until your torso is parallel to the floor.', 'Lower under control.'],
    tips: ['Shins should be vertical at the top.', 'Tuck your chin slightly and look forward.'],
  },
  {
    slug: 'band-lateral-walk', name: 'Banded lateral walk', primary: 'glutes', muscles: ['glutes'], equipment: 'bands', level: 'beginner',
    steps: ['Place a mini band just above your knees.', 'Sit into a quarter squat.', 'Step sideways, keeping tension on the band.', 'Take equal steps in both directions.'],
    tips: ['Keep toes pointing forward.', 'Do not let your knees cave inward.'],
  },
  // Quads
  {
    slug: 'squat', name: 'Bodyweight squat', primary: 'quads', muscles: ['quads', 'glutes', 'hamstrings', 'core'], equipment: 'none', level: 'beginner',
    steps: ['Stand with feet shoulder-width apart, toes slightly out.', 'Push hips back and bend knees.', 'Lower until thighs are at least parallel to the floor.', 'Drive through your whole foot to stand.'],
    tips: ['Knees follow the direction of your toes.', 'Keep your chest up and heels down.'],
    easier: 'Squat to a chair.', harder: 'Add a pause at the bottom, or jump at the top.',
  },
  {
    slug: 'goblet-squat', name: 'Goblet squat', primary: 'quads', muscles: ['quads', 'glutes', 'core'], equipment: 'dumbbells', level: 'beginner',
    steps: ['Hold one dumbbell vertically against your chest.', 'Stand with feet slightly wider than shoulders.', 'Squat down between your knees, chest tall.', 'Stand up by driving through your feet.'],
    tips: ['Elbows brush the inside of your knees at the bottom.'],
  },
  {
    slug: 'reverse-lunge', name: 'Reverse lunge', primary: 'quads', muscles: ['quads', 'glutes', 'hamstrings'], equipment: 'none', level: 'beginner',
    steps: ['Stand tall with feet hip-width apart.', 'Step one foot back and lower the back knee toward the floor.', 'Keep your front shin close to vertical.', 'Push through the front foot to return.'],
    tips: ['Easier on the knees than a forward lunge.', 'Hold a wall for balance if needed.'],
  },
  {
    slug: 'wall-sit', name: 'Wall sit', primary: 'quads', muscles: ['quads', 'glutes'], equipment: 'none', level: 'beginner',
    steps: ['Lean your back against a wall.', 'Slide down until knees are at about 90°.', 'Keep feet flat and knees over ankles.', 'Hold.'],
    tips: ['Press your lower back into the wall.', 'Breathe — do not hold your breath.'],
  },
  {
    slug: 'step-up', name: 'Step-up', primary: 'quads', muscles: ['quads', 'glutes'], equipment: 'none', level: 'beginner',
    steps: ['Stand facing a sturdy step or bench.', 'Place one whole foot on top.', 'Drive through that foot to stand up fully.', 'Step down slowly and repeat.'],
    tips: ['Do not push off with the back foot.', 'Hold dumbbells to make it harder.'],
  },
  // Hamstrings
  {
    slug: 'romanian-deadlift', name: 'Romanian deadlift', primary: 'hamstrings', muscles: ['hamstrings', 'glutes', 'back'], equipment: 'dumbbells', level: 'intermediate',
    steps: ['Stand holding dumbbells in front of your thighs.', 'Soften your knees and push your hips back.', 'Lower the weights along your legs until you feel a hamstring stretch.', 'Drive hips forward to stand tall.'],
    tips: ['Keep your back flat — the movement is at the hips.', 'Weights stay close to your legs.'],
  },
  {
    slug: 'single-leg-deadlift', name: 'Single-leg deadlift', primary: 'hamstrings', muscles: ['hamstrings', 'glutes', 'core'], equipment: 'none', level: 'intermediate',
    steps: ['Stand on one leg with a soft knee.', 'Hinge forward as the other leg extends behind you.', 'Lower until your torso is nearly parallel to the floor.', 'Return to standing.'],
    tips: ['Keep hips square to the floor.', 'Reach toward a wall for balance at first.'],
  },
  // Calves
  {
    slug: 'calf-raise', name: 'Calf raise', primary: 'calves', muscles: ['calves'], equipment: 'none', level: 'beginner',
    steps: ['Stand with the balls of your feet on a step, heels hanging off.', 'Rise up onto your toes as high as you can.', 'Pause at the top.', 'Lower your heels below the step.'],
    tips: ['Full range of motion matters more than speed.', 'Hold something for balance.'],
  },
  // Hip flexors / mobility
  {
    slug: 'hip-flexor-stretch', name: 'Half-kneeling hip flexor stretch', primary: 'hip-flexors', muscles: ['hip-flexors', 'quads'], equipment: 'none', level: 'beginner',
    steps: ['Kneel on one knee, the other foot flat in front.', 'Tuck your pelvis under and squeeze the back glute.', 'Shift your weight gently forward.', 'Hold, breathe, then switch sides.'],
    tips: ['The stretch should be at the front of the back hip.', 'Pad your knee with a towel.'],
  },
  {
    slug: 'worlds-greatest-stretch', name: "World's greatest stretch", primary: 'hip-flexors', muscles: ['hip-flexors', 'hamstrings', 'back'], equipment: 'none', level: 'beginner',
    steps: ['Step into a long lunge, both hands on the floor.', 'Drop your inside elbow toward your front foot.', 'Rotate and reach that arm to the ceiling.', 'Return and switch sides.'],
    tips: ['Move slowly and breathe into each position.'],
  },
  {
    slug: 'high-knees', name: 'High knees', primary: 'hip-flexors', muscles: ['hip-flexors', 'quads', 'calves', 'core'], equipment: 'none', level: 'beginner',
    steps: ['Stand tall with arms bent.', 'Drive one knee up to hip height.', 'Quickly switch legs, staying on the balls of your feet.', 'Pump your arms in rhythm.'],
    tips: ['March instead of running for a low-impact version.'],
  },
  // Cardio
  {
    slug: 'jumping-jack', name: 'Jumping jack', primary: 'calves', muscles: ['calves', 'shoulders', 'quads'], equipment: 'none', level: 'beginner',
    steps: ['Stand with feet together and arms by your sides.', 'Jump feet out while raising arms overhead.', 'Jump back to the start.', 'Keep a steady rhythm.'],
    tips: ['Step out one leg at a time for a low-impact version.'],
  },
  {
    slug: 'burpee', name: 'Burpee', primary: 'quads', muscles: ['quads', 'chest', 'core', 'shoulders'], equipment: 'none', level: 'intermediate',
    steps: ['Squat down and place your hands on the floor.', 'Jump or step your feet back into a plank.', 'Jump or step your feet back to your hands.', 'Stand and jump with arms overhead.'],
    tips: ['Step instead of jumping to make it easier.', 'Land softly with bent knees.'],
    harder: 'Add a push-up at the bottom.',
  },
  {
    slug: 'skater', name: 'Skater hop', primary: 'glutes', muscles: ['glutes', 'quads', 'calves'], equipment: 'none', level: 'intermediate',
    steps: ['Stand on your right leg.', 'Leap sideways to the left, landing on your left leg.', 'Let your right leg sweep behind you.', 'Leap back to the right.'],
    tips: ['Land softly and stick each landing.', 'Shorten the jump to make it easier.'],
  },
];

export const WORKOUTS: Workout[] = [
  {
    slug: 'first-steps-full-body', name: 'First Steps Full Body', focus: 'full-body', level: 'beginner', equipment: 'none', minutes: 15,
    format: 'circuit', rounds: 3, restSeconds: 60,
    summary: 'A gentle, complete session for your first weeks. Learn the basic movement patterns before adding load.',
    moves: [{ exercise: 'squat', reps: '10' }, { exercise: 'incline-push-up', reps: '8' }, { exercise: 'glute-bridge', reps: '12' }, { exercise: 'dead-bug', reps: '6 each side' }, { exercise: 'plank', seconds: 20 }],
  },
  {
    slug: 'living-room-strength', name: 'Living Room Strength', focus: 'full-body', level: 'intermediate', equipment: 'none', minutes: 25,
    format: 'circuit', rounds: 4, restSeconds: 60,
    summary: 'No gear, no excuses. A full-body strength circuit that fits between the sofa and the coffee table.',
    moves: [{ exercise: 'push-up', reps: '12' }, { exercise: 'reverse-lunge', reps: '10 each leg' }, { exercise: 'pike-push-up', reps: '8' }, { exercise: 'single-leg-deadlift', reps: '8 each leg' }, { exercise: 'side-plank', seconds: 30 }],
  },
  {
    slug: 'dumbbell-total-body', name: 'Dumbbell Total Body', focus: 'full-body', level: 'intermediate', equipment: 'dumbbells', minutes: 35,
    format: 'sets', rounds: 3, restSeconds: 75,
    summary: 'Everything you need from one pair of dumbbells: squat, hinge, push, pull, and carry over to real life.',
    moves: [{ exercise: 'goblet-squat', reps: '10' }, { exercise: 'dumbbell-floor-press', reps: '10' }, { exercise: 'dumbbell-row', reps: '10 each arm' }, { exercise: 'romanian-deadlift', reps: '10' }, { exercise: 'dumbbell-shoulder-press', reps: '8' }],
    pro: true,
  },
  {
    slug: 'upper-body-push', name: 'Upper Body Push', focus: 'upper', level: 'intermediate', equipment: 'none', minutes: 20,
    format: 'sets', rounds: 3, restSeconds: 60,
    summary: 'Chest, shoulders, and triceps using only your bodyweight.',
    moves: [{ exercise: 'push-up', reps: '10–15' }, { exercise: 'pike-push-up', reps: '8' }, { exercise: 'diamond-push-up', reps: '8' }, { exercise: 'bench-dip', reps: '12' }],
  },
  {
    slug: 'dumbbell-upper', name: 'Dumbbell Upper Builder', focus: 'upper', level: 'beginner', equipment: 'dumbbells', minutes: 30,
    format: 'sets', rounds: 3, restSeconds: 60,
    summary: 'Balanced upper-body session for building strength and shape in your arms, back, and shoulders.',
    moves: [{ exercise: 'dumbbell-floor-press', reps: '10' }, { exercise: 'dumbbell-row', reps: '10 each arm' }, { exercise: 'dumbbell-shoulder-press', reps: '10' }, { exercise: 'lateral-raise', reps: '12' }, { exercise: 'bicep-curl', reps: '12' }],
    pro: true,
  },
  {
    slug: 'band-posture-fix', name: 'Desk Posture Fix', focus: 'upper', level: 'beginner', equipment: 'bands', minutes: 12,
    format: 'circuit', rounds: 3, restSeconds: 30,
    summary: 'Undo hours of sitting. Strengthens the upper back and opens up tight hips.',
    moves: [{ exercise: 'band-pull-apart', reps: '15' }, { exercise: 'superman', seconds: 20 }, { exercise: 'hip-flexor-stretch', seconds: 30 }, { exercise: 'dead-bug', reps: '6 each side' }],
  },
  {
    slug: 'leg-day-no-gym', name: 'Leg Day, No Gym', focus: 'lower', level: 'beginner', equipment: 'none', minutes: 20,
    format: 'circuit', rounds: 3, restSeconds: 60,
    summary: 'Quads, glutes, and calves — feel it tomorrow without leaving the house.',
    moves: [{ exercise: 'squat', reps: '15' }, { exercise: 'reverse-lunge', reps: '10 each leg' }, { exercise: 'glute-bridge', reps: '15' }, { exercise: 'wall-sit', seconds: 30 }, { exercise: 'calf-raise', reps: '20' }],
  },
  {
    slug: 'glute-builder', name: 'Glute Builder', focus: 'lower', level: 'intermediate', equipment: 'dumbbells', minutes: 30,
    format: 'sets', rounds: 3, restSeconds: 60,
    summary: 'A focused glute and hamstring session with progressive dumbbell work.',
    moves: [{ exercise: 'hip-thrust', reps: '12' }, { exercise: 'romanian-deadlift', reps: '10' }, { exercise: 'step-up', reps: '10 each leg' }, { exercise: 'band-lateral-walk', reps: '12 each way' }],
    pro: true,
  },
  {
    slug: 'gym-lower-power', name: 'Gym Lower Power', focus: 'lower', level: 'advanced', equipment: 'gym', minutes: 45,
    format: 'sets', rounds: 4, restSeconds: 90,
    summary: 'Heavier lower-body work for experienced lifters training in a full gym.',
    moves: [{ exercise: 'goblet-squat', reps: '8' }, { exercise: 'romanian-deadlift', reps: '8' }, { exercise: 'step-up', reps: '8 each leg' }, { exercise: 'hip-thrust', reps: '10' }, { exercise: 'calf-raise', reps: '15' }],
    pro: true,
  },
  {
    slug: 'core-10', name: 'Core 10', focus: 'core', level: 'beginner', equipment: 'none', minutes: 10,
    format: 'circuit', rounds: 2, restSeconds: 30,
    summary: 'Ten minutes, five moves, a stronger middle. Do it after any workout or on its own.',
    moves: [{ exercise: 'dead-bug', reps: '8 each side' }, { exercise: 'plank', seconds: 30 }, { exercise: 'bicycle-crunch', reps: '12 each side' }, { exercise: 'side-plank', seconds: 20 }, { exercise: 'mountain-climber', seconds: 30 }],
  },
  {
    slug: 'iron-core', name: 'Iron Core', focus: 'core', level: 'advanced', equipment: 'none', minutes: 20,
    format: 'circuit', rounds: 4, restSeconds: 45,
    summary: 'Long holds and slow, controlled reps for a core that stays braced under pressure.',
    moves: [{ exercise: 'plank', seconds: 60 }, { exercise: 'side-plank', seconds: 40 }, { exercise: 'dead-bug', reps: '10 each side' }, { exercise: 'mountain-climber', seconds: 45 }],
  },
  {
    slug: 'hiit-20', name: 'HIIT 20', focus: 'cardio', level: 'intermediate', equipment: 'none', minutes: 20,
    format: 'intervals', rounds: 4, restSeconds: 60,
    summary: '40 seconds on, 20 seconds off. A short, sharp session that gets your heart rate up fast.',
    moves: [{ exercise: 'burpee', seconds: 40 }, { exercise: 'skater', seconds: 40 }, { exercise: 'mountain-climber', seconds: 40 }, { exercise: 'high-knees', seconds: 40 }, { exercise: 'squat', seconds: 40 }],
  },
  {
    slug: 'low-impact-cardio', name: 'Low-Impact Cardio', focus: 'cardio', level: 'beginner', equipment: 'none', minutes: 15,
    format: 'intervals', rounds: 3, restSeconds: 45,
    summary: 'No jumping — apartment-friendly and gentle on the joints, still a real sweat.',
    moves: [{ exercise: 'high-knees', seconds: 30 }, { exercise: 'squat', seconds: 30 }, { exercise: 'jumping-jack', seconds: 30 }, { exercise: 'step-up', seconds: 30 }],
  },
  {
    slug: 'morning-mobility', name: 'Morning Mobility', focus: 'mobility', level: 'beginner', equipment: 'none', minutes: 10,
    format: 'circuit', rounds: 2, restSeconds: 15,
    summary: 'Wake up stiff joints and start the day moving well. Perfect for rest days.',
    moves: [{ exercise: 'worlds-greatest-stretch', reps: '4 each side' }, { exercise: 'hip-flexor-stretch', seconds: 40 }, { exercise: 'glute-bridge', reps: '10' }, { exercise: 'band-pull-apart', reps: '12' }],
  },
];

export const PROGRAMS: Program[] = [
  {
    slug: 'start-here', name: 'Start Here: 4 Weeks', goal: 'Build the habit', level: 'beginner', equipment: 'none', weeks: 4,
    summary: 'Never trained before, or coming back after a long break? Three short sessions a week to build strength and confidence.',
    week: [{ day: 'Mon', workout: 'first-steps-full-body' }, { day: 'Tue' }, { day: 'Wed', workout: 'core-10' }, { day: 'Thu' }, { day: 'Fri', workout: 'leg-day-no-gym' }, { day: 'Sat', workout: 'morning-mobility' }, { day: 'Sun' }],
    phases: [
      { weeks: '1–2', title: 'Learn the moves', detail: 'Easier variations, plenty of rest. Focus on form.' },
      { weeks: '3–4', title: 'Add a round', detail: 'One extra round per session as your fitness builds.' },
    ],
  },
  {
    slug: 'home-fat-loss', name: 'Home Fat Loss', goal: 'Lose fat', level: 'beginner', equipment: 'none', weeks: 6,
    summary: 'Strength and cardio sessions combined with daily step targets and simple nutrition goals.',
    week: [{ day: 'Mon', workout: 'living-room-strength' }, { day: 'Tue', workout: 'low-impact-cardio' }, { day: 'Wed' }, { day: 'Thu', workout: 'leg-day-no-gym' }, { day: 'Fri', workout: 'hiit-20' }, { day: 'Sat', workout: 'morning-mobility' }, { day: 'Sun' }],
    phases: [
      { weeks: '1–2', title: 'Foundation', detail: 'Low-impact cardio and bodyweight strength.' },
      { weeks: '3–4', title: 'Build', detail: 'Shorter rests and HIIT intervals introduced.' },
      { weeks: '5–6', title: 'Push', detail: 'Extra round on strength days, longer intervals.' },
    ],
  },
  {
    slug: 'dumbbell-muscle', name: 'Dumbbell Muscle Builder', goal: 'Build muscle', level: 'intermediate', equipment: 'dumbbells', weeks: 8,
    summary: 'An upper/lower split with progressive overload, built for a pair of adjustable dumbbells.',
    week: [{ day: 'Mon', workout: 'dumbbell-upper' }, { day: 'Tue', workout: 'glute-builder' }, { day: 'Wed' }, { day: 'Thu', workout: 'dumbbell-total-body' }, { day: 'Fri', workout: 'upper-body-push' }, { day: 'Sat' }, { day: 'Sun' }],
    phases: [
      { weeks: '1–3', title: 'Volume', detail: '3 × 10–12 reps. Find working weights.' },
      { weeks: '4', title: 'Deload', detail: 'Same moves, about 60% of the volume.' },
      { weeks: '5–7', title: 'Strength', detail: '4 × 6–8 reps with heavier weights.' },
      { weeks: '8', title: 'Test week', detail: 'Re-test your key lifts and see your progress.' },
    ],
    pro: true,
  },
  {
    slug: 'gym-strength', name: 'Gym Strength Foundations', goal: 'Get stronger', level: 'advanced', equipment: 'gym', weeks: 8,
    summary: 'Structured gym training with tracked lifts, planned deloads, and recovery-based adjustments.',
    week: [{ day: 'Mon', workout: 'gym-lower-power' }, { day: 'Tue', workout: 'dumbbell-upper' }, { day: 'Wed', workout: 'morning-mobility' }, { day: 'Thu', workout: 'glute-builder' }, { day: 'Fri', workout: 'upper-body-push' }, { day: 'Sat' }, { day: 'Sun' }],
    phases: [
      { weeks: '1–3', title: 'Accumulate', detail: 'Moderate weights, building work capacity.' },
      { weeks: '4', title: 'Deload', detail: 'Lighter week to recover and adapt.' },
      { weeks: '5–8', title: 'Intensify', detail: 'Heavier sets with lower reps, readiness-guided.' },
    ],
    pro: true,
  },
  {
    slug: 'strong-core-30', name: 'Strong Core & Posture', goal: 'Move better', level: 'beginner', equipment: 'bands', weeks: 4,
    summary: 'Short daily sessions for people who sit all day. Less back stiffness, better posture.',
    week: [{ day: 'Mon', workout: 'band-posture-fix' }, { day: 'Tue', workout: 'core-10' }, { day: 'Wed', workout: 'morning-mobility' }, { day: 'Thu', workout: 'band-posture-fix' }, { day: 'Fri', workout: 'core-10' }, { day: 'Sat' }, { day: 'Sun' }],
    phases: [
      { weeks: '1–2', title: 'Wake up', detail: 'Activate the muscles that sitting switches off.' },
      { weeks: '3–4', title: 'Strengthen', detail: 'Longer holds and an extra round.' },
    ],
  },
  {
    slug: 'conditioning-6', name: '6-Week Conditioning', goal: 'Improve fitness', level: 'intermediate', equipment: 'none', weeks: 6,
    summary: 'For runners, team-sport players, and anyone who wants a bigger engine.',
    week: [{ day: 'Mon', workout: 'hiit-20' }, { day: 'Tue', workout: 'living-room-strength' }, { day: 'Wed', workout: 'morning-mobility' }, { day: 'Thu', workout: 'hiit-20' }, { day: 'Fri', workout: 'iron-core' }, { day: 'Sat', workout: 'low-impact-cardio' }, { day: 'Sun' }],
    phases: [
      { weeks: '1–2', title: 'Base', detail: '30 seconds on, 30 off.' },
      { weeks: '3–4', title: 'Build', detail: '40 on, 20 off.' },
      { weeks: '5–6', title: 'Peak', detail: 'Extra round and a timed benchmark.' },
    ],
    pro: true,
  },
];

export const CHALLENGES: Challenge[] = [
  { slug: '30-day-squat', name: '30-Day Squat Challenge', days: 30, focus: 'lower', level: 'beginner', exercise: 'squat', unit: 'reps', start: 20, end: 120, restEvery: 4, summary: 'Build up from 20 to 120 squats in a single day. Stronger legs, better mobility.' },
  { slug: '30-day-plank', name: '30-Day Plank Challenge', days: 30, focus: 'core', level: 'beginner', exercise: 'plank', unit: 'seconds', start: 20, end: 180, restEvery: 5, summary: 'From a 20-second hold to a 3-minute plank. A rock-solid core in a month.' },
  { slug: '21-day-push-up', name: '21-Day Push-up Builder', days: 21, focus: 'upper', level: 'intermediate', exercise: 'push-up', unit: 'reps', start: 10, end: 60, restEvery: 4, summary: 'Total daily push-ups climb from 10 to 60. Split them up across the day if you need to.' },
  { slug: '14-day-glute', name: '14-Day Glute Bridge', days: 14, focus: 'lower', level: 'beginner', exercise: 'glute-bridge', unit: 'reps', start: 20, end: 100, restEvery: 5, summary: 'Wake up your glutes — great for anyone who sits for work.' },
  { slug: '30-day-burpee', name: '30-Day Burpee Ladder', days: 30, focus: 'cardio', level: 'advanced', exercise: 'burpee', unit: 'reps', start: 10, end: 75, restEvery: 6, summary: 'The ultimate conditioning test. Ten burpees on day one, seventy-five on day thirty.' },
  { slug: '21-day-wall-sit', name: '21-Day Wall Sit', days: 21, focus: 'lower', level: 'beginner', exercise: 'wall-sit', unit: 'seconds', start: 30, end: 150, restEvery: 5, summary: 'Low-impact, high burn. Builds the quad endurance that protects your knees.' },
];

const MUSCLE_FOCUS: Record<Muscle, Focus> = {
  chest: 'upper', back: 'upper', shoulders: 'upper', arms: 'upper',
  core: 'core',
  glutes: 'lower', quads: 'lower', hamstrings: 'lower', calves: 'lower',
  'hip-flexors': 'mobility',
};

export const focusForMuscle = (m: Muscle) => MUSCLE_FOCUS[m];

/** Reads a filter from the URL, falling back to 'all' for missing or unknown values. */
export const parseFilter = <T extends string>(value: string | null, options: Record<T, string>): T | 'all' =>
  value && value in options ? (value as T) : 'all';

const bySlug = <T extends { slug: string }>(items: T[]) => new Map(items.map((i) => [i.slug, i]));
const exerciseMap = bySlug(EXERCISES);
const workoutMap = bySlug(WORKOUTS);
const programMap = bySlug(PROGRAMS);
const challengeMap = bySlug(CHALLENGES);

export const getExercise = (slug: string) => exerciseMap.get(slug);
export const getWorkout = (slug: string) => workoutMap.get(slug);
export const getProgram = (slug: string) => programMap.get(slug);
export const getChallenge = (slug: string) => challengeMap.get(slug);

export const sessionsPerWeek = (p: Program) => p.week.filter((d) => d.workout).length;

export const workoutsUsing = (exerciseSlug: string) =>
  WORKOUTS.filter((w) => w.moves.some((m) => m.exercise === exerciseSlug));

/** Day-by-day targets for a challenge: a linear climb with every `restEvery`th day off. */
export function challengeSchedule(c: Challenge): { day: number; target: number | null }[] {
  const isRest = (day: number) => day % c.restEvery === 0 && day !== c.days; // final day is always a test day
  const trainingDays = Array.from({ length: c.days }, (_, i) => i + 1).filter((d) => !isRest(d)).length;
  const step = trainingDays > 1 ? (c.end - c.start) / (trainingDays - 1) : 0;
  const round = c.unit === 'seconds' ? 5 : 1;
  let n = 0;
  return Array.from({ length: c.days }, (_, i) => {
    const day = i + 1;
    if (isRest(day)) return { day, target: null };
    const raw = c.start + step * n++;
    return { day, target: Math.min(c.end, Math.round(raw / round) * round) };
  });
}

export const formatTarget = (value: number, unit: Challenge['unit']) =>
  unit === 'reps' ? `${value}` : value >= 60 ? `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}` : `${value}s`;
