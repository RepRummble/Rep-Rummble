/**
 * Seed script — run with: npx ts-node src/scripts/seed.ts
 * Creates sample exercises, meals, and workout data for development
 */
import dotenv from 'dotenv'
dotenv.config({ quiet: true })

import mongoose from 'mongoose'
import { Exercise } from '../models/Exercise.model'
import { Meal } from '../models/Meal.model'
import { Workout } from '../models/Workout.model'

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/reprummble'

const EXERCISES = [
  { name: 'Barbell Back Squat', slug: 'barbell-back-squat', category: 'strength', muscleGroups: ['quads', 'glutes', 'hamstrings'], difficulty: 'intermediate', equipment: ['barbell', 'rack'], description: 'The king of lower body exercises. Builds quad, glute, and hamstring strength.', instructions: ['Stand with barbell on upper back', 'Feet shoulder-width apart', 'Descend until thighs are parallel', 'Drive through heels to stand'], caloriesPerMinute: 8, defaultSets: 4, defaultReps: 6, restBetweenSets: 180 },
  { name: 'Bench Press', slug: 'bench-press', category: 'strength', muscleGroups: ['chest', 'triceps', 'shoulders'], difficulty: 'intermediate', equipment: ['barbell', 'bench'], description: 'Primary chest exercise for upper body pushing strength.', instructions: ['Lie flat on bench', 'Grip bar slightly wider than shoulders', 'Lower to chest under control', 'Press to lockout'], caloriesPerMinute: 7, defaultSets: 4, defaultReps: 8, restBetweenSets: 120 },
  { name: 'Deadlift', slug: 'deadlift', category: 'strength', muscleGroups: ['lower_back', 'glutes', 'hamstrings'], difficulty: 'intermediate', equipment: ['barbell'], description: 'Full-body compound lift targeting the posterior chain.', instructions: ['Stand over barbell', 'Hip-width stance', 'Hinge at hips to grip bar', 'Drive hips forward to stand'], caloriesPerMinute: 9, defaultSets: 3, defaultReps: 5, restBetweenSets: 180 },
  { name: 'Pull-Up', slug: 'pull-up', category: 'strength', muscleGroups: ['back', 'biceps'], difficulty: 'intermediate', equipment: ['pull-up bar'], description: 'Upper body pulling exercise for back width and bicep strength.', instructions: ['Hang from bar with overhand grip', 'Pull chest to bar', 'Lower with control'], caloriesPerMinute: 6, defaultSets: 3, defaultReps: 8, restBetweenSets: 90 },
  { name: 'Running', slug: 'running', category: 'cardio', muscleGroups: ['cardio', 'quads', 'calves'], difficulty: 'beginner', equipment: [], description: 'Cardiovascular endurance exercise.', instructions: ['Maintain upright posture', 'Land midfoot', 'Keep cadence around 170-180 spm'], caloriesPerMinute: 11, defaultDuration: 30, restBetweenSets: 0 },
  { name: 'Plank', slug: 'plank', category: 'core', muscleGroups: ['core', 'abs'], difficulty: 'beginner', equipment: [], description: 'Isometric core stability exercise.', instructions: ['Forearms on ground', 'Body straight from head to heels', 'Hold position'], caloriesPerMinute: 4, defaultSets: 3, defaultDuration: 60, restBetweenSets: 60 },
]

const MEAL_TEMPLATES = [
  { foodName: 'Oatmeal with banana', calories: 380, protein: 12, carbs: 68, fat: 7, mealType: 'breakfast', healthScore: 85 },
  { foodName: 'Grilled chicken breast with rice', calories: 520, protein: 48, carbs: 52, fat: 9, mealType: 'lunch', healthScore: 88 },
  { foodName: 'Greek yogurt with berries', calories: 220, protein: 18, carbs: 28, fat: 4, mealType: 'snack', healthScore: 90 },
  { foodName: 'Salmon with sweet potato', calories: 580, protein: 44, carbs: 45, fat: 18, mealType: 'dinner', healthScore: 92 },
  { foodName: 'Scrambled eggs with toast', calories: 420, protein: 24, carbs: 38, fat: 16, mealType: 'breakfast', healthScore: 78 },
  { foodName: 'Protein shake', calories: 180, protein: 30, carbs: 12, fat: 3, mealType: 'snack', healthScore: 80 },
  { foodName: 'Turkey sandwich', calories: 460, protein: 32, carbs: 48, fat: 12, mealType: 'lunch', healthScore: 75 },
  { foodName: 'Beef stir fry with vegetables', calories: 540, protein: 38, carbs: 42, fat: 20, mealType: 'dinner', healthScore: 82 },
]

async function seed() {
  await mongoose.connect(MONGO_URI)
  console.log('✅ Connected to MongoDB')

  // Clear existing seed data
  await Exercise.deleteMany({ isAIGenerated: false })
  console.log('🗑  Cleared existing exercises')

  // Seed exercises
  const exercises = await Exercise.insertMany(EXERCISES.map(e => ({ ...e, isActive: true, isAIGenerated: false })))
  console.log(`✅ Seeded ${exercises.length} exercises`)

  console.log('\n📝 Note: Meals and workouts require a real userId from Supabase auth.')
  console.log('   Log in first, then meals/workouts will be created via the API.\n')

  await mongoose.disconnect()
  console.log('✅ Seed complete')
}

seed().catch(console.error)
