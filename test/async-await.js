'use strict'

const path = require('path')
const fs = require('fs')
const simple = require('simple-get')
const Fastify = require('fastify')

const fastifyStatic = require('../')

const indexContent = fs.readFileSync('./test/static/index.html').toString('utf8')

const GENERIC_RESPONSE_CHECK_COUNT = 5
function genericResponseChecks (t, response) {
  t.ok(/text\/(html|css)/.test(response.headers['content-type']))
  t.ok(response.headers.etag)
  t.ok(response.headers['last-modified'])
  t.ok(response.headers.date)
  t.ok(response.headers['cache-control'])
}

function asyncTest (t) {
  const test = t.test

  test('sendFile with async/await', t => {
    t.plan(2)

    const pluginOptions = {
      root: path.join(__dirname, '/static'),
      prefix: '/static'
    }
    const fastify = Fastify()
    fastify.register(fastifyStatic, pluginOptions)

    fastify.get('/foo/bar', async function (req, reply) {
      await reply.sendFile('/index.html')
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

  test('sendFile error with async/await', t => {
    t.plan(2)

    const pluginOptions = {
      root: path.join(__dirname, '/static'),
      prefix: '/static'
    }
    const fastify = Fastify()
    fastify.register(fastifyStatic, pluginOptions)

    fastify.get('/foo/bar', async function (req, reply) {
      await reply.sendFile('/index-not-exists.html')
    })

    fastify.listen(0, err => {
      t.error(err)

      fastify.server.unref()

      t.test('reply.sendFile()', t => {
        t.plan(3)
        simple.concat({
          method: 'GET',
          url: 'http://localhost:' + fastify.server.address().port + '/foo/bar',
          followRedirect: false
        }, (err, response, body) => {
          t.error(err)
          t.strictEqual(response.statusCode, 404)
          t.strictEqual(body.toString(), '{"message":"Route GET:/foo/bar not found","error":"Not Found","statusCode":404}')
        })
      })
    })
  })
}

module.exports = asyncTest
