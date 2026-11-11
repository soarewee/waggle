// Sellers' campaigns come from a JSON file, not from code: a campaign is what a seller registers with Waggle.
// Every field is checked before the service starts.

import { readFileSync } from "node:fs";
import { z } from "zod";
import { products } from "./catalog.ts";
import type { Campaign } from "./types.ts";

const amount = z.string().regex(/^\d+(\.\d{1,2})?$/, "a decimal amount such as 5.00");
const bps = z.number().int().min(0).max(10000);

const schema = z.array(
  z.object({
    campaign_id: z.string().min(1),
    advertiser: z.object({ name: z.string().min(1), id: z.string().min(1) }),
    product_id: z.string().min(1),
    deal: z
      .object({
        kind: z.enum(["coupon", "discount"]),
        description: z.string().min(1),
        code: z.string().optional(),
        discount_bps: bps.optional(),
      })
      .optional(),
    currency: z.literal("USD"),
    reward_per_conversion: amount,
    max_fee_bps: bps,
    expires_at: z.iso.datetime(),
  }),
);

export function parseCampaigns(text: string, source = "campaigns"): Campaign[] {
  const parsed = schema.safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error(`${source}: ${z.prettifyError(parsed.error)}`);
  const seen = new Set<string>();
  for (const c of parsed.data) {
    if (seen.has(c.campaign_id)) throw new Error(`${source}: campaign_id ${c.campaign_id} appears twice`);
    seen.add(c.campaign_id);
    if (!products.some((p) => p.id === c.product_id)) throw new Error(`${source}: campaign ${c.campaign_id} is for unknown product ${c.product_id}`);
  }
  return parsed.data;
}

export function loadCampaigns(path: string): Campaign[] {
  return parseCampaigns(readFileSync(path, "utf8"), path);
}
