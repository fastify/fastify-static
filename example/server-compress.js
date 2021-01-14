'use strict'

const path = require('path')
const fastify = require('fastify')({ logger: { level: 'trace' } })

fastify
  // Compress everything.
  .register(require('fastify-compress'), { threshold: 0 })
  .register(require('../'), {
    // An absolute path containing static files to serve.
    root: path.join(__dirname, '/public')
  })
  .listen(3000, err => {
    if (err) throw err
  })
