#!/usr/bin/env node
// PayPal sandbox spike: one sponsored purchase, then the fee split paid out to the publisher and the user.
//
//   1. Orders v2: the agent's user buys the sponsored item (approve in the browser as a sandbox buyer).
//   2. The fee is computed from the captured amount, capped by the campaign (AdFi schema §4).
//   3. Payouts v1: one batch pays the publisher share and the user's payback together.
//
// Run:  node --env-file=.env spikes/paypal-sandbox.mjs [--amount 50.00] [--dry-run]
// The sandbox business account behind PAYPAL_CLIENT_ID plays both the merchant (advertiser) and the payout
// sender (Waggle) in this spike. A log of every request and response is written to out/.

import { createServer } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

const API = "https://api-m.sandbox.paypal.com";
const RETURN_PORT = 8787;

const { values: args } = parseArgs({
  options: {
    amount: { type: "string", default: "50.00" },
    "dry-run": { type: "boolean", default: false },
  },
});

// Campaign terms and the delivered offer, in AdFi's offer shape. Payout recipients stay on Waggle's side:
// the advertiser only ever sees offer_id/campaign_id on the order, never the user's PayPal email.
const campaign = {
  campaign_id: "cmp_spike_01",
  currency: "USD",
  reward_per_conversion: "5.00",
  max_fee_bps: 1000,
};
const offer = {
  sponsored: true,
  disclosure: "Sponsored by Acme Outdoor. Not part of the search result.",
  offer_id: `off_spike_${Date.now()}`,
  campaign_id: campaign.campaign_id,
  advertiser: { name: "Acme Outdoor", id: "adv_spike_01" },
  title: "Trailhead 2-person tent",
  deal: { kind: "discount", description: "10% off with Waggle", discount_bps: 1000 },
  user_share_bps: 3000,
};
const recipients = {
  publisher: process.env.PAYPAL_PUBLISHER_EMAIL,
  user: process.env.PAYPAL_USER_EMAIL,
};

const log = [];

// Money is handled in integer cents; PayPal takes and returns decimal strings.
const toCents = (value) => {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!m) throw new Error(`bad amount: ${value}`);
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
};
const fromCents = (cents) => `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;

export function splitFee(amountCents, { reward_per_conversion, max_fee_bps }, userShareBps) {
  const fee = Math.min(toCents(reward_per_conversion), Math.floor((amountCents * max_fee_bps) / 10000));
  const user = Math.floor((fee * userShareBps) / 10000);
  return { fee, user, publisher: fee - user };
}

async function paypal(method, path, { token, body, requestId } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (requestId) headers["PayPal-Request-Id"] = requestId;
  const res = await fetch(`${API}${path}`, { method, headers, body: body && JSON.stringify(body) });
  const json = await res.json().catch(() => null);
  log.push({ at: new Date().toISOString(), method, path, status: res.status, debug_id: res.headers.get("paypal-debug-id"), body, response: json });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}\n${JSON.stringify(json, null, 2)}`);
  return json;
}

async function getToken() {
  const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${API}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`OAuth failed: ${res.status} ${JSON.stringify(json)}`);
  return json.access_token;
}

function orderBody(amount) {
  return {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: offer.offer_id,
        custom_id: `${offer.campaign_id}:${offer.offer_id}`,
        description: offer.title,
        amount: { currency_code: campaign.currency, value: amount },
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: offer.advertiser.name,
          user_action: "PAY_NOW",
          shipping_preference: "NO_SHIPPING",
          return_url: `http://localhost:${RETURN_PORT}/return`,
          cancel_url: `http://localhost:${RETURN_PORT}/cancel`,
        },
      },
    },
  };
}

function payoutBody(captureId, split) {
  const item = (role, cents, note) => ({
    recipient_type: "EMAIL",
    receiver: recipients[role],
    amount: { value: fromCents(cents), currency: campaign.currency },
    note,
    sender_item_id: `${offer.offer_id}:${role}`,
  });
  return {
    // One batch per offer: PayPal rejects a repeated sender_batch_id, so an offer can't be paid twice.
    sender_batch_header: {
      sender_batch_id: `waggle:${offer.offer_id}`,
      email_subject: "Your Waggle payout",
      email_message: `Fee share for a sponsored purchase from ${offer.advertiser.name} (capture ${captureId}).`,
    },
    items: [
      item("publisher", split.publisher, `Publisher share, offer ${offer.offer_id}`),
      item("user", split.user, `Your payback for buying through a sponsored deal from ${offer.advertiser.name}`),
    ],
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Serves the return_url page and resolves once PayPal reports the order APPROVED.
async function waitForApproval(token, orderId) {
  const server = createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(req.url.startsWith("/cancel") ? "<p>Payment cancelled.</p>" : "<p>Approved. Back to the terminal.</p>");
  }).listen(RETURN_PORT);
  try {
    for (;;) {
      const order = await paypal("GET", `/v2/checkout/orders/${orderId}`, { token });
      if (order.status === "APPROVED") return order;
      if (!["CREATED", "PAYER_ACTION_REQUIRED", "SAVED"].includes(order.status)) {
        throw new Error(`order ended in ${order.status}`);
      }
      await sleep(3000);
    }
  } finally {
    server.close();
  }
}

async function waitForPayout(token, batchId) {
  for (let i = 0; i < 40; i++) {
    const batch = await paypal("GET", `/v1/payments/payouts/${batchId}`, { token });
    const status = batch.batch_header.batch_status;
    if (!["PENDING", "PROCESSING"].includes(status)) return batch;
    await sleep(3000);
  }
  throw new Error("payout batch still processing after 2 minutes; check it in the sandbox dashboard");
}

function saveLog(name) {
  mkdirSync("out", { recursive: true });
  const file = `out/${name}-${offer.offer_id}.json`;
  writeFileSync(file, JSON.stringify({ campaign, offer, recipients, log }, null, 2));
  return file;
}

async function main() {
  const amount = fromCents(toCents(args.amount));
  const planned = splitFee(toCents(amount), campaign, offer.user_share_bps);

  console.log(`\n--- Sponsored (Waggle) ---\n${offer.disclosure}\n${offer.title}: ${offer.deal.description}\n---`);
  console.log(`Purchase ${amount} ${campaign.currency} → fee ${fromCents(planned.fee)} ` +
    `(publisher ${fromCents(planned.publisher)}, user payback ${fromCents(planned.user)})\n`);

  if (args["dry-run"]) {
    console.log("Order request:\n" + JSON.stringify(orderBody(amount), null, 2));
    console.log("Payout request:\n" + JSON.stringify(payoutBody("<capture id>", planned), null, 2));
    return;
  }

  const missing = ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_PUBLISHER_EMAIL", "PAYPAL_USER_EMAIL"]
    .filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`missing in .env: ${missing.join(", ")}`);

  const token = await getToken();

  // 1. Purchase
  const order = await paypal("POST", "/v2/checkout/orders", { token, body: orderBody(amount), requestId: `${offer.offer_id}:order` });
  const approve = order.links.find((l) => l.rel === "payer-action" || l.rel === "approve").href;
  console.log(`Order ${order.id} created. Log in as the sandbox BUYER and approve:\n  ${approve}\n`);
  await waitForApproval(token, order.id);

  const captured = await paypal("POST", `/v2/checkout/orders/${order.id}/capture`, { token, body: {}, requestId: `${offer.offer_id}:capture` });
  const capture = captured.purchase_units[0].payments.captures[0];
  if (capture.status !== "COMPLETED") throw new Error(`capture ${capture.id} is ${capture.status}, not paying out`);
  console.log(`Captured ${capture.amount.value} ${capture.amount.currency_code} (capture ${capture.id}, custom_id ${capture.custom_id})`);

  // 2. Fee from what was actually captured, not from what was asked for
  const split = splitFee(toCents(capture.amount.value), campaign, offer.user_share_bps);

  // 3. Payouts
  const batch = await paypal("POST", "/v1/payments/payouts", { token, body: payoutBody(capture.id, split) });
  const batchId = batch.batch_header.payout_batch_id;
  console.log(`Payout batch ${batchId} submitted, waiting for it to settle...`);
  const done = await waitForPayout(token, batchId);
  console.log(`Batch ${done.batch_header.batch_status}`);
  for (const it of done.items) {
    console.log(`  ${it.payout_item.sender_item_id}: ${it.payout_item.amount.value} → ${it.payout_item.receiver} [${it.transaction_status}]`);
  }
  console.log(`\nLog: ${saveLog("spike")}`);
}

main().catch((err) => {
  console.error(`\n${err.message}`);
  if (log.length) console.error(`Log: ${saveLog("spike-failed")}`);
  process.exit(1);
});
