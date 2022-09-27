// This file was added by layer0 init.
// You should commit this file to source control.

const { Router } = require('@layer0/core/router')
const { nuxtRoutes } = require('@layer0/nuxt')
const axios = require('axios')

const upstash = axios.create({
  baseURL: process.env.UPSTASH_URL,
  headers: {
    Authorization: `Bearer ${process.env.UPSTASH_TOKEN}`
  }
})

const upstashMethods = {
  set: async (key, value) => {
    try {
      const resp = await upstash.post(`/set/${key}/${encodeURIComponent(value)}`)
      if (resp.data.result !== 'OK') {
        return false
      }
      return true
    } catch (e) {
      return false
    }
  },
  get: async (key) => {
    try {
      const resp = await upstash.get(`/get/${key}`)
      return decodeURIComponent(resp.data.result)
    } catch (e) {
      return e.message
    }
  }
}

const apiValidationMiddleware = (req, res) => {
  const allowedOperations = ['add', 'subtract', 'multiply', 'divide']
  if (!allowedOperations.includes(req.params.operation)) {
    res.statusCode = 404
    res.body = 'Invalid operation.'
    return false
  }
  if (req.params.operation === 'divide' && req.params.y === '0') {
    res.statusCode = 400
    res.body = 'Please do not divide by 0.'
    return false
  }
  return true
}

module.exports = new Router()
  // Prevent search engines from indexing permalink URLs
  .noIndexPermalink()
  .get('/api/:operation/:x/:y', ({ compute }) => {
    compute((req, res) => {
      if (!apiValidationMiddleware(req, res)) {
        return
      }

      let calc = (x, y) => null
      switch (req.params.operation) {
        case 'subtract':
          calc = (x, y) => x - y
          break
        case 'multiply':
          calc = (x, y) => x * y
          break
        case 'divide':
          calc = (x, y) => x / y
          break
        case 'add':
        default:
          calc = (x, y) => x + y
      }
      res.setHeader('content-type', 'appklication/json')
      res.body = JSON.stringify({
        data: calc(parseInt(req.params.x), parseInt(req.params.y)),
        source: 'serverless'
      })
    })
  })

  .post('/state/set', ({ compute }) => {
    compute(async (req, res) => {
      const body = JSON.parse(req.body)
      const currentState = await upstashMethods.get('stateValue')
      await upstashMethods.set('stateValue', body.value)
      res.body = JSON.stringify({ previous: currentState, new: body.value })
      res.statusCode = 200
      return res
    })
  })
  .get('/state/get', ({ compute }) => {
    compute(async (req, res) => {
      const currentState = await upstashMethods.get('stateValue')
      res.body = JSON.stringify({ value: currentState })
      res.statusCode = 200
      return res
    })
  })

  .match('/service-worker.js', ({ serviceWorker }) => {
    serviceWorker('.nuxt/dist/client/service-worker.js')
  })
  .use(nuxtRoutes)
