const { serverless } = require('../')
const crypto = require('crypto')

describe('probot-serverless-azurefunctions', () => {
  let spy, handler, context

  beforeEach(() => {
    context = { done: jest.fn(), log: console.log }
    process.env = { }
    spy = jest.fn()
    handler = serverless(async app => {
      app.auth = () => Promise.resolve({})
      app.on('issues', spy)
    })
  })


  it('calls the event handler', async () => {
    const event = {
      body: {
        installation: { id: 1 }
      },
      headers: {
        'X-Github-Event': 'issues',
        'x-Github-Delivery': 123
      }
    }

    await handler(context, event)
    expect(context.done).toHaveBeenCalled()
    expect(spy).toHaveBeenCalled()
  })

  it('responds with the homepage', async () => {
    const event = { method: 'GET', path: '/probot' }
    await handler(context, event)
    expect(context.done).toHaveBeenCalled()
    expect(context.res.body).toMatchSnapshot()
  })

  it('responds with a 400 error when body is null', async () => {
    const event = {
      headers: {
        'X-Github-Event': 'issues',
        'x-github-delivery': 123
      }
    }

    await handler(context, event)
    expect(context.res).toEqual(expect.objectContaining({status: 400}))
    expect(context.done).toHaveBeenCalled()
    expect(spy).not.toHaveBeenCalled()
  })

  it('calls the event handler when using WEBHOOK_SECRET', async () => {
    const secret = "iamasecret";
    const body = {
        installation: { id: 1 }
    }
    
    // Create Signature
    let hmac = crypto.createHmac('sha1', secret);
    hmac.update(JSON.stringify(body));
    const hash = hmac.digest('hex');

    const event = {
      body,
      headers: {
        'X-Github-Event': 'issues',
        'x-Github-Delivery': 123,
        'X-Hub-Signature': `sha1=${hash}`
      }
    }

    process.env.WEBHOOK_SECRET = secret

    await handler(context, event)
    expect(context.done).toHaveBeenCalled()
    expect(spy).toHaveBeenCalled()
  })

  it('responds with 403 when payload has been changed', async () => {
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
    expect(context.res).toEqual(expect.objectContaining({status: 403}))
    expect(context.done).toHaveBeenCalled()
    expect(spy).not.toHaveBeenCalled()
  })

  it('responds with 403 when secret doesn\'t match', async () => {
    const secret = "iamasecret"

    const body = {
      installation: { id: 1 }
    }

    // Create Signature
    let hmac = crypto.createHmac('sha1', secret);
    hmac.update(JSON.stringify(body));
    const hash = hmac.digest('hex');

    const event = {
      body,
      headers: {
        'X-Github-Event': 'issues',
        'x-Github-Delivery': 123,
        'X-Hub-Signature': `sha1=${hash}`
      }
    }

    process.env.WEBHOOK_SECRET = 'iamthewrongsecret' // Application is expecting a different secret

    await handler(context, event)
    expect(context.res).toEqual(expect.objectContaining({status: 403}))
    expect(context.done).toHaveBeenCalled()
    expect(spy).not.toHaveBeenCalled()
  })
})