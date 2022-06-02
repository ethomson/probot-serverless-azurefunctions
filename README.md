## Azure Functions Extension for Probot

This tool is deprecated. Please use Probot's [adapter-azure-functions](https://github.com/probot/adapter-azure-functions).

## Usage

A [Probot](https://github.com/probot/probot) extension to make it
easier to run your Probot Apps in Azure Functions.

```shell
$ npm install probot-serverless-azurefunctions
```

```javascript
// index.js
const { serverless } = require('probot-serverless-azurefunctions')

const appFn = (app) => {
	app.on(['*'], async (context) => {
		app.log(`Received event: ${context.event}`)
	})
}

module.exports.probot = serverless(appFn)
```

## Configuration
This package moves the functionality of `probot run` into a handler suitable for usage in Azure Functions. Follow the documentation on [Environment Configuration](https://probot.github.io/docs/configuration/) to setup your app's environment variables. You can add these to `.env`, but for security reasons you may want to use the [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/?view=azure-cli-latest) or the user-interface to set Environment Variables for the function so you don't have to include any secrets in the deployed package.

## Differences from `probot run`

#### Local Development
Since Azure Functions do not start a normal node process, the best way we've found to test this out locally is to use the [Azure Functions Core Tools](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local) or [another local emulator](https://docs.microsoft.com/en-us/azure/azure-functions/functions-develop-local) on your local machine before deploying your function to Azure.

#### Long running tasks
Some Probot Apps that depend on long running processes or intervals will not work with this extension. This is due to the inherent architecture of serverless functions, which are designed to respond to events and stop running as quickly as possible. For longer running apps we recommend using [other deployment options](https://probot.github.io/docs/deployment).

#### Only responds to Webhooks from GitHub
This extension is designed primarily for receiving webhooks from GitHub and responding back as a GitHub App.
