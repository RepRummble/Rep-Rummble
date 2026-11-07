// Rules behind the Train screen: workout templates, personal records, weekly totals and history.
// Pure functions, no React. Everything is worked out from the workouts the person really logged.

export interface LoggedSet { exercise: string; reps: number; weight: number }
export interface WorkoutRec { _id?: string; exercise: string; duration: number; calories?: number; volume?: number; sets?: LoggedSet[]; timestamp: string }

export interface TemplateExercise { name: string; sets: number; reps: number; rest: number; startWeight: number }
export interface Template { id: string; name: string; focus: string; icon: string; exercises: TemplateExercise[] }

/** Ready-made sessions to start from. The weights are only a starting suggestion: it uses what you last lifted when it knows. */
export const TEMPLATES: Template[] = [
  { id: 'push', name: 'Push day', focus: 'Chest, shoulders, triceps', icon: 'arrow-up-circle-outline', exercises: [
    { name: 'Bench Press', sets: 4, reps: 8, rest: 120, startWeight: 40 },
    { name: 'Overhead Press', sets: 3, reps: 8, rest: 90, startWeight: 30 },
    { name: 'Incline Dumbbell Press', sets: 3, reps: 10, rest: 90, startWeight: 16 },
    { name: 'Lateral Raise', sets: 3, reps: 15, rest: 60, startWeight: 6 },
    { name: 'Triceps Pushdown', sets: 3, reps: 12, rest: 60, startWeight: 20 },
  ] },
  { id: 'pull', name: 'Pull day', focus: 'Back and biceps', icon: 'arrow-down-circle-outline', exercises: [
    { name: 'Deadlift', sets: 3, reps: 5, rest: 150, startWeight: 60 },
    { name: 'Barbell Row', sets: 4, reps: 8, rest: 90, startWeight: 40 },
    { name: 'Lat Pulldown', sets: 3, reps: 10, rest: 90, startWeight: 40 },
    { name: 'Face Pull', sets: 3, reps: 15, rest: 60, startWeight: 15 },
    { name: 'Dumbbell Curl', sets: 3, reps: 12, rest: 60, startWeight: 10 },
  ] },
  { id: 'legs', name: 'Leg day', focus: 'Quads, hamstrings, glutes', icon: 'walk-outline', exercises: [
    { name: 'Back Squat', sets: 4, reps: 6, rest: 150, startWeight: 50 },
    { name: 'Romanian Deadlift', sets: 3, reps: 8, rest: 120, startWeight: 40 },
    { name: 'Leg Press', sets: 3, reps: 10, rest: 90, startWeight: 80 },
    { name: 'Walking Lunge', sets: 3, reps: 12, rest: 60, startWeight: 12 },
    { name: 'Calf Raise', sets: 4, reps: 15, rest: 45, startWeight: 30 },
  ] },
  { id: 'full', name: 'Full body', focus: 'A bit of everything', icon: 'body-outline', exercises: [
    { name: 'Back Squat', sets: 3, reps: 8, rest: 120, startWeight: 50 },
    { name: 'Bench Press', sets: 3, reps: 8, rest: 90, startWeight: 40 },
    { name: 'Barbell Row', sets: 3, reps: 8, rest: 90, startWeight: 40 },
    { name: 'Overhead Press', sets: 3, reps: 10, rest: 90, startWeight: 30 },
    { name: 'Plank (seconds)', sets: 3, reps: 45, rest: 45, startWeight: 0 },
  ] },
];

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
