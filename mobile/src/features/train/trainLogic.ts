// Rules behind the Train screen: workout templates, personal records, weekly totals and history.
// Pure functions, no React. Everything is worked out from the workouts the person really logged.

export interface LoggedSet { exercise: string; reps: number; weight: number }
export interface WorkoutRec { _id?: string; exercise: string; duration: number; calories?: number; volume?: number; sets?: LoggedSet[]; timestamp: string }

export interface TemplateExercise { name: string; sets: number; reps: number; rest: number; startWeight: number }
export type Category = 'strength' | 'bodyweight' | 'conditioning' | 'mobility';
export interface Template { id: string; name: string; focus: string; icon: string; category?: Category; exercises: TemplateExercise[] }

/** Ready-made sessions to start from. The weights are only a starting suggestion: it uses what you last lifted when it knows. */
export const TEMPLATES: Template[] = [
  { id: 'push', category: 'strength', name: 'Push day', focus: 'Chest, shoulders, triceps', icon: 'arrow-up-circle-outline', exercises: [
    { name: 'Bench Press', sets: 4, reps: 8, rest: 120, startWeight: 40 },
    { name: 'Overhead Press', sets: 3, reps: 8, rest: 90, startWeight: 30 },
    { name: 'Incline Dumbbell Press', sets: 3, reps: 10, rest: 90, startWeight: 16 },
    { name: 'Lateral Raise', sets: 3, reps: 15, rest: 60, startWeight: 6 },
    { name: 'Triceps Pushdown', sets: 3, reps: 12, rest: 60, startWeight: 20 },
  ] },
  { id: 'pull', category: 'strength', name: 'Pull day', focus: 'Back and biceps', icon: 'arrow-down-circle-outline', exercises: [
    { name: 'Deadlift', sets: 3, reps: 5, rest: 150, startWeight: 60 },
    { name: 'Barbell Row', sets: 4, reps: 8, rest: 90, startWeight: 40 },
    { name: 'Lat Pulldown', sets: 3, reps: 10, rest: 90, startWeight: 40 },
    { name: 'Face Pull', sets: 3, reps: 15, rest: 60, startWeight: 15 },
    { name: 'Dumbbell Curl', sets: 3, reps: 12, rest: 60, startWeight: 10 },
  ] },
  { id: 'legs', category: 'strength', name: 'Leg day', focus: 'Quads, hamstrings, glutes', icon: 'walk-outline', exercises: [
    { name: 'Back Squat', sets: 4, reps: 6, rest: 150, startWeight: 50 },
    { name: 'Romanian Deadlift', sets: 3, reps: 8, rest: 120, startWeight: 40 },
    { name: 'Leg Press', sets: 3, reps: 10, rest: 90, startWeight: 80 },
    { name: 'Walking Lunge', sets: 3, reps: 12, rest: 60, startWeight: 12 },
    { name: 'Calf Raise', sets: 4, reps: 15, rest: 45, startWeight: 30 },
  ] },
  { id: 'full', category: 'strength', name: 'Full body', focus: 'A bit of everything', icon: 'body-outline', exercises: [
    { name: 'Back Squat', sets: 3, reps: 8, rest: 120, startWeight: 50 },
    { name: 'Bench Press', sets: 3, reps: 8, rest: 90, startWeight: 40 },
    { name: 'Barbell Row', sets: 3, reps: 8, rest: 90, startWeight: 40 },
    { name: 'Overhead Press', sets: 3, reps: 10, rest: 90, startWeight: 30 },
    { name: 'Plank (seconds)', sets: 3, reps: 45, rest: 45, startWeight: 0 },
  ] },

  { id: 'upper', category: 'strength', name: 'Upper body', focus: 'Chest, back, shoulders, arms', icon: 'fitness-outline', exercises: [
    { name: 'Incline Bench Press', sets: 4, reps: 8, rest: 120, startWeight: 30 },
    { name: 'Pull-up', sets: 4, reps: 8, rest: 90, startWeight: 0 },
    { name: 'Seated Dumbbell Press', sets: 3, reps: 10, rest: 90, startWeight: 14 },
    { name: 'Seated Cable Row', sets: 3, reps: 12, rest: 75, startWeight: 35 },
    { name: 'Hammer Curl', sets: 3, reps: 12, rest: 60, startWeight: 10 },
    { name: 'Overhead Triceps Extension', sets: 3, reps: 12, rest: 60, startWeight: 12 },
  ] },
  { id: 'lower', category: 'strength', name: 'Lower body', focus: 'Legs and glutes', icon: 'walk-outline', exercises: [
    { name: 'Front Squat', sets: 4, reps: 6, rest: 150, startWeight: 40 },
    { name: 'Hip Thrust', sets: 4, reps: 10, rest: 90, startWeight: 50 },
    { name: 'Leg Curl', sets: 3, reps: 12, rest: 75, startWeight: 30 },
    { name: 'Bulgarian Split Squat', sets: 3, reps: 10, rest: 90, startWeight: 12 },
    { name: 'Seated Calf Raise', sets: 4, reps: 15, rest: 45, startWeight: 25 },
  ] },
  { id: 'chest-tri', category: 'strength', name: 'Chest and triceps', focus: 'Pressing day', icon: 'arrow-up-circle-outline', exercises: [
    { name: 'Bench Press', sets: 4, reps: 8, rest: 120, startWeight: 40 },
    { name: 'Incline Dumbbell Press', sets: 3, reps: 10, rest: 90, startWeight: 16 },
    { name: 'Cable Fly', sets: 3, reps: 12, rest: 60, startWeight: 12 },
    { name: 'Dips', sets: 3, reps: 10, rest: 75, startWeight: 0 },
    { name: 'Skull Crusher', sets: 3, reps: 12, rest: 60, startWeight: 15 },
  ] },
  { id: 'back-bi', category: 'strength', name: 'Back and biceps', focus: 'Pulling day', icon: 'arrow-down-circle-outline', exercises: [
    { name: 'Weighted Pull-up', sets: 4, reps: 6, rest: 120, startWeight: 0 },
    { name: 'T-Bar Row', sets: 4, reps: 8, rest: 90, startWeight: 30 },
    { name: 'Single-Arm Dumbbell Row', sets: 3, reps: 10, rest: 75, startWeight: 20 },
    { name: 'Straight-Arm Pulldown', sets: 3, reps: 12, rest: 60, startWeight: 20 },
    { name: 'Barbell Curl', sets: 3, reps: 10, rest: 60, startWeight: 20 },
  ] },
  { id: 'shoulders', category: 'strength', name: 'Shoulders and traps', focus: 'Wide, round shoulders', icon: 'barbell-outline', exercises: [
    { name: 'Overhead Press', sets: 4, reps: 8, rest: 120, startWeight: 30 },
    { name: 'Lateral Raise', sets: 4, reps: 15, rest: 60, startWeight: 6 },
    { name: 'Rear Delt Fly', sets: 3, reps: 15, rest: 60, startWeight: 6 },
    { name: 'Arnold Press', sets: 3, reps: 10, rest: 75, startWeight: 12 },
    { name: 'Dumbbell Shrug', sets: 3, reps: 12, rest: 60, startWeight: 20 },
  ] },
  { id: 'arms', category: 'strength', name: 'Arm day', focus: 'Biceps and triceps', icon: 'fitness-outline', exercises: [
    { name: 'Barbell Curl', sets: 4, reps: 10, rest: 60, startWeight: 20 },
    { name: 'Close-Grip Bench Press', sets: 4, reps: 8, rest: 90, startWeight: 35 },
    { name: 'Incline Dumbbell Curl', sets: 3, reps: 12, rest: 60, startWeight: 8 },
    { name: 'Triceps Rope Pushdown', sets: 3, reps: 12, rest: 60, startWeight: 20 },
    { name: 'Concentration Curl', sets: 2, reps: 15, rest: 45, startWeight: 8 },
  ] },
  { id: 'glutes', category: 'strength', name: 'Glutes and hamstrings', focus: 'Posterior chain', icon: 'walk-outline', exercises: [
    { name: 'Hip Thrust', sets: 4, reps: 8, rest: 120, startWeight: 50 },
    { name: 'Romanian Deadlift', sets: 4, reps: 8, rest: 120, startWeight: 40 },
    { name: 'Cable Pull-Through', sets: 3, reps: 12, rest: 75, startWeight: 25 },
    { name: 'Step-Up', sets: 3, reps: 10, rest: 75, startWeight: 10 },
    { name: 'Glute Bridge', sets: 3, reps: 15, rest: 60, startWeight: 0 },
  ] },
  { id: 'core', category: 'bodyweight', name: 'Core and abs', focus: 'Abs, obliques, lower back', icon: 'ellipse-outline', exercises: [
    { name: 'Hanging Knee Raise', sets: 3, reps: 12, rest: 60, startWeight: 0 },
    { name: 'Cable Crunch', sets: 3, reps: 15, rest: 60, startWeight: 20 },
    { name: 'Russian Twist', sets: 3, reps: 20, rest: 45, startWeight: 5 },
    { name: 'Plank (seconds)', sets: 3, reps: 45, rest: 45, startWeight: 0 },
    { name: 'Dead Bug', sets: 3, reps: 12, rest: 45, startWeight: 0 },
  ] },
  { id: 'home-full', category: 'bodyweight', name: 'Home full body', focus: 'No equipment', icon: 'home-outline', exercises: [
    { name: 'Push-up', sets: 4, reps: 15, rest: 60, startWeight: 0 },
    { name: 'Bodyweight Squat', sets: 4, reps: 20, rest: 45, startWeight: 0 },
    { name: 'Reverse Lunge', sets: 3, reps: 12, rest: 45, startWeight: 0 },
    { name: 'Glute Bridge', sets: 3, reps: 20, rest: 45, startWeight: 0 },
    { name: 'Plank (seconds)', sets: 3, reps: 40, rest: 45, startWeight: 0 },
  ] },
  { id: 'calisthenics', category: 'bodyweight', name: 'Calisthenics strength', focus: 'Pull-ups, dips, push-ups', icon: 'body-outline', exercises: [
    { name: 'Pull-up', sets: 5, reps: 6, rest: 120, startWeight: 0 },
    { name: 'Dips', sets: 4, reps: 8, rest: 90, startWeight: 0 },
    { name: 'Pike Push-up', sets: 3, reps: 8, rest: 75, startWeight: 0 },
    { name: 'Inverted Row', sets: 3, reps: 10, rest: 60, startWeight: 0 },
    { name: 'Hollow Hold (seconds)', sets: 3, reps: 30, rest: 45, startWeight: 0 },
  ] },
  { id: 'dumbbell-full', category: 'strength', name: 'Dumbbell full body', focus: 'One pair of dumbbells', icon: 'barbell-outline', exercises: [
    { name: 'Goblet Squat', sets: 4, reps: 12, rest: 75, startWeight: 16 },
    { name: 'Dumbbell Bench Press', sets: 4, reps: 10, rest: 90, startWeight: 16 },
    { name: 'One-Arm Row', sets: 3, reps: 12, rest: 60, startWeight: 16 },
    { name: 'Dumbbell Romanian Deadlift', sets: 3, reps: 12, rest: 75, startWeight: 16 },
    { name: 'Dumbbell Shoulder Press', sets: 3, reps: 10, rest: 75, startWeight: 10 },
  ] },
  { id: 'hiit', category: 'conditioning', name: 'HIIT circuit', focus: 'Fat burn, 25 minutes', icon: 'flame-outline', exercises: [
    { name: 'Burpee', sets: 4, reps: 12, rest: 30, startWeight: 0 },
    { name: 'Mountain Climber (seconds)', sets: 4, reps: 40, rest: 20, startWeight: 0 },
    { name: 'Jump Squat', sets: 4, reps: 15, rest: 30, startWeight: 0 },
    { name: 'High Knees (seconds)', sets: 4, reps: 40, rest: 20, startWeight: 0 },
    { name: 'Kettlebell Swing', sets: 4, reps: 20, rest: 30, startWeight: 16 },
  ] },
  { id: 'express', category: 'conditioning', name: '20-minute express', focus: 'Short on time', icon: 'timer-outline', exercises: [
    { name: 'Goblet Squat', sets: 3, reps: 12, rest: 30, startWeight: 16 },
    { name: 'Push-up', sets: 3, reps: 15, rest: 30, startWeight: 0 },
    { name: 'Dumbbell Row', sets: 3, reps: 12, rest: 30, startWeight: 14 },
    { name: 'Plank (seconds)', sets: 3, reps: 40, rest: 30, startWeight: 0 },
  ] },
  { id: 'kettlebell', category: 'conditioning', name: 'Kettlebell flow', focus: 'Strength and conditioning', icon: 'barbell-outline', exercises: [
    { name: 'Kettlebell Swing', sets: 5, reps: 15, rest: 45, startWeight: 16 },
    { name: 'Goblet Squat', sets: 4, reps: 12, rest: 60, startWeight: 16 },
    { name: 'Kettlebell Clean and Press', sets: 3, reps: 8, rest: 60, startWeight: 12 },
    { name: 'Turkish Get-up', sets: 2, reps: 3, rest: 75, startWeight: 8 },
  ] },
  { id: 'mobility', category: 'mobility', name: 'Mobility and stretch', focus: 'Recovery day, 15 minutes', icon: 'leaf-outline', exercises: [
    { name: 'Cat-Cow (seconds)', sets: 2, reps: 45, rest: 15, startWeight: 0 },
    { name: 'World’s Greatest Stretch (seconds)', sets: 2, reps: 60, rest: 15, startWeight: 0 },
    { name: 'Hip Flexor Stretch (seconds)', sets: 2, reps: 45, rest: 15, startWeight: 0 },
    { name: 'Thoracic Rotation (seconds)', sets: 2, reps: 45, rest: 15, startWeight: 0 },
    { name: 'Child’s Pose (seconds)', sets: 2, reps: 60, rest: 15, startWeight: 0 },
  ] },
];

export const CATEGORY_LABELS: Record<Category, string> = { strength: 'Strength', bodyweight: 'Bodyweight', conditioning: 'Conditioning', mobility: 'Mobility' };

/** Rough length of a session: about 40 seconds of work per set plus the rest between sets. */
export function estimateMinutes(t: Pick<Template, 'exercises'>): number {
  const sec = t.exercises.reduce((sum, e) => sum + e.sets * ((e.name.includes('(seconds)') ? e.reps : 40) + e.rest), 0);
  return Math.max(5, Math.round(sec / 60 / 5) * 5);
}

// ── My workouts (saved routines) ────────────────────────────────────────────────
export interface RoutineExercise { name: string; muscle?: string; sets: number; reps: number; unit: 'reps' | 'sec'; restSec: number; tip?: string }
export interface Routine { _id: string; name: string; focus: string; exercises: RoutineExercise[]; weekdays: number[]; source: 'coach' | 'template' | 'manual' }

/** The workout player works from templates, and marks timed holds by "(seconds)" in the name. */
export function routineToTemplate(r: Routine): Template {
  return {
    id: r._id, name: r.name, focus: r.focus || 'Your workout', icon: 'albums-outline',
    exercises: r.exercises.map((e) => ({ name: e.unit === 'sec' && !e.name.includes('(seconds)') ? `${e.name} (seconds)` : e.name, sets: e.sets, reps: e.reps, rest: e.restSec, startWeight: 0 })),
  };
}

/** A built-in workout saved into My workouts. */
export function templateToRoutineInput(t: Template) {
  return {
    name: t.name, focus: t.focus, source: 'template' as const,
    exercises: t.exercises.map((e): RoutineExercise => {
      const sec = e.name.includes('(seconds)');
      return { name: e.name.replace(' (seconds)', ''), sets: e.sets, reps: e.reps, unit: sec ? 'sec' : 'reps', restSec: e.rest };
    }),
  };
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The workouts planned for a weekday (0 = Sunday), in the order they were saved. */
export const routinesFor = (routines: Routine[], weekday: number) => routines.filter((r) => r.weekdays.includes(weekday));

export const weekdaysLabel = (days: number[]) => (days.length === 0 ? 'Not scheduled' : days.length === 7 ? 'Every day' : [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => WEEKDAYS[d]).join(' · '));

// ── Strength maths ──────────────────────────────────────────────────────────────
/** Estimated best single lift from a set (the Epley formula). One rep is simply the weight. */
export function est1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

export interface Record1 { exercise: string; weight: number; reps: number; est1RM: number; date: string }

/** The best set ever logged for each exercise (by estimated one-rep max), best first. */
export function personalRecords(workouts: WorkoutRec[]): Record1[] {
  const best = new Map<string, Record1>();
  for (const w of workouts) {
    for (const s of w.sets ?? []) {
      const e = est1RM(s.weight, s.reps);
      if (e <= 0) continue;
      const cur = best.get(s.exercise);
      if (!cur || e > cur.est1RM) best.set(s.exercise, { exercise: s.exercise, weight: s.weight, reps: s.reps, est1RM: e, date: w.timestamp });
    }
  }
  return [...best.values()].sort((a, b) => b.est1RM - a.est1RM);
}

/** What you did last time for each exercise: the heaviest set of your most recent session with it. */
export function lastPerformance(workouts: WorkoutRec[]): Map<string, { weight: number; reps: number }> {
  const out = new Map<string, { weight: number; reps: number; at: number }>();
  for (const w of workouts) {
    const at = Date.parse(w.timestamp);
    for (const s of w.sets ?? []) {
      const cur = out.get(s.exercise);
      if (!cur || at > cur.at || (at === cur.at && s.weight > cur.weight)) out.set(s.exercise, { weight: s.weight, reps: s.reps, at });
    }
  }
  return new Map([...out].map(([k, v]) => [k, { weight: v.weight, reps: v.reps }]));
}

/** Which exercises in a just-finished session beat the best you had before it. */
export function newRecords(before: WorkoutRec[], sets: LoggedSet[]): string[] {
  const prev = new Map(personalRecords(before).map((r) => [r.exercise, r.est1RM]));
  const hit = new Set<string>();
  for (const s of sets) if (est1RM(s.weight, s.reps) > (prev.get(s.exercise) ?? 0) + 1e-9 && prev.has(s.exercise)) hit.add(s.exercise);
  return [...hit];
}

export const sessionVolume = (sets: LoggedSet[]) => sets.reduce((v, s) => v + s.weight * s.reps, 0);

// ── Days ────────────────────────────────────────────────────────────────────────
export const dayKeyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Minutes trained on each of the last 7 days, today last. */
export function weekMinutes(workouts: WorkoutRec[], now: Date = new Date()): { label: string; key: string; minutes: number }[] {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - (6 - i)); return { label: names[d.getDay()], key: dayKeyOf(d), minutes: 0 }; });
  for (const w of workouts) { const slot = days.find((d) => d.key === dayKeyOf(new Date(w.timestamp))); if (slot) slot.minutes += w.duration || 0; }
  return days;
}

export interface ActivityRecords { sessions: number; minutes: number; longest: number; mostCalories: number; bestWeek: number }

/** Records anyone can have, whatever they log: from the sessions and minutes alone. */
export function activityRecords(workouts: WorkoutRec[]): ActivityRecords {
  const perWeek = new Map<string, number>();
  for (const w of workouts) {
    const d = new Date(w.timestamp); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday of that week
    perWeek.set(dayKeyOf(d), (perWeek.get(dayKeyOf(d)) ?? 0) + 1);
  }
  return {
    sessions: workouts.length,
    minutes: workouts.reduce((s, w) => s + (w.duration || 0), 0),
    longest: workouts.reduce((m, w) => Math.max(m, w.duration || 0), 0),
    mostCalories: workouts.reduce((m, w) => Math.max(m, w.calories || 0), 0),
    bestWeek: Math.max(0, ...perWeek.values()),
  };
}

export function groupByDay(workouts: WorkoutRec[], now: Date = new Date()): { label: string; items: WorkoutRec[] }[] {
  const sorted = [...workouts].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  const today = dayKeyOf(now); const y = new Date(now); y.setDate(y.getDate() - 1); const yesterday = dayKeyOf(y);
  const groups: { label: string; key: string; items: WorkoutRec[] }[] = [];
  for (const w of sorted) {
    const d = new Date(w.timestamp); const key = dayKeyOf(d);
    let g = groups.find((x) => x.key === key);
    if (!g) { g = { key, label: key === today ? 'Today' : key === yesterday ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }), items: [] }; groups.push(g); }
    g.items.push(w);
  }
  return groups.map(({ label, items }) => ({ label, items }));
}

export const fmtDuration = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
