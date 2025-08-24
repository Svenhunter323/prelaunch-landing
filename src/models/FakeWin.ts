import mongoose, { Document, Schema } from 'mongoose';

export interface IFakeWin extends Document {
  username: string;
  country: string;
  amount: number;
  kind: 'small' | 'big';
  createdAt: Date;
}

const fakeWinSchema = new Schema<IFakeWin>({
  username: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  kind: {
    type: String,
    enum: ['small', 'big'],
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
fakeWinSchema.index({ createdAt: -1 });
fakeWinSchema.index({ kind: 1, createdAt: -1 });

export const FakeWin = mongoose.model<IFakeWin>('FakeWin', fakeWinSchema);