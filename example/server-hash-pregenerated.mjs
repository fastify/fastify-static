import fastify from 'fastify'
import fastifyStatic from '../index.js'

const server = fastify()

await server.register(fastifyStatic, {
  root: new URL('./public', import.meta.url).pathname,
  prefix: '/assets/',
  hash: true,
  hashPath: new URL('hashes.json', import.meta.url).pathname,
  immutable: true,
  maxAge: 31536000 * 1000 // 1 year
})

server.register(import('fastify-html'))

// Define a route for the root URL
server.get('/', async (request, reply) => {
  return reply.html`
  <html>
    <head>
      <link rel="stylesheet" href="${server.getHashedStaticPath('index.css')}">
    </head>
    <body>
      <h1>Hello, world!</h1>
      <img src="${server.getHashedStaticPath('images/sample.jpg')}" alt="An image">
    </body>
  </html>
  `
})

// Start the server
await server.listen({ port: 3000 })
console.log('Server is running on port 3000')
