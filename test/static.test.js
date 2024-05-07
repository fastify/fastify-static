'use strict'

/* eslint n/no-deprecated-api: "off" */

const path = require('node:path')
const fs = require('node:fs')
const url = require('node:url')
const http = require('node:http')
const t = require('tap')
const simple = require('simple-get')
const Fastify = require('fastify')
const compress = require('@fastify/compress')
const concat = require('concat-stream')
const pino = require('pino')
const proxyquire = require('proxyquire')

const fastifyStatic = require('../')

const indexContent = fs
  .readFileSync('./test/static/index.html')
  .toString('utf8')
const index2Content = fs
  .readFileSync('./test/static2/index.html')
  .toString('utf8')
const foobarContent = fs
  .readFileSync('./test/static/foobar.html')
  .toString('utf8')
const deepContent = fs
  .readFileSync('./test/static/deep/path/for/test/purpose/foo.html')
  .toString('utf8')
const innerIndex = fs
  .readFileSync('./test/static/deep/path/for/test/index.html')
  .toString('utf8')
const allThreeBr = fs.readFileSync(
  './test/static-pre-compressed/all-three.html.br'
)
const allThreeGzip = fs.readFileSync(
  './test/static-pre-compressed/all-three.html.gz'
)
const gzipOnly = fs.readFileSync(
  './test/static-pre-compressed/gzip-only.html.gz'
)
const indexBr = fs.readFileSync(
  './test/static-pre-compressed/index.html.br'
)
const dirIndexBr = fs.readFileSync(
  './test/static-pre-compressed/dir/index.html.br'
)
const dirIndexGz = fs.readFileSync(
  './test/static-pre-compressed/dir-gz/index.html.gz'
)
const uncompressedStatic = fs
  .readFileSync('./test/static-pre-compressed/uncompressed.html')
  .toString('utf8')
const fooContent = fs.readFileSync('./test/static/foo.html').toString('utf8')
const barContent = fs.readFileSync('./test/static2/bar.html').toString('utf8')
const jsonHiddenContent = fs.readFileSync('./test/static-hidden/.hidden/sample.json').toString('utf8')

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
  t.equal(response.headers['content-type'], 'application/json; charset=utf-8')
  t.ok(response.headers.date)
}

t.test('register /static prefixAvoidTrailingSlash', t => {
  t.plan(12)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static',
    prefixAvoidTrailingSlash: true
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    t.test('/static/index.html', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/index.css', (t) => {
      t.plan(2 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.css'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/deep/path/for/test/purpose/foo.html', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/deep/path/for/test/purpose/foo.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), deepContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/deep/path/for/test/', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/deep/path/for/test/'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), innerIndex)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/this/path/for/test', (t) => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/this/path/for/test',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('/static/this/path/doesnt/exist.html', (t) => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/this/path/doesnt/exist.html',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('/static/../index.js', (t) => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/../index.js',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 403)
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('file not exposed outside of the plugin', (t) => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        // foobar is in static
        url: 'http://localhost:' + fastify.server.address().port + '/foobar.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
      })
    })

    t.test('file not exposed outside of the plugin', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'HEAD',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), '')
        genericResponseChecks(t, response)
      })
    })
  })
})

t.test('register /static', (t) => {
  t.plan(11)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static'
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    t.test('/static/index.html', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/index.css', (t) => {
      t.plan(2 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.css'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static', (t) => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
      })
    })

    t.test('/static/deep/path/for/test/purpose/foo.html', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/deep/path/for/test/purpose/foo.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), deepContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/deep/path/for/test/', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/deep/path/for/test/'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), innerIndex)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/this/path/for/test', (t) => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/this/path/for/test',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('/static/this/path/doesnt/exist.html', (t) => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/this/path/doesnt/exist.html',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('/static/../index.js', (t) => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/../index.js',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 403)
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('file not exposed outside of the plugin', (t) => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        // foobar is in static
        url: 'http://localhost:' + fastify.server.address().port + '/foobar.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
      })
    })
  })
})

t.test('register /static/', t => {
  t.plan(12)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static/'
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    t.test('/static/index.html', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/index.html', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'HEAD',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), '')
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/index.css', (t) => {
      t.plan(2 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.css'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static', (t) => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
      })
    })

    t.test('/static/deep/path/for/test/purpose/foo.html', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/deep/path/for/test/purpose/foo.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), deepContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/deep/path/for/test/', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/deep/path/for/test/'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), innerIndex)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/this/path/for/test', (t) => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/this/path/for/test',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('/static/this/path/doesnt/exist.html', (t) => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/this/path/doesnt/exist.html',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('/static/../index.js', (t) => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/../index.js',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 403)
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
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)

        simple.concat({
          method: 'GET',
          url: 'http://localhost:' + fastify.server.address().port + '/static/index.html',
          headers: {
            'if-none-match': etag
          }
        }, (err, response, body) => {
          t.error(err)
          t.equal(response.statusCode, 304)
        })
      })
    })
  })
})

t.test('register /static and /static2', (t) => {
  t.plan(5)

  const pluginOptions = {
    root: [path.join(__dirname, '/static'), path.join(__dirname, '/static2')],
    prefix: '/static'
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  fastify.get('/foo', (req, rep) => {
    rep.sendFile('foo.html')
  })

  fastify.get('/bar', (req, rep) => {
    rep.sendFile('bar.html')
  })

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    t.test('/static/index.html', (t) => {
      t.plan(4 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.not(body.toString(), index2Content)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/bar.html', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/bar.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), barContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('sendFile foo.html', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/foo'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), fooContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('sendFile bar.html', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/bar'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), barContent)
        genericResponseChecks(t, response)
      })
    })
  })
})

t.test('register /static with constraints', (t) => {
  t.plan(3)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static',
    constraints: {
      host: 'example.com'
    }
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    t.test('example.com/static/index.html', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.html',
        headers: {
          host: 'example.com'
        }
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('not-example.com/static/index.html', (t) => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.html',
        headers: {
          host: 'not-example.com'
        }
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        genericErrorResponseChecks(t, response)
      })
    })
  })
})

t.test('payload.filename is set', (t) => {
  t.plan(3)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static/'
  }
  const fastify = Fastify()
  let gotFilename
  fastify.register(fastifyStatic, pluginOptions)
  fastify.addHook('onSend', function (req, reply, payload, next) {
    gotFilename = payload.filename
    next()
  })

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    t.test('/static/index.html', (t) => {
      t.plan(5 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
        t.equal(typeof gotFilename, 'string')
        t.equal(gotFilename, path.join(pluginOptions.root, 'index.html'))
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/this/path/doesnt/exist.html', (t) => {
      t.plan(3 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/this/path/doesnt/exist.html',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        t.equal(typeof gotFilename, 'undefined')
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
    reply.code(403).type('text/plain').send(err.status + ' Custom error message')
  })

  fastify.register(fastifyStatic, pluginOptions)

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
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
        t.equal(response.statusCode, 403)
        t.equal(response.headers['content-type'], 'text/plain')
        t.equal(body.toString(), '403 Custom error message')
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
    reply.code(404).type('text/plain').send(request.raw.url + ' Not Found')
  })

  fastify.register(fastifyStatic, pluginOptions)

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
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
        t.equal(response.statusCode, 404)
        t.equal(response.headers['content-type'], 'text/plain')
        t.equal(body.toString(), '/path/does/not/exist.html Not Found')
      })
    })
  })
})

t.test('fastify.setNotFoundHandler() is called for dotfiles when when send is configured to ignore dotfiles', t => {
  t.plan(2)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    send: {
      dotfiles: 'ignore'
    }
  }
  const fastify = Fastify()

  fastify.setNotFoundHandler(function notFoundHandler (request, reply) {
    reply.code(404).type('text/plain').send(request.raw.url + ' Not Found')
  })

  fastify.register(fastifyStatic, pluginOptions)

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    fastify.server.unref()

    // Requesting files with a leading dot doesn't follow the same code path as
    // other 404 errors
    t.test('/path/does/not/.exist.html', t => {
      t.plan(4)

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/path/does/not/.exist.html',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        t.equal(response.headers['content-type'], 'text/plain')
        t.equal(body.toString(), '/path/does/not/.exist.html Not Found')
      })
    })
  })
})

t.test('serving disabled', (t) => {
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

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    t.test('/static/index.html not found', (t) => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
      })
    })

    t.test('/static/index.html via sendFile found', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/foo/bar'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })
  })
})

t.test('sendFile', (t) => {
  t.plan(5)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static'
  }
  const fastify = Fastify()
  const maxAge = Math.round(Math.random() * 10) * 10000
  fastify.register(fastifyStatic, pluginOptions)

  fastify.get('/foo/bar', function (req, reply) {
    reply.sendFile('/index.html')
  })

  fastify.get('/root/path/override/test', (request, reply) => {
    reply.sendFile(
      '/foo.html',
      path.join(__dirname, 'static', 'deep', 'path', 'for', 'test', 'purpose')
    )
  })

  fastify.get('/foo/bar/options/override/test', function (req, reply) {
    reply.sendFile('/index.html', { maxAge })
  })

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    t.test('reply.sendFile()', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/foo/bar',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('reply.sendFile() with rootPath', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/root/path/override/test',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), deepContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('reply.sendFile() again without root path', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/foo/bar',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('reply.sendFile() with options', (t) => {
      t.plan(4 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/foo/bar/options/override/test',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(response.headers['cache-control'], `public, max-age=${maxAge / 1000}`)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })
  })
})

t.test('sendFile disabled', (t) => {
  t.plan(2)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static',
    decorateReply: false
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  fastify.get('/foo/bar', function (req, reply) {
    if (reply.sendFile === undefined) {
      reply.send('pass')
    } else {
      reply.send('fail')
    }
  })

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    t.test('reply.sendFile undefined', (t) => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/foo/bar',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), 'pass')
      })
    })
  })
})

t.test('allowedPath option - pathname', (t) => {
  t.plan(3)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    allowedPath: (pathName) => pathName !== '/foobar.html'
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)
  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    t.test('/foobar.html not found', (t) => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/foobar.html',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('/index.css found', (t) => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/index.css',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
      })
    })
  })
})

t.test('allowedPath option - request', (t) => {
  t.plan(3)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    allowedPath: (pathName, root, request) => request.query.key === 'temporaryKey'
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)
  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    t.test('/foobar.html not found', (t) => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/foobar.html',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('/index.css found', (t) => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/index.css?key=temporaryKey',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
      })
    })
  })
})

t.test('download', (t) => {
  t.plan(7)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static'
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  fastify.get('/foo/bar', function (req, reply) {
    reply.download('/index.html')
  })

  fastify.get('/foo/bar/change', function (req, reply) {
    reply.download('/index.html', 'hello-world.html')
  })

  fastify.get('/foo/bar/override', function (req, reply) {
    reply.download('/index.html', 'hello-world.html', {
      maxAge: '2 hours',
      immutable: true
    })
  })

  fastify.get('/foo/bar/override/2', function (req, reply) {
    reply.download('/index.html', { acceptRanges: false })
  })

  fastify.get('/root/path/override/test', (request, reply) => {
    reply.download('/foo.html', {
      root: path.join(
        __dirname,
        'static',
        'deep',
        'path',
        'for',
        'test',
        'purpose'
      )
    })
  })

  fastify.get('/root/path/override/test/change', (request, reply) => {
    reply.download('/foo.html', 'hello-world.html', {
      root: path.join(
        __dirname,
        'static',
        'deep',
        'path',
        'for',
        'test',
        'purpose'
      )
    })
  })

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    t.test('reply.download()', (t) => {
      t.plan(4 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/foo/bar',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(response.headers['content-disposition'], 'attachment; filename="index.html"')
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('reply.download() with fileName', t => {
      t.plan(4 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/foo/bar/change',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(response.headers['content-disposition'], 'attachment; filename="hello-world.html"')
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('reply.download() with fileName', (t) => {
      t.plan(4 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/root/path/override/test',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(response.headers['content-disposition'], 'attachment; filename="foo.html"')
        t.equal(body.toString(), deepContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('reply.download() with custom opts', (t) => {
      t.plan(5 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/foo/bar/override',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(response.headers['content-disposition'], 'attachment; filename="hello-world.html"')
        t.equal(response.headers['cache-control'], 'public, max-age=7200, immutable')
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('reply.download() with custom opts (2)', (t) => {
      t.plan(5 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/foo/bar/override/2',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(response.headers['content-disposition'], 'attachment; filename="index.html"')
        t.equal(response.headers['accept-ranges'], undefined)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('reply.download() with rootPath and fileName', (t) => {
      t.plan(4 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/root/path/override/test/change',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(response.headers['content-disposition'], 'attachment; filename="hello-world.html"')
        t.equal(body.toString(), deepContent)
        genericResponseChecks(t, response)
      })
    })
  })
})

t.test('sendFile disabled', (t) => {
  t.plan(2)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static',
    decorateReply: false
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  fastify.get('/foo/bar', function (req, reply) {
    if (reply.sendFile === undefined) {
      reply.send('pass')
    } else {
      reply.send('fail')
    }
  })

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    t.test('reply.sendFile undefined', (t) => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/foo/bar',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), 'pass')
      })
    })
  })
})

t.test('download disabled', (t) => {
  t.plan(3)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static',
    decorateReply: false
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  fastify.get('/foo/bar', function (req, reply) {
    if (reply.download === undefined) {
      t.equal(reply.download, undefined)
      reply.send('pass')
    } else {
      reply.send('fail')
    }
  })

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    t.test('reply.sendFile undefined', (t) => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/foo/bar',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), 'pass')
      })
    })
  })
})

t.test('prefix default', (t) => {
  t.plan(1)
  const pluginOptions = { root: path.join(__dirname, 'static') }
  const fastify = Fastify({ logger: false })
  t.doesNotThrow(() => fastify.register(fastifyStatic, pluginOptions))
})

t.test('root not found warning', (t) => {
  t.plan(2)
  const rootPath = path.join(__dirname, 'does-not-exist')
  const pluginOptions = { root: rootPath }
  const destination = concat((data) => {
    t.equal(JSON.parse(data).msg, `"root" path "${rootPath}" must exist`)
  })
  const logger = pino(
    {
      level: 'warn'
    },
    destination
  )
  const fastify = Fastify({ logger })
  fastify.register(fastifyStatic, pluginOptions)
  fastify.listen({ port: 0 }, (err) => {
    t.error(err)
    fastify.server.unref()
    destination.end()
  })
})

t.test('send options', (t) => {
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
    '@fastify/send': function sendStub (req, pathName, options) {
      t.equal(pathName, '/index.html')
      t.equal(options.root, path.join(__dirname, '/static'))
      t.equal(options.acceptRanges, 'acceptRanges')
      t.equal(options.cacheControl, 'cacheControl')
      t.equal(options.dotfiles, 'dotfiles')
      t.equal(options.etag, 'etag')
      t.equal(options.extensions, 'extensions')
      t.equal(options.immutable, 'immutable')
      t.equal(options.index, 'index')
      t.equal(options.lastModified, 'lastModified')
      t.equal(options.maxAge, 'maxAge')
      return { on: () => { }, pipe: () => { } }
    }
  })
  fastify.register(fastifyStatic, pluginOptions)
  fastify.inject({ url: '/index.html' })
})

t.test('setHeaders option', (t) => {
  t.plan(6 + GENERIC_RESPONSE_CHECK_COUNT)

  const pluginOptions = {
    root: path.join(__dirname, 'static'),
    setHeaders: function (res, pathName) {
      t.equal(pathName, path.join(__dirname, 'static/index.html'))
      res.setHeader('X-Test-Header', 'test')
    }
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    simple.concat({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/index.html',
      followRedirect: false
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['x-test-header'], 'test')
      t.equal(body.toString(), indexContent)
      genericResponseChecks(t, response)
    })
  })
})

t.test('maxAge option', (t) => {
  t.plan(5 + GENERIC_RESPONSE_CHECK_COUNT)

  const pluginOptions = {
    root: path.join(__dirname, 'static'),
    maxAge: 3600000
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    simple.concat({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/index.html',
      followRedirect: false
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['cache-control'], 'public, max-age=3600')
      t.equal(body.toString(), indexContent)
      genericResponseChecks(t, response)
    })
  })
})

t.test('errors', (t) => {
  t.plan(11)

  t.test('no root', (t) => {
    t.plan(1)
    const pluginOptions = {}
    const fastify = Fastify({ logger: false })
    fastify.register(fastifyStatic, pluginOptions).ready((err) => {
      t.equal(err.constructor, Error)
    })
  })

  t.test('root is not a string', (t) => {
    t.plan(1)
    const pluginOptions = { root: 42 }
    const fastify = Fastify({ logger: false })
    fastify.register(fastifyStatic, pluginOptions).ready((err) => {
      t.equal(err.constructor, Error)
    })
  })

  t.test('root is not an absolute path', (t) => {
    t.plan(1)
    const pluginOptions = { root: './my/path' }
    const fastify = Fastify({ logger: false })
    fastify.register(fastifyStatic, pluginOptions).ready((err) => {
      t.equal(err.constructor, Error)
    })
  })

  t.test('root is not a directory', (t) => {
    t.plan(1)
    const pluginOptions = { root: __filename }
    const fastify = Fastify({ logger: false })
    fastify.register(fastifyStatic, pluginOptions).ready((err) => {
      t.equal(err.constructor, Error)
    })
  })

  t.test('root is an empty array', (t) => {
    t.plan(1)
    const pluginOptions = { root: [] }
    const fastify = Fastify({ logger: false })
    fastify.register(fastifyStatic, pluginOptions).ready((err) => {
      t.equal(err.constructor, Error)
    })
  })

  t.test('root array does not contain strings', (t) => {
    t.plan(1)
    const pluginOptions = { root: [1] }
    const fastify = Fastify({ logger: false })
    fastify.register(fastifyStatic, pluginOptions).ready((err) => {
      t.equal(err.constructor, Error)
    })
  })

  t.test('root array does not contain an absolute path', (t) => {
    t.plan(1)
    const pluginOptions = { root: ['./my/path'] }
    const fastify = Fastify({ logger: false })
    fastify.register(fastifyStatic, pluginOptions).ready((err) => {
      t.equal(err.constructor, Error)
    })
  })

  t.test('root array path is not a directory', (t) => {
    t.plan(1)
    const pluginOptions = { root: [__filename] }
    const fastify = Fastify({ logger: false })
    fastify.register(fastifyStatic, pluginOptions).ready((err) => {
      t.equal(err.constructor, Error)
    })
  })

  t.test('all root array paths must be valid', (t) => {
    t.plan(1)
    const pluginOptions = { root: [path.join(__dirname, '/static'), 1] }
    const fastify = Fastify({ logger: false })
    fastify.register(fastifyStatic, pluginOptions).ready((err) => {
      t.equal(err.constructor, Error)
    })
  })

  t.test('duplicate root paths are not allowed', (t) => {
    t.plan(1)
    const pluginOptions = {
      root: [path.join(__dirname, '/static'), path.join(__dirname, '/static')]
    }
    const fastify = Fastify({ logger: false })
    fastify.register(fastifyStatic, pluginOptions).ready((err) => {
      t.equal(err.constructor, Error)
    })
  })

  t.test('setHeaders is not a function', (t) => {
    t.plan(1)
    const pluginOptions = { root: __dirname, setHeaders: 'headers' }
    const fastify = Fastify({ logger: false })
    fastify.register(fastifyStatic, pluginOptions).ready((err) => {
      t.equal(err.constructor, TypeError)
    })
  })
})

t.test('register no prefix', (t) => {
  t.plan(8)

  const pluginOptions = {
    root: path.join(__dirname, '/static')
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  fastify.get('/', (request, reply) => {
    reply.send({ hello: 'world' })
  })

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    t.test('/index.html', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/index.css', (t) => {
      t.plan(2 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/index.css'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        genericResponseChecks(t, response)
      })
    })

    t.test('/', (t) => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(JSON.parse(body), { hello: 'world' })
      })
    })

    t.test('/deep/path/for/test/purpose/foo.html', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/deep/path/for/test/purpose/foo.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), deepContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/deep/path/for/test/', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/deep/path/for/test/'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), innerIndex)
        genericResponseChecks(t, response)
      })
    })

    t.test('/this/path/doesnt/exist.html', (t) => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/this/path/doesnt/exist.html',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('/../index.js', (t) => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/../index.js',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 403)
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

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
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
        t.equal(response.statusCode, 200)
        t.equal(response.headers['content-encoding'], 'deflate')
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
        t.equal(response.statusCode, 200)
        t.equal(response.headers['content-encoding'], 'gzip')
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
    t.same(routeOptions.schema, { hide: true })
  })

  fastify.register(fastifyStatic, pluginOptions)

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    t.test('/static/index.html', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
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
    t.same(routeOptions.schema, { hide: false })
  })

  fastify.register(fastifyStatic, pluginOptions)

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    t.test('/static/index.html', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
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
    t.same(routeOptions.schema, { hide: true })
  })

  fastify.register(fastifyStatic, pluginOptions)

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    t.test('/static/index.html', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })
  })
})

t.test('fastify with exposeHeadRoutes', t => {
  t.plan(2)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    wildcard: false
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    fastify.server.unref()

    t.test('/index.html', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'HEAD',
        url: 'http://localhost:' + fastify.server.address().port + '/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), '')
        genericResponseChecks(t, response)
      })
    })
  })
})

t.test('register with wildcard false', t => {
  t.plan(9)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    wildcard: false
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  fastify.get('/*', (request, reply) => {
    reply.send({ hello: 'world' })
  })

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    t.test('/index.html', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/index.css', (t) => {
      t.plan(2 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/index.css'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        genericResponseChecks(t, response)
      })
    })

    t.test('/', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/not-defined', (t) => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/not-defined'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(JSON.parse(body), { hello: 'world' })
      })
    })

    t.test('/deep/path/for/test/purpose/foo.html', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/deep/path/for/test/purpose/foo.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), deepContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/deep/path/for/test/', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/deep/path/for/test/'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), innerIndex)
        genericResponseChecks(t, response)
      })
    })

    t.test('/../index.js', (t) => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/../index.js',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(JSON.parse(body), { hello: 'world' })
      })
    })

    t.test('/index.css', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'HEAD',
        url: 'http://localhost:' + fastify.server.address().port + '/index.css'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), '')
        genericResponseChecks(t, response)
      })
    })
  })
})

t.test('register with wildcard false (trailing slash in the root)', t => {
  t.plan(6)

  const pluginOptions = {
    root: path.join(__dirname, '/static/'),
    prefix: '/assets/',
    index: false,
    wildcard: false
  }
  const fastify = Fastify({
    ignoreTrailingSlash: true
  })
  fastify.register(fastifyStatic, pluginOptions)

  fastify.get('/*', (request, reply) => {
    reply.send({ hello: 'world' })
  })

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    t.test('/index.css', (t) => {
      t.plan(2 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/assets/index.css'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        genericResponseChecks(t, response)
      })
    })

    t.test('/not-defined', (t) => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/assets/not-defined'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(JSON.parse(body), { hello: 'world' })
      })
    })

    t.test('/deep/path/for/test/purpose/foo.html', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/assets/deep/path/for/test/purpose/foo.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), deepContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/../index.js', (t) => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/assets/../index.js',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(JSON.parse(body), { hello: 'world' })
      })
    })

    t.test('/index.css', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'HEAD',
        url: 'http://localhost:' + fastify.server.address().port + '/assets/index.css'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), '')
        genericResponseChecks(t, response)
      })
    })
  })
})

t.test('register with wildcard string', (t) => {
  t.plan(1)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    wildcard: '**/index.html'
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  fastify.get('/*', (request, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.ready(function (err) {
    t.ok(err)
  })
})

t.test('register with wildcard string on multiple root paths', (t) => {
  t.plan(1)

  const pluginOptions = {
    root: [path.join(__dirname, '/static'), path.join(__dirname, '/static2')],
    wildcard: '**/*.js'
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  fastify.get('/*', (request, reply) => {
    reply.send({ hello: 'world' })
  })

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    t.ok(err)

    fastify.server.unref()
  })
})

t.test('register with wildcard false and alternative index', t => {
  t.plan(11)

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

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    t.test('/index.html', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/index.html', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'HEAD',
        url: 'http://localhost:' + fastify.server.address().port + '/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), '')
        genericResponseChecks(t, response)
      })
    })

    t.test('/index.css', (t) => {
      t.plan(2 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/index.css'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        genericResponseChecks(t, response)
      })
    })

    t.test('/?a=b', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), foobarContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/?a=b', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'HEAD',
        url: 'http://localhost:' + fastify.server.address().port
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), '')
        genericResponseChecks(t, response)
      })
    })

    t.test('/not-defined', (t) => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/not-defined'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(JSON.parse(body), { hello: 'world' })
      })
    })

    t.test('/deep/path/for/test/purpose/', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/deep/path/for/test/purpose/'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), deepContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/deep/path/for/test/', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/deep/path/for/test/'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), innerIndex)
        genericResponseChecks(t, response)
      })
    })

    t.test('/deep/path/for/test/', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'HEAD',
        url: 'http://localhost:' + fastify.server.address().port + '/deep/path/for/test/'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), '')
        genericResponseChecks(t, response)
      })
    })

    t.test('/../index.js', (t) => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/../index.js',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(JSON.parse(body), { hello: 'world' })
      })
    })
  })
})

t.test('register /static with wildcard false and alternative index', t => {
  t.plan(11)

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

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    t.test('/static/index.html', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/index.html', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'HEAD',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), '')
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/index.css', (t) => {
      t.plan(2 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.css'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static', (t) => {
      t.plan(2)

      // simple-get doesn't tell us about redirects so use http.request directly
      // to verify we do not get a redirect when not requested
      const testurl = 'http://localhost:' + fastify.server.address().port + '/static'
      const req = http.request(url.parse(testurl), res => {
        t.equal(res.statusCode, 200)
        let body = ''
        res.on('data', (chunk) => {
          body += chunk.toString()
        })
        res.on('end', () => {
          t.same(JSON.parse(body.toString()), { hello: 'world' })
        })
      })
      req.on('error', (err) => console.error(err))
      req.end()
    })

    t.test('/static/', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), foobarContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'HEAD',
        url: 'http://localhost:' + fastify.server.address().port + '/static/'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), '')
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/not-defined', (t) => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/not-defined'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(JSON.parse(body), { hello: 'world' })
      })
    })

    t.test('/static/deep/path/for/test/purpose/', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/deep/path/for/test/purpose/'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), deepContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/deep/path/for/test/', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/deep/path/for/test/'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), innerIndex)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/../index.js', (t) => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/../index.js',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(JSON.parse(body), { hello: 'world' })
      })
    })
  })
})

t.test('register /static with redirect true', t => {
  t.plan(7)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static',
    redirect: true,
    index: 'index.html'
  }

  const fastify = Fastify()

  fastify.register(fastifyStatic, pluginOptions)

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    t.test('/static?a=b', (t) => {
      t.plan(5 + GENERIC_RESPONSE_CHECK_COUNT)

      // simple-get doesn't tell us about redirects so use http.request directly
      const testurl = 'http://localhost:' + fastify.server.address().port + '/static?a=b'
      const req = http.request(url.parse(testurl), res => {
        t.equal(res.statusCode, 301)
        t.equal(res.headers.location, '/static/?a=b')
      })
      req.on('error', (err) => console.error(err))
      req.end()

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static?a=b'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static', t => {
      t.plan(2)

      // simple-get doesn't tell us about redirects so use http.request directly
      const testurl = 'http://localhost:' + fastify.server.address().port + '/static'
      const req = http.request(url.parse(testurl), res => {
        t.equal(res.statusCode, 301)
        t.equal(res.headers.location, '/static/')
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
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/deep', (t) => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/deep'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('/static/deep/path/for/test?a=b', (t) => {
      t.plan(5 + GENERIC_RESPONSE_CHECK_COUNT)

      // simple-get doesn't tell us about redirects so use http.request directly
      const testurl = 'http://localhost:' + fastify.server.address().port + '/static/deep/path/for/test?a=b'
      const req = http.request(url.parse(testurl), res => {
        t.equal(res.statusCode, 301)
        t.equal(res.headers.location, '/static/deep/path/for/test/?a=b')
      })
      req.on('error', (err) => console.error(err))
      req.end()

      // verify the redirect with query parameters works
      simple.concat({
        method: 'GET',
        url: testurl
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), innerIndex)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/deep/path/for/test', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/deep/path/for/test'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), innerIndex)
        genericResponseChecks(t, response)
      })
    })
  })
})

t.test('register /static with redirect true and wildcard false', t => {
  t.plan(8)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static',
    redirect: true,
    wildcard: false,
    index: 'index.html'
  }

  const fastify = Fastify()

  fastify.register(fastifyStatic, pluginOptions)

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    fastify.server.unref()

    t.test('/static?a=b', t => {
      t.plan(5 + GENERIC_RESPONSE_CHECK_COUNT)

      // simple-get doesn't tell us about redirects so use http.request directly
      const testurl = 'http://localhost:' + fastify.server.address().port + '/static?a=b'
      const req = http.request(url.parse(testurl), res => {
        t.equal(res.statusCode, 301)
        t.equal(res.headers.location, '/static/?a=b')
      })
      req.on('error', err => console.error(err))
      req.end()

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static?a=b'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
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
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/?a=b', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)

      simple.concat({
        method: 'HEAD',
        url: 'http://localhost:' + fastify.server.address().port + '/static/?a=b'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), '')
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
        t.equal(response.statusCode, 404)
        genericErrorResponseChecks(t, response)
      })
    })

    t.test('/static/deep/path/for/test?a=b', t => {
      t.plan(5 + GENERIC_RESPONSE_CHECK_COUNT)

      // simple-get doesn't tell us about redirects so use http.request directly
      const testurl = 'http://localhost:' + fastify.server.address().port + '/static/deep/path/for/test?a=b'
      const req = http.request(url.parse(testurl), res => {
        t.equal(res.statusCode, 301)
        t.equal(res.headers.location, '/static/deep/path/for/test/?a=b')
      })
      req.on('error', err => console.error(err))
      req.end()

      // verify the redirect with query parameters works
      simple.concat({
        method: 'GET',
        url: testurl
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), innerIndex)
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
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), innerIndex)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/deep/path/for/test', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)

      simple.concat({
        method: 'HEAD',
        url: 'http://localhost:' + fastify.server.address().port + '/static/deep/path/for/test'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), '')
        genericResponseChecks(t, response)
      })
    })
  })
})

t.test('trailing slash behavior with redirect = false', (t) => {
  t.plan(6)

  const fastify = Fastify()
  fastify.register(fastifyStatic, {
    root: path.join(__dirname, '/static'),
    prefix: '/static',
    redirect: false
  })
  fastify.server.unref()

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    const host = 'http://localhost:' + fastify.server.address().port

    t.test('prefix with no trailing slash => 404', (t) => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        url: host + '/static'
      }, (err, response) => {
        t.error(err)
        t.equal(response.statusCode, 404)
      })
    })

    t.test('prefix with trailing trailing slash => 200', (t) => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        url: host + '/static/'
      }, (err, response) => {
        t.error(err)
        t.equal(response.statusCode, 200)
      })
    })

    t.test('deep path with no index.html or trailing slash => 404', (t) => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        url: host + '/static/deep/path'
      }, (err, response) => {
        t.error(err)
        t.equal(response.statusCode, 404)
      })
    })

    t.test('deep path with index.html but no trailing slash => 200', (t) => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        url: host + '/static/deep/path/for/test'
      }, (err, response) => {
        t.error(err)
        t.equal(response.statusCode, 200)
      })
    })

    t.test('deep path with index.html and trailing slash => 200', (t) => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        url: host + '/static/deep/path/for/test/'
      }, (err, response) => {
        t.error(err)
        t.equal(response.statusCode, 200)
      })
    })
  })
})

t.test('if dotfiles are properly served according to plugin options', (t) => {
  t.plan(3)
  const exampleContents = fs
    .readFileSync(path.join(__dirname, 'static', '.example'), {
      encoding: 'utf8'
    })
    .toString()

  t.test('freely serve dotfiles', (t) => {
    t.plan(4)
    const fastify = Fastify()

    const pluginOptions = {
      root: path.join(__dirname, 'static'),
      prefix: '/static/',
      dotfiles: 'allow'
    }

    fastify.register(fastifyStatic, pluginOptions)

    t.teardown(fastify.close.bind(fastify))
    fastify.listen({ port: 0 }, (err) => {
      t.error(err)

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/.example'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), exampleContents)
      })
    })
  })

  t.test('ignore dotfiles', (t) => {
    t.plan(3)
    const fastify = Fastify()

    const pluginOptions = {
      root: path.join(__dirname, 'static'),
      prefix: '/static/',
      dotfiles: 'ignore'
    }

    fastify.register(fastifyStatic, pluginOptions)

    t.teardown(fastify.close.bind(fastify))
    fastify.listen({ port: 0 }, (err) => {
      t.error(err)

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/.example'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
      })
    })
  })

  t.test('deny requests to serve a dotfile', (t) => {
    t.plan(3)
    const fastify = Fastify()

    const pluginOptions = {
      root: path.join(__dirname, 'static'),
      prefix: '/static/',
      dotfiles: 'deny'
    }

    fastify.register(fastifyStatic, pluginOptions)

    t.teardown(fastify.close.bind(fastify))
    fastify.listen({ port: 0 }, (err) => {
      t.error(err)

      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/.example'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 403)
      })
    })
  })
})

t.test('register with failing glob handler', (t) => {
  const fastifyStatic = proxyquire.noCallThru()('../', {
    glob: function globStub (pattern, options, cb) {
      process.nextTick(function () {
        return cb(new Error('mock glob error'))
      })
    }
  })

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    serve: true,
    wildcard: false
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    fastify.server.unref()
    t.ok(err)
    t.end()
  })
})

t.test(
  'register with rootpath that causes statSync to fail with non-ENOENT code',
  (t) => {
    const fastifyStatic = proxyquire('../', {
      'node:fs': {
        statSync: function statSyncStub (path) {
          throw new Error({ code: 'MOCK' })
        }
      }
    })

    const pluginOptions = {
      root: path.join(__dirname, '/static'),
      wildcard: true
    }
    const fastify = Fastify()
    fastify.register(fastifyStatic, pluginOptions)

    t.teardown(fastify.close.bind(fastify))
    fastify.listen({ port: 0 }, (err) => {
      fastify.server.unref()
      t.ok(err)
      t.end()
    })
  }
)

t.test('inject support', async (t) => {
  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static'
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)
  t.teardown(fastify.close.bind(fastify))

  const response = await fastify.inject({
    method: 'GET',
    url: '/static/index.html'
  })
  t.equal(response.statusCode, 200)
  t.equal(response.body.toString(), indexContent)
})

t.test('routes should use custom errorHandler premature stream close', t => {
  t.plan(3)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static/'
  }

  const fastify = Fastify()

  fastify.addHook('onRoute', function (routeOptions) {
    t.ok(routeOptions.errorHandler instanceof Function)

    routeOptions.onRequest = (request, reply, done) => {
      const fakeError = new Error()
      fakeError.code = 'ERR_STREAM_PREMATURE_CLOSE'
      done(fakeError)
    }
  })

  fastify.register(fastifyStatic, pluginOptions)
  t.teardown(fastify.close.bind(fastify))

  fastify.inject(
    {
      method: 'GET',
      url: '/static/index.html'
    },
    (err, response) => {
      t.error(err)
      t.equal(response, null)
    }
  )
})

t.test('routes should fallback to default errorHandler', t => {
  t.plan(3)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static/'
  }

  const fastify = Fastify()

  fastify.addHook('onRoute', function (routeOptions) {
    t.ok(routeOptions.errorHandler instanceof Function)

    routeOptions.preHandler = (request, reply, done) => {
      const fakeError = new Error()
      fakeError.code = 'SOMETHING_ELSE'
      done(fakeError)
    }
  })

  fastify.register(fastifyStatic, pluginOptions)
  t.teardown(fastify.close.bind(fastify))

  fastify.inject({
    method: 'GET',
    url: '/static/index.html'
  }, (err, response) => {
    t.error(err)
    t.same(JSON.parse(response.payload), {
      statusCode: 500,
      code: 'SOMETHING_ELSE',
      error: 'Internal Server Error',
      message: ''
    })
  })
})

t.test('percent encoded URLs in glob mode', (t) => {
  t.plan(4)

  const fastify = Fastify({})

  fastify.register(fastifyStatic, {
    root: path.join(__dirname, 'static'),
    prefix: '/static',
    wildcard: true
  })

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)
    fastify.server.unref()

    simple.concat({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/static/a .md',
      followRedirect: false
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(
        fs.readFileSync(path.join(__dirname, 'static', 'a .md'), 'utf-8'),
        body.toString()
      )
    })
  })
})

t.test('register /static and /static2 without wildcard', t => {
  t.plan(3)

  const pluginOptions = {
    root: [path.join(__dirname, '/static'), path.join(__dirname, '/static2')],
    wildcard: false
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    fastify.server.unref()

    t.test('/index.html', t => {
      t.plan(4 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.not(body.toString(), index2Content)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/bar.html', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/bar.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), barContent)
        genericResponseChecks(t, response)
      })
    })
  })
})

t.test(
  'will serve pre-compressed files with .br at the highest priority',
  async (t) => {
    const pluginOptions = {
      root: path.join(__dirname, '/static-pre-compressed'),
      prefix: '/static-pre-compressed/',
      preCompressed: true
    }

    const fastify = Fastify()

    fastify.register(fastifyStatic, pluginOptions)
    t.teardown(fastify.close.bind(fastify))

    const response = await fastify.inject({
      method: 'GET',
      url: '/static-pre-compressed/all-three.html',
      headers: {
        'accept-encoding': 'gzip, deflate, br'
      }
    })

    genericResponseChecks(t, response)
    t.equal(response.headers['content-encoding'], 'br')
    t.equal(response.statusCode, 200)
    t.same(response.rawPayload, allThreeBr)
    t.end()
  }
)

t.test(
  'will serve pre-compressed files and fallback to .gz if .br is not on disk',
  async (t) => {
    const pluginOptions = {
      root: path.join(__dirname, '/static-pre-compressed'),
      prefix: '/static-pre-compressed/',
      preCompressed: true
    }

    const fastify = Fastify()

    fastify.register(fastifyStatic, pluginOptions)
    t.teardown(fastify.close.bind(fastify))

    const response = await fastify.inject({
      method: 'GET',
      url: '/static-pre-compressed/gzip-only.html',
      headers: {
        'accept-encoding': 'gzip, deflate, br'
      }
    })

    genericResponseChecks(t, response)
    t.equal(response.headers['content-encoding'], 'gzip')
    t.equal(response.statusCode, 200)
    t.same(response.rawPayload, gzipOnly)
    t.end()
  }
)

t.test(
  'will serve pre-compressed files with .gzip if * directive used',
  async (t) => {
    const pluginOptions = {
      root: path.join(__dirname, '/static-pre-compressed'),
      prefix: '/static-pre-compressed/',
      preCompressed: true
    }

    const fastify = Fastify()

    fastify.register(fastifyStatic, pluginOptions)
    t.teardown(fastify.close.bind(fastify))

    const response = await fastify.inject({
      method: 'GET',
      url: '/static-pre-compressed/all-three.html',
      headers: {
        'accept-encoding': '*'
      }
    })

    genericResponseChecks(t, response)
    t.equal(response.headers['content-encoding'], 'gzip')
    t.equal(response.statusCode, 200)
    t.same(response.rawPayload, allThreeGzip)
    t.end()
  }
)

t.test(
  'will serve pre-compressed files with .gzip if multiple * directives used',
  async (t) => {
    const pluginOptions = {
      root: path.join(__dirname, '/static-pre-compressed'),
      prefix: '/static-pre-compressed/',
      preCompressed: true
    }

    const fastify = Fastify()

    fastify.register(fastifyStatic, pluginOptions)
    t.teardown(fastify.close.bind(fastify))

    const response = await fastify.inject({
      method: 'GET',
      url: '/static-pre-compressed/all-three.html',
      headers: {
        'accept-encoding': '*, *'
      }
    })

    genericResponseChecks(t, response)
    t.equal(response.headers['content-encoding'], 'gzip')
    t.equal(response.statusCode, 200)
    t.same(response.rawPayload, allThreeGzip)
    t.end()
  }
)

t.test(
  'will serve uncompressed files if there are no compressed variants on disk',
  async (t) => {
    const pluginOptions = {
      root: path.join(__dirname, '/static-pre-compressed'),
      prefix: '/static-pre-compressed/',
      preCompressed: true
    }

    const fastify = Fastify()

    fastify.register(fastifyStatic, pluginOptions)
    t.teardown(fastify.close.bind(fastify))

    const response = await fastify.inject({
      method: 'GET',
      url: '/static-pre-compressed/uncompressed.html',
      headers: {
        'accept-encoding': 'gzip, deflate, br'
      }
    })

    genericResponseChecks(t, response)
    t.equal(response.headers['content-encoding'], undefined)
    t.equal(response.statusCode, 200)
    t.equal(response.body, uncompressedStatic)
    t.end()
  }
)

t.test(
  'will serve pre-compressed files with .br at the highest priority (with wildcard: false)',
  async (t) => {
    const pluginOptions = {
      root: path.join(__dirname, '/static-pre-compressed'),
      prefix: '/static-pre-compressed/',
      preCompressed: true,
      wildcard: false
    }

    const fastify = Fastify()

    fastify.register(fastifyStatic, pluginOptions)
    t.teardown(fastify.close.bind(fastify))

    const response = await fastify.inject({
      method: 'GET',
      url: '/static-pre-compressed/all-three.html',
      headers: {
        'accept-encoding': 'gzip, deflate, br'
      }
    })

    genericResponseChecks(t, response)
    t.equal(response.headers['content-encoding'], 'br')
    t.equal(response.statusCode, 200)
    t.same(response.rawPayload, allThreeBr)
    t.end()
  }
)

t.test(
  'will serve pre-compressed files and fallback to .gz if .br is not on disk (with wildcard: false)',
  async (t) => {
    const pluginOptions = {
      root: path.join(__dirname, '/static-pre-compressed'),
      prefix: '/static-pre-compressed/',
      preCompressed: true,
      wildcard: false
    }

    const fastify = Fastify()

    fastify.register(fastifyStatic, pluginOptions)
    t.teardown(fastify.close.bind(fastify))

    const response = await fastify.inject({
      method: 'GET',
      url: '/static-pre-compressed/gzip-only.html',
      headers: {
        'accept-encoding': 'gzip, deflate, br'
      }
    })

    genericResponseChecks(t, response)
    t.equal(response.headers['content-encoding'], 'gzip')
    t.equal(response.statusCode, 200)
    t.same(response.rawPayload, gzipOnly)
    t.end()
  }
)

t.test(
  'will serve pre-compressed files with .gzip if * directive used (with wildcard: false)',
  async (t) => {
    const pluginOptions = {
      root: path.join(__dirname, '/static-pre-compressed'),
      prefix: '/static-pre-compressed/',
      preCompressed: true,
      wildcard: false
    }

    const fastify = Fastify()

    fastify.register(fastifyStatic, pluginOptions)
    t.teardown(fastify.close.bind(fastify))

    const response = await fastify.inject({
      method: 'GET',
      url: '/static-pre-compressed/all-three.html',
      headers: {
        'accept-encoding': '*'
      }
    })

    genericResponseChecks(t, response)
    t.equal(response.headers['content-encoding'], 'gzip')
    t.equal(response.statusCode, 200)
    t.same(response.rawPayload, allThreeGzip)
    t.end()
  }
)

t.test(
  'will serve pre-compressed files with .gzip if multiple * directives used (with wildcard: false)',
  async (t) => {
    const pluginOptions = {
      root: path.join(__dirname, '/static-pre-compressed'),
      prefix: '/static-pre-compressed/',
      preCompressed: true,
      wildcard: false
    }

    const fastify = Fastify()

    fastify.register(fastifyStatic, pluginOptions)
    t.teardown(fastify.close.bind(fastify))

    const response = await fastify.inject({
      method: 'GET',
      url: '/static-pre-compressed/all-three.html',
      headers: {
        'accept-encoding': '*, *'
      }
    })

    genericResponseChecks(t, response)
    t.equal(response.headers['content-encoding'], 'gzip')
    t.equal(response.statusCode, 200)
    t.same(response.rawPayload, allThreeGzip)
    t.end()
  }
)

t.test(
  'will serve uncompressed files if there are no compressed variants on disk (with wildcard: false)',
  async (t) => {
    const pluginOptions = {
      root: path.join(__dirname, '/static-pre-compressed'),
      prefix: '/static-pre-compressed/',
      preCompressed: true,
      wildcard: false
    }

    const fastify = Fastify()

    fastify.register(fastifyStatic, pluginOptions)
    t.teardown(fastify.close.bind(fastify))

    const response = await fastify.inject({
      method: 'GET',
      url: '/static-pre-compressed/uncompressed.html',
      headers: {
        'accept-encoding': 'gzip, deflate, br'
      }
    })

    genericResponseChecks(t, response)
    t.equal(response.headers['content-encoding'], undefined)
    t.equal(response.statusCode, 200)
    t.equal(response.body, uncompressedStatic)
    t.end()
  }
)

t.test(
  'will serve uncompressed files the accept-encoding header is missing',
  async (t) => {
    const pluginOptions = {
      root: path.join(__dirname, '/static-pre-compressed'),
      prefix: '/static-pre-compressed/',
      preCompressed: true
    }

    const fastify = Fastify()

    fastify.register(fastifyStatic, pluginOptions)
    t.teardown(fastify.close.bind(fastify))

    const response = await fastify.inject({
      method: 'GET',
      url: '/static-pre-compressed/uncompressed.html'
    })

    genericResponseChecks(t, response)
    t.equal(response.headers['content-encoding'], undefined)
    t.equal(response.statusCode, 200)
    t.equal(response.body, uncompressedStatic)
    t.end()
  }
)

t.test(
  'will serve precompressed index',
  async (t) => {
    const pluginOptions = {
      root: path.join(__dirname, '/static-pre-compressed'),
      prefix: '/static-pre-compressed/',
      preCompressed: true
    }

    const fastify = Fastify()

    fastify.register(fastifyStatic, pluginOptions)
    t.teardown(fastify.close.bind(fastify))

    const response = await fastify.inject({
      method: 'GET',
      url: '/static-pre-compressed/',
      headers: {
        'accept-encoding': 'gzip, deflate, br'
      }
    })

    genericResponseChecks(t, response)
    t.equal(response.headers['content-encoding'], 'br')
    t.equal(response.statusCode, 200)
    t.same(response.rawPayload, indexBr)
    t.end()
  }
)

t.test(
  'will serve preCompressed index without trailing slash',
  async (t) => {
    const pluginOptions = {
      root: path.join(__dirname, '/static-pre-compressed'),
      prefix: '/static-pre-compressed/',
      preCompressed: true,
      redirect: false
    }

    const fastify = Fastify()

    fastify.register(fastifyStatic, pluginOptions)
    t.teardown(fastify.close.bind(fastify))

    const response = await fastify.inject({
      method: 'GET',
      url: '/static-pre-compressed/dir',
      headers: {
        'accept-encoding': 'gzip, deflate, br'
      }
    })

    genericResponseChecks(t, response)
    t.equal(response.headers['content-encoding'], 'br')
    t.equal(response.statusCode, 200)
    t.same(response.rawPayload, dirIndexBr)
    t.end()
  }
)

t.test(
  'will serve precompressed gzip index in subdir',
  async (t) => {
    const pluginOptions = {
      root: path.join(__dirname, '/static-pre-compressed'),
      preCompressed: true
    }

    const fastify = Fastify()

    fastify.register(fastifyStatic, pluginOptions)
    t.teardown(fastify.close.bind(fastify))

    const response = await fastify.inject({
      method: 'GET',
      url: '/dir-gz',
      headers: {
        'accept-encoding': 'gzip, deflate, br'
      }
    })

    genericResponseChecks(t, response)
    t.equal(response.headers['content-encoding'], 'gzip')
    t.equal(response.statusCode, 200)
    t.same(response.rawPayload, dirIndexGz)
    t.end()
  }
)

t.test(
  'will serve precompressed index with alternative index option',
  async (t) => {
    const pluginOptions = {
      root: path.join(__dirname, '/static-pre-compressed'),
      prefix: '/static-pre-compressed/',
      preCompressed: true,
      index: ['all-three.html']
    }

    const fastify = Fastify()

    fastify.register(fastifyStatic, pluginOptions)
    t.teardown(fastify.close.bind(fastify))

    const response = await fastify.inject({
      method: 'GET',
      url: '/static-pre-compressed/',
      headers: {
        'accept-encoding': 'gzip, deflate, br'
      }
    })

    genericResponseChecks(t, response)
    t.equal(response.headers['content-encoding'], 'br')
    t.equal(response.statusCode, 200)
    t.same(response.rawPayload, allThreeBr)
    t.end()
  }
)

t.test(
  'will serve precompressed file without content-type charset',
  async (t) => {
    const pluginOptions = {
      root: path.join(__dirname, '/static-pre-compressed'),
      prefix: '/static-pre-compressed/',
      preCompressed: true
    }

    const fastify = Fastify()

    fastify.register(fastifyStatic, pluginOptions)
    t.teardown(fastify.close.bind(fastify))

    const response = await fastify.inject({
      method: 'GET',
      url: '/static-pre-compressed/sample.jpg',
      headers: {
        'accept-encoding': 'gzip, deflate, br'
      }
    })

    t.equal(response.headers['content-type'], 'image/jpeg')
    t.equal(response.headers['content-encoding'], 'br')
    t.equal(response.statusCode, 200)
    t.end()
  }
)

t.test(
  'nonexistent index with precompressed option',
  async (t) => {
    const pluginOptions = {
      root: path.join(__dirname, '/static-pre-compressed'),
      prefix: '/static-pre-compressed/',
      preCompressed: true
    }

    const fastify = Fastify()

    fastify.register(fastifyStatic, pluginOptions)
    t.teardown(fastify.close.bind(fastify))

    const response = await fastify.inject({
      method: 'GET',
      url: '/static-pre-compressed/empty/',
      headers: {
        'accept-encoding': 'gzip, deflate, br'
      }
    })

    t.equal(response.statusCode, 404)
    genericErrorResponseChecks(t, response)
    t.end()
  }
)

t.test('should not redirect to protocol-relative locations', (t) => {
  const urls = [
    ['//^/..', '/', 301],
    ['//^/.', null, 404], // it is NOT recognized as a directory by pillarjs/send
    ['//:/..', '/', 301],
    ['/\\\\a//google.com/%2e%2e%2f%2e%2e', '/a//google.com/%2e%2e%2f%2e%2e/', 301],
    ['//a//youtube.com/%2e%2e%2f%2e%2e', '/a//youtube.com/%2e%2e%2f%2e%2e/', 301],
    ['/^', null, 404], // it is NOT recognized as a directory by pillarjs/send
    ['//google.com/%2e%2e', '/', 301],
    ['//users/%2e%2e', '/', 301],
    ['//users', null, 404],
    ['///deep/path//for//test//index.html', null, 200]
  ]

  t.plan(1 + urls.length * 2)
  const fastify = Fastify()
  fastify.register(fastifyStatic, {
    root: path.join(__dirname, '/static'),
    redirect: true
  })
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({ port: 0 }, (err, address) => {
    t.error(err)
    urls.forEach(([testUrl, expected, status]) => {
      const req = http.request(url.parse(address + testUrl), res => {
        t.equal(res.statusCode, status, `status ${testUrl}`)

        if (expected) {
          t.equal(res.headers.location, expected)
        } else {
          t.notOk(res.headers.location)
        }
      })
      req.on('error', t.error)
      req.end()
    })
  })
})

t.test('should not serve index if option is `false`', (t) => {
  t.plan(3)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static',
    index: false
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    t.test('/static/index.html', (t) => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static', (t) => {
      t.plan(2 + GENERIC_ERROR_RESPONSE_CHECK_COUNT)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/static'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        genericErrorResponseChecks(t, response)
      })
    })
  })
})

t.test('should follow symbolic link without wildcard', (t) => {
  t.plan(5)
  const fastify = Fastify()
  fastify.register(fastifyStatic, {
    root: path.join(__dirname, '/static-symbolic-link'),
    wildcard: false
  })
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    simple.concat({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/origin/subdir/subdir/index.html'
    }, (err, response) => {
      t.error(err)
      t.equal(response.statusCode, 200)
    })

    simple.concat({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/dir/symlink/subdir/subdir/index.html'
    }, (err, response) => {
      t.error(err)
      t.equal(response.statusCode, 200)
    })
  })
})

t.test('should serve files into hidden dir with wildcard `false`', (t) => {
  t.plan(9)

  const pluginOptions = {
    root: path.join(__dirname, '/static-hidden'),
    wildcard: false,
    serveDotFiles: true
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    simple.concat({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/.hidden/sample.json'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(body.toString(), jsonHiddenContent)
      t.ok(/application\/(json)/.test(response.headers['content-type']))
      t.ok(response.headers.etag)
      t.ok(response.headers['last-modified'])
      t.ok(response.headers.date)
      t.ok(response.headers['cache-control'])
    })
  })
})

t.test('should not found hidden file with wildcard is `false`', (t) => {
  t.plan(3)

  const pluginOptions = {
    root: path.join(__dirname, '/static-hidden'),
    wildcard: false
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    simple.concat({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/.hidden/sample.json'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 404)
    })
  })
})

t.test('should serve files into hidden dir without wildcard option', (t) => {
  t.plan(9)

  const pluginOptions = {
    root: path.join(__dirname, '/static-hidden')
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)

    fastify.server.unref()

    simple.concat({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/.hidden/sample.json'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(body.toString(), jsonHiddenContent)
      t.ok(/application\/(json)/.test(response.headers['content-type']))
      t.ok(response.headers.etag)
      t.ok(response.headers['last-modified'])
      t.ok(response.headers.date)
      t.ok(response.headers['cache-control'])
    })
  })
})

t.test(
  'will serve pre-compressed files with .gzip if multi-root',
  async (t) => {
    const pluginOptions = {
      root: [path.join(__dirname, '/static-pre-compressed'), path.join(__dirname, '/static')],
      preCompressed: true
    }

    const fastify = Fastify()

    fastify.register(fastifyStatic, pluginOptions)
    t.teardown(fastify.close.bind(fastify))

    const response = await fastify.inject({
      method: 'GET',
      url: 'all-three.html',
      headers: {
        'accept-encoding': '*, *'
      }
    })

    genericResponseChecks(t, response)
    t.equal(response.headers['content-encoding'], 'gzip')
    t.equal(response.statusCode, 200)
    t.same(response.rawPayload, allThreeGzip)
    t.end()
  }
)

t.test(
  'will still serve un-compressed files with multi-root and preCompressed as true',
  async (t) => {
    const pluginOptions = {
      root: [path.join(__dirname, '/static-pre-compressed'), path.join(__dirname, '/static')],
      preCompressed: true
    }

    const fastify = Fastify()

    fastify.register(fastifyStatic, pluginOptions)
    t.teardown(fastify.close.bind(fastify))

    const response = await fastify.inject({
      method: 'GET',
      url: 'foobar.html',
      headers: {
        'accept-encoding': '*, *'
      }
    })

    genericResponseChecks(t, response)
    t.equal(response.statusCode, 200)
    t.same(response.body, foobarContent)
    t.end()
  }
)

t.test(
  'converts URL to path',
  async (t) => {
    t.plan(2 + GENERIC_RESPONSE_CHECK_COUNT)
    const pluginOptions = {
      root: url.pathToFileURL(path.join(__dirname, '/static'))
    }

    const fastify = Fastify()

    fastify.register(fastifyStatic, pluginOptions)
    const response = await fastify.inject({
      method: 'GET',
      url: 'foobar.html',
      headers: {
        'accept-encoding': '*, *'
      }
    })
    genericResponseChecks(t, response)
    t.equal(response.statusCode, 200)
    t.same(response.body, foobarContent)
  }
)

t.test(
  'converts array of URLs to path, contains string path',
  async (t) => {
    t.plan(2 + GENERIC_RESPONSE_CHECK_COUNT)
    const pluginOptions = {
      root: [url.pathToFileURL(path.join(__dirname, '/static')), path.join(__dirname, 'static-dotfiles'), url.pathToFileURL(path.join(__dirname, '/static-pre-compressed'))]
    }

    const fastify = Fastify()

    fastify.register(fastifyStatic, pluginOptions)
    const response = await fastify.inject({
      method: 'GET',
      url: 'foobar.html',
      headers: {
        'accept-encoding': '*, *'
      }
    })
    genericResponseChecks(t, response)
    t.equal(response.statusCode, 200)
    t.same(response.body, foobarContent)
  }
)

t.test(
  'serves files with paths that have characters modified by encodeUri when wildcard is false',
  async (t) => {
    const aContent = fs.readFileSync(path.join(__dirname, 'static-encode/[...]', 'a .md'), 'utf-8')

    t.plan(4)
    const pluginOptions = {
      root: url.pathToFileURL(path.join(__dirname, '/static-encode')),
      wildcard: false
    }

    const fastify = Fastify()

    fastify.register(fastifyStatic, pluginOptions)
    const response = await fastify.inject({
      method: 'GET',
      url: '[...]/a .md',
      headers: {
        'accept-encoding': '*, *'
      }
    })
    t.equal(response.statusCode, 200)
    t.same(response.body, aContent)

    const response2 = await fastify.inject({
      method: 'GET',
      url: '%5B...%5D/a%20.md',
      headers: {
        'accept-encoding': '*, *'
      }
    })
    t.equal(response2.statusCode, 200)
    t.same(response2.body, aContent)
  }
)

t.test(
  'serves files with % in the filename',
  async (t) => {
    t.plan(2)

    const txtContent = fs.readFileSync(path.join(__dirname, 'static', '100%.txt'), 'utf-8')

    const pluginOptions = {
      root: url.pathToFileURL(path.join(__dirname, '/static')),
      wildcard: false
    }

    const fastify = Fastify()

    fastify.register(fastifyStatic, pluginOptions)
    const response = await fastify.inject({
      method: 'GET',
      url: '100%25.txt',
      headers: {
        'accept-encoding': '*, *'
      }
    })
    t.equal(response.statusCode, 200)
    t.same(response.body, txtContent)
  }
)

t.test('content-length in head route should not return zero when using wildcard', t => {
  t.plan(6)

  const pluginOptions = {
    root: path.join(__dirname, '/static')
  }
  const fastify = Fastify()

  fastify.register(fastifyStatic, pluginOptions)

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    fastify.server.unref()

    const file = fs.readFileSync(path.join(__dirname, '/static/index.html'))
    const contentLength = Buffer.byteLength(file).toString()

    simple.concat({
      method: 'HEAD',
      url: 'http://localhost:' + fastify.server.address().port + '/index.html',
      followRedirect: false
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-type'], 'text/html; charset=UTF-8')
      t.equal(response.headers['content-length'], contentLength)
      t.equal(body.toString(), '')
    })
  })
})
