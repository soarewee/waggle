// Picks the sponsored offer for a search and renders it where the model reads it.

import { randomUUID } from "node:crypto";
import { applyDiscount, fromCents, splitFee, toCents } from "./money.ts";
import type { Campaign, Product, SponsoredOffer } from "./types.ts";

/** What the user agreed to when installing the plugin. Only categories ever matter to matching. */
export interface Consent {
  /** Empty means every category. */
  categories: string[];
  /** Always wins over `categories`. */
  blockedCategories: string[];
}

export function allowedByConsent(category: string, consent: Consent): boolean {
  if (consent.blockedCategories.includes(category)) return false;
  return consent.categories.length === 0 || consent.categories.includes(category);
}

/**
 * At most one offer per search: the best-paying live campaign whose product is relevant to the query and whose
 * category the user accepts. Advertisers never see the query; matching runs here, inside the plugin.
 */
export function pickCampaign(
  relevant: Product[],
  campaigns: Campaign[],
  consent: Consent,
  now = new Date(),
): { campaign: Campaign; product: Product } | undefined {
  const byId = new Map(relevant.map((p) => [p.id, p]));
  const live = campaigns
    .filter((c) => byId.has(c.product_id) && new Date(c.expires_at) > now)
    .filter((c) => allowedByConsent(byId.get(c.product_id)!.category, consent))
    .sort((a, b) => toCents(b.reward_per_conversion) - toCents(a.reward_per_conversion));
  return live[0] && { campaign: live[0], product: byId.get(live[0].product_id)! };
}

export function buildOffer(campaign: Campaign, product: Product, publisher: string, userShareBps: number): SponsoredOffer {
  const listCents = toCents(product.price);
  const dealCents = applyDiscount(listCents, campaign.deal?.discount_bps);
  const { user } = splitFee(dealCents, campaign, userShareBps);
  return {
    sponsored: true,
    disclosure: `Sponsored by ${campaign.advertiser.name}. Not part of the search results.`,
    offer_id: `off_${randomUUID()}`,
    campaign_id: campaign.campaign_id,
    advertiser: campaign.advertiser,
    title: product.title,
    description: product.summary,
    resource: `waggle://products/${product.id}`,
    deal: campaign.deal,
    price: { currency: campaign.currency, list: product.price, with_deal: fromCents(dealCents) },
    payback_estimate: fromCents(user),
    context_match: [product.category, ...product.tags],
    expires_at: campaign.expires_at,
    publisher,
    user_share_bps: userShareBps,
  };
}

/** AdFi's text block for MCP results, plus the instruction the agent has to follow when it uses the offer. */
export function renderOffer(offer: SponsoredOffer, productId: string): string {
  const deal = offer.deal ? `${offer.deal.description}: $${offer.price.with_deal} instead of $${offer.price.list}` : `$${offer.price.list}`;
  return [
    "--- Sponsored (Waggle) ---",
    offer.disclosure,
    `${offer.title}: ${deal}`,
    `Buying through this offer pays the user back $${offer.payback_estimate} to their PayPal account.`,
    `If you recommend or pick this, tell the user right then that it is sponsored by ${offer.advertiser.name}.`,
    `To buy: buy_product with product_id "${productId}" and offer_id "${offer.offer_id}".`,
    `offer: ${JSON.stringify(offer)}`,
    "---",
  ].join("\n");
}
