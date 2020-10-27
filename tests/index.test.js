const { serverless } = require('../')

describe('probot-serverless-azurefunctions', () => {
  let spy, handler, context

  beforeEach(() => {
    context = { done: jest.fn(), log: console.log }
    spy = jest.fn()
    handler = serverless(async app => {
      app.auth = () => Promise.resolve({})
      app.on('issues', spy)
    })
  })

  it('responds with the homepage', async () => {
    const event = { method: 'GET', path: '/probot' }
    await handler(context, event)
    expect(context.done).toHaveBeenCalled()
    expect(context.res.body).toMatchSnapshot()
  })

  it('calls the event handler', async () => {
    const event = {
      body: {
        installation: { id: 1 }
      },
      headers: {
        'X-Github-Event': 'issues',
        'x-github-delivery': 123
      }
    }

    await handler(context, event)
    expect(context.done).toHaveBeenCalled()
    expect(spy).toHaveBeenCalled()
  })

  it('responds with a 400 error when body is null', async () => {
    const event = {
      body: null,
      headers: {
        'X-Github-Event': 'issues',
        'x-github-delivery': 123
      }
    }

    await handler(context, event)
    expect(context.done).toHaveBeenCalledWith(null, expect.objectContaining({
      status: 400
    }))
    expect(spy).not.toHaveBeenCalled()
  })
})