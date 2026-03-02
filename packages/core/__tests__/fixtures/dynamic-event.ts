import { Inngest } from 'inngest'

const inngest = new Inngest({ id: 'test-app' })

const EVENT_PREFIX = 'dynamic'

export const dynamicFn = inngest.createFunction(
  { id: 'dynamic-fn' },
  { event: 'test/dynamic' },
  async ({ event, step }) => {
    // Dynamic template literal
    await step.sendEvent('send-dynamic', {
      name: `${EVENT_PREFIX}/processed`,
      data: {},
    })

    // Variable reference (fully dynamic)
    const eventName = event.data.targetEvent
    await inngest.send({ name: eventName, data: {} })
  }
)
