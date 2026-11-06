import mongoose, { Document } from 'mongoose';
export interface IDetectedFood {
    name: string;
    confidence: number;
    portion: 'small' | 'medium' | 'large' | 'xl';
    boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
export interface IFoodAlternative {
    name: string;
    calories: number;
    reason: string;
}
export interface IMeal extends Document {
    userId: string;
    foodName: string;
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    imageUrl?: string;
    confidence?: number;
    servingSize?: string;
    timestamp: Date;
    createdAt: Date;
    updatedAt: Date;
    isAIGenerated?: boolean;
    detectedFoods?: IDetectedFood[];
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    healthScore?: number;
    aiSuggestions?: string[];
    alternatives?: IFoodAlternative[];
}
export declare const Meal: mongoose.Model<IMeal, {}, {}, {}, Document<unknown, {}, IMeal, {}, mongoose.DefaultSchemaOptions> & IMeal & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IMeal & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
//# sourceMappingURL=Meal.model.d.ts.map