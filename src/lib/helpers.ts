import { customAlphabet } from 'nanoid';

// Referral code: 6-8 chars, URL-safe
const referralAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const generateReferralCode = customAlphabet(referralAlphabet, 8);

// Claim code: ZOGGY-XXXXXXXX format
const claimAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generateClaimSuffix = customAlphabet(claimAlphabet, 8);

export function createReferralCode(): string {
  return generateReferralCode();
}

export function createClaimCode(): string {
  return `ZOGGY-${generateClaimSuffix()}`;
}

export function calculateNextChestAt(lastChestOpenAt: Date | null): Date | null {
  if (!lastChestOpenAt) return null;
  return new Date(lastChestOpenAt.getTime() + 24 * 60 * 60 * 1000);
}

export function getCountdownSeconds(nextChestAt: Date | null): number {
  if (!nextChestAt) return 0;
  const now = new Date();
  const diff = nextChestAt.getTime() - now.getTime();
  return Math.max(0, Math.floor(diff / 1000));
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

export function maskName(name: string): string {
  if (name.length <= 2) return name;
  return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}`;
}