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
exports.WorkoutSession = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const WorkoutSessionSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    workoutPlanId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'WorkoutPlan'
    },
    name: {
        type: String,
        required: true,
        default: 'Quick Workout'
    },
    type: {
        type: String,
        enum: ['planned', 'quick', 'custom'],
        default: 'quick'
    },
    exercises: [{
            exerciseId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Exercise' },
            exerciseName: { type: String, required: true },
            targetSets: { type: Number, default: 3 },
            targetReps: { type: Number, default: 10 },
            completedSets: { type: Number, default: 0 },
            completedReps: { type: Number, default: 0 },
            repsAnalysis: [{
                    repNumber: Number,
                    formScore: Number,
                    issues: [{
                            bodyPart: String,
                            issue: String,
                            severity: {
                                type: String,
                                enum: ['minor', 'moderate', 'severe']
                            },
                            correction: String,
                            timestamp: Number
                        }],
                    jointAngles: [{
                            joint: String,
                            angle: Number,
                            targetMin: Number,
                            targetMax: Number,
                            inRange: Boolean
                        }],
                    rangeOfMotion: Number,
                    tempo: {
                        eccentric: Number,
                        concentric: Number,
                        isControlled: Boolean
                    },
                    timestamp: Date
                }],
            averageFormScore: { type: Number, default: 0 },
            totalReps: { type: Number, default: 0 },
            goodReps: { type: Number, default: 0 },
            improvementTips: [String],
            startTime: Date,
            endTime: Date,
            totalDuration: { type: Number, default: 0 },
            usedPoseDetection: { type: Boolean, default: false }
        }],
    // Overall metrics
    overallFormScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    totalDuration: {
        type: Number,
        default: 0
    },
    caloriesBurned: {
        type: Number,
        default: 0
    },
    totalReps: {
        type: Number,
        default: 0
    },
    totalSets: {
        type: Number,
        default: 0
    },
    // Achievements
    achievements: [String],
    xpEarned: {
        type: Number,
        default: 0
    },
    // Status
    status: {
        type: String,
        enum: ['in_progress', 'completed', 'abandoned'],
        default: 'in_progress'
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: Date,
    // Notes
    userNotes: String,
    aiSummary: String
}, {
    timestamps: true
});
// Indexes
WorkoutSessionSchema.index({ userId: 1, startTime: -1 });
WorkoutSessionSchema.index({ userId: 1, status: 1 });
// Calculate metrics before saving
WorkoutSessionSchema.pre('save', function () {
    if (this.exercises && this.exercises.length > 0) {
        // Calculate totals
        this.totalReps = this.exercises.reduce((sum, ex) => sum + ex.completedReps, 0);
        this.totalSets = this.exercises.reduce((sum, ex) => sum + ex.completedSets, 0);
        // Calculate average form score
        const exercisesWithScores = this.exercises.filter(ex => ex.averageFormScore > 0);
        if (exercisesWithScores.length > 0) {
            this.overallFormScore = Math.round(exercisesWithScores.reduce((sum, ex) => sum + ex.averageFormScore, 0) / exercisesWithScores.length);
        }
        // Calculate XP (10 per exercise + bonus for good form)
        this.xpEarned = this.exercises.length * 10;
        if (this.overallFormScore >= 80) {
            this.xpEarned += 20; // Perfect form bonus
        }
        else if (this.overallFormScore >= 60) {
            this.xpEarned += 10; // Good form bonus
        }
    }
});
exports.WorkoutSession = mongoose_1.default.model('WorkoutSession', WorkoutSessionSchema);
//# sourceMappingURL=WorkoutSession.model.js.map