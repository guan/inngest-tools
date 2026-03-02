import { Inngest } from 'inngest'

const inngest = new Inngest({ id: 'test-app' })

export const approvalWorkflow = inngest.createFunction(
  { id: 'approval-workflow' },
  { event: 'workflow/started' },
  async ({ event, step }) => {
    await step.run('prepare', async () => {
      return { prepared: true }
    })

    const approval = await step.waitForEvent('wait-for-approval', {
      event: 'approval/decision',
      timeout: '48h',
    })

    if (approval) {
      await step.run('execute', async () => {
        // execute approved action
      })
    }
  }
)

export const approvalSender = inngest.createFunction(
  { id: 'approval-sender' },
  { event: 'user/approved' },
  async ({ event, step }) => {
    await step.sendEvent('send-approval', {
      name: 'approval/decision',
      data: { approved: true, userId: event.data.userId },
    })
  }
)
