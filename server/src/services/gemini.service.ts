import { GoogleGenerativeAI } from '@google/generative-ai'
import { GEMINI_MODEL } from '../config/ai'

// Types
export interface DetectedFood {
  name: string
  confidence: number
  portion: 'small' | 'medium' | 'large' | 'xl'
  estimatedCalories?: number
  estimatedProtein?: number
  estimatedCarbs?: number
  estimatedFat?: number
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

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })

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
      "estimatedFat": number
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
- Identify ALL visible food items
- Be accurate with Indian cuisine (biryani, dosa, curry, etc.)
- Estimate portion sizes based on visual cues
- Health score: consider protein, fiber, sodium, sugar
- Provide actionable suggestions`

    const result = await model.generateContent([
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
      detectedFoods: analysisData.detectedFoods || [],
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

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })

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
      "estimatedFat": number
    }
  ],
  "totalNutrition": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number
  },
  "healthScore": 0-100,
  "suggestions": ["tip1", "tip2"],
  "alternatives": []
}`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    let jsonStr = text.trim()
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    }

    const data = JSON.parse(jsonStr)

    return {
      detectedFoods: data.detectedFoods || [],
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

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })

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

    const result = await model.generateContent(prompt)
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

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })

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

    const result = await model.generateContent(prompt)
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
