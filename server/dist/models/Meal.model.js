"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Meal = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const MealSchema = new mongoose_1.Schema({
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
});
// Compound index for user meals by date
MealSchema.index({ userId: 1, timestamp: -1 });
exports.Meal = mongoose_1.default.model('Meal', MealSchema);
//# sourceMappingURL=Meal.model.js.map