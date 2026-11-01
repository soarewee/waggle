// Operator configuration. Users never see any of this: they add one URL to their agent. PayPal credentials, the
// publisher's payout account, the fee policy and the campaign file live here, on Waggle's side.

export interface Config {
  port: number;
  /** Public origin of this deployment, no trailing slash. PayPal brings buyers back here after checkout. */
  baseUrl: string;
  /** SQLite file. ":memory:" for tests. */
  dbPath: string;
  /** JSON file with the sellers' campaigns. */
  campaignsPath: string;
  paypal: { clientId: string; clientSecret: string };
  /** The plugin operator that delivers offers and keeps the publisher share. */
  publisher: { id: string; paypalEmail: string };
  /** The user's share of each fee, in basis points. Policy, the same for every user. */
  userShareBps: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const required = ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_PUBLISHER_EMAIL"];
  const missing = required.filter((k) => !env[k]);
  if (missing.length) throw new Error(`missing environment variables: ${missing.join(", ")} (see .env.example)`);
  const port = Number(env.PORT || 3000);
  return {
    port,
    baseUrl: (env.WAGGLE_BASE_URL || `http://localhost:${port}`).replace(/\/$/, ""),
    dbPath: env.WAGGLE_DB || "data/waggle.db",
    campaignsPath: env.WAGGLE_CAMPAIGNS || "campaigns.json",
    paypal: { clientId: env.PAYPAL_CLIENT_ID!, clientSecret: env.PAYPAL_CLIENT_SECRET! },
    publisher: { id: env.WAGGLE_PUBLISHER_ID || "waggle", paypalEmail: env.PAYPAL_PUBLISHER_EMAIL! },
    userShareBps: Number(env.WAGGLE_USER_SHARE_BPS || 3000),
  };
}
