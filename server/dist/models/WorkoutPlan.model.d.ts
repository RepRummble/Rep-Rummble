import mongoose, { Document } from 'mongoose';
export interface IWorkoutExercise {
    exerciseId: mongoose.Types.ObjectId;
    exerciseName: string;
    sets: number;
    reps: number | 'to_failure' | 'max';
    duration?: number;
    restSeconds: number;
    notes?: string;
    order: number;
}
export interface IWorkoutDay {
    day: number;
    name: string;
    focus: string;
    exercises: IWorkoutExercise[];
    estimatedDuration: number;
    estimatedCalories: number;
    isRestDay: boolean;
}
export interface IProgression {
    week: number;
    adjustments: string[];
    intensityMultiplier: number;
}
export interface IWorkoutPlan extends Document {
    userId: mongoose.Types.ObjectId;
    name: string;
    description: string;
    goal: 'weight_loss' | 'muscle_gain' | 'endurance' | 'flexibility' | 'general_fitness' | 'strength';
    fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
    durationWeeks: number;
    daysPerWeek: number;
    minutesPerWorkout: number;
    availableEquipment: string[];
    schedule: IWorkoutDay[];
    progressions: IProgression[];
    isAIGenerated: boolean;
    aiPrompt?: string;
    currentWeek: number;
    currentDay: number;
    completedWorkouts: number;
    totalWorkouts: number;
    isActive: boolean;
    startDate?: Date;
    endDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const WorkoutPlan: mongoose.Model<IWorkoutPlan, {}, {}, {}, Document<unknown, {}, IWorkoutPlan, {}, mongoose.DefaultSchemaOptions> & IWorkoutPlan & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IWorkoutPlan & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
//# sourceMappingURL=WorkoutPlan.model.d.ts.map