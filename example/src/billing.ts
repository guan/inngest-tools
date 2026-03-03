import { inngest } from "./client";

// Pattern: Concurrency control (per-key limit)
export const chargeBilling = inngest.createFunction(
  {
    id: "charge-billing",
    concurrency: { limit: 5, key: "event.data.accountId" },
  },
  { event: "billing/charge" },
  async ({ event, step }) => {
    await step.run("validate-payment", async () => {
      return { valid: true, accountId: event.data.accountId };
    });

    await step.run("process-charge", async () => {
      return { charged: true, amount: event.data.amount };
    });

    await step.run("send-receipt", async () => {
      return { sent: true };
    });
  }
);

// Pattern: Throttle (rate limiting)
export const throttledSync = inngest.createFunction(
  {
    id: "throttled-sync",
    throttle: { limit: 10, period: "1m" },
  },
  { event: "sync/requested" },
  async ({ event, step }) => {
    const data = await step.run("fetch-external-data", async () => {
      return { records: [] };
    });

    await step.run("update-local-db", async () => {
      return { updated: true };
    });
  }
);

// Pattern: CancelOn (event-driven cancellation)
export const cancellableSubscription = inngest.createFunction(
  {
    id: "cancellable-subscription",
    cancelOn: [{ event: "subscription/cancelled", match: "data.subscriptionId" }],
  },
  { event: "subscription/started" },
  async ({ event, step }) => {
    await step.run("activate-subscription", async () => {
      return { activated: true, subscriptionId: event.data.subscriptionId };
    });

    await step.sleep("wait-month", "30d");

    await step.run("charge-monthly", async () => {
      return { charged: true };
    });
  }
);
