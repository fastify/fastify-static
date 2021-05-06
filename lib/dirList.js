'use strict'

const path = require('path')
const fs = require('fs')

const dirList = {
  /**
   * get files and dirs from dir, or error
   * @param {string} dir full path fs dir
   * @param {function(error, entries)} callback
   * note: can't use glob because don't get error on non existing dir
   */
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
   * send dir list content, or 404 on error
   * @param {Fastify.Reply} reply
   * @param {string} dir full path fs dir
   * @param {ListOptions} options
   * @param {string} route request route
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
   * provide the html information about entry and route, to get name and full route
   * @param {string} entry file or dir name
   * @param {string} route request route
   * @return {ListFile}
   */
  htmlInfo: function (entry, route) {
    return { href: path.join(path.dirname(route), entry).replace(/\\/g, '/'), name: entry }
  },

  /**
   * say if the route can be handled by dir list or not
   * @param {string} route request route
   * @param {ListOptions} options
   * @return {boolean}
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
   * @param {string} root fs root path
   * @param {string} route request route
   */
  path: function (root, route) {
    const _route = route[route.length - 1] === '/'
      ? route + 'none'
      : route
    return path.dirname(path.join(root, _route))
  },

  /**
   * validate options
   * @return {Error}
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
