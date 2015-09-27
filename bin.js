#!/usr/bin/env node

var fs = require('fs')
var peervision = require('peervision')
var airswarm = require('airswarm')
var signalhub = require('signalhub')
var net = require('net')
var thunky = require('thunky')
var choppa = require('choppa')
var minimist = require('minimist')
var pump = require('pump')
var DHT = require('bittorrent-dht')

var dht = new DHT()
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

var server = airswarm('pv-' + vision.id.toString('hex'), function (p) {
  debug('Airswarm peer')
  pump(p, vision.createStream(), p)
})

dht.on('ready', function () {
  debug('DHT ready')

  lookup()
  announce()

  setInterval(lookup, 10000)
  setInterval(announce, 20000)

  function lookup () {
    dht.lookup(vision.id.slice(0, 20))
  }

  function announce () {
    dht.announce(vision.id.slice(0, 20), server.address().port)
  }
})

var peers = {}

dht.on('peer', function (peer) {
  if (peers[peer]) return
  peers[peer] = true
  var socket = net.connect(Number(peer.split(':')[1]), peer.split(':')[0])
  pump(socket, vision.createStream(), socket)
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
    if (argv.chunks) {
      process.stdin.pipe(choppa(Number(argv.chunks))).on('data', function (data) {
        vision.append(data)
      })
    } else {
      process.stdin.on('data', function (data) {
        vision.append(data)
      })
    }
    return
  }

  console.error('Enter the files you want to stream:')
  process.stdin.on('data', function (data) {
    fs.createReadStream(data.toString().trim()).pipe(choppa(Number(argv.chunks || 16 * 1024))).on('data', function (data) {
      blocks++
      vision.append(data)
    }).on('end', function () {
      debug('Appended', blocks, 'blocks')
    })
  })
} else {
  var offset = Number(argv.offset || 0)
  var buffer = 5
  var fetching = {}

  loop()

  function noop () {}

  function add (i) {
    var fetch = thunky(function (cb) {
      vision.get(i, cb)
    })
    fetch()
    fetching[i] = fetch
  }

  function fetch (i, cb) {
    if (fetching[i]) {
      var get = fetching[i]
      delete fetching[i]
      get(cb)
    } else {
      vision.get(i, cb)
    }
  }

  function loop () {
    for (var i = 0; i < buffer; i++) add(offset + i + 1)
    fetch(offset, function (err, data) {
      if (err) throw err
      offset++
      process.stdout.write(data, loop)
    })
  }
}
