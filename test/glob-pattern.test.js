'use strict'

const path = require('node:path')
const fs = require('node:fs')
const { test } = require('node:test')
const Fastify = require('fastify')
const fastifyStatic = require('../')

test('register with wildcard false and custom globPattern', async (t) => {
  t.plan(3)

  const pluginOptions = {
    root: path.join(__dirname, '/static'),
    wildcard: false,
    globPattern: '**/*.css'
  }
  const fastify = Fastify()
  fastify.register(fastifyStatic, pluginOptions)

  t.after(() => fastify.close())

  await fastify.listen({ port: 0 })
  fastify.server.unref()

  await t.test('/index.css matches globPattern', async (t) => {
    t.plan(3)

    const response = await fetch('http://localhost:' + fastify.server.address().port + '/index.css')
    t.assert.ok(response.ok)
    t.assert.deepStrictEqual(response.status, 200)
    t.assert.deepStrictEqual(await response.text(), fs.readFileSync('./test/static/index.css', 'utf8'))
  })

  await t.test('/index.html is not registered when not matching globPattern', async (t) => {
    t.plan(2)

    const response = await fetch('http://localhost:' + fastify.server.address().port + '/index.html')
    t.assert.ok(!response.ok)
    t.assert.deepStrictEqual(response.status, 404)
    await response.text()
  })

  await t.test('/foo.html is not registered when not matching globPattern', async (t) => {
    t.plan(2)

    const response = await fetch('http://localhost:' + fastify.server.address().port + '/foo.html')
    t.assert.ok(!response.ok)
    t.assert.deepStrictEqual(response.status, 404)
    await response.text()
  })
})
