'use strict'

const { createError } = require('@fastify/error')

// Error for @fastify/static options validation
module.exports.FST_STATIC_INVALID_OPTION = createError(
  'FST_STATIC_INVALID_OPTION',
  '"%s" option %s'
)

// TypeError for @fastify/static options validation
module.exports.FST_STATIC_INVALID_OPTION_VALUE = createError(
  'FST_STATIC_INVALID_OPTION_VALUE',
  '"%s" option %s',
  500,
  TypeError
)

module.exports.FST_STATIC_MULTIROOT_LIST_CONFLICT = createError(
  'FST_STATIC_MULTIROOT_LIST_CONFLICT',
  'multi-root with list option is not supported',
  500,
  TypeError
)

module.exports.FST_STATIC_INVALID_REDIRECT_URL = createError(
  'FST_STATIC_INVALID_REDIRECT_URL',
  'Invalid redirect URL: "%s"',
  400
)
