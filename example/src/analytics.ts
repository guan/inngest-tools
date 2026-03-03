import { inngest } from "./client";

// Pattern: Cron trigger (hourly)
export const hourlyCrawl = inngest.createFunction(
  { id: "hourly-crawl" },
  { cron: "0 * * * *" },
  async ({ step }) => {
    await step.run("fetch-metrics", async () => {
      return { pageViews: 0, sessions: 0 };
    });

    await step.run("store-metrics", async () => {
      return { stored: true };
    });
  }
);

// Pattern: onFailure handler
export const generateReport = inngest.createFunction(
  {
    id: "generate-report",
    onFailure: async ({ step }: { step: any }) => {
      await step.run("notify-slack-failure", async () => {
        return { notified: true };
      });
    },
  },
  { event: "analytics/report.generate" },
  async ({ event, step }: { event: any; step: any }) => {
    await step.run("query-database", async () => {
      return { rows: [] };
    });

    const report = await step.run("build-report", async () => {
      return { reportId: "report-123" };
    });

    await step.run("upload-to-s3", async () => {
      return { url: "https://s3.example.com/report-123.pdf" };
    });

    return report;
  }
);

// Pattern: step.invoke (cross-function invocation)
export const processAnalytics = inngest.createFunction(
  { id: "process-analytics" },
  { event: "analytics/process" },
  async ({ event, step }: { event: any; step: any }) => {
    const prepared = await step.run("prepare-data", async () => {
      return { datasetId: event.data.datasetId };
    });

    const report = await step.invoke("invoke-report-gen", {
      function: generateReport,
      data: { datasetId: prepared.datasetId, requestedBy: event.data.userId },
    });

    return { report };
  }
);
