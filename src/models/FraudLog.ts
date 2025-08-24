import mongoose, { Document, Schema } from 'mongoose';

export interface IFraudLog extends Document {
  userId?: mongoose.Types.ObjectId;
  type: 'IP_LIMIT' | 'DEVICE_LIMIT' | 'SUSPICIOUS_PATTERN' | 'ADMIN_FLAG';
  details: Record<string, unknown>;
  createdAt: Date;
}

const fraudLogSchema = new Schema<IFraudLog>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  type: {
    type: String,
    enum: ['IP_LIMIT', 'DEVICE_LIMIT', 'SUSPICIOUS_PATTERN', 'ADMIN_FLAG'],
    required: true,
    index: true,
  },
  details: {
    type: Schema.Types.Mixed,
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
fraudLogSchema.index({ userId: 1, createdAt: -1 });
fraudLogSchema.index({ type: 1, createdAt: -1 });

export const FraudLog = mongoose.model<IFraudLog>('FraudLog', fraudLogSchema);