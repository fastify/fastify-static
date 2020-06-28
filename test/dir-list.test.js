'use strict'

/* eslint node/no-deprecated-api: "off" */

const path = require('path')
const t = require('tap')
const simple = require('simple-get')
const Fastify = require('fastify')

const fastifyStatic = require('..')

const helper = {
  arrange: function (t, options, f) {
    const fastify = Fastify()
    fastify.register(fastifyStatic, options)
    t.tearDown(fastify.close.bind(fastify))
    fastify.listen(0, err => {
      t.error(err)
      fastify.server.unref()
      f('http://localhost:' + fastify.server.address().port)
    })
    return f
  }
}

t.test('dir index default options', t => {
  t.plan(2)

  const options = {
    root: path.join(__dirname, '/static'),
    prefix: '/public',
    list: true
  }
  const route = '/public/shallow'
  const content = { dirs: ['empty'], files: ['sample.jpg'] }

  helper.arrange(t, options, (url) => {
    t.test(route, t => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: url + route
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(body.toString(), JSON.stringify(content))
      })
    })
  })
})

/*
t.test('dir index, custom options', t => {
  t.plan(11)

  const options = {
    root: path.join(__dirname, '/static'),
    prefix: '/public',
    index: false,
    ignoreTrailingSlash: true,
    list: true
  }
  const routes = ['/public', '/public/']
  const content = { dirs: ['deep', 'shallow'], files: ['foobar.html', 'foo.html', 'index.css', 'index.html'] }

  helper.arrange(t, options, (url) => {
    for (const route of routes) {
      t.test(route, t => {
        t.plan(3)
        simple.concat({
          method: 'GET',
          url: url + route
        }, (err, response, body) => {
          t.error(err)
          t.strictEqual(response.statusCode, 200)
          t.strictEqual(body.toString(), content)
        })
      })
    }
  })
})

t.test('dir index json format', t => {
  t.plan(11)

  const options = {
    root: path.join(__dirname, '/static'),
    prefix: '/public',
    list: {
      format: 'json',
      names: ['/index', '/index.json', '/']
    }
  }
  const routes = ['/public', 'public/', '/public/index.json', '/public/index']
  const content = { dirs: ['deep', 'shallow'], files: ['foobar.html', 'foo.html', 'index.css', 'index.html'] }

  helper.arrange(t, options, (url) => {
    for (const route of routes) {
      t.test(route, t => {
        t.plan(3)
        simple.concat({
          method: 'GET',
          url: url + route
        }, (err, response, body) => {
          t.error(err)
          t.strictEqual(response.statusCode, 200)
          t.strictEqual(body.toString(), content)
        })
      })
    }
  })
})

t.test('dir index html format', t => {
  t.plan(11)

  const Handlebars = require('handlebars')

  const templates = [
    {
      render: (dirs, files) => {
        const source = `
<html><body>

<ul>
{{#dirs}}
<li><a href="{{path}}">{{name}}</a></li>
{{/dirs}}
</ul>

<ul>
{{#files}}
<li><a href="{{path}}" target="_blank">{{name}}</a></li>
{{/files}}
</ul>

</body></html>
`
        return Handlebars.compile(source)(dirs, files)
      },
      output: '<html>...'
    },

    {
      render: (dirs, files) => {
        return `
<html><body>

<ul>
${dirs.map(dir => `<li><a href="${dir.path}">${dir.name}</a></li>`)}
</ul>

<ul>
${files.map(file => `<li><a href="${file.path}" target="_blank">${file.name}</a></li>`)}
</ul>

</body></html>
`
      },
      output: '<html>...'
    }

  ]

  for (const template of templates) {
    const options = {
      root: path.join(__dirname, '/static'),
      prefix: '/public',
      list: {
        format: 'html',
        names: ['/index', '/index.html', '/index.htm', '/'],
        render: template.render
      }
    }
    const routes = ['/public', 'public/', '/public/index.html', '/public/index.htm', '/public/index']

    helper.arrange(t, options, (url) => {
      for (const route of routes) {
        t.test(route, t => {
          t.plan(3)
          simple.concat({
            method: 'GET',
            url: url + route
          }, (err, response, body) => {
            t.error(err)
            t.strictEqual(response.statusCode, 200)
            t.strictEqual(body.toString(), template.output)
          })
        })
      }
    })
  }
})
*/

// @todo serve empty dir
// @todo if index already exists, serve from fs
// @todo settings consistency check
//   - format !json !html
//   - names not an array
//   - html without template
// @todo prefixAvoidTrailingSlash true/false
