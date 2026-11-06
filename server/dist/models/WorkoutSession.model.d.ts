import mongoose, { Document } from 'mongoose';
export interface IFormIssue {
    bodyPart: string;
    issue: string;
    severity: 'minor' | 'moderate' | 'severe';
    correction: string;
    timestamp: number;
}
export interface IRepAnalysis {
    repNumber: number;
    formScore: number;
    issues: IFormIssue[];
    jointAngles: {
        joint: string;
        angle: number;
        targetMin: number;
        targetMax: number;
        inRange: boolean;
    }[];
    rangeOfMotion: number;
    tempo: {
        eccentric: number;
        concentric: number;
        isControlled: boolean;
    };
    timestamp: Date;
}
export interface ISessionExercise {
    exerciseId: mongoose.Types.ObjectId;
    exerciseName: string;
    targetSets: number;
    targetReps: number;
    completedSets: number;
    completedReps: number;
    repsAnalysis: IRepAnalysis[];
    averageFormScore: number;
    totalReps: number;
    goodReps: number;
    improvementTips: string[];
    startTime: Date;
    endTime?: Date;
    totalDuration: number;
    usedPoseDetection: boolean;
}
export interface IWorkoutSession extends Document {
    userId: mongoose.Types.ObjectId;
    workoutPlanId?: mongoose.Types.ObjectId;
    name: string;
    type: 'planned' | 'quick' | 'custom';
    exercises: ISessionExercise[];
    overallFormScore: number;
    totalDuration: number;
    caloriesBurned: number;
    totalReps: number;
    totalSets: number;
    achievements: string[];
    xpEarned: number;
    status: 'in_progress' | 'completed' | 'abandoned';
    startTime: Date;
    endTime?: Date;
    userNotes?: string;
    aiSummary?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const WorkoutSession: mongoose.Model<IWorkoutSession, {}, {}, {}, Document<unknown, {}, IWorkoutSession, {}, mongoose.DefaultSchemaOptions> & IWorkoutSession & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IWorkoutSession & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
//# sourceMappingURL=WorkoutSession.model.d.ts.map