// Minimal PayPal REST client for the sandbox: Orders v2 for the purchase, Payouts v1 for the fee split.

const API = "https://api-m.sandbox.paypal.com";

export class PayPalError extends Error {
  readonly status: number;
  readonly body: any;
  constructor(method: string, path: string, status: number, body: any, debugId: string | null) {
    super(`PayPal ${method} ${path} → ${status}${debugId ? ` (debug_id ${debugId})` : ""}: ${body?.message ?? body?.error_description ?? ""}`);
    this.status = status;
    this.body = body;
  }
}

export class PayPal {
  #clientId: string;
  #secret: string;
  #token?: { value: string; expiresAt: number };

  constructor(clientId: string, secret: string) {
    this.#clientId = clientId;
    this.#secret = secret;
  }

  async #accessToken(): Promise<string> {
    if (this.#token && this.#token.expiresAt > Date.now() + 60_000) return this.#token.value;
    const res = await fetch(`${API}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.#clientId}:${this.#secret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
    });
    const json: any = await res.json().catch(() => null);
    if (!res.ok) throw new PayPalError("POST", "/v1/oauth2/token", res.status, json, res.headers.get("paypal-debug-id"));
    this.#token = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
    return json.access_token;
  }

  async request(method: string, path: string, body?: unknown, requestId?: string): Promise<any> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${await this.#accessToken()}`,
      "Content-Type": "application/json",
    };
    // Makes order creation, capture and payout creation safe to retry.
    if (requestId) headers["PayPal-Request-Id"] = requestId;
    const res = await fetch(`${API}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new PayPalError(method, path, res.status, json, res.headers.get("paypal-debug-id"));
    return json;
  }

  // Orders v2

  createOrder(body: unknown, requestId: string) {
    return this.request("POST", "/v2/checkout/orders", body, requestId);
  }

  getOrder(id: string) {
    return this.request("GET", `/v2/checkout/orders/${id}`);
  }

  captureOrder(id: string) {
    return this.request("POST", `/v2/checkout/orders/${id}/capture`, {}, `${id}:capture`);
  }

  // Payouts v1

  createPayout(body: unknown, requestId: string) {
    return this.request("POST", "/v1/payments/payouts", body, requestId);
  }

  getPayout(batchId: string) {
    return this.request("GET", `/v1/payments/payouts/${batchId}`);
  }
}

/** The calls the app needs; tests substitute a fake. */
export type Payments = Pick<PayPal, "createOrder" | "getOrder" | "captureOrder" | "createPayout" | "getPayout">;
