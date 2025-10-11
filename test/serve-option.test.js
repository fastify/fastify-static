'use strict'

const path = require('node:path')
const assert = require('node:assert')
const { test } = require('node:test')
const Fastify = require('fastify')
const fastifyStatic = require('../index.js')

test('should not serve static files when serve is false', async t => {
  const fastify = Fastify()
  fastify.register(fastifyStatic, {
    serve: false
  })

  t.after(() => fastify.close())
  await fastify.listen({ port: 0 })
  console.log('Server running at http://localhost:0')
  fastify.server.unref()

  const res = await fetch('http://localhost:' + fastify.server.address().port + '/public/example.html')
  assert.strictEqual(res.status, 404)
})

test('should serve static files when serve is true', async t => {
  const fastify = Fastify()
  fastify.register(fastifyStatic, {
    root: path.join(__dirname, 'root'),
    prefix: '/public/'
  })

  t.after(() => fastify.close())
  await fastify.listen({ port: 0 })
  fastify.server.unref()

  const res = await fetch('http://localhost:' + fastify.server.address().port + '/public/example.html')
  assert.strictEqual(res.status, 200)

  const content = await res.text()
  assert.ok(content.includes('hello'), 'File content should contain "hello"')
})
