import { Inngest } from 'inngest'

const inngest = new Inngest({ id: 'test-app' })

export const dailyCleanup = inngest.createFunction(
  { id: 'daily-cleanup' },
  { cron: '0 3 * * *' },
  async ({ step }) => {
    await step.run('cleanup-old-records', async () => {
      // cleanup logic
    })
    await step.run('send-report', async () => {
      // send report
    })
  }
)
