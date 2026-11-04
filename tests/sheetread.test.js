const assert = require('assert');
const SR = require('../js/sheetread.js');
const P = require('./parser.js');
let n = 0; const t = (name, fn) => { try { fn(); n++; console.log('ok  ', name); } catch (e) { console.log('FAIL', name, '\n   ', e.message); process.exitCode = 1; } };

// a tiny RGBA page: paint rectangles of a colour
function page(w, h, rects) {
  const px = new Uint8ClampedArray(w * h * 4).fill(255);
  rects.forEach(([x0, y0, x1, y1, rgb]) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = (y * w + x) * 4; px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2]; }
  });
  return px;
}
const GREY = [80, 84, 96], RED = [128, 80, 80];
// a row of glyph-sized blocks, like a line of text
const glyphs = (x0, y0, y1, count, rgb) => Array.from({ length: count }, (_, i) => [x0 + i * 14, y0, x0 + i * 14 + 9, y1, rgb]);

t('colour split: pale red goes to the chord layer, grey to the other', () => {
  const L = SR.splitLayers(page(20, 10, [[1, 1, 4, 8, GREY], [10, 1, 13, 8, RED]]), 20, 10, 4);
  assert(L.dark[5 * 20 + 2] > 200 && L.red[5 * 20 + 2] === 0);
  assert(L.red[5 * 20 + 11] > 200 && L.dark[5 * 20 + 11] === 0);
  assert.strictEqual(L.dark[0], 0);
});
t('rows: a lyric row, a number row and a red row below it; a frame line does not glue them', () => {
  const rects = glyphs(10, 10, 25, 10, GREY).concat(glyphs(10, 40, 55, 10, GREY), glyphs(10, 70, 84, 3, RED), [[300, 0, 301, 99, GREY]]);
  const L = SR.splitLayers(page(320, 100, rects), 320, 100, 4);
  assert.deepStrictEqual(SR.findRows(L.dark, 320, 100).map(r => [r.y0, r.y1]), [[10, 25], [40, 55]]);
  assert.deepStrictEqual(SR.findRows(L.red, 320, 100).map(r => [r.y0, r.y1]), [[70, 84]]);
});
t('number row pieces: octave marks count per digit, an underline becomes a strum line', () => {
  // two digits 10 px wide, 16 tall; one mark after the first, two after the second; an underline under both
  const rects = [[10, 20, 19, 35, RED], [21, 20, 22, 24, RED], [30, 20, 39, 35, RED], [41, 20, 42, 24, RED], [45, 20, 46, 24, RED], [8, 38, 48, 39, RED]];
  const L = SR.splitLayers(page(60, 50, rects), 60, 50, 4);
  const r = SR.findRows(L.red, 60, 50)[0];
  const p = SR.numberPieces(L.red, 60, r);
  assert.deepStrictEqual(p.digits.map(d => d.marks), [1, 2]);
  assert.strictEqual(p.lines.length, 1);
});
t('row kinds from OCR text', () => {
  assert.strictEqual(SR.classify("3' 5'5' 6' 2\"2\""), 'melody');
  assert.strictEqual(SR.classify('ก ล ั ว ว ่ า'), 'lyric');
  assert.strictEqual(SR.classify('123 Melody, 123 Chord'), 'other');
  assert.strictEqual(SR.classify("5g’ 3'"), 'melody');            // stray letters in a number row
});
t('assemble: lyric groups claim the numbers under them, chords go to the number above', () => {
  const tok = (t, x) => ({ t, x0: x, x1: x + 9, right: x + 12 });
  const rows = [
    { kind: 'lyric', y0: 0, y1: 15, hgt: 16, groups: [{ x0: 0, x1: 30, text: 'ก' }, { x0: 60, x1: 140, text: 'ขคง' }] },
    { kind: 'melody', y0: 20, y1: 35, hgt: 16, toks: [tok("3'", 2), tok("5'", 62), tok("5'5'", 85), tok("3''", 120)] },
    { kind: 'chord', y0: 45, y1: 60, hgt: 16, toks: [Object.assign(tok('135', 0), { strum: true }), tok('6', 118)] }
  ];
  const text = SR.assemble(rows);
  assert.strictEqual(text, "ก ขคง\n3'   5' 5'5' 3''\n135~ . . 6");
  const p = P.parseSong(Object.assign(P.importText(text, {}).song, { source: 'photo' }), 'B4');
  assert.deepStrictEqual(p.issues.filter(i => i.code !== 'lyric'), []);
  const ch = p.measures[0].chords;
  assert.deepStrictEqual(ch.map(c => [c.type, c.name, !!c.strum]), [['notes', '135', true], ['bass', '6', false]]);
  assert.deepStrictEqual(p.measures[0].notes.map(x => x.midi), [76, 79, 79, 79, 88]);
});
t('strum chords in text: 135~ and 6~', () => {
  assert.strictEqual(P.parseChordToken('135~', 0).strum, true);
  assert.strictEqual(P.parseChordToken('135', 0).strum, false);
  assert.deepStrictEqual(P.parseChordToken('6~', 0).midis, [69]);
});
t('photo songs skip the bar-count warning', () => {
  const s = P.importText('1 2 3 4 5 6', {}).song;
  assert(P.parseSong(s, 'B4').issues.some(i => i.code === 'beats'));
  assert(!P.parseSong(Object.assign(s, { source: 'photo' }), 'B4').issues.some(i => i.code === 'beats'));
});
console.log(n + ' passed');
