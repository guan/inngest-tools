import { inngest } from "./client";

// Pattern: Dynamic event names (template literals)
export const dynamicRouter = inngest.createFunction(
  { id: "dynamic-router" },
  { event: "webhook/received" },
  async ({ event, step }: { event: any; step: any }) => {
    const routed = await step.run("route-event", async () => {
      const entity = event.data.entity as string;
      const action = event.data.action as string;
      return { entity, action };
    });

    await step.sendEvent("send-dynamic-event", {
      name: `app/${routed.entity}.${routed.action}`,
      data: event.data,
    });
  }
);
