import { Inngest } from 'inngest'

const inngest = new Inngest({ id: 'test-app' })

export const multiStep = inngest.createFunction(
  { id: 'multi-step-fn' },
  { event: 'test/multi' },
  async ({ event, step }) => {
    const data = await step.run('fetch-data', async () => {
      return { value: 42 }
    })
    await step.sleep('wait-a-bit', '1h')
    await step.sleepUntil('wait-until', '2025-01-01T00:00:00Z')
    const approval = await step.waitForEvent('wait-approval', {
      event: 'approval/received',
      timeout: '24h',
    })
    await step.sendEvent('notify', {
      name: 'notification/sent',
      data: { value: data.value },
    })
    await step.invoke('call-other', {
      function: 'other-function',
      data: {},
    })
  }
)
