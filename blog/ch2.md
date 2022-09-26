_Note: Please see [chapter 1](./ch1.md) for the initial setup of the Nuxt.js app._

If you already have an application that makes use of a separate set of routes that serve up JSON or GraphQL content as part of an in-app API, then you're already aware of how powerful a toold is at your disposal. If you're considering a move to a Platform-as-a-Service (PaaS) hosting environment, you may find that there are some more options that are available to you for hosting your API, with some pros and cons.

Edgio's [App Platform](https://edg.io/appops/app-platform/) provides PaaS hosting for decoupled Javascript sites that use frameworks like Nuxt.js, Next.js, etc. One of the features of App Platform is the ability to handle arbitrary routes as part of the [EdgeJS](https://edg.io/appops/features/edgejs/) offering. Routes can be defined as part of the App Platform configuration, tested locally, and deployed to the largest CDN network in the world to fast API responses. You can also choose to run your API as part of a [serverless](https://edg.io/appops/features/serverless-compute/) environment, moving some of the work away from your application and into a serverless function for added speed and durability.

Not all API routes can or should be moved, however. As a general rule, simple computational routes (ones that act on data received, transform it, use it to fetch other data, etc.) can safely be moved to a serverless edge and would likely see some performance benefits by doing so. However, note that on the AppOps platform, there is a 20-second execution limit to serverless functions, so long-running tasks should not be moved unless moving them will result in a speed increase that brings the total execution time down to below 20s.

One other consideration is whether or not the API needs to maintain in-memory state between invocations. For example, a multi-step API that needs to "remember" input or the results of previous steps and saves that state to a variable rather than to the user's session would not work properly as a serverless function because the environment that processes the serverless function is spun up, run, and destroyed for each call. (There are other options to consider if this is the case; for example, intermediate data can be returned as part of an API response, or an external object store like Redis can be added.)

Let's consider the API we wrote in the first chapter as well as a more complex API that scrapes data from a webpage and serves it in RESTful format.

# The Calculator API

The Calculator API from the previous chapter is a good example of an API that can be moved into a serverless function. It does not mantain any sort of state from one call to the next; it operates entirely on the input values given to it without requiring any third-party data or fetch calls; and it runs quickly.

Given what we know about the API, why move it to serverless at all? One reason would be to make this endpoint more durable and more highly available at the edge. At the end of the last chapter, the API ran as part of the Nuxt.js core service. Assuming there was a CDN in front of the Nuxt.js application, any request would have to terminate at the geographically nearest POP, then travel all the way back to origin where the Nuxt.js application was running. In the previous example, the routes all expected `GET` requests, so in theory the results of `GET /api/add/1/2` are cacheable and any subsequent user calling that specific endpoint could get a cached response instead of having to calculate it each time. However, requests that the caching layer had never seen before, eg. `GET /api/add/1/3`, would have to go all the way back to the origin to be calculated and returned. By moving this to a serverless function on the AppOps platform, all requests to `/api/*` would live at the edge; in the cases of repeat requests, cached data could be served, while new requests would still have to calculate but would be calculated right at the edge, cached, and returned with less roundtrip time. Another benefit is the endpoint would now be replicated across all the network's POPs rather than concentrating those requests at the origin. This makes the origin overall less susceptible to denial-of-service attacks because the requests are not being dispatched to the origin.

To prepare our Calculator API for migration to Edgio, we'll first [set up the AppOps CLI](https://docs.layer0.co/guides/cli), then run `0 init` in our project root.

```
$ 0 init
🚀 Let's get started with Layer0!

> Found framework Nuxt v2.

✔ installing @layer0/core, @layer0/cli, @layer0/prefetch, @layer0/devtools, @layer0/vue, @layer0/nuxt... done.
⠋ Updating dependencies...WARNING: It looks like you are using a custom framework:
 - express
This will probably cause errors when running Layer0. See the Layer0 Nuxt docs (​https://docs.layer0.co/guides/nuxt​) to learn more.
✔ Updating dependencies...
> layer0.config.js not found, creating...
> sw/service-worker.js not found, creating...
> routes.js not found, creating...

Added the following scripts to package.json:

    layer0:dev - Simulate your app on Layer0 locally.
    layer0:build - Build your app for deployment on Layer0.
    layer0:deploy - Build and deploy your app on Layer0.

To run your app locally:

    0 dev

To deploy your app:

    0 deploy
```

Note that becuase we have Express listed as a dependency, despite using Nuxt.js, the CLI will issue a warning. You can ignore that.

You should also follow the additional instructions for [adding Edgio to an existing Nuxt app](https://docs.layer0.co/guides/nuxt#adding-edgio-to-an-existing-nuxt-app).

Once the AppOps platform has been set up, run `0 dev` and test out the application to make sure everything still works as expected.

To migrate the Calculator API to an AppOps serverless function, we will need to catch requests to `/api/*` before Nuxt.js does. This can be set up in the `routes.js` or `routes.ts` file that was created when you ran `0 init`:

```js
const { Router } = require('@layer0/core/router')
const { nuxtRoutes } = require('@layer0/nuxt')

/** Validate the inputs to the API endpoint. */
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
```

Comparing this to the contents of `serverMiddleware/api.js` we can see a few differences:
* We had to change how we handled the validation middleware. In this model, we moved the validation code into a module-scoped method called `apiValidationMiddleware`. If the `req` object fails validation, we modify the `res` object with the information we want to send, then return `false`; if the validation passes, we return `true` instead.
* The router matcher runs the `compute` method from the `@layer0/router` module, which first validates the `req` object. If the validation fails, the `compute` method returns the existing `res` object, whatever that happens to be at the time (since the validation method modified the `res` object, returning it at this point will bubble up the response and any error information we include to the user). If the validation passes, the `res` object remains untouched until we populate it with the results of our calculation.
* Since the serverless environment does not have a `.json()` convenience method, we specify that the content type is explicitly `application/json`. We also have to return a `string` instead of an `object`, so we use `JSON.stringify()` to turn our response into a string.
* We added `source: 'serverless'` to the response object to differentiate it from the response that would have been sent with the `serverMiddleware` method. This isn't strictly necessary but for debugging purposes it's helpful to quickly verify that the response was served from serverless rather than from Nuxt.
* The `req` and `res` objects do not have all of the same methods and properties as their counterparts from Express. For more details check out the API docs for both [`req`](https://docs.layer0.co/docs/api/core/interfaces/_router_request_.request.html) and [`res`](https://docs.layer0.co/docs/api/core/interfaces/_router_response_.response.html).

The final step in the migration is to remove the `serverMiddleware/api.js` file and the line from `nuxt.config.js` where we specified the server middleware. Once that is done, run `0 dev` again and test the frontend again.
