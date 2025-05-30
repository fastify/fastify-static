'use strict'

const path = require('node:path')
const { fileURLToPath } = require('node:url')
const { statSync } = require('node:fs')
const { glob } = require('glob')
const fp = require('fastify-plugin')
const send = require('@fastify/send')
const encodingNegotiator = require('@fastify/accept-negotiator')
const contentDisposition = require('content-disposition')

const dirList = require('./lib/dirList')

const endForwardSlashRegex = /\/$/u
const asteriskRegex = /\*/gu

const supportedEncodings = ['br', 'gzip', 'deflate']
send.mime.default_type = 'application/octet-stream'

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
    contentType: opts.contentType,
    cacheControl: opts.cacheControl,
    dotfiles: opts.dotfiles,
    etag: opts.etag,
    extensions: opts.extensions,
    immutable: opts.immutable,
    index: opts.index,
    lastModified: opts.lastModified,
    maxAge: opts.maxAge
  }

  let prefix = opts.prefix ?? (opts.prefix = '/')

  if (!opts.prefixAvoidTrailingSlash) {
    prefix =
      prefix[prefix.length - 1] === '/'
        ? prefix
        : prefix + '/'
  }

  // Set the schema hide property if defined in opts or true by default
  const routeOpts = {
    constraints: opts.constraints,
    schema: {
      hide: opts.schemaHide !== undefined ? opts.schemaHide : true
    },
    logLevel: opts.logLevel,
    errorHandler (error, request, reply) {
      if (error?.code === 'ERR_STREAM_PREMATURE_CLOSE') {
        reply.request.raw.destroy()
        return
      }

      fastify.errorHandler(error, request, reply)
    }
  }

  if (opts.decorateReply !== false) {
    fastify.decorateReply('sendFile', function (filePath, rootPath, options) {
      const opts = typeof rootPath === 'object' ? rootPath : options
      const root = typeof rootPath === 'string' ? rootPath : opts?.root
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
      throw new TypeError('"wildcard" option must be a boolean')
    }
    if (opts.wildcard === undefined || opts.wildcard === true) {
      fastify.route({
        ...routeOpts,
        method: ['HEAD', 'GET'],
        path: prefix + '*',
        handler (req, reply) {
          pumpSendToReply(req, reply, '/' + req.params['*'], sendOptions.root)
        }
      })
      if (opts.redirect === true && prefix !== opts.prefix) {
        fastify.get(opts.prefix, routeOpts, (req, reply) => {
          reply.redirect(getRedirectUrl(req.raw.url), 301)
        })
      }
    } else {
      const indexes = opts.index === undefined ? ['index.html'] : [].concat(opts.index)
      const indexDirs = new Map()
      const routes = new Set()

      const roots = Array.isArray(sendOptions.root) ? sendOptions.root : [sendOptions.root]
      for (let rootPath of roots) {
        rootPath = rootPath.split(path.win32.sep).join(path.posix.sep)
        !rootPath.endsWith('/') && (rootPath += '/')
        const files = await glob('**/**', {
          cwd: rootPath, absolute: false, follow: true, nodir: true, dot: opts.serveDotFiles, ignore: opts.globIgnore
        })

        for (let file of files) {
          file = file.split(path.win32.sep).join(path.posix.sep)
          const route = prefix + file

          if (routes.has(route)) {
            continue
          }

          routes.add(route)

          setUpHeadAndGet(routeOpts, route, `/${file}`, rootPath)

          const key = path.posix.basename(route)
          if (indexes.includes(key) && !indexDirs.has(key)) {
            indexDirs.set(path.posix.dirname(route), rootPath)
          }
        }
      }

      for (const [dirname, rootPath] of indexDirs.entries()) {
        const pathname = dirname + (dirname.endsWith('/') ? '' : '/')
        const file = '/' + pathname.replace(prefix, '')
        setUpHeadAndGet(routeOpts, pathname, file, rootPath)

        if (opts.redirect === true) {
          setUpHeadAndGet(routeOpts, pathname.replace(endForwardSlashRegex, ''), file.replace(endForwardSlashRegex, ''), rootPath)
        }
      }
    }
  }

  const allowedPath = opts.allowedPath

  async function pumpSendToReply (
    request,
    reply,
    pathname,
    rootPath,
    rootPathOffset = 0,
    pumpOptions,
    checkedEncodings
  ) {
    const pathnameOrig = pathname
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

    // `send(..., path, ...)` will URI-decode path so we pass an encoded path here
    const {
      statusCode,
      headers,
      stream,
      type,
      metadata
    } = await send(request.raw, encodeURI(pathnameForSend), options)
    switch (type) {
      case 'directory': {
        const path = metadata.path
        if (opts.list) {
          await dirList.send({
            reply,
            dir: path,
            options: opts.list,
            route: pathname,
            prefix,
            dotfiles: opts.dotfiles
          }).catch((err) => reply.send(err))
        }

        if (opts.redirect === true) {
          try {
            reply.redirect(getRedirectUrl(request.raw.url), 301)
          } /* c8 ignore start */ catch (error) {
            // the try-catch here is actually unreachable, but we keep it for safety and prevent DoS attack
            await reply.send(error)
          } /* c8 ignore stop */
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
        break
      }
      case 'error': {
        if (
          statusCode === 403 &&
          (!options.index || !options.index.length) &&
          pathnameForSend[pathnameForSend.length - 1] === '/'
        ) {
          if (opts.list) {
            await dirList.send({
              reply,
              dir: dirList.path(opts.root, pathname),
              options: opts.list,
              route: pathname,
              prefix,
              dotfiles: opts.dotfiles
            }).catch((err) => reply.send(err))
            return
          }
        }

        if (metadata.error.code === 'ENOENT') {
        // when preCompress is enabled and the path is a directory without a trailing slash
          if (opts.preCompressed && encoding) {
            if (opts.redirect !== true) {
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
          }

          // if file exists, send real file, otherwise send dir list if name match
          if (opts.list && dirList.handle(pathname, opts.list)) {
            await dirList.send({
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
              pathnameOrig,
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
        if (metadata.error.status === 404) {
          return reply.callNotFound()
        }

        await reply.send(metadata.error)
        break
      }
      case 'file': {
        // reply.raw.statusCode by default 200
        // when ever the user changed it, we respect the status code
        // otherwise use send provided status code
        const newStatusCode = reply.statusCode !== 200 ? reply.statusCode : statusCode
        reply.code(newStatusCode)
        if (setHeaders !== undefined) {
          setHeaders(reply.raw, metadata.path, metadata.stat)
        }
        reply.headers(headers)
        if (encoding) {
          reply.header('content-type', getContentType(pathname))
          reply.header('content-encoding', encoding)
        }
        await reply.send(stream)
        break
      }
    }
  }

  function setUpHeadAndGet (routeOpts, route, file, rootPath) {
    const toSetUp = Object.assign({}, routeOpts, {
      method: ['HEAD', 'GET'],
      url: route,
      handler: serveFileHandler
    })
    toSetUp.config = toSetUp.config || {}
    toSetUp.config.file = file
    toSetUp.config.rootPath = rootPath
    fastify.route(toSetUp)
  }

  async function serveFileHandler (req, reply) {
    // TODO: remove the fallback branch when bump major
    /* c8 ignore next */
    const routeConfig = req.routeOptions?.config || req.routeConfig
    return pumpSendToReply(req, reply, routeConfig.file, routeConfig.rootPath)
  }
}

function normalizeRoot (root) {
  if (root === undefined) {
    return root
  }
  if (root instanceof URL && root.protocol === 'file:') {
    return fileURLToPath(root)
  }
  if (Array.isArray(root)) {
    const result = []
    for (let i = 0, il = root.length; i < il; ++i) {
      if (root[i] instanceof URL && root[i].protocol === 'file:') {
        result.push(fileURLToPath(root[i]))
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

    if (new Set(rootPath).size !== rootPath.length) {
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
    throw new TypeError('"root" option must be a string')
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

function getContentType (path) {
  const type = send.mime.getType(path) || send.mime.default_type

  if (!send.isUtf8MimeType(type)) {
    return type
  }
  return `${type}; charset=utf-8`
}

function findIndexFile (pathname, root, indexFiles = ['index.html']) {
  if (Array.isArray(indexFiles)) {
    return indexFiles.find(filename => {
      const p = path.join(root, pathname, filename)
      try {
        const stats = statSync(p)
        return !stats.isDirectory()
      } catch {
        return false
      }
    })
  }
  /* c8 ignore next */
  return false
}

// Adapted from https://github.com/fastify/fastify-compress/blob/665e132fa63d3bf05ad37df3c20346660b71a857/index.js#L451
function getEncodingHeader (headers, checked) {
  if (!('accept-encoding' in headers)) return

  // consider the no-preference token as gzip for downstream compat
  const header = headers['accept-encoding'].toLowerCase().replace(asteriskRegex, 'gzip')

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
  for (; i < url.length; ++i) {
    if (url[i] !== '/' && url[i] !== '\\') break
  }
  // turns all leading / or \ into a single /
  url = '/' + url.substr(i)
  try {
    const parsed = new URL(url, 'http://localhost.com/')
    const parsedPathname = parsed.pathname
    return parsedPathname + (parsedPathname[parsedPathname.length - 1] !== '/' ? '/' : '') + (parsed.search || '')
  } /* c8 ignore start */ catch {
    // the try-catch here is actually unreachable, but we keep it for safety and prevent DoS attack
    const err = new Error(`Invalid redirect URL: ${url}`)
    err.statusCode = 400
    throw err
  } /* c8 ignore stop */
}

module.exports = fp(fastifyStatic, {
  fastify: '5.x',
  name: '@fastify/static'
})
module.exports.default = fastifyStatic
module.exports.fastifyStatic = fastifyStatic
