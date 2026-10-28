import type { Consent } from "./offers.ts";

export interface Config {
  paypal: { clientId: string; clientSecret: string };
  /** The plugin operator that delivers offers and keeps the publisher share. */
  publisher: { id: string; paypalEmail: string };
  /** The user who installed the plugin: installing it is the consent (AdFi form B). */
  user: { paypalEmail: string; consent: Consent };
  /** The user's share of each fee, in basis points. */
  userShareBps: number;
  returnPort: number;
}

const list = (value?: string) => (value ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const required = ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_PUBLISHER_EMAIL", "PAYPAL_USER_EMAIL"];
  const missing = required.filter((k) => !env[k]);
  if (missing.length) throw new Error(`missing environment variables: ${missing.join(", ")} (see .env.example)`);
  return {
    paypal: { clientId: env.PAYPAL_CLIENT_ID!, clientSecret: env.PAYPAL_CLIENT_SECRET! },
    publisher: { id: env.WAGGLE_PUBLISHER_ID || "waggle", paypalEmail: env.PAYPAL_PUBLISHER_EMAIL! },
    user: {
      paypalEmail: env.PAYPAL_USER_EMAIL!,
      consent: { categories: list(env.WAGGLE_CATEGORIES), blockedCategories: list(env.WAGGLE_BLOCKED_CATEGORIES) },
    },
    userShareBps: Number(env.WAGGLE_USER_SHARE_BPS || 3000),
    returnPort: Number(env.WAGGLE_RETURN_PORT || 8787),
  };
}
