import mongoose, { Document } from 'mongoose';
export interface IWearableData extends Document {
    userId: string;
    date: string;
    steps: number;
    calories: number;
    heartRate?: number;
    sleepHours: number;
    hrv?: number;
    restingHR?: number;
    weight?: number;
    bodyFat?: number;
    syncedAt: Date;
}
export declare const WearableData: mongoose.Model<IWearableData, {}, {}, {}, Document<unknown, {}, IWearableData, {}, mongoose.DefaultSchemaOptions> & IWearableData & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IWearableData & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
//# sourceMappingURL=WearableData.model.d.ts.map