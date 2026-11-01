// The three tools every agent gets from Waggle's one endpoint: search with at most one disclosed sponsored offer,
// PayPal checkout, and confirmation of the purchase and payback. The agent's words are Waggle's interface, so the
// tool texts say exactly what the agent must pass on.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { products, searchProducts } from "./catalog.ts";
import type { OfferRow, OrderRow } from "./db.ts";
import { applyDiscount, fromCents, toCents } from "./money.ts";
import { buildOffer, pickCampaign, renderOffer } from "./offers.ts";
import type { Settle, SettleDeps, Settlement } from "./settle.ts";
import type { Product } from "./types.ts";

const OFFER_META = "agentic-adfi/offer";

const INSTRUCTIONS = `Waggle finds products for the user and may attach one sponsored offer, marked "--- Sponsored (Waggle) ---".
Rules:
- Keep organic results and the sponsored offer apart. Never present the offer as an organic result.
- Whenever you recommend or choose the sponsored product, tell the user in that same message that it is sponsored and by whom, and what they get (deal and PayPal payback).
- Only buy after the user has said yes to a specific product. Pass offer_id only if you are buying the sponsored product.
- After buy_product, give the user the PayPal link to approve. PayPal then shows them a Waggle page that completes the purchase. When they say they are done, call complete_purchase to confirm and report the result.`;

export type Deps = SettleDeps & { settle: Settle };

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const failure = (t: string) => ({ ...text(t), isError: true });

export function createMcpServer({ db, paypal, config, campaigns, settle }: Deps) {
  const server = new McpServer({ name: "waggle", version: "0.3.0" }, { instructions: INSTRUCTIONS });
  const campaignOf = (row: OfferRow) => campaigns.find((c) => c.campaign_id === row.campaign_id)!;

  const approvalMessage = (order: OrderRow, product: Product, offer?: OfferRow) =>
    text(
      [
        `PayPal order ${order.id} created for ${product.title}: $${order.total}` +
          (offer ? ` (${offer.offer.deal?.description ?? "sponsored offer"}, sponsored by ${offer.offer.advertiser.name})` : "") + ".",
        `Ask the user to open this link and approve the payment in PayPal: ${order.approve_url}`,
        `PayPal brings them back to a Waggle page that completes the purchase. When they say they are done, call complete_purchase with order_id "${order.id}".`,
      ].join("\n"),
    );

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

      const picked = pickCampaign(results, campaigns, config.userShareBps);
      if (!picked) return { content };
      const offer = buildOffer(picked.campaign, picked.product, config.publisher.id, config.userShareBps);
      db.saveOffer(offer, picked.product.id);
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
      const offer = offer_id ? db.offer(offer_id) : undefined;
      if (offer_id && !offer) return failure(`Unknown offer_id "${offer_id}". Search again to get a current offer.`);
      if (offer && offer.product_id !== product.id) return failure(`Offer ${offer_id} is for ${offer.product_id}, not ${product.id}.`);
      if (offer && new Date(offer.offer.expires_at) <= new Date()) return failure(`Offer ${offer_id} has expired.`);

      // An offer buys one order. Until that order is paid, asking again returns the same checkout; after, it's spent.
      const existing = offer?.order_id ? db.order(offer.order_id) : undefined;
      if (existing?.capture_id) return failure(`Offer ${offer_id} was already used for order ${existing.id}, which is paid. Search again for a current offer.`);
      if (existing) return approvalMessage(existing, product, offer);

      const listCents = toCents(product.price);
      const totalCents = applyDiscount(listCents, offer && campaignOf(offer).deal?.discount_bps);
      const created = await paypal.createOrder(orderBody(product, listCents, totalCents, offer, config.baseUrl), `waggle:${offer_id ?? crypto.randomUUID()}:order`);
      const approve_url = created.links.find((l: any) => l.rel === "payer-action" || l.rel === "approve").href;
      const order = db.createOrder({ id: created.id, product_id: product.id, offer_id, total: fromCents(totalCents), approve_url });
      return approvalMessage(order, product, offer);
    },
  );

  server.registerTool(
    "complete_purchase",
    {
      title: "Complete a purchase",
      description:
        "After the user approved in PayPal: completes the purchase if Waggle's return page hasn't already (capture, then the user's payback for a sponsored purchase) and reports the result. Safe to call again.",
      inputSchema: { order_id: z.string() },
      annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ order_id }) => {
      if (!db.order(order_id)) return failure(`Unknown order_id "${order_id}". Use the id returned by buy_product.`);
      return report(await settle(order_id, { waitForPayout: true }));
    },
  );

  return server;
}

/** The agent's completion message. Amounts and statuses, never the buyer's account. */
function report(s: Settlement) {
  if (s.state === "unknown") return failure("Unknown order.");
  if (s.state === "awaiting") return text(`The payment isn't approved yet (PayPal status ${s.paypalStatus}). Ask the user to approve it here: ${s.order.approve_url}`);
  if (s.state === "failed") return failure(`PayPal reports the capture as ${s.captureStatus}; no payback is paid unless it completes.`);
  const { order, offer } = s;
  const product = products.find((p) => p.id === order.product_id)!;
  const lines = [`Paid $${order.capture_amount} for ${product.title} (PayPal capture ${order.capture_id}).`];
  if (!offer) {
    lines.push("No sponsored offer was used, so there is no advertiser fee and no payback.");
    return text(lines.join("\n"));
  }
  const status = order.payout_status!;
  const userStatus = status.user ?? status.batch;
  lines.push(
    `Sponsored by ${offer.offer.advertiser.name}: their fee of $${fromCents(order.fee_cents!)} was split by PayPal Payouts (batch ${order.payout_batch_id}).`,
    `Payback to the PayPal account the user paid with: $${fromCents(order.user_cents!)} [${userStatus}]. Publisher share: $${fromCents(order.publisher_cents!)} [${status.publisher ?? status.batch}].`,
  );
  if (userStatus !== "SUCCESS") lines.push("The payout is still settling; call complete_purchase again in a little while to check.");
  return text(lines.join("\n"));
}

function orderBody(product: Product, listCents: number, totalCents: number, offer: OfferRow | undefined, baseUrl: string) {
  const value = (cents: number) => ({ currency_code: "USD", value: fromCents(cents) });
  return {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: product.id,
        // Only campaign and offer ids reach the advertiser, never who the user is or what they asked.
        ...(offer && { custom_id: `${offer.campaign_id}:${offer.offer_id}` }),
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
          return_url: `${baseUrl}/return`,
          cancel_url: `${baseUrl}/cancel`,
        },
      },
    },
  };
}
