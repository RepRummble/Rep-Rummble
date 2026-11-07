import { Workout } from '../models/Workout.model'
import { Meal } from '../models/Meal.model'

// Facts shown on a shared workout or meal card. They are always copied from the person's real record on the server,
// so a card cannot claim something that was never logged.

export interface WorkoutSnapshot { exercise: string; duration: number; volume?: number; setCount?: number; calories?: number; topSet?: { exercise: string; weight: number; reps: number } }
export interface MealSnapshot { foodName: string; calories: number; protein: number; carbs: number; fat: number; mealType?: string }

export async function workoutSnapshot(workoutId: string, supabaseId: string): Promise<WorkoutSnapshot | null> {
  const w = await Workout.findOne({ _id: workoutId, userId: supabaseId }).lean()
  if (!w) return null
  const sets = w.sets ?? []
  const top = [...sets].sort((a, b) => b.weight * (1 + b.reps / 30) - a.weight * (1 + a.reps / 30))[0]
  return {
    exercise: w.exercise, duration: w.duration,
    ...(w.volume ? { volume: w.volume } : {}), ...(sets.length ? { setCount: sets.length } : {}), ...(w.calories ? { calories: w.calories } : {}),
    ...(top && top.weight > 0 ? { topSet: { exercise: top.exercise, weight: top.weight, reps: top.reps } } : {}),
  }
}

export async function mealSnapshot(mealId: string, supabaseId: string): Promise<MealSnapshot | null> {
  const m = await Meal.findOne({ _id: mealId, userId: supabaseId }).lean()
  if (!m) return null
  return { foodName: m.foodName, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat, ...(m.mealType ? { mealType: m.mealType } : {}) }
}
