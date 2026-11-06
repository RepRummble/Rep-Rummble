import { Request, Response } from 'express'
import { analyzeFoodImageWithGemini, quickLogMealWithGemini } from '../services/gemini.service'
import { searchFoods } from '../services/usda.service'

/**
 * @route   POST /api/ai/analyze-food
 * @desc    Analyze food image using AI
 * @access  Private
 */
export const analyzeFood = async (req: Request, res: Response) => {
  try {
    const { imageBase64, mealType } = req.body

    // Validate input
    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        message: 'Image data is required'
      })
    }

    // Validate base64 format (basic check)
    if (typeof imageBase64 !== 'string' || imageBase64.length < 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image data format'
      })
    }

    // Validate meal type if provided
    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack']
    if (mealType && !validMealTypes.includes(mealType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meal type. Must be: breakfast, lunch, dinner, or snack'
      })
    }

    // Analyze the food image using Gemini (FREE)
    const analysisResult = await analyzeFoodImageWithGemini(imageBase64, mealType)

    return res.status(200).json({
      success: true,
      data: analysisResult
    })
  } catch (error: any) {
    console.error('Food analysis error:', error)

    // Handle specific errors
    if (error.message?.includes('API key')) {
      return res.status(503).json({
        success: false,
        message: 'AI service temporarily unavailable. Please try again later.'
      })
    }

    if (error.message?.includes('rate limit')) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please wait a moment and try again.'
      })
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to analyze food image'
    })
  }
}

/**
 * @route   POST /api/ai/quick-log
 * @desc    Quick log a meal from text description
 * @access  Private
 */
export const quickLogMeal = async (req: Request, res: Response) => {
  try {
    const { description, mealType } = req.body

    if (!description) {
      return res.status(400).json({
        success: false,
        message: 'Meal description is required'
      })
    }

    // Use Gemini for quick meal logging (FREE)
    const analysisResult = await quickLogMealWithGemini(description)

    return res.status(200).json({
      success: true,
      data: {
        ...analysisResult,
        description,
        mealType: mealType || analysisResult.mealType
      }
    })
  } catch (error: any) {
    console.error('Quick log error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process quick log'
    })
  }
}

/**
 * @route   GET /api/ai/nutrition/:foodName
 * @desc    Get nutrition info for a specific food
 * @access  Private
 */
export const getNutritionInfo = async (req: Request, res: Response) => {
  try {
    const foodName = String(req.params.foodName)

    if (!foodName) {
      return res.status(400).json({
        success: false,
        message: 'Food name is required'
      })
    }

    const results = await searchFoods(foodName)

    return res.status(200).json({
      success: true,
      data: {
        query: foodName,
        results
      }
    })
  } catch (error: any) {
    console.error('Nutrition lookup error:', error)
    if (error.message?.includes('USDA_API_KEY')) {
      return res.status(503).json({
        success: false,
        message: 'Nutrition service unavailable. USDA API key not configured.'
      })
    }
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get nutrition info'
    })
  }
}

/**
 * @route   GET /api/ai/nutrition
 * @desc    Search nutrition database with query param
 * @access  Private
 */
export const searchNutrition = async (req: Request, res: Response) => {
  try {
    const query = String(req.query.query || '').trim()
    const limit = Number(req.query.limit || 12)

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      })
    }

    const results = await searchFoods(query, Number.isFinite(limit) ? limit : 12)

    return res.status(200).json({
      success: true,
      data: {
        query,
        results
      }
    })
  } catch (error: any) {
    console.error('Nutrition search error:', error)
    if (error.message?.includes('USDA_API_KEY')) {
      return res.status(503).json({
        success: false,
        message: 'Nutrition service unavailable. USDA API key not configured.'
      })
    }
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to search nutrition info'
    })
  }
}
