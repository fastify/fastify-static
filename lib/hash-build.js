#!/usr/bin/env node

'use strict'

const { generateHashes } = require('./hash')
const path = require('path')

async function run () {
  const rootPathArg = process.argv[2]

  if (!rootPathArg) {
    console.error('Usage: hash-build <root-path>')
    process.exit(1)
  }

  const rootPaths = rootPathArg.split(',').map(p => path.resolve(p.trim()))

  const ignorePatterns = process.env.IGNORE_PATTERNS ? process.env.IGNORE_PATTERNS.split(',').map(p => p.trim()) : undefined
  const includeDotFiles = process.env.DOTFILES ? process.env.DOTFILES === 'true' : true

  try {
    await generateHashes(rootPaths, ignorePatterns, includeDotFiles, true)
    console.log('Hashes generated successfully.')
  } catch (error) {
    console.error('Error generating hashes:', error)
  }
}

run()
