'use strict'

const path = require('path')
const url = require('url')
const statSync = require('fs').statSync
const { PassThrough } = require('readable-stream')
const glob = require('glob')
const send = require('send')
const fp = require('fastify-plugin')

const dirList = require('./lib/dirList')

function fastifyStatic (fastify, opts, next) {
  const error = checkRootPathForErrors(fastify, opts.root)
  if (error !== undefined) return next(error)

  const setHeaders = opts.setHeaders

  if (setHeaders !== undefined && typeof setHeaders !== 'function') {
    return next(new TypeError('The `setHeaders` option must be a function'))
  }

  const invalidDirListOpts = dirList.validateOptions(opts.list)
  if (invalidDirListOpts) {
    return next(invalidDirListOpts)
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

  function pumpSendToReply (request, reply, pathname, rootPath, checkedExtensions) {
    var options = Object.assign({}, sendOptions)

    if (rootPath) {
      options.root = rootPath
    }

    let encodingExtension = ''

    if (opts.preCompressed) {
      if (!checkedExtensions) {
        checkedExtensions = new Set()
      }
      encodingExtension = checkEncodingHeaders(request.headers, checkedExtensions)
    }

    const pathnameWithExtension = pathname + `${encodingExtension ? `.${encodingExtension}` : ''}`

    const stream = send(request.raw, pathnameWithExtension, options)

    var resolvedFilename
    stream.on('file', function (file) {
      resolvedFilename = file
    })

    const wrap = new PassThrough({
      flush (cb) {
        this.finished = true
        if (reply.raw.statusCode === 304) {
          reply.send('')
        }
        cb()
      }
    })

    wrap.getHeader = reply.getHeader.bind(reply)
    wrap.setHeader = reply.header.bind(reply)
    wrap.finished = false

    Object.defineProperty(wrap, 'filename', {
      get () {
        return resolvedFilename
      }
    })
    Object.defineProperty(wrap, 'statusCode', {
      get () {
        return reply.raw.statusCode
      },
      set (code) {
        reply.code(code)
      }
    })

    wrap.on('pipe', function () {
      if (encodingExtension) {
        reply.header('content-encoding', encodingExtension)
      }
      reply.send(wrap)
    })

    if (setHeaders !== undefined) {
      stream.on('headers', setHeaders)
    }

    stream.on('directory', function (_, path) {
      if (opts.list) {
        return dirList.send({ reply, dir: path, options: opts.list, route: pathname })
      }

      if (opts.redirect === true) {
        /* eslint node/no-deprecated-api: "off" */
        const parsed = url.parse(request.raw.url)
        reply.redirect(301, parsed.pathname + '/' + (parsed.search || ''))
      } else {
        reply.callNotFound()
      }
    })

    stream.on('error', function (err) {
      if (err) {
        if (err.code === 'ENOENT') {
          // if file exists, send real file, otherwise send dir list if name match
          if (opts.list && dirList.handle(pathname, opts.list)) {
            return dirList.send({ reply, dir: dirList.path(opts.root, pathname), options: opts.list, route: pathname })
          }

          if (opts.preCompressed && !(checkedExtensions.has(encodingExtension))) {
            checkedExtensions.add(encodingExtension)
            return pumpSendToReply(request, reply, pathname, rootPath, checkedExtensions)
          } else {
            return reply.callNotFound()
          }
        }
        reply.send(err)
      }
    })

    // we cannot use pump, because send error
    // handling is not compatible
    stream.pipe(wrap)
  }

  if (opts.prefix === undefined) opts.prefix = '/'

  let prefix = opts.prefix

  if (!opts.prefixAvoidTrailingSlash) {
    prefix = opts.prefix[opts.prefix.length - 1] === '/' ? opts.prefix : (opts.prefix + '/')
  }

  const errorHandler = (error, request, reply) => {
    if (error && error.code === 'ERR_STREAM_PREMATURE_CLOSE') {
      reply.request.raw.destroy()
      return
    }

    fastify.errorHandler(error, request, reply)
  }

  // Set the schema hide property if defined in opts or true by default
  const routeOpts = {
    schema: { hide: typeof opts.schemaHide !== 'undefined' ? opts.schemaHide : true },
    errorHandler: fastify.errorHandler ? errorHandler : undefined
  }

  if (opts.decorateReply !== false) {
    fastify.decorateReply('sendFile', function (filePath, rootPath) {
      pumpSendToReply(this.request, this, filePath, rootPath)
      return this
    })
  }

  if (opts.serve !== false) {
    if (opts.wildcard === undefined || opts.wildcard === true) {
      fastify.get(prefix + '*', routeOpts, function (req, reply) {
        pumpSendToReply(req, reply, '/' + req.params['*'])
      })
      if (opts.redirect === true && prefix !== opts.prefix) {
        fastify.get(opts.prefix, routeOpts, function (req, reply) {
          /* eslint node/no-deprecated-api: "off" */
          const parsed = url.parse(req.raw.url)
          reply.redirect(301, parsed.pathname + '/' + (parsed.search || ''))
        })
      }
    } else {
      const globPattern = typeof opts.wildcard === 'string' ? opts.wildcard : '**/*'
      glob(path.join(sendOptions.root, globPattern), { nodir: true }, function (err, files) {
        if (err) {
          return next(err)
        }
        const indexDirs = new Set()
        const indexes = typeof opts.index === 'undefined' ? ['index.html'] : [].concat(opts.index || [])
        for (let file of files) {
          file = file.replace(sendOptions.root.replace(/\\/g, '/'), '').replace(/^\//, '')
          const route = (prefix + file).replace(/\/\//g, '/')
          fastify.get(route, routeOpts, function (req, reply) {
            pumpSendToReply(req, reply, '/' + file)
          })

          if (indexes.includes(path.posix.basename(route))) {
            indexDirs.add(path.posix.dirname(route))
          }
        }
        indexDirs.forEach(function (dirname) {
          const pathname = dirname + (dirname.endsWith('/') ? '' : '/')
          const file = '/' + pathname.replace(prefix, '')

          fastify.get(pathname, routeOpts, function (req, reply) {
            pumpSendToReply(req, reply, file)
          })

          if (opts.redirect === true) {
            fastify.get(pathname.replace(/\/$/, ''), routeOpts, function (req, reply) {
              pumpSendToReply(req, reply, file.replace(/\/$/, ''))
            })
          }
        })
        next()
      })

      // return early to avoid calling next afterwards
      return
    }
  }

  next()
}

function checkRootPathForErrors (fastify, rootPath) {
  if (rootPath === undefined) {
    return new Error('"root" option is required')
  }
  if (typeof rootPath !== 'string') {
    return new Error('"root" option must be a string')
  }
  if (path.isAbsolute(rootPath) === false) {
    return new Error('"root" option must be an absolute path')
  }

  var pathStat

  try {
    pathStat = statSync(rootPath)
  } catch (e) {
    if (e.code === 'ENOENT') {
      fastify.log.warn(`"root" path "${rootPath}" must exist`)
      return
    }

    return e
  }

  if (pathStat.isDirectory() === false) {
    return new Error('"root" option must point to a directory')
  }
}

function checkEncodingHeaders (headers, checked) {
  if (!('accept-encoding' in headers)) return

  let ext
  const accepted = headers['accept-encoding'].split(', ')
  const checkedForBr = checked.has('br')

  for (let index = 0; index < accepted.length; index++) {
    const acceptedEncoding = accepted[index]

    if (acceptedEncoding === 'br' && !checkedForBr) {
      ext = 'br'
      break
    } else if (acceptedEncoding === 'gzip' && checkedForBr && !checked.has('gz')) {
      ext = 'gz'
      break
    }
  }

  return ext
}

module.exports = fp(fastifyStatic, {
  fastify: '3.x',
  name: 'fastify-static'
})
