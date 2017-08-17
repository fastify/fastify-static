'use strict'

const fs = require('fs')
const path = require('path')

const mime = require('mime-types')

const fp = require('fastify-plugin')

const DEFAULT_CONTENT_TYPE = 'application/octet-stream'
const DEFAULT_DIRECTORY_FALLBACK_FILE = 'index.html'

function isPathNotFound (err) {
  return err && err.code === 'ENOENT'
}

function serve404 (reply, opts) {
  reply.redirect(opts.redirectionLink404)
}

function serve500 (reply, opts) {
  reply.redirect(opts.redirectionLink500)
}

function serveFileFromFS (reply, realPath) {
  const readableStream = fs.createReadStream(realPath)
  var type = mime.lookup(realPath) || DEFAULT_CONTENT_TYPE
  return reply
    .code(200)
    .type(type)
    .send(readableStream)
}

function serveRealPath (reply, opts, realPath) {
  fs.lstat(realPath, function (err, stats) {
    if (isPathNotFound(err)) return serve404(reply, opts)
    if (err) return serve500(reply, opts)

    if (stats.isFile()) return serveFileFromFS(reply, realPath)

    if (stats.isDirectory()) {
      const realPath2 = path.join(realPath, DEFAULT_DIRECTORY_FALLBACK_FILE)
      return serveRealPath(reply, opts, realPath2)
    }
  })
}

function serveFile (reply, opts, requestedFile) {
  const realPath = path.resolve(opts.directory, requestedFile)
  if (!opts.directoryRegexp.test(realPath)) return serve404(reply, opts)

  serveRealPath(reply, opts, realPath)
}

function fastifyStatic (fastify, opts, next) {
  if (typeof opts.directory !== 'string') {
    return next(new Error('"directory" option is required'))
  }
  if (!path.isAbsolute(opts.directory)) {
    return next(new Error('"directory" option must be an absolute path'))
  }
  if (typeof opts.redirectionLink404 !== 'string') {
    return next(new Error('"redirectionLink404" option is required'))
  }
  if (typeof opts.redirectionLink500 !== 'string') {
    return next(new Error('"redirectionLink500" option is required'))
  }

  const options = {
    directory: opts.directory,
    redirectionLink404: opts.redirectionLink404,
    redirectionLink500: opts.redirectionLink500,
    directoryRegexp: new RegExp('^' + opts.directory)
  }

  fastify.get(opts.prefix + '/*', function (req, reply) {
    const requestedFile = req.params['*']
    serveFile(reply, options, requestedFile)
  })

  fastify.get(opts.prefix + '/', function (req, reply) {
    serveFile(reply, options, '')
  })

  fastify.get(opts.prefix, function (req, reply) {
    serveFile(reply, options, '')
  })

  next()
}

module.exports = fp(fastifyStatic)
