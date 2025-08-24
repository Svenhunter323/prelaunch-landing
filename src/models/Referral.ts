import mongoose, { Document, Schema } from 'mongoose';

export interface IReferral extends Document {
  referrerId: mongoose.Types.ObjectId;
  referredUserId: mongoose.Types.ObjectId;
  status: 'pending' | 'eligible' | 'invalid';
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const referralSchema = new Schema<IReferral>({
  referrerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  referredUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'eligible', 'invalid'],
    default: 'pending',
    index: true,
  },
  reason: {
    type: String,
  },
}, {
  timestamps: true,
});

// Compound indexes
referralSchema.index({ referrerId: 1, status: 1 });
referralSchema.index({ referredUserId: 1 }, { unique: true });

export const Referral = mongoose.model<IReferral>('Referral', referralSchema);