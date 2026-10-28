import assert from "node:assert/strict";
import { test } from "node:test";
import { applyDiscount, fromCents, splitFee, toCents } from "../src/money.ts";

const campaign = { reward_per_conversion: "5.00", max_fee_bps: 1000 };

test("cents round-trip", () => {
  assert.equal(toCents("50"), 5000);
  assert.equal(toCents("23.9"), 2390);
  assert.equal(fromCents(5), "0.05");
  assert.throws(() => toCents("1.234"));
});

test("fee is capped by the purchase share, then by the reward", () => {
  assert.deepEqual(splitFee(5000, campaign, 3000), { fee: 500, user: 150, publisher: 350 });
  assert.deepEqual(splitFee(2399, campaign, 3000), { fee: 239, user: 71, publisher: 168 });
  assert.deepEqual(splitFee(12000, campaign, 3000), { fee: 500, user: 150, publisher: 350 });
});

test("discount rounds in the buyer's favor", () => {
  assert.equal(applyDiscount(7900, 1000), 7110);
  assert.equal(applyDiscount(12900, 1163), 11400);
  assert.equal(applyDiscount(7900), 7900);
});
