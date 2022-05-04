import fastify from 'fastify'
import { expectError } from 'tsd'
import fastifyStatic, { FastifyStaticOptions } from '../..'

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
  setHeaders: (res: any, pathName: any) => {
    res.setHeader('test', pathName)
  },
  preCompressed: false
}

expectError<FastifyStaticOptions>({
  root: '',
  wildcard: '**/**'
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
      reply.download('some-file-name', 'some-filename' ,{ cacheControl: false, acceptRanges: true })
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

const defaultIndexApp = fastify()
options.index = 'index.html'

defaultIndexApp
  .register(fastifyStatic, options)
  .after(() => {
    defaultIndexApp.get('/', (request, reply) => {
      reply.send('<h1>fastify-static</h1>')
    })
  })
