'use strict'

const path = require('path')
const Handlebars = require('handlebars')

const fastify = require('fastify')({ logger: { level: 'trace' } })

// Handlebar template for listing files and directories.
const template = `
<html>
  <body>
    dirs
  <ul>
    {{#dirs}}
      <li><a href="{{href}}">{{name}}</a></li>
    {{/dirs}}
  </ul>

  list

  <ul>
    {{#files}}
      <li><a href="{{href}}" target="_blank">{{name}}</a></li>
    {{/files}}
  </ul>
  </body>
</html>
`
const handlebarTemplate = Handlebars.compile(template)

fastify
  .register(require('..'), {
    // An absolute path containing static files to serve.
    root: path.join(__dirname, '/public'),
    // Do not append a trailing slash to prefixes.
    prefixAvoidTrailingSlash: true,
    // Return a directory listing with a handlebar template.
    list: {
      // html or json response? html requires a render method.
      format: 'html',
      // A list of filenames that trigger a directory list response.
      names: ['index', 'index.html', 'index.htm', '/'],
      // You can provide your own render method as needed.
      render: (dirs, files) => handlebarTemplate({ dirs, files })
    }
  })
  .listen(3000, err => {
    if (err) throw err
  })
