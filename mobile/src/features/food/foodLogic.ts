// Rules behind the food-scan results: how a meal reads, in plain words. Pure functions, no React.

export interface Macros { calories: number; protein: number; carbs: number; fat: number }
export interface FoodLike {
  name: string; portion?: string; confidence?: number;
  estimatedCalories?: number; estimatedProtein?: number; estimatedCarbs?: number; estimatedFat?: number;
  description?: string; amount?: string; grams?: number; ingredients?: string[];
}

const round = (n: number) => Math.round(n);

/** Where the calories come from: the share of protein, carbs and fat, adding up to 100. */
export function macroSplit(m: Macros): { protein: number; carbs: number; fat: number } {
  const p = Math.max(0, m.protein) * 4, c = Math.max(0, m.carbs) * 4, f = Math.max(0, m.fat) * 9;
  const total = p + c + f;
  if (total <= 0) return { protein: 0, carbs: 0, fat: 0 };
  const protein = round((p / total) * 100), carbs = round((c / total) * 100);
  return { protein, carbs, fat: Math.max(0, 100 - protein - carbs) };
}

/** A title for the whole plate: "Chicken biryani", "Dosa + Sambar", "Dal + Rice + 2 more". */
export function mealTitle(foods: FoodLike[]): string {
  const names = foods.map((f) => f.name.trim()).filter(Boolean);
  if (names.length === 0) return 'Your meal';
  if (names.length <= 2) return names.join(' + ');
  return `${names.slice(0, 2).join(' + ')} + ${names.length - 2} more`;
}

export const PORTION_WORDS: Record<string, string> = { small: 'Small portion', medium: 'Medium portion', large: 'Large portion', xl: 'Extra large portion' };

/** The amount of one food, as best we know it. */
export function amountLabel(f: FoodLike): string {
  if (f.amount) return f.amount;
  if (f.grams) return `about ${round(f.grams)} g`;
  return PORTION_WORDS[f.portion ?? 'medium'] ?? 'Medium portion';
}

/** How sure the AI is, in words, so a shaky guess does not look like a fact. */
export function sureness(confidence?: number): { label: string; level: 'high' | 'medium' | 'low' } {
  const c = confidence ?? 0.8;
  if (c >= 0.8) return { label: 'Confident', level: 'high' };
  if (c >= 0.55) return { label: 'Fairly sure', level: 'medium' };
  return { label: 'Not sure — check the name', level: 'low' };
}

export function hasItemNutrition(f: FoodLike): boolean {
  return typeof f.estimatedCalories === 'number';
}

/** Whether the per-food numbers add up to roughly the total; when they do not, we only show the total. */
export function itemsAddUp(foods: FoodLike[], total: Macros): boolean {
  if (!foods.length || !foods.every(hasItemNutrition)) return false;
  const sum = foods.reduce((a, f) => a + (f.estimatedCalories ?? 0), 0);
  return total.calories > 0 && Math.abs(sum - total.calories) / total.calories <= 0.25;
}

export interface Highlight { label: string; tone: 'good' | 'watch' | 'info' }

/** The few things worth knowing about this meal. Limits follow common daily guidance, per meal. */
export function highlights(m: Macros & { fiber?: number; sugar?: number; sodium?: number }): Highlight[] {
  const out: Highlight[] = [];
  if (m.protein >= 25) out.push({ label: 'High protein', tone: 'good' });
  else if (m.protein < 8 && m.calories > 150) out.push({ label: 'Low protein', tone: 'watch' });
  if ((m.fiber ?? 0) >= 6) out.push({ label: 'Good fibre', tone: 'good' });
  if ((m.sugar ?? 0) >= 25) out.push({ label: 'High sugar', tone: 'watch' });
  else if (m.sugar !== undefined && m.sugar <= 5) out.push({ label: 'Low sugar', tone: 'good' });
  if ((m.sodium ?? 0) >= 900) out.push({ label: 'High salt', tone: 'watch' });
  if (m.fat >= 30) out.push({ label: 'High fat', tone: 'watch' });
  if (m.calories >= 800) out.push({ label: 'Big meal', tone: 'info' });
  else if (m.calories > 0 && m.calories <= 250) out.push({ label: 'Light', tone: 'info' });
  return out.slice(0, 5);
}

export const healthLabel = (score: number): { label: string; level: 'great' | 'good' | 'fair' | 'poor' } =>
  score >= 80 ? { label: 'Excellent', level: 'great' } : score >= 60 ? { label: 'Good', level: 'good' } : score >= 40 ? { label: 'Fair', level: 'fair' } : { label: 'Could be better', level: 'poor' };

/** The share of a daily target a meal uses, capped for display. */
export const shareOfDay = (value: number, target: number) => (target > 0 ? Math.min(100, round((value / target) * 100)) : 0);

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export function mealTypeByHour(h: number): (typeof MEAL_TYPES)[number] {
  return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 18 ? 'snack' : 'dinner';
}
