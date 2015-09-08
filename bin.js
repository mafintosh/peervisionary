#!/usr/bin/env node

var fs = require('fs')
var peervision = require('peervision')
var airswarm = require('airswarm')
var signalhub = require('signalhub')
var net = require('net')
var choppa = require('choppa')
var minimist = require('minimist')

var argv = minimist(process.argv)

var id = argv._[2]
var vision = peervision(id ? new Buffer(id, 'hex') : null)

airswarm('pv-' + vision.id.toString('hex'), function (p) {
  console.error('DEBUG: Got new peer!')
  p.pipe(vision.createStream()).pipe(p)
})

vision.on('upload', function (index) {
  console.error('DEBUG: Uploading block #' + index)
})

vision.on('download', function (index) {
  console.error('DEBUG: Downloading block #' + index)
})


var blocks = 0

if (!id) {
  console.error('Stream id is', vision.id.toString('hex'))
  console.error('Enter the files you want to stream:')
  process.stdin.on('data', function (data) {
    fs.createReadStream(data.toString().trim()).pipe(choppa(16 * 1024)).on('data', function (data) {
      blocks++
      vision.append(data)
    }).on('end', function () {
      console.error('DEBUG: Appended', blocks, 'blocks')
    })
  })
} else {
  var offset = Number(argv.offset || 0)
  loop()

  function loop () {
    vision.get(offset, function (err, data) {
      if (err) throw err
      offset++
      process.stdout.write(data, loop)
    })
  }
}
