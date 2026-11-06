import mongoose, { Document } from "mongoose";
export interface IChallenge extends Document {
    creator: string;
    title: string;
    description: string;
    challengeType: "workout" | "nutrition" | "steps" | "weight_loss" | "calories" | "streak";
    targetValue: number;
    targetUnit: string;
    duration: number;
    startDate: Date;
    endDate: Date;
    isPublic: boolean;
    maxParticipants?: number;
    participants: string[];
    status: "active" | "completed" | "cancelled";
    createdAt: Date;
    updatedAt: Date;
}
export declare const Challenge: mongoose.Model<IChallenge, {}, {}, {}, Document<unknown, {}, IChallenge, {}, mongoose.DefaultSchemaOptions> & IChallenge & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IChallenge & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
//# sourceMappingURL=Challenge.model.d.ts.map