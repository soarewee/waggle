// Picks the sponsored offer for a search and renders it where the model reads it.

import { randomUUID } from "node:crypto";
import { applyDiscount, fromCents, splitFee, toCents } from "./money.ts";
import type { Campaign, Product, SponsoredOffer } from "./types.ts";

/** What the user gains by buying through the campaign, in cents: the discount plus their share of the fee. */
export function userBenefit(campaign: Campaign, product: Product, userShareBps: number): number {
  const list = toCents(product.price);
  const deal = applyDiscount(list, campaign.deal?.discount_bps);
  return list - deal + splitFee(deal, campaign, userShareBps).user;
}

/**
 * At most one offer per search, and the slot goes to the campaign that is best for the user: the biggest
 * discount plus payback among live campaigns on products this search found. Not the highest fee; Waggle is a tool
 * of the user's agent. Advertisers never see the query: matching runs here, inside Waggle.
 */
export function pickCampaign(
  relevant: Product[],
  campaigns: Campaign[],
  userShareBps: number,
  now = new Date(),
): { campaign: Campaign; product: Product } | undefined {
  const byId = new Map(relevant.map((p) => [p.id, p]));
  const live = campaigns
    .filter((c) => byId.has(c.product_id) && new Date(c.expires_at) > now)
    .map((campaign) => {
      const product = byId.get(campaign.product_id)!;
      return { campaign, product, benefit: userBenefit(campaign, product, userShareBps) };
    })
    .sort(
      (a, b) =>
        b.benefit - a.benefit ||
        toCents(b.campaign.reward_per_conversion) - toCents(a.campaign.reward_per_conversion) ||
        a.campaign.campaign_id.localeCompare(b.campaign.campaign_id),
    );
  return live[0] && { campaign: live[0].campaign, product: live[0].product };
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
    `Buying through this offer pays the user back $${offer.payback_estimate} to the PayPal account they pay with.`,
    `If you recommend or pick this, tell the user right then that it is sponsored by ${offer.advertiser.name}.`,
    `To buy: buy_product with product_id "${productId}" and offer_id "${offer.offer_id}".`,
    `offer: ${JSON.stringify(offer)}`,
    "---",
  ].join("\n");
}
