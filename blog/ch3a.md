In the [first](./ch1.md) [two](./ch2.md) chapters, we created a Calculator API using Nuxt.js's server middleare; built a frontend to see the results of the API calls; and then installed Edgio AppOps and migrated the Calculator API to Edgio's serverless infrastructure.

In Chapter 2 we saw that there were some situations where server middleware routes might not work as serverless functions. In this chapter we'll build a small API that relies on maintaining in-memory state and see how we can refactor such an API to work as a serverless function.

Our API will have two endpoints: `/set` and `/get`. The `/set` endpoint will take a `POST` request with a small payload and set an in-memory value to what was in the payload. The `/get` endpoint take a `GET` request with no parameters and will return the in-memory value.

Create a new file in `serverMiddleware` called `state.js` and put in the following code:

```js
import express from 'express'
import bodyParser from 'body-parser'

const app = express()
app.use(bodyParser.json())

let cachedState = null

app.post('/set', (req, res) => {
  const currentState = cachedState
  cachedState = req.body.value
  res.json({ previous: currentState, new: cachedState })
})

app.get('/get', (req, res) => {
  res.json({ value: cachedState })
})

export default app
```

Add this server middleware to your `nuxt.config.js` file:

```js
export default {
  ...
  serverMiddleware: [
    { path: '/state', handler: '@/serverMiddleware/state.js' }
  ]
  ...
}
```

Start up your dev server using `npm run dev` or `yarn dev`. Using the command line, run the following cURL command:

```
$ curl -X POST http://localhost:3000/state/set -d '{"value": 123}' -H "content-type: application/json"
```

You should get an acknowledgement back: `{"previous":null,"new":123}`. Now run another cURL command:

```
$ curl http://localhost:3000/state/get
```

This time you should see `{"value":123}` as the response. If you continue to push new values throughg the `/set` endpoint the `previous` and `new` values should change, and the `/get` endpoint should always show the current value.

This works because the `cachedState` variable is scoped within the entire Express app, and as long as the Node process running Express stays up (and as long as Express doesn't crash), that value will stay populated. Because the Nuxt.js framework stays running at all times in the hosting environment, the Express middleware also stays running.

To see this in action, create a new component in the `components` folder called `StatefulApi.vue` and add the following markup and code:

```jsx
<template>
  <div class="stateful">
    <h1>Previous Value</h1>
    <p>{{ previousValue }}</p>
    <hr>
    <h1>Current Value</h1>
    <p>{{ currentValue }}</p>
    <hr>
    <form @submit.prevent="set">
      <fieldset>
        <label for="newValue">New Value:</label>
        <input id="newValue" v-model="newValue" type="text" name="newValue">
      </fieldset>
      <button type="submit">Set New Value</button>
      <button @click.prevent="get">Refresh Current Value</button>
    </form>
    <p>Last message received: {{ message }}</p>
  </div>
</template>

<script>
export default {
  name: 'StatefulApiComponent',
  data: () => ({
    newValue: '',
    currentValue: '',
    previousValue: '',
    message: ''
  }),
  methods: {
    async set () {
      try {
        const setResult = await this.$axios.post('/state/set', { value: this.newValue })
        this.previousValue = setResult.data?.previous
        this.currentValue = setResult.data?.new
        this.newValue = ''
        this.message = ''
      } catch (e) {
        this.message = `Unable to set value: ${e.response.data}`
      }
    },
    async get () {
      try {
        const getResult = await this.$axios.get('/state/get')
        this.currentValue = getResult.data.value
        this.message = ''
      } catch (e) {
        this.message = `Unable to get value: ${e.response.data}`
      }
    }
  }
}
</script>
```

Place the component in `pages/index.vue` and relaunch your dev environment using `npm run dev` or `yarn dev`. Note that you can open up `http://localhost:3000` in a new browser or an incognito window and the state is shared betwen the two devices.

([Keep going](./ch3b.md))
