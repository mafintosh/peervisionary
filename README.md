# peervisionary

Command line tool that combines [airswarm](https://github.com/mafintosh/airswarm) and [peervision](https://github.com/mafintosh/peervision)
to stream p2p content over your local network

```
npm install -g peervisionary
```

## Usage

On one machine

```
> peervisionary # starts a new swarm
Stream id is 88d11ce232b51f3a3390851fe7627b149960f2ef52ab246568bc3e2355f3d548
Enter the files you want to stream:
> /path/to/a/music/file.mp3
```

On another one (on the same network)

```
peervisionary 88d11ce232b51f3a3390851fe7627b149960f2ef52ab246568bc3e2355f3d548 | mplayer -
```

Running the above should play your song using mplayer. When the song finishes
you can just add a new file to the stream and it will be added to the stream

## License

MIT
