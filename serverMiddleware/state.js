import express from 'express'
import bodyParser from 'body-parser'

const app = express()
app.use(bodyParser.json())

let cachedState = null

/**
 * Expects body to be { value: "12345" }
 */
app.post('/set', (req, res) => {
  const currentState = cachedState
  cachedState = req.body.value
  res.json({ previous: currentState, new: cachedState })
})

app.get('/get', (req, res) => {
  res.json({ value: cachedState })
})

export default app
