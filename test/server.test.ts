import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Config } from "../src/config.ts";
import { createServer } from "../src/server.ts";

const config: Config = {
  paypal: { clientId: "x", clientSecret: "x" },
  publisher: { id: "waggle", paypalEmail: "publisher@example.com" },
  user: { paypalEmail: "user@example.com", consent: { categories: [], blockedCategories: [] } },
  userShareBps: 3000,
  returnPort: 8787,
};

/** Stands in for the PayPal sandbox: orders get approved when the test says so. */
function fakePayPal() {
  const calls: { method: string; body?: any }[] = [];
  const state = { status: "PAYER_ACTION_REQUIRED", amount: "" };
  return {
    calls,
    approve: () => (state.status = "APPROVED"),
    paypal: {
      async createOrder(body: any) {
        calls.push({ method: "createOrder", body });
        state.amount = body.purchase_units[0].amount.value;
        return { id: "ORDER1", links: [{ rel: "payer-action", href: "https://sandbox.paypal.test/approve" }] };
      },
      async getOrder() {
        return { status: state.status };
      },
      async captureOrder() {
        calls.push({ method: "captureOrder" });
        state.status = "COMPLETED";
        return { purchase_units: [{ payments: { captures: [{ id: "CAP1", status: "COMPLETED", amount: { value: state.amount } }] } }] };
      },
      async createPayout(body: any) {
        calls.push({ method: "createPayout", body });
        return { batch_header: { payout_batch_id: "BATCH1", batch_status: "PENDING" } };
      },
      async getPayout() {
        const items = ["publisher", "user"].map((r) => ({ transaction_status: "SUCCESS", payout_item: { sender_item_id: `off:${r}` } }));
        return { batch_header: { batch_status: "SUCCESS" }, items };
      },
    },
  };
}

async function connect(cfg = config) {
  const fake = fakePayPal();
  const [a, b] = InMemoryTransport.createLinkedPair();
  await createServer(cfg, fake.paypal as any, { payoutPollMs: 0 }).connect(a);
  const client = new Client({ name: "test", version: "0" });
  await client.connect(b);
  const call = async (name: string, args: Record<string, unknown>) => {
    const res: any = await client.callTool({ name, arguments: args });
    return { ...res, text: res.content.map((c: any) => c.text).join("\n") };
  };
  return { fake, call };
}

test("search returns organic results and one disclosed offer the model can read", async () => {
  const { call } = await connect();
  const res = await call("search_products", { query: "tent" });
  assert.match(res.content[0].text, /organic, not sponsored/);
  assert.match(res.content[1].text, /Sponsored by Acme Outdoor/);
  assert.match(res.content[1].text, /pays the user back \$1\.50/);
  const offer = res._meta["agentic-adfi/offer"];
  assert.equal(offer.sponsored, true);
  assert.equal(offer.price.with_deal, "71.10");
  assert.ok(!JSON.stringify(offer).includes("user@example.com"), "the user's PayPal email never goes into the offer");
});

test("no offer for a category the user blocked", async () => {
  const blocked = { ...config, user: { ...config.user, consent: { categories: [], blockedCategories: ["outdoor"] } } };
  const { call } = await connect(blocked);
  const res = await call("search_products", { query: "tent" });
  assert.equal(res.content.length, 1);
  assert.equal(res._meta, undefined);
});

test("sponsored purchase: discounted order, capture after approval, one payout batch with the split", async () => {
  const { fake, call } = await connect();
  const search = await call("search_products", { query: "tent" });
  const offer = search._meta["agentic-adfi/offer"];

  const buy = await call("buy_product", { product_id: "tent-trailhead-2", offer_id: offer.offer_id });
  assert.match(buy.text, /\$71\.10/);
  const order = fake.calls.find((c) => c.method === "createOrder")!.body.purchase_units[0];
  assert.equal(order.custom_id, `cmp_acme_tent_fall:${offer.offer_id}`);
  assert.equal(order.amount.breakdown.discount.value, "7.90");

  const early = await call("complete_purchase", { order_id: "ORDER1" });
  assert.match(early.text, /isn't approved yet/);
  assert.ok(!fake.calls.some((c) => c.method === "captureOrder"));

  fake.approve();
  const done = await call("complete_purchase", { order_id: "ORDER1" });
  assert.match(done.text, /Payback to the user's PayPal: \$1\.50 \[SUCCESS\]/);
  const payout = fake.calls.find((c) => c.method === "createPayout")!.body;
  assert.equal(payout.sender_batch_header.sender_batch_id, `waggle:${offer.offer_id}`);
  assert.deepEqual(payout.items.map((i: any) => [i.receiver, i.amount.value]), [["publisher@example.com", "3.50"], ["user@example.com", "1.50"]]);

  await call("complete_purchase", { order_id: "ORDER1" });
  assert.equal(fake.calls.filter((c) => c.method === "createPayout").length, 1, "calling again never pays twice");
});

test("organic purchase pays no fee", async () => {
  const { fake, call } = await connect();
  await call("buy_product", { product_id: "tent-ridgeline-2" });
  fake.approve();
  const done = await call("complete_purchase", { order_id: "ORDER1" });
  assert.match(done.text, /Paid \$74\.00/);
  assert.ok(!fake.calls.some((c) => c.method === "createPayout"));
});

test("an offer can't be used for another product", async () => {
  const { call } = await connect();
  const offer = (await call("search_products", { query: "tent" }))._meta["agentic-adfi/offer"];
  const res = await call("buy_product", { product_id: "tent-summit-3", offer_id: offer.offer_id });
  assert.equal(res.isError, true);
});
