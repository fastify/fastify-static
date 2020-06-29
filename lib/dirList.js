'use strict'

const glob = require('glob')
const path = require('path')
const fs = require('fs')

const dirList = {
  /**
   * @todo doc
   * @param
   */
  send: function ({ reply, dir, options, route }) {
    glob(dir + '/*', { mark: true }, (err, entries) => {
      if (err) {
        reply.send(err)
        return
      }

      const response = { dirs: [], files: [] }
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        // glob mark with an ending '/' dirs using mark option
        const to = entry[entry.length - 1] === '/'
          ? response.dirs
          : response.files
        to.push(path.basename(entry))
      }

      if (options.format !== 'html') {
        reply.send(response)
        return
      }

      const html = options.render(
        response.dirs.map(entry => dirList.htmlInfo(entry, route)),
        response.files.map(entry => dirList.htmlInfo(entry, route)))
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
  validateOptions: function (options) {}

}

module.exports = dirList
