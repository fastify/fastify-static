'use strict'

const fs = require('node:fs/promises')
const path = require('node:path')

function globToRegex (pattern) {
  let p = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  p = p.replace(/\*\*\//g, '___GLOBSTAR___')
  p = p.replace(/\*\*/g, '.*')
  p = p.replace(/\*/g, '[^/]*')
  p = p.replace(/___GLOBSTAR___/g, '(?:.*/)?')
  return new RegExp('^' + p + '$')
}

function isIgnored(relativePath, ignorePatterns) {
  const patterns = [].concat(ignorePatterns)
  return patterns.some(pattern => globToRegex(pattern).test(relativePath))
}

async function findFiles (dir, opts, baseDir = dir) {
  const files = []
  let list
  try {
    list = await fs.readdir(dir, { withFileTypes: true })
  } catch (err) {
    return files
  }

  for (const entry of list) {
    const fullPath = path.join(dir, entry.name)
    const relativePath = path.relative(baseDir, fullPath).split(path.win32.sep).join(path.posix.sep)

    const isDotFile = entry.name.startsWith('.')
    if (isDotFile && !opts.serveDotFiles) {
      continue
    }

    if (opts.globIgnore && isIgnored(relativePath, opts.globIgnore)) {
      continue
    }

    let isDirectory = entry.isDirectory()
    let isFile = entry.isFile()

    if (entry.isSymbolicLink()) {
      try {
        const stat = await fs.stat(fullPath)
        isDirectory = stat.isDirectory()
        isFile = stat.isFile()
      } catch (err) {
        continue
      }
    }

    if (isDirectory) {
      files.push(...(await findFiles(fullPath, opts, baseDir)))
    } else if (isFile) {
      files.push(relativePath)
    }
  }
  return files
}

async function glob (pattern, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }
  const opts = {
    serveDotFiles: options.dot,
    globIgnore: options.ignore
  }

  if (typeof cb === 'function') {
    findFiles(options.cwd, opts).then(
      files => cb(null, files),
      err => cb(err)
    )
    return
  }

  return findFiles(options.cwd, opts)
}

module.exports = { glob }
