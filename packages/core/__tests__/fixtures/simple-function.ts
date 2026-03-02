import { Inngest } from 'inngest'

const inngest = new Inngest({ id: 'test-app' })

export const processOrder = inngest.createFunction(
  { id: 'process-order' },
  { event: 'order/created' },
  async ({ event, step }) => {
    const user = await step.run('get-user', async () => {
      return { id: event.data.userId, email: 'test@example.com' }
    })
    await step.run('send-email', async () => {
      // send email to user
    })
    return { success: true }
  }
)
