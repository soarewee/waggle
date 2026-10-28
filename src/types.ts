// Offer shapes follow Agentic AdFi's sponsored-offer schema (v1) so Waggle stays compatible with it.

/** A better deal the advertiser gives the user on top of the fee share. */
export interface Deal {
  kind: "coupon" | "discount";
  description: string;
  code?: string;
  /** 1000 = 10% off. */
  discount_bps?: number;
}

export interface Product {
  id: string;
  title: string;
  brand: string;
  category: string;
  tags: string[];
  /** USD, decimal string. */
  price: string;
  rating: number;
  summary: string;
}

export interface Campaign {
  campaign_id: string;
  advertiser: { name: string; id: string };
  product_id: string;
  deal?: Deal;
  currency: "USD";
  /** Fee per conversion, before the cap. */
  reward_per_conversion: string;
  /** Cap on the fee as a share of the purchase amount (1000 = 10%). */
  max_fee_bps: number;
  expires_at: string;
}

/**
 * The offer as Waggle delivers it to the user's agent. AdFi's `user` wallet and signatures are left out:
 * the payback goes to the user's PayPal account, which stays on Waggle's side and never reaches the advertiser.
 */
export interface SponsoredOffer {
  sponsored: true;
  /** Must reach the model and the user as is. */
  disclosure: string;
  /** Unique per delivery. */
  offer_id: string;
  campaign_id: string;
  advertiser: { name: string; id: string };
  title: string;
  description?: string;
  resource: string;
  deal?: Deal;
  price: { currency: "USD"; list: string; with_deal: string };
  /** What the user gets back through PayPal if they buy at `price.with_deal`. */
  payback_estimate: string;
  context_match: string[];
  expires_at: string;
  publisher: string;
  user_share_bps: number;
}
