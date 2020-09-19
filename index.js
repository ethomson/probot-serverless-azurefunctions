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

const lowerCaseKeys = obj =>
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

      return
    }

    // Otherwise let's listen handle the payload
    probot = probot || loadProbot(appFn)

    // Determine incoming webhook event type
    const headers = lowerCaseKeys(req.headers)
    const e = headers['x-github-event']

    // Bail for null body
    if (!req.body) {
      context.res = {
        status: 400,
        body: JSON.stringify({ message: 'Event body is null' })
      }
    }

    // Do the thing
    console.log(`Received event ${e}${req.body.action ? ('.' + req.body.action) : ''}`)

    try {
      await probot.receive({
        event: e,
        payload: req.body
      })
      context.res = {
        status: 200,
        body: JSON.stringify({ message: 'Executed' })
      }
    } catch (err) {
      console.error(err)
      context.res = {
        status: 500,
        body: JSON.stringify({ message: err })
      }
    }
  }
}

