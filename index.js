'use strict'

const fs = require('fs')
const path = require('path')

module.exports = function fileCopyOrMove(arg1) {

  // A. check inputs
  if ('object' !== typeof arg1) {
    throw new TypeError('`options` argument must be an object')
  }

  if ('function' !== typeof arg1.done) {
    throw new TypeError('`done` callback function required')
  }

  if ('string' !== typeof arg1.source) {
    throw new TypeError('`source` string required')
  }

  // B. build options
  const options = Object.assign(
    { // this is both defaults *and* object to hold combined options.
      // NOTE: user specified values, even `null`, will overwrite these.

      source: null, // they must provide a source.
      target: null, // the target defaults to process.cwd()/${basename(source)}

      // by default we *copy* a source *without* overwriting target.
      move: false,
      overwrite: false,

      // allows overriding the IO ops (helps in testing, too).
      mkdir: fs.mkdir,
      rename: fs.rename,
      copyFile: fs.copyFile,
      unlink: fs.unlink,

      // allows overwriting this during testing.
      cwd: process.cwd(),
    },

    arg1, // specified options override defaults.

    { // stuff for our operations. don't allow user to set them.
      op: null, // an op may be recalled after making directories. cache its bound form.
      recalled: false, // remember when recalled to avoid repeats. not necessary, but safe.
    },
  )

  // C. upgrade some options
  options.source = path.resolve(options.cwd, options.source)

  // if they didn't specify a target then we either:
  //  1. target the CWD with the same file basename, or:
  //  2. error out if the source is in the CWD already.
  if (options.target == null) {
    if (path.dirname(options.source) !== options.cwd) {
      options.target = path.join(options.cwd, path.basename(options.source))
    }

    else {
      const message = '`target` required when `source` is in current working directory'
      return process.nextTick(options.done, new Error(message))
    }
  }

  else {
    options.target = path.resolve(options.cwd, options.target)
  }

  // D. choose op based on options.
  if (options.move === true && options.overwrite === true) {
    const callback = mkdirCheck.bind(options)
    options.op = options.rename.bind(this, options.source, options.target, callback)
  }

  else {
    // calculate now to use in the bind() call below.
    const flags = (options.overwrite === true) ? 0 : fs.constants.COPYFILE_EXCL

    options.op = options.copyFile.bind(this, options.source, options.target, flags, (error) => {
      if (error) {
        mkdirCheck.call(options, error)
      }

      // otherwise the copyFile() was successful. if we should delete the source...
      else if (options.move === true) {
        options.unlink(options.source, options.done)
      }

      else {
        options.done()
      }
    })
  }

  // E. call op.
  options.op()
}

function mkdirCheck(error) {
  if (error) {
    // ENOENT means directory didn't exist.
    if (error.code === 'ENOENT' && this.recalled !== true) {
      this.recalled = true // only recall the op once.

      // create the parent directory and then recall op().
      // Node v10.10+ accepts `recursive` so let's use that.
      this.mkdir(path.dirname(this.target), { recursive:true }, (error) => {
        if (error) { // when mkdir() errors we're done.
          this.done(error)
        }

        else { // rerun the op after mkdir() succeeds.
          this.op()
        }
      })
    }

    else { // we're done when other error types occur.
      this.done(error)
    }
  }

  else { // if no error occurred then we're done.
    this.done()
  }
}
