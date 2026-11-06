import mongoose, { Document } from 'mongoose';
export interface IAttachment {
    type: 'image' | 'file';
    url: string;
    name: string;
    size?: number;
}
export interface IQuickReply {
    text: string;
    payload: string;
}
export interface ISupportMessage extends Document {
    conversationId: mongoose.Types.ObjectId;
    senderType: 'user' | 'ai' | 'agent' | 'system';
    senderId?: mongoose.Types.ObjectId;
    senderName?: string;
    content: string;
    contentType: 'text' | 'image' | 'file' | 'quick_reply';
    attachments?: IAttachment[];
    quickReplies?: IQuickReply[];
    isRead: boolean;
    readAt?: Date;
    deliveredAt?: Date;
    aiConfidence?: number;
    aiSuggestedEscalation?: boolean;
    createdAt: Date;
}
export declare const SupportMessage: mongoose.Model<ISupportMessage, {}, {}, {}, Document<unknown, {}, ISupportMessage, {}, mongoose.DefaultSchemaOptions> & ISupportMessage & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ISupportMessage & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
//# sourceMappingURL=SupportMessage.model.d.ts.map