import { inngest } from "./client";

// Pattern: Drip campaign (step.run + step.sleep chain)
export const sendWelcomeSequence = inngest.createFunction(
  { id: "send-welcome-sequence", name: "Send Welcome Sequence" },
  { event: "user/signup" },
  async ({ event, step }) => {
    await step.run("send-welcome-email", async () => {
      return { sent: true, to: (event.data as any).email, template: "welcome" };
    });

    await step.sleep("wait-3-days", "3d");

    await step.run("send-tips-email", async () => {
      return { sent: true, to: (event.data as any).email, template: "tips" };
    });

    await step.sleep("wait-7-days", "7d");

    await step.run("send-promo-email", async () => {
      return { sent: true, to: (event.data as any).email, template: "promo" };
    });
  }
);

// Pattern: Human-in-the-loop (step.waitForEvent with match)
export const approvalWorkflow = inngest.createFunction(
  { id: "approval-workflow", name: "Approval Workflow" },
  { event: "approval/requested" },
  async ({ event, step }) => {
    await step.run("send-slack-notification", async () => {
      return {
        notified: true,
        requestId: (event.data as any).requestId,
        channel: "#approvals",
      };
    });

    const approval = await step.waitForEvent("wait-for-approval", {
      event: "approval/response",
      timeout: "48h",
      match: "data.requestId",
    });

    await step.run("process-approval-result", async () => {
      if (approval === null) {
        return { result: "timeout", requestId: (event.data as any).requestId };
      }
      const approved = (approval.data as any).approved;
      return {
        result: approved ? "approved" : "rejected",
        requestId: (event.data as any).requestId,
        decidedBy: (approval.data as any).decidedBy,
      };
    });
  }
);

// Pattern: Cron trigger (scheduled function)
export const dailyDigest = inngest.createFunction(
  { id: "daily-digest", name: "Daily Digest" },
  { cron: "0 9 * * *" },
  async ({ step }) => {
    const data = await step.run("fetch-daily-data", async () => {
      return { records: 42, date: new Date().toISOString().slice(0, 10) };
    });

    const digest = await step.run("compile-digest", async () => {
      return { subject: `Daily digest: ${data.records} items`, body: "..." };
    });

    await step.run("send-digest-email", async () => {
      return { sent: true, subject: digest.subject };
    });
  }
);

// Pattern: Multiple triggers (multiple events → single handler)
export const multiTriggerNotify = inngest.createFunction(
  { id: "multi-trigger-notify", name: "Multi-Trigger Notification" },
  [{ event: "order/shipped" }, { event: "order/delivered" }],
  async ({ event, step }) => {
    await step.run("send-notification", async () => {
      return {
        sent: true,
        trigger: event.name,
        orderId: (event.data as any).orderId,
      };
    });
  }
);
