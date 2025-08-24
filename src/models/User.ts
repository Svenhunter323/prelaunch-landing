import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  emailVerified: boolean;
  referralCode: string;
  referredBy?: string;
  ips: string[];
  deviceFingerprints: string[];
  telegramId?: number;
  telegramVerified: boolean;
  lastChestOpenAt?: Date;
  totalCredits: number;
  firstChestOpened: boolean;
  claimCode: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  referralCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  referredBy: {
    type: String,
    index: true,
  },
  ips: [{
    type: String,
  }],
  deviceFingerprints: [{
    type: String,
  }],
  telegramId: {
    type: Number,
    sparse: true,
    index: true,
  },
  telegramVerified: {
    type: Boolean,
    default: false,
  },
  lastChestOpenAt: {
    type: Date,
  },
  totalCredits: {
    type: Number,
    default: 0,
    min: 0,
  },
  firstChestOpened: {
    type: Boolean,
    default: false,
  },
  claimCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
}, {
  timestamps: true,
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ referralCode: 1 });
userSchema.index({ referredBy: 1 });
userSchema.index({ telegramId: 1 }, { sparse: true });
userSchema.index({ createdAt: -1 });

export const User = mongoose.model<IUser>('User', userSchema);