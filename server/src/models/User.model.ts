import mongoose, { Document, Schema } from 'mongoose'
import bcrypt from 'bcryptjs'

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

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    displayName: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      // Never settable from client-supplied request bodies — only changed
      // via a trusted, server-side path (e.g. a seed script or DB console).
      select: true,
    },
    streak: {
      type: Number,
      default: 0,
      min: 0,
    },
    xp: {
      type: Number,
      default: 0,
      min: 0,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
    },
    friends: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    healthMetrics: {
      steps: { type: Number, default: 0 },
      calories: { type: Number, default: 0 },
      heartRate: { type: Number },
      sleepHours: { type: Number, default: 0 },
      hrv: { type: Number },
      restingHR: { type: Number },
      weight: { type: Number },
      bodyFat: { type: Number },
      lastSync: { type: Date },
    },
  },
  {
    timestamps: true,
  },
);

// Hash password before saving.
// Mongoose 9 no longer passes `next` to hooks: just return, or throw to fail the save.
UserSchema.pre('save', async function (this: IUser) {
  if (!this.isModified('password')) return

  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password)
}

export const User = mongoose.model<IUser>('User', UserSchema)
