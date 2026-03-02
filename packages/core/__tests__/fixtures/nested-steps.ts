import { Inngest } from 'inngest'

const inngest = new Inngest({ id: 'test-app' })

export const badFunction = inngest.createFunction(
  { id: 'bad-function' },
  { event: 'test/bad' },
  async ({ step }) => {
    await step.run('outer', async () => {
      await step.run('inner', async () => {
        // This is a nested step - should be detected
      })
    })
  }
)

export const goodFunction = inngest.createFunction(
  { id: 'good-function' },
  { event: 'test/good' },
  async ({ step }) => {
    const data = await step.run('first', async () => {
      return { value: 1 }
    })
    await step.run('second', async () => {
      // This is NOT nested - uses result from first step
      return data.value + 1
    })
  }
)
