import mongoose, { Document, Schema } from 'mongoose';

export interface IChestOpen extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  source: 'first' | 'regular';
  createdAt: Date;
}

const chestOpenSchema = new Schema<IChestOpen>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  source: {
    type: String,
    enum: ['first', 'regular'],
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
chestOpenSchema.index({ userId: 1, createdAt: -1 });
chestOpenSchema.index({ createdAt: -1 });

export const ChestOpen = mongoose.model<IChestOpen>('ChestOpen', chestOpenSchema);