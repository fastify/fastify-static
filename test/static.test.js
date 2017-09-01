'use strict'

const path = require('path')
const fs = require('fs')

const t = require('tap')
const request = require('request')

const fastify = require('fastify')()
const fastifyStatic = require('../')

const indexContent = fs.readFileSync('./test/static/index.html').toString('utf8')
const deepContent = fs.readFileSync('./test/static/deep/path/for/test/purpose/foo.html').toString('utf8')
const innerIndex = fs.readFileSync('./test/static/deep/path/for/test/index.html').toString('utf8')

const body403 = fs.readFileSync('./static/403.html').toString('utf8')
const body404 = fs.readFileSync('./static/404.html').toString('utf8')

const GENERIC_RESPONSE_CHECK_COUNT = 5
function genericResponseChecks (t, response) {
  t.ok(/text\/(html|css)/.test(response.headers['content-type']))
  t.ok(response.headers.etag)
  t.ok(response.headers['last-modified'])
  t.ok(response.headers.date)
  t.ok(response.headers['cache-control'])
}

t.test('register', t => {
  t.plan(9)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    prefix: '/static'
  }
  fastify.register(fastifyStatic, pluginOptions)

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    t.test('/static/index.html', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      request.get({
        method: 'GET',
        uri: 'http://localhost:' + fastify.server.address().port + '/static/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body, indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/index.css', t => {
      t.plan(2 + GENERIC_RESPONSE_CHECK_COUNT)
      request.get({
        method: 'GET',
        uri: 'http://localhost:' + fastify.server.address().port + '/static/index.css'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      request.get({
        method: 'GET',
        uri: 'http://localhost:' + fastify.server.address().port + '/static/'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body, indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      request.get({
        method: 'GET',
        uri: 'http://localhost:' + fastify.server.address().port + '/static'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body, indexContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/deep/path/for/test/purpose/foo.html', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      request.get({
        method: 'GET',
        uri: 'http://localhost:' + fastify.server.address().port + '/static/deep/path/for/test/purpose/foo.html'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body, deepContent)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/deep/path/for/test/', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      request.get({
        method: 'GET',
        uri: 'http://localhost:' + fastify.server.address().port + '/static/deep/path/for/test/'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body, innerIndex)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/this/path/doesnt/exist.html', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      request.get({
        method: 'GET',
        uri: 'http://localhost:' + fastify.server.address().port + '/static/this/path/doesnt/exist.html',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
        t.strictEqual(body, body404)
        genericResponseChecks(t, response)
      })
    })

    t.test('/static/../index.js', t => {
      t.plan(3 + GENERIC_RESPONSE_CHECK_COUNT)
      request.get({
        method: 'GET',
        uri: 'http://localhost:' + fastify.server.address().port + '/static/../index.js',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 403)
        t.strictEqual(body, body403)
        genericResponseChecks(t, response)
      })
    })
  })
})
