import { z } from 'zod';

// Request schemas
export const waitlistSchema = z.object({
  email: z.string().email().toLowerCase(),
  ref: z.string().optional(),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const adminFlagUserSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().min(1),
});

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
});

export const adminUsersQuerySchema = paginationSchema.extend({
  q: z.string().optional(),
});

export const adminReferralsQuerySchema = paginationSchema.extend({
  status: z.enum(['pending', 'eligible', 'invalid']).optional(),
});

// Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  referralCode: string;
  claimCode: string;
  totalCredits: number;
  telegramVerified: boolean;
  emailVerified: boolean;
  nextChestAt: string | null;
  countdownSeconds: number;
}

export interface ChestOpenResult {
  amount: number;
  totalCredits: number;
  nextChestAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  maskedName: string;
  maskedEmail: string;
  validReferrals: number;
  prize: number;
}

export interface LatestWin {
  username: string;
  country: string;
  amount: number;
  createdAt: string;
}

// Job data types
export interface FakeWinJobData {
  username: string;
  country: string;
  amount: number;
  kind: 'small' | 'big';
}

export interface LeaderboardJobData {
  force?: boolean;
}

export interface CleanupJobData {
  type: 'fake_wins' | 'fraud_logs';
  olderThan: Date;
}