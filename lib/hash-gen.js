#!/usr/bin/env node

'use strict'

const { generateHashes } = require('./hash')
const path = require('path')

async function run () {
  let [rootPaths, writeLocation, includeDotFiles, ignorePatterns] = process.argv.slice(2)

  if (!rootPaths) {
    console.error('Usage: hash <root-path> <write-location> <include-dot-files> <ignore-patterns>')
    process.exit(1)
  }

  rootPaths = rootPaths.split(',').map(p => path.resolve(p.trim()))
  includeDotFiles = includeDotFiles === 'true'
  ignorePatterns = ignorePatterns ? ignorePatterns.split(',') : []

  try {
    await generateHashes(rootPaths, includeDotFiles, ignorePatterns, true, writeLocation)
    console.log('Hashes generated successfully.')
  } catch (error) {
    console.error('Error generating hashes:', error)
  }
}

run()
