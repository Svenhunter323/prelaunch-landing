const { customAlphabet } = require('nanoid');

// short code for referrals
const referralNano = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789', 6);
// claim code segments
const claimNano = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

function newReferralCode() {
  return referralNano();
}

function newClaimCode() {
  return `ZOGGY-${claimNano()}`;
}

function newEmailVerificationToken() {
  return customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789', 32)();
}

module.exports = { newReferralCode, newClaimCode, newEmailVerificationToken };
