import { GoogleGenerativeAI } from '@google/generative-ai'
import { GEMINI_FALLBACK_MODEL, GEMINI_MODEL, isOverloaded } from '../config/ai'

// Types
export interface DetectedFood {
  name: string
  confidence: number
  portion: 'small' | 'medium' | 'large' | 'xl'
  estimatedCalories?: number
  estimatedProtein?: number
  estimatedCarbs?: number
  estimatedFat?: number
  /** One plain sentence: what this is, e.g. "Steamed basmati rice". */
  description?: string
  /** The amount on the plate, as people say it: "about 1 cup (180 g)". */
  amount?: string
  /** The weight in grams the numbers are for. */
  grams?: number
  /** What it is made of. */
  ingredients?: string[]
}

export interface NutritionData {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  sugar?: number
  sodium?: number
}

export interface FoodAnalysisResult {
  detectedFoods: DetectedFood[]
  totalNutrition: NutritionData
  healthScore: number
  suggestions: string[]
  alternatives: { name: string; calories: number; reason: string }[]
  confidence: number
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
}

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : undefined }
const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined)

/** Keeps only well-formed foods from the model's answer: numbers as numbers, short text, at most 12 items. */
export function cleanFoods(list: unknown): DetectedFood[] {
  if (!Array.isArray(list)) return []
  return list.slice(0, 12).flatMap((f: any): DetectedFood[] => {
    const name = str(f?.name, 80)
    if (!name) return []
    const portion = ['small', 'medium', 'large', 'xl'].includes(f?.portion) ? f.portion : 'medium'
    const conf = Number(f?.confidence)
    return [{
      name, portion,
      confidence: Number.isFinite(conf) ? Math.min(1, Math.max(0, conf)) : 0.8,
      estimatedCalories: num(f?.estimatedCalories), estimatedProtein: num(f?.estimatedProtein),
      estimatedCarbs: num(f?.estimatedCarbs), estimatedFat: num(f?.estimatedFat),
      description: str(f?.description, 160), amount: str(f?.amount, 60), grams: num(f?.grams),
      ingredients: Array.isArray(f?.ingredients) ? f.ingredients.map((i: unknown) => str(i, 40)).filter(Boolean).slice(0, 6) as string[] : undefined,
    }]
  })
}

/** The AI could not produce a real answer. We say so instead of inventing numbers. */
export class AiUnavailableError extends Error {
  constructor(message = 'Our AI could not do that right now. Please try again in a moment.') {
    super(message)
    this.name = 'AiUnavailableError'
  }
}

// Initialize Gemini client
let genAI: GoogleGenerativeAI | null = null

if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  console.log('✅ Gemini AI initialized')
} else {
  console.warn('⚠️  WARNING: GEMINI_API_KEY is not set. AI features will use fallback mode.')
}

/**
 * Runs one Gemini request. If Google is overloaded or slow we fall back to a lighter model, so a demand spike does not break scans and logging. Other errors (bad key, bad request)
 * are not retried.
 */
async function generate(input: Parameters<ReturnType<GoogleGenerativeAI['getGenerativeModel']>['generateContent']>[0]) {
  if (!genAI) throw new AiUnavailableError()
  const attempts = [
    { model: GEMINI_MODEL, timeout: 20_000 },
    { model: GEMINI_FALLBACK_MODEL, timeout: 30_000 },
  ]
  let lastError: unknown
  for (let i = 0; i < attempts.length; i++) {
    try {
      return await genAI.getGenerativeModel({ model: attempts[i].model }, { timeout: attempts[i].timeout }).generateContent(input)
    } catch (err) {
      lastError = err
      if (!isOverloaded(err)) throw err
      console.warn(`Gemini ${attempts[i].model} busy or slow (attempt ${i + 1}/${attempts.length})`)
    }
  }
  throw lastError
}

/**
 * Analyze food image using Google Gemini Vision
 * FREE: 1500 requests/day, 60 requests/minute
 */
export async function analyzeFoodImageWithGemini(
  imageBase64: string,
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
): Promise<FoodAnalysisResult> {
  try {
    if (!genAI) {
      throw new AiUnavailableError()
    }


    const prompt = `You are an expert nutritionist. Analyze this food image and provide detailed nutrition information.

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "detectedFoods": [
    {
      "name": "food name",
      "confidence": 0.0-1.0,
      "portion": "small|medium|large|xl",
      "estimatedCalories": number,
      "estimatedProtein": number,
      "estimatedCarbs": number,
      "estimatedFat": number,
      "description": "one plain sentence saying exactly what this food is",
      "amount": "the amount on the plate, e.g. about 1 cup (180 g)",
      "grams": number,
      "ingredients": ["main ingredients, at most 6"]
    }
  ],
  "totalNutrition": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number,
    "fiber": number,
    "sugar": number,
    "sodium": number
  },
  "healthScore": 0-100,
  "suggestions": ["suggestion1", "suggestion2"],
  "alternatives": [
    {"name": "healthier food", "calories": number, "reason": "why healthier"}
  ],
  "overallConfidence": 0.0-1.0
}

Guidelines:
- Identify ALL visible food items and name each one specifically (say "Chicken biryani", not "rice dish")
- For each item give its own calories and macros for the amount shown, and the weight in grams
- The item numbers must add up to totalNutrition
- Be accurate with Indian cuisine (biryani, dosa, curry, etc.)
- Estimate portion sizes based on visual cues
- Health score: consider protein, fiber, sodium, sugar
- Provide actionable suggestions`

    const result = await generate([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64
        }
      }
    ])

    const response = await result.response
    const text = response.text()

    // Parse JSON from response
    let jsonStr = text.trim()
    // Remove markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    }

    const analysisData = JSON.parse(jsonStr)

    return {
      detectedFoods: cleanFoods(analysisData.detectedFoods),
      totalNutrition: analysisData.totalNutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
      healthScore: analysisData.healthScore || 70,
      suggestions: analysisData.suggestions || [],
      alternatives: analysisData.alternatives || [],
      confidence: analysisData.overallConfidence || 0.85,
      mealType: mealType || detectMealType()
    }
  } catch (error: any) {
    console.error('Gemini AI Error:', error)
    throw new AiUnavailableError()
  }
}

/**
 * Quick log meal from text description using Gemini
 */
export async function quickLogMealWithGemini(description: string): Promise<FoodAnalysisResult> {
  try {
    if (!genAI) {
      throw new AiUnavailableError()
    }


    const prompt = `You are a nutritionist. Parse this meal description and estimate nutrition.

Meal description: "${description}"

Return ONLY valid JSON (no markdown):
{
  "detectedFoods": [
    {
      "name": "food name",
      "confidence": 0.9,
      "portion": "medium",
      "estimatedCalories": number,
      "estimatedProtein": number,
      "estimatedCarbs": number,
      "estimatedFat": number,
      "description": "one plain sentence saying exactly what this food is",
      "amount": "e.g. 2 slices (60 g)",
      "grams": number,
      "ingredients": ["main ingredients, at most 6"]
    }
  ],
  "totalNutrition": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number,
    "fiber": number,
    "sugar": number,
    "sodium": number
  },
  "healthScore": 0-100,
  "suggestions": ["tip1", "tip2"],
  "alternatives": []
}`

    const result = await generate(prompt)
    const response = await result.response
    const text = response.text()

    let jsonStr = text.trim()
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    }

    const data = JSON.parse(jsonStr)

    return {
      detectedFoods: cleanFoods(data.detectedFoods),
      totalNutrition: data.totalNutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
      healthScore: data.healthScore || 70,
      suggestions: data.suggestions || [],
      alternatives: data.alternatives || [],
      confidence: 0.9,
      mealType: detectMealType()
    }
  } catch (error: any) {
    console.error('Gemini Quick Log Error:', error)
    throw new AiUnavailableError()
  }
}

/**
 * Generate workout plan using Gemini
 */
export async function generateWorkoutPlanWithGemini(
  goal: string,
  fitnessLevel: string,
  daysPerWeek: number
): Promise<any> {
  try {
    if (!genAI) {
      throw new AiUnavailableError()
    }


    const prompt = `Create a workout plan with these parameters:
- Goal: ${goal}
- Fitness Level: ${fitnessLevel}
- Days per week: ${daysPerWeek}

Return ONLY valid JSON:
{
  "planName": "string",
  "duration": "4 weeks",
  "days": [
    {
      "day": "Monday",
      "focus": "Chest & Triceps",
      "exercises": [
        {
          "name": "Exercise name",
          "sets": 3,
          "reps": "10-12",
          "rest": "60s",
          "notes": "form tips"
        }
      ]
    }
  ],
  "tips": ["tip1", "tip2"]
}`

    const result = await generate(prompt)
    const response = await result.response
    const text = response.text()

    let jsonStr = text.trim()
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    }

    return JSON.parse(jsonStr)
  } catch (error: any) {
    console.error('Gemini Workout Plan Error:', error)
    throw new AiUnavailableError()
  }
}

/**
 * Get nutrition info for a food item
 */
export async function getNutritionInfoWithGemini(foodName: string): Promise<NutritionData> {
  try {
    if (!genAI) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 }
    }


    const prompt = `Provide nutrition info for: "${foodName}" (1 serving)

Return ONLY valid JSON:
{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "sugar": number,
  "sodium": number
}`

    const result = await generate(prompt)
    const response = await result.response
    const text = response.text()

    let jsonStr = text.trim()
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    }

    return JSON.parse(jsonStr)
  } catch (error) {
    console.error('Gemini Nutrition Error:', error)
    throw new AiUnavailableError()
  }
}

// Helper functions
function detectMealType(): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 11) return 'breakfast'
  if (hour >= 11 && hour < 15) return 'lunch'
  if (hour >= 15 && hour < 18) return 'snack'
  return 'dinner'
}

export default {
  analyzeFoodImageWithGemini,
  quickLogMealWithGemini,
  generateWorkoutPlanWithGemini,
  getNutritionInfoWithGemini
}
