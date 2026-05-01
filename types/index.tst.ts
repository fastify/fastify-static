import fastify, { type FastifyInstance, type FastifyPluginAsync, type FastifyRequest, type FastifyReply } from 'fastify'
import { type Server } from 'node:http'
import { type Stats } from 'node:fs'
import { expect } from 'tstyche'
import * as fastifyStaticStar from '..'
import fastifyStatic, {
  type FastifyStaticOptions,
  fastifyStatic as fastifyStaticNamed
} from '..'

const fastifyStaticCjsImport = fastifyStaticStar
const fastifyStaticCjs = require('..')

const app: FastifyInstance = fastify()

app.register(fastifyStatic, { root: __dirname })
app.register(fastifyStaticNamed, { root: __dirname })
app.register(fastifyStaticCjs, { root: __dirname })
app.register(fastifyStaticCjsImport.default, { root: __dirname })
app.register(fastifyStaticCjsImport.fastifyStatic, { root: __dirname })
app.register(fastifyStaticStar.default, { root: __dirname })
app.register(fastifyStaticStar.fastifyStatic, { root: __dirname })

expect(fastifyStatic).type.toBe<FastifyPluginAsync<FastifyStaticOptions, Server>>()
expect(fastifyStaticNamed).type.toBe<FastifyPluginAsync<FastifyStaticOptions, Server>>()
expect(fastifyStaticCjsImport.default).type.toBe<FastifyPluginAsync<FastifyStaticOptions, Server>>()
expect(fastifyStaticCjsImport.fastifyStatic).type.toBe<FastifyPluginAsync<FastifyStaticOptions, Server>>()
expect(fastifyStaticStar.default).type.toBe<FastifyPluginAsync<FastifyStaticOptions, Server>>()
expect(fastifyStaticStar.fastifyStatic).type.toBe<FastifyPluginAsync<FastifyStaticOptions, Server>>()
expect(fastifyStaticCjs).type.toBe<any>()

const appWithImplicitHttp = fastify()
const options: FastifyStaticOptions = {
  acceptRanges: true,
  contentType: true,
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
  globIgnore: ['**/*.private'],
  list: false,
  setHeaders: (res, path, stat) => {
    expect(res.filename).type.toBe<string>()
    expect(res.statusCode).type.toBe<number>()
    expect(res.getHeader('X-Test')).type.toBe<ReturnType<FastifyReply['getHeader']>>()
    res.setHeader('X-Test', 'string')

    expect(path).type.toBe<string>()

    expect(stat).type.toBe<Stats>()
  },
  preCompressed: false,
  allowedPath: (_pathName: string, _root: string, _request: FastifyRequest) => {
    return true
  },
  constraints: {
    host: /^.*\.example\.com$/,
    version: '1.0.2'
  },
  logLevel: 'warn'
}

expect<FastifyStaticOptions>()
  .type.toBeAssignableFrom({
    root: '',
    list: {
      format: 'json' as const
    }
  })

expect<FastifyStaticOptions>()
  .type.toBeAssignableFrom({
    root: '',
    list: {
      format: 'json' as const,
      render: () => ''
    }
  })

expect<FastifyStaticOptions>()
  .type.toBeAssignableFrom({
    root: '',
    list: {
      format: 'html' as const,
      render: () => ''
    }
  })

expect<FastifyStaticOptions>()
  .type.toBeAssignableFrom({
    root: ['']
  })

expect<FastifyStaticOptions>()
  .type.toBeAssignableFrom({
    root: new URL('file://')
  })

expect<FastifyStaticOptions>()
  .type.toBeAssignableFrom({ root: [new URL('file://')] })

expect<FastifyStaticOptions>()
  .type.toBeAssignableFrom({
    serve: true as const,
    root: ''
  })

expect<FastifyStaticOptions>()
  .type.toBeAssignableFrom({
    serve: false as const
  })

appWithImplicitHttp
  .register(fastifyStatic, options)
  .after(() => {
    appWithImplicitHttp.get('/', (_request, reply) => {
      reply.sendFile('some-file-name')
    })
  })

const appWithHttp2 = fastify({ http2: true })

appWithHttp2
  .register(fastifyStatic, options)
  .after(() => {
    appWithHttp2.get('/', (_request, reply) => {
      reply.sendFile('some-file-name')
    })

    appWithHttp2.get('/download', (_request, reply) => {
      reply.download('some-file-name')
    })

    appWithHttp2.get('/download/1', (_request, reply) => {
      reply.download('some-file-name', { maxAge: '2 days' })
    })

    appWithHttp2.get('/download/2', (_request, reply) => {
      reply.download('some-file-name', 'some-filename', { cacheControl: false, acceptRanges: true })
    })

    appWithHttp2.get('/download/3', (_request, reply) => {
      reply.download('some-file-name', 'some-filename', { contentType: false })
    })
  })

const multiRootAppWithImplicitHttp = fastify()
options.root = ['']

multiRootAppWithImplicitHttp
  .register(fastifyStatic, options)
  .after(() => {
    multiRootAppWithImplicitHttp.get('/', (_request, reply) => {
      reply.sendFile('some-file-name')
    })

    multiRootAppWithImplicitHttp.get('/', (_request, reply) => {
      reply.sendFile('some-file-name', { cacheControl: false, acceptRanges: true })
    })

    multiRootAppWithImplicitHttp.get('/', (_request, reply) => {
      reply.sendFile('some-file-name', 'some-root-name', { cacheControl: false, acceptRanges: true })
    })

    multiRootAppWithImplicitHttp.get('/', (_request, reply) => {
      reply.sendFile('some-file-name', 'some-root-name-2', { contentType: false })
    })

    multiRootAppWithImplicitHttp.get('/download', (_request, reply) => {
      reply.download('some-file-name')
    })

    multiRootAppWithImplicitHttp.get('/download/1', (_request, reply) => {
      reply.download('some-file-name', { maxAge: '2 days' })
    })

    multiRootAppWithImplicitHttp.get('/download/2', (_request, reply) => {
      reply.download('some-file-name', 'some-filename', { cacheControl: false, acceptRanges: true })
    })

    multiRootAppWithImplicitHttp.get('/download/3', (_request, reply) => {
      reply.download('some-file-name', 'some-filename', { contentType: false })
    })
  })

const noIndexApp = fastify()
options.root = ''
options.index = false

noIndexApp
  .register(fastifyStatic, options)
  .after(() => {
    noIndexApp.get('/', (_request, reply) => {
      reply.send('<h1>fastify-static</h1>')
    })
  })

options.root = new URL('file://')

const URLRootApp = fastify()
URLRootApp.register(fastifyStatic, options)
  .after(() => {
    URLRootApp.get('/', (_request, reply) => {
      reply.send('<h1>fastify-static</h1>')
    })
  })

const defaultIndexApp = fastify()
options.index = 'index.html' as const

defaultIndexApp
  .register(fastifyStatic, options)
  .after(() => {
    defaultIndexApp.get('/', (_request, reply) => {
      reply.send('<h1>fastify-static</h1>')
    })
  })
