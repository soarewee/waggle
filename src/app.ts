// HTTP front of the Waggle service: the front page, the one MCP endpoint every agent uses, and the pages PayPal
// returns the buyer to. Plain node:http; the MCP transport runs stateless per request.

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { PayPalError } from "./paypal.ts";
import { createSettle, type SettleDeps } from "./settle.ts";
import { createMcpServer } from "./tools.ts";
import { cancelPage, errorPage, landingPage, returnPage } from "./web.ts";

export function createApp(deps: SettleDeps) {
  const { config, campaigns } = deps;
  const settle = createSettle(deps);

  const html = (res: ServerResponse, body: string, status = 200) => {
    res.writeHead(status, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(body);
  };
  const json = (res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) => {
    res.writeHead(status, { "Content-Type": "application/json", ...headers });
    res.end(JSON.stringify(body));
  };

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", config.baseUrl);
    const method = req.method ?? "GET";
    const path = url.pathname;

    // The MCP endpoint. One address for everyone: adding it to an agent is the opt-in, nothing identifies the user.
    if (path === "/mcp") {
      // Stateless: every call is one POST. A GET would open a server-to-client stream nobody writes to,
      // held open per connecting client; tell clients there is none, as the SDK's stateless server does.
      if (method !== "POST") return json(res, 405, { jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null }, { Allow: "POST" });
      const server = createMcpServer({ ...deps, settle });
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on("close", () => {
        transport.close();
        server.close();
      });
      await server.connect(transport);
      return transport.handleRequest(req, res);
    }
    if (path.startsWith("/mcp/")) return json(res, 404, { error: `Waggle has one address for every agent: ${config.baseUrl}/mcp` });

    if (path === "/" && method === "GET") return html(res, landingPage(config, campaigns));

    // PayPal sends the buyer here after approving, with ?token=<order id>. Completing the purchase is this page's job.
    if (path === "/return" && method === "GET") {
      const s = await settle(url.searchParams.get("token") ?? "");
      return html(res, returnPage(s), s.state === "unknown" ? 404 : 200);
    }
    if (path === "/cancel" && method === "GET") return html(res, cancelPage());

    if (path === "/health") return json(res, 200, { ok: true });
    return html(res, errorPage(404, "There's nothing here."), 404);
  }

  return createServer((req, res) => {
    handle(req, res).catch((err) => {
      console.error(`waggle: ${req.method} ${req.url} failed:`, err);
      if (res.headersSent) return res.end();
      const message = err instanceof PayPalError ? `PayPal said: ${err.message}` : "Something went wrong on our side.";
      html(res, errorPage(500, message), 500);
    });
  });
}
