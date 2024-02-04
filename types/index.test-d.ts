import fastify, { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { Server } from 'http'
import { Stats } from 'fs'
import { expectAssignable, expectError, expectType } from 'tsd'
import * as fastifyStaticStar from '..'
import fastifyStatic, {
  FastifyStaticOptions,
  fastifyStatic as fastifyStaticNamed
} from '..'

import fastifyStaticCjsImport = require('..');
const fastifyStaticCjs = require('..')

const app: FastifyInstance = fastify()

app.register(fastifyStatic)
app.register(fastifyStaticNamed)
app.register(fastifyStaticCjs)
app.register(fastifyStaticCjsImport.default)
app.register(fastifyStaticCjsImport.fastifyStatic)
app.register(fastifyStaticStar.default)
app.register(fastifyStaticStar.fastifyStatic)

expectType<FastifyPluginAsync<FastifyStaticOptions, Server>>(fastifyStatic)
expectType<FastifyPluginAsync<FastifyStaticOptions, Server>>(fastifyStaticNamed)
expectType<FastifyPluginAsync<FastifyStaticOptions, Server>>(fastifyStaticCjsImport.default)
expectType<FastifyPluginAsync<FastifyStaticOptions, Server>>(fastifyStaticCjsImport.fastifyStatic)
expectType<FastifyPluginAsync<FastifyStaticOptions, Server>>(fastifyStaticStar.default)
expectType<FastifyPluginAsync<FastifyStaticOptions, Server>>(
  fastifyStaticStar.fastifyStatic
)
expectType<any>(fastifyStaticCjs)

const appWithImplicitHttp = fastify()
const options: FastifyStaticOptions = {
  acceptRanges: true,
  cacheControl: true,
  decorateReply: true,
  dotfiles: 'allow',
  etag: true,
  extensions: ['.js'],
  immutable: true,
  index: ['1'],
  lastModified: true,
  maxAge: '',
  prefix: '',
  prefixAvoidTrailingSlash: false,
  root: '',
  schemaHide: true,
  serve: true,
  wildcard: true,
  list: false,
  setHeaders: (res, path, stat) => {
    expectType<string>(res.filename)
    expectType<number>(res.statusCode)
    expectType<ReturnType<FastifyReply['getHeader']>>(res.getHeader('X-Test'))
    res.setHeader('X-Test', 'string')

    expectType<string>(path)

    expectType<Stats>(stat)
  },
  preCompressed: false,
  allowedPath: (pathName: string, root: string, request: FastifyRequest) => {
    return true
  },
  constraints: {
    host: /.*\.example\.com/,
    version: '1.0.2'
  }
}

expectError<FastifyStaticOptions>({
  root: '',
  wildcard: '**/**'
})

expectError<FastifyStaticOptions>({
  root: '',
  hash: '**/**'
})

expectAssignable<FastifyStaticOptions>({
  root: '',
  hash: true
})

expectAssignable<FastifyStaticOptions>({
  root: '',
  hash: true,
  hashSkip: ['index.html']
})

expectAssignable<FastifyStaticOptions>({
  root: '',
  hash: true,
  hashPath: '.tmp/hashes.json'
})

expectAssignable<FastifyStaticOptions>({
  root: '',
  list: {
    format: 'json'
  }
})

expectAssignable<FastifyStaticOptions>({
  root: '',
  list: {
    format: 'json',
    render: () => ''
  }
})

expectAssignable<FastifyStaticOptions>({
  root: '',
  list: {
    format: 'html',
    render: () => ''
  }
})

expectError<FastifyStaticOptions>({
  root: '',
  list: {
    format: 'html'
  }
})

expectAssignable<FastifyStaticOptions>({
  root: ['']
})

expectAssignable<FastifyStaticOptions>({
  root: new URL('')
})

expectAssignable<FastifyStaticOptions>({
  root: [new URL('')]
})

appWithImplicitHttp
  .register(fastifyStatic, options)
  .after(() => {
    appWithImplicitHttp.get('/', (request, reply) => {
      reply.sendFile('some-file-name')
    })
  })

const appWithHttp2 = fastify({ http2: true })

appWithHttp2
  .register(fastifyStatic, options)
  .after(() => {
    appWithHttp2.get('/', (request, reply) => {
      reply.sendFile('some-file-name')
    })

    appWithHttp2.get('/download', (request, reply) => {
      reply.download('some-file-name')
    })

    appWithHttp2.get('/download/1', (request, reply) => {
      reply.download('some-file-name', { maxAge: '2 days' })
    })

    appWithHttp2.get('/download/2', (request, reply) => {
      reply.download('some-file-name', 'some-filename', { cacheControl: false, acceptRanges: true })
    })
  })

const appWithHash = fastify({ http2: true })

appWithHash
  .register(fastifyStatic, { ...options, hash: true })
  .after(() => {
    appWithHttp2.get('/', (request, reply) => {
      reply.sendFile(appWithHash.getHashedAsset('hello.css'))
    })
  })

const multiRootAppWithImplicitHttp = fastify()
options.root = ['']

multiRootAppWithImplicitHttp
  .register(fastifyStatic, options)
  .after(() => {
    multiRootAppWithImplicitHttp.get('/', (request, reply) => {
      reply.sendFile('some-file-name')
    })

    multiRootAppWithImplicitHttp.get('/', (request, reply) => {
      reply.sendFile('some-file-name', { cacheControl: false, acceptRanges: true })
    })

    multiRootAppWithImplicitHttp.get('/', (request, reply) => {
      reply.sendFile('some-file-name', 'some-root-name', { cacheControl: false, acceptRanges: true })
    })

    multiRootAppWithImplicitHttp.get('/download', (request, reply) => {
      reply.download('some-file-name')
    })

    multiRootAppWithImplicitHttp.get('/download/1', (request, reply) => {
      reply.download('some-file-name', { maxAge: '2 days' })
    })

    multiRootAppWithImplicitHttp.get('/download/2', (request, reply) => {
      reply.download('some-file-name', 'some-filename', { cacheControl: false, acceptRanges: true })
    })
  })

const noIndexApp = fastify()
options.root = ''
options.index = false

noIndexApp
  .register(fastifyStatic, options)
  .after(() => {
    noIndexApp.get('/', (request, reply) => {
      reply.send('<h1>fastify-static</h1>')
    })
  })

options.root = new URL('')

const URLRootApp = fastify()
URLRootApp.register(fastifyStatic, options)
  .after(() => {
    URLRootApp.get('/', (request, reply) => {
      reply.send('<h1>fastify-static</h1>')
    })
  })

const defaultIndexApp = fastify()
options.index = 'index.html'

defaultIndexApp
  .register(fastifyStatic, options)
  .after(() => {
    defaultIndexApp.get('/', (request, reply) => {
      reply.send('<h1>fastify-static</h1>')
    })
  })
