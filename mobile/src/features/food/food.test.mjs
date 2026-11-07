import assert from 'node:assert/strict';
import { macroSplit, mealTitle, amountLabel, sureness, itemsAddUp, highlights, healthLabel, shareOfDay, mealTypeByHour } from './foodLogic.ts';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('macro split adds to 100 and weights fat at 9 kcal/g', () => {
  const s = macroSplit({ calories: 500, protein: 30, carbs: 50, fat: 20 });
  assert.equal(s.protein + s.carbs + s.fat, 100);
  assert.equal(s.protein, 24); assert.equal(s.carbs, 40); assert.equal(s.fat, 36);
  assert.deepEqual(macroSplit({ calories: 0, protein: 0, carbs: 0, fat: 0 }), { protein: 0, carbs: 0, fat: 0 });
});
t('titles', () => {
  assert.equal(mealTitle([]), 'Your meal');
  assert.equal(mealTitle([{ name: 'Dosa' }, { name: 'Sambar' }]), 'Dosa + Sambar');
  assert.equal(mealTitle([{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }]), 'A + B + 2 more');
});
t('amount label prefers words, then grams, then portion', () => {
  assert.equal(amountLabel({ name: 'x', amount: 'about 1 cup (180 g)', grams: 180 }), 'about 1 cup (180 g)');
  assert.equal(amountLabel({ name: 'x', grams: 180.4 }), 'about 180 g');
  assert.equal(amountLabel({ name: 'x', portion: 'large' }), 'Large portion');
});
t('sureness never presents a weak guess as fact', () => {
  assert.equal(sureness(0.95).level, 'high'); assert.equal(sureness(0.6).level, 'medium'); assert.equal(sureness(0.3).level, 'low');
});
t('items must add up to the total to be shown', () => {
  const total = { calories: 600, protein: 30, carbs: 70, fat: 20 };
  assert.equal(itemsAddUp([{ name: 'a', estimatedCalories: 350 }, { name: 'b', estimatedCalories: 260 }], total), true);
  assert.equal(itemsAddUp([{ name: 'a', estimatedCalories: 100 }], total), false);
  assert.equal(itemsAddUp([{ name: 'a' }], total), false);
});
t('highlights', () => {
  const h = highlights({ calories: 900, protein: 40, carbs: 80, fat: 35, fiber: 8, sugar: 3, sodium: 1200 }).map((x) => x.label);
  for (const l of ['High protein', 'Good fibre', 'Low sugar', 'High salt', 'High fat']) assert.ok(h.includes(l), l);
  assert.ok(highlights({ calories: 900, protein: 40, carbs: 80, fat: 35, fiber: 8, sugar: 3, sodium: 1200 }).length <= 5);
  assert.deepEqual(highlights({ calories: 200, protein: 10, carbs: 20, fat: 5 }).map((x) => x.label), ['Light']);
});
t('health labels and day share', () => {
  assert.equal(healthLabel(85).level, 'great'); assert.equal(healthLabel(30).level, 'poor');
  assert.equal(shareOfDay(550, 2200), 25); assert.equal(shareOfDay(5000, 2200), 100); assert.equal(shareOfDay(5, 0), 0);
});
t('meal type by hour', () => { assert.equal(mealTypeByHour(8), 'breakfast'); assert.equal(mealTypeByHour(13), 'lunch'); assert.equal(mealTypeByHour(20), 'dinner'); });
console.log(`${n} checks passed`);
