// This file was added by layer0 init.
// You should commit this file to source control.

const { Router } = require('@layer0/core/router')
const { nuxtRoutes } = require('@layer0/nuxt')

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
  .match('/service-worker.js', ({ serviceWorker }) => {
    serviceWorker('.nuxt/dist/client/service-worker.js')
  })
  .use(nuxtRoutes)
