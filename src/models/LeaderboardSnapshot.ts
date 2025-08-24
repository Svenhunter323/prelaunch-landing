import mongoose, { Document, Schema } from 'mongoose';

export interface ILeaderboardRow {
  userId: mongoose.Types.ObjectId;
  maskedName: string;
  maskedEmail: string;
  validReferrals: number;
  rank: number;
  prize: number;
}

export interface ILeaderboardSnapshot extends Document {
  rows: ILeaderboardRow[];
  createdAt: Date;
}

const leaderboardRowSchema = new Schema<ILeaderboardRow>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  maskedName: {
    type: String,
    required: true,
  },
  maskedEmail: {
    type: String,
    required: true,
  },
  validReferrals: {
    type: Number,
    required: true,
    min: 0,
  },
  rank: {
    type: Number,
    required: true,
    min: 1,
  },
  prize: {
    type: Number,
    required: true,
    min: 0,
  },
}, { _id: false });

const leaderboardSnapshotSchema = new Schema<ILeaderboardSnapshot>({
  rows: [leaderboardRowSchema],
}, {
  timestamps: true,
});

// Indexes
leaderboardSnapshotSchema.index({ createdAt: -1 });

export const LeaderboardSnapshot = mongoose.model<ILeaderboardSnapshot>('LeaderboardSnapshot', leaderboardSnapshotSchema);