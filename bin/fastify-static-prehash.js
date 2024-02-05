#!/usr/bin/env node

'use strict'

const { generateHashes } = require('../lib/hash')
const path = require('path')

async function run () {
  let [rootPaths, writeLocation, includeDotFiles, ignorePatterns] = process.argv.slice(2)

  if (rootPaths === undefined || writeLocation === undefined) {
    console.error('Usage: hash <root-paths> <write-location> <include-dot-files> <ignore-patterns>')
    process.exit(1)
  }

  rootPaths = rootPaths.split(',').map(p => path.resolve(p.trim()))
  includeDotFiles = includeDotFiles === 'true'
  ignorePatterns = ignorePatterns ? ignorePatterns.split(',') : []

  try {
    await generateHashes({
      rootPaths,
      includeDotFiles,
      skipPatterns: ignorePatterns,
      writeToFile: true,
      outputPath: writeLocation
    }
    )
    console.log('Hashes generated successfully.')
  } catch (error) {
    console.error('Error generating hashes:', error)
  }
}

run()
