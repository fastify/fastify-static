import fastify from 'fastify'
import fastifyStatic from '../index.js'

const server = fastify()

await server.register(fastifyStatic, {
  root: new URL('./public', import.meta.url).pathname,
  prefix: '/assets/',
  wildcard: false,
  hash: true,
  immutable: true,
  maxAge: 31536000 * 1000 // 1 year
})

server.register(import('fastify-html'))

// Define a route for the root URL
server.get('/', async (request, reply) => {
  return reply.html`
  <html>
    <head>
      <link rel="stylesheet" href="${server.getHashedAsset('index.css')}">
    </head>
    <body>
      <h1>Hello, world!</h1>
      <img src="${server.getHashedAsset('images/sample.jpg')}" alt="An image">
    </body>
  </html>
  `
})

// Start the server
server.listen({ port: 3000 }, (err) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log('Server is running on port 3000')
})
