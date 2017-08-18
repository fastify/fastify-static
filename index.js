'use strict'

const path = require('path')

const send = require('send')

const fp = require('fastify-plugin')

function fastifyStatic (fastify, opts, next) {
  if (typeof opts.sendOptions !== 'object') {
    return next(new Error('"sendOptions" option is required'))
  }
  if (typeof opts.sendOptions.root !== 'string') {
    return next(new Error('"sendOptions.root" option is required'))
  }
  if (!path.isAbsolute(opts.sendOptions.root)) {
    return next(new Error('"directory" option must be an absolute path'))
  }
  if (typeof opts.redirectionLink404 !== 'string') {
    return next(new Error('"redirectionLink404" option is required'))
  }
  if (typeof opts.redirectionLink403 !== 'string') {
    return next(new Error('"redirectionLink403" option is required'))
  }
  if (typeof opts.redirectionLink500 !== 'string') {
    return next(new Error('"redirectionLink500" option is required'))
  }

  const root = opts.sendOptions.root
  const redirectionLink404 = opts.redirectionLink404
  const redirectionLink403 = opts.redirectionLink403
  const redirectionLink500 = opts.redirectionLink500

  function pumpSendToReply (req, reply, pathname) {
    const sendStream = send(req, pathname, {root})

    sendStream.on('error', function (err) {
      if (err.code === 'ENOENT') {
        return reply.redirect(redirectionLink404)
      }
      if (err.message === 'Forbidden') {
        return reply.redirect(redirectionLink403)
      }
      reply.redirect(redirectionLink500)
    })

    sendStream.pipe(reply.res)
  }

  fastify.get(opts.prefix + '/*', function (req, reply) {
    pumpSendToReply(req.req, reply, '/' + req.params['*'])
  })

  fastify.get(opts.prefix + '/', function (req, reply) {
    pumpSendToReply(req.req, reply, '/')
  })

  fastify.get(opts.prefix, function (req, reply) {
    pumpSendToReply(req.req, reply, '/')
  })

  next()
}

module.exports = fp(fastifyStatic)
