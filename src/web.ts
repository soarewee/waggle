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

/**
 * The mark is the waggle dance, how a bee tells the hive where the good stuff is: a straight run (honey) between two
 * return loops (ink), tilted, because the run's angle is the direction to the find.
 */
const DANCE = `<g transform="rotate(-25 16 16)" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path d="M13.2 6.6C6.8 7.6 3.8 15.5 6.2 20.8c1.3 2.9 3.9 4.3 6.6 4.7M18.8 6.6c6.4 1 9.4 8.9 7 14.2-1.3 2.9-3.9 4.3-6.6 4.7" stroke="#111111" stroke-width="2.2"/>
  <path d="M16 25.5q-2.4-2.4 0-4.75t0-4.75 0-4.75 0-4.75" stroke="#e0a21c" stroke-width="2.4"/></g>`;
const MARK = `<svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">${DANCE}</svg>`;
const FAVICON = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#f2f2f2"/>${DANCE}</svg>`)}`;

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
<link rel="icon" href="${FAVICON}"><link rel="stylesheet" href="${FONTS_HREF}"><style>${STYLE}</style></head><body><div class="wrap">
<div class="nav"><a class="brand" href="/">${MARK}<span>Waggle</span></a>${
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

  return `<div class="demo"><div class="chat" aria-label="Example conversation with an agent that has Waggle">
  <div class="bar">Your agent, with Waggle added</div>
  <div class="body">
    <div class="msg user">I'm going camping with a friend next weekend. Find me a 2-person tent under $80 and buy the one you'd recommend. Ask me before you pay.</div>
    <div class="msg agent">
      <div class="tool">search_products · waggle</div>
      <p>Two tents fit, from the search results:</p>
      <ul class="results">${organic}</ul>
      ${sponsoredBlock}
      ${recommendation}
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
          ? `<p>Paid ${paid}, captured by PayPal. ${esc(pick.campaign.advertiser.name)}'s fee for the sale was ${money(n.fee)}: <b>${money(n.user)} was paid back</b> to the PayPal account you paid with, by PayPal Payouts, and ${money(n.publisher)} went to Waggle. <span class="status ok">Payout SUCCESS</span></p>`
          : `<p>Paid ${paid}, captured by PayPal. No sponsored offer was used, so there is no fee and no payback.</p>`
      }
    </div>
  </div>
</div>
<ol class="notes">
  <li>The search results come back complete and in their own order. The offer sits outside them, marked sponsored, with the seller's name.</li>
  <li>When the agent recommends the sponsored tent, it says so in the same sentence, with what you get back.</li>
  <li>You approve the payment in PayPal. The payback goes to the account you paid with; there is nothing to set up.</li>
</ol></div>`;
}

/**
 * Who pays whom in one sponsored purchase, drawn from the campaign's real numbers: the three parties on top, PayPal
 * underneath carrying the payment (Orders) and the split (Payouts). Wide for screens, tall for phones, where the wide
 * one's labels would shrink past reading.
 */
function flowDiagram(campaign: Campaign, userShareBps: number) {
  const n = numbers(campaign, productOf(campaign), userShareBps);
  const deal = campaign.deal?.discount_bps ? `${pct(campaign.deal.discount_bps)} off` : "a deal";
  const fee = money(toCents(campaign.reward_per_conversion));
  const marker = (id: string, color: string) =>
    `<marker id="${id}" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M1 1.5 10 6 1 10.5" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></marker>`;
  const arrow = (x1: number, y1: number, x2: number, y2: number, id: string, honey = false) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${honey ? "edge honey" : "edge"}" marker-end="url(#${id}${honey ? "h" : ""})"/>`;
  const node = (x: number, y: number, w: number, h: number) => `<rect class="node" x="${x}" y="${y}" width="${w}" height="${h}" rx="12"/>`;
  const t = (x: number, y: number, cls: string, text: string, anchor = "start") =>
    `<text class="${cls}" x="${x}" y="${y}"${anchor === "start" ? "" : ` text-anchor="${anchor}"`}>${esc(text)}</text>`;
  const advertiser = campaign.advertiser.name;

  const wide = `<svg class="wide" viewBox="-4 -4 1032 364" role="img" aria-label="${esc(
    `The seller offers ${deal} and a ${fee} fee to Waggle. Waggle brings one sponsored offer to you and your agent. You pay ${money(n.paid)} through PayPal, approved by you; the seller receives it. The ${money(n.fee)} fee is split by PayPal Payouts: ${money(n.publisher)} to Waggle, ${money(n.user)} back to you.`,
  )}">
    <defs>${marker("fw", "#111111")}${marker("fwh", "#8f5f06")}</defs>
    ${node(0, 0, 240, 104)}${t(20, 46, "nm", "Seller")}${t(20, 78, "sub", advertiser)}
    ${node(390, 0, 240, 104)}<svg x="408" y="20" width="30" height="30" viewBox="0 0 32 32">${DANCE}</svg>${t(446, 46, "nm", "Waggle")}${t(410, 78, "sub", "added to your agent")}
    ${node(780, 0, 240, 104)}${t(800, 46, "nm", "You")}${t(800, 78, "sub", "and your AI agent")}
    ${arrow(248, 52, 380, 52, "fw")}${t(314, 38, "lbl", deal, "middle")}${t(314, 78, "lbl", `${fee} fee`, "middle")}
    ${arrow(638, 52, 770, 52, "fw")}${t(704, 38, "lbl", "1 offer", "middle")}${t(704, 78, "lbl", "sponsored", "middle")}
    <rect class="rail" x="0" y="296" width="1020" height="56" rx="10"/>${t(510, 330, "rail-t", "PayPal  ·  Orders for the payment  ·  Payouts for the split", "middle")}
    ${arrow(80, 288, 80, 112, "fw")}${t(68, 196, "amt", money(n.paid), "end")}
    ${arrow(150, 112, 150, 288, "fw")}${t(162, 196, "amt", money(n.fee))}${t(162, 218, "lbl", "fee")}
    ${arrow(510, 288, 510, 112, "fw")}${t(522, 196, "amt", money(n.publisher))}${t(522, 218, "lbl", pct(10000 - userShareBps))}
    ${arrow(860, 112, 860, 288, "fw")}${t(848, 196, "amt", money(n.paid), "end")}${t(848, 218, "lbl", "you approve", "end")}
    ${arrow(920, 288, 920, 112, "fw", true)}${t(932, 196, "amt honey", `+${money(n.user)}`)}${t(932, 218, "lbl honey", `${pct(userShareBps)} to you`)}
  </svg>`;

  const tall = `<svg class="tall" viewBox="0 -2 360 372" aria-hidden="true">
    <defs>${marker("ft", "#111111")}${marker("fth", "#8f5f06")}</defs>
    ${node(0, 0, 164, 64)}${t(14, 30, "nm", "Seller")}${t(14, 50, "sub", advertiser)}
    ${node(0, 152, 164, 64)}<svg x="13" y="162" width="22" height="22" viewBox="0 0 32 32">${DANCE}</svg>${t(40, 182, "nm", "Waggle")}${t(14, 202, "sub", "added to your agent")}
    ${node(0, 304, 164, 64)}${t(14, 334, "nm", "You")}${t(14, 354, "sub", "and your AI agent")}
    ${arrow(28, 72, 28, 144, "ft")}${t(42, 112, "lbl", `${deal}, ${fee} fee`)}
    ${arrow(28, 224, 28, 296, "ft")}${t(42, 264, "lbl", "1 offer, sponsored")}
    <rect class="rail" x="312" y="0" width="48" height="368" rx="10"/><text class="rail-t" transform="translate(336 184) rotate(90)" text-anchor="middle" dy="5">PayPal</text>
    ${arrow(304, 22, 172, 22, "ft")}${t(238, 15, "amt", `${money(n.paid)} sale`, "middle")}
    ${arrow(172, 52, 304, 52, "ft")}${t(238, 45, "amt", `${money(n.fee)} fee`, "middle")}
    ${arrow(304, 190, 172, 190, "ft")}${t(238, 183, "amt", `${money(n.publisher)} to Waggle`, "middle")}
    ${arrow(172, 322, 304, 322, "ft")}${t(238, 315, "amt", `${money(n.paid)} you pay`, "middle")}
    ${arrow(304, 352, 172, 352, "ft", true)}${t(238, 345, "amt honey", `+${money(n.user)} to you`, "middle")}
  </svg>`;

  return `<figure class="flow">${wide}${tall}</figure>`;
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

/** How to add Waggle, one tab per client, each with the one way that client takes a remote MCP server. */
function clientTabs(url: string) {
  const json = JSON.stringify({ mcpServers: { waggle: { url } } }, null, 2);
  const clients = [
    { id: "claude-code", name: "Claude Code", how: "Run this in your terminal.", code: `claude mcp add --transport http waggle ${url}` },
    { id: "codex", name: "Codex", how: "Run this in your terminal.", code: `codex mcp add waggle --url ${url}` },
    { id: "claude", name: "Claude", how: "On claude.ai or in Claude Desktop, open Connectors, add a custom connector and paste this URL.", code: url },
    { id: "chatgpt", name: "ChatGPT", how: "Turn on Developer mode, add a custom MCP server and paste this URL. Developer mode depends on your ChatGPT plan.", code: url },
    { id: "cursor", name: "Cursor", how: "Add this to <code>~/.cursor/mcp.json</code>, or to <code>.cursor/mcp.json</code> in a project.", code: json },
    { id: "vscode", name: "VS Code", how: "Run this in your terminal, or paste the URL into the <i>MCP: Add Server</i> command.", code: `code --add-mcp '${JSON.stringify({ name: "waggle", type: "http", url })}'` },
    { id: "other", name: "Other", how: "Any client that takes a remote MCP server over streamable HTTP: give it this URL. No API key, no login.", code: url },
  ];
  const tabs = clients
    .map((c, i) => `<button role="tab" id="tab-${c.id}" aria-controls="add-${c.id}" aria-selected="${i === 0}">${c.name}</button>`)
    .join("");
  const panels = clients
    .map(
      (c, i) => `<div role="tabpanel" id="add-${c.id}" aria-labelledby="tab-${c.id}"${i === 0 ? "" : " hidden"}><p>${c.how}</p>
      <div class="cmd"><pre id="code-${c.id}">${esc(c.code)}</pre><button class="btn quiet" data-copy="code-${c.id}">Copy</button></div></div>`,
    )
    .join("");
  return `<div class="clients"><div class="tabs" role="tablist" aria-label="Agent">${tabs}</div>${panels}</div>
<script>
  const tabs = document.querySelectorAll(".clients [role=tab]");
  tabs.forEach((t) => t.addEventListener("click", () => {
    tabs.forEach((x) => x.setAttribute("aria-selected", x === t));
    document.querySelectorAll(".clients [role=tabpanel]").forEach((p) => (p.hidden = p.id !== t.getAttribute("aria-controls")));
  }));
</script>`;
}

export function landingPage(config: Config, campaigns: Campaign[]) {
  const url = `${config.baseUrl}/mcp`;
  const shown = campaigns[0];
  const share = pct(config.userShareBps);
  return page(
    "Waggle: Honey for agents",
    `<div class="hero">
  <h1>Your agent finds the deal.<br>PayPal pays you back.</h1>
  <p class="lead">Honey for agents. When your AI agent shops for you, sellers compete for its pick. Waggle brings their offers to your agent,
  makes it say which one is sponsored, and when you buy through one, ${share} of the seller's fee comes back to you in PayPal cash.</p>
  <div class="install"><span class="prompt">$</span><code id="cc">claude mcp add --transport http waggle <span class="hl">${esc(url)}</span></code><button class="btn light" data-copy="cc">Copy</button></div>
  <p class="hint">One line in Claude Code. <a href="#clients">Codex, Claude, ChatGPT, Cursor and VS Code</a> take the same URL. No account, no login. It sees <a href="#rules">your agent's search words, never your conversation</a>.</p>
</div>

${conversation(config, campaigns)}

<section id="how">
  <h2>Three steps, and you only ever talk to your agent.</h2>
  <div class="steps">
    <div class="step"><h3><span>1</span>Shop in conversation</h3><p><q>Find me a 2-person tent under $80.</q> Your agent gets the usual results, plus at most one offer, kept apart and marked sponsored with the seller's name.</p></div>
    <div class="step"><h3><span>2</span>Your agent tells you</h3><p>If it recommends the sponsored one, it says so in the same breath: who sponsors it, the deal, and what you get back. It never buys without your yes.</p></div>
    <div class="step"><h3><span>3</span>Approve, get paid back</h3><p>You approve the payment in PayPal yourself. The moment it goes through, your share of the seller's fee is on its way to the account you paid with.</p></div>
  </div>
</section>

<section id="money">
  <h2>One purchase, one split.</h2>
  ${shown ? flowDiagram(shown, config.userShareBps) : ""}
  <div class="two">
    <div class="text">
      <p>Sellers already pay for customers: per click to search engines, per sale to affiliate networks and coupon sites. Waggle is that
      business for the agent era, with one change: an agent is not persuaded by attention, only by terms. So the seller's fee buys a place in
      front of an agent that is comparing right now, is paid only when the purchase is captured, and ${share} of it is yours.</p>
      <p>A purchase without a sponsored offer is just a purchase: no fee, no payback, nothing for Waggle.</p>
    </div>
    ${shown ? receipt(shown, config.userShareBps) : ""}
  </div>
</section>

<section id="rules">
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
      <h2>A campaign is a product, a deal and a fee.</h2>
      <p>A seller registers a campaign: the product, an optional deal, a fee per sale and a cap on it as a share of the amount paid. ${shown ? `This is ${esc(shown.advertiser.name)}'s campaign in the demo.` : ""}</p>
      <p>Campaigns on the products a search found compete for the one slot, and the one worth the most to the user wins. The fee is charged only
      on captured payments and split in one step. The campaign format is <a href="https://github.com/soarewee/waggle#campaigns-how-sellers-get-in">in the README</a>.</p>
      <p class="muted">In this demo Waggle is also the store, so the offer and the purchase meet in one PayPal order. The README says where that goes next.</p>
    </div>
    ${shown ? `<pre>${esc(JSON.stringify(shown, null, 2))}</pre>` : ""}
  </div>
</section>

<section id="clients">
  <h2>Add it to any agent.</h2>
  <p class="sub">Waggle is a remote MCP server. Any client that takes one can use it; nothing is installed on your machine.</p>
  ${clientTabs(url)}
</section>
${COPY_SCRIPT}`,
    { description: "Honey for agents. When your AI agent shops, Waggle brings sponsored offers, the agent says which one is sponsored, and PayPal pays part of the seller's fee back to you." },
  );
}

const next = (text: string) => `<p class="next">${text}</p>`;

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
  ${status === "UNCLAIMED" ? `<p class="muted" style="margin:12px 0 10px">PayPal is holding it until that email has a PayPal account; it will email you.</p>` : ""}
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
