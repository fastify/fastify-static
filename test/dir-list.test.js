'use strict'

/* eslint node/no-deprecated-api: "off" */

const fs = require('fs')
const path = require('path')
const t = require('tap')
const simple = require('simple-get')
const Fastify = require('fastify')

const fastifyStatic = require('..')

const helper = {
  arrange: function (t, options, f) {
    const fastify = Fastify()
    fastify.register(fastifyStatic, options)
    t.teardown(fastify.close.bind(fastify))
    fastify.listen(0, err => {
      t.error(err)
      fastify.server.unref()
      f('http://localhost:' + fastify.server.address().port)
    })
    return f
  }
}

try {
  fs.mkdirSync(path.join(__dirname, 'static/shallow/empty'))
} catch (error) {}

t.test('dir list wrong options', t => {
  t.plan(3)

  const cases = [
    {
      options: {
        root: path.join(__dirname, '/static'),
        prefix: '/public',
        list: {
          format: 'no-json,no-html'
        }
      },
      error: new TypeError('The `list.format` option must be json or html')
    },
    {
      options: {
        root: path.join(__dirname, '/static'),
        list: {
          format: 'html'
        // no render function
        }
      },
      error: new TypeError('The `list.render` option must be a function and is required with html format')
    },
    {
      options: {
        root: path.join(__dirname, '/static'),
        list: {
          names: 'not-an-array'
        }
      },
      error: new TypeError('The `list.names` option must be an array')
    }
  ]

  for (const case_ of cases) {
    const fastify = Fastify()
    fastify.register(fastifyStatic, case_.options)
    fastify.listen(0, err => {
      t.equal(err.message, case_.error.message)
      fastify.server.unref()
    })
  }
})

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
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), JSON.stringify(content))
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
  const content = { dirs: ['deep', 'shallow'], files: ['.example', 'a .md', 'foo.html', 'foobar.html', 'index.css', 'index.html'] }

  helper.arrange(t, options, (url) => {
    t.test(route, t => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: url + route
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), JSON.stringify(content))
      })
    })
  })
})

t.test('dir list html format', t => {
  t.plan(6)

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
  <li><a href="/.example" target="_blank">.example</a></li>
  <li><a href="/a .md" target="_blank">a .md</a></li>
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
  <li><a href="/.example" target="_blank">.example</a></li>
  <li><a href="/a .md" target="_blank">a .md</a></li>
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
        names: ['index', 'index.htm'],
        render: template.render
      }
    }
    const routes = ['/public/index.htm', '/public/index']

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
            t.equal(response.statusCode, 200)
            t.equal(body.toString(), template.output)
          })
        })
      }
    })
  }
})

t.test('dir list json format', t => {
  t.plan(2)

  const options = {
    root: path.join(__dirname, '/static'),
    prefix: '/public',
    prefixAvoidTrailingSlash: true,
    list: {
      format: 'json',
      names: ['index', 'index.json', '/']
    }
  }
  // const routes = ['/public/shallow', 'public/shallow/', '/public/shallow/index.json', '/public/shallow/index']
  const routes = ['/public/shallow/']
  const content = { dirs: ['empty'], files: ['sample.jpg'] }

  helper.arrange(t, options, (url) => {
    for (const route of routes) {
      t.test(route, t => {
        t.plan(3)
        simple.concat({
          method: 'GET',
          url: url + route
        }, (err, response, body) => {
          t.error(err)
          t.equal(response.statusCode, 200)
          t.equal(body.toString(), JSON.stringify(content))
        })
      })
    }
  })
})

t.test('dir list on empty dir', t => {
  t.plan(2)

  const options = {
    root: path.join(__dirname, '/static'),
    prefix: '/public',
    list: true
  }
  const route = '/public/shallow/empty'
  const content = { dirs: [], files: [] }

  helper.arrange(t, options, (url) => {
    t.test(route, t => {
      t.plan(3)
      simple.concat({
        method: 'GET',
        url: url + route
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), JSON.stringify(content))
      })
    })
  })
})

t.test('dir list serve index.html on index option', t => {
  t.plan(2)

  const options = {
    root: path.join(__dirname, '/static'),
    prefix: '/public',
    index: false,
    list: {
      format: 'html',
      names: ['index', 'index.html'],
      render: () => 'dir list index'
    }
  }

  helper.arrange(t, options, (url) => {
    t.test('serve index.html from fs', t => {
      t.plan(6)

      let route = '/public/index.html'

      simple.concat({
        method: 'GET',
        url: url + route
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), '<html>\n  <body>\n    the body\n  </body>\n</html>\n')
      })

      route = '/public/index'
      simple.concat({
        method: 'GET',
        url: url + route
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(body.toString(), 'dir list index')
      })
    })
  })
})

t.test('serve a non existent dir and get error', t => {
  t.plan(2)

  const options = {
    root: '/none',
    prefix: '/public',
    list: true
  }
  const route = '/public/'

  helper.arrange(t, options, (url) => {
    t.test(route, t => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        url: url + route
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
      })
    })
  })
})

t.test('serve a non existent dir and get error', t => {
  t.plan(2)

  const options = {
    root: path.join(__dirname, '/static'),
    prefix: '/public',
    list: {
      names: ['index']
    }
  }
  const route = '/public/none/index'

  helper.arrange(t, options, (url) => {
    t.test(route, t => {
      t.plan(2)
      simple.concat({
        method: 'GET',
        url: url + route
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
      })
    })
  })
})
