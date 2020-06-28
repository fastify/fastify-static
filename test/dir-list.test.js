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

t.test('dir list default options', t => {
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

t.test('dir list, custom options', t => {
  t.plan(2)

  const options = {
    root: path.join(__dirname, '/static'),
    prefix: '/public',
    index: false,
    list: true
  }

  const route = '/public/'
  const content = { dirs: ['deep', 'shallow'], files: ['foo.html', 'foobar.html', 'index.css', 'index.html'] }

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

t.test('dir list html format', t => {
  t.plan(4)

  // render html in 2 ways: one with handlebars and one with template string

  const Handlebars = require('handlebars')
  const source = `
<html><body>
<ul>
{{#dirs}}
  <li><a href="{{href}}">{{name}}</a></li>
{{/dirs}}
</ul>
<ul>
{{#files}}
  <li><a href="{{href}}" target="_blank">{{name}}</a></li>
{{/files}}
</ul>
</body></html>
`
  const handlebarTemplate = Handlebars.compile(source)
  const templates = [
    {
      render: (dirs, files) => {
        return handlebarTemplate({ dirs, files })
      },
      output: `
<html><body>
<ul>
  <li><a href="/deep">deep</a></li>
  <li><a href="/shallow">shallow</a></li>
</ul>
<ul>
  <li><a href="/foo.html" target="_blank">foo.html</a></li>
  <li><a href="/foobar.html" target="_blank">foobar.html</a></li>
  <li><a href="/index.css" target="_blank">index.css</a></li>
  <li><a href="/index.html" target="_blank">index.html</a></li>
</ul>
</body></html>
`
    },

    {
      render: (dirs, files) => {
        return `
<html><body>
<ul>
  ${dirs.map(dir => `<li><a href="${dir.href}">${dir.name}</a></li>`).join('\n  ')}
</ul>
<ul>
  ${files.map(file => `<li><a href="${file.href}" target="_blank">${file.name}</a></li>`).join('\n  ')}
</ul>
</body></html>
`
      },
      output: `
<html><body>
<ul>
  <li><a href="/deep">deep</a></li>
  <li><a href="/shallow">shallow</a></li>
</ul>
<ul>
  <li><a href="/foo.html" target="_blank">foo.html</a></li>
  <li><a href="/foobar.html" target="_blank">foobar.html</a></li>
  <li><a href="/index.css" target="_blank">index.css</a></li>
  <li><a href="/index.html" target="_blank">index.html</a></li>
</ul>
</body></html>
`
    }

  ]

  for (const template of templates) {
    const options = {
      root: path.join(__dirname, '/static'),
      prefix: '/public',
      index: false,
      list: {
        format: 'html',
        names: [''], // @todo ['/index', '/index.html', '/index.htm', '/'],
        render: template.render
      }
    }
    const routes = ['/public/'] // @todo 'public', '/public/index.html', '/public/index.htm', '/public/index'

    // check all routes by names

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

/*
t.test('dir list json format', t => {
  t.plan(2)

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
*/

// @todo serve empty dir
// @todo if index already exists, serve from fs
// @todo settings consistency check
//   - format !json !html
//   - names not an array
//   - html without template
// @todo prefixAvoidTrailingSlash true/false
