const { createProbot } = require('probot')
const { resolve } = require('probot/lib/resolver')
const { findPrivateKey } = require('probot/lib/private-key')
const { template } = require('./views/probot')

const crypto = require('crypto')

let probot

const loadProbot = appFn => {
  probot = probot || createProbot({
    id: process.env.APP_ID,
    secret: process.env.WEBHOOK_SECRET,
    cert: findPrivateKey()
  })

  if (typeof appFn === 'string') {
    appFn = resolve(appFn)
  }

  probot.load(appFn)

  return probot
}

const validateSignature = (req) => {
  const given = req.headers['x-hub-signature'] || req.headers['X-Hub-Signature']

  if (! process.env['WEBHOOK_SECRET']) {
    console.error("No shared secret; set the WEBHOOK_SECRET environment variable")
    return false
  }

  var hmac = crypto.createHmac("sha1", process.env['WEBHOOK_SECRET'])
  hmac.update(req.rawBody, 'binary')
  var expected = 'sha1=' + hmac.digest('hex')

  return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}

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
    const name = req.headers['x-github-event'] || req.headers['X-GitHub-Event']
    const id = req.headers['x-github-delivery'] || req.headers['X-GitHub-Delivery']

    // Do the thing
    console.log(`Received event ${name}${req.body.action ? ('.' + req.body.action) : ''}`)

    if (!validateSignature(req)) {
      context.res = {
        status: 403,
        body: JSON.stringify({ message: 'Invalid request; signature does not match' })
      }
      return
    }

    if (!name) {
      context.res = {
        status: 400,
        body: JSON.stringify({ message: 'Invalid request; no action' })
      }
      return
    }

    try {
      await probot.receive({
        name: name,
        id: id,
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
