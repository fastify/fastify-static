'use strict'

const crypto = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const { Glob } = require('glob')
const fastq = require('fastq')
const fastqConcurrency = Math.max(1, os.cpus().length - 1)

async function generateFileHash (filePath) {
  try {
    const fileBuffer = await fs.readFile(filePath)
    return crypto.createHash('md5').update(fileBuffer).digest('hex').slice(0, 16)
  } catch {
    return ''
  }
}

/**
 * Generates hashes for files matching the glob pattern within specified directories.
 * Can be used both at build time and runtime.
 * @param {{ rootPaths: string|string[], includeDotFiles?: boolean, skipPatterns?: string|string[], writeToFile?: boolean, outputPath?: string }} options - The options object.
 * @returns {Promise<void|Map<string, string>>} - Returns nothing if writing to a file, or the hash map if not.
 */
async function generateHashes ({
  rootPaths,
  includeDotFiles = false,
  skipPatterns = ['node_modules/**'],
  writeToFile = false,
  outputPath
}) {
  const fileHashes = new Map()
  const roots = Array.isArray(rootPaths) ? rootPaths : [rootPaths]

  for (let rootPath of roots) {
    rootPath = rootPath.split(path.win32.sep).join(path.posix.sep)
    if (!rootPath.endsWith('/')) {
      rootPath += '/'
    }

    const queue = fastq.promise(generateFileHash, fastqConcurrency)
    const queuePromises = []
    const files = []

    const filesIterable = new Glob('**/**', {
      cwd: rootPath, absolute: true, follow: true, nodir: true, dot: includeDotFiles, ignore: skipPatterns
    })

    for await (let file of filesIterable) {
      file = file.split(path.win32.sep).join(path.posix.sep)
      files.push(file)
      queuePromises.push(queue.push(file))
    }

    const hashes = await Promise.all(queuePromises)

    for (let i = 0; i < files.length; i++) {
      const fileRelativePath = path.posix.relative(rootPath, files[i])
      fileHashes.set(fileRelativePath, hashes[i])
    }
  }

  if (writeToFile) {
    if (!outputPath) throw new Error('Output path is required when writing to a file')
    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.writeFile(outputPath, JSON.stringify(Object.fromEntries(fileHashes), null, 2))
  } else {
    return fileHashes
  }
}

module.exports = { generateFileHash, generateHashes }
