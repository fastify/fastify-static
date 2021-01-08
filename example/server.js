'use strict'

const path = require('path')
const fastify = require('fastify')({ logger: { level: 'trace' } })

fastify
  .register(require('../'), { prefix: '/static/', root: [path.join(__dirname, '/public'), path.join(__dirname, '/public2')] })
  .listen(3000, err => {
    if (err) throw err
  })
