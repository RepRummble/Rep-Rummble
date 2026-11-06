import mongoose, { Document } from 'mongoose';
export interface IWorkout extends Document {
    userId: string;
    exercise: string;
    duration: number;
    calories?: number;
    completed: boolean;
    timestamp: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Workout: mongoose.Model<IWorkout, {}, {}, {}, Document<unknown, {}, IWorkout, {}, mongoose.DefaultSchemaOptions> & IWorkout & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IWorkout & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
//# sourceMappingURL=Workout.model.d.ts.map