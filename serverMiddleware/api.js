import express from 'express'
import bodyParser from 'body-parser'

const app = express()
app.use(bodyParser.json())

const validate = (req, res, next) => {
  const allowedOperations = ['add', 'subtract', 'multiply', 'divide']
  if (!allowedOperations.includes(req.params.operation)) {
    return res.status(404).send('Invalid operation.')
  }
  if (req.params.operation === 'divide' && req.params.y === '0') {
    return res.status(400).send('Please do not divide by 0.')
  }
  return next()
}

app.get('/', (_req, res) => {
  res.json({ data: 'ok' })
})

app.get('/:operation/:x/:y', validate, (req, res) => {
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
      break
  }
  res.json({ data: calc(parseInt(req.params.x), parseInt(req.params.y)) })
})

export default app
