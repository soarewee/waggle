# Demo video plan

Required submission: under 3 minutes, public on YouTube, English, the real product working on a real device,
no third-party trademarks or music without permission. It is one of five equally weighted judging criteria
("does the video show it working end to end, and whose problem it solves and why"), and it decides
*Best Demo Delivery*.

## Goal

In 2:45, without cuts that hide anything: whose problem it is, the agent finding a deal, the agent saying it is
sponsored right then, the PayPal payment, and the payback actually arriving. The demo part is a real run; only
waiting time is cut.

No slides. Every title, diagram and rule the video needs is already on the site (waggle-agents.fly.dev): the
headline is the title and end card, *One purchase, one split* is the money-flow diagram, *What Waggle never does*
is the rules. The video shows those sections and zooms in on them in the editor, and it runs down the page
once, in the page's own order: headline, install, then the run in the terminal and PayPal, then back to the
page for the diagram and the rules, explaining what was just seen. The only scroll back up is the ending.

Two apps, each full screen: the browser and the terminal with the agent. Switch with ⌘Tab; the switch is
fast enough to stay in the cut, or the editor trims it. Side by side was considered and set aside: two half
windows make every line of text smaller and the recording harder to drive. PayPal opens in the same browser.

## Script

About 2:40 with ~290 words of narration, in short plain sentences that are easy to say, so the screen gets room to show the run. Read each line as its own
take, so lines can be re-recorded and cut by transcript. "Browser" and "Terminal" say which app is on screen;
⌘Tab between them. The editor's auto-zoom follows clicks; "zoom" means a zoom keyframe set by hand, for the
scenes with no clicks.

| Time | On screen | Narration |
| --- | --- | --- |
| 0:00–0:12 | Browser: waggle-agents.fly.dev at the top, as it is. No zoom yet. | AI agents are starting to shop for us. Sellers already pay to get picked. Today, you get nothing. And you can't even tell when a pick was an ad. |
| 0:12–0:20 | Zoom on the headline. | This is Waggle. Honey for agents. Sellers send their deals to your agent. Your agent tells you which one is sponsored. And part of the seller's fee goes back to you. |
| 0:20–0:34 | Zoom on the install line → Copy. ⌘Tab to the terminal, at the shell prompt in an empty folder: paste → added → `claude` → the agent opens. | Adding it is one line. In the shell. No account. No login. Add it, and you're in. Remove it, and you're out. Now I start my agent. |
| 0:34–1:10 | Terminal: type and send the request. `search_products · waggle` → the results → the offer marked sponsored → the recommendation (zoom on the sentence that names the sponsor). | I ask for a two-person tent under eighty dollars. Waggle gives me the normal results. All of them, same order as always. And one offer on the side, marked sponsored. My agent picks that tent, and it says so, right there: sponsored by Acme Outdoor. Ten percent off. And three fifty back to me. |
| 1:10–1:30 | "Yes, go ahead." → `buy_product` → the PayPal link. ⌘Tab to the browser: the sandbox approval page (already logged in) → approve. | Nothing gets bought without me. The agent makes a PayPal order. I approve it myself. In PayPal. |
| 1:30–2:05 | Browser: PayPal returns to Waggle, "Paid $71.10", zoom on "+$3.50". ⌘Tab to the terminal: "Done." → `complete_purchase` → payout SUCCESS. ⌘Tab to the browser: sandbox.paypal.com activity with the $3.50 coming in. | PayPal sends me back to Waggle. I paid seventy-one ten. Acme's five-dollar fee gets split right away, with PayPal Payouts. Seventy percent, three fifty, back to the account I just paid with. A dollar fifty to Waggle. Nothing to set up. And there it is. In my PayPal activity. |
| 2:05–2:20 | Browser: back to the site, scroll down to *One purchase, one split*. Zoom follows the narration across the diagram: Seller → the arrow to Waggle → the arrow to You → the PayPal bar → the honey arrow back to You. | So here's what just happened. Acme offered a deal and a fee. Waggle brought that deal to my agent, marked sponsored. I paid with PayPal. And PayPal split the fee. Part to Waggle. Most of it back to me. |
| 2:20–2:34 | Scroll on to *What Waggle never does*. Zoom on one rule heading per sentence: *Mix offers into results*, *Sell the slot to the highest bidder*, *Show sellers who you are*, *Move money without you*. | A few rules, built into the code. Offers never mix into results. The best deal for you wins. Not the highest bidder. Sellers never see who you are. And every payment is yours to approve. |
| 2:34–2:42 | Scroll smoothly back to the top. Zoom until the headline fills the frame; hold. | Waggle. Your agent finds the deal. PayPal pays you back. |

The request to type, the same as on the site:

> I'm going camping with a friend next weekend. Find me a 2-person tent under $80 and buy the one you'd recommend.
> Ask me before you pay.

## What the video needs built

- [x] MCP server (shopping tool) returning organic results plus a sponsored deal.
- [x] A purchase tool the agent calls to create the order (step 1 of `spikes/paypal-sandbox.mjs`).
- [x] The hosted service and site: the front page with the install line, and the return page that completes the
  purchase and shows the payback. Those are the only web surfaces the product has, so they are the only ones the
  video shows: no screen exists for the video's sake, and there are no slides.
- [ ] Redeploy after the latest site changes (the neutral palette, the phone diagram, the install hint), so the
  video shows the real URL as it is.

## Tools

Default: record and edit in one app, either [Screen Studio](https://screen.studio/) (one month, $29) or
[Prequel](https://prequel.sh/) (7-day full trial, so start it in the recording week). Both auto-zoom on clicks,
generate captions locally and cut by deleting sentences from the transcript. Final pick at recording time.

- **Titles, diagram, rules:** the site's own sections, with manual zoom keyframes in the editor. The diagram
  scene is one pan across *One purchase, one split*; the rules scene is four zooms, one per heading.
- **Zoom on the run:** the editor's click-follow zoom. Trim the ⌘Tab switches where they drag.
- **Captions:** generated by the recorder, burned in or uploaded to YouTube as SRT.
- Avoid any tool tier that adds a watermark: it is a third-party mark in the video.
- Considered and set aside: Cap (free plan is personal use only, no transcript cuts), Open Screen (archived),
  Descript (no auto zoom, watermark and 720p on free), Macshot (screenshot tool, trim only).

## Before recording

- Sandbox payouts can stay `PENDING` or `UNCLAIMED`. Check the receiving accounts and do one full rehearsal.
- English voiceover and captions. No music, or royalty-free only. A team member's voice over a synthetic one: the
  site lost its template look, the narration shouldn't bring it back.
- 1080p or higher; enlarge terminal and browser fonts.
- Browser and terminal both full screen at the recording size, site at 100% zoom. Only those two apps open, so
  ⌘Tab always lands on the other one.
- Do a dry run of the full flow and watch the sponsored block and the recommendation sentence wrap: they are
  what the video zooms on.
- Start with Waggle removed from the agent (`claude mcp remove waggle`, and once more with `-s user`), so the
  install scene is real. `claude mcp add` is a shell command, not something typed inside Claude: the terminal
  starts at the shell prompt in an empty folder outside the repo, and `claude` is started after the install.
- Log the buyer sandbox account in to sandbox.paypal.com before recording: no password on screen.
- Clear the agent's start banner and keep the browser free of bookmarks, extensions and other tabs: no third-party
  marks beyond the agent's own text.

## Open

- The script assumes Claude Code in a terminal (a real client, banner cleared for the trademark rule) and the
  user approving in a PayPal window (works today; a vaulted account is stronger for *Best Use of Agentic Commerce*
  but too much work before the deadline). Confirm both at the weekly meeting.
- Demo product category (tent for now).
