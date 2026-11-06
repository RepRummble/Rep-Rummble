import mongoose, { Document } from 'mongoose';
export interface IAIContext {
    messageCount: number;
    failedAttempts: number;
    topics: string[];
    sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated';
}
export interface ISupportConversation extends Document {
    userId?: mongoose.Types.ObjectId;
    userEmail?: string;
    userName?: string;
    sessionId: string;
    status: 'active' | 'waiting_agent' | 'with_agent' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category?: 'billing' | 'technical' | 'account' | 'general' | 'feedback';
    assignedAgentId?: mongoose.Types.ObjectId;
    assignedAt?: Date;
    escalatedFromAI: boolean;
    escalationReason?: string;
    escalationTimestamp?: Date;
    aiContext: IAIContext;
    platform: 'web' | 'ios' | 'android';
    userAgent?: string;
    lastActivityAt: Date;
    closedAt?: Date;
    satisfactionRating?: 1 | 2 | 3 | 4 | 5;
    feedbackComment?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const SupportConversation: mongoose.Model<ISupportConversation, {}, {}, {}, Document<unknown, {}, ISupportConversation, {}, mongoose.DefaultSchemaOptions> & ISupportConversation & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ISupportConversation & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
//# sourceMappingURL=SupportConversation.model.d.ts.map