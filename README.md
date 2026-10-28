# Waggle

Honey for agents. Your agent finds the deal, PayPal pays you back.

A honeybee that finds flowers comes back to the hive and does a waggle dance to show the others where they are.
Waggle does the same for a user's AI agent: when the agent shops for its user, Waggle brings back sponsored deals,
tells the user plainly that they are sponsored, and when the agent buys through one, the advertiser's fee is split
between the publisher and the user as a payback through PayPal.

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/) (deadline Nov 12, 2026, noon PT).

> Work in progress. The repository is private until submission.

## How it works

Waggle is an MCP server the user installs in their agent. Installing it is the user's consent to receive deals.
It gives the agent three tools:

| Tool | What it does | PayPal API |
|---|---|---|
| `search_products` | Returns organic results and at most one sponsored offer, kept apart and labeled with the advertiser's name | – |
| `buy_product` | Creates a checkout for the product the user agreed to buy and returns the approval link | Orders v2: create |
| `complete_purchase` | Captures the payment, then splits the advertiser's fee between the publisher and the user in one batch | Orders v2: capture, Payouts v1 |

The fee is capped at a share of the amount actually captured. In the demo catalog the Trailhead tent campaign
pays a $5.00 fee per sale, and the user keeps 30% of it ($1.50) as payback.

Offers are matched inside the plugin, so advertisers never see what the user asked. The user's PayPal email
stays on Waggle's side too: the order the advertiser receives carries only the campaign and offer ids.

## Run it

You need Node 24 or later, Claude Code (or another MCP client), and a free PayPal developer account. Allow about
15 minutes for the PayPal setup. Everything runs in the PayPal sandbox, so no real money moves.

### 1. Set up the PayPal sandbox

1. Sign in at [developer.paypal.com](https://developer.paypal.com) and switch to **Sandbox**.
2. **Apps & Credentials → Create App**, type **Merchant**. Copy its **Client ID** and **Secret**.
   The app's sandbox business account plays the advertiser, receiving the purchase, and Waggle, paying the
   fee split.
3. In the app's settings, make sure **Payouts** is checked under Features.
4. **Testing Tools → Sandbox Accounts → Create account**, type **Personal**, three times:
   - **buyer**: you log in as this account to approve the purchase
   - **publisher**: receives the publisher's share of the fee
   - **user**: receives the payback

   Note each account's email. Click **⋯ → View/Edit account** to see the buyer's password.

### 2. Install and configure

```sh
git clone https://github.com/soarewee/waggle.git
cd waggle
npm install
cp .env.example .env
```

Fill in `.env`:

```sh
PAYPAL_CLIENT_ID=...          # from step 1.2
PAYPAL_CLIENT_SECRET=...
PAYPAL_PUBLISHER_EMAIL=...    # the publisher account from step 1.4
PAYPAL_USER_EMAIL=...         # the user account from step 1.4
```

`npm test` checks the server against a fake PayPal and needs no credentials.

### 3. Connect it to your agent

**Claude Code.** The server is already registered in `.mcp.json`. Run `claude` in the repository folder and
approve the `waggle` server when asked.

**Other MCP clients** (Claude Desktop, Cursor, …). Add a stdio server with absolute paths:

```json
{
  "mcpServers": {
    "waggle": {
      "command": "node",
      "args": ["--env-file=/path/to/waggle/.env", "/path/to/waggle/src/index.ts"]
    }
  }
}
```

### 4. Try it

Ask your agent:

> I'm going camping next weekend with a friend. Find me a 2-person tent under $80 using Waggle, compare the
> options, and buy the one you'd recommend. Ask me before you pay.

1. The agent compares the organic results with the sponsored Acme Outdoor offer, and tells you which one is
   sponsored and what you get from it.
2. Say yes. The agent returns a PayPal sandbox link. Open it, log in as the **buyer**, and approve.
   PayPal sends you back to a local page at `http://localhost:8787` that says the payment was approved.
3. Tell the agent you approved. It captures the payment and pays out the fee split, then reports the capture id
   and the payout batch id.

Other things to ask for: noise-cancelling headphones (a sponsored coupon), wireless earbuds, a coffee grinder
(no sponsored offer).

### 5. Check it in PayPal

Log in at [sandbox.paypal.com](https://www.sandbox.paypal.com) to see the money move:

- **buyer**: the purchase under Activity
- **user**: the payback (for the tent, $1.50)
- **publisher**: the publisher share ($3.50)
- **business account** (the app's): the payment received and the payout batch sent

The API calls and their responses are also listed under **Event Logs** on developer.paypal.com.

## Configuration

Optional settings in `.env`:

| Variable | Default | Meaning |
|---|---|---|
| `WAGGLE_CATEGORIES` | every category | Only accept deals in these categories, e.g. `outdoor,electronics` |
| `WAGGLE_BLOCKED_CATEGORIES` | none | Never accept deals in these categories |
| `WAGGLE_USER_SHARE_BPS` | `3000` | The user's share of each fee, in basis points (3000 = 30%) |
| `WAGGLE_RETURN_PORT` | `8787` | Port of the local page PayPal returns the buyer to |

## Troubleshooting

- **`missing environment variables`**: `.env` is missing or incomplete, or the MCP client wasn't started from the
  repository folder. Use absolute paths as shown above.
- **`return page not served on port 8787`**: something else uses the port. Set `WAGGLE_RETURN_PORT`. The
  purchase still works; only the page after approval is missing.
- **`Unknown order_id`**: orders are kept in memory, so restarting the agent forgets them. Start the purchase again.
- **Payout not `SUCCESS`**: sandbox payouts can take a few seconds. Ask the agent to check again; calling
  `complete_purchase` twice never pays twice.

## Repository

- `src/`: the MCP server (`server.ts`), the PayPal client (`paypal.ts`), offers and fee split (`offers.ts`,
  `money.ts`), and the demo catalog (`catalog.ts`)
- `test/`: tests against a fake PayPal (`npm test`)
- `spikes/paypal-sandbox.mjs`: the same payment flow without an agent:
  `node --env-file=.env spikes/paypal-sandbox.mjs`

## Before submission

- [ ] Open-source license, visible in the repository's About
- [ ] Make the repository public
- [x] Setup and run instructions a judge can follow with the PayPal sandbox
- [ ] Demo video under 3 minutes, public on YouTube
