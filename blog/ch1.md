Traditionally, websites on hosting platforms are set up to consume data APIs, rather than host them. For example, an eCommerce website might call a "products" API from an eCommerce platform like Shopify; the platform returns a structured object that might contain the first ten products within a specific category, along with metadata like a product image URL, quantity available, and price.

Request: `POST /api/storefront/2022-07/graphql.json`
Response:
```json
{
  "data": {
    "marketplace": {
      "productLookup": {
        "shopResults": [
          {
            "products": [...]
          }
        ]
      }
    }
  }
}
```

But there may be situations where site owners would want to host their own API. For example, they may want to apply business logic to or otherwise manipulate or enrich the data outside of the upstream data provider and re-serve the new data.

Using Nuxt.js, we can easily create server middleware and host a small Express server alongside a Nuxt application that serves data as well as consumes it.

# Part 1: The Server Middleware
Nuxt.js has two types of middleware: "router middleware" runs as part of the route navigation process in a client-side context, and is bundled and minified along with the rest of the Nuxt.js front-end application using Webpack. "Server middleware" instead is compiled as part of the server build process and is run on the server. While this means that we lose access to the Nuxt.js contextual variables, it gives us additional flexibility to create applications that run in a full Node.js environment.

To set up the server middleware, first modify your nuxt.config.js file and add the following:
```js
export default {
  …
  'serverMiddleware': [
    { path: '/api', handler: '@/serverMiddleware/api.js'
  ],
  …
}
```

When any route is processed by Nuxt.js starting with `/api`, the request will first pass through `serverMiddleware/api.js`.

The next step is to create the file. First create a folder called `serverMiddleware` at the root of your project, then create `api.js` inside that folder. Because all of the dependencies we need are already installed as part of the Nuxt.js framework, we can simply import them:

```js
import express from 'express'
import bodyParser from 'body-parser'

const app = express()
app.use(bodyParser.json())

app.get('/', (req, res) => {
  res.json({ data: 'ok' })
})

export default app
```

(If you get errors to the effect that Express is not installed, simply run `yarn add express`.)

If you reload your Nuxt.js application and visit `http://localhost:3000/api`, you should get a simple JSON response. (You can also use cURL on the command line.)

Let's create an example that allows for user input. Our API will have four operations - `add`, `subtract`, `multiple`, and `divide` - and will take two inputs, `x` and `y`.

Create Express handlers for these routes:

```js
app.get('/:operation/:x/:y', (req, res) => {
  // Validate that the :operation is one of: add, subtract, multiply, divide
  const validOperations = ['add', 'subtract', 'multiply', 'divide']
  if (!validOperations.includes(req.params.operation)) {
    return res.status(404).send('Invalid operation specified.')
  }
  let calc
  switch (req.params.operation) {
    case 'add':
      calc = (x, y) => x + y
      break
    case 'subtract':
      calc = (x, y) => x - y
      break
    case 'multiply':
      calc = (x, y) => x * y
      break;
    case 'divide':
      calc = (x, y) => x / y
      break;
  }
  const result = calc(parseInt(req.params.x), parseInt(req.params.y))
  res.json({ data: result })
})
```

Save the middleware (your dev instance should reload) and cURL or visit `http://localhost:3000/api/add/1/2` - you should see `{ "data": 3 }` as the response.

Note that if you wanted to handle validation in a separate method, you could create your own Express middleware:

```js
const validate = (req, res, next) => {
  const validOperations = ['add', 'subtract', 'multiply', 'divide']
  if (!validOperations.includes(req.params.operation)) {
    return res.status(404).send('Invalid operation.')
  }
  if (req.params.operation === 'divide' && y === '0') {
    return res.status(400).send('Please do not divide by 0.')
  }
  return next()
}
```

Then, in your route, specify the `validate` middleware and remove the list of valid operations:

```js
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
  const result = calc(parseInt(req.params.x), parseInt(req.params.y))
  res.json({ data: result })
}
```

# Part 2: The Browser Interface
Let's imagine that we needed to write this API because, for some reason, our browser didn't have the ability to natively perform math operations. In that case, it might be nice to set up a page (or several pages) with the ability to specify and operation along with `x` and `y`, and let our API do the work.

(In this example, I've created a Nuxt.js SPA [single-page app] wihtout any additional CSS frameworks. If you are following along, you may have chosen a different CSS framework, or did not build a SPA, etc. These changes shouldn't affect much except perhaps the presentation of the components. One thing that I did choose to include in the setup was the Axios plugin, which allows us to use `this.$axios`. If you did not install that plugin, you can follow [this guide](https://axios.nuxtjs.org/setup/) to add it, or simply add Axios or your preferred HTTP request library.)

First create a new component in the `components` folder called `Calculator.vue`, and populate it with the following boilerplate:

```jsx
<template>
  <div class="calculator">
    <h1>coming soon</h1>
  </div>
</template>

<script>
export default {
  name: 'ComponentCalculator'
}
</script>
```

Let's add some form components that we can bind to Vue data.

```html
<div class="calculator">
  <form @submit.prevent="calculate">
    <fieldset>
      <label for="operation">Operation:</label>
      <select id="operation" name="operation" v-model="operation">
        <option value="add" :selected="operation">Add</option>
        <option value="subtract">Subtract</option>
        <option value="multiply">Multiply</option>
        <option value="divide">Divide</option>
      </select>
    </fieldset>
    <fieldset>
      <label for="x">First Value</label>
      <input type="number" name="x" id="x" v-model="x">
    </fieldset>
    <fieldset>
      <label for="y">Second Value</label>
      <input type="number" name="y" id="y" v-model="y">
    </fieldset>
    <button type="submit">Calculate</button>
  </form>
  <hr>
  <div class="result">{{ result }}</div>
</div>
```

We've created a few values that we need to account for as data on our component: `operation`, `x`, `y`, and `result`. We also introduced a method called `calculate` that fires when the form is submitted.

```js
export default {
  name: 'ComponentCalculator',
  data: () => ({
    operation: 'add',
    x: 0,
    y: 0,
    result: 0
  }),
  methods: {
    async calculate () {
      try {
        const result = await this.$axios.get(`/api/${this.operation}/${this.x}/${this.y}`)
        this.result = result.data.data
      } catch (e) {
        this.result = `Error: ${e.response.data}`
      }
    }
  }
}
```

And that's it! When the form is submitted, a URL is pieced together based on the operation and two numeric inputs, and dispatched via the Axios plugin. The result object's `data` key contains the JSON object returned by the API, and remember that the API returns a JSON object with a `data` key of its own containing the actual result. Once the result has been received, the reactive `result` property of the component is updated, and the result is displayed under the form.

To see this in action, open the `pages/index.vue` file and replace the `<Tutorial />` component with the `<Calculator />` component. Reload the page and play around with the inputs.
