import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createApp } from "../src/app.ts";
import { loadCampaigns } from "../src/campaigns.ts";
import type { Config } from "../src/config.ts";
import { Db } from "../src/db.ts";

const config: Config = {
  port: 0,
  baseUrl: "http://localhost",
  dbPath: ":memory:",
  campaignsPath: "campaigns.json",
  paypal: { clientId: "x", clientSecret: "x" },
  publisher: { id: "waggle", paypalEmail: "publisher@example.com" },
  userShareBps: 3000,
};
const campaigns = loadCampaigns(new URL("../campaigns.json", import.meta.url).pathname);

/** Stands in for the PayPal sandbox: orders get approved, by a named sandbox account, when the test says so. */
function fakePayPal() {
  const calls: { method: string; body?: any; requestId?: string }[] = [];
  const orders: Record<string, { status: string; amount: string; payer?: string }> = {};
  let n = 0;
  const payerOf = (id: string) => ({ email_address: orders[id]!.payer, payer_id: `PAYER-${orders[id]!.payer}` });
  return {
    calls,
    approve: (id: string, payer: string) => Object.assign(orders[id]!, { status: "APPROVED", payer }),
    paypal: {
      async createOrder(body: any, requestId: string) {
        calls.push({ method: "createOrder", body, requestId });
        const id = `ORDER${++n}`;
        orders[id] = { status: "PAYER_ACTION_REQUIRED", amount: body.purchase_units[0].amount.value };
        return { id, links: [{ rel: "payer-action", href: `https://sandbox.paypal.test/approve/${id}` }] };
      },
      async getOrder(id: string) {
        return { status: orders[id]!.status, ...(orders[id]!.payer && { payer: payerOf(id) }) };
      },
      async captureOrder(id: string) {
        calls.push({ method: "captureOrder" });
        orders[id]!.status = "COMPLETED";
        return {
          payer: payerOf(id),
          purchase_units: [{ payments: { captures: [{ id: `CAP-${id}`, status: "COMPLETED", amount: { value: orders[id]!.amount } }] } }],
        };
      },
      async createPayout(body: any, requestId: string) {
        calls.push({ method: "createPayout", body, requestId });
        return { batch_header: { payout_batch_id: `BATCH${calls.length}`, batch_status: "PENDING" } };
      },
      async getPayout() {
        const items = ["publisher", "user"].map((r) => ({ transaction_status: "SUCCESS", payout_item: { sender_item_id: `off:${r}` } }));
        return { batch_header: { batch_status: "SUCCESS" }, items };
      },
    },
  };
}

const fake = fakePayPal();
const db = new Db(":memory:");
const app = createApp({ db, paypal: fake.paypal as any, config, campaigns, payoutPollMs: 0 });
let base = "";
let mcpUrl = "";

before(async () => {
  await new Promise<void>((r) => app.listen(0, r));
  base = `http://localhost:${(app.address() as any).port}`;
  mcpUrl = `${base}/mcp`;
});
const clients: Client[] = [];
after(async () => {
  await Promise.all(clients.map((c) => c.close()));
  app.closeAllConnections();
  await new Promise((r) => app.close(r));
  db.close();
});

/** A fresh agent on the shared endpoint, as every user's agent is. */
async function agent() {
  const client = new Client({ name: "test-agent", version: "0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(mcpUrl)));
  clients.push(client);
  return async (name: string, args: Record<string, unknown>) => {
    const res: any = await client.callTool({ name, arguments: args });
    return { ...res, text: res.content.map((c: any) => c.text).join("\n") };
  };
}

const payouts = () => fake.calls.filter((c) => c.method === "createPayout");
const page = async (path: string) => {
  const res = await fetch(`${base}${path}`);
  return { status: res.status, text: await res.text() };
};

test("the front page carries the one install line, the money flow and the rules", async () => {
  const { text } = await page("/");
  assert.match(text, /claude mcp add --transport http waggle http:\/\/localhost\/mcp</);
  assert.match(text, /No account, no login/);
  assert.match(text, /Paid back to you.*\+\$1\.50/s);
  assert.match(text, /What Waggle never does/);
  assert.match(text, /&quot;campaign_id&quot;: &quot;cmp_acme_tent_fall&quot;/);
});

test("the endpoint takes POST only, and the old per-user links are gone", async () => {
  const get = await fetch(mcpUrl);
  assert.equal(get.status, 405);
  const old = await fetch(`${mcpUrl}/some-token`, { method: "POST" });
  assert.equal(old.status, 404);
  assert.match(await old.text(), /one address for every agent/);
});

test("search returns organic results and one disclosed offer the model can read", async () => {
  const call = await agent();
  const res = await call("search_products", { query: "tent" });
  assert.match(res.content[0].text, /organic, not sponsored/);
  assert.match(res.content[0].text, /Ridgeline 2P backpacking tent/, "every organic result stays, campaigns don't touch the list");
  assert.equal(res.content.length, 2, "at most one sponsored block");
  assert.match(res.content[1].text, /Sponsored by Acme Outdoor/);
  assert.match(res.content[1].text, /pays the user back \$1\.50/);
  const offer = res._meta["agentic-adfi/offer"];
  assert.equal(offer.sponsored, true);
  assert.equal(offer.price.with_deal, "71.10");
});

test("the slot goes to the offer that is best for the user, not to the highest fee", async () => {
  // Northpine pays Waggle $6.00 per sale against Acme's $5.00, but gives the user $1.80 against Acme's $7.90 + $1.50.
  const call = await agent();
  const tents = await call("search_products", { query: "tent" });
  assert.equal(tents._meta["agentic-adfi/offer"].advertiser.name, "Acme Outdoor");
  // When only Northpine's product matches, its campaign is the one that can run.
  const ultralight = await call("search_products", { query: "ultralight" });
  assert.equal(ultralight._meta["agentic-adfi/offer"].advertiser.name, "Northpine");
  assert.equal(ultralight._meta["agentic-adfi/offer"].payback_estimate, "1.80");
});

test("no offer where no campaign runs", async () => {
  const call = await agent();
  const res = await call("search_products", { query: "coffee grinder" });
  assert.equal(res.content.length, 1);
  assert.equal(res._meta, undefined);
});

test("sponsored purchase: discounted order, completed on PayPal's return, payback to the account that paid", async () => {
  const call = await agent();
  const offer = (await call("search_products", { query: "tent" }))._meta["agentic-adfi/offer"];

  const buy = await call("buy_product", { product_id: "tent-trailhead-2", offer_id: offer.offer_id });
  assert.match(buy.text, /\$71\.10/);
  const orderId = /order (ORDER\d+)/.exec(buy.text)![1]!;
  const created = fake.calls.findLast((c) => c.method === "createOrder")!.body;
  assert.equal(created.purchase_units[0].custom_id, `cmp_acme_tent_fall:${offer.offer_id}`);
  assert.equal(created.purchase_units[0].amount.breakdown.discount.value, "7.90");
  assert.equal(created.payment_source.paypal.experience_context.return_url, "http://localhost/return");

  // Before approval nothing happens, on either path.
  assert.match((await call("complete_purchase", { order_id: orderId })).text, /isn't approved yet/);
  assert.match((await page(`/return?token=${orderId}`)).text, /Not approved yet/);
  assert.equal(fake.calls.filter((c) => c.method === "captureOrder").length, 0);

  // The buyer approves as dave; PayPal brings them back; that page captures and pays out.
  fake.approve(orderId, "dave@personal.example.com");
  const back = await page(`/return?token=${orderId}&PayerID=P`);
  assert.match(back.text, /Paid \$71\.10\./);
  assert.match(back.text, /paid with dav…@personal\.example\.com/, "the account is shown masked, to the buyer only");
  assert.match(back.text, /\+\$1\.50/);
  assert.match(back.text, /Paid back/);
  const payout = payouts().at(-1)!;
  assert.equal(payout.requestId, `waggle:${offer.offer_id}:payout`);
  assert.equal(payout.body.sender_batch_header.sender_batch_id, `waggle:${offer.offer_id}`);
  assert.deepEqual(payout.body.items.map((i: any) => [i.receiver, i.amount.value]), [["publisher@example.com", "3.50"], ["dave@personal.example.com", "1.50"]]);

  // The agent confirms afterwards: same result, nothing paid twice, and the buyer's account never reaches the agent.
  const before = payouts().length;
  const done = await call("complete_purchase", { order_id: orderId });
  assert.match(done.text, /Paid \$71\.10 for Trailhead 2-person tent/);
  assert.match(done.text, /Payback to the PayPal account the user paid with: \$1\.50 \[SUCCESS\]/);
  assert.ok(!done.text.includes("dave@"), "no email in what the agent gets");
  assert.equal(payouts().length, before);
  assert.equal(fake.calls.filter((c) => c.method === "captureOrder").length, 1);

  const spent = await call("buy_product", { product_id: "tent-trailhead-2", offer_id: offer.offer_id });
  assert.equal(spent.isError, true);
  assert.match(spent.text, /already used/);
});

test("when the agent confirms first, the return page just shows the result", async () => {
  const call = await agent();
  const offer = (await call("search_products", { query: "headphones" }))._meta["agentic-adfi/offer"];
  const buy = await call("buy_product", { product_id: "headphones-quietwave", offer_id: offer.offer_id });
  const orderId = /order (ORDER\d+)/.exec(buy.text)![1]!;
  fake.approve(orderId, "erin@personal.example.com");

  const done = await call("complete_purchase", { order_id: orderId });
  assert.match(done.text, /Sponsored by Quietwave/);
  const before = payouts().length;
  const back = await page(`/return?token=${orderId}`);
  assert.match(back.text, /Paid \$114\.00\./);
  assert.match(back.text, /eri…@personal\.example\.com/);
  assert.equal(payouts().length, before);
});

test("both paths at once still capture once and pay once", async () => {
  const call = await agent();
  const offer = (await call("search_products", { query: "tent" }))._meta["agentic-adfi/offer"];
  const buy = await call("buy_product", { product_id: "tent-trailhead-2", offer_id: offer.offer_id });
  const orderId = /order (ORDER\d+)/.exec(buy.text)![1]!;
  fake.approve(orderId, "frank@personal.example.com");
  const captures = () => fake.calls.filter((c) => c.method === "captureOrder").length;
  const [c0, p0] = [captures(), payouts().length];
  await Promise.all([page(`/return?token=${orderId}`), call("complete_purchase", { order_id: orderId }), page(`/return?token=${orderId}`)]);
  assert.equal(captures(), c0 + 1);
  assert.equal(payouts().length, p0 + 1);
});

test("organic purchase pays no fee", async () => {
  const call = await agent();
  const buy = await call("buy_product", { product_id: "tent-ridgeline-2" });
  const orderId = /order (ORDER\d+)/.exec(buy.text)![1]!;
  fake.approve(orderId, "grace@personal.example.com");
  const before = payouts().length;
  const back = await page(`/return?token=${orderId}`);
  assert.match(back.text, /Paid \$74\.00\./);
  assert.match(back.text, /no fee and no payback/);
  const done = await call("complete_purchase", { order_id: orderId });
  assert.match(done.text, /Paid \$74\.00/);
  assert.match(done.text, /no advertiser fee and no payback/);
  assert.equal(payouts().length, before);
});

test("an offer can't be used for another product, and unknown ids are unknown", async () => {
  const call = await agent();
  const offer = (await call("search_products", { query: "tent" }))._meta["agentic-adfi/offer"];
  assert.equal((await call("buy_product", { product_id: "tent-summit-3", offer_id: offer.offer_id })).isError, true);
  assert.equal((await call("buy_product", { product_id: "tent-trailhead-2", offer_id: "off_nope" })).isError, true);
  assert.equal((await call("complete_purchase", { order_id: "ORDER999" })).isError, true);
  assert.equal((await page("/return?token=ORDER999")).status, 404);
});

test("cancel page", async () => {
  const { text } = await page("/cancel");
  assert.match(text, /Nothing was charged/);
});
