import mongoose, { Document } from 'mongoose';
export interface IWorkingSchedule {
    day: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    start: string;
    end: string;
}
export interface IWorkingHours {
    timezone: string;
    schedule: IWorkingSchedule[];
}
export interface ISupportAgent extends Document {
    userId: mongoose.Types.ObjectId;
    email: string;
    displayName: string;
    avatar?: string;
    status: 'online' | 'away' | 'busy' | 'offline';
    isAvailable: boolean;
    maxConcurrentChats: number;
    currentChatCount: number;
    specializations: ('billing' | 'technical' | 'account' | 'general')[];
    totalChatsHandled: number;
    averageRating: number;
    averageResponseTime: number;
    workingHours?: IWorkingHours;
    lastActiveAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const SupportAgent: mongoose.Model<ISupportAgent, {}, {}, {}, Document<unknown, {}, ISupportAgent, {}, mongoose.DefaultSchemaOptions> & ISupportAgent & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ISupportAgent & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
//# sourceMappingURL=SupportAgent.model.d.ts.map