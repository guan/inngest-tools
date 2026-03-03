import { inngest } from "./client";

// ANTI-PATTERN: no-nested-steps
export const nestedSteps = inngest.createFunction(
  { id: "nested-steps" },
  { event: "test/nested" },
  async ({ step }: { step: any }) => {
    await step.run("outer", async () => {
      // This is invalid: step calls inside step.run callbacks
      await step.run("inner", async () => {
        return { done: true };
      });
    });
  }
);

// ANTI-PATTERN: unique-step-ids
export const duplicateStepIds = inngest.createFunction(
  { id: "duplicate-step-ids" },
  { event: "test/duplicate" },
  async ({ step }: { step: any }) => {
    await step.run("process", async () => {
      return { first: true };
    });

    // Same step ID used twice in the same function
    await step.run("process", async () => {
      return { second: true };
    });
  }
);

// ANTI-PATTERN: no-side-effects-outside-steps
export const sideEffectsOutside = inngest.createFunction(
  { id: "side-effects-outside" },
  { event: "test/side-effects" },
  async ({ event, step }: { event: any; step: any }) => {
    // Direct fetch call outside of step.run — will re-execute on every replay
    const response = await fetch("https://api.example.com/data");
    const data = await response.json();

    await step.run("process-data", async () => {
      return { processed: data };
    });
  }
);

// ANTI-PATTERN: valid-cron
export const invalidCron = inngest.createFunction(
  { id: "invalid-cron" },
  // Intentionally invalid cron (4 fields instead of 5)
  { cron: "* * * *" },
  async ({ step }: { step: any }) => {
    await step.run("do-work", async () => {
      return { done: true };
    });
  }
);

// ANTI-PATTERN: event-has-listener
export const eventNoListener = inngest.createFunction(
  { id: "event-no-listener" },
  { event: "test/event-no-listener" },
  async ({ step }: { step: any }) => {
    // Sends an event that no function listens to
    await step.sendEvent("send-orphan", {
      name: "orphan/event.never.listened",
      data: { reason: "nobody listens to this" },
    });
  }
);

// ANTI-PATTERN: no-orphan-functions
export const orphanFunction = inngest.createFunction(
  { id: "orphan-function" },
  // This event is never sent by any function in the project
  { event: "external/never.sent" },
  async ({ step }: { step: any }) => {
    await step.run("do-work", async () => {
      return { done: true };
    });
  }
);

// ANTI-PATTERN: sleep-duration-warn
export const longSleep = inngest.createFunction(
  { id: "long-sleep" },
  { event: "test/long-sleep" },
  async ({ step }: { step: any }) => {
    // 30-day sleep exceeds the recommended maximum duration
    await step.sleep("wait-forever", "30d");

    await step.run("after-sleep", async () => {
      return { done: true };
    });
  }
);
