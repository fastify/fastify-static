'use strict'

const path = require('path')
const fs = require('fs').promises
const pLimit = require('p-limit')

const dirList = {
  /**
   * get files and dirs from dir, or error
   * @param {string} dir full path fs dir
   * @param {function(error, entries)} callback
   * note: can't use glob because don't get error on non existing dir
   */
  list: async function (dir, options) {
    const entries = { dirs: [], files: [] }
    const files = await fs.readdir(dir)
    if (files.length < 1) {
      return entries
    }

    const limit = pLimit(4)
    await Promise.all(files.map(filename => limit(async () => {
      let stats
      try {
        stats = await fs.stat(path.join(dir, filename))
      } catch (error) {
        return
      }
      const entry = { name: filename, stats }
      if (stats.isDirectory()) {
        if (options.extendedFolderInfo) {
          entry.extendedInfo = await getExtendedInfo(path.join(dir, filename))
        }
        entries.dirs.push(entry)
      } else {
        entries.files.push(entry)
      }
    })))

    async function getExtendedInfo (folderPath) {
      const depth = folderPath.split(path.sep).length
      let totalSize = 0
      let fileCount = 0
      let totalFileCount = 0
      let folderCount = 0
      let totalFolderCount = 0
      let lastModified = 0

      async function walk (dir) {
        const files = await fs.readdir(dir)
        const limit = pLimit(4)
        await Promise.all(files.map(filename => limit(async () => {
          const filePath = path.join(dir, filename)
          let stats
          try {
            stats = await fs.stat(filePath)
          } catch (error) {
            return
          }

          if (stats.isDirectory()) {
            totalFolderCount++
            if (filePath.split(path.sep).length === depth + 1) {
              folderCount++
            }
            await walk(filePath)
          } else {
            totalSize += stats.size
            totalFileCount++
            if (filePath.split(path.sep).length === depth + 1) {
              fileCount++
            }
            lastModified = Math.max(lastModified, stats.mtimeMs)
          }
        })))
      }

      await walk(folderPath)
      return {
        totalSize,
        fileCount,
        totalFileCount,
        folderCount,
        totalFolderCount,
        lastModified
      }
    }

    entries.dirs.sort((a, b) => a.name.localeCompare(b.name))
    entries.files.sort((a, b) => a.name.localeCompare(b.name))
    return entries
  },

  /**
   * send dir list content, or 404 on error
   * @param {Fastify.Reply} reply
   * @param {string} dir full path fs dir
   * @param {ListOptions} options
   * @param {string} route request route
   */
  send: async function ({ reply, dir, options, route, prefix }) {
    let entries
    try {
      entries = await dirList.list(dir, options)
    } catch (error) {
      return reply.callNotFound()
    }
    const format = reply.request.query.format || options.format
    if (format !== 'html') {
      if (options.jsonFormat !== 'extended') {
        const nameEntries = { dirs: [], files: [] }
        entries.dirs.forEach(entry => nameEntries.dirs.push(entry.name))
        entries.files.forEach(entry => nameEntries.files.push(entry.name))

        reply.send(nameEntries)
      } else {
        reply.send(entries)
      }
      return
    }

    const html = options.render(
      entries.dirs.map(entry => dirList.htmlInfo(entry, route, prefix, options)),
      entries.files.map(entry => dirList.htmlInfo(entry, route, prefix, options)))
    reply.type('text/html').send(html)
  },

  /**
   * provide the html information about entry and route, to get name and full route
   * @param entry file or dir name and stats
   * @param {string} route request route
   * @return {ListFile}
   */
  htmlInfo: function (entry, route, prefix, options) {
    if (options.names && options.names.includes(path.basename(route))) {
      route = path.normalize(path.join(route, '..'))
    }
    return {
      href: path.join(prefix, route, entry.name).replace(/\\/g, '/'),
      name: entry.name,
      stats: entry.stats,
      extendedInfo: entry.extendedInfo
    }
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
    if (!options.list) {
      return
    }

    if (Array.isArray(options.root)) {
      return new TypeError('multi-root with list option is not supported')
    }

    if (options.list.format && options.list.format !== 'json' && options.list.format !== 'html') {
      return new TypeError('The `list.format` option must be json or html')
    }
    if (options.list.names && !Array.isArray(options.list.names)) {
      return new TypeError('The `list.names` option must be an array')
    }
    if (options.list.format === 'html' && typeof options.list.render !== 'function') {
      return new TypeError('The `list.render` option must be a function and is required with html format')
    }
  }

}

module.exports = dirList
