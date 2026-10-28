// Entry point: Waggle over stdio, plus the small page PayPal sends the buyer back to after approving.
// stdout belongs to the MCP protocol, so everything else logs to stderr.

import { createServer as createHttpServer } from "node:http";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.ts";
import { PayPal } from "./paypal.ts";
import { createServer } from "./server.ts";

const config = loadConfig();

createHttpServer((req, res) => {
  const cancelled = req.url?.startsWith("/cancel");
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!doctype html><meta name="viewport" content="width=device-width"><title>Waggle</title>
<body style="font:16px system-ui;max-width:32rem;margin:15vh auto;padding:0 16px">
<h1>${cancelled ? "Payment cancelled" : "Payment approved"}</h1>
<p>${cancelled ? "Nothing was charged." : "You can close this tab and tell your agent you approved it."}</p>`);
})
  .on("error", (err) => console.error(`waggle: return page not served on port ${config.returnPort}: ${err.message}`))
  .listen(config.returnPort);

const server = createServer(config, new PayPal(config.paypal.clientId, config.paypal.clientSecret));
await server.connect(new StdioServerTransport());
console.error("waggle: MCP server running on stdio");

// The return page keeps the event loop alive, so exit with the client instead of lingering on the port.
process.stdin.on("close", () => process.exit(0));
