import mongoose, { Document, Schema } from 'mongoose'

// Detected food item from AI analysis
export interface IDetectedFood {
  name: string
  confidence: number
  portion: 'small' | 'medium' | 'large' | 'xl'
  boundingBox?: {
    x: number
    y: number
    width: number
    height: number
  }
}

// Food alternative suggestion
export interface IFoodAlternative {
  name: string
  calories: number
  reason: string
}

export interface IMeal extends Document {
  userId: string // Supabase user id (UUID)
  foodName: string
  calories: number
  carbs: number
  protein: number
  fat: number
  fiber?: number
  sugar?: number
  sodium?: number
  imageUrl?: string
  confidence?: number
  servingSize?: string
  timestamp: Date
  createdAt: Date
  updatedAt: Date

  // AI-enhanced fields
  isAIGenerated?: boolean
  detectedFoods?: IDetectedFood[]
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  healthScore?: number
  aiSuggestions?: string[]
  alternatives?: IFoodAlternative[]
}

const MealSchema = new Schema<IMeal>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  foodName: {
    type: String,
    required: [true, 'Food name is required'],
    trim: true
  },
  calories: {
    type: Number,
    required: [true, 'Calories are required'],
    min: 0
  },
  carbs: {
    type: Number,
    required: [true, 'Carbs are required'],
    min: 0
  },
  protein: {
    type: Number,
    required: [true, 'Protein is required'],
    min: 0
  },
  fat: {
    type: Number,
    required: [true, 'Fat is required'],
    min: 0
  },
  fiber: {
    type: Number,
    min: 0
  },
  sugar: {
    type: Number,
    min: 0
  },
  sodium: {
    type: Number,
    min: 0
  },
  imageUrl: String,
  confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  servingSize: String,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },

  // AI-enhanced fields
  isAIGenerated: {
    type: Boolean,
    default: false
  },
  detectedFoods: [{
    name: { type: String, required: true },
    confidence: { type: Number, min: 0, max: 1 },
    portion: {
      type: String,
      enum: ['small', 'medium', 'large', 'xl'],
      default: 'medium'
    },
    boundingBox: {
      x: Number,
      y: Number,
      width: Number,
      height: Number
    }
  }],
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack']
  },
  healthScore: {
    type: Number,
    min: 0,
    max: 100
  },
  aiSuggestions: [String],
  alternatives: [{
    name: { type: String, required: true },
    calories: { type: Number, required: true },
    reason: { type: String, required: true }
  }]
}, {
  timestamps: true
})

// Compound index for user meals by date
MealSchema.index({ userId: 1, timestamp: -1 })

export const Meal = mongoose.model<IMeal>('Meal', MealSchema)
