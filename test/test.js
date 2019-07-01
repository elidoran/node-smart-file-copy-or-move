'use strict'

const assert = require('assert')
const {join} = require('path')
const {mkdir, writeFile, constants} = require('fs')
const {readFileSync, statSync} = require('fs')

const run = require('taskling')
const tree = require('build-file-tree-from-object')

const fn = require('../index.js')

const testDir = __dirname
const testspaceDir = join(testDir, 'space')


describe('test invalid options', () => {

  it('no object argument throws Error', () => {
    assert.throws(fn, { message: '`options` argument must be an object' })
  })

  it('no `done` callback throws Error', () => {
    assert.throws(fn.bind(this, {}), { message: '`done` callback function required' })
  })

  it('no `source` throws Error', () => {
    assert.throws(fn.bind(this, { done: () => {} }),
      { message: '`source` string required' })
  })

  it('no `target` passes Error when source is in current working directory', (done) => {
    fn({
      cwd: testspaceDir,
      source: join(testspaceDir, 'test.js'),
      done: (error) => {
        assert(error, 'should error')
        assert.equal(error && error.message, '`target` required when `source` is in current working directory')
        done()
      }
    })
  })

})

describe('rename', () => {

  it('within directory', (done) => {

    const filename = 'source.file'
    const filename2 = 'target.file'

    const actual = {
      source: null,
      target: null,
    }

    fn({
      cwd: testspaceDir,
      overwrite: true,
      move: true,
      source: filename,
      target: filename2,
      rename: (source, target, callback) => {
        actual.source = source
        actual.target = target
        callback()
      },
      done: error => {
        assert.equal(actual.source, join(testspaceDir, filename))
        assert.equal(actual.target, join(testspaceDir, filename2))
        done()
      },
    })
  })

  it('generate target', (done) => {

    const name = 'some.file'
    const path = join('child', name)

    const actual = {
      source: null,
      target: null,
    }

    fn({
      cwd: testspaceDir,
      overwrite: true,
      move: true,
      source: path,
      rename: (source, target, callback) => {
        actual.source = source
        actual.target = target
        callback()
      },
      done: error => {
        assert.equal(actual.source, join(testspaceDir, path))
        assert.equal(actual.target, join(testspaceDir, name))
        done()
      },
    })
  })

})


describe('copyFile', () => {

  it('no-overwrite', (done) => {

    const filename = 'source.file'
    const filename2 = 'target.file'

    const actual = {
      source: null,
      target: null,
      flags : null,
    }

    fn({
      cwd: testspaceDir,
      overwrite: false,
      move: true,
      source: filename,
      target: filename2,
      copyFile: (source, target, flags, callback) => {
        actual.source = source
        actual.target = target
        actual.flags  = flags
        callback()
      },
      done: error => {
        assert.equal(actual.source, join(testspaceDir, filename))
        assert.equal(actual.target, join(testspaceDir, filename2))
        assert.equal(actual.flags, constants.COPYFILE_EXCL)
        done()
      },
    })
  })

  it('no-move', (done) => {

    const filename = 'source.file'
    const filename2 = 'target.file'

    const actual = {
      source: null,
      target: null,
      flags : null,
    }

    fn({
      cwd: testspaceDir,
      overwrite: true,
      move: false,
      source: filename,
      target: filename2,
      copyFile: (source, target, flags, callback) => {
        actual.source = source
        actual.target = target
        actual.flags  = flags
        callback()
      },
      done: error => {
        assert.equal(actual.source, join(testspaceDir, filename))
        assert.equal(actual.target, join(testspaceDir, filename2))
        assert.equal(actual.flags, 0)
        done()
      },
    })
  })

  it('no-overwrite & no-move', (done) => {

    const filename = 'source.file'
    const filename2 = 'target.file'

    const actual = {
      source: null,
      target: null,
      flags : null,
    }

    fn({
      cwd: testspaceDir,
      overwrite: false,
      move: false,
      source: filename,
      target: filename2,
      copyFile: (source, target, flags, callback) => {
        actual.source = source
        actual.target = target
        actual.flags  = flags
        callback()
      },
      done: error => {
        assert.equal(actual.source, join(testspaceDir, filename))
        assert.equal(actual.target, join(testspaceDir, filename2))
        assert.equal(actual.flags, constants.COPYFILE_EXCL)
        done()
      },
    })
  })

})

describe('io errors', () => {

  it('missing dir', (done) => {

    const file1 = 'source.file'
    const file2 = join('child', 'target.file')
    let count = 0

    const actual1 = {
      source: null,
      target: null,
      flags: null,
    }

    const actual2 = {
      path: null,
      options: null,
    }

    const actual3 = {
      source: null,
      target: null,
      flags: null,
    }

    fn({
      cwd: testspaceDir,
      overwrite: false,
      move: false,
      source: file1,
      target: file2,
      copyFile: (source, target, flags, callback) => {
        if (count === 0) {
          actual1.source = source
          actual1.target = target
          actual1.flags = flags
          const error = new Error('fake copyFile error')
          error.code = 'ENOENT'
          count++
          callback(error)
        }

        else {
          actual3.source = source
          actual3.target = target
          actual3.flags = flags
          callback()
        }
      },
      mkdir: (path, options, callback) => {
        actual2.path = path
        actual2.options = options
        callback()
      },
      done: error => {
        assert.equal(actual1.source, join(testspaceDir, file1))
        assert.equal(actual1.target, join(testspaceDir, file2))
        assert.equal(actual1.flags, constants.COPYFILE_EXCL)

        // assert.equal(error && error.message, 'fake copyFile error')
        // assert.equal(error && error.code, 'ENOENT')

        assert.equal(actual2.path, join(testspaceDir, 'child'))
        assert.deepEqual(actual2.options, { recursive: true })

        assert.equal(actual3.source, join(testspaceDir, file1))
        assert.equal(actual3.target, join(testspaceDir, file2))
        assert.equal(actual3.flags, constants.COPYFILE_EXCL)
        done()
      },
    })
  })

  it('fail to create missing dir', (done) => {

    const file1 = 'source.file'
    const file2 = join('child', 'target.file')
    let count = 0

    const actual1 = {
      source: null,
      target: null,
      flags: null,
    }

    const actual2 = {
      path: null,
      options: null,
    }

    fn({
      cwd: testspaceDir,
      overwrite: false,
      move: false,
      source: file1,
      target: file2,
      copyFile: (source, target, flags, callback) => {
        actual1.source = source
        actual1.target = target
        actual1.flags = flags
        const error = new Error('fake copyFile error')
        error.code = 'ENOENT'
        count++
        callback(error)
      },
      mkdir: (path, options, callback) => {
        actual2.path = path
        actual2.options = options
        const error = new Error('fake mkdir error')
        error.code = 'EACCES'
        callback(error)
      },
      done: error => {
        assert.equal(actual1.source, join(testspaceDir, file1))
        assert.equal(actual1.target, join(testspaceDir, file2))
        assert.equal(actual1.flags, constants.COPYFILE_EXCL)

        assert.equal(actual2.path, join(testspaceDir, 'child'))
        assert.deepEqual(actual2.options, { recursive: true })


        assert.equal(error && error.message, 'fake mkdir error')
        assert.equal(error && error.code, 'EACCES')

        done()
      },
    })
  })

  it('fail to copyFile', (done) => {

    const file1 = 'source.file'
    const file2 = join('child', 'target.file')
    let count = 0

    const actual1 = {
      source: null,
      target: null,
      flags: null,
    }

    fn({
      cwd: testspaceDir,
      overwrite: false,
      move: false,
      source: file1,
      target: file2,
      copyFile: (source, target, flags, callback) => {
        actual1.source = source
        actual1.target = target
        actual1.flags = flags
        const error = new Error('fake copyFile error')
        error.code = 'EACCES'
        count++
        callback(error)
      },
      done: error => {
        assert.equal(actual1.source, join(testspaceDir, file1))
        assert.equal(actual1.target, join(testspaceDir, file2))
        assert.equal(actual1.flags, constants.COPYFILE_EXCL)

        assert.equal(error && error.message, 'fake copyFile error')
        assert.equal(error && error.code, 'EACCES')

        done()
      },
    })
  })

})

describe('real io', () => {

  it('missing dirs', (done) => {

    const string = 'testing\n123\n'

    const file1 = 'source.file'
    const file2 = join('first', 'second', 'target.file')

    const sourcePath = join(testspaceDir, file1)

    const boundFn = fn.bind(this, {
      cwd: testspaceDir,
      overwrite: false,
      move: false,
      source: file1,
      target: file2,
      done: error => {

        // ensure our source file is still there. // TODO: avoid sync version.
        assert.equal(readFileSync(sourcePath, 'utf8'), string)

        // ensure our target file, and its parent directories, were created.

        assert(statSync(join(testspaceDir, 'first')).isDirectory(), 'should have first directory')
        assert(statSync(join(testspaceDir, 'first', 'second')).isDirectory(), 'should have second directory')
        assert(statSync(join(testspaceDir, file2)).isFile(), 'should be a file')

        done()
      },
    })

    // create our source file.
    writeFile(sourcePath, string, error => {
      if (error) {
        done(error)
      }

      else {
        boundFn()
      }
    })
  })

})
