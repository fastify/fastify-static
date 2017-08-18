'use strict'

const path = require('path')
const fs = require('fs')

const t = require('tap')
const request = require('request')

const fastify = require('fastify')()
const fastifyStatic = require('../')

const indexContent = fs.readFileSync('./test/static/index.html').toString('utf8')
const deepContent = fs.readFileSync('./test/static/deep/path/for/test/purpose/foo.html').toString('utf8')

t.test('register', t => {
  t.plan(8)

  const pluginOptions = {
    sendOptions: {
      root: path.join(__dirname, '/static')
    },
    prefix: '/static',
    redirectionLink404: '/404.html',
    redirectionLink403: '/403.html',
    redirectionLink500: '/500.html'
  }
  fastify.register(fastifyStatic, pluginOptions)

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    t.test('/static/index.html', t => {
      t.plan(4)
      request.get({
        method: 'GET',
        uri: 'http://localhost:' + fastify.server.address().port + '/static/index.html'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.ok(/text\/html/.test(response.headers['content-type']))
        t.strictEqual(body, indexContent)
      })
    })

    t.test('/static/index.css', t => {
      t.plan(3)
      request.get({
        method: 'GET',
        uri: 'http://localhost:' + fastify.server.address().port + '/static/index.css'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.ok(/text\/css/.test(response.headers['content-type']))
      })
    })

    t.test('/static/', t => {
      t.plan(4)
      request.get({
        method: 'GET',
        uri: 'http://localhost:' + fastify.server.address().port + '/static/'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.ok(/text\/html/.test(response.headers['content-type']))
        t.strictEqual(body, indexContent)
      })
    })

    t.test('/static', t => {
      t.plan(4)
      request.get({
        method: 'GET',
        uri: 'http://localhost:' + fastify.server.address().port + '/static'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.ok(/text\/html/.test(response.headers['content-type']))
        t.strictEqual(body, indexContent)
      })
    })

    t.test('/static/deep/path/for/test/purpose/foo.html', t => {
      t.plan(4)
      request.get({
        method: 'GET',
        uri: 'http://localhost:' + fastify.server.address().port + '/static/deep/path/for/test/purpose/foo.html'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.ok(/text\/html/.test(response.headers['content-type']))
        t.strictEqual(body, deepContent)
      })
    })

    t.test('/static/this/path/doesnt/exist.html', t => {
      t.plan(3)
      request.get({
        method: 'GET',
        uri: 'http://localhost:' + fastify.server.address().port + '/static/this/path/doesnt/exist.html',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 302)
        t.strictEqual(response.headers.location, '/404.html')
      })
    })

    t.test('/static/../index.js', t => {
      t.plan(3)
      request.get({
        method: 'GET',
        uri: 'http://localhost:' + fastify.server.address().port + '/static/../index.js',
        followRedirect: false
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 302)
        t.strictEqual(response.headers.location, '/403.html')
      })
    })
  })
})
