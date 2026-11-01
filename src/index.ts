// Entry point of the Waggle service.

import { createApp } from "./app.ts";
import { loadCampaigns } from "./campaigns.ts";
import { loadConfig } from "./config.ts";
import { Db } from "./db.ts";
import { PayPal } from "./paypal.ts";

const config = loadConfig();
const campaigns = loadCampaigns(config.campaignsPath);
const db = new Db(config.dbPath);
const paypal = new PayPal(config.paypal.clientId, config.paypal.clientSecret);

const app = createApp({ db, paypal, config, campaigns });
app.listen(config.port, () =>
  console.log(`waggle: serving ${config.baseUrl} (port ${config.port}, db ${config.dbPath}, ${campaigns.length} campaigns from ${config.campaignsPath})`),
);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    app.close();
    db.close();
    process.exit(0);
  });
}
