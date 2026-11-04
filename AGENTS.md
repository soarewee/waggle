# AGENTS.md

Instructions for any coding agent working in this repo (Claude Code reads it through `CLAUDE.md`).

Waggle is "Honey for agents": when a user's AI agent shops for them, Waggle brings back sponsored deals, the
agent tells the user they are sponsored, and when the agent buys through one, the advertiser's fee is split
between the publisher and the user (payback). It is the PayPal AI Hackathon entry of the Agentic AdFi team,
and it follows AdFi's form B (a user-installed plugin, e.g. an MCP server, that surfaces deals).

## The hackathon

[PayPal AI Hackathon](https://paypalaihackathon.devpost.com/), deadline **Nov 13, 2026 05:00 KST** (Nov 12 noon PT).
Full notes (Korean): `~/Developer/Agentic-AdFi/docs/events/paypal-ai.md`. What drives the build:

- PayPal **and** AI must both be used meaningfully. Stage 1 is pass/fail on whether PayPal APIs are integrated
  for real, so PayPal should carry the money: the purchase, the payouts to publisher and user, or both.
- It must be a working prototype a judge can run from the README with the PayPal sandbox (or a hosted demo).
- Judged equally on technical implementation, design (a complete product experience), impact, innovation and
  the video. Target prize: *Best Use of Agentic Commerce*.
- Everything is in English: README, run instructions, UI, video.
- At submission the repo must be public with an open-source license visible in the About. It is public, under
  the MIT license (`LICENSE`).

## Product rules (from AdFi, keep them)

- Consent is mandatory: deals go only to agents whose user opted in (installing the plugin counts).
- Every deal carries `sponsored: true`, a disclosure and the advertiser name, where the model reads it (not
  only in headers or metadata). When the agent recommends or picks something because of a deal, it tells the
  user right then that it is sponsored.
- The fee is capped at a share of the purchase amount, and it is split in one step: publisher share plus the
  user's payback share.
- Share user intent at category/condition level only; never send personal data or conversation content to
  advertisers.
- "Honey" is PayPal's trademark. Use "Honey for agents" only as a tagline or analogy, never as the product name.

## Reference: Agentic AdFi

The parent project is `~/Developer/Agentic-AdFi` (private repo, Korean docs). Read before designing:

- `docs/product/proposal.md`: the three-party model and forms A/B/C (Waggle is B).
- `docs/product/sponsored-offer-schema.md`: consent, offer, attribution and payout format. Reuse the offer
  shape so Waggle stays compatible with AdFi.
- `packages/sdk/`, `contracts/`: AdFi's x402 + on-chain settlement. Read it freely, but don't copy code into
  this repo until the team decides whether AdFi code goes public under Waggle's license.

## Working here

- Never commit `.env`, API keys or sandbox credentials. This repo will be public; keep secrets out of history.
- Commit straight to `main`. `git pull --rebase` before pushing; never force-push `main`.
  Commit as the human; never change git author settings.
- One commit per intent, not per edit: follow-up edits from the same sitting go into that commit (amend or
  squash local commits before pushing, never after). The team's weekly report is built from commits.
- Commit messages:

  ```
  type: subject            # English, ≤72 chars, no period (feat, fix, refactor, docs, test, chore)

  Why: what was missing or why this change (required, Korean or English)
  Notes: alternatives considered, taste calls (optional)
  Open: a question for the weekly meeting (optional, one per line)

  Co-Authored-By: ...
  ```

  Write `Why:`/`Notes:` from what the person told you, in their words where possible. If you don't know why
  they wanted a change, ask in one line before committing.
- Talk with the person in Korean; write code, docs and UI in English.
