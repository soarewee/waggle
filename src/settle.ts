// Completing an order: capture the approved payment, learn who paid from the capture, and for a sponsored
// purchase split the advertiser's fee into the publisher's share and the buyer's payback through PayPal Payouts.
// Two paths lead here, the page PayPal returns the buyer to and the agent's complete_purchase tool, and either
// may come first or both at once; the result is one capture and one payout batch however often it is called.

import type { Config } from "./config.ts";
import type { Db, OfferRow, OrderRow } from "./db.ts";
import { fromCents, splitFee, toCents } from "./money.ts";
import type { Payments } from "./paypal.ts";
import type { Campaign } from "./types.ts";

export interface SettleDeps {
  db: Db;
  paypal: Payments;
  config: Config;
  campaigns: Campaign[];
  /** Between payout status polls; tests set 0. */
  payoutPollMs?: number;
}

export type Settlement =
  | { state: "unknown" }
  | { state: "awaiting"; order: OrderRow; paypalStatus: string }
  | { state: "failed"; order: OrderRow; captureStatus: string }
  | { state: "paid"; order: OrderRow; offer?: OfferRow };

export type Settle = (orderId: string, opts?: { waitForPayout?: boolean }) => Promise<Settlement>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const PENDING = ["PENDING", "PROCESSING"];

export function createSettle({ db, paypal, config, campaigns, payoutPollMs = 3000 }: SettleDeps): Settle {
  const inflight = new Map<string, Promise<Settlement>>();
  const campaignOf = (offer: OfferRow) => campaigns.find((c) => c.campaign_id === offer.campaign_id)!;

  async function captureAndPay(orderId: string): Promise<Settlement> {
    let order = db.order(orderId);
    if (!order) return { state: "unknown" };

    if (!order.capture_id) {
      const remote = await paypal.getOrder(orderId);
      if (remote.status !== "APPROVED" && remote.status !== "COMPLETED") return { state: "awaiting", order, paypalStatus: remote.status };
      const captured = remote.status === "COMPLETED" ? remote : await paypal.captureOrder(orderId);
      const capture = captured.purchase_units[0].payments.captures[0];
      if (capture.status !== "COMPLETED") return { state: "failed", order, captureStatus: capture.status };
      // The capture says which PayPal account paid. That account gets the payback: nobody has to tell us who they are.
      const payer = captured.payer ?? remote.payer ?? {};
      order = db.updateOrder(orderId, {
        capture_id: capture.id,
        capture_amount: capture.amount.value,
        payer_email: payer.email_address ?? null,
        payer_id: payer.payer_id ?? null,
      });
    }

    const offer = order.offer_id ? db.offer(order.offer_id) : undefined;
    if (!offer) return { state: "paid", order };

    if (!order.payout_batch_id) {
      if (!order.payer_email) throw new Error(`PayPal did not say which account paid order ${orderId}, so the payback can't be sent.`);
      // The fee comes from what was actually captured, not from what was quoted.
      const split = splitFee(toCents(order.capture_amount!), campaignOf(offer), offer.offer.user_share_bps);
      const batch = await paypal.createPayout(payoutBody(offer, order.payer_email, order.capture_id!, split, config), `waggle:${offer.offer_id}:payout`);
      order = db.updateOrder(orderId, {
        fee_cents: split.fee,
        publisher_cents: split.publisher,
        user_cents: split.user,
        payout_batch_id: batch.batch_header.payout_batch_id,
        payout_status: { batch: batch.batch_header.batch_status },
      });
    }
    return { state: "paid", order, offer };
  }

  /** Reads the batch once; with `wait`, keeps reading briefly so the agent can usually report the final result. */
  async function refreshPayout(order: OrderRow, wait: boolean): Promise<OrderRow> {
    let batch = await paypal.getPayout(order.payout_batch_id!);
    for (let i = 0; wait && i < 6 && PENDING.includes(batch.batch_header.batch_status); i++) {
      await sleep(payoutPollMs);
      batch = await paypal.getPayout(order.payout_batch_id!);
    }
    const item = (role: string) => batch.items?.find((i: any) => i.payout_item.sender_item_id.endsWith(`:${role}`))?.transaction_status;
    return db.updateOrder(order.id, { payout_status: { batch: batch.batch_header.batch_status, publisher: item("publisher"), user: item("user") } });
  }

  return async (orderId, { waitForPayout = false } = {}) => {
    let pending = inflight.get(orderId);
    if (!pending) {
      pending = captureAndPay(orderId).finally(() => inflight.delete(orderId));
      inflight.set(orderId, pending);
    }
    const result = await pending;
    if (result.state !== "paid" || !result.offer || result.order.payout_status?.user === "SUCCESS") return result;
    return { ...result, order: await refreshPayout(result.order, waitForPayout) };
  };
}

function payoutBody(offer: OfferRow, payerEmail: string, captureId: string, split: ReturnType<typeof splitFee>, config: Config) {
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
      email_message: `Fee share for a sponsored purchase from ${offer.offer.advertiser.name} (capture ${captureId}).`,
    },
    items: [
      item("publisher", split.publisher, config.publisher.paypalEmail, `Publisher share, offer ${offer.offer_id}`),
      item("user", split.user, payerEmail, `Your payback for buying through a sponsored deal from ${offer.offer.advertiser.name}`),
    ],
  };
}
