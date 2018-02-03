'use strict'

const path = require('path')
const fastify = require('fastify')({ logger: { level: 'trace' } })

fastify
  .register(require('../'), { root: path.join(__dirname, '/public') })
  .listen(3000, err => {
    if (err) throw err
  })
