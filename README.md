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
  page404Path: path.join(__dirname, 'public', '404.html'), // optional
  page403Path: path.join(__dirname, 'public', '403.html'), // optional
  page500Path: path.join(__dirname, 'public', '500.html')  // optional
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

#### `page404Path`, `page403Path`, `page500Path`

The absolute path to an HTML file to send as a response for the corresponding
error status code. A generic error page is sent by default.

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

## License

Licensed under [MIT](./LICENSE)
