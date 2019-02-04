import * as Fastify from 'fastify'
import * as fastifyStatic from '../..'

const options: fastifyStatic.FastifyStaticOptions = {
  acceptRanges: true,
  'cacheControl': true,
  'decorateReply': true,
  'dotfiles': true,
  'etag': true,
  'extensions': ['.js'],
  'immutable': true,
  'index': ['1'],
  'lastModified': true,
  'maxAge': '',
  'prefix': '',
  'root': '',
  'schemaHide': true,
  'serve': true,
  'setHeaders': (res, pathName) => {
    res.setHeader('test', pathName)
  }
}

const app = Fastify()

app.register<fastifyStatic.FastifyStaticOptions>(fastifyStatic, options)
