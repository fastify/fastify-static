'use strict'

const path = require('path')
const fastify = require('fastify')({ logger: { level: 'trace' } })

fastify
  // compress everything
  .register(require('fastify-compress'), { threshold: 0 })
  .register(require('../'), { root: path.join(__dirname, '/public') })
  .listen(3000, err => {
    if (err) throw err
  })
