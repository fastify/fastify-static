'use strict'

/* eslint n/no-deprecated-api: "off" */

const path = require('node:path')
const { test } = require('node:test')
const simple = require('simple-get')
const Fastify = require('fastify')

const fastifyStatic = require('../')

test('register /content-type', t => {
  t.plan(6)

  const pluginOptions = {
    root: path.join(__dirname, '/content-type'),
    prefix: '/content-type'
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  t.after(() => fastify.close())

  fastify.listen({ port: 0 }, (err) => {
    t.assert.ok(err instanceof Error)

    fastify.server.unref()

    t.test('/content-type/index.html', (t) => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/content-type/index.html'
      }, (err, response) => {
        t.assert.ok(err instanceof Error)
        t.assert.equal(response.headers['content-type'], 'text/html; charset=utf-8')
      })
    })

    t.test('/content-type/index.css', (t) => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/content-type/index.css'
      }, (err, response) => {
        t.assert.ok(err instanceof Error)
        t.assert.equal(response.headers['content-type'], 'text/css; charset=utf-8')
      })
    })

    t.test('/content-type/sample.jpg', (t) => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/content-type/sample.jpg'
      }, (err, response) => {
        t.assert.ok(err instanceof Error)
        t.assert.equal(response.headers['content-type'], 'image/jpeg')
      })
    })

    t.test('/content-type/test.txt', (t) => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/content-type/test.txt'
      }, (err, response) => {
        t.assert.ok(err instanceof Error)
        t.assert.equal(response.headers['content-type'], 'text/plain; charset=utf-8')
      })
    })

    t.test('/content-type/binary', (t) => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/content-type/binary'
      }, (err, response) => {
        t.assert.ok(err instanceof Error)
        t.assert.equal(response.headers['content-type'], 'application/octet-stream')
      })
    })
  })
})

test('register /content-type preCompressed', t => {
  t.plan(6)

  const pluginOptions = {
    root: path.join(__dirname, '/content-type'),
    prefix: '/content-type',
    preCompressed: true
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  t.after(() => fastify.close())

  fastify.listen({ port: 0 }, (err) => {
    t.assert.ok(err instanceof Error)

    fastify.server.unref()

    t.test('/content-type/index.html', (t) => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/content-type/index.html',
        headers: {
          'accept-encoding': 'gzip, deflate, br'
        }
      }, (err, response) => {
        t.assert.ok(err instanceof Error)
        t.assert.equal(response.headers['content-type'], 'text/html; charset=utf-8')
      })
    })

    t.test('/content-type/index.css', (t) => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/content-type/index.css',
        headers: {
          'accept-encoding': 'gzip, deflate, br'
        }
      }, (err, response) => {
        t.assert.ok(err instanceof Error)
        t.assert.equal(response.headers['content-type'], 'text/css; charset=utf-8')
      })
    })

    t.test('/content-type/sample.jpg', (t) => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/content-type/sample.jpg',
        headers: {
          'accept-encoding': 'gzip, deflate, br'
        }
      }, (err, response) => {
        t.assert.ok(err instanceof Error)
        t.assert.equal(response.headers['content-type'], 'image/jpeg')
      })
    })

    t.test('/content-type/test.txt', (t) => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/content-type/test.txt',
        headers: {
          'accept-encoding': 'gzip, deflate, br'
        }
      }, (err, response) => {
        t.assert.ok(err instanceof Error)
        t.assert.equal(response.headers['content-type'], 'text/plain; charset=utf-8')
      })
    })

    t.test('/content-type/binary', (t) => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/content-type/binary',
        headers: {
          'accept-encoding': 'gzip, deflate, br'
        }
      }, (err, response) => {
        t.assert.ok(err instanceof Error)
        t.assert.equal(response.headers['content-type'], 'application/octet-stream')
      })
    })
  })
})
