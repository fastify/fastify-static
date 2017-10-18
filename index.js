'use strict'

const path = require('path')
const statSync = require('fs').statSync

const send = require('send')

const fp = require('fastify-plugin')

const DEFAULT_500_PAGE = path.join(__dirname, 'static', '500.html')
const DEFAULT_403_PAGE = path.join(__dirname, 'static', '403.html')
const DEFAULT_404_PAGE = path.join(__dirname, 'static', '404.html')

function fastifyStatic (fastify, opts, next) {
  const error = checkPathsForErrors({
    root: opts.root,
    page500Path: opts.page500Path,
    page403Path: opts.page403Path,
    page404Path: opts.page404Path
  })
  if (error !== undefined) return next(error)

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
    const sendStream = send(req, pathname, { root })

    sendStream.on('error', function (err) {
      if (err.statusCode === 404) return serve404(req, reply.res)
      if (err.statusCode === 403) return serve403(req, reply.res)
      serve500(req, reply.res)
    })

    sendStream.pipe(reply.res)
  }

  if (opts.prefix === undefined) opts.prefix = '/'
  const prefix = opts.prefix[opts.prefix.length - 1] === '/' ? opts.prefix : (opts.prefix + '/')

  fastify.get(prefix + '*', function (req, reply) {
    pumpSendToReply(req.req, reply, '/' + req.params['*'])
  })

  fastify.get(prefix, function (req, reply) {
    pumpSendToReply(req.req, reply, '/')
  })

  fastify.decorateReply('sendFile', function (filePath) {
    pumpSendToReply(this._req, this, filePath)
  })

  next()
}

function checkPathsForErrors (paths) {
  if (paths.root === undefined) return new Error('"root" option is required')

  for (const p in paths) {
    if (paths[p] !== undefined) {
      if (typeof paths[p] !== 'string') {
        return new Error(`"${p}" option must be a string`)
      }

      if (path.isAbsolute(paths[p]) === false) {
        return new Error(`"${p}" option must be an absolute path`)
      }

      let pathStat

      try {
        pathStat = statSync(paths[p])
      } catch (e) {
        return e
      }

      if (p === 'root' && pathStat.isDirectory() === false) {
        return new Error('"root" option must point to a directory')
      }

      if (p !== 'root' && pathStat.isFile() === false) {
        return new Error(`"${p}" option must point to a file`)
      }
    }
  }
}

module.exports = fp(fastifyStatic)
