import mongoose, { Document } from 'mongoose';
export interface IUser extends Document {
    email: string;
    password: string;
    displayName?: string;
    role: 'user' | 'admin';
    streak: number;
    xp: number;
    level: number;
    friends: mongoose.Types.ObjectId[];
    healthMetrics?: {
        steps: number;
        calories: number;
        heartRate?: number;
        sleepHours: number;
        hrv?: number;
        restingHR?: number;
        weight?: number;
        bodyFat?: number;
        lastSync?: Date;
    };
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}
export declare const User: mongoose.Model<IUser, {}, {}, {}, Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
//# sourceMappingURL=User.model.d.ts.map