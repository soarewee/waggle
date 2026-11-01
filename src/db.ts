// Waggle's records, in SQLite (Node's built-in driver, no dependency): which offers were delivered, and every
// order from checkout to payout. There is no user table: an order knows who paid from PayPal's capture, and that
// is where the payback goes. Advertisers never read this.

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { SponsoredOffer } from "./types.ts";

export interface OfferRow {
  offer_id: string;
  campaign_id: string;
  product_id: string;
  offer: SponsoredOffer;
  /** Set when the offer is spent on an order. */
  order_id: string | null;
  created_at: string;
}

export interface PayoutStatus {
  batch: string;
  publisher?: string;
  user?: string;
}

export interface OrderRow {
  id: string;
  product_id: string;
  offer_id: string | null;
  /** What the buyer pays, after the deal. Decimal string. */
  total: string;
  approve_url: string;
  created_at: string;
  capture_id: string | null;
  capture_amount: string | null;
  /** The PayPal account that paid, from the capture. The payback goes there. */
  payer_email: string | null;
  payer_id: string | null;
  fee_cents: number | null;
  publisher_cents: number | null;
  user_cents: number | null;
  payout_batch_id: string | null;
  payout_status: PayoutStatus | null;
}

const SCHEMA = `
  create table if not exists offers (
    offer_id text primary key,
    campaign_id text not null,
    product_id text not null,
    offer text not null,
    order_id text,
    created_at text not null
  );
  create table if not exists orders (
    id text primary key,
    product_id text not null,
    offer_id text references offers(offer_id),
    total text not null,
    approve_url text not null,
    created_at text not null,
    capture_id text,
    capture_amount text,
    payer_email text,
    payer_id text,
    fee_cents integer,
    publisher_cents integer,
    user_cents integer,
    payout_batch_id text,
    payout_status text
  );
`;

const now = () => new Date().toISOString();
const json = (v: unknown) => JSON.stringify(v);

export class Db {
  #db: DatabaseSync;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.#db = new DatabaseSync(path);
    this.#db.exec("pragma journal_mode = wal; pragma foreign_keys = on;");
    this.#db.exec(SCHEMA);
  }

  close() {
    this.#db.close();
  }

  // Offers

  saveOffer(offer: SponsoredOffer, productId: string) {
    this.#db
      .prepare("insert into offers (offer_id, campaign_id, product_id, offer, created_at) values (?, ?, ?, ?, ?)")
      .run(offer.offer_id, offer.campaign_id, productId, json(offer), now());
  }

  offer(offerId: string): OfferRow | undefined {
    const row = this.#db.prepare("select * from offers where offer_id = ?").get(offerId) as any;
    return row && { ...row, offer: JSON.parse(row.offer) };
  }

  // Orders

  createOrder(o: { id: string; product_id: string; offer_id?: string; total: string; approve_url: string }): OrderRow {
    this.#db
      .prepare("insert into orders (id, product_id, offer_id, total, approve_url, created_at) values (?, ?, ?, ?, ?, ?)")
      .run(o.id, o.product_id, o.offer_id ?? null, o.total, o.approve_url, now());
    if (o.offer_id) this.#db.prepare("update offers set order_id = ? where offer_id = ?").run(o.id, o.offer_id);
    return this.order(o.id)!;
  }

  order(id: string): OrderRow | undefined {
    const row = this.#db.prepare("select * from orders where id = ?").get(id) as any;
    return row && { ...row, payout_status: row.payout_status && JSON.parse(row.payout_status) };
  }

  updateOrder(id: string, patch: Partial<Omit<OrderRow, "id">>): OrderRow {
    const entries = Object.entries(patch).map(([k, v]) => [k, k === "payout_status" && v ? json(v) : v] as const);
    if (entries.length) {
      this.#db.prepare(`update orders set ${entries.map(([k]) => `${k} = ?`).join(", ")} where id = ?`).run(...entries.map(([, v]) => v as any), id);
    }
    return this.order(id)!;
  }
}
