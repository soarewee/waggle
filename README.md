# Waggle

Honey for agents. Your agent finds the deal, PayPal pays you back.

A honeybee that finds flowers comes back to the hive and does a waggle dance to show the others where they are.
Waggle does the same for a user's AI agent: when the agent shops for its user, Waggle brings back sponsored deals,
tells the user plainly that they are sponsored, and when the agent buys through one, the advertiser's fee is split
between the publisher and the user as a payback through PayPal.

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/) (deadline Nov 12, 2026, noon PT).

> Work in progress. The repository is private until submission.

## Run it

Needs Node 24+ and a PayPal sandbox app (developer.paypal.com, Merchant app with Payouts enabled) plus three
sandbox personal accounts: a buyer, a publisher and a user.

```sh
npm install
cp .env.example .env   # fill in the app credentials and the publisher and user emails
npm test
```

The MCP server is registered for Claude Code in `.mcp.json`: open Claude Code in this folder, approve the
`waggle` server, and ask it to find you a tent. To use another MCP client, run `npm run mcp` over stdio.

`spikes/paypal-sandbox.mjs` runs the same payment flow without an agent.

## Before submission

- [ ] Open-source license, visible in the repository's About
- [ ] Make the repository public
- [ ] Setup and run instructions a judge can follow with the PayPal sandbox
- [ ] Demo video under 3 minutes, public on YouTube
