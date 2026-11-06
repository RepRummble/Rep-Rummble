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
exports.WorkoutPlan = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const WorkoutPlanSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Plan name is required'],
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    // Plan Configuration
    goal: {
        type: String,
        required: true,
        enum: ['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness', 'strength']
    },
    fitnessLevel: {
        type: String,
        required: true,
        enum: ['beginner', 'intermediate', 'advanced']
    },
    durationWeeks: {
        type: Number,
        required: true,
        min: 1,
        max: 52,
        default: 4
    },
    daysPerWeek: {
        type: Number,
        required: true,
        min: 1,
        max: 7,
        default: 3
    },
    minutesPerWorkout: {
        type: Number,
        default: 45,
        min: 10,
        max: 120
    },
    // Equipment
    availableEquipment: [{
            type: String,
            default: ['bodyweight']
        }],
    // Schedule
    schedule: [{
            day: { type: Number, required: true },
            name: { type: String, required: true },
            focus: { type: String, required: true },
            exercises: [{
                    exerciseId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Exercise' },
                    exerciseName: { type: String, required: true },
                    sets: { type: Number, required: true },
                    reps: { type: mongoose_1.Schema.Types.Mixed, required: true }, // number or string like 'to_failure'
                    duration: Number,
                    restSeconds: { type: Number, default: 60 },
                    notes: String,
                    order: { type: Number, required: true }
                }],
            estimatedDuration: { type: Number, default: 45 },
            estimatedCalories: { type: Number, default: 200 },
            isRestDay: { type: Boolean, default: false }
        }],
    // Progressions
    progressions: [{
            week: { type: Number, required: true },
            adjustments: [String],
            intensityMultiplier: { type: Number, default: 1.0 }
        }],
    // AI metadata
    isAIGenerated: {
        type: Boolean,
        default: false
    },
    aiPrompt: String,
    // Progress tracking
    currentWeek: {
        type: Number,
        default: 1
    },
    currentDay: {
        type: Number,
        default: 1
    },
    completedWorkouts: {
        type: Number,
        default: 0
    },
    totalWorkouts: {
        type: Number,
        default: 0
    },
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    startDate: Date,
    endDate: Date
}, {
    timestamps: true
});
// Indexes
WorkoutPlanSchema.index({ userId: 1, isActive: 1 });
WorkoutPlanSchema.index({ goal: 1, fitnessLevel: 1 });
// Calculate total workouts before saving
WorkoutPlanSchema.pre('save', function () {
    if (this.schedule) {
        const workoutDays = this.schedule.filter(day => !day.isRestDay).length;
        this.totalWorkouts = workoutDays * this.durationWeeks;
    }
});
exports.WorkoutPlan = mongoose_1.default.model('WorkoutPlan', WorkoutPlanSchema);
//# sourceMappingURL=WorkoutPlan.model.js.map