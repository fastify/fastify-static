# fastify-static
[![Build Status](https://travis-ci.org/fastify/fastify-static.svg?branch=master)](https://travis-ci.org/fastify/fastify-static) [![Greenkeeper badge](https://badges.greenkeeper.io/fastify/fastify-static.svg)](https://greenkeeper.io/) [![Known Vulnerabilities](https://snyk.io/test/github/fastify/fastify-static/badge.svg)](https://snyk.io/test/github/fastify/fastify-static)

Plugin for serving static files as fast as possible. Supports Fastify versions `>=2.0.0`. 

Please refer to [this branch](https://github.com/fastify/fastify-static/tree/1.x) and related versions for Fastify `^1.11.0` compatibility.

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

#### `schemaHide`

Default: `true`

A flag that define if the fastify route hide-schema attribute is hidden or not

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

#### `redirect`

Default: `false`

If set to `true`, `fastify-static` redirects to the directory with a trailing slash.

This option cannot be set to `true` with `wildcard` set to `false` on a server
with `ignoreTrailingSlash` set to `true`.

#### `wildcard`

Default: `true`

If set to `true`, `fastify-static` adds a wildcard route to serve files.
If set to `false`, `fastify-static` globs the filesystem for all defined
files in the served folder (`${root}/**/*`), and just creates the routes needed for
those.
If set to a glob `string` pattern, `fastify-static` will use the provided string when globing the filesystem (`${root}/${wildcard}`).

The default options of https://www.npmjs.com/package/glob are applied
for getting the file list.

This option cannot be set to `false` with `redirect` set to `true` on a server
with `ignoreTrailingSlash` set to `true`.

#### Disable serving

If you'd just like to use the reply decorator and not serve whole directories automatically, you can simply pass the option `{ serve: false }`. This will prevent the plugin from serving everything under `root`.

#### Disabling reply decorator

The reply object is decorated with a `sendFile` function by default.  If you want to
disable this, pass the option `{ decorateReply: false }`.  If fastify-static is
registers to multiple prefixes in the same route only one can initialize reply
decorators.

#### Handling 404s

If a request matches the URL `prefix` but a file cannot be found for the
request, Fastify's 404 handler will be called. You can set a custom 404
handler with [`fastify.setNotFoundHandler()`](https://www.fastify.io/docs/latest/Server/#setnotfoundhandler).

### Handling Errors

If an error occurs while trying to send a file, the error will be passed
to Fastify's error handler. You can set a custom error handler with
[`fastify.setErrorHandler()`](https://www.fastify.io/docs/latest/Server-Methods/#seterrorhandler).

### Payload `stream.filename`

If you need to access the filename inside the `onSend` hook, you can use `payload.filename`.

```js
fastify.addHook('onSend', function (req, reply, payload, next) {
  console.log(payload.filename)
  next()
})
```

## License

Licensed under [MIT](./LICENSE)
