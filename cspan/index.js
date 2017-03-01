/*
* www.openedcaptions.com routes captions from C-Span 1 channel to a socket end point.
* This script serves as an intermediate server to buffer text from socket and expose it as REST API end point.
* * that also support char offset. see README for more info.
*  author: Dan Z @impronunciable
*/
const io = require('socket.io-client')
const fs = require('fs')
const http = require('http')
const URL = require('url')
const s = require('underscore.string')
const parseCsv = require('csv-parse/lib/sync')
const argv = require('minimist')(process.argv.slice(2),
                                 {alias: { h: 'help', t: 'transcript',
                                           p: 'port', s: 'skip', f: 'flags'}});

const help = 'Usage: index.js [options]\n\n' +
  '    A intermediate node web server to cache CSPAN transcript feed\n\n' +
  '    Options:\n' +
  '      -h, --help           output usage information\n' +
  '      -p, --port           server port\n' +
  '      -t, --transcript     relative path to the file to store transcript\n' +
  '      -s, --skip           if present, skips initial load of the transcript file\n' +
  '      -f, --flags          mode to apply to the transcript file; a: append, w: write';

if (argv.help) {
  console.log(help);
  process.exit(0);
}


// Load proper noun dictionary
const words = parseCsv(fs.readFileSync('words.csv'))

// Where we stash our stuff
var cache = []

// Setup a cache buster so our cache doesn't use all the memory
const ttl = 20 * 60 * 1000 // 20 mins -> miliseconds
const cacheCheckInterval = 5 * 60 * 1000 // 5 mins -> miliseconds
setInterval(cleanCache, cacheCheckInterval)

// Setup a transcription file, if desired
var txt = false;
if ( argv.transcript || process.env.TRANSCRIPT_FILE ) {
  const transcriptFile = argv.transcript || process.env.TRANSCRIPT_FILE
  if ( fs.existsSync(transcriptFile) ) {
    if (!argv.skip) {
      cache.push({t: Date.now(), r: fs.readFileSync(transcriptFile)})
    }
  }

  var flags = argv.flags || 'a'
  txt = fs.createWriteStream(transcriptFile, {flags: flags})
}

const socket = io.connect('https://openedcaptions.com:443')
socket.on('content', data => {
  if ( txt ) { txt.write(data.data.body) }
  if ( data.data.body === "\r\n" ) { return }
  const dat = {t: Date.now(), r: data.data.body}
  console.log(dat.t, dat.r)
  cache.push(dat)
})

http.createServer((req, res) => {
  const url = URL.parse(req.url, true)
  if ( url.pathname != '/' ) {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('404 not found')
  } else {
    const now = Date.now()
    const timestamp = parseInt(url.query.since || 0)
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      now: now,
      captions: formatText(getWordsSince(timestamp))
    }))
  }
}).listen(argv.port || process.env.PORT || 5000)

function formatText(str) {
  var ret = str.toLowerCase().replace("\r\n", ' ') // remove random line breaks
  ret = s.clean(ret) // remove redundant spaces

  // now use our words file to do a bunch of stuff
  words.forEach((pair) => {
    ret = ret
      .replace(new RegExp(` ${pair[0].replace('.', '\\.')}( |\\.|,|:|')`, 'gi'), (match, a) => { return ` ${pair[1]}${a}` })
      .replace(new RegExp(`^${pair[0]}( |\\.|,|:|')`, 'i'), (match, a) => { return `${pair[1]}${a}` })
      .replace(new RegExp(` ${pair[0]}$`, 'i'), pair[1])
  })

  ret = ret
    // Music notes
    .replace(/\s+b\x19\*\s+/, '\n\n🎵\n\n')
    // remove blank space before puncuation
    .replace(/\s+(!|\?|;|:|,|\.|')/g, '$1')
    // handle honorifics
    .replace(/ (sen\.?|rep\.?|mr\.?|mrs\.?|ms\.?|dr\.?) (\w)/gi,
             (match, a, b) => { return ` ${s.capitalize(a)} ${b.toUpperCase()}` })
    // Cap first letter of sentences
    .replace(/(!|\?|:|\.|>>)\s+(\w)/g, (match, a, b) => { return `${a} ${b.toUpperCase()}` })
    // >> seems to be used instead of repeating speaker prompts in back and forths
    .replace(/\s*>>\s*/g, "\n\n>> ")
    // Put speaker prompts on new lines
    .replace(/(\.|"|!|\?|—)\s*([a-zA-Z. ]{2,30}:)/g, '$1\n\n$2')

  return ret
}

function getWordsSince(timestamp) {
  var ret = []
  cache.forEach((val, i) => {
    if ( val.t >= parseInt(timestamp) ) {
      ret.push(val.r)
    }
  })
  return ret.join(' ')
}

function cleanCache() {
  const ttl_check = Date.now() - ttl
  cache.forEach((val, i) => {
    if ( val.t < ttl_check ) {
      delete cache[i]
    }
  })
}
