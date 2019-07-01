# smart-file-copy-or-move
[![Build Status](https://travis-ci.org/elidoran/node-dirator.svg?branch=master)](https://travis-ci.org/elidoran/node-smart-file-copy-or-move)
[![npm version](https://badge.fury.io/js/dirator.svg)](http://badge.fury.io/js/smart-file-copy-or-move)
[![Coverage Status](https://coveralls.io/repos/github/elidoran/node-smart-file-copy-or-move/badge.svg?branch=master)](https://coveralls.io/github/elidoran/node-smart-file-copy-or-move?branch=master)

Asynchronous file rename/move/copy creating needed directories.

Use `fs.rename()` or `fs.copyFile()` with `fs.unlink()` depending on the options provided.

Creates needed directories via `fs.mkdir()` when initial call fails due to 'ENOENT' error (meaning no directory).

Will generate the `target` based on the basename of `source` and `options.cwd`.


## Install

```
npm install smart-file-copy-or-move
```


## Usage

```javascript
const fileop = require('smart-file-copy-or-move')

fileop({
  // `true` means delete the source afterwards.
  // `false`, the default, means it's a copy; don't delete source.
  move: true,

  // `true` means ignore if target already exists.
  // `false`, the default, means only copy to target if it doesn't exist.
  // when `false` and target exists then an 'EEXIST' error occurs.
  overwrite: true,

  // required: string path to the source file.
  source: 'some.file',

  // optional: string path to the target file.
  // it defaults to the same basename as `source` in `options.cwd`.
  target: 'new.file',

  // optional: defaults to `process.cwd()`.
  cwd: 'some/other/dir',

  // optional: these default to those in the fs module.
  // may be overwritten (helpful in testing).
  mkdir: yourMkdir,
  rename: yourRename,
  copyFile: yourCopyFile,
  unlink: yourUnlink,

  // required: callback function accepts error.
  done: error => {
    // ...
  }
})
```


## [MIT License](LICENSE)
