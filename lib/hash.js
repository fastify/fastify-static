'use strict'

const crypto = require('crypto')
const fs = require('fs').promises
const path = require('path')
const os = require('os')
const { Glob } = require('glob')
const fastq = require('fastq')

async function generateFileHash (filePath) {
  try {
    const fileBuffer = await fs.readFile(filePath)
    return `${crypto.createHash('md5').update(fileBuffer).digest('hex').slice(0, 16)}-`
  } catch {
    return ''
  }
}

/**
 * Generates hashes for files matching the glob pattern within specified directories.
 * Can be used both at build time and runtime.
 *
 * @param {string|string[]} rootPaths - A single root directory or an array of root directories to process.
 * @param {string|string[]|undefined} ignore - An array of glob patterns to ignore.
 * @param {boolean} [includeDotFiles] - Whether to include dot files.
 * @param {boolean} [writeToFile] - Whether to write the hash map to a file (for build) or return it (for runtime).
 * @param {string} [outputPath='.tmp/hashes.json'] - The output file path, if writing to a file.
 * @returns {Promise<void|Map<string, string>>} - Returns nothing if writing to a file, or the hash map if not.
 */
async function generateHashes (rootPaths, ignore, includeDotFiles = false, writeToFile = false, outputPath = '.tmp/hashes.json') {
  const fileHashes = new Map()
  const roots = Array.isArray(rootPaths) ? rootPaths : [rootPaths]

  for (let rootPath of roots) {
    rootPath = rootPath.split(path.win32.sep).join(path.posix.sep)
    if (!rootPath.endsWith('/')) {
      rootPath += '/'
    }

    const queue = fastq.promise(generateFileHash, os.cpus().length)
    const hashPromises = []
    const files = []

    for await (const file of new Glob('**/**', {
      cwd: rootPath, absolute: true, follow: true, nodir: true, dot: includeDotFiles, ignore
    })) {
      const normalizedFile = file.split(path.win32.sep).join(path.posix.sep)
      files.push(normalizedFile)
      hashPromises.push(queue.push(normalizedFile))
    }

    const hashes = await Promise.all(hashPromises)

    for (let i = 0; i < files.length; i++) {
      const fileRelativePath = path.posix.relative(rootPath, files[i])
      const relativePathArray = fileRelativePath.split('/')

      relativePathArray.pop()
      relativePathArray.push(hashes[i] + path.basename(fileRelativePath))
      fileHashes.set(fileRelativePath, relativePathArray.join('/'))
    }
  }

  if (writeToFile) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.writeFile(outputPath, JSON.stringify(Object.fromEntries(fileHashes), null, 2))
  } else {
    return fileHashes
  }
}

module.exports = { generateFileHash, generateHashes }
