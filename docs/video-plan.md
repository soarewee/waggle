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
is the rules. The video shows those sections and zooms in on them in the editor.

One screen layout for the whole video: the browser on the left, about 60% of the width, the terminal with the
agent on the right. No app switching, no cuts between windows. The run goes back and forth across the two panes
(Yes in the terminal, approve in PayPal on the left, the payback on the left, Done on the right), and the viewer
sees the money move in one frame. PayPal opens in that same browser pane.

## Script

About 2:40 with ~220 words of narration, so the screen gets room to show the run. Read each line as its own
take, so lines can be re-recorded and cut by transcript. "Left" is the browser pane, "right" the terminal.
The editor's auto-zoom follows clicks into whichever pane is active; "zoom" means a zoom keyframe set by hand,
for the scenes with no clicks.

| Time | On screen | Narration |
| --- | --- | --- |
| 0:00–0:12 | Both panes up. Left: waggle-agents.fly.dev at the top. Right: the agent open, banner cleared, the camping request typed in, not sent. | AI agents are starting to shop for us. Sellers already pay to win customers like that. Today none of that money reaches you, and you can't tell when a pick was paid for. |
| 0:12–0:18 | Zoom left, on the headline. | This is Waggle: Honey for agents. |
| 0:18–0:32 | Left: scroll to *One purchase, one split*. Zoom follows the narration across the diagram: Seller → the arrow to Waggle → the arrow to You → the PayPal bar → the honey arrow back to You. | A seller offers a deal and a fee. Waggle brings that offer to your agent, marked sponsored. You approve the payment in PayPal, and the seller's fee is split: part to Waggle, part back to you. |
| 0:32–0:44 | Left: scroll back to the top, Copy on the install line. Right: paste → added. One shot, no cut. | Adding it is one line. No account, no login. Adding Waggle is the opt-in; removing it is the opt-out. |
| 0:44–1:20 | Right: send the request. `search_products · waggle` → the results → the offer marked sponsored → the recommendation (zoom on the sentence that names the sponsor). | I ask for a two-person tent under eighty dollars. Waggle returns the normal results, complete and in their own order, and one offer kept apart, marked sponsored. When my agent recommends that tent, it says so in the same sentence: sponsored by Acme Outdoor, ten percent off, and three fifty back to me. |
| 1:20–1:40 | Right: "Yes, go ahead." → `buy_product` → the PayPal link. Left: the sandbox approval page (already logged in) → approve. | Nothing is bought without me. The agent creates a PayPal order, and I approve it myself, in PayPal. |
| 1:40–2:15 | Left: PayPal returns to Waggle, "Paid $71.10", zoom on "+$3.50". Right: "Done." → `complete_purchase` → payout SUCCESS. Left: sandbox.paypal.com activity with the $3.50 coming in. | PayPal brings me back to Waggle. I paid seventy-one ten. Acme's five-dollar fee is split in one step with PayPal Payouts: seventy percent, three fifty, back to the account I just paid with, and a dollar fifty to Waggle. Nothing to set up. And here it is, in my PayPal activity. |
| 2:15–2:32 | Left: back to the site, scroll to *What Waggle never does*. Zoom on one rule heading per sentence: *Mix offers into results*, *Sell the slot to the highest bidder*, *Show sellers who you are*, *Move money without you*. | A few rules are built into the code. Offers never mix into results. The best deal for you wins the slot, not the highest bidder. Sellers never see who you are. And every payment is yours to approve. |
| 2:32–2:40 | Left: scroll to the top. Zoom until the headline fills the frame; hold. | Waggle. Your agent finds the deal. PayPal pays you back. |

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

- **Titles, diagram, rules:** the site's own sections in the left pane, with manual zoom keyframes in the editor.
  The diagram scene is one pan across *One purchase, one split*; the rules scene is four zooms, one per heading.
- **Zoom on the run:** the editor's click-follow zoom, which lands on the pane that was clicked. Check that it
  does not jump to the other pane mid-sentence; pin a keyframe where it does.
- **Captions:** generated by the recorder, burned in or uploaded to YouTube as SRT.
- Avoid any tool tier that adds a watermark: it is a third-party mark in the video.
- Considered and set aside: Cap (free plan is personal use only, no transcript cuts), Open Screen (archived),
  Descript (no auto zoom, watermark and 720p on free), Macshot (screenshot tool, trim only).

## Before recording

- Sandbox payouts can stay `PENDING` or `UNCLAIMED`. Check the receiving accounts and do one full rehearsal.
- English voiceover and captions. No music, or royalty-free only. A team member's voice over a synthetic one: the
  site lost its template look, the narration shouldn't bring it back.
- 1080p or higher; enlarge terminal and browser fonts.
- Window layout, 1920 wide: browser left at about 1150px, terminal right at about 770px, both full height, no gap
  or a few pixels at most. The site keeps its desktop layout above 1080px wide (the chat's side notes stack
  below that, and the money-flow diagram switches to the phone layout under 900px). The terminal at 770px fits
  80 columns at 16px mono, which is enough for the agent's output. Site at 100% zoom.
- Do a dry run of the full flow in that layout and watch the sponsored block and the recommendation sentence
  wrap: they are what the video zooms on.
- Start with Waggle removed from the agent (`claude mcp remove waggle`), so the install scene is real.
- Log the buyer sandbox account in to sandbox.paypal.com before recording: no password on screen.
- Clear the agent's start banner and keep the browser free of bookmarks, extensions and other tabs: no third-party
  marks beyond the agent's own text.

## Open

- The script assumes Claude Code in a terminal (a real client, banner cleared for the trademark rule) and the
  user approving in a PayPal window (works today; a vaulted account is stronger for *Best Use of Agentic Commerce*
  but too much work before the deadline). Confirm both at the weekly meeting.
- Demo product category (tent for now).
