#!/usr/bin/env node

var fs = require('fs')
var peervision = require('peervision')
var airswarm = require('airswarm')
var signalhub = require('signalhub')
var net = require('net')
var choppa = require('choppa')
var minimist = require('minimist')
var pump = require('pump')

var argv = minimist(process.argv)

var id = argv._[2]
var vision = peervision(id ? new Buffer(id, 'hex') : null)
var debug = argv.debug ? console.error.bind(console, 'DEBUG:') : function () {}

if (argv.webrtc) {
  var wrtc = require('wrtc')
  var swarm = require('webrtc-swarm')
  var sw = swarm(signalhub('pv-' + vision.id.toString('hex'), ['https://signalhub.mafintosh.com']), {wrtc: wrtc})
  sw.on('peer', function (p) {
    debug('WebRTC peer')
    pump(p, vision.createStream(), p)
  })
}

airswarm('pv-' + vision.id.toString('hex'), function (p) {
  debug('Airswarm peer')
  pump(p, vision.createStream(), p)
})

vision.on('upload', function (index) {
  debug('Uploading block #' + index)
})

vision.on('download', function (index) {
  debug('Downloading block #' + index)
})


var blocks = 0

if (!id) {
  console.error('Stream id is', vision.id.toString('hex'))

  if (argv.stdin) {
    process.stdin.on('data', function (data) {
      vision.append(data)
    })
    return
  }

  console.error('Enter the files you want to stream:')
  process.stdin.on('data', function (data) {
    fs.createReadStream(data.toString().trim()).pipe(choppa(16 * 1024)).on('data', function (data) {
      blocks++
      vision.append(data)
    }).on('end', function () {
      debug('Appended', blocks, 'blocks')
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
