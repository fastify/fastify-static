'use strict'

const path = require('path')
const url = require('url')
const statSync = require('fs').statSync
const { PassThrough } = require('readable-stream')
const glob = require('glob')
const send = require('@fastify/send')
const contentDisposition = require('content-disposition')
const fp = require('fastify-plugin')
const util = require('util')
const globPromise = util.promisify(glob)
const encodingNegotiator = require('@fastify/accept-negotiator')

const dirList = require('./lib/dirList')

async function fastifyStatic (fastify, opts) {
  opts.root = normalizeRoot(opts.root)
  checkRootPathForErrors(fastify, opts.root)

  const setHeaders = opts.setHeaders

  if (setHeaders !== undefined && typeof setHeaders !== 'function') {
    throw new TypeError('The `setHeaders` option must be a function')
  }

  const invalidDirListOpts = dirList.validateOptions(opts)
  if (invalidDirListOpts) {
    throw invalidDirListOpts
  }

  if (opts.dotfiles === undefined) {
    opts.dotfiles = 'allow'
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

  const allowedPath = opts.allowedPath

  if (opts.prefix === undefined) opts.prefix = '/'

  let prefix = opts.prefix

  if (!opts.prefixAvoidTrailingSlash) {
    prefix =
      opts.prefix[opts.prefix.length - 1] === '/'
        ? opts.prefix
        : opts.prefix + '/'
  }

  function pumpSendToReply (
    request,
    reply,
    pathname,
    rootPath,
    rootPathOffset = 0,
    pumpOptions = {},
    checkedEncodings
  ) {
    const options = Object.assign({}, sendOptions, pumpOptions)

    if (rootPath) {
      if (Array.isArray(rootPath)) {
        options.root = rootPath[rootPathOffset]
      } else {
        options.root = rootPath
      }
    }

    if (allowedPath && !allowedPath(pathname, options.root, request)) {
      return reply.callNotFound()
    }

    let encoding
    let pathnameForSend = pathname

    if (opts.preCompressed) {
      /**
       * We conditionally create this structure to track our attempts
       * at sending pre-compressed assets
       */
      if (!checkedEncodings) {
        checkedEncodings = new Set()
      }

      encoding = getEncodingHeader(request.headers, checkedEncodings)

      if (encoding) {
        if (pathname.endsWith('/')) {
          pathname = findIndexFile(pathname, options.root, options.index)
          if (!pathname) {
            return reply.callNotFound()
          }
          pathnameForSend = pathnameForSend + pathname + '.' + getEncodingExtension(encoding)
        } else {
          pathnameForSend = pathname + '.' + getEncodingExtension(encoding)
        }
      }
    }

    const stream = send(request.raw, pathnameForSend, options)
    let resolvedFilename
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
    wrap.removeHeader = () => {}
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

    if (request.method === 'HEAD') {
      wrap.on('finish', reply.send.bind(reply))
    } else {
      wrap.on('pipe', function () {
        if (encoding) {
          reply.header('content-type', getContentType(pathname))
          reply.header('content-encoding', encoding)
        }
        reply.send(wrap)
      })
    }

    if (setHeaders !== undefined) {
      stream.on('headers', setHeaders)
    }

    stream.on('directory', function (_, path) {
      if (opts.list) {
        dirList.send({
          reply,
          dir: path,
          options: opts.list,
          route: pathname,
          prefix,
          dotfiles: opts.dotfiles
        }).catch((err) => reply.send(err))
        return
      }

      if (opts.redirect === true) {
        try {
          reply.redirect(301, getRedirectUrl(request.raw.url))
        } catch (error) {
          // the try-catch here is actually unreachable, but we keep it for safety and prevent DoS attack
          /* istanbul ignore next */
          reply.send(error)
        }
      } else {
        // if is a directory path without a trailing slash, and has an index file, reply as if it has a trailing slash
        if (!pathname.endsWith('/') && findIndexFile(pathname, options.root, options.index)) {
          return pumpSendToReply(
            request,
            reply,
            pathname + '/',
            rootPath,
            undefined,
            undefined,
            checkedEncodings
          )
        }

        reply.callNotFound()
      }
    })

    stream.on('error', function (err) {
      if (err.code === 'ENOENT') {
        // when preCompress is enabled and the path is a directory without a trailing slash
        if (opts.preCompressed && encoding) {
          const indexPathname = findIndexFile(pathname, options.root, options.index)
          if (indexPathname) {
            return pumpSendToReply(
              request,
              reply,
              pathname + '/',
              rootPath,
              undefined,
              undefined,
              checkedEncodings
            )
          }
        }

        // if file exists, send real file, otherwise send dir list if name match
        if (opts.list && dirList.handle(pathname, opts.list)) {
          dirList.send({
            reply,
            dir: dirList.path(opts.root, pathname),
            options: opts.list,
            route: pathname,
            prefix,
            dotfiles: opts.dotfiles
          }).catch((err) => reply.send(err))
          return
        }

        // root paths left to try?
        if (Array.isArray(rootPath) && rootPathOffset < (rootPath.length - 1)) {
          return pumpSendToReply(request, reply, pathname, rootPath, rootPathOffset + 1)
        }

        if (opts.preCompressed && !checkedEncodings.has(encoding)) {
          checkedEncodings.add(encoding)
          return pumpSendToReply(
            request,
            reply,
            pathname,
            rootPath,
            rootPathOffset,
            undefined,
            checkedEncodings
          )
        }

        return reply.callNotFound()
      }

      // The `send` library terminates the request with a 404 if the requested
      // path contains a dotfile and `send` is initialized with `{dotfiles:
      // 'ignore'}`. `send` aborts the request before getting far enough to
      // check if the file exists (hence, a 404 `NotFoundError` instead of
      // `ENOENT`).
      // https://github.com/pillarjs/send/blob/de073ed3237ade9ff71c61673a34474b30e5d45b/index.js#L582
      if (err.status === 404) {
        return reply.callNotFound()
      }

      reply.send(err)
    })

    // we cannot use pump, because send error
    // handling is not compatible
    stream.pipe(wrap)
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
    constraints: opts.constraints,
    schema: {
      hide: typeof opts.schemaHide !== 'undefined' ? opts.schemaHide : true
    },
    errorHandler
  }

  if (opts.decorateReply !== false) {
    fastify.decorateReply('sendFile', function (filePath, rootPath, options) {
      const opts = typeof rootPath === 'object' ? rootPath : options
      const root = typeof rootPath === 'string' ? rootPath : opts && opts.root
      pumpSendToReply(
        this.request,
        this,
        filePath,
        root || sendOptions.root,
        0,
        opts
      )
      return this
    })

    fastify.decorateReply(
      'download',
      function (filePath, fileName, options = {}) {
        const { root, ...opts } =
          typeof fileName === 'object' ? fileName : options
        fileName = typeof fileName === 'string' ? fileName : filePath

        // Set content disposition header
        this.header('content-disposition', contentDisposition(fileName))

        pumpSendToReply(this.request, this, filePath, root, 0, opts)

        return this
      }
    )
  }

  if (opts.serve !== false) {
    if (opts.wildcard && typeof opts.wildcard !== 'boolean') {
      throw new Error('"wildcard" option must be a boolean')
    }
    if (opts.wildcard === undefined || opts.wildcard === true) {
      fastify.head(prefix + '*', routeOpts, function (req, reply) {
        pumpSendToReply(req, reply, '/' + req.params['*'], sendOptions.root)
      })
      fastify.get(prefix + '*', routeOpts, function (req, reply) {
        pumpSendToReply(req, reply, '/' + req.params['*'], sendOptions.root)
      })
      if (opts.redirect === true && prefix !== opts.prefix) {
        fastify.get(opts.prefix, routeOpts, function (req, reply) {
          reply.redirect(301, getRedirectUrl(req.raw.url))
        })
      }
    } else {
      const globPattern = '**/**'
      const indexDirs = new Map()
      const routes = new Set()

      const winSeparatorRegex = new RegExp(`\\${path.win32.sep}`, 'g')

      for (const rootPath of Array.isArray(sendOptions.root) ? sendOptions.root : [sendOptions.root]) {
        const files = await globPromise(path.join(rootPath, globPattern).replace(winSeparatorRegex, path.posix.sep), { nodir: true, dot: opts.serveDotFiles })
        const indexes = typeof opts.index === 'undefined' ? ['index.html'] : [].concat(opts.index)

        for (let file of files) {
          file = file
            .replace(rootPath.replace(/\\/g, '/'), '')
            .replace(/^\//, '')
          const route = (prefix + file).replace(/\/\//g, '/')
          if (routes.has(route)) {
            continue
          }
          routes.add(route)

          setUpHeadAndGet(fastify, routeOpts, route, '/' + file, rootPath)

          const key = path.posix.basename(route)
          if (indexes.includes(key) && !indexDirs.has(key)) {
            indexDirs.set(path.posix.dirname(route), rootPath)
          }
        }
      }

      for (const [dirname, rootPath] of indexDirs.entries()) {
        const pathname = dirname + (dirname.endsWith('/') ? '' : '/')
        const file = '/' + pathname.replace(prefix, '')
        setUpHeadAndGet(fastify, routeOpts, pathname, file, rootPath)

        if (opts.redirect === true) {
          setUpHeadAndGet(fastify, routeOpts, pathname.replace(/\/$/, ''), file.replace(/\/$/, ''), rootPath)
        }
      }
    }
  }

  function setUpHeadAndGet (fastify, routeOpts, route, file, rootPath) {
    const toSetUp = {
      ...routeOpts,
      method: ['HEAD', 'GET'],
      url: route,
      handler: serveFileHandler
    }
    toSetUp.config = toSetUp.config || {}
    toSetUp.config.file = file
    toSetUp.config.rootPath = rootPath
    fastify.route(toSetUp)
  }

  function serveFileHandler (req, reply) {
    const file = req.routeConfig.file
    const rootPath = req.routeConfig.rootPath
    pumpSendToReply(req, reply, file, rootPath)
  }
}
function normalizeRoot (root) {
  if (root === undefined) {
    return root
  }
  if (root instanceof URL && root.protocol === 'file:') {
    return url.fileURLToPath(root)
  }
  if (Array.isArray(root)) {
    const result = []
    for (let i = 0, il = root.length; i < il; ++i) {
      if (root[i] instanceof URL && root[i].protocol === 'file:') {
        result.push(url.fileURLToPath(root[i]))
      } else {
        result.push(root[i])
      }
    }

    return result
  }

  return root
}

function checkRootPathForErrors (fastify, rootPath) {
  if (rootPath === undefined) {
    throw new Error('"root" option is required')
  }

  if (Array.isArray(rootPath)) {
    if (!rootPath.length) {
      throw new Error('"root" option array requires one or more paths')
    }

    if ([...new Set(rootPath)].length !== rootPath.length) {
      throw new Error(
        '"root" option array contains one or more duplicate paths'
      )
    }

    // check each path and fail at first invalid
    rootPath.map((path) => checkPath(fastify, path))
    return
  }

  if (typeof rootPath === 'string') {
    return checkPath(fastify, rootPath)
  }

  throw new Error('"root" option must be a string or array of strings')
}

function checkPath (fastify, rootPath) {
  if (typeof rootPath !== 'string') {
    throw new Error('"root" option must be a string')
  }
  if (path.isAbsolute(rootPath) === false) {
    throw new Error('"root" option must be an absolute path')
  }

  let pathStat

  try {
    pathStat = statSync(rootPath)
  } catch (e) {
    if (e.code === 'ENOENT') {
      fastify.log.warn(`"root" path "${rootPath}" must exist`)
      return
    }

    throw e
  }

  if (pathStat.isDirectory() === false) {
    throw new Error('"root" option must point to a directory')
  }
}

const supportedEncodings = ['br', 'gzip', 'deflate']

function getContentType (path) {
  const type = send.mime.getType(path)

  if (!send.isUtf8MimeType(type)) {
    return type
  }
  return `${type}; charset=UTF-8`
}

function findIndexFile (pathname, root, indexFiles = ['index.html']) {
  // TODO remove istanbul ignore
  /* istanbul ignore else */
  if (Array.isArray(indexFiles)) {
    return indexFiles.find(filename => {
      const p = path.join(root, pathname, filename)
      try {
        const stats = statSync(p)
        return !stats.isDirectory()
      } catch (e) {
        return false
      }
    })
  }
  /* istanbul ignore next */
  return false
}

// Adapted from https://github.com/fastify/fastify-compress/blob/665e132fa63d3bf05ad37df3c20346660b71a857/index.js#L451
function getEncodingHeader (headers, checked) {
  if (!('accept-encoding' in headers)) return

  const header = headers['accept-encoding'].toLowerCase().replace(/\*/g, 'gzip')
  return encodingNegotiator.negotiate(
    header,
    supportedEncodings.filter((enc) => !checked.has(enc))
  )
}

function getEncodingExtension (encoding) {
  switch (encoding) {
    case 'br':
      return 'br'

    case 'gzip':
      return 'gz'
  }
}

function getRedirectUrl (url) {
  let i = 0
  // we detect how many slash before a valid path
  for (i; i < url.length; i++) {
    if (url[i] !== '/' && url[i] !== '\\') break
  }
  // turns all leading / or \ into a single /
  url = '/' + url.substr(i)
  try {
    const parsed = new URL(url, 'http://localhost.com/')
    return parsed.pathname + (parsed.pathname[parsed.pathname.length - 1] !== '/' ? '/' : '') + (parsed.search || '')
  } catch (error) {
    // the try-catch here is actually unreachable, but we keep it for safety and prevent DoS attack
    /* istanbul ignore next */
    const err = new Error(`Invalid redirect URL: ${url}`)
    /* istanbul ignore next */
    err.statusCode = 400
    /* istanbul ignore next */
    throw err
  }
}

module.exports = fp(fastifyStatic, {
  fastify: '4.x',
  name: '@fastify/static'
})
module.exports.default = fastifyStatic
module.exports.fastifyStatic = fastifyStatic
