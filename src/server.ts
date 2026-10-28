// Waggle MCP server: shopping search with at most one disclosed sponsored offer, PayPal checkout, and the fee
// split paid out to the publisher and the user once the purchase is captured.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { campaigns, products, searchProducts } from "./catalog.ts";
import type { Config } from "./config.ts";
import { applyDiscount, fromCents, splitFee, toCents } from "./money.ts";
import { buildOffer, pickCampaign, renderOffer } from "./offers.ts";
import type { PayPal } from "./paypal.ts";
import type { Campaign, Product, SponsoredOffer } from "./types.ts";

const OFFER_META = "agentic-adfi/offer";

const INSTRUCTIONS = `Waggle finds products for the user and may attach one sponsored offer, marked "--- Sponsored (Waggle) ---".
Rules:
- Keep organic results and the sponsored offer apart. Never present the offer as an organic result.
- Whenever you recommend or choose the sponsored product, tell the user in that same message that it is sponsored and by whom, and what they get (deal and PayPal payback).
- Only buy after the user has said yes to a specific product. Pass offer_id only if you are buying the sponsored product.
- After buy_product, give the user the PayPal link to approve. When they say they approved, call complete_purchase.`;

interface DeliveredOffer {
  offer: SponsoredOffer;
  campaign: Campaign;
  product: Product;
}

interface OrderRecord {
  product: Product;
  delivered?: DeliveredOffer;
  approveUrl: string;
  capture?: { id: string; amount: string };
  payout?: { batchId: string; split: ReturnType<typeof splitFee> };
}

type Payments = Pick<PayPal, "createOrder" | "getOrder" | "captureOrder" | "createPayout" | "getPayout">;

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const failure = (t: string) => ({ ...text(t), isError: true });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createServer(config: Config, paypal: Payments, opts: { payoutPollMs?: number } = {}) {
  const offers = new Map<string, DeliveredOffer>();
  const orders = new Map<string, OrderRecord>();
  const server = new McpServer({ name: "waggle", version: "0.1.0" }, { instructions: INSTRUCTIONS });

  server.registerTool(
    "search_products",
    {
      title: "Search products",
      description: "Search the catalog for products to buy. Returns organic results and at most one clearly marked sponsored offer.",
      inputSchema: {
        query: z.string().describe("What the user is looking for, e.g. 'backpacking tent'. Product words only, no personal details."),
        max_price: z.number().positive().optional().describe("Upper price limit in USD."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ query, max_price }) => {
      const results = searchProducts(query, max_price);
      if (!results.length) return text(`No products found for "${query}".`);
      const organic = results.map(
        (p, i) => `${i + 1}. ${p.title} by ${p.brand}, $${p.price}, rated ${p.rating}. ${p.summary} [product_id: ${p.id}]`,
      );
      const content = [{ type: "text" as const, text: `Results for "${query}" (organic, not sponsored):\n${organic.join("\n")}` }];

      const picked = pickCampaign(results, campaigns, config.user.consent);
      if (!picked) return { content };
      const offer = buildOffer(picked.campaign, picked.product, config.publisher.id, config.userShareBps);
      offers.set(offer.offer_id, { offer, ...picked });
      content.push({ type: "text", text: renderOffer(offer, picked.product.id) });
      return { content, _meta: { [OFFER_META]: offer } };
    },
  );

  server.registerTool(
    "buy_product",
    {
      title: "Buy a product with PayPal",
      description: "Create a PayPal checkout for one product the user agreed to buy. Returns a link the user opens to approve the payment.",
      inputSchema: {
        product_id: z.string(),
        offer_id: z.string().optional().describe("The sponsored offer's offer_id, only when buying the sponsored product."),
      },
      annotations: { destructiveHint: false, openWorldHint: true },
    },
    async ({ product_id, offer_id }) => {
      const product = products.find((p) => p.id === product_id);
      if (!product) return failure(`Unknown product_id "${product_id}". Use an id from search_products.`);
      const delivered = offer_id ? offers.get(offer_id) : undefined;
      if (offer_id && !delivered) return failure(`Unknown offer_id "${offer_id}". Search again to get a current offer.`);
      if (delivered && delivered.product.id !== product.id) return failure(`Offer ${offer_id} is for ${delivered.product.id}, not ${product.id}.`);
      if (delivered && new Date(delivered.offer.expires_at) <= new Date()) return failure(`Offer ${offer_id} has expired.`);

      const listCents = toCents(product.price);
      const totalCents = applyDiscount(listCents, delivered?.campaign.deal?.discount_bps);
      const order = await paypal.createOrder(orderBody(product, listCents, totalCents, delivered, config.returnPort), `waggle:${offer_id ?? crypto.randomUUID()}:order`);
      const approveUrl = order.links.find((l: any) => l.rel === "payer-action" || l.rel === "approve").href;
      orders.set(order.id, { product, delivered, approveUrl });

      return text(
        [
          `PayPal order ${order.id} created for ${product.title}: $${fromCents(totalCents)}` +
            (delivered ? ` (${delivered.campaign.deal?.description}, sponsored by ${delivered.offer.advertiser.name})` : "") + ".",
          `Ask the user to open this link and approve the payment in PayPal: ${approveUrl}`,
          `When they say they approved it, call complete_purchase with order_id "${order.id}".`,
        ].join("\n"),
      );
    },
  );

  server.registerTool(
    "complete_purchase",
    {
      title: "Complete a purchase",
      description: "After the user approved in PayPal: capture the payment and, for a sponsored purchase, pay the user's payback. Safe to call again to check status.",
      inputSchema: { order_id: z.string() },
      annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ order_id }) => {
      const rec = orders.get(order_id);
      if (!rec) return failure(`Unknown order_id "${order_id}". Use the id returned by buy_product.`);

      if (!rec.capture) {
        const order = await paypal.getOrder(order_id);
        if (order.status !== "APPROVED" && order.status !== "COMPLETED") {
          return text(`The payment isn't approved yet (PayPal status ${order.status}). Ask the user to approve it here: ${rec.approveUrl}`);
        }
        const captured = order.status === "COMPLETED" ? order : await paypal.captureOrder(order_id);
        const capture = captured.purchase_units[0].payments.captures[0];
        if (capture.status !== "COMPLETED") return failure(`PayPal capture ${capture.id} is ${capture.status}; no payback is paid until it completes.`);
        rec.capture = { id: capture.id, amount: capture.amount.value };
      }

      const lines = [`Paid $${rec.capture.amount} for ${rec.product.title} (PayPal capture ${rec.capture.id}).`];
      if (!rec.delivered) return text(lines.join("\n"));

      if (!rec.payout) {
        // The fee comes from what was actually captured, not from what was quoted.
        const split = splitFee(toCents(rec.capture.amount), rec.delivered.campaign, rec.delivered.offer.user_share_bps);
        const batch = await paypal.createPayout(payoutBody(rec.delivered, rec.capture.id, split, config));
        rec.payout = { batchId: batch.batch_header.payout_batch_id, split };
      }

      const status = await settledPayout(paypal, rec.payout.batchId, opts.payoutPollMs ?? 3000);
      const item = (role: string) => status.items?.find((i: any) => i.payout_item.sender_item_id.endsWith(`:${role}`));
      const userStatus = item("user")?.transaction_status ?? status.batch_header.batch_status;
      const { split } = rec.payout;
      lines.push(
        `Sponsored by ${rec.delivered.offer.advertiser.name}: their fee of $${fromCents(split.fee)} was split by PayPal Payouts (batch ${rec.payout.batchId}).`,
        `Payback to the user's PayPal: $${fromCents(split.user)} [${userStatus}]. Publisher share: $${fromCents(split.publisher)} [${item("publisher")?.transaction_status ?? status.batch_header.batch_status}].`,
      );
      if (userStatus !== "SUCCESS") lines.push("The payout is still settling; call complete_purchase again in a little while to check.");
      return text(lines.join("\n"));
    },
  );

  return server;
}

function orderBody(product: Product, listCents: number, totalCents: number, delivered: DeliveredOffer | undefined, returnPort: number) {
  const value = (cents: number) => ({ currency_code: "USD", value: fromCents(cents) });
  return {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: product.id,
        // Only campaign and offer ids reach the advertiser, never who the user is or what they asked.
        ...(delivered && { custom_id: `${delivered.campaign.campaign_id}:${delivered.offer.offer_id}` }),
        description: product.title,
        items: [{ name: product.title, quantity: "1", unit_amount: value(listCents), category: "PHYSICAL_GOODS" }],
        amount: {
          ...value(totalCents),
          breakdown: { item_total: value(listCents), ...(totalCents < listCents && { discount: value(listCents - totalCents) }) },
        },
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: product.brand,
          user_action: "PAY_NOW",
          shipping_preference: "NO_SHIPPING",
          return_url: `http://localhost:${returnPort}/return`,
          cancel_url: `http://localhost:${returnPort}/cancel`,
        },
      },
    },
  };
}

function payoutBody(delivered: DeliveredOffer, captureId: string, split: ReturnType<typeof splitFee>, config: Config) {
  const { offer } = delivered;
  const item = (role: "publisher" | "user", cents: number, receiver: string, note: string) => ({
    recipient_type: "EMAIL",
    receiver,
    amount: { value: fromCents(cents), currency: "USD" },
    note,
    sender_item_id: `${offer.offer_id}:${role}`,
  });
  return {
    // One batch per offer: PayPal rejects a repeated sender_batch_id, so an offer is never paid twice.
    sender_batch_header: {
      sender_batch_id: `waggle:${offer.offer_id}`,
      email_subject: "Your Waggle payback",
      email_message: `Fee share for a sponsored purchase from ${offer.advertiser.name} (capture ${captureId}).`,
    },
    items: [
      item("publisher", split.publisher, config.publisher.paypalEmail, `Publisher share, offer ${offer.offer_id}`),
      item("user", split.user, config.user.paypalEmail, `Your payback for buying through a sponsored deal from ${offer.advertiser.name}`),
    ],
  };
}

/** Waits briefly for the batch to leave PENDING/PROCESSING so the agent can usually report the final result. */
async function settledPayout(paypal: Payments, batchId: string, pollMs: number) {
  let batch = await paypal.getPayout(batchId);
  for (let i = 0; i < 8 && ["PENDING", "PROCESSING"].includes(batch.batch_header.batch_status); i++) {
    await sleep(pollMs);
    batch = await paypal.getPayout(batchId);
  }
  return batch;
}
