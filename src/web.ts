// Waggle's web pages. There are two that matter: the front page, which explains Waggle and carries the one install
// line, and the page PayPal returns the buyer to, where the purchase is completed and the payback is shown.
// Server-rendered; the only external assets are the fonts.

import { products, searchProducts } from "./catalog.ts";
import type { Config } from "./config.ts";
import { applyDiscount, fromCents, splitFee, toCents } from "./money.ts";
import { pickCampaign } from "./offers.ts";
import type { Settlement } from "./settle.ts";
import { FONTS_HREF, STYLE } from "./style.ts";
import type { Campaign, Product } from "./types.ts";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const money = (cents: number) => `$${fromCents(cents)}`;
const pct = (bps: number) => `${(bps / 100).toString().replace(/\.0$/, "")}%`;

/** `sb-g2xro53586781@personal.example.com` → `sb-g2x…@personal.example.com`: enough to recognise, not to share. */
export function maskEmail(email: string) {
  const [user = "", domain = ""] = email.split("@");
  return `${user.slice(0, 3)}…@${domain}`;
}

const MARK = `<svg width="28" height="28" viewBox="0 0 38 38" aria-hidden="true">
  <path d="M19 2.5 33.3 10.75v16.5L19 35.5 4.7 27.25v-16.5Z" fill="#f0b32e"/>
  <path d="M19 9.5 27.2 14.25v9.5L19 28.5l-8.2-4.75v-9.5Z" fill="#fcefc9"/>
  <path d="M13 19c3-4 9-4 12 0-3 4-9 4-12 0Z" fill="#8f5f06"/></svg>`;

/** A hand-drawn arrow for the margin notes. `dir` is where it points. */
const arrow = (dir: "left" | "right" | "down") => {
  const d = { left: "M30 8C20 4 10 6 2 12m6-6L2 12l7 3", right: "M2 8c10-4 20-2 28 4m-6-6l6 6-7 3", down: "M8 2c4 10 4 18 2 28m-6-6l6 6 6-6" }[dir];
  return `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
};

const COPY_SCRIPT = `<script>
  document.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    await navigator.clipboard.writeText(document.getElementById(b.dataset.copy).textContent);
    const t = b.textContent; b.textContent = "Copied"; setTimeout(() => (b.textContent = t), 1400);
  }));
</script>`;

function page(title: string, body: string, opts: { description?: string; nav?: boolean } = {}) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>${opts.description ? `<meta name="description" content="${esc(opts.description)}">` : ""}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS_HREF}"><style>${STYLE}</style></head><body><div class="wrap">
<div class="nav"><a class="brand" href="/">${MARK}Waggle</a>${
    opts.nav === false ? "" : `<nav><a href="#how">How it works</a><a href="#sellers">For sellers</a><a href="https://github.com/soarewee/waggle">GitHub</a></nav>`
  }</div>
${body}
<footer><span>Built on PayPal Orders and Payouts. Runs on the PayPal sandbox for the <a href="https://paypalaihackathon.devpost.com/">PayPal AI Hackathon</a>: no real money moves.</span>
<span class="right"><a href="https://github.com/soarewee/waggle">Source</a></span></footer>
</div></body></html>`;
}

const productOf = (c: Campaign) => products.find((p) => p.id === c.product_id)!;

/** The numbers of a sponsored purchase: what the buyer pays and how the fee splits. */
function numbers(campaign: Campaign, product: Product, userShareBps: number) {
  const list = toCents(product.price);
  const paid = applyDiscount(list, campaign.deal?.discount_bps);
  return { list, paid, ...splitFee(paid, campaign, userShareBps) };
}

/**
 * The front page's centrepiece is the product itself: a conversation, run through the real search and the real
 * matching, so the tent, the offer and the numbers are the ones a user's agent gets today.
 */
function conversation(config: Config, campaigns: Campaign[]) {
  const query = "2-person tent";
  const results = searchProducts(query, 80);
  const pick = pickCampaign(results, campaigns, config.userShareBps);
  const n = pick && numbers(pick.campaign, pick.product, config.userShareBps);
  const recommended = pick?.product ?? results[0];
  const organic = results
    .map((p) => `<li><span>${esc(p.title)} <small>${esc(p.brand)} · ${esc(p.summary)}</small></span><span class="price">$${esc(p.price)}</span></li>`)
    .join("");

  const deal = pick?.campaign.deal ? `${esc(pick.campaign.deal.description)}, ` : "";
  const sponsoredBlock =
    pick && n
      ? `<div class="sponsored"><div class="tag"><span>Sponsored · Waggle</span><span>by ${esc(pick.campaign.advertiser.name)}</span></div>
      ${esc(pick.product.title)}: ${deal}<span class="price">${money(n.paid)}</span>${n.paid !== n.list ? ` instead of <span class="price">${money(n.list)}</span>` : ""}.
      Buying through this offer pays you back <span class="price">${money(n.user)}</span> to the PayPal account you pay with.</div>`
      : "";
  const recommendation =
    pick && n
      ? `<p>I'd take the <b>${esc(pick.product.title)}</b>: ${esc(pick.product.summary.replace(/\.$/, "").toLowerCase())}, and the better price.
      To be clear, that one is <b>sponsored by ${esc(pick.campaign.advertiser.name)}</b>: you'd pay ${money(n.paid)} and get ${money(n.user)} back in PayPal after the purchase.
      Want me to buy it?</p>`
      : `<p>I'd take the <b>${esc(recommended?.title ?? "first one")}</b>. Want me to buy it?</p>`;
  const paid = n ? money(n.paid) : `$${esc(recommended?.price ?? "0.00")}`;

  return `<div class="chat" aria-label="Example conversation with an agent that has Waggle">
  <div class="bar"><i></i><i></i><i></i><span>Your agent, with Waggle added</span></div>
  <div class="body">
    <div class="msg user">I'm going camping with a friend next weekend. Find me a 2-person tent under $80 and buy the one you'd recommend. Ask me before you pay.</div>
    <div class="msg agent">
      <div class="tool">search_products · waggle</div>
      <p>Two tents fit, from the search results:</p>
      <ul class="results">${organic}</ul>
      ${sponsoredBlock}
      ${recommendation}
      ${pick ? `<div class="annot">${arrow("left")}<span class="note">says it's sponsored right when it recommends it</span></div>` : ""}
    </div>
    <div class="msg user">Yes, go ahead.</div>
    <div class="msg agent">
      <div class="tool">buy_product · waggle</div>
      <p>Order created for ${paid}. Approve it in PayPal, then tell me when you're done:</p>
      <a class="btn" href="#how" onclick="return false">Approve in PayPal</a>
    </div>
    <div class="msg user">Done.</div>
    <div class="msg agent">
      <div class="tool">complete_purchase · waggle</div>
      ${
        pick && n
          ? `<p>Paid ${paid}, captured by PayPal. ${esc(pick.campaign.advertiser.name)}'s fee for the sale was ${money(n.fee)}: <b>${money(n.user)} was paid back</b> to the PayPal account you paid with, by PayPal Payouts, and ${money(n.publisher)} went to Waggle. <span class="status ok">Payout SUCCESS</span></p>
      <div class="annot left"><span class="note">to the account you just paid with. nothing to set up</span>${arrow("right")}</div>`
          : `<p>Paid ${paid}, captured by PayPal. No sponsored offer was used, so there is no fee and no payback.</p>`
      }
    </div>
  </div>
</div>`;
}

/** The worked example: the first campaign's numbers, as a receipt. */
function receipt(campaign: Campaign, userShareBps: number) {
  const p = productOf(campaign);
  const n = numbers(campaign, p, userShareBps);
  return `<div class="card receipt"><table>
  <tr><td>${esc(p.title)}<small>list price</small></td><td class="num">${money(n.list)}</td></tr>
  ${campaign.deal ? `<tr><td>${esc(campaign.advertiser.name)}'s deal<small>${esc(campaign.deal.description)}</small></td><td class="num">−${money(n.list - n.paid)}</td></tr>` : ""}
  <tr><td><b>You pay</b><small>approved by you, in PayPal</small></td><td class="num"><b>${money(n.paid)}</b></td></tr>
  <tr><td>${esc(campaign.advertiser.name)}'s fee for the sale<small>$${esc(campaign.reward_per_conversion)} per sale, capped at ${pct(campaign.max_fee_bps)} of what you paid</small></td><td class="num">${money(n.fee)}</td></tr>
  <tr><td>Waggle keeps<small>${pct(10000 - userShareBps)} of the fee</small></td><td class="num">${money(n.publisher)}</td></tr>
  <tr class="sum"><td>Paid back to you<small>${pct(userShareBps)} of the fee, by PayPal Payouts, right after the purchase</small></td><td class="num">+${money(n.user)}</td></tr>
</table></div>`;
}

export function landingPage(config: Config, campaigns: Campaign[]) {
  const url = `${config.baseUrl}/mcp`;
  const shown = campaigns[0];
  const share = pct(config.userShareBps);
  return page(
    "Waggle: Honey for agents",
    `<div class="hero">
  <a class="badge" href="https://paypalaihackathon.devpost.com/"><i></i>Built for the PayPal AI Hackathon</a>
  <h1>Your agent finds the deal.<br><em>PayPal pays you back.</em></h1>
  <p class="lead">Honey for agents. When your AI agent shops for you, sellers compete for its pick. Waggle brings their offers to your agent,
  makes it say which one is sponsored, and when you buy through one, ${share} of the seller's fee comes back to you in PayPal cash.</p>
  <div class="install"><span class="prompt">$</span><code id="cc">claude mcp add --transport http waggle <span class="hl">${esc(url)}</span></code><button class="btn light" data-copy="cc">Copy</button></div>
  <p class="hint">One line in Claude Code. <a href="#clients">Claude Desktop, ChatGPT, Cursor and other agents</a> take the same URL. No account, no login: adding it is the opt-in, removing it the opt-out.</p>
</div>

${conversation(config, campaigns)}

<section id="how">
  <p class="eyebrow">How it works</p>
  <h2>Three steps, and you only ever talk to your agent.</h2>
  <div class="steps">
    <div class="step"><div class="n">1</div><h3>Shop in conversation</h3><p><q>Find me a 2-person tent under $80.</q> Your agent gets the usual results, plus at most one offer, kept apart and marked sponsored with the seller's name.</p></div>
    <div class="step"><div class="n">2</div><h3>Your agent tells you</h3><p>If it recommends the sponsored one, it says so in the same breath: who sponsors it, the deal, and what you get back. It never buys without your yes.</p></div>
    <div class="step"><div class="n">3</div><h3>Approve, get paid back</h3><p>You approve the payment in PayPal yourself. The moment it goes through, your share of the seller's fee is on its way to the account you paid with.</p></div>
  </div>
</section>

<section id="money">
  <div class="two">
    <div class="text">
      <p class="eyebrow">How the money moves</p>
      <h2>One purchase, one split.</h2>
      <p>Sellers already pay for customers: per click to search engines, per sale to affiliate networks and coupon sites. Waggle is that
      business for the agent era, with one change: an agent is not persuaded by attention, only by terms. So the seller's fee buys a place in
      front of an agent that is comparing right now, is paid only when the purchase is captured, and ${share} of it is yours.</p>
      <p>A purchase without a sponsored offer is just a purchase: no fee, no payback, nothing for Waggle.</p>
    </div>
    ${shown ? receipt(shown, config.userShareBps) : ""}
  </div>
</section>

<section id="rules">
  <p class="eyebrow">The rules in the code</p>
  <h2>What Waggle never does.</h2>
  <div class="rules">
    <div class="rule"><h3>Mix offers into results</h3><p>Search results are complete and in their own order. The sponsored offer sits outside them, labeled, one per search.</p></div>
    <div class="rule"><h3>Earn on a purchase it brought no deal to</h3><p>The fee exists only when you bought through an offer. No offer, no fee, no payback.</p></div>
    <div class="rule"><h3>Sell the slot to the highest bidder</h3><p>When several sellers have offers on what you searched, the one that gives <i>you</i> the most, deal plus payback, wins. Not the one paying Waggle the most.</p></div>
    <div class="rule"><h3>Show sellers who you are</h3><p>Matching runs inside Waggle. A seller learns that a sale came through their campaign, never your search, your conversation or your PayPal account.</p></div>
    <div class="rule"><h3>Move money without you</h3><p>Every payment is approved by you in PayPal. Waggle holds no credentials and no accounts; it learns who paid from PayPal, and that is where the payback goes.</p></div>
  </div>
</section>

<section id="sellers">
  <div class="two">
    <div class="text">
      <p class="eyebrow">For sellers</p>
      <h2>A campaign is a product, a deal and a fee.</h2>
      <p>A seller registers a campaign: the product, an optional deal, a fee per sale and a cap on it as a share of the amount paid. ${shown ? `This is ${esc(shown.advertiser.name)}'s campaign in the demo.` : ""}</p>
      <p>Campaigns on the products a search found compete for the one slot, and the one worth the most to the user wins. The fee is charged only
      on captured payments and split in one step. The shape is <a href="https://github.com/soarewee/waggle#campaigns-how-sellers-get-in">Agentic AdFi's sponsored-offer schema</a>.</p>
      <p class="muted">In this demo Waggle is also the store, so the offer and the purchase meet in one PayPal order. The README says where that goes next.</p>
    </div>
    ${shown ? `<pre>${esc(JSON.stringify(shown, null, 2))}</pre>` : ""}
  </div>
</section>

<section id="clients">
  <p class="eyebrow">Add Waggle to any agent</p>
  <h2>Same URL everywhere.</h2>
  <p class="muted" style="font-size:16px;color:var(--ink-2)">Waggle is a remote MCP server. Any client that takes one can use it; nothing is installed on your machine.</p>
  <div class="snippets">
    <div class="snippet"><div class="label">Claude Code<small>terminal</small></div><code id="cc2">claude mcp add --transport http waggle ${esc(url)}</code><button class="btn quiet" data-copy="cc2">Copy</button></div>
    <div class="snippet"><div class="label">Claude Desktop, ChatGPT<small>custom connector URL</small></div><code id="url">${esc(url)}</code><button class="btn quiet" data-copy="url">Copy</button></div>
    <div class="snippet"><div class="label">Cursor, JSON configs<small>mcpServers entry</small></div><code id="json">{ "mcpServers": { "waggle": { "url": "${esc(url)}" } } }</code><button class="btn quiet" data-copy="json">Copy</button></div>
  </div>
</section>
${COPY_SCRIPT}`,
    { description: "Honey for agents. When your AI agent shops, Waggle brings sponsored offers, the agent says which one is sponsored, and PayPal pays part of the seller's fee back to you." },
  );
}

const next = (text: string) => `<div class="next"><span class="n">→</span><span>${text}</span></div>`;

/** What the buyer sees when PayPal brings them back: the purchase completed, and the payback on its way. */
export function returnPage(s: Settlement) {
  if (s.state === "unknown") return errorPage(404, "We don't know this order. If you just paid, tell your agent; it can check.");
  if (s.state === "awaiting") {
    return page(
      "Not approved yet",
      `<div class="return"><p class="eyebrow">Back from PayPal</p><h1>Not approved yet.</h1>
<p class="lead">PayPal reports this order as <span class="status mono">${esc(s.paypalStatus)}</span>. Nothing was charged.</p>
<p><a class="btn" href="${esc(s.order.approve_url)}">Approve in PayPal</a></p></div>`,
      { nav: false },
    );
  }
  if (s.state === "failed") {
    return page(
      "Payment not completed",
      `<div class="return"><p class="eyebrow">Back from PayPal</p><h1>Payment not completed.</h1>
<p class="lead">PayPal reports the capture as <span class="status bad">${esc(s.captureStatus)}</span>. No payback is paid unless it completes.</p>
${next("Tell your agent; it can check again.")}</div>`,
      { nav: false },
    );
  }
  const { order, offer } = s;
  const title = products.find((p) => p.id === order.product_id)?.title ?? order.product_id;
  const paidWith = order.payer_email ? maskEmail(order.payer_email) : "your PayPal account";
  if (!offer) {
    return page(
      "Paid",
      `<div class="return"><p class="eyebrow">Back from PayPal</p><h1>Paid $${esc(order.capture_amount)}.</h1>
<p class="lead">${esc(title)}, paid with ${esc(paidWith)}. No sponsored offer was used, so there is no fee and no payback.</p>
${next("Back in your agent, say you're done. It will confirm the payment.")}</div>`,
      { nav: false },
    );
  }
  const status = order.payout_status?.user ?? order.payout_status?.batch ?? "PENDING";
  const settled = status === "SUCCESS";
  const stuck = !["SUCCESS", "PENDING", "PROCESSING", "UNCLAIMED"].includes(status);
  return page(
    "Paid, payback on its way",
    `<div class="return"><p class="eyebrow">Back from PayPal</p><h1>Paid $${esc(order.capture_amount)}.</h1>
<p class="lead">${esc(title)}, paid with ${esc(paidWith)}.</p>
<div class="card receipt">
  <div class="payback"><span class="big">+${money(order.user_cents!)}</span>
    <span class="status ${settled ? "ok" : stuck ? "bad" : "honey"}">${settled ? "Paid back" : stuck ? esc(status) : "On its way"}</span>
    <small style="flex-basis:100%;margin:0">${settled ? "Paid" : "Being paid"} by PayPal Payouts to ${esc(paidWith)}, the account you just paid with.</small></div>
  <table>
    <tr><td>Sponsored by ${esc(offer.offer.advertiser.name)}<small>their fee for this sale</small></td><td class="num">${money(order.fee_cents!)}</td></tr>
    <tr><td>Waggle keeps</td><td class="num">${money(order.publisher_cents!)}</td></tr>
    <tr class="sum"><td>Paid back to you</td><td class="num">+${money(order.user_cents!)}</td></tr>
  </table>
  ${status === "UNCLAIMED" ? `<p class="muted" style="margin:12px 0 4px">PayPal is holding it until that email has a PayPal account; it will email you.</p>` : ""}
</div>
${next("Back in your agent, say you're done. It will confirm the payment and the payback.")}</div>`,
    { nav: false },
  );
}

export function cancelPage() {
  return page(
    "Payment cancelled",
    `<div class="return"><p class="eyebrow">Back from PayPal</p><h1>Payment cancelled.</h1><p class="lead">Nothing was charged.</p>${next("Tell your agent you cancelled.")}</div>`,
    { nav: false },
  );
}

export function errorPage(status: number, message: string) {
  return page(
    `Waggle: ${status}`,
    `<div class="return"><p class="eyebrow">Error ${status}</p><h1>${status === 404 ? "Not found." : "Something went wrong."}</h1><p class="lead">${esc(message)}</p><p><a class="btn quiet" href="/">Front page</a></p></div>`,
    { nav: false },
  );
}
