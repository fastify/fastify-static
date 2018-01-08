# fastify-static
[![Build Status](https://travis-ci.org/fastify/fastify-static.svg?branch=master)](https://travis-ci.org/fastify/fastify-static) [![Greenkeeper badge](https://badges.greenkeeper.io/fastify/fastify-static.svg)](https://greenkeeper.io/) [![Known Vulnerabilities](https://snyk.io/test/github/fastify/fastify-static/badge.svg)](https://snyk.io/test/github/fastify/fastify-static)

Plugin for serving static files as fast as possible.

## Install

`npm install --save fastify-static`

## Usage

```js
const fastify = require('fastify')()
const path = require('path')

fastify.register(require('fastify-static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/public/', // optional: default '/'
})

fastify.get('/another/path', function (req, reply) {
  reply.sendFile('myHtml.html') // serving path.join(__dirname, 'public', 'myHtml.html') directly
})

```

### Options

#### `root` (required)

The absolute path of the directory that contains the files to serve.
The file to serve will be determined by combining `req.url` with the
provided root directory.

#### `prefix`

Default: `'/'`

A URL path prefix used to create a virtual mount path for the static directory.

#### `setHeaders`

Default: `undefined`

A function to set custom headers on the response. Alterations to the headers
must be done synchronously. The function is called as `fn(res, path, stat)`,
where the arguments are:

- `res` The response object.
- `path` The path of the file that is being sent.
- `stat` The stat object of the file that is being sent.

#### `send` Options

The following options are also supported and will be passed directly to the
[`send`](https://www.npmjs.com/package/send) module:

- [`acceptRanges`](https://www.npmjs.com/package/send#acceptranges)
- [`cacheControl`](https://www.npmjs.com/package/send#cachecontrol)
- [`dotfiles`](https://www.npmjs.com/package/send#dotfiles)
- [`etag`](https://www.npmjs.com/package/send#etag)
- [`extensions`](https://www.npmjs.com/package/send#extensions)
- [`immutable`](https://www.npmjs.com/package/send#immutable)
- [`index`](https://www.npmjs.com/package/send#index)
- [`lastModified`](https://www.npmjs.com/package/send#lastmodified)
- [`maxAge`](https://www.npmjs.com/package/send#maxage)

#### Handling 404s

If a request matches the URL `prefix` but a file cannot be found for the
request, Fastify's 404 handler will be called. You can set a custom 404
handler with [`fastify.setNotFoundHandler()`](https://www.fastify.io/docs/latest/Server-Methods/#setnotfoundhandler).

### Handling Errors

If an error occurs while trying to send a file, the error will be passed
to Fastify's error handler. You can set a custom error handler with
[`fastify.setErrorHandler()`](https://www.fastify.io/docs/latest/Server-Methods/#seterrorhandler).

## License

Licensed under [MIT](./LICENSE)
