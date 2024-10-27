import fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { Stats } from 'fs'
import { expectAssignable, expectError, expectType } from 'tsd'
import * as fastifyStaticStar from '..'
import fastifyStatic, {
  FastifyStaticPlugin,
  FastifyStaticOptions,
  fastifyStatic as fastifyStaticNamed,
  FastifyStaticPluginDecorators
} from '..'
// TODO: remove after we land in fastify-plugin
import { createPlugin } from './createPlugin'

import fastifyStaticCjsImport = require('..')
const fastifyStaticCjs = require('..')

const app: FastifyInstance = fastify()

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
  .after((err, instance) => {
    if (err) {
      // handle error
    }

    instance.get('/', (request, reply) => {
      reply.sendFile('some-file-name')
    })
  })

const appWithHttp2 = fastify({ http2: true })

appWithHttp2
  .register(fastifyStatic, options)
  .after((err, instance) => {
    if (err) {
      // handle error
    }

    instance.get('/', (request, reply) => {
      reply.sendFile('some-file-name')
    })

    instance.get('/download', (request, reply) => {
      reply.download('some-file-name')
    })

    instance.get('/download/1', (request, reply) => {
      reply.download('some-file-name', { maxAge: '2 days' })
    })

    instance.get('/download/2', (request, reply) => {
      reply.download('some-file-name', 'some-filename', { cacheControl: false, acceptRanges: true })
    })
  })

const multiRootAppWithImplicitHttp = fastify()
options.root = ['']

multiRootAppWithImplicitHttp
  .register(fastifyStatic, options)
  .after((err, instance) => {
    if (err) {
      // handle error
    }

    instance.get('/', (request, reply) => {
      reply.sendFile('some-file-name')
    })

    instance.get('/', (request, reply) => {
      reply.sendFile('some-file-name', { cacheControl: false, acceptRanges: true })
    })

    instance.get('/', (request, reply) => {
      reply.sendFile('some-file-name', 'some-root-name', { cacheControl: false, acceptRanges: true })
    })

    instance.get('/download', (request, reply) => {
      reply.download('some-file-name')
    })

    instance.get('/download/1', (request, reply) => {
      reply.download('some-file-name', { maxAge: '2 days' })
    })

    instance.get('/download/2', (request, reply) => {
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

const pluginWithFastifyStaticDependency = createPlugin((instance) =>
  instance.get('/', (req, res) => {
    expectType<FastifyStaticPluginDecorators['reply']['sendFile']>(res.sendFile)
    expectType<FastifyStaticPluginDecorators['reply']['download']>(res.download)
  }), { dependencies: [fastifyStatic] })

expectError(fastify().register(pluginWithFastifyStaticDependency))

fastify().register(fastifyStatic, { root: '' }).register(pluginWithFastifyStaticDependency)
