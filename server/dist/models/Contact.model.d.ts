import mongoose, { Document } from 'mongoose';
export interface IContact extends Document {
    name: string;
    email: string;
    message: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Contact: mongoose.Model<IContact, {}, {}, {}, Document<unknown, {}, IContact, {}, mongoose.DefaultSchemaOptions> & IContact & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IContact & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}>;
//# sourceMappingURL=Contact.model.d.ts.map