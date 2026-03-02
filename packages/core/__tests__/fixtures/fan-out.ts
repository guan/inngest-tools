import { Inngest } from 'inngest'

const inngest = new Inngest({ id: 'test-app' })

export const fanOutOrchestrator = inngest.createFunction(
  { id: 'orchestrator' },
  { event: 'order/created' },
  async ({ event, step }) => {
    await step.run('validate', async () => ({ valid: true }))
    await step.sendEvent('send-to-billing', {
      name: 'order/billing',
      data: event.data,
    })
    await step.sendEvent('send-to-shipping', {
      name: 'order/shipping',
      data: event.data,
    })
    await step.sendEvent('send-to-notification', {
      name: 'order/notification',
      data: event.data,
    })
  }
)

export const billingHandler = inngest.createFunction(
  { id: 'billing-handler' },
  { event: 'order/billing' },
  async ({ event, step }) => {
    await step.run('process-billing', async () => {
      // process billing
    })
  }
)

export const shippingHandler = inngest.createFunction(
  { id: 'shipping-handler' },
  { event: 'order/shipping' },
  async ({ event, step }) => {
    await step.run('process-shipping', async () => {
      // process shipping
    })
  }
)
