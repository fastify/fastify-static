import * as Fastify from 'fastify'
import * as fastifyStatic from '../..'

const app = Fastify()

app.register(fastifyStatic, {
  acceptRanges: true,
  cacheControl: true,
  decorateReply: true,
  dotfiles: true,
  etag: true,
  extensions: ['.js'],
  immutable: true,
  index: ['1'],
  lastModified: true,
  maxAge: '',
  prefix: '',
  root: '',
  schemaHide: true,
  serve: true,
  wildcard: true,
  setHeaders: (res: any, pathName: any) => {
    res.setHeader('test', pathName)
  }
})

app.get('/file', (request, reply) => {
  reply.sendFile('some-file-name')
})
