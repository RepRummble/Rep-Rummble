import mongoose, { Document } from 'mongoose';
export interface IBodyAngle {
    joint: string;
    minAngle: number;
    maxAngle: number;
    description: string;
}
export interface IPoseKeypoint {
    phase: 'start' | 'middle' | 'end';
    bodyAngles: IBodyAngle[];
    description: string;
}
export interface IExerciseModification {
    easier: string;
    harder: string;
}
export interface IExercise extends Document {
    name: string;
    slug: string;
    category: 'strength' | 'cardio' | 'flexibility' | 'balance' | 'hiit' | 'core';
    muscleGroups: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    equipment: string[];
    description: string;
    instructions: string[];
    commonMistakes: string[];
    breathingPattern: string;
    safetyTips: string[];
    benefits: string[];
    modifications: IExerciseModification;
    poseKeypoints: IPoseKeypoint[];
    repCountMethod: 'angle_threshold' | 'position_threshold' | 'time_based';
    caloriesPerMinute: number;
    defaultDuration: number;
    defaultSets: number;
    defaultReps: number;
    restBetweenSets: number;
    thumbnailUrl?: string;
    videoUrl?: string;
    animationData?: object;
    isAIGenerated: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Exercise: mongoose.Model<IExercise, {}, {}, {}, Document<unknown, {}, IExercise, {}, mongoose.DefaultSchemaOptions> & IExercise & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IExercise & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
//# sourceMappingURL=Exercise.model.d.ts.map