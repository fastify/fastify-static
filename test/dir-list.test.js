'use strict'

/* eslint n/no-deprecated-api: "off" */

const fs = require('node:fs')
const path = require('node:path')
const t = require('tap')
const simple = require('simple-get')
const Fastify = require('fastify')

const fastifyStatic = require('..')
const dirList = require('../lib/dirList')

const helper = {
  arrange: function (t, options, f) {
    return helper.arrangeModule(t, options, fastifyStatic, f)
  },
  arrangeModule: function (t, options, mock, f) {
    const fastify = Fastify()
    fastify.register(mock, options)
    t.teardown(fastify.close.bind(fastify))
    fastify.listen({ port: 0 }, err => {
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

t.test('throws when `root` is an array', t => {
  t.plan(2)

  const err = dirList.validateOptions({ root: ['hello', 'world'], list: true })
  t.type(err, TypeError)
  t.equal(err.message, 'multi-root with list option is not supported')
})

t.test('throws when `list.format` option is invalid', t => {
  t.plan(2)

  const err = dirList.validateOptions({ list: { format: 'hello' } })
  t.type(err, TypeError)
  t.equal(err.message, 'The `list.format` option must be json or html')
})

t.test('throws when `list.names option` is not an array', t => {
  t.plan(2)

  const err = dirList.validateOptions({ list: { names: 'hello' } })
  t.type(err, TypeError)
  t.equal(err.message, 'The `list.names` option must be an array')
})

t.test('throws when `list.jsonFormat` option is invalid', t => {
  t.plan(2)

  const err = dirList.validateOptions({ list: { jsonFormat: 'hello' } })
  t.type(err, TypeError)
  t.equal(err.message, 'The `list.jsonFormat` option must be name or extended')
})

t.test('throws when `list.format` is html and `list render` is not a function', t => {
  t.plan(2)

  const err = dirList.validateOptions({ list: { format: 'html', render: 'hello' } })
  t.type(err, TypeError)
  t.equal(err.message, 'The `list.render` option must be a function and is required with html format')
})

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
    fastify.listen({ port: 0 }, err => {
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
  const content = { dirs: ['deep', 'shallow'], files: ['.example', '100%.txt', 'a .md', 'foo.html', 'foobar.html', 'index.css', 'index.html'] }

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

t.test('dir list, custom options with empty array index', t => {
  t.plan(2)

  const options = {
    root: path.join(__dirname, '/static'),
    prefix: '/public',
    index: [],
    list: true
  }

  const route = '/public/'
  const content = { dirs: ['deep', 'shallow'], files: ['.example', '100%.txt', 'a .md', 'foo.html', 'foobar.html', 'index.css', 'index.html'] }

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
  t.plan(3)

  const options = {
    root: path.join(__dirname, '/static'),
    prefix: '/public',
    index: false,
    list: {
      format: 'html',
      names: ['index', 'index.htm'],
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
      }
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
          t.equal(body.toString(), `
<html><body>
<ul>
  <li><a href="/public/deep">deep</a></li>
  <li><a href="/public/shallow">shallow</a></li>
</ul>
<ul>
  <li><a href="/public/.example" target="_blank">.example</a></li>
  <li><a href="/public/100%25.txt" target="_blank">100%.txt</a></li>
  <li><a href="/public/a%20.md" target="_blank">a .md</a></li>
  <li><a href="/public/foo.html" target="_blank">foo.html</a></li>
  <li><a href="/public/foobar.html" target="_blank">foobar.html</a></li>
  <li><a href="/public/index.css" target="_blank">index.css</a></li>
  <li><a href="/public/index.html" target="_blank">index.html</a></li>
</ul>
</body></html>
`)
        })
      })
    }
  })
})

t.test('dir list href nested structure', t => {
  t.plan(6)

  const options = {
    root: path.join(__dirname, '/static'),
    prefix: '/public',
    index: false,
    list: {
      format: 'html',
      names: ['index', 'index.htm'],
      render (dirs, files) {
        return dirs[0].href
      }
    }
  }

  const routes = [
    { path: '/public/', response: '/public/deep' },
    { path: '/public/index', response: '/public/deep' },
    { path: '/public/deep/', response: '/public/deep/path' },
    { path: '/public/deep/index.htm', response: '/public/deep/path' },
    { path: '/public/deep/path/', response: '/public/deep/path/for' }
  ]
  helper.arrange(t, options, (url) => {
    for (const route of routes) {
      t.test(route.path, t => {
        t.plan(5)
        simple.concat({
          method: 'GET',
          url: url + route.path
        }, (err, response, body) => {
          t.error(err)
          t.equal(response.statusCode, 200)
          t.equal(body.toString(), route.response)
          simple.concat({
            method: 'GET',
            url: url + body.toString()
          }, (err, response, body) => {
            t.error(err)
            t.equal(response.statusCode, 200)
          })
        })
      })
    }
  })
})

t.test('dir list html format - stats', t => {
  t.plan(7)

  const options1 = {
    root: path.join(__dirname, '/static'),
    prefix: '/public',
    index: false,
    list: {
      format: 'html',
      render (dirs, files) {
        t.ok(dirs.length > 0)
        t.ok(files.length > 0)

        t.ok(dirs.every(every))
        t.ok(files.every(every))

        function every (value) {
          return value.stats &&
            value.stats.atime &&
            !value.extendedInfo
        }
      }
    }
  }

  const route = '/public/'

  helper.arrange(t, options1, (url) => {
    simple.concat({
      method: 'GET',
      url: url + route
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
    })
  })
})

t.test('dir list html format - extended info', t => {
  t.plan(4)

  const route = '/public/'

  const options = {
    root: path.join(__dirname, '/static'),
    prefix: '/public',
    index: false,
    list: {
      format: 'html',
      extendedFolderInfo: true,
      render (dirs, files) {
        t.test('dirs', t => {
          t.plan(dirs.length * 7)

          for (const value of dirs) {
            t.ok(value.extendedInfo)

            t.equal(typeof value.extendedInfo.fileCount, 'number')
            t.equal(typeof value.extendedInfo.totalFileCount, 'number')
            t.equal(typeof value.extendedInfo.folderCount, 'number')
            t.equal(typeof value.extendedInfo.totalFolderCount, 'number')
            t.equal(typeof value.extendedInfo.totalSize, 'number')
            t.equal(typeof value.extendedInfo.lastModified, 'number')
          }
        })
      }
    }
  }

  helper.arrange(t, options, (url) => {
    simple.concat({
      method: 'GET',
      url: url + route
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
    })
  })
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

t.test('dir list json format - extended info', t => {
  t.plan(2)

  const options = {
    root: path.join(__dirname, '/static'),
    prefix: '/public',
    prefixAvoidTrailingSlash: true,
    list: {
      format: 'json',
      names: ['index', 'index.json', '/'],
      extendedFolderInfo: true,
      jsonFormat: 'extended'

    }
  }
  const routes = ['/public/shallow/']

  helper.arrange(t, options, (url) => {
    for (const route of routes) {
      t.test(route, t => {
        t.plan(5)
        simple.concat({
          method: 'GET',
          url: url + route
        }, (err, response, body) => {
          t.error(err)
          t.equal(response.statusCode, 200)
          const bodyObject = JSON.parse(body.toString())
          t.equal(bodyObject.dirs[0].name, 'empty')
          t.equal(typeof bodyObject.dirs[0].stats.atimeMs, 'number')
          t.equal(typeof bodyObject.dirs[0].extendedInfo.totalSize, 'number')
        })
      })
    }
  })
})

t.test('json format with url parameter format', t => {
  t.plan(13)

  const options = {
    root: path.join(__dirname, '/static'),
    prefix: '/public',
    index: false,
    list: {
      format: 'json',
      render (dirs, files) {
        return 'html'
      }
    }
  }
  const route = '/public/'
  const jsonContent = { dirs: ['deep', 'shallow'], files: ['.example', '100%.txt', 'a .md', 'foo.html', 'foobar.html', 'index.css', 'index.html'] }

  helper.arrange(t, options, (url) => {
    simple.concat({
      method: 'GET',
      url: url + route
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(body.toString(), JSON.stringify(jsonContent))
      t.ok(response.headers['content-type'].includes('application/json'))
    })

    simple.concat({
      method: 'GET',
      url: url + route + '?format=html'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(body.toString(), 'html')
      t.ok(response.headers['content-type'].includes('text/html'))
    })

    simple.concat({
      method: 'GET',
      url: url + route + '?format=json'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(body.toString(), JSON.stringify(jsonContent))
      t.ok(response.headers['content-type'].includes('application/json'))
    })
  })
})

t.test('json format with url parameter format and without render option', t => {
  t.plan(12)

  const options = {
    root: path.join(__dirname, '/static'),
    prefix: '/public',
    index: false,
    list: {
      format: 'json'
    }
  }
  const route = '/public/'
  const jsonContent = { dirs: ['deep', 'shallow'], files: ['.example', '100%.txt', 'a .md', 'foo.html', 'foobar.html', 'index.css', 'index.html'] }

  helper.arrange(t, options, (url) => {
    simple.concat({
      method: 'GET',
      url: url + route
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(body.toString(), JSON.stringify(jsonContent))
      t.ok(response.headers['content-type'].includes('application/json'))
    })

    simple.concat({
      method: 'GET',
      url: url + route + '?format=html'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 500)
      t.equal(JSON.parse(body.toString()).message, 'The `list.render` option must be a function and is required with the URL parameter `format=html`')
    })

    simple.concat({
      method: 'GET',
      url: url + route + '?format=json'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(body.toString(), JSON.stringify(jsonContent))
      t.ok(response.headers['content-type'].includes('application/json'))
    })
  })
})

t.test('html format with url parameter format', t => {
  t.plan(13)

  const options = {
    root: path.join(__dirname, '/static'),
    prefix: '/public',
    index: false,
    list: {
      format: 'html',
      render (dirs, files) {
        return 'html'
      }
    }
  }
  const route = '/public/'
  const jsonContent = { dirs: ['deep', 'shallow'], files: ['.example', '100%.txt', 'a .md', 'foo.html', 'foobar.html', 'index.css', 'index.html'] }

  helper.arrange(t, options, (url) => {
    simple.concat({
      method: 'GET',
      url: url + route
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(body.toString(), 'html')
      t.ok(response.headers['content-type'].includes('text/html'))
    })

    simple.concat({
      method: 'GET',
      url: url + route + '?format=html'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(body.toString(), 'html')
      t.ok(response.headers['content-type'].includes('text/html'))
    })

    simple.concat({
      method: 'GET',
      url: url + route + '?format=json'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(body.toString(), JSON.stringify(jsonContent))
      t.ok(response.headers['content-type'].includes('application/json'))
    })
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

t.test('dir list with dotfiles allow option', t => {
  t.plan(2)

  const options = {
    root: path.join(__dirname, '/static-dotfiles'),
    prefix: '/public',
    dotfiles: 'allow',
    index: false,
    list: true
  }
  const route = '/public/'
  const content = { dirs: ['dir'], files: ['.aaa', 'test.txt'] }

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

t.test('dir list with dotfiles deny option', t => {
  t.plan(2)

  const options = {
    root: path.join(__dirname, '/static-dotfiles'),
    prefix: '/public',
    dotfiles: 'deny',
    index: false,
    list: true
  }
  const route = '/public/'
  const content = { dirs: ['dir'], files: ['test.txt'] }

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

t.test('dir list with dotfiles ignore option', t => {
  t.plan(2)

  const options = {
    root: path.join(__dirname, '/static-dotfiles'),
    prefix: '/public',
    dotfiles: 'ignore',
    index: false,
    list: true
  }
  const route = '/public/'
  const content = { dirs: ['dir'], files: ['test.txt'] }

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

t.test('dir list error', t => {
  t.plan(7)

  const options = {
    root: path.join(__dirname, '/static'),
    prefix: '/public',
    prefixAvoidTrailingSlash: true,
    index: false,
    list: {
      format: 'html',
      names: ['index', 'index.htm'],
      render: () => ''
    }
  }

  const errorMessage = 'mocking send'
  dirList.send = async () => { throw new Error(errorMessage) }

  const mock = t.mockRequire('..', {
    '../lib/dirList.js': dirList
  })

  const routes = ['/public/', '/public/index.htm']

  helper.arrangeModule(t, options, mock, (url) => {
    for (const route of routes) {
      simple.concat({
        method: 'GET',
        url: url + route
      }, (err, response, body) => {
        t.error(err)
        t.equal(JSON.parse(body.toString()).message, errorMessage)
        t.equal(response.statusCode, 500)
      })
    }
  })
})
