import { inngest } from "./client";

// Pattern: Simple sequential steps (step.run chain)
export const processOrder = inngest.createFunction(
  { id: "process-order", name: "Process Order" },
  { event: "order/created" },
  async ({ event, step }) => {
    const validated = await step.run("validate-order", async () => {
      return { valid: true, orderId: (event.data as any).orderId };
    });

    const charged = await step.run("charge-payment", async () => {
      return { success: true, chargeId: `charge_${(event.data as any).orderId}` };
    });

    const fulfilled = await step.run("fulfill-order", async () => {
      return { fulfillmentId: `fulfill_${(event.data as any).orderId}`, status: "shipped" };
    });

    return { validated, charged, fulfilled };
  }
);

// Pattern: Fan-out (step.sendEvent with multiple events)
export const fanOutOrder = inngest.createFunction(
  { id: "fan-out-order", name: "Fan Out Order Batch" },
  { event: "order/batch.created" },
  async ({ event, step }) => {
    const validated = await step.run("validate-batch", async () => {
      const items = (event.data as any).items ?? [];
      return { count: items.length, valid: true };
    });

    await step.sendEvent("fan-out-items", [
      ...((event.data as any).items ?? []).map((item: any) => ({
        name: "order/item.process",
        data: { itemId: item.id, orderId: (event.data as any).orderId },
      })),
    ]);

    return { batched: validated.count };
  }
);

// Pattern: Fan-out child handler (processes individual items from fan-out)
export const processOrderItem = inngest.createFunction(
  { id: "process-order-item", name: "Process Order Item" },
  { event: "order/item.process" },
  async ({ event, step }) => {
    const reserved = await step.run("reserve-inventory", async () => {
      return { reserved: true, itemId: (event.data as any).itemId };
    });

    const shipped = await step.run("ship-item", async () => {
      return { trackingId: `track_${(event.data as any).itemId}`, status: "shipped" };
    });

    return { reserved, shipped };
  }
);
