const { Probot } = require('probot')
const { resolve } = require('probot/lib/helpers/resolve-app-function')
const { findPrivateKey } = require('probot/lib/helpers/get-private-key')
const { template } = require('./views/probot')

const crypto = require('crypto')

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


const isValidSignature = (req) => {
  const signature = lowerCaseKeys(req.headers)['x-hub-signature']
  const secret = process.env['WEBHOOK_SECRET']

  let hmac = crypto.createHmac('sha1', secret);
  const digest = Buffer.from('sha1=' + hmac.update(JSON.stringify(req.body)).digest('hex'), 'utf8');
  const checksum = Buffer.from(signature, 'utf8');

  return !(checksum.length !== digest.length || !crypto.timingSafeEqual(digest, checksum))
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

    // Check for correct Signature
    if(process.env.WEBHOOK_SECRET && !isValidSignature(req)) {
      context.res = {
        status: 403,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Request signature does not match' })
      }
      context.done();
      return
    }

    // Otherwise let's listen handle the payload
    probot = probot || loadProbot(appFn)


    const headers = lowerCaseKeys(req.headers)
    
    // Determine incoming webhook event type and event ID
    const name = headers['x-github-event']
    const id = headers['x-github-delivery']
    
    // Do the thing
    context.log(`Received event: ${name}${req.body.action ? ('.' + req.body.action) : ''}`)

    try {
      await loadProbot(appFn).receive({
        id,
        name,
        payload: req.body
      })
      context.res = {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Executed' })
      }
      context.done();
      return
    } catch (err) {
      console.error(err)
      context.res = {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: err })
      }
      context.done();
      return
    }
  }
}

