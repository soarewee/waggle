// The site's one stylesheet, inlined into every page. Warm paper, a serif for headlines, Geist for text and
// Geist Mono for anything the user copies or counts. Fonts come from Google Fonts with system fallbacks; everything
// else is in this file. Kept plain on purpose: hairlines over shadows, no ornaments, honey only where money is.

export const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap";

export const STYLE = `
  :root {
    --paper:#f7f3eb; --paper-2:#efe9dd; --card:#fffdf9; --ink:#1f1a14; --ink-2:#564d42; --muted:#8c8276;
    --line:#e8e1d4; --line-2:#d8cfbe;
    --honey:#f0b32e; --honey-deep:#8f5f06; --honey-soft:#fcefc9; --honey-line:#efd89a;
    --ok:#1b7a49; --ok-soft:#ddf1e5; --bad:#b4261e; --bad-soft:#f9e2df;
    --sans:"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    --serif:"Instrument Serif", "Iowan Old Style", "Times New Roman", Georgia, serif;
    --mono:"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  * { box-sizing:border-box }
  html { color-scheme:light; background:var(--paper) }
  body { margin:0; background:var(--paper); color:var(--ink); font:16px/1.6 var(--sans); -webkit-font-smoothing:antialiased;
    text-rendering:optimizeLegibility; font-feature-settings:"ss01", "cv11" }
  .wrap { min-height:100vh; display:flex; flex-direction:column; max-width:66rem; margin:0 auto; padding:0 24px 64px }
  .wrap > footer { margin-top:auto } .wrap > .return { flex:1 0 auto }
  a { color:inherit }
  p { margin:0 0 14px }
  b, strong { font-weight:600 }

  /* top bar */
  .nav { display:flex; align-items:center; gap:12px; padding:22px 0 }
  .brand { display:inline-flex; align-items:center; gap:8px; text-decoration:none }
  .brand span { font:400 27px/1 var(--serif); letter-spacing:-.01em; margin-top:-2px }
  .nav nav { margin-left:auto; display:flex; gap:26px; font-size:14.5px; color:var(--ink-2) }
  .nav nav a { text-decoration:none } .nav nav a:hover { color:var(--ink) }

  /* hero */
  .hero { padding:72px 0 0; max-width:46rem }
  h1 { font:400 clamp(44px, 7vw, 74px)/1.02 var(--serif); letter-spacing:-.018em; margin:0 0 22px; text-wrap:balance }
  .lead { font-size:19px; line-height:1.55; color:var(--ink-2); max-width:37rem; margin:0 0 32px; text-wrap:pretty }

  .install { display:flex; align-items:center; gap:10px; background:var(--ink); color:#f6efe2; border-radius:10px; padding:7px 7px 7px 16px }
  .install .prompt { color:#9f9484; font:14px var(--mono); user-select:none }
  .install code { flex:1; font:13.5px/1.5 var(--mono); white-space:nowrap; overflow-x:auto; scrollbar-width:none; padding:6px 0 }
  .install code::-webkit-scrollbar { display:none }
  .install .hl { color:var(--honey) }
  .btn { display:inline-flex; align-items:center; gap:8px; background:var(--ink); color:#fff; text-decoration:none; font:500 14px var(--sans);
    padding:10px 16px; border-radius:8px; border:0; cursor:pointer; white-space:nowrap; transition:background .12s ease }
  .btn:hover { background:#000 }
  .btn.light { background:#fff; color:var(--ink); border-radius:6px; padding:8px 13px; font-size:13px } .btn.light:hover { background:var(--honey-soft) }
  .btn.quiet { background:transparent; color:var(--ink); border:1px solid var(--line-2); padding:7px 12px; font-size:13px; border-radius:6px }
  .btn.quiet:hover { background:var(--paper-2) }
  .hint { margin:14px 0 0; font-size:14px; color:var(--muted); max-width:40rem } .hint a { color:var(--ink-2) }

  /* the conversation: the product's actual interface, with plain notes in the margin */
  .demo { display:grid; grid-template-columns:minmax(0, 46rem) 1fr; gap:48px; margin-top:64px }
  .chat { background:var(--card); border:1px solid var(--line-2); border-radius:12px; text-align:left }
  .chat .bar { padding:11px 18px; border-bottom:1px solid var(--line); font-size:13px; color:var(--muted) }
  .chat .body { padding:22px 24px 24px; display:flex; flex-direction:column; gap:18px; font-size:15px; line-height:1.55 }
  .msg { max-width:92% } .msg p { margin:0 0 8px } .msg p:last-child { margin-bottom:0 }
  .msg.user { align-self:flex-end; max-width:80%; background:var(--paper-2); border-radius:12px; padding:10px 14px }
  .tool { font:12.5px var(--mono); color:var(--muted); margin-bottom:6px }
  .results { margin:8px 0 10px; padding:0; list-style:none; border:1px solid var(--line); border-radius:8px }
  .results li { display:flex; justify-content:space-between; gap:12px; align-items:baseline; padding:9px 12px; font-size:14px }
  .results li + li { border-top:1px solid var(--line) }
  .results li small { color:var(--muted); display:block; font-size:13px }
  .results .price { font:14px var(--mono); color:var(--ink-2); white-space:nowrap }
  .sponsored { margin:0 0 10px; padding:10px 12px 11px; border-radius:8px; background:var(--honey-soft); border:1px solid var(--honey-line); font-size:14px }
  .sponsored .tag { display:flex; justify-content:space-between; gap:10px; font:600 11px/1.6 var(--sans); letter-spacing:.08em; text-transform:uppercase; color:var(--honey-deep); margin-bottom:3px }
  .sponsored .tag span:last-child { letter-spacing:0; text-transform:none; font-weight:500 }
  .sponsored .price { font-family:var(--mono) }
  .chat .btn { font-size:13.5px; padding:8px 14px; margin-top:4px }
  .notes { list-style:none; margin:0; padding:56px 0 0; display:flex; flex-direction:column; justify-content:space-between; gap:24px; counter-reset:n;
    font-size:14px; color:var(--ink-2) }
  .notes li { counter-increment:n; padding-top:10px; border-top:1px solid var(--line-2) }
  .notes li::before { content:counter(n); display:block; font:12.5px var(--mono); color:var(--muted); margin-bottom:4px }
  .status { display:inline-block; font:12px/1 var(--sans); font-weight:600; padding:5px 9px; border-radius:5px; vertical-align:middle; white-space:nowrap }
  .status.ok { background:var(--ok-soft); color:var(--ok) } .status.honey { background:var(--honey-soft); color:var(--honey-deep) } .status.bad { background:var(--bad-soft); color:var(--bad) }
  .status.mono { font-family:var(--mono); font-weight:500; background:var(--paper-2); color:var(--ink-2) }

  /* sections: a hairline and a headline, nothing above it */
  section { margin-top:104px; padding-top:28px; border-top:1px solid var(--line-2) }
  .eyebrow { font-size:14px; color:var(--muted); margin:0 0 12px }
  h2 { font:400 clamp(32px, 4.2vw, 44px)/1.08 var(--serif); letter-spacing:-.012em; margin:0 0 16px; text-wrap:balance }
  h3 { font:600 16px/1.4 var(--sans); margin:0 0 6px }
  .sub { color:var(--ink-2); font-size:16.5px; max-width:40rem }
  .two { display:grid; grid-template-columns:5fr 6fr; gap:56px; align-items:start }
  .two .text p { color:var(--ink-2); font-size:16.5px; text-wrap:pretty }
  .muted { color:var(--muted); font-size:14px }
  .steps { display:grid; grid-template-columns:repeat(3, 1fr); gap:32px; margin-top:36px }
  .step h3 span { font:500 13px var(--mono); color:var(--muted); margin-right:10px }
  .step p { color:var(--ink-2); font-size:15.5px; margin:0 }
  .step q { color:var(--ink) }

  .card { background:var(--card); border:1px solid var(--line-2); border-radius:12px; padding:22px 24px }
  .receipt { padding:6px 24px 4px }
  table { width:100%; border-collapse:collapse; font-size:15px }
  td { padding:11px 0; border-top:1px solid var(--line); vertical-align:top } tr:first-child td { border-top:0 }
  td.num { text-align:right; font:15px var(--mono); font-variant-numeric:tabular-nums; white-space:nowrap; padding-left:16px }
  td small, .receipt small { display:block; color:var(--muted); font-size:13px; margin-top:1px }
  /* The payback is the receipt's total: an ink rule above it, set bold in the same figures as every other amount. */
  tr.sum td { border-top:1px solid var(--ink); padding-bottom:14px; font-weight:600 } tr.sum small { font-weight:400 }
  tr.sum td.num { color:var(--honey-deep) }
  .big { font:400 44px/1 var(--serif); letter-spacing:-.01em; font-variant-numeric:tabular-nums }

  .rules { display:grid; grid-template-columns:1fr 1fr; gap:0 48px; margin-top:28px }
  .rule { padding:16px 0 20px; border-top:1px solid var(--line) }
  .rule p { color:var(--ink-2); font-size:15.5px; margin:0 }

  pre { margin:0; background:var(--ink); color:#efe7d8; border-radius:10px; padding:16px 18px; font:13px/1.55 var(--mono); overflow-x:auto; white-space:pre }
  .clients { margin-top:28px }
  .tabs { display:flex; gap:24px; border-bottom:1px solid var(--line-2); overflow-x:auto; scrollbar-width:none } .tabs::-webkit-scrollbar { display:none }
  .tabs button { flex:none; background:none; border:0; border-bottom:2px solid transparent; margin-bottom:-1px; padding:0 0 11px; cursor:pointer;
    font:500 15px var(--sans); color:var(--muted) }
  .tabs button:hover { color:var(--ink-2) } .tabs button[aria-selected=true] { color:var(--ink); border-bottom-color:var(--ink) }
  .clients [role=tabpanel] { padding-top:20px }
  .clients [role=tabpanel] p { color:var(--ink-2); font-size:15.5px; margin:0 0 12px }
  .clients [role=tabpanel] p code { font:14px var(--mono); color:var(--ink) }
  .cmd { display:flex; align-items:flex-start; gap:12px; background:var(--card); border:1px solid var(--line-2); border-radius:10px; padding:8px 8px 8px 16px }
  .cmd pre { flex:1; min-width:0; margin:0; padding:6px 0; background:none; color:var(--ink); border-radius:0; font:13.5px/1.6 var(--mono); overflow-x:auto }

  footer { margin-top:104px; padding-top:22px; border-top:1px solid var(--line-2); display:flex; flex-wrap:wrap; gap:8px 24px; font-size:13.5px; color:var(--muted) }
  footer a { color:var(--ink-2) } footer .right { margin-left:auto }

  /* the pages PayPal returns to */
  .return { width:100%; max-width:34rem; margin:48px auto 0 }
  .return h1 { font-size:clamp(40px, 6vw, 60px); margin:0 0 12px }
  .return .lead { margin-bottom:28px }
  .payback { display:flex; align-items:center; gap:16px; flex-wrap:wrap; padding:18px 0 16px; border-bottom:1px solid var(--line); margin-bottom:4px }
  .payback .big { color:var(--honey-deep) }
  .next { margin:24px 0 0; padding-top:14px; border-top:1px solid var(--line); color:var(--ink-2); font-size:14.5px }

  @media (max-width: 1080px) {
    .demo { grid-template-columns:1fr; gap:24px }
    .notes { padding:0; display:grid; grid-template-columns:repeat(3, 1fr); gap:24px }
  }
  @media (max-width: 760px) {
    .wrap { padding:0 16px 48px }
    .brand span { font-size:25px }
    .nav nav { gap:16px; font-size:14px }
    .hero { padding-top:40px }
    .install { padding:10px 10px 10px 14px; align-items:flex-start; flex-wrap:wrap } .install .prompt { display:none }
    .install code { white-space:normal; word-break:break-all; flex-basis:100% } .install .btn { margin-left:auto }
    .two, .steps, .rules { grid-template-columns:1fr }
    .two, .steps { gap:28px } .notes { display:none }
    .chat .body { padding:16px } .msg.user { max-width:92% } .msg { max-width:100% }
    .tabs { gap:18px }
    section { margin-top:72px }
    footer { margin-top:72px }
    .big { font-size:38px }
  }
`;
