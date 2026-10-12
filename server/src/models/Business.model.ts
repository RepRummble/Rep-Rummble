import mongoose, { Document, Schema } from 'mongoose'

export const BUSINESS_TYPES = [
  'Gym', 'CrossFit box', 'Studio', 'Personal trainer', 'Online coach', 'Nutritionist / dietitian',
  'Employer / corporate wellness', 'Clinic / physiotherapist', 'Club / community', 'Other',
] as const
export const STAFF_ROLES = ['Coach', 'Nutritionist', 'Viewer'] as const

export type BusinessStatus = 'pending' | 'approved' | 'rejected'

export interface IBusiness extends Document {
  ownerId: string
  ownerEmail: string
  name: string
  type: string
  city: string
  contactEmail: string
  size: string
  message: string
  status: BusinessStatus
  reviewedAt?: Date
  reviewedBy?: string
  rejectionReason?: string
  createdAt: Date
}

const BusinessSchema = new Schema<IBusiness>({
  ownerId: { type: String, required: true, unique: true }, // one business per account
  ownerEmail: { type: String, required: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  type: { type: String, required: true, enum: BUSINESS_TYPES },
  city: { type: String, trim: true, maxlength: 120, default: '' },
  contactEmail: { type: String, lowercase: true, trim: true, maxlength: 254, default: '' },
  size: { type: String, trim: true, maxlength: 40, default: '' },
  message: { type: String, trim: true, maxlength: 2000, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  reviewedAt: Date,
  reviewedBy: String,
  rejectionReason: { type: String, maxlength: 500 },
}, { timestamps: true })

// Team members (the owner is implicit). They sign in with this email.
export interface IBusinessStaff extends Document {
  businessId: mongoose.Types.ObjectId
  email: string
  name: string
  role: (typeof STAFF_ROLES)[number]
}

const BusinessStaffSchema = new Schema<IBusinessStaff>({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true, index: true, maxlength: 254 },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  role: { type: String, enum: STAFF_ROLES, required: true },
}, { timestamps: true })
BusinessStaffSchema.index({ businessId: 1, email: 1 }, { unique: true })

export interface IBusinessPlan extends Document {
  businessId: mongoose.Types.ObjectId
  name: string
  goal: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  weeks: number
  daysPerWeek: number
  notes: string
}

const BusinessPlanSchema = new Schema<IBusinessPlan>({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  goal: { type: String, trim: true, maxlength: 60, default: '' },
  level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], required: true },
  weeks: { type: Number, required: true, min: 1, max: 52 },
  daysPerWeek: { type: Number, required: true, min: 1, max: 7 },
  notes: { type: String, trim: true, maxlength: 500, default: '' },
}, { timestamps: true })

export interface IBusinessMealPlan extends Document {
  businessId: mongoose.Types.ObjectId
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  mealsPerDay: number
  notes: string
}

const BusinessMealPlanSchema = new Schema<IBusinessMealPlan>({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  calories: { type: Number, required: true, min: 800, max: 6000 },
  protein: { type: Number, required: true, min: 0, max: 1000 },
  carbs: { type: Number, required: true, min: 0, max: 1500 },
  fat: { type: Number, required: true, min: 0, max: 600 },
  mealsPerDay: { type: Number, required: true, min: 1, max: 8 },
  notes: { type: String, trim: true, maxlength: 500, default: '' },
}, { timestamps: true })

export interface IBusinessFood extends Document {
  businessId: mongoose.Types.ObjectId
  name: string
  serving: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

const BusinessFoodSchema = new Schema<IBusinessFood>({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  serving: { type: String, trim: true, maxlength: 40, default: '100 g' },
  calories: { type: Number, required: true, min: 0, max: 5000 },
  protein: { type: Number, required: true, min: 0, max: 500 },
  carbs: { type: Number, required: true, min: 0, max: 500 },
  fat: { type: Number, required: true, min: 0, max: 500 },
}, { timestamps: true })

// A person the business looks after. `userId` is filled in the first time that person signs in
// with the invited email; until then they are "invited".
export interface IBusinessMember extends Document {
  businessId: mongoose.Types.ObjectId
  name: string
  email: string
  planId: mongoose.Types.ObjectId | null
  mealPlanId: mongoose.Types.ObjectId | null
  userId?: string
  createdAt: Date
}

const BusinessMemberSchema = new Schema<IBusinessMember>({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, lowercase: true, trim: true, index: true, maxlength: 254 },
  planId: { type: Schema.Types.ObjectId, ref: 'BusinessPlan', default: null },
  mealPlanId: { type: Schema.Types.ObjectId, ref: 'BusinessMealPlan', default: null },
  userId: { type: String, index: true },
}, { timestamps: true })
BusinessMemberSchema.index({ businessId: 1, email: 1 }, { unique: true })

export const Business = mongoose.model<IBusiness>('Business', BusinessSchema)
export const BusinessStaff = mongoose.model<IBusinessStaff>('BusinessStaff', BusinessStaffSchema)
export const BusinessPlan = mongoose.model<IBusinessPlan>('BusinessPlan', BusinessPlanSchema)
export const BusinessMealPlan = mongoose.model<IBusinessMealPlan>('BusinessMealPlan', BusinessMealPlanSchema)
export const BusinessFood = mongoose.model<IBusinessFood>('BusinessFood', BusinessFoodSchema)
export const BusinessMember = mongoose.model<IBusinessMember>('BusinessMember', BusinessMemberSchema)
