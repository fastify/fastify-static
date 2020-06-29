'use strict'

const path = require('path')
const Handlebars = require('handlebars')

const fastify = require('fastify')({ logger: { level: 'trace' } })

const template = `
<html><body>

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
</body></html>
`
const handlebarTemplate = Handlebars.compile(template)

fastify
  .register(require('..'), {
    root: path.join(__dirname, '/public'),
    prefixAvoidTrailingSlash: true,
    list: {
      format: 'html',
      names: ['index', 'index.html', 'index.htm', '/'],
      render: (dirs, files) => handlebarTemplate({ dirs, files })
    }
  })
  .listen(3000, err => {
    if (err) throw err
  })
