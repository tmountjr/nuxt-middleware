_(This version of the guide is deployed at https://tom-mount-nuxt-middleware-ch3b.layer0-limelight.link/)_

Trying to migrate the Stateful API we just created to a serverless environment seems like it wouldn't work on the face of it - the requirement that in-memory storage not be destroyed from call to call means that this API won't work as intended if we simply migrated it to Edgio's serverless environment as-is. Suppose you tried this in `routes.js`:

```js
const { Router } = require('@layer0/core/router')
const { nuxtRoutes } = require('@layer0/nuxt')

let cachedState = null

module.exports = new Router()
  .noIndexPermalink()
  .post('/state/set', ({ compute }) => {
    compute((req, res) => {
      const currentState = cachedState
      cachedState = req.body.value
      res.body = JSON.stringify({ previous: currentState, new: cachedState })
      res.statusCode = 200
      return res
    })
  })
  .get('/state/get', ({ compute }) => {
    compute((req, res) => {
      res.body = JSON.stringify({ value: cachedState })
      return res
    })
  })
  .use(nuxtRoutes)
```

Even though `cachedState` is scoped to be accessible within the router matches, no value is ever set and stored. Why not? Because the serverless environment that is spun up for the `compute()` methods takes place in a different execution environment from where set initialized `cachedState` and as a result the value is not preserved. And because the `compute` method does not return a value, we have no way of saving the execution state between calls. 

(For the purposes of this demo, I've set up a free tier on [Upstash](https://upstash.com/) that includes a RESTful API for a Redis instance where I'm going to store the data. After creating my account, I navigated down the page to find the example REST API call and copied the `JavaScript (Fetch)` command. This command included a bearer token that I saved to a `.env` file using the environment cariable name `UPSTASH_TOKEN`.)

Since my durable storage has a REST API, I don't need to install any additional libraries (though I certainly could install the `node-redis` package and run it as part of my serverless package). Because Edgio's serverless environment currently supports Node version 14 and the first-class Fetch API was added as an experimental feature to Node 17 and a full feature to Node 18, we'll need to import either Axios (convenient since it's already installed with Nuxt.js) or `node-fetch`. I'm going to go with Axios for simplicity's sake. Update your router to import axios and then change the `set` and `get` handlers to interface with the cloud object store:

```js
const { Router } = require('@layer/core/router')
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

module.exports = new Router()
  .noIndexPermalink()
  .post('/state/set', ({ compute }) => {
    const body = JSON.parse(req.body)
    const currentState = await upstashMethods.get('stateValue')
    await upstashMethods.set('stateValue', body.value)
    res.body = JSON.stringify({ previous: currentState, new: body.value })
    res.statusCode = 200
    return res
  })
  .get('/state/get', ({ compute }) => {
    const currentState = await upstashMethods.get('stateValue')
    res.body = JSON.stringify({ value: currentState })
    res.statusCode = 200
    return res
  })
  .use(nuxtRoutes)
```

Now if you run your application with `0 dev` you'll be able to do everything you could do when the `/state/*` routes were hosted as server middleware. Once you're satisfied with things, you can clean up your `serverMiddleware` folder and remove references to the API from your `nuxt.config.js`.
