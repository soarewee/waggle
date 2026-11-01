// The site's one stylesheet, inlined into every page. Warm paper, a serif for headlines, Geist for text and
// Geist Mono for anything the user copies or counts. Fonts come from Google Fonts with system fallbacks; everything
// else is in this file.

export const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&family=Caveat:wght@500;600&display=swap";

// Grain, as on good paper: an SVG noise tile at low alpha over the page colour.
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .07 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export const STYLE = `
  :root {
    --paper:#f7f3eb; --paper-2:#efe9dd; --card:#fffdf9; --ink:#1f1a14; --ink-2:#564d42; --muted:#8c8276;
    --line:#e8e1d4; --line-2:#d8cfbe;
    --honey:#f0b32e; --honey-deep:#8f5f06; --honey-soft:#fcefc9; --honey-line:#efd89a;
    --ok:#1b7a49; --ok-soft:#ddf1e5; --bad:#b4261e; --bad-soft:#f9e2df;
    --sans:"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    --serif:"Instrument Serif", "Iowan Old Style", "Times New Roman", Georgia, serif;
    --mono:"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    --hand:"Caveat", "Bradley Hand", "Segoe Print", cursive;
  }
  * { box-sizing:border-box }
  html { color-scheme:light; background:var(--paper) }
  body { margin:0; background:transparent; color:var(--ink); font:16px/1.6 var(--sans); -webkit-font-smoothing:antialiased;
    text-rendering:optimizeLegibility; font-feature-settings:"ss01", "cv11" }
  body::before { content:""; position:fixed; inset:0; z-index:-1; pointer-events:none; background-image:${NOISE} }
  .wrap { min-height:100vh; display:flex; flex-direction:column } .wrap > footer { margin-top:auto; padding-top:24px }
  .wrap > .return { flex:1 0 auto }
  a { color:inherit }
  p { margin:0 0 14px }
  b, strong { font-weight:600 }
  .wrap { max-width:66rem; margin:0 auto; padding:0 24px 80px }
  .narrow { max-width:42rem; margin-left:auto; margin-right:auto }

  /* top bar */
  .nav { display:flex; align-items:center; gap:12px; padding:22px 0 }
  .brand { display:inline-flex; align-items:center; gap:10px; font-weight:600; font-size:17px; letter-spacing:-.01em; text-decoration:none }
  .nav nav { margin-left:auto; display:flex; gap:26px; font-size:14.5px; color:var(--ink-2) }
  .nav nav a { text-decoration:none } .nav nav a:hover { color:var(--ink) }

  /* hero */
  .hero { text-align:center; padding:64px 0 24px; max-width:48rem; margin:0 auto }
  .badge { display:inline-flex; align-items:center; gap:9px; font-size:13px; font-weight:500; color:var(--ink-2); background:var(--card);
    border:1px solid var(--line-2); border-radius:999px; padding:6px 13px 6px 9px; text-decoration:none }
  .badge i { width:8px; height:8px; border-radius:50%; background:var(--honey); box-shadow:0 0 0 3px var(--honey-soft) }
  h1 { font:400 clamp(44px, 7.2vw, 76px)/1.02 var(--serif); letter-spacing:-.015em; margin:28px 0 20px; text-wrap:balance }
  h1 em, h2 em { font-style:italic; color:var(--honey-deep) }
  .lead { font-size:19px; line-height:1.55; color:var(--ink-2); max-width:38rem; margin:0 auto 34px; text-wrap:pretty }

  .install { display:flex; align-items:center; gap:10px; max-width:46rem; margin:0 auto; text-align:left; background:var(--ink); color:#f6efe2;
    border-radius:14px; padding:8px 8px 8px 18px; box-shadow:0 1px 0 rgba(0,0,0,.25), 0 18px 40px -18px rgba(31,26,20,.5) }
  .install .prompt { color:#9f9484; font:14px var(--mono); user-select:none }
  .install code { flex:1; font:13.5px/1.5 var(--mono); white-space:nowrap; overflow-x:auto; scrollbar-width:none; padding:6px 0 }
  .install code::-webkit-scrollbar { display:none }
  .install .hl { color:var(--honey) }
  .btn { display:inline-flex; align-items:center; gap:8px; background:var(--ink); color:#fff; text-decoration:none; font:500 14px var(--sans);
    padding:11px 18px; border-radius:999px; border:0; cursor:pointer; white-space:nowrap; transition:transform .12s ease, background .12s ease }
  .btn:hover { background:#000 } .btn:active { transform:scale(.98) }
  .btn.light { background:#fff; color:var(--ink); border-radius:9px; padding:9px 14px; font-size:13px } .btn.light:hover { background:var(--honey-soft) }
  .btn.quiet { background:transparent; color:var(--ink); border:1px solid var(--line-2); padding:7px 12px; font-size:13px; border-radius:9px }
  .btn.quiet:hover { background:var(--paper-2) }
  .hint { margin:16px 0 0; font-size:14px; color:var(--muted) } .hint a { color:var(--ink-2) }

  /* handwritten notes, like a margin annotation */
  .note { font:500 22px/1.15 var(--hand); color:var(--honey-deep) }

  /* the conversation: the product's actual interface, drawn as a window */
  .chat { position:relative; max-width:46rem; margin:52px auto 0; background:var(--card); border:1px solid var(--line-2); border-radius:18px; text-align:left;
    box-shadow:0 1px 2px rgba(31,26,20,.05), 0 40px 70px -40px rgba(31,26,20,.45); overflow:visible }
  .chat .bar { display:flex; align-items:center; gap:7px; padding:12px 16px; border-bottom:1px solid var(--line); font-size:12.5px; color:var(--muted) }
  .chat .bar i { width:10px; height:10px; border-radius:50%; background:var(--line-2) }
  .chat .bar span { margin-left:auto; margin-right:auto; transform:translateX(-27px) }
  .chat .body { padding:22px 24px 24px; display:flex; flex-direction:column; gap:18px; font-size:15px; line-height:1.55; border-radius:0 0 18px 18px }
  .msg { max-width:92% } .msg.agent { position:relative } .msg p { margin:0 0 8px } .msg p:last-child { margin-bottom:0 }
  .msg.user { align-self:flex-end; max-width:80%; background:var(--paper-2); border-radius:16px 16px 4px 16px; padding:10px 15px }
  .tool { display:inline-flex; align-items:center; gap:7px; font:12.5px var(--mono); color:var(--muted); background:var(--paper); border:1px solid var(--line);
    border-radius:7px; padding:3px 9px 3px 8px; margin-bottom:9px }
  .tool::before { content:""; width:6px; height:6px; border-radius:50%; background:var(--ok) }
  .results { margin:8px 0 10px; padding:0; list-style:none; display:grid; gap:6px }
  .results li { display:flex; justify-content:space-between; gap:12px; align-items:baseline; padding:8px 12px; border:1px solid var(--line); border-radius:10px; font-size:14px }
  .results li small { color:var(--muted); display:block; font-size:13px }
  .results .price { font:14px var(--mono); color:var(--ink-2); white-space:nowrap }
  .sponsored { margin:0 0 10px; padding:11px 14px 12px; border-radius:12px; background:var(--honey-soft); border:1px solid var(--honey-line); font-size:14px }
  .sponsored .tag { display:flex; justify-content:space-between; gap:10px; font:600 11px/1.6 var(--sans); letter-spacing:.09em; text-transform:uppercase; color:var(--honey-deep); margin-bottom:4px }
  .sponsored .tag span:last-child { letter-spacing:0; text-transform:none; font-weight:500 }
  .sponsored .price { font-family:var(--mono) }
  .chat .btn { font-size:13.5px; padding:9px 15px; margin-top:4px }
  .chat .annot { position:absolute; bottom:-6px; right:-16.5rem; width:14rem; display:flex; gap:8px; align-items:flex-start; color:var(--honey-deep) }
  .chat .annot svg { flex:none; margin-top:-2px } .chat .annot.left { left:-16.5rem; right:auto; text-align:right; bottom:4px }
  .status { display:inline-block; font:12px/1 var(--sans); font-weight:600; padding:5px 10px; border-radius:999px; vertical-align:middle; white-space:nowrap }
  .status.ok { background:var(--ok-soft); color:var(--ok) } .status.honey { background:var(--honey-soft); color:var(--honey-deep) } .status.bad { background:var(--bad-soft); color:var(--bad) }
  .status.mono { font-family:var(--mono); font-weight:500; background:var(--paper-2); color:var(--ink-2) }

  /* sections */
  section { padding:88px 0 0 }
  .eyebrow { font:500 12px/1 var(--sans); letter-spacing:.12em; text-transform:uppercase; color:var(--honey-deep); margin:0 0 14px }
  h2 { font:400 clamp(32px, 4.2vw, 44px)/1.08 var(--serif); letter-spacing:-.01em; margin:0 0 16px; text-wrap:balance }
  h3 { font:600 16px/1.4 var(--sans); margin:0 0 6px }
  .two { display:grid; grid-template-columns:5fr 6fr; gap:48px; align-items:start }
  .two .text p { color:var(--ink-2); font-size:16.5px; text-wrap:pretty }
  .muted { color:var(--muted); font-size:14px }
  .steps { display:grid; grid-template-columns:repeat(3, 1fr); gap:28px; margin-top:40px }
  .step .n { font:italic 400 34px/1 var(--serif); color:var(--honey-deep); margin-bottom:14px }
  .step p { color:var(--ink-2); font-size:15.5px; margin:0 }
  .step q { font-style:italic; color:var(--ink) }

  .card { background:var(--card); border:1px solid var(--line-2); border-radius:16px; padding:22px 24px; box-shadow:0 1px 2px rgba(31,26,20,.04) }
  .receipt { padding:6px 24px 10px }
  table { width:100%; border-collapse:collapse; font-size:15px }
  td { padding:11px 0; border-top:1px solid var(--line); vertical-align:top } tr:first-child td { border-top:0 }
  td.num { text-align:right; font:15px var(--mono); font-variant-numeric:tabular-nums; white-space:nowrap; padding-left:16px }
  td small, .receipt small { display:block; color:var(--muted); font-size:13px; margin-top:1px }
  tr.sum td { border-top:1px solid var(--ink); background:linear-gradient(to bottom, var(--honey-soft), transparent) }
  tr.sum td:first-child { font-weight:600 } tr.sum td.num { font-weight:500; color:var(--honey-deep) }
  .big { font:400 44px/1 var(--serif); letter-spacing:-.01em; font-variant-numeric:tabular-nums }

  .rules { display:grid; grid-template-columns:1fr 1fr; gap:26px 40px; margin-top:36px }
  .rule h3 { display:flex; align-items:center; gap:10px }
  .rule h3::before { content:"×"; flex:none; width:22px; height:22px; border-radius:50%; border:1px solid var(--line-2); background:var(--card);
    color:var(--bad); font:500 15px/20px var(--sans); text-align:center }
  .rule p { color:var(--ink-2); font-size:15.5px; margin:0 }

  pre { margin:0; background:var(--ink); color:#efe7d8; border-radius:14px; padding:16px 18px; font:13px/1.55 var(--mono); overflow-x:auto;
    white-space:pre; box-shadow:0 18px 40px -22px rgba(31,26,20,.5) }
  .snippets { display:grid; gap:12px; margin-top:28px }
  .snippet { display:grid; grid-template-columns:11rem 1fr auto; align-items:center; gap:14px; background:var(--card); border:1px solid var(--line-2); border-radius:12px; padding:10px 10px 10px 16px }
  .snippet .label { font-size:14px; font-weight:500 } .snippet .label small { display:block; font-weight:400; color:var(--muted); font-size:12.5px }
  .snippet code { font:13.5px var(--mono); color:var(--ink-2); overflow-x:auto; white-space:nowrap; scrollbar-width:none } .snippet code::-webkit-scrollbar { display:none }

  footer { margin-top:96px; padding-top:24px; min-height:0; border-top:1px solid var(--line); display:flex; flex-wrap:wrap; gap:8px 24px; font-size:13.5px; color:var(--muted) }
  footer a { color:var(--ink-2) } footer .right { margin-left:auto }

  /* the pages PayPal returns to */
  .return { max-width:34rem; margin:48px auto 0 }
  .return h1 { font-size:clamp(40px, 6vw, 60px); margin:18px 0 12px }
  .return .lead { margin-bottom:28px }
  .payback { display:flex; align-items:center; gap:16px; flex-wrap:wrap; padding:18px 0 16px; border-bottom:1px solid var(--line); margin-bottom:4px }
  .payback .big { color:var(--honey-deep) }
  .next { display:flex; gap:12px; align-items:flex-start; margin-top:24px; padding:14px 16px; border:1px dashed var(--line-2); border-radius:12px; color:var(--ink-2); font-size:14.5px }
  .next .n { font:italic 400 22px/1 var(--serif); color:var(--honey-deep); margin-top:1px }

  @media (max-width: 1180px) { .chat .annot, .chat .annot.left { position:static; width:auto; text-align:left; margin:8px 0 0; display:block } .chat .annot svg { display:none } }
  @media (max-width: 760px) {
    .wrap { padding:0 18px 56px }
    .nav nav { gap:16px; font-size:14px }
    .hero { padding-top:44px }
    .install { padding:10px 10px 10px 14px; align-items:flex-start; flex-wrap:wrap } .install .prompt { display:none }
    .install code { white-space:normal; word-break:break-all; flex-basis:100% } .install .btn { margin-left:auto }
    .two, .steps, .rules { grid-template-columns:1fr; gap:28px }
    .chat .body { padding:16px } .msg.user { max-width:92% } .msg { max-width:100% }
    .snippet { grid-template-columns:1fr auto } .snippet code { grid-column:1 / -1; white-space:normal; word-break:break-all }
    .snippet .btn { grid-row:1; grid-column:2; justify-self:end }
    section { padding-top:64px }
    .big { font-size:38px }
  }
`;
