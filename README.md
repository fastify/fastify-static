# fastify-static
![CI workflow](https://github.com/fastify/fastify-static/workflows/CI%20workflow/badge.svg) [![Known Vulnerabilities](https://snyk.io/test/github/fastify/fastify-static/badge.svg)](https://snyk.io/test/github/fastify/fastify-static)

Plugin for serving static files as fast as possible. Supports Fastify version `3.x`.

Please refer to [this branch](https://github.com/fastify/fastify-static/tree/2.x) and related versions for Fastify `^2.0.0` compatibility.
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
  return reply.sendFile('myHtml.html') // serving path.join(__dirname, 'public', 'myHtml.html') directly
})

fastify.get('/path/with/different/root', function (req, reply) {
  return reply.sendFile('myHtml.html', path.join(__dirname, 'build')) // serving a file from a different root location
})

```

### Multiple prefixed roots

```js
const fastify = require('fastify')()
const fastifyStatic = require('fastify-static')
const path = require('path')
// first plugin
fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'public')
})

// second plugin
fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'node_modules'),
  prefix: '/node_modules/',
  decorateReply: false // the reply decorator has been added by the first plugin registration
})

```

### Options

#### `root` (required)

The absolute path of the directory that contains the files to serve.
The file to serve will be determined by combining `req.url` with the
provided root directory.

You can also provide an array of directories containing files to serve.
This is useful for serving multiple static directories under a single prefix. Files are served in a "first found, first served" manner, so the order in which you list the directories is important. For best performance, you should always list your main asset directory first. Duplicate paths will raise an error.

#### `prefix`

Default: `'/'`

A URL path prefix used to create a virtual mount path for the static directory.

### `prefixAvoidTrailingSlash`

Default: `false`

If set to false prefix will get trailing "/" at the end. If set to true, prefix will not append "/" to prefix.

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

If this option is set to `false`, then requesting directories without trailing 
slash will trigger your app's 404 handler using `reply.callNotFound()`.

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

#### `list`

Default: `undefined`

If set, it provide the directory list calling the directory path.

Default response is json.

**Example:**

```js
fastify.register(require('fastify-static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/public/',
  list: true
})
```

Request

```bash
GET .../public
```

Response

```json
{ "dirs": ["dir1", "dir2"], "files": ["file1.png", "file2.txt"] }
```

#### `list.format`

Default: `json`

Options: `html`, `json`

Directory list can be also in `html` format; in that case, `list.render` function is required.

**Example:**

```js
fastify.register(require('fastify-static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/public/',
  list: {
    format: 'html',
    render: (dirs, files) => {
      return `
<html><body>
<ul>
  ${dirs.map(dir => `<li><a href="${dir.href}">${dir.name}</a></li>`).join('\n  ')}
</ul>
<ul>
  ${files.map(file => `<li><a href="${file.href}" target="_blank">${file.name}</a></li>`).join('\n  ')}
</ul>
</body></html>
`
      },
  }
})
```

Request

```bash
GET .../public
```

Response

```html
<html><body>
<ul>
  <li><a href="/dir1">dir1</a></li>
  <li><a href="/dir1">dir2</a></li>
</ul>
<ul>
  <li><a href="/foo.html" target="_blank">foo.html</a></li>
  <li><a href="/foobar.html" target="_blank">foobar.html</a></li>
  <li><a href="/index.css" target="_blank">index.css</a></li>
  <li><a href="/index.html" target="_blank">index.html</a></li>
</ul>
</body></html>
```

#### `list.names`

Default: `['']`

Directory list can respond to different routes, declared in `list.names` options.

Note: if a file with the same name exists, the actual file is sent.

**Example:**

```js
fastify.register(require('fastify-static'), {
  root: path.join(__dirname, '/static'),
  prefix: '/public',
  prefixAvoidTrailingSlash: true,
  list: {
    format: 'json',
    names: ['index', 'index.json', '/']
  }
})
```

Dir list respond with the same content to

```bash
GET .../public
GET .../public/
GET .../public/index
GET .../public/index.json
```

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
