// Waggle's web pages. There are two that matter: the front page, which explains Waggle and carries the one install
// line, and the page PayPal returns the buyer to, where the purchase is completed and the payback is shown.
// Server-rendered, no external assets.

import { products } from "./catalog.ts";
import type { Config } from "./config.ts";
import { applyDiscount, fromCents, splitFee, toCents } from "./money.ts";
import type { Settlement } from "./settle.ts";
import type { Campaign } from "./types.ts";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const money = (cents: number) => `$${fromCents(cents)}`;
const pct = (bps: number) => `${(bps / 100).toString().replace(/\.0$/, "")}%`;

/** `sb-g2xro53586781@personal.example.com` → `sb-g2x…@personal.example.com`: enough to recognise, not to share. */
export function maskEmail(email: string) {
  const [user = "", domain = ""] = email.split("@");
  return `${user.slice(0, 3)}…@${domain}`;
}

const STYLE = `
  :root { --bg:#faf7f1; --card:#fff; --ink:#1c1917; --muted:#6f685f; --line:#e9e2d6; --honey:#e9a319; --honey-ink:#8a5a08;
    --honey-soft:#fff3d4; --ok:#1f7a4d; --ok-soft:#e2f3e9; --bad:#b3261e; --bad-soft:#fbe4e2; }
  * { box-sizing: border-box }
  body { margin:0; background:var(--bg); color:var(--ink); -webkit-font-smoothing:antialiased;
    font:15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif }
  a { color:inherit }
  .wrap { max-width:42rem; margin:0 auto; padding:40px 20px 96px }
  header { display:flex; align-items:center; gap:12px; margin-bottom:36px }
  header .name { font-weight:700; font-size:17px; letter-spacing:-.01em }
  h1 { font-size:34px; line-height:1.15; letter-spacing:-.02em; margin:0 0 12px }
  h2 { font-size:12px; text-transform:uppercase; letter-spacing:.09em; color:var(--muted); margin:36px 0 12px }
  p { margin:0 0 12px }
  .lead { font-size:18px; color:var(--muted); max-width:36rem }
  .card { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:20px 22px }
  .card p:last-child { margin-bottom:0 }
  .steps { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin:28px 0 }
  .steps div { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:16px 18px; font-size:14px }
  .steps b { display:block; color:var(--honey-ink); font-size:12px; letter-spacing:.06em; margin-bottom:6px }
  .btn { display:inline-block; background:var(--ink); color:#fff; text-decoration:none; font-weight:600; font-size:14px;
    padding:11px 18px; border-radius:11px; border:0; cursor:pointer }
  .btn:hover { background:#000 }
  .btn.quiet { background:transparent; color:var(--ink); border:1px solid var(--line); padding:7px 12px; font-size:13px }
  .btn.quiet:hover { background:#f3eee4 }
  pre { margin:0; background:#1c1917; color:#f5efe3; border-radius:10px; padding:12px 14px; font:13px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
    overflow-x:auto; white-space:pre-wrap; word-break:break-all }
  pre.json { white-space:pre; word-break:normal; font-size:12px }
  .snippet { display:grid; gap:6px }
  .snippet + .snippet { margin-top:14px }
  .snippet .label { display:flex; align-items:center; font-size:13px; font-weight:600 }
  .snippet .label button { margin-left:auto }
  .muted { color:var(--muted); font-size:13px }
  .chip { font-size:11px; font-weight:600; padding:2px 9px; border-radius:999px; background:#f0ebe2; color:var(--muted); white-space:nowrap; vertical-align:middle }
  .chip.honey { background:var(--honey-soft); color:var(--honey-ink) }
  .chip.ok { background:var(--ok-soft); color:var(--ok) }
  .chip.bad { background:var(--bad-soft); color:var(--bad) }
  .rules p { padding-left:1.1em; text-indent:-1.1em }
  .rules p::before { content:"·"; display:inline-block; width:1.1em; text-indent:0; color:var(--honey) }
  table { width:100%; border-collapse:collapse; font-size:14px }
  td { padding:8px 0; border-top:1px solid var(--line) }
  tr:first-child td { border-top:0 }
  td.num { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap }
  td.sum { font-weight:700; border-top:2px solid var(--ink) }
  .big { font-size:34px; font-weight:700; letter-spacing:-.02em; font-variant-numeric:tabular-nums }
  footer { margin-top:48px; font-size:12px; color:var(--muted) }
  @media (max-width:640px) { .steps { grid-template-columns:1fr } h1 { font-size:28px } }
`;

const MARK = `<svg width="30" height="30" viewBox="0 0 38 38" aria-hidden="true">
  <path d="M19 2.5 33.3 10.75v16.5L19 35.5 4.7 27.25v-16.5Z" fill="#e9a319"/>
  <path d="M19 9.5 27.2 14.25v9.5L19 28.5l-8.2-4.75v-9.5Z" fill="#fff3d4"/>
  <path d="M13 19c3-4 9-4 12 0-3 4-9 4-12 0Z" fill="#8a5a08"/></svg>`;

const COPY_SCRIPT = `<script>
  document.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    await navigator.clipboard.writeText(document.getElementById(b.dataset.copy).textContent);
    const t = b.textContent; b.textContent = "Copied"; setTimeout(() => (b.textContent = t), 1200);
  }));
</script>`;

function page(title: string, body: string) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><style>${STYLE}</style><body><div class="wrap">
<header>${MARK}<a class="name" href="/" style="text-decoration:none">Waggle</a></header>
${body}
<footer>Waggle runs on the PayPal sandbox for the PayPal AI Hackathon: no real money moves. Built on PayPal Orders and Payouts.
<a href="https://github.com/soarewee/waggle">Source</a>.</footer>
</div></body></html>`;
}

/** The worked example on the front page: the first campaign in the file, with its numbers. */
function example(best: Campaign | undefined, userShareBps: number) {
  if (!best) return "";
  const p = product(best);
  const list = toCents(p.price);
  const paid = applyDiscount(list, best.deal?.discount_bps);
  const split = splitFee(paid, best, userShareBps);
  return `<table>
  <tr><td>${esc(p.title)}, list price</td><td class="num">${money(list)}</td></tr>
  ${best.deal ? `<tr><td>${esc(best.advertiser.name)}'s deal: ${esc(best.deal.description)}</td><td class="num">−${money(list - paid)}</td></tr>` : ""}
  <tr><td><b>You pay</b>, in PayPal</td><td class="num"><b>${money(paid)}</b></td></tr>
  <tr><td>${esc(best.advertiser.name)}'s fee for the sale: $${esc(best.reward_per_conversion)}, capped at ${pct(best.max_fee_bps)} of what you paid</td><td class="num">${money(split.fee)}</td></tr>
  <tr><td>&nbsp;&nbsp;Waggle keeps</td><td class="num">${money(split.publisher)}</td></tr>
  <tr><td class="sum">&nbsp;&nbsp;<b>Paid back to you</b>, by PayPal Payouts, right after the purchase</td><td class="num sum">+${money(split.user)}</td></tr>
</table>`;
}

const product = (c: Campaign) => products.find((p) => p.id === c.product_id)!;

export function landingPage(config: Config, campaigns: Campaign[]) {
  const url = `${config.baseUrl}/mcp`;
  const shown = campaigns[0];
  return page(
    "Waggle: Honey for agents",
    `<h1>Honey for agents.<br>Your agent finds the deal, PayPal pays you back.</h1>
<p class="lead">When your AI agent shops for you, sellers compete for its pick. Waggle brings their offers to your agent,
makes it say which one is sponsored, and when you buy through one, the seller pays a fee: ${pct(config.userShareBps)} of it goes
to you, in PayPal cash, right after the purchase.</p>

<h2>Add Waggle to your agent. That's the whole setup.</h2>
<div class="card">
  <div class="snippet"><div class="label">Claude Code <button class="btn quiet" data-copy="cc">Copy</button></div>
    <pre id="cc">claude mcp add --transport http waggle ${esc(url)}</pre></div>
  <div class="snippet"><div class="label">Claude Desktop, ChatGPT and other clients with custom connectors <button class="btn quiet" data-copy="url">Copy</button></div>
    <pre id="url">${esc(url)}</pre></div>
  <div class="snippet"><div class="label">Cursor and JSON configs <button class="btn quiet" data-copy="json">Copy</button></div>
    <pre id="json">{ "mcpServers": { "waggle": { "url": "${esc(url)}" } } }</pre></div>
  <p class="muted" style="margin:14px 0 0">No account, no login. Adding it is your opt-in; removing it is your opt-out.</p>
</div>

<div class="steps">
  <div><b>1 · SHOP IN CONVERSATION</b>“Find me a 2-person tent under $80.” Your agent gets the usual results, plus at most one offer marked sponsored.</div>
  <div><b>2 · YOUR AGENT TELLS YOU</b>If it recommends the sponsored one, it says so in the same breath: who sponsors it, the deal, and what you get back.</div>
  <div><b>3 · APPROVE, GET PAID BACK</b>You approve the payment in PayPal yourself. The moment it goes through, your share of the fee is on its way to the account you paid with.</div>
</div>

<h2>How the money moves</h2>
<div class="card">${example(shown, config.userShareBps)}
<p class="muted" style="margin-top:14px">A purchase without a sponsored offer is just a purchase: no fee, no payback, nothing for Waggle.</p></div>

<h2>What Waggle never does</h2>
<div class="card rules">
  <p><b>Mix offers into results.</b> Organic results are complete and in their own order; the sponsored offer sits outside them, labeled, one at a time.</p>
  <p><b>Earn on a purchase it brought no deal to.</b> The fee exists only when you bought through an offer. No offer, no fee.</p>
  <p><b>Sell the slot to the highest bidder.</b> When several sellers have offers on what you searched, the one that gives <i>you</i> the most (deal plus payback) wins.</p>
  <p><b>Show sellers who you are.</b> Matching happens inside Waggle. A seller learns that a sale came through their campaign, never your searches, your conversation or your PayPal account.</p>
  <p><b>Move money without you.</b> Every payment is approved by you in PayPal. Waggle never holds your credentials.</p>
</div>

<h2>For sellers</h2>
<div class="card">
  <p>A seller registers a campaign: the product, the deal, a fee per sale and a cap on it. This is ${shown ? `${esc(shown.advertiser.name)}'s` : "a"} campaign in the demo:</p>
  ${shown ? `<pre class="json">${esc(JSON.stringify(shown, null, 2))}</pre>` : ""}
  <p class="muted" style="margin-top:12px">The fee is charged only on captured payments and split in one step. In this demo Waggle is also the store, so the offer and the purchase meet in one PayPal order; the README says where that goes next.</p>
</div>
${COPY_SCRIPT}`,
  );
}

/** What the buyer sees when PayPal brings them back: the purchase completed, and the payback on its way. */
export function returnPage(s: Settlement) {
  if (s.state === "unknown") return errorPage(404, "We don't know this order. If you just paid, tell your agent; it can check.");
  if (s.state === "awaiting") {
    return page(
      "Not approved yet",
      `<h1>Not approved yet.</h1>
<p class="lead">PayPal reports this order as ${esc(s.paypalStatus)}. Nothing was charged.</p>
<p><a class="btn" href="${esc(s.order.approve_url)}">Approve in PayPal</a></p>`,
    );
  }
  if (s.state === "failed") {
    return page(
      "Payment not completed",
      `<h1>Payment not completed.</h1>
<p class="lead">PayPal reports the capture as ${esc(s.captureStatus)}. No payback is paid unless it completes. Tell your agent; it can check again.</p>`,
    );
  }
  const { order, offer } = s;
  const title = products.find((p) => p.id === order.product_id)?.title ?? order.product_id;
  const paidWith = order.payer_email ? maskEmail(order.payer_email) : "your PayPal account";
  if (!offer) {
    return page(
      "Paid",
      `<h1>Paid $${esc(order.capture_amount)}.</h1>
<p class="lead">${esc(title)}, paid with ${esc(paidWith)}. No sponsored offer was used, so there is no fee and no payback.</p>
<p class="muted">Back in your agent, say you're done. It will confirm.</p>`,
    );
  }
  const status = order.payout_status?.user ?? order.payout_status?.batch ?? "PENDING";
  const settled = status === "SUCCESS";
  const stuck = !["SUCCESS", "PENDING", "PROCESSING", "UNCLAIMED"].includes(status);
  return page(
    "Paid, payback on its way",
    `<h1>Paid $${esc(order.capture_amount)}.</h1>
<p class="lead">${esc(title)}, paid with ${esc(paidWith)}.</p>
<div class="card">
  <p><span class="big">+${money(order.user_cents!)}</span>
    <span class="chip ${settled ? "ok" : stuck ? "bad" : "honey"}" style="margin-left:10px">${settled ? "Paid back" : stuck ? esc(status) : "On its way"}</span></p>
  <p>Sponsored by ${esc(offer.offer.advertiser.name)}. Their fee for this sale was ${money(order.fee_cents!)}; ${money(order.user_cents!)} of it
  ${settled ? "has been paid" : "is being paid"} by PayPal Payouts to ${esc(paidWith)}, the account you just paid with. Waggle keeps ${money(order.publisher_cents!)}.</p>
  ${status === "UNCLAIMED" ? `<p class="muted">PayPal is holding it until that email has a PayPal account; it will email you.</p>` : ""}
</div>
<p class="muted" style="margin-top:14px">Back in your agent, say you're done. It will confirm the payment and the payback.</p>`,
  );
}

export function cancelPage() {
  return page("Payment cancelled", `<h1>Payment cancelled.</h1><p class="lead">Nothing was charged. Tell your agent you cancelled.</p>`);
}

export function errorPage(status: number, message: string) {
  return page(`Waggle: ${status}`, `<h1>${status}</h1><p class="lead">${esc(message)}</p><p><a class="btn quiet" href="/">Home</a></p>`);
}
