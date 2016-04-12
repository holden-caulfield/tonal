(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* global AudioContext Vex tonal */

var score = require('scorejs')
var player = require('scorejs/ext/scheduler')
var snabbdom = require('snabbdom')
var patch = snabbdom.init([ // Init patch function with choosen modules
  require('snabbdom/modules/class'), // makes it easy to toggle classes
  require('snabbdom/modules/props'), // for setting properties on DOM elements
  require('snabbdom/modules/style'), // handles styling on elements with support for animations
  require('snabbdom/modules/eventlisteners') // attaches event listeners
])
var h = require('snabbdom/h')
var sf = require('soundfont-player')

function pc (n) { return n.slice(0, -1) }
var assign = Object.assign

var ac = new AudioContext()
var piano = sf(ac).instrument('acoustic_grand_piano')

function Chords (state) {
  return h('div#chords-app', {}, []
    .concat(ChordStave({}, state))
    .concat(Tonics({
      onClick: function (t) { ChordsApp(assign(state, { tonic: t })) }
    }, state))
    .concat(Selector({
      names: tonal.chord.names,
      onClick: function (name) { ChordsApp(assign(state, { name: name })) }
    }, state))
  )
}

function Scales (state) {
  return h('div#scales-app', {}, []
    .concat(ScaleStave(null, state))
    .concat(Tonics({
      onClick: function (t) { ScalesApp(assign(state, { tonic: t })) }
    }, state))
    .concat(Selector({
      names: tonal.scale.names,
      onClick: function (name) { ScalesApp(assign(state, { name: name })) }
    }, state))
  )
}

var tonics = 'C Db D Eb E F F# G Ab A Bb B'.split(' ')
function Tonics (props, state) {
  var current = state.tonic
  return h('div.tonics', {}, tonics.map(function (t) {
    return h('a', {
      class: { active: t === current },
      props: { href: 'javascript:false' },
      on: { click: [props.onClick, t] }
    }, t)
  }))
}

function toId (name) { return name.replace(' ', '-').toLowerCase() }
function octFor (note) { return note[0] === 'A' || note[0] === 'B' ? 3 : 4 }
function ChordStave (props, state) {
  var id = toId(state.name)
  var notes = tonal.chord(state.name, state.tonic + octFor(state.tonic))
  var vox = (node) => voxChord(notes, node.elm)

  return [
    h('h3', state.tonic + state.name),
    h('figure', []
      .concat(MarginNote(null, { notes: notes, id: id,
        intervals: tonal.chord(state.name, false),
        score: score.chord(notes) }))
      .concat(h('canvas#' + id, { props: { width: 510, height: 120 },
          hook: { insert: vox, update: (_, node) => vox(node) } })))
  ]
}

function Selector (props, state) {
  var current = state.name
  return h('section.name-list', props.names().sort().map(function (name) {
    return h('a.name', {
      class: { active: name === current },
      state: { href: 'javascript:false' },
      on: { click: [props.onClick, name] }
    }, name)
  }))
}

function ScaleStave (props, state) {
  var id = toId(state.name)
  var notes = tonal.scale(state.name, state.tonic + '4')
  var vex = (node) => renderCanvas(notes, node.elm)

  return h('section', [
    h('h3', state.tonic + ' ' + state.name),
    h('figure', []
      .concat(MarginNote(null, { notes: notes, id: id,
        intervals: tonal.scale(state.name, false),
        score: score.phrase(notes) }))
      .concat(h('canvas#scale' + id,
        { props: { width: 510, height: 120 },
          hook: { insert: vex, update: (_, node) => vex(node) } }))
    )
  ])
}

function MarginNote (_, state) {
  return [
    h('label.margin-toggle', { props: { for: 'scale-' + state.id } }),
    h('input.margin-toggle', { props: { id: 'scale-' + state.id } }),
    h('span.marginnote', [
      h('span.code', state.intervals.join(' ')), h('br'),
      h('span.code', state.notes.map(pc).join(' ')), h('br'),
      h('a', { props: { href: 'javascript:false' },
        on: { click: [ play, state.score ] } },
        [ h('i.fa.fa-play', ' '), ' Play' ])
    ])
  ]
}

function play (s) {
  var e = score.events(score.tempo(120, s))
  player.schedule(ac, 0, e, function (time, note) {
    console.log('play', time, note)
    piano.play(note.pitch, time)
  })
}

function renderCanvas (notes, canvas) {
  var renderer = new Vex.Flow.Renderer(canvas,
    Vex.Flow.Renderer.Backends.CANVAS)

  var ctx = renderer.getContext()
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  var stave = new Vex.Flow.Stave(0, 0, 500)
  stave.addClef('treble').setContext(ctx).draw()

  Vex.Flow.Formatter.FormatAndDraw(ctx, stave, notes.map(function (n) {
    var pc = n.charAt(0)
    var alt = n.slice(1, -1)
    var oct = n.slice(-1)
    var note = new Vex.Flow.StaveNote({ keys: [pc + '/' + oct], duration: 'q' })
    if (alt) note.addAccidental(0, new Vex.Flow.Accidental(alt))
    return note
  }))
}

var render = (app) => (state) => {
  console.log('render', state)
  var node = app(state)
  patch(state.node ? state.node : state.el, node)
  state.node = node
}

var ChordsApp = render(Chords)
var ScalesApp = render(Scales)
var scalesEl = document.getElementById('scales-app')
var chordsEl = document.getElementById('chords-app')
ScalesApp({ tonic: 'C', name: 'major', node: null, el: scalesEl })
ChordsApp({ tonic: 'C', name: 'Maj7', node: null, el: chordsEl })

function voxChord (notes, canvas) {
  var renderer = new Vex.Flow.Renderer(canvas,
    Vex.Flow.Renderer.Backends.CANVAS)

  var ctx = renderer.getContext()
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  var stave = new Vex.Flow.Stave(0, 0, 500)
  stave.addClef('treble').setContext(ctx).draw()

  var keys = notes.map(function (n) {
    return n.charAt(0, -1) + '/' + n.slice(-1)
  })
  var note = new Vex.Flow.StaveNote({ keys: keys, duration: '2' })
  var render = [ note ]
  notes.forEach(function (n, i) {
    var pc = n.charAt(0)
    var alt = n.slice(1, -1)
    var oct = n.slice(-1)
    var nt = new Vex.Flow.StaveNote({ keys: [pc + alt + '/' + oct], duration: 'q' })
    if (alt) {
      nt.addAccidental(0, new Vex.Flow.Accidental(alt))
      note.addAccidental(i, new Vex.Flow.Accidental(alt))
    }
    render.push(nt)
  })
  Vex.Flow.Formatter.FormatAndDraw(ctx, stave, render)
}

},{"scorejs":22,"scorejs/ext/scheduler":21,"snabbdom":39,"snabbdom/h":32,"snabbdom/modules/class":35,"snabbdom/modules/eventlisteners":36,"snabbdom/modules/props":37,"snabbdom/modules/style":38,"soundfont-player":44}],2:[function(require,module,exports){
module.exports={
  "4": [ "1 4 7b 10m", [ "quartal" ] ],
  "5": [ "1 5" ],

  "M": [ "1 3 5", [ "Major", "" ] ],
  "M#5": [ "1 3 5A", [ "augmented", "maj#5", "Maj#5", "+", "aug" ] ],
  "M#5add9": [ "1 3 5A 9", [ "+add9" ] ],
  "M13": [ "1 3 5 7 9 13", [ "maj13", "Maj13" ] ],
  "M13#11": [ "1 3 5 7 9 11# 13", [ "maj13#11", "Maj13#11", "M13+4", "M13#4" ] ],
  "M6": [ "1 3 5 13", [ "6" ] ],
  "M6#11": [ "1 3 5 6 11#", [ "M6b5", "6#11", "6b5" ] ],
  "M69": [ "1 3 5 6 9", [ "69" ] ],
  "M69#11": [ "1 3 5 6 9 11#" ],
  "M7#11": [ "1 3 5 7 11#", [ "maj7#11", "Maj7#11", "M7+4", "M7#4" ] ],
  "M7#5": [ "1 3 5A 7", [ "maj7#5", "Maj7#5", "maj9#5", "M7+" ] ],
  "M7#5sus4": [ "1 4 5A 7" ],
  "M7#9#11": [ "1 3 5 7 9# 11#" ],
  "M7add13": [ "1 3 5 6 7 9" ],
  "M7b5": [ "1 3 5d 7" ],
  "M7b6": [ "1 3 6b 7" ],
  "M7b9": [ "1 3 5 7 9b" ],
  "M7sus4": [ "1 4 5 7" ],
  "M9": [ "1 3 5 7 9", [ "maj9", "Maj9" ] ],
  "M9#11": [ "1 3 5 7 9 11#", [ "maj9#11", "Maj9#11", "M9+4", "M9#4" ] ],
  "M9#5": [ "1 3 5A 7 9", [ "Maj9#5" ] ],
  "M9#5sus4": [ "1 4 5A 7 9" ],
  "M9b5": [ "1 3 5d 7 9" ],
  "M9sus4": [ "1 4 5 7 9" ],
  "Madd9": [ "1 3 5 9", [ "2", "add9", "add2" ] ],
  "Maj7": [ "1 3 5 7", [ "maj7", "M7" ] ],
  "Mb5": [ "1 3 5d" ],
  "Mb6": [ "1 3 13b" ],
  "Msus2": [ "1 2M 5", [ "add9no3", "sus2" ] ],
  "Msus4": [ "1 4 5", [ "sus", "sus4" ] ],
  "addb9": [ "1 3 5 9b" ],
  "7": [ "1 3 5 7b", [ "Dominant", "Dom" ] ],
  "9": [ "1 3 5 7b 9", [ "79" ] ],
  "11": [ "1 5 7b 9 11" ],
  "13": [ "1 3 5 7b 9 13", [ "13_" ] ],
  "11b9": [ "1 5 7b 9b 11" ],
  "13#11": [ "1 3 5 7b 9 11# 13", [ "13+4", "13#4" ] ],
  "13#9": [ "1 3 5 7b 9# 13", [ "13#9_" ] ],
  "13#9#11": [ "1 3 5 7b 9# 11# 13" ],
  "13b5": [ "1 3 5d 6 7b 9" ],
  "13b9": [ "1 3 5 7b 9b 13" ],
  "13b9#11": [ "1 3 5 7b 9b 11# 13" ],
  "13no5": [ "1 3 7b 9 13" ],
  "13sus4": [ "1 4 5 7b 9 13", [ "13sus" ] ],
  "69#11": [ "1 3 5 6 9 11#" ],
  "7#11": [ "1 3 5 7b 11#", [ "7+4", "7#4", "7#11_", "7#4_" ] ],
  "7#11b13": [ "1 3 5 7b 11# 13b", [ "7b5b13" ] ],
  "7#5": [ "1 3 5A 7b", [ "+7", "7aug", "aug7" ] ],
  "7#5#9": [ "1 3 5A 7b 9#", [ "7alt", "7#5#9_", "7#9b13_" ] ],
  "7#5b9": [ "1 3 5A 7b 9b" ],
  "7#5b9#11": [ "1 3 5A 7b 9b 11#" ],
  "7#5sus4": [ "1 4 5A 7b" ],
  "7#9": [ "1 3 5 7b 9#", [ "7#9_" ] ],
  "7#9#11": [ "1 3 5 7b 9# 11#", [ "7b5#9" ] ],
  "7#9#11b13": [ "1 3 5 7b 9# 11# 13b" ],
  "7#9b13": [ "1 3 5 7b 9# 13b" ],
  "7add6": [ "1 3 5 7b 13", [ "67", "7add13" ] ],
  "7b13": [ "1 3 7b 13b" ],
  "7b5": [ "1 3 5d 7b" ],
  "7b6": [ "1 3 5 6b 7b" ],
  "7b9": [ "1 3 5 7b 9b" ],
  "7b9#11": [ "1 3 5 7b 9b 11#", [ "7b5b9" ] ],
  "7b9#9": [ "1 3 5 7b 9b 9#" ],
  "7b9b13": [ "1 3 5 7b 9b 13b" ],
  "7b9b13#11": [ "1 3 5 7b 9b 11# 13b", [ "7b9#11b13", "7b5b9b13" ] ],
  "7no5": [ "1 3 7b" ],
  "7sus4": [ "1 4 5 7b", [ "7sus" ] ],
  "7sus4b9": [ "1 4 5 7b 9b", [ "susb9", "7susb9", "7b9sus", "7b9sus4", "phryg" ] ],
  "7sus4b9b13": [ "1 4 5 7b 9b 13b", [ "7b9b13sus4" ] ],
  "9#11": [ "1 3 5 7b 9 11#", [ "9+4", "9#4", "9#11_", "9#4_" ] ],
  "9#11b13": [ "1 3 5 7b 9 11# 13b", [ "9b5b13" ] ],
  "9#5": [ "1 3 5A 7b 9", [ "9+" ] ],
  "9#5#11": [ "1 3 5A 7b 9 11#" ],
  "9b13": [ "1 3 7b 9 13b" ],
  "9b5": [ "1 3 5d 7b 9" ],
  "9no5": [ "1 3 7b 9" ],
  "9sus4": [ "1 4 5 7b 9", [ "9sus" ] ],
  "m": [ "1 3b 5", [ "minor" ] ],
  "m#5": [ "1 3b 5A", [ "m+", "mb6" ] ],
  "m11": [ "1 3b 5 7b 9 11", [ "_11" ] ],
  "m11#5": [ "1 3b 6b 7b 9 11" ],
  "m11b5": [ "1 3b 7b 12d 2M 4", [ "h11", "_11b5" ] ],
  "m13": [ "1 3b 5 7b 9 11 13", [ "_13" ] ],
  "m6": [ "1 3b 4 5 13", [ "_6" ] ],
  "m69": [ "1 3b 5 6 9", [ "_69" ] ],
  "m7": [ "1 3b 5 7b", [ "minor7", "_", "_7" ] ],
  "m7#5": [ "1 3b 6b 7b" ],
  "m7add11": [ "1 3b 5 7b 11", [ "m7add4" ] ],
  "m7b5": [ "1 3b 5d 7b", [ "half-diminished", "h7", "_7b5" ] ],
  "m9": [ "1 3b 5 7b 9", [ "_9" ] ],
  "m9#5": [ "1 3b 6b 7b 9" ],
  "m9b5": [ "1 3b 7b 12d 2M", [ "h9", "-9b5" ] ],
  "mMaj7": [ "1 3b 5 7", [ "mM7", "_M7" ] ],
  "mMaj7b6": [ "1 3b 5 6b 7", [ "mM7b6" ] ],
  "mM9": [ "1 3b 5 7 9", [ "mMaj9", "-M9" ] ],
  "mM9b6": [ "1 3b 5 6b 7 9", [ "mMaj9b6" ] ],
  "mb6M7": [ "1 3b 6b 7" ],
  "mb6b9": [ "1 3b 6b 9b" ],
  "o": [ "1 3b 5d", [ "mb5", "dim" ] ],
  "o7": [ "1 3b 5d 13", [ "diminished", "m6b5", "dim7" ] ],
  "o7M7": [ "1 3b 5d 6 7" ],
  "oM7": [ "1 3b 5d 7" ],
  "sus24": [ "1 2M 4 5", [ "sus4add9" ] ],
  "+add#9": [ "1 3 5A 9#" ],
  "madd4": [ "1 3b 4 5" ],
  "madd9": [ "1 3b 5 9" ]
}

},{}],3:[function(require,module,exports){
'use strict'

var chords = require('./chords.json')
var dictionary = require('music-dictionary')

/**
 * A chord dictionary. Get chord data from a chord name.
 *
 * @name chord
 * @function
 * @param {String} name - the chord name
 * @see music-dictionary
 *
 * @example
 * // get chord data
 * var chord = require('chord-dictionary')
 * chord('Maj7') // => { name: 'Maj7', aliases: ['M7', 'maj7']
 *                //      intervals:  [ ...],
 *                //      binary: '100010010001', decimal: 2193 }
 *
 * @example
 * // get it from aliases, binary or decimal numbers
 * chord('Maj7') === chord('M7') === chord('100010010001') === chord(2913)
 *
 * @example
 * // get chord names
 * chord.names // => ['Maj7', 'm7', ...]
 */
module.exports = dictionary(chords)

},{"./chords.json":2,"music-dictionary":5}],4:[function(require,module,exports){
/**
 * Get the pitch frequency in herzs (with custom concert tuning) from a midi number
 *
 * This function is currified so it can be partially applied (see examples)
 *
 * @name midi.freq
 * @function
 * @param {Float} tuning - the frequency of A4 (null means 440)
 * @param {Integer} midi - the midi number
 * @return {Float} the frequency of the note
 *
 * @example
 * var freq = require('midi-freq')
 * // 69 midi is A4
 * freq(null, 69) // => 440
 * freq(444, 69) // => 444
 *
 * @example
 * // partially applied
 * var freq = require('midi-freq')(440)
 * freq(69) // => 440
 */
module.exports = function freq (tuning, midi) {
  tuning = tuning || 440
  if (arguments.length > 1) return freq(tuning)(midi)

  return function (m) {
    return m > 0 && m < 128 ? Math.pow(2, (m - 69) / 12) * tuning : null
  }
}

},{}],5:[function(require,module,exports){
'use strict'

var parse = require('music-notation/interval/parse')
var R = require('music-notation/note/regex')
var transpose = require('note-transposer')

/**
 * Create a musical dictionary. A musical dictionary is a function that given
 * a name (and optionally a tonic) returns an array of notes.
 *
 * A dictionary is created from a HashMap. It maps a name to a string with
 * an interval list and, optionally, an alternative name list (see example)
 *
 * Additionally, the dictionary has properties (see examples):
 *
 * - data: a hash with the dictionary data
 * - names: an array with all the names
 * - aliases: an array with all the names including aliases
 * - source: the source of the dictionary
 *
 * Each value of the data hash have the following properties:
 *
 * - name: the name
 * - aliases: an array with the alternative names
 * - intervals: an array with the intervals
 * - steps: an array with the intervals in __array notation__
 * - binary: a binary representation of the set
 * - decimal: the decimal representation of the set
 *
 * @name dictionary
 * @function
 * @param {Hash} source - the dictionary source
 * @return {Function} the dictionary
 *
 * @example
 * var dictionary = require('music-dictionary')
 * var chords = dictionary({'Maj7': ['1 3 5 7', ['M7']], 'm7': ['1 3b 5 7b'] })
 * chords('CMaj7') // => ['C', 'E', 'G', 'B']
 * chords('DM7') // => ['D', 'F#', 'A', 'C#']
 * chords('Bm7') // => ['B', 'D', 'F#', 'A']
 *
 * @example
 * // dictionary data
 * chords.data['M7'] // => { name: 'Maj7', aliases: ['M7'],
 *                   //      intervals: ['1', '3', '5', '7'], steps: [ ...],
 *                   //      binary: '10010010001', decimal: 2193 }
 *
 * // get chord by binary numbers
 * chords.data['100010010001'] === chords.data['Maj7']
 * chords.data[2193] === chords.data['Maj7']
 *
 * @example
 * // available names
 * chords.names // => ['Maj7', 'm7']
 * chords.aliases // => ['Maj7', 'm7', 'M7']
 */
module.exports = function (src) {
  function dict (name, tonic) {
    var v = dict.props(name)
    if (!v) {
      var n = R.exec(name)
      v = n ? dict.props(n[5]) : null
      if (!v) return []
      tonic = tonic === false ? tonic : tonic || n[1] + n[2] + n[3]
    }
    if (tonic !== false && !tonic) return function (t) { return dict(name, t) }
    return v.intervals.map(transpose(tonic))
  }
  return build(src, dict)
}

function build (src, dict) {
  var data = {}
  var names = Object.keys(src)
  var aliases = names.slice()

  dict.props = function (name) { return data[name] }
  dict.names = function (a) { return (a ? aliases : names).slice() }

  names.forEach(function (k) {
    var d = src[k]
    var c = { name: k, aliases: d[1] || [] }
    c.intervals = d[0].split(' ')
    c.steps = c.intervals.map(parse)
    c.binary = binary([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], c.steps)
    c.decimal = parseInt(c.binary, 2)
    data[k] = data[c.binary] = data[c.decimal] = c
    c.aliases.forEach(function (a) { data[a] = c })
    if (c.aliases.length > 0) aliases = aliases.concat(c.aliases)
  })
  return dict
}

function binary (num, intervals) {
  intervals.forEach(function (i) { num[(i[0] * 7 + i[1] * 12) % 12] = '1' })
  return num.join('')
}

},{"music-notation/interval/parse":9,"music-notation/note/regex":14,"note-transposer":20}],6:[function(require,module,exports){
'use strict'

/**
 * Build an accidentals string from alteration number
 *
 * @name accidentals.str
 * @param {Integer} alteration - the alteration number
 * @return {String} the accidentals string
 *
 * @example
 * var accidentals = require('music-notation/accidentals/str')
 * accidentals(0) // => ''
 * accidentals(1) // => '#'
 * accidentals(2) // => '##'
 * accidentals(-1) // => 'b'
 * accidentals(-2) // => 'bb'
 */
module.exports = function (num) {
  if (num < 0) return Array(-num + 1).join('b')
  else if (num > 0) return Array(num + 1).join('#')
  else return ''
}

},{}],7:[function(require,module,exports){
'use strict'

// map from pitch number to number of fifths and octaves
var BASES = [ [0, 0], [2, -1], [4, -2], [-1, 1], [1, 0], [3, -1], [5, -2] ]

/**
 * Get a pitch in [array notation]() from pitch properties
 *
 * @name array.fromProps
 * @function
 * @param {Integer} step - the step index
 * @param {Integer} alterations - (Optional) the alterations number
 * @param {Integer} octave - (Optional) the octave
 * @param {Integer} duration - (Optional) duration
 * @return {Array} the pitch in array format
 *
 * @example
 * var fromProps = require('music-notation/array/from-props')
 * fromProps([0, 1, 4, 0])
 */
module.exports = function (step, alt, oct, dur) {
  var base = BASES[step]
  alt = alt || 0
  var f = base[0] + 7 * alt
  if (typeof oct === 'undefined') return [f]
  var o = oct + base[1] - 4 * alt
  if (typeof dur === 'undefined') return [f, o]
  else return [f, o, dur]
}

},{}],8:[function(require,module,exports){
'use strict'

// Map from number of fifths to interval number (0-index) and octave
// -1 = fourth, 0 = unison, 1 = fifth, 2 = second, 3 = sixth...
var BASES = [[3, 1], [0, 0], [4, 0], [1, -1], [5, -1], [2, -2], [6, -2], [3, -3]]

/**
 * Get properties from a pitch in array format
 *
 * The properties is an array with the form [number, alteration, octave, duration]
 *
 * @name array.toProps
 * @function
 * @param {Array} array - the pitch in coord format
 * @return {Array} the pitch in property format
 *
 * @example
 * var toProps = require('music-notation/array/to-props')
 * toProps([2, 1, 4]) // => [1, 2, 4]
 */
module.exports = function (arr) {
  if (!Array.isArray(arr)) return null
  var index = (arr[0] + 1) % 7
  if (index < 0) index = 7 + index
  var base = BASES[index]
  var alter = Math.floor((arr[0] + 1) / 7)
  var oct = arr.length === 1 ? null : arr[1] - base[1] + alter * 4
  var dur = arr[2] || null
  return [base[0], alter, oct, dur]
}

},{}],9:[function(require,module,exports){
'use strict'

var memoize = require('../memoize')
var fromProps = require('../array/from-props')
var INTERVAL = require('./regex')
var TYPES = 'PMMPPMM'
var QALT = {
  P: { dddd: -4, ddd: -3, dd: -2, d: -1, P: 0, A: 1, AA: 2, AAA: 3, AAAA: 4 },
  M: { ddd: -4, dd: -3, d: -2, m: -1, M: 0, A: 1, AA: 2, AAA: 3, AAAA: 4 }
}

/**
 * Parse a [interval shorthand notation](https://en.wikipedia.org/wiki/Interval_(music)#Shorthand_notation)
 * to [interval coord notation](https://github.com/danigb/music.array.notation)
 *
 * This function is cached for better performance.
 *
 * @name interval.parse
 * @function
 * @param {String} interval - the interval string
 * @return {Array} the interval in array notation or null if not a valid interval
 *
 * @example
 * var parse = require('music-notation/interval/parse')
 * parse('3m') // => [2, -1, 0]
 * parse('9b') // => [1, -1, 1]
 * parse('-2M') // => [6, -1, -1]
 */
module.exports = memoize(function (str) {
  var m = INTERVAL.exec(str)
  if (!m) return null
  var dir = (m[2] || m[7]) === '-' ? -1 : 1
  var num = +(m[3] || m[8]) - 1
  var q = m[4] || m[6] || ''

  var simple = num % 7

  var alt
  if (q === '') alt = 0
  else if (q[0] === '#') alt = q.length
  else if (q[0] === 'b') alt = -q.length
  else {
    alt = QALT[TYPES[simple]][q]
    if (typeof alt === 'undefined') return null
  }
  var oct = Math.floor(num / 7)
  var arr = fromProps(simple, alt, oct)
  return dir === 1 ? arr : [-arr[0], -arr[1]]
})

},{"../array/from-props":7,"../memoize":12,"./regex":10}],10:[function(require,module,exports){

// shorthand tonal notation (with quality after number)
var TONAL = '([-+]?)(\\d+)(d{1,4}|m|M|P|A{1,4}|b{1,4}|#{1,4}|)'
// strict shorthand notation (with quality before number)
var STRICT = '(AA|A|P|M|m|d|dd)([-+]?)(\\d+)'
var COMPOSE = '(?:(' + TONAL + ')|(' + STRICT + '))'

/**
 * A regex for parse intervals in shorthand notation
 *
 * Three different shorthand notations are supported:
 *
 * - default [direction][number][quality]: the preferred style `3M`, `-5A`
 * - strict: [quality][direction][number], for example: `M3`, `A-5`
 * - altered: [direction][number][alterations]: `3`, `-5#`
 *
 * @name interval.regex
 */
module.exports = new RegExp('^' + COMPOSE + '$')

},{}],11:[function(require,module,exports){
'use strict'

var props = require('../array/to-props')
var cache = {}

/**
 * Get a string with a [shorthand interval notation](https://en.wikipedia.org/wiki/Interval_(music)#Shorthand_notation)
 * from interval in [array notation](https://github.com/danigb/music.array.notation)
 *
 * The returned string has the form: `number + quality` where number is the interval number
 * (positive integer for ascending intervals, negative integer for descending intervals, never 0)
 * and the quality is one of: 'M', 'm', 'P', 'd', 'A' (major, minor, perfect, dimished, augmented)
 *
 * @name interval.str
 * @function
 * @param {Array} interval - the interval in array notation
 * @return {String} the interval string in shorthand notation or null if not valid interval
 *
 * @example
 * var str = require('music-notation/interval/str')
 * str([1, 0, 0]) // => '2M'
 * str([1, 0, 1]) // => '9M'
 */
module.exports = function (arr) {
  if (!Array.isArray(arr) || arr.length !== 2) return null
  var str = '|' + arr[0] + '|' + arr[1]
  return str in cache ? cache[str] : cache[str] = build(arr)
}

var ALTER = {
  P: ['dddd', 'ddd', 'dd', 'd', 'P', 'A', 'AA', 'AAA', 'AAAA'],
  M: ['ddd', 'dd', 'd', 'm', 'M', 'A', 'AA', 'AAA', 'AAAA']
}
var TYPES = 'PMMPPMM'

function build (coord) {
  var p = props(coord)
  var t = TYPES[p[0]]

  var dir, num, alt
  // if its descening, invert number
  if (p[2] < 0) {
    dir = -1
    num = (8 - p[0]) - 7 * (p[2] + 1)
    alt = t === 'P' ? -p[1] : -(p[1] + 1)
  } else {
    dir = 1
    num = p[0] + 1 + 7 * p[2]
    alt = p[1]
  }
  var q = ALTER[t][4 + alt]
  return dir * num + q
}

},{"../array/to-props":8}],12:[function(require,module,exports){
'use strict'

/**
 * A simple and fast memoization function
 *
 * It helps creating functions that convert from string to pitch in array format.
 * Basically it does two things:
 * - ensure the function only receives strings
 * - memoize the result
 *
 * @name memoize
 * @function
 * @private
 */
module.exports = function (fn) {
  var cache = {}
  return function (str) {
    if (typeof str !== 'string') return null
    return (str in cache) ? cache[str] : cache[str] = fn(str)
  }
}

},{}],13:[function(require,module,exports){
'use strict'

var memoize = require('../memoize')
var R = require('./regex')
var BASES = { C: [0, 0], D: [2, -1], E: [4, -2], F: [-1, 1], G: [1, 0], A: [3, -1], B: [5, -2] }

/**
 * Get a pitch in [array notation]()
 * from a string in [scientific pitch notation](https://en.wikipedia.org/wiki/Scientific_pitch_notation)
 *
 * The string to parse must be in the form of: `letter[accidentals][octave]`
 * The accidentals can be up to four # (sharp) or b (flat) or two x (double sharps)
 *
 * This function is cached for better performance.
 *
 * @name note.parse
 * @function
 * @param {String} str - the string to parse
 * @return {Array} the note in array notation or null if not valid note
 *
 * @example
 * var parse = require('music-notation/note/parse')
 * parse('C') // => [ 0 ]
 * parse('c#') // => [ 8 ]
 * parse('c##') // => [ 16 ]
 * parse('Cx') // => [ 16 ] (double sharp)
 * parse('Cb') // => [ -6 ]
 * parse('db') // => [ -4 ]
 * parse('G4') // => [ 2, 3, null ]
 * parse('c#3') // => [ 8, -1, null ]
 */
module.exports = memoize(function (str) {
  var m = R.exec(str)
  if (!m || m[5]) return null

  var base = BASES[m[1].toUpperCase()]
  var alt = m[2].replace(/x/g, '##').length
  if (m[2][0] === 'b') alt *= -1
  var fifths = base[0] + 7 * alt
  if (!m[3]) return [fifths]
  var oct = +m[3] + base[1] - 4 * alt
  var dur = m[4] ? +(m[4].substring(1)) : null
  return [fifths, oct, dur]
})

},{"../memoize":12,"./regex":14}],14:[function(require,module,exports){
'use strict'

/**
 * A regex for matching note strings in scientific notation.
 *
 * The note string should have the form `letter[accidentals][octave][/duration]`
 * where:
 *
 * - letter: (Required) is a letter from A to G either upper or lower case
 * - accidentals: (Optional) can be one or more `b` (flats), `#` (sharps) or `x` (double sharps).
 * They can NOT be mixed.
 * - octave: (Optional) a positive or negative integer
 * - duration: (Optional) anything follows a slash `/` is considered to be the duration
 * - element: (Optional) additionally anything after the duration is considered to
 * be the element name (for example: 'C2 dorian')
 *
 * @name note.regex
 * @example
 * var R = require('music-notation/note/regex')
 * R.exec('c#4') // => ['c#4', 'c', '#', '4', '', '']
 */
module.exports = /^([a-gA-G])(#{1,}|b{1,}|x{1,}|)(-?\d*)(\/\d+|)\s*(.*)\s*$/

},{}],15:[function(require,module,exports){
'use strict'

var props = require('../array/to-props')
var acc = require('../accidentals/str')
var cache = {}

/**
 * Get [scientific pitch notation](https://en.wikipedia.org/wiki/Scientific_pitch_notation) string
 * from pitch in [array notation]()
 *
 * Array length must be 1 or 3 (see array notation documentation)
 *
 * The returned string format is `letter[+ accidentals][+ octave][/duration]` where the letter
 * is always uppercase, and the accidentals, octave and duration are optional.
 *
 * This function is memoized for better perfomance.
 *
 * @name note.str
 * @function
 * @param {Array} arr - the note in array notation
 * @return {String} the note in scientific notation or null if not valid note array
 *
 * @example
 * var str = require('music-notation/note/str')
 * str([0]) // => 'F'
 * str([0, 4]) // => null (its an interval)
 * str([0, 4, null]) // => 'F4'
 * str([0, 4, 2]) // => 'F4/2'
 */
module.exports = function (arr) {
  if (!Array.isArray(arr) || arr.length < 1 || arr.length === 2) return null
  var str = '|' + arr[0] + '|' + arr[1] + '|' + arr[2]
  return str in cache ? cache[str] : cache[str] = build(arr)
}

var LETTER = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
function build (coord) {
  var p = props(coord)
  return LETTER[p[0]] + acc(p[1]) + (p[2] !== null ? p[2] : '') + (p[3] !== null ? '/' + p[3] : '')
}

},{"../accidentals/str":6,"../array/to-props":8}],16:[function(require,module,exports){
'use strict'

function curry (fn, arity) {
  if (arity === 1) return fn
  return function (a, b) {
    if (arguments.length === 1) return function (c) { return fn(a, c) }
    return fn(a, b)
  }
}

/**
 * Decorate a function to work with intervals, notes or pitches in
 * [array notation](https://github.com/danigb/tonal/tree/next/packages/music-notation)
 * with independence of string representations.
 *
 * This is the base of the pluggable notation system of
 * [tonal](https://github.com/danigb/tonal)
 *
 * @name operation
 * @function
 * @param {Function} parse - the parser
 * @param {Function} str - the string builder
 * @param {Function} fn - the operation to decorate
 *
 * @example
 * var parse = require('music-notation/interval/parse')
 * var str = require('music-notation/interval/str')
 * var operation = require('music-notation/operation')(parse, str)
 * var add = operation(function(a, b) { return [a[0] + b[0], a[1] + b[1]] })
 * add('3m', '3M') // => '5P'
 */
module.exports = function op (parse, str, fn) {
  if (arguments.length === 2) return function (f) { return op(parse, str, f) }
  return curry(function (a, b) {
    var ac = parse(a)
    var bc = parse(b)
    if (!ac && !bc) return fn(a, b)
    var v = fn(ac || a, bc || b)
    return str(v) || v
  }, fn.length)
}

},{}],17:[function(require,module,exports){
var note = require('../note/parse')
var interval = require('../interval/parse')

/**
 * Convert a note or interval string to a [pitch in coord notation]()
 *
 * @name pitch.parse
 * @function
 * @param {String} pitch - the note or interval to parse
 * @return {Array} the pitch in array notation
 *
 * @example
 * var parse = require('music-notation/pitch/parse')
 * parse('C2') // => [0, 2, null]
 * parse('5P') // => [1, 0]
 */
module.exports = function (n) { return note(n) || interval(n) }

},{"../interval/parse":9,"../note/parse":13}],18:[function(require,module,exports){
var note = require('../note/str')
var interval = require('../interval/str')

/**
 * Convert a pitch in coordinate notation to string. It deals with notes, pitch
 * classes and intervals.
 *
 * @name pitch.str
 * @funistron
 * @param {Array} pitch - the pitch in array notation
 * @return {String} the pitch string
 *
 * @example
 * var str = require('music-notation/pitch.str')
 * // pitch class
 * str([0]) // => 'C'
 * // interval
 * str([0, 0]) // => '1P'
 * // note
 * str([0, 2, 4]) // => 'C2/4'
 */
module.exports = function (n) { return note(n) || interval(n) }

},{"../interval/str":11,"../note/str":15}],19:[function(require,module,exports){
'use strict'

var parse = require('music-notation/note/parse')

/**
 * Get the midi number of a note
 *
 * If the argument passed to this function is a valid midi number, it returns it
 *
 * The note can be an string in scientific notation or
 * [array pitch notation](https://github.com/danigb/music.array.notation)
 *
 * @name midi
 * @function
 * @param {String|Array|Integer} note - the note in string or array notation.
 * If the parameter is a valid midi number it return it as it.
 * @return {Integer} the midi number
 *
 * @example
 * var midi = require('note-midi')
 * midi('A4') // => 69
 * midi('a3') // => 57
 * midi([0, 2]) // => 36 (C2 in array notation)
 * midi(60) // => 60
 * midi('C') // => null (pitch classes don't have midi number)
 */
function midi (note) {
  if ((typeof note === 'number' || typeof note === 'string') &&
    note > 0 && note < 128) return +note
  var p = Array.isArray(note) ? note : parse(note)
  if (!p || p.length < 2) return null
  return p[0] * 7 + p[1] * 12 + 12
}

if (typeof module === 'object' && module.exports) module.exports = midi
if (typeof window !== 'undefined') window.midi = midi

},{"music-notation/note/parse":13}],20:[function(require,module,exports){
var parse = require('music-notation/pitch/parse')
var str = require('music-notation/pitch/str')
var operation = require('music-notation/operation')(parse, str)

/**
 * Transposes a note by an interval.
 *
 * Given a note and an interval it returns the transposed note. It can be used
 * to add intervals if both parameters are intervals.
 *
 * The order of the parameters is indifferent.
 *
 * This function is currified so it can be used to map arrays of notes.
 *
 * @name transpose
 * @function
 * @param {String|Array} interval - the interval. If its false, the note is not
 * transposed.
 * @param {String|Array} note - the note to transpose
 * @return {String|Array} the note transposed
 *
 * @example
 * var transpose = require('note-transposer')
 * transpose('3m', 'C4') // => 'Eb4'
 * transpose('C4', '3m') // => 'Eb4'
 * tranpose([1, 0, 2], [3, -1, 0]) // => [3, 0, 2]
 * ['C', 'D', 'E'].map(transpose('3M')) // => ['E', 'F#', 'G#']
 */
var transpose = operation(function (i, n) {
  if (i === false) return n
  else if (!Array.isArray(i) || !Array.isArray(n)) return null
  else if (i.length === 1 || n.length === 1) return [n[0] + i[0]]
  var d = i.length === 2 && n.length === 2 ? null : n[2] || i[2]
  return [n[0] + i[0], n[1] + i[1], d]
})

if (typeof module === 'object' && module.exports) module.exports = transpose
if (typeof window !== 'undefined') window.transpose = transpose

},{"music-notation/operation":16,"music-notation/pitch/parse":17,"music-notation/pitch/str":18}],21:[function(require,module,exports){

var DEFAULTS = {
  // time in milliseconds of the scheduler lookahead
  lookahead: 500,
  overlap: 250
}

/**
 *
 */
function schedule (ac, time, events, fn, options) {
  console.log(events)
  time = Math.max(time, ac.currentTime)
  var opts = DEFAULTS
  var id = null
  var nextEvtNdx = 0

  function scheduleEvents () {
    var current = ac.currentTime
    var from = current - time
    var to = current + (opts.lookahead + opts.overlap) / 1000
    console.log('scheduling', from, to)
    var next = events[nextEvtNdx]
    while (next && next[0] >= from && next[0] < to) {
      fn(time + next[0], next[1])
      console.log('event', next, current, time, time + next[0])
      nextEvtNdx++
      next = events[nextEvtNdx]
    }
    if (next) id = setTimeout(scheduleEvents, opts.lookahead)
  }
  scheduleEvents()

  return {
    stop: function () {
      clearTimeout(id)
    }
  }
}

module.exports = { schedule: schedule }

},{}],22:[function(require,module,exports){
'use strict'

var slice = Array.prototype.slice
var modules = [
  require('./lib/score'),
  require('./lib/notes'),
  require('./lib/stats'),
  require('./lib/timed'),
  require('./lib/rhythm'),
  require('./lib/measures'),
  require('./lib/harmony'),
  require('./lib/performance'),
  require('./lib/build')
]

function score (data) {
  if (arguments.length > 1) data = score.sim(slice.call(arguments))
  return score.build(score, data).score
}

modules.forEach(function (module) {
  Object.keys(module).forEach(function (name) { score[name] = module[name] })
})

if (typeof module === 'object' && module.exports) module.exports = score
if (typeof window !== 'undefined') window.Score = score

},{"./lib/build":23,"./lib/harmony":24,"./lib/measures":25,"./lib/notes":26,"./lib/performance":27,"./lib/rhythm":28,"./lib/score":29,"./lib/stats":30,"./lib/timed":31}],23:[function(require,module,exports){
/** @module build */

function build (scope, data) {
  if (arguments.length > 1) return build(scope)(data)

  return function (data) {
    var ctx = {}
    ctx.score = exec(ctx, scope, data)
    return ctx
  }
}

// exec a data array
function exec (ctx, scope, data) {
  var fn = getFunction(ctx, scope, data[0])
  var elements = data.slice(1)
  var params = elements.map(function (p) {
    return Array.isArray(p) ? exec(ctx, scope, p)
      : (p[0] === '$') ? ctx[p] : p
  }).filter(function (p) { return p !== VAR })
  return fn.apply(null, params)
}

function getFunction (ctx, scope, name) {
  if (typeof name === 'function') return name
  else if (typeof name !== 'string') throw Error('Not a valid function: ' + name)
  else if (name[0] === '$') return variableFn(ctx, name)
  else if (!scope[name]) throw Error('Command not found: ' + name)
  else return scope[name]
}

var VAR = { type: 'var' }
function variableFn (ctx, name) {
  return function (obj) {
    ctx[name] = obj
    return VAR
  }
}

module.exports = { build: build }

},{}],24:[function(require,module,exports){
/** @module harmony */

var score = require('./score')
var measures = require('./measures').measures
var getChord = require('chord-dictionary')

/**
 * Create a chord names sequence
 *
 * @param {String} meter - the meter used in the measures
 * @param {String} measures - the chords
 * @param {Sequence} a sequence of chords
 *
 * @example
 * score.chords('4/4', 'C6 | Dm7 G7 | Cmaj7')
 *
 * @example
 * score(['chords', '4/4', 'Cmaj7 | Dm7 G7'])
 */
function chords (meter, data) {
  return measures(meter, data, function (dur, el) {
    return score.el({ duration: dur, chord: el })
  })
}

/**
 * Convert a chord names sequence into a chord notes sequence
 */
var expandChords = score.map(function (el) {
  var toNote = score.note(el.duration)
  var setOct = function (pc) { return pc + 4 }
  return el.chord
    ? score.sim(getChord(el.chord).map(setOct).map(toNote)) : el
}, null)

/**
 * Create a harmony sequence
 */
function harmony (meter, data) {
  return expandChords(chords(meter, data))
}

module.exports = { chords: chords, expandChords: expandChords, harmony: harmony }

},{"./measures":25,"./score":29,"chord-dictionary":3}],25:[function(require,module,exports){
/** @module measures */

var score = require('./score')

/**
 * Parse masures using a time meter to get a sequence
 *
 * @param {String} meter - the time meter
 * @param {String} measures - the measures string
 * @param {Function} builder - (Optional) the function used to build the notes
 * @return {Score} the score object
 *
 * @example
 * measures('4/4', 'c d (e f) | g | (a b c) d')
 */
function measures (meter, measures, builder) {
  var list
  var mLen = measureLength(meter)
  if (!mLen) throw Error('Not valid meter: ' + meter)

  var seq = []
  builder = builder || score.note
  splitMeasures(measures).forEach(function (measure) {
    measure = measure.trim()
    if (measure.length > 0) {
      list = parenthesize(tokenize(measure), [])
      processList(seq, list, measureLength(meter), builder)
    }
  })
  return score.seq(seq)
}

// get the length of one measure
function measureLength (meter) {
  var m = meter.split('/').map(function (n) {
    return +n.trim()
  })
  return m[0] * (4 / m[1])
}

function processList (seq, list, total, builder) {
  var dur = total / list.length
  list.forEach(function (i) {
    if (Array.isArray(i)) processList(seq, i, dur, builder)
    else seq.push(builder(dur, i))
  })
}

function splitMeasures (repr) {
  return repr
    .replace(/\s+\||\|\s+/, '|') // spaces between |
    .replace(/^\||\|\s*$/g, '') // first and last |
    .split('|')
}

/*
 * The following code is copied from https://github.com/maryrosecook/littlelisp
 * See: http://maryrosecook.com/blog/post/little-lisp-interpreter
 * Thanks Mary Rose Cook!
 */
var parenthesize = function (input, list) {
  var token = input.shift()
  if (token === undefined) {
    return list
  } else if (token === '(') {
    list.push(parenthesize(input, []))
    return parenthesize(input, list)
  } else if (token === ')') {
    return list
  } else {
    return parenthesize(input, list.concat(token))
  }
}

var tokenize = function (input) {
  return input
    .replace(/[\(]/g, ' ( ')
    .replace(/[\)]/g, ' ) ')
    .replace(/\,/g, ' ')
    .trim().split(/\s+/)
}

module.exports = { measures: measures, melody: measures }

},{"./score":29}],26:[function(require,module,exports){
/** @module notes */

var score = require('./score')
var tr = require('note-transposer')

// ======== UTILITY ========
// This is an utility function to create array of notes quickly.
function notes (pitches, durations, params) {
  var p = toArray(pitches || null)
  var d = toArray(durations || 1)
  return p.map(function (pitch, i) {
    return score.note(+d[i % d.length], pitch, params)
  })
}

// convert anything to an array (if string, split it)
function toArray (obj) {
  if (Array.isArray(obj)) return obj
  else if (typeof obj === 'string') return obj.trim().split(/\s+/)
  else return [ obj ]
}

// ======= API ========

/**
 * Create a phrase (a sequential structure of notes)
 *
 * @param {String|Array} pitches - the phrase note pitches
 * @param {String|Array} durations - the phrase note durations
 * @param {Hash} attributes - the phrase note attributes
 * @return {Array} a sequential musical structure
 *
 * @example
 * score.phrase('A B C D E', 1)
 */
function phrase (p, d, a) { return score.seq(notes(p, d, a)) }

/**
 * Create a collection of simultaneus notes
 *
 * You can specify a collection of pitches, durations and attributes
 * and `chord` will arrange them as a collection of notes in simultaneus
 * layout
 *
 * @param {String|Array} pitches - the chord note pitches
 * @param {String|Array} durations - the chord note durations
 * @param {Hash} attributes - the chord note attributes
 * @return {Array} a parallel musical structure
 *
 * @example
 * score.phrase('A B C D E', 1)
 */
function chord (p, d, a) { return score.sim(notes(p, d, a)) }

/**
 * Transpose notes
 *
 * @param {String} interval - the interval to transpose
 * @param {Object} score - the score object
 * @return {Score} the score with the notes transposed
 */
var trans = score.map(function (note, interval) {
  return note.pitch
    ? score.el(note, { pitch: tr(interval, note.pitch) }) : note
})

module.exports = { phrase: phrase, chord: chord, trans: trans }

},{"./score":29,"note-transposer":20}],27:[function(require,module,exports){
/** @module performance */

var score = require('./score')

var inst = score.map(function (note, name) {
  return score.el(note, { inst: name })
})

var tempo = score.map(function (note, tempo) {
  var c = 60 / tempo
  return score.el(note, { duration: c * note.duration })
})

var vel = score.map(function (note, vel) {
  return score.el(note, { velocity: vel })
})

module.exports = { inst: inst, tempo: tempo, vel: vel }

},{"./score":29}],28:[function(require,module,exports){
/** @module rhythm */

var score = require('./score')

var rhythm = {}

/**
 * Create a rhythmic sequence from a pattern
 */
rhythm.pattern = function (pattern, duration) {
  var arr = pattern.split('')
  var dur = duration ? duration / arr.length : 1
  return score.seq(arr.map(score.note(dur)))
}

/**
 * Create a rhythmic sequence from an inter onset interval number
 */
rhythm.ioi = function (ioi) {
  return rhythm.pattern(rhythm.ioiToPattern(ioi))
}

/**
 * Convert an [inter onset interval](https://en.wikipedia.org/wiki/Time_point#Interonset_interval)
 * to a pattern
 *
 * @param {String} ioi - the inter onset interval
 * @param {String} the rhythm pattern
 */
rhythm.ioiToPattern = function (num) {
  return num.split('').map(function (n) {
    return 'x' + Array(+n).join('.')
  }).join('')
}

/**
 * Convert a pattern string to inter onset interval string
 *
 * @param {String} pattern - the pattern to be converted
 * @return {String} the inter onset interval
 */
rhythm.patternToIoi = function (pattern) {
  return pattern.split(/x/)
    .map(function (d) { return d.length })
    .filter(function (_, i) { return i }) // remove first
    .map(function (d) { return d + 1 })
    .join('')
}

module.exports = rhythm

},{"./score":29}],29:[function(require,module,exports){
'use strict'

/**
 * @module score
 */
var isArray = Array.isArray
var slice = Array.prototype.slice
var assign = Object.assign
function typeOf (obj) { return isArray(obj) ? obj[0] : 'el' }
function isStruct (e) { return isArray(e) && typeof e[0] === 'string' }
// create a sequence builder
function builder (name) {
  return function (elements) {
    if (arguments.length > 1) return [name].concat(slice.call(arguments))
    else if (isStruct(elements)) return [name, elements]
    return [name].concat(elements)
  }
}

/**
 * Create a score element: an object with duration
 *
 * It's accepts any data you supply, but duration property has a special
 * meaning: it's a number representing the duration in arbitrary units.
 * It's assumed to be 0 (no duration) if not present or not a valid number
 *
 * @param {Number} duration - the element duration
 * @param {Object} data - the additional element data
 */
function el (d, data) {
  if (typeof d === 'object') return assign({}, d, data)
  else return assign({ duration: +d || 0 }, data)
}

/**
 * Create a note from duration and pitch
 *
 * A note is any object with duration and pitch attributes. The duration
 * must be a number, but the pitch can be any value (although only strings with
 * scientific notation pitches and midi numbers are recogniced by the manipulation
 * or display functions)
 *
 * If only duration is provided, a partially applied function is returned.
 *
 * @param {Integer} duration - the note duration
 * @param {String|Integer} pitch - the note pitch
 * @param {Hash} data - (Optional) arbitraty note data
 * @return {Hash} a note
 *
 * @example
 * score.note(1, 'A') // => { duration: 1, pitch: 'A' }
 * score.note(0.5, 'anything') // => { duration: 0.5, pitch: 'anything' }
 * score.note(2, 'A', 2, { inst: 'piano' }) // => { duration: 2, pitch: 'A', inst: 'piano' }
 *
 * @example
 * // partially applied
 * ['C', 'D', 'E'].map(score.note(1)) // => [{ duration: 1, pitch: 'C'},
 *   { duration: 1, pitch: 'D'}, { duration: 1, pitch: 'E'}]
 */
function note (dur, pitch, data) {
  if (arguments.length === 1) return function (p, d) { return note(dur, p, d) }
  return assign({ pitch: pitch, duration: dur || 1 }, data)
}

/**
 * Create a musical structure where elements are sequenetial
 *
 * @function
 * @param {Array} elements - an array of elements
 * @return {Array} the sequential musical structure
 *
 * @example
 * score.sequential([score.note('A'), score.note('B')])
 */
var seq = builder('seq')

/**
 * Create a musical structure where elements are simultaneous
 *
 * @function
 * @example
 * score.sim([score.note('A'), score.note('B')])
 */
var sim = builder('sim')

/**
 * Transform a musical structure
 *
 * This is probably the most important function. It allows complex
 * transformations of musical structures using three functions
 *
 * @param {Function} elTransform - element transform function
 * @param {Function} seqTransform - sequential structure transform function
 * @param {Function} parTransform - simultaneous structure transform function
 * @param {*} ctx - an additional object passed to transform functions
 * @param {Object} score - the score to transform
 * @return {*} the result of the transformation
 */
function transform (nt, st, pt, ctx, obj) {
  switch (arguments.length) {
    case 0: return transform
    case 1:
    case 2:
    case 3: return transformer(nt, st, pt)
    case 4: return function (o) { return transformer(nt, st, pt)(ctx, o) }
    default: return transformer(nt, st, pt)(ctx, obj)
  }
}

function transformer (nt, st, pt) {
  var T = function (ctx, obj) {
    var m = function (o) { return T(ctx, o) }
    switch (typeOf(obj)) {
      case 'el': return nt(obj, ctx)
      case 'seq': return st(obj.slice(1).map(m), ctx)
      case 'sim': return pt(obj.slice(1).map(m), ctx)
      default: return obj
    }
  }
  return T
}

/**
* Map the notes of a musical structure using a function
*
* @param {Function} fn - the function used to map the notes
* @param {Object} ctx - a context object passed to the function
* @param {Score} score - the score to transform
* @return {Score} the transformed score
*/
function map (fn, ctx, obj) {
  switch (arguments.length) {
    case 0: return map
    case 1: return transform(fn, buildSeq, buildSim)
    case 2: return function (obj) { return map(fn)(ctx, obj) }
    case 3: return map(fn)(ctx, obj)
  }
}
function buildSeq (el, ctx) { return seq(el) }
function buildSim (el, ctx) { return sim(el) }

module.exports = {
  el: el, note: note,
  seq: seq, sequentially: seq,
  sim: sim, simultaneosly: sim,
  transform: transform, map: map }

},{}],30:[function(require,module,exports){
/** @module stats */
var score = require('./score')

function dur (obj) { return obj.duration }
function one () { return 1 }
function arrayMax (arr) { return Math.max.apply(null, arr) }
function arrayAdd (arr) { return arr.reduce(function (a, b) { return a + b }) }

/**
 * Get the total duration of a score
 * @function
 */
var duration = score.transform(dur, arrayAdd, arrayMax, null)

/**
 * Get the longest element duration of a score
 * @function
 */
var longest = score.transform(dur, arrayMax, arrayMax, null)

/**
 * Return the number of elements of a score
 */
var count = score.transform(one, arrayAdd, arrayAdd, null)

module.exports = { duration: duration, longest: longest, count: count }

},{"./score":29}],31:[function(require,module,exports){
/** @module timed */
var score = require('./score')

/**
* Get all notes for side-effects
*
* __Important:__ ascending time ordered is not guaranteed
*
* @param {Function} fn - the function
* @param {Object} ctx - (Optional) a context object passed to the function
* @param {Score} score - the score object
*/
function forEachTime (fn, ctx, obj) {
  if (arguments.length > 1) return forEachTime(fn)(ctx, obj)

  return function (ctx, obj) {
    return score.transform(
      function (note) {
        return function (time, ctx) {
          fn(time, note, ctx)
          return note.duration
        }
      },
      function (seq) {
        return function (time, ctx) {
          return seq.reduce(function (dur, fn) {
            return dur + fn(time + dur, ctx)
          }, 0)
        }
      },
      function (par) {
        return function (time, ctx) {
          return par.reduce(function (max, fn) {
            return Math.max(max, fn(time, ctx))
          }, 0)
        }
      }
    )(null, obj)(0, ctx)
  }
}

/**
 * Get a sorted events array from a score
 *
 */
function events (obj, build, compare) {
  var e = []
  forEachTime(function (time, obj) {
    e.push(build ? build(time, obj) : [time, obj])
  }, null, obj)
  return e.sort(compare || function (a, b) { return a[0] - b[0] })
}

module.exports = { forEachTime: forEachTime, events: events }

},{"./score":29}],32:[function(require,module,exports){
var VNode = require('./vnode');
var is = require('./is');

function addNS(data, children) {
  data.ns = 'http://www.w3.org/2000/svg';
  if (children !== undefined) {
    for (var i = 0; i < children.length; ++i) {
      addNS(children[i].data, children[i].children);
    }
  }
}

module.exports = function h(sel, b, c) {
  var data = {}, children, text, i;
  if (arguments.length === 3) {
    data = b;
    if (is.array(c)) { children = c; }
    else if (is.primitive(c)) { text = c; }
  } else if (arguments.length === 2) {
    if (is.array(b)) { children = b; }
    else if (is.primitive(b)) { text = b; }
    else { data = b; }
  }
  if (is.array(children)) {
    for (i = 0; i < children.length; ++i) {
      if (is.primitive(children[i])) children[i] = VNode(undefined, undefined, undefined, children[i]);
    }
  }
  if (sel[0] === 's' && sel[1] === 'v' && sel[2] === 'g') {
    addNS(data, children);
  }
  return VNode(sel, data, children, text, undefined);
};

},{"./is":34,"./vnode":40}],33:[function(require,module,exports){
function createElement(tagName){
  return document.createElement(tagName);
}

function createElementNS(namespaceURI, qualifiedName){
  return document.createElementNS(namespaceURI, qualifiedName);
}

function createTextNode(text){
  return document.createTextNode(text);
}


function insertBefore(parentNode, newNode, referenceNode){
  parentNode.insertBefore(newNode, referenceNode);
}


function removeChild(node, child){
  node.removeChild(child);
}

function appendChild(node, child){
  node.appendChild(child);
}

function parentNode(node){
  return node.parentElement;
}

function nextSibling(node){
  return node.nextSibling;
}

function tagName(node){
  return node.tagName;
}

function setTextContent(node, text){
  node.textContent = text;
}

module.exports = {
  createElement: createElement,
  createElementNS: createElementNS,
  createTextNode: createTextNode,
  appendChild: appendChild,
  removeChild: removeChild,
  insertBefore: insertBefore,
  parentNode: parentNode,
  nextSibling: nextSibling,
  tagName: tagName,
  setTextContent: setTextContent
};

},{}],34:[function(require,module,exports){
module.exports = {
  array: Array.isArray,
  primitive: function(s) { return typeof s === 'string' || typeof s === 'number'; },
};

},{}],35:[function(require,module,exports){
function updateClass(oldVnode, vnode) {
  var cur, name, elm = vnode.elm,
      oldClass = oldVnode.data.class || {},
      klass = vnode.data.class || {};
  for (name in oldClass) {
    if (!klass[name]) {
      elm.classList.remove(name);
    }
  }
  for (name in klass) {
    cur = klass[name];
    if (cur !== oldClass[name]) {
      elm.classList[cur ? 'add' : 'remove'](name);
    }
  }
}

module.exports = {create: updateClass, update: updateClass};

},{}],36:[function(require,module,exports){
var is = require('../is');

function arrInvoker(arr) {
  return function() {
    // Special case when length is two, for performance
    arr.length === 2 ? arr[0](arr[1]) : arr[0].apply(undefined, arr.slice(1));
  };
}

function fnInvoker(o) {
  return function(ev) { o.fn(ev); };
}

function updateEventListeners(oldVnode, vnode) {
  var name, cur, old, elm = vnode.elm,
      oldOn = oldVnode.data.on || {}, on = vnode.data.on;
  if (!on) return;
  for (name in on) {
    cur = on[name];
    old = oldOn[name];
    if (old === undefined) {
      if (is.array(cur)) {
        elm.addEventListener(name, arrInvoker(cur));
      } else {
        cur = {fn: cur};
        on[name] = cur;
        elm.addEventListener(name, fnInvoker(cur));
      }
    } else if (is.array(old)) {
      // Deliberately modify old array since it's captured in closure created with `arrInvoker`
      old.length = cur.length;
      for (var i = 0; i < old.length; ++i) old[i] = cur[i];
      on[name]  = old;
    } else {
      old.fn = cur;
      on[name] = old;
    }
  }
}

module.exports = {create: updateEventListeners, update: updateEventListeners};

},{"../is":34}],37:[function(require,module,exports){
function updateProps(oldVnode, vnode) {
  var key, cur, old, elm = vnode.elm,
      oldProps = oldVnode.data.props || {}, props = vnode.data.props || {};
  for (key in oldProps) {
    if (!props[key]) {
      delete elm[key];
    }
  }
  for (key in props) {
    cur = props[key];
    old = oldProps[key];
    if (old !== cur && (key !== 'value' || elm[key] !== cur)) {
      elm[key] = cur;
    }
  }
}

module.exports = {create: updateProps, update: updateProps};

},{}],38:[function(require,module,exports){
var raf = (typeof window !== 'undefined' && window.requestAnimationFrame) || setTimeout;
var nextFrame = function(fn) { raf(function() { raf(fn); }); };

function setNextFrame(obj, prop, val) {
  nextFrame(function() { obj[prop] = val; });
}

function updateStyle(oldVnode, vnode) {
  var cur, name, elm = vnode.elm,
      oldStyle = oldVnode.data.style || {},
      style = vnode.data.style || {},
      oldHasDel = 'delayed' in oldStyle;
  for (name in oldStyle) {
    if (!style[name]) {
      elm.style[name] = '';
    }
  }
  for (name in style) {
    cur = style[name];
    if (name === 'delayed') {
      for (name in style.delayed) {
        cur = style.delayed[name];
        if (!oldHasDel || cur !== oldStyle.delayed[name]) {
          setNextFrame(elm.style, name, cur);
        }
      }
    } else if (name !== 'remove' && cur !== oldStyle[name]) {
      elm.style[name] = cur;
    }
  }
}

function applyDestroyStyle(vnode) {
  var style, name, elm = vnode.elm, s = vnode.data.style;
  if (!s || !(style = s.destroy)) return;
  for (name in style) {
    elm.style[name] = style[name];
  }
}

function applyRemoveStyle(vnode, rm) {
  var s = vnode.data.style;
  if (!s || !s.remove) {
    rm();
    return;
  }
  var name, elm = vnode.elm, idx, i = 0, maxDur = 0,
      compStyle, style = s.remove, amount = 0, applied = [];
  for (name in style) {
    applied.push(name);
    elm.style[name] = style[name];
  }
  compStyle = getComputedStyle(elm);
  var props = compStyle['transition-property'].split(', ');
  for (; i < props.length; ++i) {
    if(applied.indexOf(props[i]) !== -1) amount++;
  }
  elm.addEventListener('transitionend', function(ev) {
    if (ev.target === elm) --amount;
    if (amount === 0) rm();
  });
}

module.exports = {create: updateStyle, update: updateStyle, destroy: applyDestroyStyle, remove: applyRemoveStyle};

},{}],39:[function(require,module,exports){
// jshint newcap: false
/* global require, module, document, Node */
'use strict';

var VNode = require('./vnode');
var is = require('./is');
var domApi = require('./htmldomapi.js');

function isUndef(s) { return s === undefined; }
function isDef(s) { return s !== undefined; }

var emptyNode = VNode('', {}, [], undefined, undefined);

function sameVnode(vnode1, vnode2) {
  return vnode1.key === vnode2.key && vnode1.sel === vnode2.sel;
}

function createKeyToOldIdx(children, beginIdx, endIdx) {
  var i, map = {}, key;
  for (i = beginIdx; i <= endIdx; ++i) {
    key = children[i].key;
    if (isDef(key)) map[key] = i;
  }
  return map;
}

var hooks = ['create', 'update', 'remove', 'destroy', 'pre', 'post'];

function init(modules, api) {
  var i, j, cbs = {};

  if (isUndef(api)) api = domApi;

  for (i = 0; i < hooks.length; ++i) {
    cbs[hooks[i]] = [];
    for (j = 0; j < modules.length; ++j) {
      if (modules[j][hooks[i]] !== undefined) cbs[hooks[i]].push(modules[j][hooks[i]]);
    }
  }

  function emptyNodeAt(elm) {
    return VNode(api.tagName(elm).toLowerCase(), {}, [], undefined, elm);
  }

  function createRmCb(childElm, listeners) {
    return function() {
      if (--listeners === 0) {
        var parent = api.parentNode(childElm);
        api.removeChild(parent, childElm);
      }
    };
  }

  function createElm(vnode, insertedVnodeQueue) {
    var i, thunk, data = vnode.data;
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.init)) i(vnode);
      if (isDef(i = data.vnode)) {
          thunk = vnode;
          vnode = i;
      }
    }
    var elm, children = vnode.children, sel = vnode.sel;
    if (isDef(sel)) {
      // Parse selector
      var hashIdx = sel.indexOf('#');
      var dotIdx = sel.indexOf('.', hashIdx);
      var hash = hashIdx > 0 ? hashIdx : sel.length;
      var dot = dotIdx > 0 ? dotIdx : sel.length;
      var tag = hashIdx !== -1 || dotIdx !== -1 ? sel.slice(0, Math.min(hash, dot)) : sel;
      elm = vnode.elm = isDef(data) && isDef(i = data.ns) ? api.createElementNS(i, tag)
                                                          : api.createElement(tag);
      if (hash < dot) elm.id = sel.slice(hash + 1, dot);
      if (dotIdx > 0) elm.className = sel.slice(dot+1).replace(/\./g, ' ');
      if (is.array(children)) {
        for (i = 0; i < children.length; ++i) {
          api.appendChild(elm, createElm(children[i], insertedVnodeQueue));
        }
      } else if (is.primitive(vnode.text)) {
        api.appendChild(elm, api.createTextNode(vnode.text));
      }
      for (i = 0; i < cbs.create.length; ++i) cbs.create[i](emptyNode, vnode);
      i = vnode.data.hook; // Reuse variable
      if (isDef(i)) {
        if (i.create) i.create(emptyNode, vnode);
        if (i.insert) insertedVnodeQueue.push(vnode);
      }
    } else {
      elm = vnode.elm = api.createTextNode(vnode.text);
    }
    if (isDef(thunk)) thunk.elm = vnode.elm;
    return vnode.elm;
  }

  function addVnodes(parentElm, before, vnodes, startIdx, endIdx, insertedVnodeQueue) {
    for (; startIdx <= endIdx; ++startIdx) {
      api.insertBefore(parentElm, createElm(vnodes[startIdx], insertedVnodeQueue), before);
    }
  }

  function invokeDestroyHook(vnode) {
    var i, j, data = vnode.data;
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.destroy)) i(vnode);
      for (i = 0; i < cbs.destroy.length; ++i) cbs.destroy[i](vnode);
      if (isDef(i = vnode.children)) {
        for (j = 0; j < vnode.children.length; ++j) {
          invokeDestroyHook(vnode.children[j]);
        }
      }
      if (isDef(i = data.vnode)) invokeDestroyHook(i);
    }
  }

  function removeVnodes(parentElm, vnodes, startIdx, endIdx) {
    for (; startIdx <= endIdx; ++startIdx) {
      var i, listeners, rm, ch = vnodes[startIdx];
      if (isDef(ch)) {
        if (isDef(ch.sel)) {
          invokeDestroyHook(ch);
          listeners = cbs.remove.length + 1;
          rm = createRmCb(ch.elm, listeners);
          for (i = 0; i < cbs.remove.length; ++i) cbs.remove[i](ch, rm);
          if (isDef(i = ch.data) && isDef(i = i.hook) && isDef(i = i.remove)) {
            i(ch, rm);
          } else {
            rm();
          }
        } else { // Text node
          api.removeChild(parentElm, ch.elm);
        }
      }
    }
  }

  function updateChildren(parentElm, oldCh, newCh, insertedVnodeQueue) {
    var oldStartIdx = 0, newStartIdx = 0;
    var oldEndIdx = oldCh.length - 1;
    var oldStartVnode = oldCh[0];
    var oldEndVnode = oldCh[oldEndIdx];
    var newEndIdx = newCh.length - 1;
    var newStartVnode = newCh[0];
    var newEndVnode = newCh[newEndIdx];
    var oldKeyToIdx, idxInOld, elmToMove, before;

    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (isUndef(oldStartVnode)) {
        oldStartVnode = oldCh[++oldStartIdx]; // Vnode has been moved left
      } else if (isUndef(oldEndVnode)) {
        oldEndVnode = oldCh[--oldEndIdx];
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
        oldStartVnode = oldCh[++oldStartIdx];
        newStartVnode = newCh[++newStartIdx];
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
        oldEndVnode = oldCh[--oldEndIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
        api.insertBefore(parentElm, oldStartVnode.elm, api.nextSibling(oldEndVnode.elm));
        oldStartVnode = oldCh[++oldStartIdx];
        newEndVnode = newCh[--newEndIdx];
      } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
        api.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
        oldEndVnode = oldCh[--oldEndIdx];
        newStartVnode = newCh[++newStartIdx];
      } else {
        if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
        idxInOld = oldKeyToIdx[newStartVnode.key];
        if (isUndef(idxInOld)) { // New element
          api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm);
          newStartVnode = newCh[++newStartIdx];
        } else {
          elmToMove = oldCh[idxInOld];
          patchVnode(elmToMove, newStartVnode, insertedVnodeQueue);
          oldCh[idxInOld] = undefined;
          api.insertBefore(parentElm, elmToMove.elm, oldStartVnode.elm);
          newStartVnode = newCh[++newStartIdx];
        }
      }
    }
    if (oldStartIdx > oldEndIdx) {
      before = isUndef(newCh[newEndIdx+1]) ? null : newCh[newEndIdx+1].elm;
      addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
    } else if (newStartIdx > newEndIdx) {
      removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
    }
  }

  function patchVnode(oldVnode, vnode, insertedVnodeQueue) {
    var i, hook;
    if (isDef(i = vnode.data) && isDef(hook = i.hook) && isDef(i = hook.prepatch)) {
      i(oldVnode, vnode);
    }
    if (isDef(i = oldVnode.data) && isDef(i = i.vnode)) oldVnode = i;
    if (isDef(i = vnode.data) && isDef(i = i.vnode)) {
      patchVnode(oldVnode, i, insertedVnodeQueue);
      vnode.elm = i.elm;
      return;
    }
    var elm = vnode.elm = oldVnode.elm, oldCh = oldVnode.children, ch = vnode.children;
    if (oldVnode === vnode) return;
    if (!sameVnode(oldVnode, vnode)) {
      var parentElm = api.parentNode(oldVnode.elm);
      elm = createElm(vnode, insertedVnodeQueue);
      api.insertBefore(parentElm, elm, oldVnode.elm);
      removeVnodes(parentElm, [oldVnode], 0, 0);
      return;
    }
    if (isDef(vnode.data)) {
      for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode);
      i = vnode.data.hook;
      if (isDef(i) && isDef(i = i.update)) i(oldVnode, vnode);
    }
    if (isUndef(vnode.text)) {
      if (isDef(oldCh) && isDef(ch)) {
        if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue);
      } else if (isDef(ch)) {
        if (isDef(oldVnode.text)) api.setTextContent(elm, '');
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
      } else if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1);
      } else if (isDef(oldVnode.text)) {
        api.setTextContent(elm, '');
      }
    } else if (oldVnode.text !== vnode.text) {
      api.setTextContent(elm, vnode.text);
    }
    if (isDef(hook) && isDef(i = hook.postpatch)) {
      i(oldVnode, vnode);
    }
  }

  return function(oldVnode, vnode) {
    var i, elm, parent;
    var insertedVnodeQueue = [];
    for (i = 0; i < cbs.pre.length; ++i) cbs.pre[i]();

    if (isUndef(oldVnode.sel)) {
      oldVnode = emptyNodeAt(oldVnode);
    }

    if (sameVnode(oldVnode, vnode)) {
      patchVnode(oldVnode, vnode, insertedVnodeQueue);
    } else {
      elm = oldVnode.elm;
      parent = api.parentNode(elm);

      createElm(vnode, insertedVnodeQueue);

      if (parent !== null) {
        api.insertBefore(parent, vnode.elm, api.nextSibling(elm));
        removeVnodes(parent, [oldVnode], 0, 0);
      }
    }

    for (i = 0; i < insertedVnodeQueue.length; ++i) {
      insertedVnodeQueue[i].data.hook.insert(insertedVnodeQueue[i]);
    }
    for (i = 0; i < cbs.post.length; ++i) cbs.post[i]();
    return vnode;
  };
}

module.exports = {init: init};

},{"./htmldomapi.js":33,"./is":34,"./vnode":40}],40:[function(require,module,exports){
module.exports = function(sel, data, children, text, elm) {
  var key = data === undefined ? undefined : data.key;
  return {sel: sel, data: data, children: children,
          text: text, elm: elm, key: key};
};

},{}],41:[function(require,module,exports){
'use strict';

function b64ToUint6 (nChr) {
  return nChr > 64 && nChr < 91 ?
      nChr - 65
    : nChr > 96 && nChr < 123 ?
      nChr - 71
    : nChr > 47 && nChr < 58 ?
      nChr + 4
    : nChr === 43 ?
      62
    : nChr === 47 ?
      63
    :
      0;

}

// Decode Base64 to Uint8Array
// ---------------------------
function base64DecodeToArray(sBase64, nBlocksSize) {
  var sB64Enc = sBase64.replace(/[^A-Za-z0-9\+\/]/g, "");
  var nInLen = sB64Enc.length;
  var nOutLen = nBlocksSize ?
    Math.ceil((nInLen * 3 + 1 >> 2) / nBlocksSize) * nBlocksSize :
    nInLen * 3 + 1 >> 2;
  var taBytes = new Uint8Array(nOutLen);

  for (var nMod3, nMod4, nUint24 = 0, nOutIdx = 0, nInIdx = 0; nInIdx < nInLen; nInIdx++) {
    nMod4 = nInIdx & 3;
    nUint24 |= b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << 18 - 6 * nMod4;
    if (nMod4 === 3 || nInLen - nInIdx === 1) {
      for (nMod3 = 0; nMod3 < 3 && nOutIdx < nOutLen; nMod3++, nOutIdx++) {
        taBytes[nOutIdx] = nUint24 >>> (16 >>> nMod3 & 24) & 255;
      }
      nUint24 = 0;
    }
  }
  return taBytes;
}

module.exports = base64DecodeToArray;

},{}],42:[function(require,module,exports){
'use strict'

var midi = require('note-midi')

/**
 * Create a soundfont buffers player
 *
 * @param {AudioContext} ac - the audio context
 * @param {Hash} buffers - a midi number to audio buffer hash map
 * @param {Hash} options - (Optional) a hash of options:
 * - gain: the output gain (default: 2)
 * - destination: the destination of the player (default: `ac.destination`)
 */
module.exports = function (ctx, buffers, options) {
  options = options || {}
  var gain = options.gain || 2
  var destination = options.destination || ctx.destination

  return function (note, time, duration) {
    var m = note > 0 && note < 128 ? note : midi(note)
    var buffer = buffers[m]
    if (!buffer) return
    var source = ctx.createBufferSource()
    source.buffer = buffer

    /* VCA */
    var vca = ctx.createGain()
    vca.gain.value = gain
    source.connect(vca)
    vca.connect(destination)

    source.start(time)
    if (duration > 0) source.stop(time + duration)
    return source
  }
}

},{"note-midi":19}],43:[function(require,module,exports){
'use strict'

var base64DecodeToArray = require('./b64decode.js')

/**
 * Given a base64 encoded audio data, return a prmomise with an audio buffer
 *
 * @param {AudioContext} context - the [audio context](https://developer.mozilla.org/en/docs/Web/API/AudioContext)
 * @param {String} data - the base64 encoded audio data
 * @return {Promise} a promise that resolves to an [audio buffer](https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer)
 * @api private
 */
module.exports = function (context, data) {
  return new Promise(function (done, reject) {
    var decodedData = base64DecodeToArray(data.split(',')[1]).buffer
    context.decodeAudioData(decodedData, function (buffer) {
      done(buffer)
    }, function (e) {
      reject('DecodeAudioData error', e)
    })
  })
}

},{"./b64decode.js":41}],44:[function(require,module,exports){
'use strict'

var loadBank = require('./load-bank')
var oscillatorPlayer = require('./oscillator-player')
var buffersPlayer = require('./buffers-player')

/**
 * Create a Soundfont object
 *
 * @param {AudioContext} context - the [audio context](https://developer.mozilla.org/en/docs/Web/API/AudioContext)
 * @return {Soundfont} a soundfont object
 */
function Soundfont (ctx, nameToUrl) {
  if (!(this instanceof Soundfont)) return new Soundfont(ctx)

  this.nameToUrl = nameToUrl || Soundfont.nameToUrl || gleitzUrl
  this.ctx = ctx
  this.instruments = {}
  this.promises = []
}

Soundfont.prototype.instrument = function (name, options) {
  var ctx = this.ctx
  name = name || 'default'
  if (name in this.instruments) return this.instruments[name]
  var inst = { name: name, play: oscillatorPlayer(ctx, options) }
  this.instruments[name] = inst
  var promise = loadBank(ctx, this.nameToUrl(name)).then(function (buffers) {
    inst.play = buffersPlayer(ctx, buffers, options)
    return inst
  })
  this.promises.push(promise)
  inst.onready = function (cb) { promise.then(cb) }
  return inst
}

Soundfont.loadBuffers = function (ctx, name) {
  var nameToUrl = Soundfont.nameToUrl || gleitzUrl
  return loadBank(ctx, nameToUrl(name))
}

/*
 * Given an instrument name returns a URL to to the Benjamin Gleitzman's
 * package of [pre-rendered sound fonts](https://github.com/gleitz/midi-js-soundfonts)
 *
 * @param {String} name - instrument name
 * @returns {String} the Soundfont file url
 */
function gleitzUrl (name) {
  return 'https://cdn.rawgit.com/gleitz/midi-js-Soundfonts/master/FluidR3_GM/' + name + '-ogg.js'
}

if (typeof module === 'object' && module.exports) module.exports = Soundfont
if (typeof window !== 'undefined') window.Soundfont = Soundfont

},{"./buffers-player":42,"./load-bank":45,"./oscillator-player":46}],45:[function(require,module,exports){
'use strict'

var midi = require('note-midi')
var decodeBuffer = require('./decode-buffer')

/**
 * Load a soundfont bank
 *
 * @param {AudioContext} ctx - the audio context object
 * @param {String} url - the url of the js file
 * @param {Function} get - (Optional) given a url return a promise with the contents
 * @param {Function} parse - (Optinal) given a js file return JSON object
 */
module.exports = function (ctx, url, get, parse) {
  get = get || getContent
  parse = parse || parseJavascript
  return Promise.resolve(url).then(get).then(parse)
    .then(function (data) {
      return { ctx: ctx, data: data, buffers: {} }
    })
    .then(decodeBank)
    .then(function (bank) { return bank.buffers })
}

function getContent (url) {
  return new Promise(function (done, reject) {
    var req = new window.XMLHttpRequest()
    req.open('GET', url)

    req.onload = function () {
      if (req.status === 200) {
        done(req.response)
      } else {
        reject(Error(req.statusText))
      }
    }
    req.onerror = function () {
      reject(Error('Network Error'))
    }
    req.send()
  })
}

/**
 *  Parse the SoundFont data and return a JSON object
 *  (SoundFont data are .js files wrapping json data)
 *
 * @param {String} data - the SoundFont js file content
 * @return {JSON} the parsed data as JSON object
 * @api private
 */
function parseJavascript (data) {
  var begin = data.indexOf('MIDI.Soundfont.')
  begin = data.indexOf('=', begin) + 2
  var end = data.lastIndexOf(',')
  return JSON.parse(data.slice(begin, end) + '}')
}

/*
 * Decode a bank
 * @param {Object} bank - the bank object
 * @return {Promise} a promise that resolves to the bank with the buffers decoded
 * @api private
 */
function decodeBank (bank) {
  var promises = Object.keys(bank.data).map(function (note) {
    return decodeBuffer(bank.ctx, bank.data[note])
    .then(function (buffer) {
      bank.buffers[midi(note)] = buffer
    })
  })

  return Promise.all(promises).then(function () {
    return bank
  })
}

},{"./decode-buffer":43,"note-midi":19}],46:[function(require,module,exports){
'use strict'

var freq = require('midi-freq')(440)
var midi = require('note-midi')

/**
 * Returns a function that plays an oscillator
 *
 * @param {AudioContext} ac - the audio context
 * @param {Hash} options - (Optional) a hash of options:
 * - vcoType: the oscillator type (default: 'sine')
 * - gain: the output gain value (default: 0.2)
 * - destination: the player destination (default: ac.destination)
 */
module.exports = function (ctx, options) {
  options = options || {}
  var destination = options.destination || ctx.destination
  var vcoType = options.vcoType || 'sine'
  var gain = options.gain || 0.2

  return function (note, time, duration) {
    var f = freq(midi(note))
    if (!f) return

    duration = duration || 0.2

    var vco = ctx.createOscillator()
    vco.type = vcoType
    vco.frequency.value = f

    /* VCA */
    var vca = ctx.createGain()
    vca.gain.value = gain

    /* Connections */
    vco.connect(vca)
    vca.connect(destination)

    vco.start(time)
    if (duration > 0) vco.stop(time + duration)
    return vco
  }
}

},{"midi-freq":4,"note-midi":19}]},{},[1]);
