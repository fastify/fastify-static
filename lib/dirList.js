'use strict'

const path = require('path')
const fs = require('fs')

const dirList = {
  list: function (dir, callback) {
    const entries = { dirs: [], files: [] }
    fs.readdir(dir, (err, files) => {
      if (err) {
        return callback(err)
      }
      if (files.length < 1) {
        callback(null, entries)
        return
      }
      let j = 0
      for (let i = 0; i < files.length; i++) {
        const filename = files[i]
        fs.stat(path.join(dir, filename), (err, file) => {
          if (!err) {
            if (file.isDirectory()) {
              entries.dirs.push(filename)
            } else {
              entries.files.push(filename)
            }
          }

          if (j++ >= files.length - 1) {
            entries.dirs.sort()
            entries.files.sort()
            callback(null, entries)
          }
        })
      }
    })
  },

  /**
   * @todo doc
   * @param
   */
  send: function ({ reply, dir, options, route }) {
    dirList.list(dir, (err, entries) => {
      if (err) {
        reply.callNotFound()
        return
      }

      if (options.format !== 'html') {
        reply.send(entries)
        return
      }

      const html = options.render(
        entries.dirs.map(entry => dirList.htmlInfo(entry, route)),
        entries.files.map(entry => dirList.htmlInfo(entry, route)))
      reply.type('text/html').send(html)
    })
  },

  /**
   * @todo doc
   */
  htmlInfo: function (entry, route) {
    return { href: path.join(path.dirname(route), entry), name: entry }
  },

  /**
   * @todo doc
   */
  handle: function (route, options) {
    if (!options.names) {
      return false
    }
    return options.names.includes(path.basename(route)) ||
      // match trailing slash
      (options.names.includes('/') && route[route.length - 1] === '/')
  },

  /**
   * get path from route and fs root paths, considering trailing slash
   */
  path: function (root, route) {
    const _route = route[route.length - 1] === '/'
      ? route + 'none'
      : route
    return path.dirname(path.join(root, _route))
  },

  /**
   * @todo doc
   */
  validateOptions: function (options) {
    if (!options) {
      return
    }
    if (options.format && options.format !== 'json' && options.format !== 'html') {
      return new TypeError('The `list.format` option must be json or html')
    }
    if (options.names && !Array.isArray(options.names)) {
      return new TypeError('The `list.names` option must be an array')
    }
    if (options.format === 'html' && typeof options.render !== 'function') {
      return new TypeError('The `list.render` option must be a function and is required with html format')
    }
  }

}

module.exports = dirList
