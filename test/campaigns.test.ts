import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCampaigns } from "../src/campaigns.ts";

const acme = {
  campaign_id: "cmp_acme_tent_fall",
  advertiser: { name: "Acme Outdoor", id: "adv_acme_outdoor" },
  product_id: "tent-trailhead-2",
  deal: { kind: "discount", description: "10% off with Waggle", discount_bps: 1000 },
  currency: "USD",
  reward_per_conversion: "5.00",
  max_fee_bps: 1000,
  expires_at: "2026-12-31T23:59:59Z",
};

test("a well-formed campaign file loads", () => {
  assert.equal(parseCampaigns(JSON.stringify([acme])).length, 1);
});

test("a campaign for a product the store doesn't have is refused", () => {
  assert.throws(() => parseCampaigns(JSON.stringify([{ ...acme, product_id: "nope" }])), /unknown product nope/);
});

test("a malformed fee or cap is refused before the service starts", () => {
  assert.throws(() => parseCampaigns(JSON.stringify([{ ...acme, reward_per_conversion: "five" }])), /reward_per_conversion/);
  assert.throws(() => parseCampaigns(JSON.stringify([{ ...acme, max_fee_bps: 12000 }])), /max_fee_bps/);
});

test("duplicate campaign ids are refused", () => {
  assert.throws(() => parseCampaigns(JSON.stringify([acme, acme])), /appears twice/);
});
