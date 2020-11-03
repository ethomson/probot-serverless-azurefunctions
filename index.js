const { Probot } = require('probot')
const { resolve } = require('probot/lib/helpers/resolve-app-function')
const { findPrivateKey } = require('probot/lib/helpers/get-private-key')
const { template } = require('./views/probot')

let probot

const loadProbot = appFn => {
  probot = probot || new Probot({
    id: process.env.APP_ID,
    secret: process.env.WEBHOOK_SECRET,
    privateKey: findPrivateKey()
  })

  if (typeof appFn === 'string') {
    appFn = resolve(appFn)
  }

  probot.load(appFn)

  return probot
}

const lowerCaseKeys = (obj = {}) =>
  Object.keys(obj).reduce((accumulator, key) =>
    Object.assign(accumulator, {[key.toLocaleLowerCase()]: obj[key]}), {})


module.exports.serverless = appFn => {
  return async (context, req) => {
    // 🤖 A friendly homepage if there isn't a payload
    if (req.method === 'GET') {
      context.res = {
        status: 200,
        headers: {
          'Content-Type': 'text/html'
        },
        body: template
      }

      context.done()
      return
    }

    // Bail for null body
    if (!req.body) {
      context.res = {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Event body is null' })
      }
      context.done();
      return
    }

    probot = loadProbot(appFn)

    const headers = lowerCaseKeys(req.headers)
    
    // Determine incoming webhook event type and event ID
    const name = headers['x-github-event']
    const id = headers['x-github-delivery']

    // Do the thing
    context.log(`Received event: ${name}${req.body.action ? ('.' + req.body.action) : ''}`)

    // Verify the signature and then execute
    const response = await probot.webhooks.verifyAndReceive({ id, name, payload: req.body, signature: headers['x-hub-signature'] })
    .then(res => {
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Executed' })
      }
    })
    .catch(error => {
      return {
        status: error.event.status,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(error.errors)
      }
    })

    context.log(`Event executed with status ${response.status} and output of: `, JSON.parse(response.body))
    context.res = response
    context.done();
    return
  }
}

