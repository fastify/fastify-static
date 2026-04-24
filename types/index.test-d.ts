import fastify, { FastifyReply, FastifyRequest } from 'fastify'
import { Stats } from 'node:fs'
import { expectAssignable, expectError, expectType } from 'tsd'
import * as fastifyStaticStar from '..'
import fastifyStatic, {
  FastifyStaticPlugin,
  FastifyStaticPluginDecorators,
  FastifyStaticOptions,
  fastifyStatic as fastifyStaticNamed
} from '..'

const fastifyStaticCjsImport = fastifyStaticStar
const fastifyStaticCjs = require('..')

const app = fastify()
app.register(fastifyStatic, { root: '/' })
app.register(fastifyStaticNamed, { root: '/' })
app.register(fastifyStaticCjs, { root: '/' })
app.register(fastifyStaticCjsImport.default, { root: '/' })
app.register(fastifyStaticCjsImport.fastifyStatic, { root: '/' })
app.register(fastifyStaticStar.default, { root: '/' })
app.register(fastifyStaticStar.fastifyStatic, { root: '/' })

expectType<FastifyStaticPlugin>(fastifyStatic)
expectType<FastifyStaticPlugin>(fastifyStaticNamed)
expectType<FastifyStaticPlugin>(fastifyStaticCjsImport.default)
expectType<FastifyStaticPlugin>(fastifyStaticCjsImport.fastifyStatic)
expectType<FastifyStaticPlugin>(fastifyStaticStar.default)
expectType<FastifyStaticPlugin>(fastifyStaticStar.fastifyStatic)
expectType<any>(fastifyStaticCjs)

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
    expectType<string>(res.filename)
    expectType<number>(res.statusCode)
    expectType<ReturnType<FastifyReply['getHeader']>>(res.getHeader('X-Test'))
    res.setHeader('X-Test', 'string')

    expectType<string>(path)
    expectType<Stats>(stat)
  },
  preCompressed: false,
  allowedPath: (_pathName: string, _root: string, _request: FastifyRequest) => true,
  constraints: {
    host: /^.*\.example\.com$/,
    version: '1.0.2'
  },
  logLevel: 'warn'
}

expectError<FastifyStaticOptions>({
  root: '',
  wildcard: '**/**'
})

expectAssignable<FastifyStaticOptions>({
  root: '',
  list: { format: 'json' }
})

expectAssignable<FastifyStaticOptions>({
  root: '',
  list: { format: 'html', render: () => '' }
})

expectError<FastifyStaticOptions>({
  root: '',
  list: { format: 'html' }
})

expectAssignable<FastifyStaticOptions>({ root: [''] })
expectAssignable<FastifyStaticOptions>({ root: new URL('file:///tmp') })
expectAssignable<FastifyStaticOptions>({ root: [new URL('file:///tmp')] })
expectError<FastifyStaticOptions>({ serve: true })
expectAssignable<FastifyStaticOptions>({ serve: true, root: '' })
expectAssignable<FastifyStaticOptions>({ serve: false })

const registered = fastify().register(fastifyStatic, options)
registered.get('/', (_request, reply) => {
  expectType<FastifyStaticPluginDecorators['reply']['sendFile']>(reply.sendFile)
  expectType<FastifyStaticPluginDecorators['reply']['download']>(reply.download)
  reply.sendFile('some-file-name')
  reply.sendFile('some-file-name', { cacheControl: false })
  reply.download('some-file-name')
  reply.download('some-file-name', 'custom-name', { contentType: false })
})

const serverWithHttp2 = fastify({ http2: true }).register(fastifyStatic, { root: '/' })
serverWithHttp2.get('/', (_request, reply) => {
  reply.sendFile('some-file-name')
  reply.download('some-file-name')
})
