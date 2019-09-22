'use strict'

const path = require('path')
const fs = require('fs')
const url = require('url')
const http = require('http')
const t = require('tap')
const simple = require('simple-get')
const Fastify = require('fastify')
const compress = require('fastify-compress')
const concat = require('concat-stream')
const pino = require('pino')

const fastifyStatic = require('../')

const indexContent = fs.readFileSync('./test/static/index.html').toString('utf8')
const foobarContent = fs.readFileSync('./test/static/foobar.html').toString('utf8')
const deepContent = fs.readFileSync('./test/static/deep/path/for/test/purpose/foo.html').toString('utf8')
const innerIndex = fs.readFileSync('./test/static/deep/path/for/test/index.html').toString('utf8')

const GENERIC_RESPONSE_CHECK_COUNT = 5
function genericResponseChecks (t, response) {
  t.ok(/text\/(html|css)/.test(response.headers['content-type']))
  t.ok(response.headers.etag)
  t.ok(response.headers['last-modified'])
  t.ok(response.headers.date)
  t.ok(response.headers['cache-control'])
}

const GENERIC_ERROR_RESPONSE_CHECK_COUNT = 2
function genericErrorResponseChecks (t, response) {
  t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
  t.ok(response.headers.date)
}

t.test('register /static', t => {
  t.plan(11)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static'
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    t.test('/static/index.html', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/index.css', t => {
      t.plan(2 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.css'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static', t => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
      })
    })

    t.test('/static/deep/path/for/test/purpose/foo.html', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/deep/path/for/test/purpose/foo.html'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), deepContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/deep/path/for/test/', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/deep/path/for/test/'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), innerIndex)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/this/path/for/test', t => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/this/path/for/test',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('/static/this/path/doesnt/exist.html', t => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/this/path/doesnt/exist.html',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('/static/../index.js', t => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/../index.js',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 403)
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('file not exposed outside of the plugin', t => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        // foobar is in static
        url: 'http://localhost:' + fastify.server.address().port + '/foobar.html'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
      })
    })
  })
})

t.test('register /static/', t => {
  t.plan(11)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static/'
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    t.test('/static/index.html', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/index.css', t => {
      t.plan(2 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.css'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static', t => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
      })
    })

    t.test('/static/deep/path/for/test/purpose/foo.html', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/deep/path/for/test/purpose/foo.html'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), deepContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/deep/path/for/test/', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/deep/path/for/test/'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), innerIndex)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/this/path/for/test', t => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/this/path/for/test',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('/static/this/path/doesnt/exist.html', t => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/this/path/doesnt/exist.html',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('/static/../index.js', t => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/../index.js',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 403)
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('304', t => {
      t.plan(5 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.html'
      }, (err, response, body) => {
        t.error(err)
        const etag = response.headers.etag
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), indexContent)
        genericResponseChecks(t, response)

        simple.concat({
          method: 'GET',
          url: 'http://localhost:' + fastify.server.address().port + '/static/index.html',
          headers: {
            'if-none-match': etag
          }
        }, (err, response, body) => {
          t.error(err)
          t.strictEqual(response.statusCode, 304)
        })
      })
    })
  })
})

t.test('payload.filename is set', t => {
  t.plan(3)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static/'
  }
  const fastify = Fastify()
  var gotFilename
  fastify.register(fastifyStatic, pluginOptions)
  fastify.addHook('onSend', function (req, reply, payload, next) {
    gotFilename = payload.filename
    next()
  })

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    t.test('/static/index.html', t => {
      t.plan(5 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), indexContent)
        t.is(typeof gotFilename, 'string')
        t.strictEqual(gotFilename, path.join(pluginOptions.root, 'index.html'))
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/this/path/doesnt/exist.html', t => {
      t.plan(3 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/this/path/doesnt/exist.html',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
        t.is(typeof gotFilename, 'undefined')
        genericErrorResponseChecks(t, response)
      })
    })
  })
})

t.test('error responses can be customized with fastify.setErrorHandler()', t => {
  t.plan(2)

  const pluginOptions = {
    root: path.join(__dirname, '/static')
  }
  const fastify = Fastify()

  fastify.setErrorHandler(function errorHandler (err, request, reply) {
    reply.type('text/plain').send(err.status + ' Custom error message')
  })

  fastify.register(fastifyStatic, pluginOptions)

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    t.test('/../index.js', t => {
      t.plan(4)

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/../index.js',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 403)
        t.strictEqual(response.headers['content-type'], 'text/plain')
        t.strictEqual(body.toString(), '403 Custom error message')
      })
    })
  })
})

t.test('not found responses can be customized with fastify.setNotFoundHandler()', t => {
  t.plan(2)

  const pluginOptions = {
    root: path.join(__dirname, '/static')
  }
  const fastify = Fastify()

  fastify.setNotFoundHandler(function notFoundHandler (request, reply) {
    reply.code(404).type('text/plain').send(request.req.url + ' Not Found')
  })

  fastify.register(fastifyStatic, pluginOptions)

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    t.test('/path/does/not/exist.html', t => {
      t.plan(4)

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/path/does/not/exist.html',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
        t.strictEqual(response.headers['content-type'], 'text/plain')
        t.strictEqual(body.toString(), '/path/does/not/exist.html Not Found')
      })
    })
  })
})

t.test('serving disabled', t => {
  t.plan(3)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static/',
    serve: false
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  fastify.get('/foo/bar', (request, reply) => {
    reply.sendFile('index.html')
  })

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    t.test('/static/index.html not found', t => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
      })
    })

    t.test('/static/index.html via sendFile found', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/foo/bar'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })
  })
})

t.test('sendFile', t => {
  t.plan(2)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static'
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  fastify.get('/foo/bar', function (req, reply) {
    reply.sendFile('/index.html')
  })

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    t.test('reply.sendFile()', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/foo/bar',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })
  })
})

t.test('sendFile disabled', t => {
  t.plan(2)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static',
    decorateReply: false
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  fastify.get('/foo/bar', function (req, reply) {
    if (typeof reply.sendFile === 'undefined') {
      reply.send('pass')
    } else {
      reply.send('fail')
    }
  })

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    t.test('reply.sendFile undefined', t => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/foo/bar',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), 'pass')
      })
    })
  })
})

t.test('prefix default', t => {
  t.plan(1)
  const pluginOptions = { root: path.join(__dirname, 'static') }
  const fastify = Fastify({ logger: false })
  t.doesNotThrow(() => fastify.register(fastifyStatic, pluginOptions))
})

t.test('root not found warning', t => {
  t.plan(2)
  const rootPath = path.join(__dirname, 'does-not-exist')
  const pluginOptions = { root: rootPath }
  const destination = concat(data => {
    t.equal(JSON.parse(data).msg, `"root" path "${rootPath}" must exist`)
  })
  const logger = pino({
    level: 'warn'
  }, destination)
  const fastify = Fastify({ logger: logger })
  fastify.register(fastifyStatic, pluginOptions)
  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()
    destination.end()
  })
})

t.test('send options', t => {
  t.plan(11)
  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    acceptRanges: 'acceptRanges',
    cacheControl: 'cacheControl',
    dotfiles: 'dotfiles',
    etag: 'etag',
    extensions: 'extensions',
    immutable: 'immutable',
    index: 'index',
    lastModified: 'lastModified',
    maxAge: 'maxAge'
  }
  const fastify = Fastify({ logger: false })
  const fastifyStatic = require('proxyquire')('../', {
    send: function sendStub (req, pathName, options) {
      t.strictEqual(pathName, '/index.html')
      t.strictEqual(options.root, path.join(__dirname, '/static'))
      t.strictEqual(options.acceptRanges, 'acceptRanges')
      t.strictEqual(options.cacheControl, 'cacheControl')
      t.strictEqual(options.dotfiles, 'dotfiles')
      t.strictEqual(options.etag, 'etag')
      t.strictEqual(options.extensions, 'extensions')
      t.strictEqual(options.immutable, 'immutable')
      t.strictEqual(options.index, 'index')
      t.strictEqual(options.lastModified, 'lastModified')
      t.strictEqual(options.maxAge, 'maxAge')
      return { on: () => {}, pipe: () => {} }
    }
  })
  fastify.register(fastifyStatic, pluginOptions)
  fastify.inject({ url: '/index.html' })
})

t.test('setHeaders option', t => {
  t.plan(6 + GENERIC_RESPONSE_CHECK_COUNT)

  const pluginOptions = {
    root: path.join(__dirname, 'static'),
    setHeaders: function (res, pathName) {
      t.strictEqual(pathName, path.join(__dirname, 'static/index.html'))
      res.setHeader('X-Test-Header', 'test')
    }
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    simple.concat({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/index.html',
      followRedirect: false
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['x-test-header'], 'test')
      t.strictEqual(body.toString(), indexContent)
      genericResponseChecks(t, response)
    })
  })
})

t.test('maxAge option', t => {
  t.plan(5 + GENERIC_RESPONSE_CHECK_COUNT)

  const pluginOptions = {
    root: path.join(__dirname, 'static'),
    maxAge: 3600000
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    simple.concat({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/index.html',
      followRedirect: false
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['cache-control'], 'public, max-age=3600')
      t.strictEqual(body.toString(), indexContent)
      genericResponseChecks(t, response)
    })
  })
})

t.test('errors', t => {
  t.plan(5)

  t.test('no root', t => {
    t.plan(1)
    const pluginOptions = {}
    const fastify = Fastify({ logger: false })
    fastify.register(fastifyStatic, pluginOptions)
      .ready(err => {
        t.equal(err.constructor, Error)
      })
  })

  t.test('root is not a string', t => {
    t.plan(1)
    const pluginOptions = { root: 42 }
    const fastify = Fastify({ logger: false })
    fastify.register(fastifyStatic, pluginOptions)
      .ready(err => {
        t.equal(err.constructor, Error)
      })
  })

  t.test('root is not an absolute path', t => {
    t.plan(1)
    const pluginOptions = { root: './my/path' }
    const fastify = Fastify({ logger: false })
    fastify.register(fastifyStatic, pluginOptions)
      .ready(err => {
        t.equal(err.constructor, Error)
      })
  })

  t.test('root is not a directory', t => {
    t.plan(1)
    const pluginOptions = { root: __filename }
    const fastify = Fastify({ logger: false })
    fastify.register(fastifyStatic, pluginOptions)
      .ready(err => {
        t.equal(err.constructor, Error)
      })
  })

  t.test('setHeaders is not a function', t => {
    t.plan(1)
    const pluginOptions = { root: __dirname, setHeaders: 'headers' }
    const fastify = Fastify({ logger: false })
    fastify.register(fastifyStatic, pluginOptions)
      .ready(err => {
        t.equal(err.constructor, TypeError)
      })
  })
})

t.test('register no prefix', t => {
  t.plan(8)

  const pluginOptions = {
    root: path.join(__dirname, '/static')
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  fastify.get('/', (request, reply) => {
    reply.send({ hello: 'world' })
  })

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    t.test('/index.html', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/index.css', t => {
      t.plan(2 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/index.css'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        genericResponseChecks(t, response)
      })
    })

    t.test('/', t => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(JSON.parse(body), { hello: 'world' })
      })
    })

    t.test('/deep/path/for/test/purpose/foo.html', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/deep/path/for/test/purpose/foo.html'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), deepContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/deep/path/for/test/', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/deep/path/for/test/'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), innerIndex)
        genericResponseChecks(t, response)
      })
    })

    t.test('/this/path/doesnt/exist.html', t => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/this/path/doesnt/exist.html',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('/../index.js', t => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/../index.js',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 403)
        genericErrorResponseChecks(t, response)
      })
    })
  })
})

t.test('with fastify-compress', t => {
  t.plan(3)

  const pluginOptions = {
    root: path.join(__dirname, '/static')
  }
  const fastify = Fastify()
  fastify.register(compress, { threshold: 0 })
  fastify.register(fastifyStatic, pluginOptions)

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    t.test('deflate', function (t) {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/index.html',
        headers: {
          'accept-encoding': ['deflate']
        }
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(response.headers['content-encoding'], 'deflate')
        genericResponseChecks(t, response)
      })
    })

    t.test('gzip', function (t) {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(response.headers['content-encoding'], 'gzip')
        genericResponseChecks(t, response)
      })
    })
  })
})

t.test('register /static/ with schemaHide true', t => {
  t.plan(3)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static/',
    schemaHide: true
  }

  const fastify = Fastify()

  fastify.addHook('onRoute', function (routeOptions) {
    t.deepEqual(routeOptions.schema, { hide: true })
  })

  fastify.register(fastifyStatic, pluginOptions)

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    t.test('/static/index.html', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })
  })
})

t.test('register /static/ with schemaHide false', t => {
  t.plan(3)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static/',
    schemaHide: false
  }

  const fastify = Fastify()

  fastify.addHook('onRoute', function (routeOptions) {
    t.deepEqual(routeOptions.schema, { hide: false })
  })

  fastify.register(fastifyStatic, pluginOptions)

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    t.test('/static/index.html', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })
  })
})

t.test('register /static/ without schemaHide', t => {
  t.plan(3)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static/'
  }

  const fastify = Fastify()

  fastify.addHook('onRoute', function (routeOptions) {
    t.deepEqual(routeOptions.schema, { hide: true })
  })

  fastify.register(fastifyStatic, pluginOptions)

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    t.test('/static/index.html', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })
  })
})

t.test('register with wildcard false', t => {
  t.plan(8)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    wildcard: false
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  fastify.get('/*', (request, reply) => {
    reply.send({ hello: 'world' })
  })

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    t.test('/index.html', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/index.css', t => {
      t.plan(2 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/index.css'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        genericResponseChecks(t, response)
      })
    })

    t.test('/', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/not-defined', t => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/not-defined'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(JSON.parse(body), { hello: 'world' })
      })
    })

    t.test('/deep/path/for/test/purpose/foo.html', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/deep/path/for/test/purpose/foo.html'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), deepContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/deep/path/for/test/', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/deep/path/for/test/'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), innerIndex)
        genericResponseChecks(t, response)
      })
    })

    t.test('/../index.js', t => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/../index.js',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(JSON.parse(body), { hello: 'world' })
      })
    })
  })
})

t.test('register with wildcard "**/index.html"', t => {
  t.plan(8)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    wildcard: '**/index.html'
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  fastify.get('/*', (request, reply) => {
    reply.send({ hello: 'world' })
  })

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    t.test('/index.html', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/index.css', t => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/index.css'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('/', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/not-defined', t => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/not-defined'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(JSON.parse(body), { hello: 'world' })
      })
    })

    t.test('/deep/path/for/test/purpose/foo.html', t => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/deep/path/for/test/purpose/foo.html'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('/deep/path/for/test/', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/deep/path/for/test/'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), innerIndex)
        genericResponseChecks(t, response)
      })
    })

    t.test('/../index.js', t => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/../index.js',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(JSON.parse(body), { hello: 'world' })
      })
    })
  })
})

t.test('register with wildcard "**/foo.*"', t => {
  t.plan(8)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    wildcard: '**/foo.*'
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  fastify.get('/*', (request, reply) => {
    reply.send({ hello: 'world' })
  })

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    t.test('/index.html', t => {
      t.plan(3 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(JSON.parse(body), { hello: 'world' })

        genericErrorResponseChecks(t, response)
      })
    })

    t.test('/index.css', t => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/index.css'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('/', t => {
      t.plan(3 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(JSON.parse(body), { hello: 'world' })
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('/not-defined', t => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/not-defined'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(JSON.parse(body), { hello: 'world' })
      })
    })

    t.test('/deep/path/for/test/purpose/foo.html', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/deep/path/for/test/purpose/foo.html'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), deepContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/deep/path/for/test/', t => {
      t.plan(3 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/deep/path/for/test/'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(JSON.parse(body), { hello: 'world' })
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('/../index.js', t => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/../index.js',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(JSON.parse(body), { hello: 'world' })
      })
    })
  })
})

t.test('register with wildcard false and alternative index', t => {
  t.plan(8)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    wildcard: false,
    index: ['foobar.html', 'foo.html', 'index.html']
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  fastify.get('/*', (request, reply) => {
    reply.send({ hello: 'world' })
  })

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    t.test('/index.html', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/index.css', t => {
      t.plan(2 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/index.css'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        genericResponseChecks(t, response)
      })
    })

    t.test('/?a=b', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), foobarContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/not-defined', t => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/not-defined'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(JSON.parse(body), { hello: 'world' })
      })
    })

    t.test('/deep/path/for/test/purpose/', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/deep/path/for/test/purpose/'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), deepContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/deep/path/for/test/', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/deep/path/for/test/'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), innerIndex)
        genericResponseChecks(t, response)
      })
    })

    t.test('/../index.js', t => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/../index.js',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(JSON.parse(body), { hello: 'world' })
      })
    })
  })
})

t.test('register /static with wildcard false and alternative index', t => {
  t.plan(9)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static',
    wildcard: false,
    index: ['foobar.html', 'foo.html', 'index.html']
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  fastify.get('/*', (request, reply) => {
    reply.send({ hello: 'world' })
  })

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    t.test('/static/index.html', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/index.css', t => {
      t.plan(2 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.css'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static', t => {
      t.plan(2)

      // simple-get doesn't tell us about redirects so use http.request directly
      // to verify we do not get a redirect when not requested
      const testurl = 'http://localhost:' + fastify.server.address().port + '/static'
      const req = http.request(url.parse(testurl), res => {
        t.strictEqual(res.statusCode, 200)
        let body = ''
        res.on('data', chunk => {
          body += chunk.toString()
        })
        res.on('end', () => {
          t.deepEqual(JSON.parse(body.toString()), { hello: 'world' })
        })
      })
      req.on('error', err => console.error(err))
      req.end()
    })

    t.test('/static/', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), foobarContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/not-defined', t => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/not-defined'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(JSON.parse(body), { hello: 'world' })
      })
    })

    t.test('/static/deep/path/for/test/purpose/', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/deep/path/for/test/purpose/'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), deepContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/deep/path/for/test/', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/deep/path/for/test/'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), innerIndex)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/../index.js', t => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/../index.js',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(JSON.parse(body), { hello: 'world' })
      })
    })
  })
})

t.test('register /static with redirect true', t => {
  t.plan(6)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static',
    redirect: true,
    index: 'index.html'
  }

  const fastify = Fastify()

  fastify.register(fastifyStatic, pluginOptions)

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(3001, err => {
    t.error(err)

    fastify.server.unref()

    t.test('/static?a=b', t => {
      t.plan(5 + GENERIC_RESPONSE_CHECK_COUNT)

      // simple-get doesn't tell us about redirects so use http.request directly
      const testurl = 'http://localhost:' + fastify.server.address().port + '/static?a=b'
      const req = http.request(url.parse(testurl), res => {
        t.strictEqual(res.statusCode, 301)
        t.strictEqual(res.headers['location'], '/static/?a=b')
      })
      req.on('error', err => console.error(err))
      req.end()

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static?a=b'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/deep', t => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/deep'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('/static/deep/path/for/test?a=b', t => {
      t.plan(5 + GENERIC_RESPONSE_CHECK_COUNT)

      // simple-get doesn't tell us about redirects so use http.request directly
      const testurl = 'http://localhost:' + fastify.server.address().port + '/static/deep/path/for/test?a=b'
      const req = http.request(url.parse(testurl), res => {
        t.strictEqual(res.statusCode, 301)
        t.strictEqual(res.headers['location'], '/static/deep/path/for/test/?a=b')
      })
      req.on('error', err => console.error(err))
      req.end()

      // verify the redirect with query parameters works
      simple.concat({
        method: 'GET',
        url: testurl
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), innerIndex)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/deep/path/for/test', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/deep/path/for/test'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), innerIndex)
        genericResponseChecks(t, response)
      })
    })
  })
})

t.test('register /static with redirect true and wildcard false', t => {
  t.plan(6)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static',
    redirect: true,
    wildcard: false,
    index: 'index.html'
  }

  const fastify = Fastify()

  fastify.register(fastifyStatic, pluginOptions)

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(3001, err => {
    t.error(err)

    fastify.server.unref()

    t.test('/static?a=b', t => {
      t.plan(5 + GENERIC_RESPONSE_CHECK_COUNT)

      // simple-get doesn't tell us about redirects so use http.request directly
      const testurl = 'http://localhost:' + fastify.server.address().port + '/static?a=b'
      const req = http.request(url.parse(testurl), res => {
        t.strictEqual(res.statusCode, 301)
        t.strictEqual(res.headers['location'], '/static/?a=b')
      })
      req.on('error', err => console.error(err))
      req.end()

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static?a=b'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/?a=b', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/?a=b'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/deep', t => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/deep'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('/static/deep/path/for/test?a=b', t => {
      t.plan(5 + GENERIC_RESPONSE_CHECK_COUNT)

      // simple-get doesn't tell us about redirects so use http.request directly
      const testurl = 'http://localhost:' + fastify.server.address().port + '/static/deep/path/for/test?a=b'
      const req = http.request(url.parse(testurl), res => {
        t.strictEqual(res.statusCode, 301)
        t.strictEqual(res.headers['location'], '/static/deep/path/for/test/?a=b')
      })
      req.on('error', err => console.error(err))
      req.end()

      // verify the redirect with query parameters works
      simple.concat({
        method: 'GET',
        url: testurl
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), innerIndex)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/deep/path/for/test', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/deep/path/for/test'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), innerIndex)
        genericResponseChecks(t, response)
      })
    })
  })
})
