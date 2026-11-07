// The rules behind Mission Control: ranks, daily missions, real insights and achievement badges.
// Pure functions with no React in them, so they are easy to test. Everything here is worked out from what the person
// has really logged; nothing is invented.

export const XP_PER_LEVEL = 500;
export interface Goals { calories: number; protein: number; workouts: number; water: number }
export const GOALS: Goals = { calories: 2200, protein: 150, workouts: 1, water: 8 };

// ── Ranks ───────────────────────────────────────────────────────────────────────
export interface Rank { fromLevel: number; name: string; icon: string }
export const RANKS: Rank[] = [
  { fromLevel: 1, name: 'Cadet', icon: 'rocket-outline' },
  { fromLevel: 3, name: 'Pilot', icon: 'airplane-outline' },
  { fromLevel: 6, name: 'Navigator', icon: 'compass-outline' },
  { fromLevel: 10, name: 'Commander', icon: 'shield-outline' },
  { fromLevel: 15, name: 'Captain', icon: 'ribbon-outline' },
  { fromLevel: 20, name: 'Admiral', icon: 'star-outline' },
  { fromLevel: 30, name: 'Legend', icon: 'planet-outline' },
];

export function levelFromXp(xp: number) {
  return Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
}

export function rankFor(level: number): Rank {
  let r = RANKS[0];
  for (const x of RANKS) if (level >= x.fromLevel) r = x;
  return r;
}

export function nextRank(level: number): Rank | null {
  return RANKS.find((r) => r.fromLevel > level) ?? null;
}

export function levelProgress(xp: number) {
  const safe = Math.max(0, xp);
  const level = levelFromXp(safe);
  const xpInLevel = safe % XP_PER_LEVEL;
  return { level, xpInLevel, xpToNext: XP_PER_LEVEL - xpInLevel, pct: (xpInLevel / XP_PER_LEVEL) * 100, rank: rankFor(level), next: nextRank(level) };
}

// ── Days ────────────────────────────────────────────────────────────────────────
/** A local calendar day like "2026-11-07", used as the key for per-day saved values. */
export function dayKey(d: Date = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// ── Missions ────────────────────────────────────────────────────────────────────
export interface Mission { id: string; title: string; hint: string; icon: string; xp: number; progress: number; target: number; unit: string; done: boolean }

export interface TodayData { mealsLogged: number; calories: number; protein: number; workouts: number; water: number }

export function missionsFor(t: TodayData, goals: Goals = GOALS): Mission[] {
  const calOk = t.calories >= goals.calories * 0.85 && t.calories <= goals.calories * 1.15;
  return [
    { id: 'log-meal', title: 'Fuel up', hint: 'Log a meal', icon: 'restaurant-outline', xp: 20, progress: Math.min(t.mealsLogged, 1), target: 1, unit: '', done: t.mealsLogged >= 1 },
    { id: 'protein', title: 'Protein power', hint: `Reach ${goals.protein} g of protein`, icon: 'fitness-outline', xp: 30, progress: Math.min(Math.round(t.protein), goals.protein), target: goals.protein, unit: 'g', done: t.protein >= goals.protein },
    { id: 'calories', title: 'On target', hint: `Land within 15% of ${goals.calories} kcal`, icon: 'flame-outline', xp: 25, progress: Math.min(Math.round(t.calories), goals.calories), target: goals.calories, unit: 'kcal', done: calOk },
    { id: 'train', title: 'Launch a workout', hint: 'Log a training session', icon: 'barbell-outline', xp: 40, progress: Math.min(t.workouts, goals.workouts), target: goals.workouts, unit: '', done: t.workouts >= goals.workouts },
    { id: 'hydrate', title: 'Stay hydrated', hint: `Drink ${goals.water} glasses of water`, icon: 'water-outline', xp: 15, progress: Math.min(t.water, goals.water), target: goals.water, unit: '', done: t.water >= goals.water },
  ];
}

export function claimableXp(missions: Mission[], claimed: string[]) {
  return missions.filter((m) => m.done && !claimed.includes(m.id)).reduce((s, m) => s + m.xp, 0);
}

// ── Insights (what the numbers say right now) ───────────────────────────────────
export interface Insight { id: string; icon: string; title: string; body: string; tone: 'go' | 'warn' | 'good' }

export interface InsightInput { todayCalories: number; todayProtein: number; todayWorkouts: number; todayMeals: number; streak: number; hour: number; workoutsLast7: number; daysWithMealsLast7: number }

export function insightsFor(i: InsightInput, goals: Goals = GOALS): Insight[] {
  const out: Insight[] = [];
  if (i.todayMeals === 0 && i.hour >= 11) {
    out.push({ id: 'no-meal', icon: 'restaurant-outline', tone: 'warn', title: 'Nothing logged yet today', body: 'Snap your next meal and Rumi will count the calories and protein for you.' });
  }
  const proteinLeft = Math.round(goals.protein - i.todayProtein);
  if (i.todayMeals > 0 && proteinLeft > 0) {
    out.push({ id: 'protein-left', icon: 'fitness-outline', tone: 'go', title: `${proteinLeft} g of protein to go`, body: `You are at ${Math.round(i.todayProtein)} g of ${goals.protein} g. A lean meal or a shake would close most of the gap.` });
  }
  if (i.todayProtein >= goals.protein) {
    out.push({ id: 'protein-hit', icon: 'checkmark-circle-outline', tone: 'good', title: 'Protein target reached', body: `${Math.round(i.todayProtein)} g logged today. Your muscles have what they need.` });
  }
  const calLeft = Math.round(goals.calories - i.todayCalories);
  if (i.todayMeals > 0 && calLeft > 0 && i.hour >= 17) {
    out.push({ id: 'cal-left', icon: 'flame-outline', tone: 'go', title: `${calLeft} kcal left today`, body: `You have eaten ${Math.round(i.todayCalories)} of ${goals.calories} kcal.` });
  }
  if (i.todayCalories > goals.calories * 1.15) {
    out.push({ id: 'cal-over', icon: 'alert-circle-outline', tone: 'warn', title: 'Above your calorie target', body: `${Math.round(i.todayCalories)} kcal logged against a ${goals.calories} kcal target. Tomorrow is a fresh start.` });
  }
  if (i.todayWorkouts === 0 && i.streak > 0) {
    out.push({ id: 'streak-risk', icon: 'flame', tone: 'warn', title: `Protect your ${i.streak}-day streak`, body: 'No workout yet today. Even 10 minutes keeps the chain alive.' });
  } else if (i.todayWorkouts === 0) {
    out.push({ id: 'start-streak', icon: 'barbell-outline', tone: 'go', title: 'Start a streak today', body: 'Log one workout and your streak begins.' });
  }
  if (i.todayWorkouts > 0) {
    out.push({ id: 'trained', icon: 'checkmark-circle-outline', tone: 'good', title: 'Workout done', body: `${i.todayWorkouts} session${i.todayWorkouts > 1 ? 's' : ''} logged today. Nice work.` });
  }
  if (i.workoutsLast7 > 0) {
    out.push({ id: 'week', icon: 'calendar-outline', tone: 'good', title: `${i.workoutsLast7} workout${i.workoutsLast7 > 1 ? 's' : ''} in the last 7 days`, body: `You logged meals on ${i.daysWithMealsLast7} of the last 7 days.` });
  }
  return out;
}

// ── Achievements ────────────────────────────────────────────────────────────────
export interface Badge { id: string; title: string; desc: string; icon: string; unlocked: boolean; progress: number; target: number }

export interface BadgeStats { meals: number; workouts: number; streak: number; level: number }

export function badgesFor(s: BadgeStats): Badge[] {
  const b = (id: string, title: string, desc: string, icon: string, value: number, target: number): Badge => ({ id, title, desc, icon, unlocked: value >= target, progress: Math.min(value, target), target });
  return [
    b('first-meal', 'First fuel', 'Log your first meal', 'restaurant', s.meals, 1),
    b('first-workout', 'First launch', 'Log your first workout', 'barbell', s.workouts, 1),
    b('streak-3', 'In orbit', 'Reach a 3-day streak', 'planet', s.streak, 3),
    b('streak-7', 'Week in orbit', 'Reach a 7-day streak', 'flame', s.streak, 7),
    b('streak-30', 'Month in orbit', 'Reach a 30-day streak', 'rocket', s.streak, 30),
    b('meals-25', 'Fuel tank', 'Log 25 meals', 'nutrition', s.meals, 25),
    b('workouts-10', 'Ten burns', 'Log 10 workouts', 'trophy', s.workouts, 10),
    b('level-5', 'Rising star', 'Reach level 5', 'star', s.level, 5),
    b('level-10', 'Commander', 'Reach level 10', 'shield', s.level, 10),
  ];
}
