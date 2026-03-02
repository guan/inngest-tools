import { Inngest } from 'inngest'

const inngest = new Inngest({ id: 'test-app' })

export const configuredFunction = inngest.createFunction(
  {
    id: 'configured-fn',
    concurrency: {
      limit: 5,
      key: 'event.data.userId',
      scope: 'fn',
    },
    throttle: {
      limit: 10,
      period: '1m',
      key: 'event.data.teamId',
    },
    retries: 3,
    rateLimit: {
      limit: 100,
      period: '1h',
      key: 'event.data.apiKey',
    },
    debounce: {
      period: '5s',
      key: 'event.data.userId',
    },
    batchEvents: {
      maxSize: 50,
      timeout: '10s',
    },
    idempotency: 'event.data.orderId',
    cancelOn: [
      {
        event: 'order/cancelled',
        match: 'data.orderId',
        timeout: '24h',
      },
    ],
    priority: {
      run: 'event.data.priority',
    },
  },
  { event: 'order/process' },
  async ({ event, step }) => {
    await step.run('process', async () => {
      // processing
    })
  }
)
