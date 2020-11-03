const { serverless } = require('../')
const crypto = require('crypto')

const getEvent = (body = {installation: { id: 1 }}) => {

    const secret = 'iamasecret'

    process.env.WEBHOOK_SECRET = secret
    
    // Create Signature
    let hmac = crypto.createHmac('sha1', secret);
    hmac.update(JSON.stringify(body));
    const hash = hmac.digest('hex');

    return {
      body,
      headers: {
        'X-Github-Event': 'issues',
        'x-Github-Delivery': 123,
        'X-Hub-Signature': `sha1=${hash}`
      }
    }
}

describe('probot-serverless-azurefunctions', () => {
  let spy, handler, context

  beforeEach(() => {
    context = { done: jest.fn(), log: console.log }
    context.log = jest.fn()
    process.env = { }
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
    expect(context.log).toMatchSnapshot()
  })

  it('calls the event handler', async () => {
    const event = getEvent()

    await handler(context, event)
    expect(context.done).toHaveBeenCalled()
    expect(spy).toHaveBeenCalled()
  })

  it('responds with a 400 error when body is null', async () => {
    const event = getEvent(null)

    await handler(context, event)
    expect(context.res).toEqual(expect.objectContaining({status: 400}))
    expect(context.done).toHaveBeenCalled()
    expect(spy).not.toHaveBeenCalled()
  })

  it('responds with 400 when payload has been changed', async () => {
    const secret = "iamasecret"

    const body = {
      installation: { id: 1 }
    }

    // Create Signature
    let hmac = crypto.createHmac('sha1', secret);
    hmac.update(JSON.stringify(body));
    const hash = hmac.digest('hex');

    const event = {
      body: {
        installation: { id: 123123 } // different to what 'github' would have sent
      },
      headers: {
        'X-Github-Event': 'issues',
        'x-Github-Delivery': 123,
        'X-Hub-Signature': `sha1=${hash}`
      }
    }

    process.env.WEBHOOK_SECRET = secret

    await handler(context, event)
    expect(context.res).toEqual(expect.objectContaining({status: 400}))
    expect(context.done).toHaveBeenCalled()
    expect(spy).not.toHaveBeenCalled()
    expect(context.log).toMatchSnapshot()
  })
})