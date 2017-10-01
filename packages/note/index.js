/**
 * [![npm version](https://img.shields.io/npm/v/tonal-note.svg)](https://www.npmjs.com/package/tonal-note)
 * [![tonal](https://img.shields.io/badge/tonal-note-yellow.svg)](https://www.npmjs.com/browse/keyword/tonal)
 *
 * `tonal-note` is a collection of functions to manipulate musical notes in scientific notation
 *
 * This is part of [tonal](https://www.npmjs.com/package/tonal) music theory library.
 *
 * ## Usage
 *
 * ```js
 * import * as note from 'tonal-note'
 * // or const note = require('tonal-note')
 * note.name('bb2') // => 'Bb2'
 * note.chroma('bb2') // => 10
 * note.midi('a4') // => 69
 * note.freq('a4') // => 440
 * note.oct('G3') // => 3
 * 
 * // part of tonal
 * const tonal = require('tonal')
 * tonal.note.midi('d4') // => 62
 * ```
 *
 * ## Install
 *
 * [![npm install tonal-note](https://nodei.co/npm/tonal-note.png?mini=true)](https://npmjs.org/package/tonal-note/)
 *
 * ## API Documentation
 *
 * @module note
 */

const NAMES = "C C# Db D D# Eb E F F# Gb G G# Ab A A# Bb B".split(" ");
const GROUPED = "C C#/Db D D#/Eb E F F#/Gb G G#/Ab A A#/Bb B".split(" ");
const FLATS = "C Db D Eb E F Gb G Ab A Bb B".split(" ");
const SHARPS = "C C# D D# E F F# G G# A A# B".split(" ");

/**
 * Get a list of note names (pitch classes) within a octave
 * @param {boolean} sharps - true to use sharps, flats otherwise
 * @return {Array}
 * @example
 * note.names() // => [ 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B' ]
 * note.names(true) // => [ 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B' ]
 */
export const names = sharps => (sharps ? SHARPS : FLATS).slice();

/**
 * Get a list of names with enharmonics
 * @param {boolean} grouped 
 * @return {Array} an array of names
 * @example
 * note.namesEnh() // => ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B']
 * note.namesEnh(true) // => [ 'C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B' ]
 */
export const namesEnh = grouped => (grouped ? GROUPED : NAMES).slice();

const REGEX = /^([a-gA-G]?)(#{1,}|b{1,}|x{1,}|)(-?\d*)\s*(.*)$/;

/**
 * Split a string into tokens related to note parts. 
 * It returns an array of strings `[letter, accidental, octave, modifier]` 
 * 
 * It always returns an array
 * 
 * @param {String} str 
 * @return {Array} an array of note tokens
 * @example
 * note.tokenize('C#2') // => ["C", "#", "2", ""]
 * note.tokenize('Db3 major') // => ["D", "b", "3", "major"]
 * note.tokenize('major') // => ["", "", "", "major"]
 * note.tokenize('##') // => ["", "##", "", ""]
 * note.tokenize() // => ["", "", "", ""]
 */
export function tokenize(str) {
  if (typeof str !== "string") str = "";
  const m = REGEX.exec(str);
  if (!m) return null;
  return [m[1].toUpperCase(), m[2].replace(/x/g, "##"), m[3], m[4]];
}

const NO_NOTE = Object.freeze({
  pc: null,
  name: null,
  step: null,
  alt: null,
  oct: null,
  chroma: null,
  midi: null,
  freq: null
});

const SEMI = [0, 2, 4, 5, 7, 9, 11];
const properties = str => {
  const tokens = tokenize(str);
  if (tokens[0] === "" || tokens[3] !== "") return NO_NOTE;
  const [letter, acc, oct] = tokens;
  const p = { letter, acc };
  p.pc = p.letter + p.acc;
  p.name = p.pc + oct;
  p.step = (p.letter.charCodeAt(0) + 3) % 7;
  p.alt = p.acc[0] === "b" ? -p.acc.length : p.acc.length;
  p.oct = oct.length ? +oct : null;
  p.chroma = (SEMI[p.step] + p.alt + 120) % 12;
  p.midi = p.oct !== null ? SEMI[p.step] + p.alt + 12 * (p.oct + 1) : null;
  p.freq = midiToFreq(p.midi);
  return Object.freeze(p);
};

const memo = (fn, cache = {}) => str => cache[str] || (cache[str] = fn(str));

/**
 * Get note properties. It returns an object with the following information:
 * 
 * - name {String}: the note name. The letter is always in uppercase
 * - letter {String}: the note letter, always in uppercase
 * - acc {String}: the note accidentals
 * - octave {Number}: the octave or null if not present
 * - pc {String}: the pitch class (letter + accidentals)
 * - step {Number}: number equivalent of the note letter. 0 means C ... 6 means B.
 * - alt {Number}: number equivalent of accidentals (negative are flats, positive sharps)
 * - chroma {Number}: number equivalent of the pitch class, where 0 is C, 1 is C# or Db, 2 is D...
 * - midi {Number}: the note midi number
 * - freq {Number}: the frequency using an equal temperament at 440Hz
 * 
 * This function *always* returns an object with all this properties, but if it's
 * not a valid note all properties will be null.
 * 
 * The returned object can't be mutated.
 * 
 * @param {String} note - the note name in scientific notation
 * @return {Object} an object with the properties (or an object will all properties
 * set to null if not valid note)
 * @example
 * note.props('fx-3').name // => 'F##-3'
 * note.props('invalid').name // => null
 * note.props('C#3').oct // => 3
 * note.props().oct // => null
 */
export const props = memo(properties);

/**
 * Given a note name, return the note name or null if not valid note.
 * The note name will ALWAYS have the letter in upercase and accidentals
 * using # or b
 * 
 * Can be used to test if a string is a valid note name.
 *
 * @function
 * @param {Pitch|string}
 * @return {string}
 *
 * @example
 * const note = require('tonal-note')
 * note.name('cb2') // => 'Cb2'
 * ['c', 'db3', '2', 'g+', 'gx4'].map(note.name) // => ['C', 'Db3', null, null, 'G##4']
 */
export const name = str => props(str).name;

/**
 * Get pitch class of a note. The note can be a string or a pitch array.
 *
 * @function
 * @param {string|Pitch}
 * @return {string} the pitch class
 * @example
 * tonal.pc('Db3') // => 'Db'
 * tonal.map(tonal.pc, 'db3 bb6 fx2') // => [ 'Db', 'Bb', 'F##']
 */
export const pc = str => props(str).pc;

/**
 * Get the note midi number
 * (an alias of tonal-midi `toMidi` function)
 *
 * @function
 * @param {string|Number} note - the note to get the midi number from
 * @return {Integer} the midi number or null if not valid pitch
 * @example
 * note.midi('C4') // => 60
 * note.midi(60) // => 60
 * @see midi.toMidi
 */
export const midi = note => props(note).midi || +note || null;

/**
 * Get the frequency from midi number
 * 
 * @param {Number} midi - the note midi number
 * @param {Number} tuning - (Optional) 440 by default
 * @return {Number} the frequency or null if not valid note midi
 */
export const midiToFreq = (midi, tuning = 440) =>
  typeof midi === "number" ? Math.pow(2, (midi - 69) / 12) * tuning : null;

/**
 * Get the frequency of a note
 *
 * @function
 * @param {string|Number} note - the note name or midi note number
 * @return {Number} the frequency
 * @example
 * note.freq('A4') // => 440
 * note.freq(69) // => 440
 */
export const freq = note => props(note).freq || midiToFreq(note);

const L2 = Math.log(2);
const L440 = Math.log(440);
/**
 * Get the midi number from a frequency in hertz. The midi number can
 * contain decimals (with two digits precission)
 * 
 * @param {Number} frequency
 * @return {Number}
 * @example
 * note.freqToMidi(220)); //=> 57;
 * note.freqToMidi(261.62)); //=> 60;
 * note.freqToMidi(261)); //=> 59.96;
 */
export const freqToMidi = freq => {
  const v = 12 * (Math.log(freq) - L440) / L2 + 69;
  return Math.round(v * 100) / 100;
};

/**
 * Return the chroma of a note. The chroma is the numeric equivalent to the
 * pitch class, where 0 is C, 1 is C# or Db, 2 is D... 11 is B
 *
 * @param {string} note - the note name
 * @return {Integer} the chroma number
 * @example
 * const note = require('tonal-note')
 * note.chroma('Cb') // => 11
 * ['C', 'D', 'E', 'F'].map(note.chroma) // => [0, 2, 4, 5]
 */
export const chroma = str => props(str).chroma;

/**
 * Get the octave of the given pitch
 *
 * @function
 * @param {string} note - the note
 * @return {Integer} the octave or null if doesn't have an octave or not a valid note
 * @example
 * note.oct('C#4') // => 4
 * note.oct('C') // => null
 * note.oct('blah') // => undefined
 */
export const oct = str => props(str).oct;

const LETTERS = "CDEFGAB";
/**
 * Given a step number return it's letter (0 = C, 1 = D, 2 = E)
 * @param {number} step 
 * @return {string} the letter
 * @example
 * note.stepToLetter(3) // => "F"
 */
export const stepToLetter = step => LETTERS[step];

const fillStr = (s, n) => Array(n + 1).join(s);
const numToStr = (num, op) => (typeof num !== "number" ? "" : op(num));

/**
 * Given an alteration number, return the accidentals
 * @param {Number} alt 
 * @return {String}
 * @example
 * note.altToAcc(-3) // => 'bbb'
 */
export const altToAcc = alt =>
  numToStr(alt, alt => (alt < 0 ? fillStr("b", -alt) : fillStr("#", alt)));

/**
 * Build a note name in scientific notation from note properties.
 * It receives an object with:
 * - step: the note step (0 = C, 1 = D, ... 6 = B)
 * - alt: (optional) the alteration. Negative numbers are flats, positive sharps
 * - oct: (optional) the octave
 * @param {Object} props - the note properties
 * @return {String} the note name in scientific notation or null if not valid properties
 * @example
 * note.build({ step: 5 }) // => "A"
 * note.build({ step: 1, acc: -1 }) // => 'Db'
 * note.build({ step: 2, acc: 2, oct: 2 }) // => 'E##2'
 * note.build({ step: 7 }) // => null
 */
export const build = ({ step, alt, oct } = {}) => {
  const letter = stepToLetter(step);
  if (!letter) return null;
  const pc = letter + altToAcc(alt);
  return oct || oct === 0 ? pc + oct : pc;
};

/**
 * Given a midi number, returns a note name. The altered notes will have
 * flats unless explicitly set with the optional `useSharps` parameter.
 *
 * @function
 * @param {number} midi - the midi note number
 * @param [boolean] useSharps - (Optional) set to true to use sharps instead of flats
 * @return {string} the note name
 * @example
 * const note = require('tonal-note')
 * note.fromMidi(61) // => 'Db4'
 * note.fromMidi(61, true) // => 'C#4'
 * // it rounds to nearest note
 * note.fromMidi(61.7) // => 'D4'
 */
export function fromMidi(num, sharps) {
  num = Math.round(num);
  const pcs = sharps === true ? SHARPS : FLATS;
  const pc = pcs[num % 12];
  const o = Math.floor(num / 12) - 1;
  return pc + o;
}