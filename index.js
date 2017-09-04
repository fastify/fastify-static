'use strict'

const path = require('path')
const statSync = require('fs').statSync

const send = require('send')

const fp = require('fastify-plugin')

const DEFAULT_500_PAGE = path.join(__dirname, 'static', '500.html')
const DEFAULT_403_PAGE = path.join(__dirname, 'static', '403.html')
const DEFAULT_404_PAGE = path.join(__dirname, 'static', '404.html')

function fastifyStatic (fastify, opts, next) {
  const error = checkOptions(opts)
  if (error instanceof Error) return next(error)

  const root = opts.root
  const page500 = opts.page500Path || DEFAULT_500_PAGE
  const page403 = opts.page403Path || DEFAULT_403_PAGE
  const page404 = opts.page404Path || DEFAULT_404_PAGE

  function overwriteStatusCode (res, statusCode) {
    return function () { res.statusCode = statusCode }
  }

  function servePathWithStatusCodeWrapper (page, statusCode) {
    return function servePage (req, res) {
      send(req, page)
        .on('stream', overwriteStatusCode(res, statusCode))
        .pipe(res)
    }
  }
  const serve404 = servePathWithStatusCodeWrapper(page404, 404)
  const serve403 = servePathWithStatusCodeWrapper(page403, 403)
  const serve500 = servePathWithStatusCodeWrapper(page500, 500)

  function pumpSendToReply (req, reply, pathname) {
    const sendStream = send(req, pathname, {root})

    sendStream.on('error', function (err) {
      if (err.statusCode === 404) return serve404(req, reply.res)
      if (err.statusCode === 403) return serve403(req, reply.res)
      serve500(req, reply.res)
    })

    sendStream.pipe(reply.res)
  }

  const prefix = opts.prefix[opts.prefix.length - 1] === '/' ? opts.prefix : (opts.prefix + '/')
  fastify.get(prefix + '*', function (req, reply) {
    pumpSendToReply(req.req, reply, '/' + req.params['*'])
  })

  fastify.get(prefix, function (req, reply) {
    pumpSendToReply(req.req, reply, '/')
  })

  fastify.decorateReply('serveStaticFile', function (filePath) {
    pumpSendToReply(this._req, this, filePath)
  })

  next()
}

function checkOptions (opts) {
  if (typeof opts.root !== 'string') {
    return new Error('"root" option is required')
  }
  if (!path.isAbsolute(opts.root)) {
    return new Error('"root" option must be an absolute path')
  }
  let rootStat
  try {
    rootStat = statSync(opts.root)
  } catch (e) {
    return e
  }
  if (!rootStat.isDirectory()) {
    return new Error('"root" option must be an absolute path')
  }
}

module.exports = fp(fastifyStatic)
