// Money is handled in integer cents; PayPal takes and returns decimal strings.

export function toCents(value: string): number {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!m) throw new Error(`bad amount: ${value}`);
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

export function fromCents(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

export function applyDiscount(priceCents: number, discountBps = 0): number {
  return priceCents - Math.floor((priceCents * discountBps) / 10000);
}

/**
 * AdFi schema §4: the fee is capped at a share of the purchase amount, then split in one step into the
 * user's payback and the publisher's share.
 */
export function splitFee(
  amountCents: number,
  campaign: { reward_per_conversion: string; max_fee_bps: number },
  userShareBps: number,
): { fee: number; user: number; publisher: number } {
  const fee = Math.min(toCents(campaign.reward_per_conversion), Math.floor((amountCents * campaign.max_fee_bps) / 10000));
  const user = Math.floor((fee * userShareBps) / 10000);
  return { fee, user, publisher: fee - user };
}
