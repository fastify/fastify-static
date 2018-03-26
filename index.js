'use strict'

const path = require('path')
const statSync = require('fs').statSync

const send = require('send')

const fp = require('fastify-plugin')

function fastifyStatic (fastify, opts, next) {
  const error = checkRootPathForErrors(opts.root)
  if (error !== undefined) return next(error)

  const setHeaders = opts.setHeaders

  if (setHeaders !== undefined && typeof setHeaders !== 'function') {
    return next(new TypeError('The `setHeaders` option must be a function'))
  }

  const sendOptions = {
    root: opts.root,
    acceptRanges: opts.acceptRanges,
    cacheControl: opts.cacheControl,
    dotfiles: opts.dotfiles,
    etag: opts.etag,
    extensions: opts.extensions,
    immutable: opts.immutable,
    index: opts.index,
    lastModified: opts.lastModified,
    maxAge: opts.maxAge
  }

  function pumpSendToReply (request, reply, pathname) {
    const stream = send(request.req, pathname, sendOptions)

    // this is needed because fastify automatically
    // set the type to application/octet-stream
    stream.on('headers', removeType)

    if (setHeaders !== undefined) {
      stream.on('headers', setHeaders)
    }

    reply.send(stream)
  }

  if (opts.prefix === undefined) opts.prefix = '/'
  const prefix = opts.prefix[opts.prefix.length - 1] === '/' ? opts.prefix : (opts.prefix + '/')

  fastify.get(prefix + '*', function (req, reply) {
    pumpSendToReply(req, reply, '/' + req.params['*'])
  })

  fastify.decorateReply('sendFile', function (filePath) {
    pumpSendToReply(this.request, this, filePath)
  })

  next()
}

function checkRootPathForErrors (rootPath) {
  if (rootPath === undefined) {
    return new Error('"root" option is required')
  }
  if (typeof rootPath !== 'string') {
    return new Error('"root" option must be a string')
  }
  if (path.isAbsolute(rootPath) === false) {
    return new Error('"root" option must be an absolute path')
  }

  let pathStat

  try {
    pathStat = statSync(rootPath)
  } catch (e) {
    return e
  }

  if (pathStat.isDirectory() === false) {
    return new Error('"root" option must point to a directory')
  }
}

function removeType (res) {
  res.setHeader('Content-Type', '')
}

module.exports = fp(fastifyStatic, {
  fastify: '>= 0.42.0',
  name: 'fastify-static'
})
