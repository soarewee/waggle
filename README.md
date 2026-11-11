# Waggle

Honey for agents. Your agent finds the deal, PayPal pays you back.

A honeybee that finds flowers comes back to the hive and does a waggle dance to show the others where they are.
Waggle does the same for a user's AI agent: when the agent shops, Waggle brings back sellers' offers, the agent says
plainly which one is sponsored, and when the user buys through one, the seller's fee is split between Waggle and the
user as a payback through PayPal.

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/) (deadline Nov 12, 2026, noon PT).

> Work in progress.

## What a user does

1. **Add Waggle to their agent.** One line, the same for everyone, no account:

   ```sh
   claude mcp add --transport http waggle https://waggle-agents.fly.dev/mcp
   ```

   Any MCP client with remote servers works (Claude Code, Codex CLI, Claude Desktop, ChatGPT, Cursor). Adding it is the
   opt-in; removing it is the opt-out.
2. **Shop in conversation.** "Find me a 2-person tent under $80." The agent gets the organic results plus at most one
   offer marked sponsored, and when it recommends that one it says so in the same breath: who sponsors it, the deal,
   and what the user gets back.
3. **Approve in PayPal, get paid back.** The user approves the payment in PayPal themselves. PayPal returns them to a
   Waggle page that completes the purchase and pays their share of the seller's fee, by PayPal Payouts, to the account
   they just paid with. Back in the agent, they say they're done and the agent confirms.

That is the whole product. There is no account page and no dashboard: the agent's words are the interface, and the
site has only the front page with the install line and the page PayPal returns the buyer to.

## Why a seller pays

Sellers already pay for customers: per click to search engines, per sale to affiliate networks and coupon sites.
Honey was exactly that business: merchants paid it an affiliate commission on purchases where it had applied a
coupon, and PayPal bought it for $4B. Rakuten shares such commissions with its users as cashback, and Brave pays
the users who opt into its ads 70% of the ad revenue; Waggle gives the user the same 70% of each fee. Waggle is that
model for the agent era, with one change of counterpart: the one choosing is now the user's agent, and an agent is
not persuaded by attention, only by terms. The seller's fee buys a place in front of an agent that is comparing
right now, and it is paid only when the purchase is captured, capped at a share of the amount.

In the demo catalog, Acme Outdoor's campaign on a $79 tent gives 10% off and pays a $5.00 fee per sale, capped at
10% of what was paid. The buyer pays $71.10; of the $5.00 fee, $3.50 (70%) goes back to the buyer and $1.50 to
Waggle. If the agent had picked another tent, nothing would have been paid to anyone.

## What Waggle never does

These are the rules the code enforces, and they are why "Honey for agents" is a good analogy but not a copy.

- **Mix offers into results.** Organic results are complete and in their own order; campaigns can't touch them. The
  sponsored offer sits outside the list, labeled with the advertiser's name, at most one per search.
- **Earn on a purchase it brought no deal to.** A fee exists only when the buyer bought through an offer. An organic
  purchase pays nothing to Waggle, and there is no attribution without an offer.
- **Sell the slot to the highest bidder.** When several sellers have live campaigns on products a search found, the
  one that gives the *user* the most (deal plus payback) wins, not the one paying Waggle the most.
- **Show sellers who the user is.** Matching runs inside Waggle. A seller learns that a sale came through their
  campaign (the order carries only campaign and offer ids), never the query, the conversation or the PayPal account.
- **Move money without the user.** Every payment is approved by the user in PayPal. Waggle holds no user credentials
  and no user accounts at all; it learns who paid from PayPal's capture, and that is where the payback goes.

## How it works

Waggle is a hosted service with one MCP endpoint (Streamable HTTP) for every agent. Three tools:

| Tool | What it does | PayPal API |
|---|---|---|
| `search_products` | Returns organic results and at most one sponsored offer, kept apart and labeled with the advertiser's name | – |
| `buy_product` | Creates a checkout for the product the user agreed to buy and returns the approval link | Orders v2: create |
| `complete_purchase` | Confirms the purchase and reports the payback; completes it if the return page hasn't | Orders v2: capture, Payouts v1 |

When PayPal returns the buyer to `/return`, Waggle captures the payment, reads which account paid from the capture,
splits the fee and sends one Payouts batch with two items: the publisher's share and the buyer's payback. The agent's
`complete_purchase` runs the same code; whichever comes first does the work, and the other reports it. One offer
buys one order, one order is captured once and paid out once, however often either is retried (PayPal request ids
and a unique payout batch id per offer enforce it on PayPal's side too).

The fee is capped at a share of the amount actually captured and split in one step. Money is integer cents inside.

### Campaigns: how sellers get in

A seller registers a campaign: the product, an optional deal, a fee per sale and a cap on it. In this repository
campaigns live in `campaigns.json`, checked on start-up; this is Acme's:

```json
{
  "campaign_id": "cmp_acme_tent_fall",
  "advertiser": { "name": "Acme Outdoor", "id": "adv_acme_outdoor" },
  "product_id": "tent-trailhead-2",
  "deal": { "kind": "discount", "description": "10% off with Waggle", "discount_bps": 1000 },
  "currency": "USD",
  "reward_per_conversion": "5.00",
  "max_fee_bps": 1000,
  "expires_at": "2026-12-31T23:59:59Z"
}
```

Matching: a search
finds products; the live campaigns on those products compete for one slot; the one with the largest user benefit
wins; an offer with a fresh `offer_id` is minted for that search and expires with the campaign.

### What's real here and what's the demo

Real: the matching and disclosure rules, the fee cap and split, the PayPal purchase, capture and payouts, and the
idempotency around them. Demo: the catalog of six products is Waggle's own, so Waggle is also the store. That is a
shortcut so the offer and the purchase meet in one PayPal order, which makes attribution exact (the order carries the
offer id). The sellers are made up and the sandbox merchant account plays them all.

Honey is not a store: it sits in front of every store's checkout. The agent-era equivalent is a layer the agent
consults right before it buys anywhere, and the hard problem there is attribution: proving to the seller that a
purchase came through an offer. That is the next step, not this one.

## Try it (hosted demo)

The demo runs at **[waggle-agents.fly.dev](https://waggle-agents.fly.dev)** on the PayPal sandbox.

1. In any folder, add Waggle to Claude Code and start it:

   ```sh
   claude mcp add --transport http waggle https://waggle-agents.fly.dev/mcp
   claude
   ```

2. Ask:

   > I'm going camping next weekend with a friend. Find me a 2-person tent under $80 using Waggle, compare the
   > options, and buy the one you'd recommend. Ask me before you pay.

   The agent compares the organic tents with the sponsored Acme Outdoor offer and tells you it is sponsored and
   what you get back. Say yes, open the PayPal link, log in with a sandbox *personal* account (every PayPal developer
   account has one under Testing Tools → Sandbox Accounts; the password is under ⋯ → View/Edit account), approve.
3. PayPal brings you back to Waggle: **Paid $71.10**, **+$3.50 paid back** to the account you paid with. Tell the
   agent you're done; it confirms the capture and the payout.
4. In [sandbox.paypal.com](https://www.sandbox.paypal.com) that account shows the $71.10 payment out and the $3.50
   payout in. Every call is also listed under **Event Logs** on developer.paypal.com.

Other things to ask for: noise-cancelling headphones (a sponsored coupon), an ultralight tent (a payback with no
discount), a coffee grinder (no sponsored offer).

## Run it yourself

You need Node 24 or later and a PayPal developer account. Everything runs in the PayPal sandbox, and `localhost`
is fine: PayPal's checkout returns to it.

1. At [developer.paypal.com](https://developer.paypal.com), toggle **Sandbox**, then **Apps & Credentials →
   Create App**, type Merchant. Copy the Client ID and Secret. On the app's page, under **Other features**, tick
   **Payouts**.
2. Under **Testing Tools → Sandbox Accounts** create a *personal* account for the publisher's share, or use the one
   PayPal made for you. Sandbox accounts are PayPal's fake accounts: their `@personal.example.com` address is just an
   identifier, and the password is under **⋯ → View/Edit account**. Any personal sandbox account can be the buyer.
3. Install and run:

   ```sh
   git clone https://github.com/soarewee/waggle.git && cd waggle
   npm install
   cp .env.example .env    # PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_PUBLISHER_EMAIL
   npm start               # http://localhost:3000
   ```

   `npm test` runs the whole flow against a fake PayPal and needs no credentials.

4. Follow *Try it* above with `http://localhost:3000/mcp`. To deploy, set `WAGGLE_BASE_URL` to the public origin
   and keep `data/` on a persistent volume (SQLite).

### Configuration

| Variable | Default | Meaning |
|---|---|---|
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | required | The sandbox app: it receives purchases (the sellers' side in the demo) and sends payouts (Waggle's side) |
| `PAYPAL_PUBLISHER_EMAIL` | required | Sandbox account that receives the publisher's share |
| `WAGGLE_BASE_URL` | `http://localhost:3000` | Public origin; PayPal returns buyers here, and the install line uses it |
| `PORT` | `3000` | |
| `WAGGLE_DB` | `data/waggle.db` | SQLite file |
| `WAGGLE_CAMPAIGNS` | `campaigns.json` | The sellers' campaigns |
| `WAGGLE_USER_SHARE_BPS` | `7000` | The user's share of each fee, in basis points (7000 = 70%) |

### Troubleshooting

- **The agent says the payment isn't approved yet**: open the approval link and approve; then tell the agent again.
  Until approval nothing is captured.
- **Payout not `SUCCESS`**: sandbox payouts can take a few seconds. Reload the return page or ask the agent to check
  again; nothing is ever paid twice. `UNCLAIMED` means the buyer's email has no sandbox account.
- **Service won't start, "campaigns.json: ..."**: a campaign is malformed or names a product the catalog doesn't
  have. The message says which field.

## Repository

- `src/`: the service. `app.ts` (routes: front page, the MCP endpoint, PayPal return), `tools.ts` (the three MCP
  tools), `settle.ts` (capture, payer, fee split, payouts, once), `web.ts` and `style.ts` (the two pages and their stylesheet), `db.ts` (SQLite),
  `paypal.ts` (Orders, Payouts), `offers.ts` and `money.ts` (matching by user benefit, fee cap and split),
  `campaigns.ts` (loads and checks the campaign file), `catalog.ts` (the demo store)
- `campaigns.json`: the sellers' campaigns
- `test/`: the flow end to end against a fake PayPal, including both completion paths racing (`npm test`)
- `spikes/paypal-sandbox.mjs`: the first sandbox spike of the payment and payout flow, without an agent
- `docs/`: the demo video plan

## License

[MIT](LICENSE).

## Before submission

- [x] Deploy and put the URL in *Try it*
- [x] Make the repository public
- [x] Open-source license, visible in the repository's About
- [ ] Demo video under 3 minutes, public on YouTube
