'use strict'
const Bluebird = require('bluebird')
const Readable = require('readable-stream').Readable

class FicStream extends Readable {
  constructor (fic, options) {
    if (!options) options = {}
    options.objectMode = true
    if (!options.highWaterMark) options.highWaterMark = 4
    super(options)
    this.FicStream = {
      reading: false,
      chapterBuffer: [],
      readyP: null,
      readyR: null
    }
    // ficstreams are also fics
    for (let pp in fic) {
      if (this[pp] != null) continue
      if (typeof fic[pp] === 'function') {
        const method = fic[pp]
        this[pp] = function () { return method.apply(fic, arguments) }
      } else {
        Object.defineProperty(this, pp, {
          get: () => fic[pp]
        })
      }
    }
  }
  queueChapter (chapter) {
    const state = this.FicStream
    if (state.reading) {
      state.reading = this.push(chapter)
      if (chapter == null) return Bluebird.resolve()
    } else {
      state.chapterBuffer.push(chapter)
    }
    if (state.reading) {
      return null
    } else {
      if (state.readyP) return state.readyP
      state.readyP = new Bluebird(resolve => {
        state.readyR = resolve
      })
      return state.readyP
    }
  }
  _read (size) {
    const state = this.FicStream
    state.reading = true
    while (state.reading && state.chapterBuffer.length) {
      const chapter = state.chapterBuffer.shift()
      state.reading = this.push(chapter)
    }
    if (state.reading && state.readyP) {
      state.readyR()
      state.readyR = state.readyP = null
    }
  }
}

module.exports = FicStream
