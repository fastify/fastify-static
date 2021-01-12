import fastify from 'fastify'
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
}

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
  })

const multiRootAppWithImplicitHttp = fastify()
options.root = ['']

multiRootAppWithImplicitHttp
  .register(fastifyStatic, options)
  .after(() => {
    multiRootAppWithImplicitHttp.get('/', (request, reply) => {
      reply.sendFile('some-file-name')
    })
  })
  