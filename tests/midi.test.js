const assert = require('assert');
const P = require('./parser.js');
let n = 0; const t = (name, fn) => { try { fn(); n++; console.log('ok  ', name); } catch (e) { console.log('FAIL', name, '\n   ', e.message); process.exitCode = 1; } };

// ---- tiny SMF writer for the tests ----
const vlq = v => { const out = [v & 0x7f]; while ((v >>= 7)) out.unshift((v & 0x7f) | 0x80); return out; };
const be = (v, k) => Array.from({ length: k }, (_, i) => (v >> (8 * (k - 1 - i))) & 0xff);
function track(events) {               // events: [tick, bytes[]] in any order
  events.sort((a, b) => a[0] - b[0]);
  const data = []; let last = 0;
  events.forEach(([tk, bytes]) => { data.push(...vlq(tk - last), ...bytes); last = tk; });
  data.push(0, 0xff, 0x2f, 0);
  return [0x4d, 0x54, 0x72, 0x6b, ...be(data.length, 4), ...data];
}
function smf(tracks, ppq = 480, format = 1) {
  return Uint8Array.from([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, ...be(format, 2), ...be(tracks.length, 2), ...be(ppq, 2), ...tracks.flat()]);
}
const meta = (type, bytes) => [0xff, type, ...vlq(bytes.length), ...bytes];
const ascii = s => Array.from(Buffer.from(s, 'utf8'));
// notes: [[midi, startBeat, lenBeat]]; uses note-on velocity 0 as note-off and running status
function noteEvents(notes, ch = 0, ppq = 480) {
  const ev = [];
  notes.forEach(([m, s, l]) => { ev.push([Math.round(s * ppq), [0x90 | ch, m, 90]]); ev.push([Math.round((s + l) * ppq) - 1, [0x90 | ch, m, 0]]); });
  return ev;
}
const TW = [[60, 0, 1], [60, 1, 1], [67, 2, 1], [67, 3, 1], [69, 4, 1], [69, 5, 1], [67, 6, 2],
  [65, 8, 1], [65, 9, 1], [64, 10, 1], [64, 11, 1], [62, 12, 1], [62, 13, 1], [60, 14, 2]];
const twinkleNotes = (shift = 0) => TW.map(([m, s, l]) => [m + shift, s, l]);
const issues = song => P.parseSong(song, 'Bb4').issues.filter(i => i.level === 'error');

t('reads a format-0 file and keeps the melody', () => {
  const f = smf([track([[0, meta(0x51, be(600000, 3))], [0, meta(0x58, [4, 2, 24, 8])], ...noteEvents(twinkleNotes())])], 480, 0);
  const r = P.midiToSong(f, { tuning: 'Bb4' });
  assert.strictEqual(r.song.tempo, 100);
  assert.strictEqual(r.song.beats, 4);
  assert.strictEqual(r.report.shift, 0);
  assert.strictEqual(r.song.measures[0].mel, '1 1 5 5');
  assert.strictEqual(r.song.measures[1].mel, '6 6 5 -');
  assert.deepStrictEqual(issues(r.song), []);
});

t('transposes a far key onto the 13 keys', () => {
  const f = smf([track(noteEvents(twinkleNotes(6)))]);          // F# major
  const r = P.midiToSong(f, { tuning: 'Bb4' });
  assert.strictEqual(r.report.snapped, 0);
  assert.deepStrictEqual(issues(r.song), []);
  const r2 = P.midiToSong(smf([track(noteEvents(twinkleNotes(-24)))]), { tuning: 'B4' });   // two octaves low
  assert.deepStrictEqual(P.parseSong(r2.song, 'B4').issues.filter(i => i.level === 'error'), []);
  assert.strictEqual(r2.song.measures[0].mel, '1 1 5 5');
});

t('picks the melody track over bass and drums', () => {
  const bass = track([[0, meta(0x03, ascii('Bass'))], ...noteEvents(twinkleNotes().map(([m, s, l]) => [36 + (m % 12), s, l]), 1)]);
  const drums = track(noteEvents(twinkleNotes().map(([m, s, l]) => [38, s, 0.5]), 9));
  const mel = track([[0, meta(0x03, ascii('Melody'))], ...noteEvents(twinkleNotes(12), 2)]);
  const r = P.midiToSong(smf([track([[0, meta(0x51, be(500000, 3))]]), bass, drums, mel]), { tuning: 'Bb4' });
  assert.strictEqual(r.report.voice, 'Melody');
  assert(!r.voices.some(v => v.name.includes('ช่อง 10')));
  assert.strictEqual(r.song.measures[0].mel, "1' 1' 5' 5'");   // already playable an octave up: not moved
});

t('karaoke lyrics in Thai TIS-620 land on their notes', () => {
  const tis = { 'ดาว': [0xb4, 0xd2, 0xc7], 'ส่อง': [0xca, 0xe8, 0xcd, 0xa7], 'แสง': [0xe1, 0xca, 0xa7] };
  const words = ['ดาว', 'ส่อง', 'แสง', 'ดาว', 'ส่อง', 'แสง', 'ดาว', 'ส่อง', 'แสง', 'ดาว'];
  const notes = twinkleNotes();
  const lyr = track([[0, meta(0x01, ascii('@KMIDI KARAOKE FILE'))], [0, meta(0x01, ascii('@Tดาว'))],
    ...words.map((w, i) => [Math.round(notes[i][1] * 480), meta(0x01, (i === 4 ? [0x2f] : []).concat(tis[w]))])]);
  const r = P.midiToSong(smf([lyr, track(noteEvents(notes))]), { tuning: 'Bb4' });
  assert.strictEqual(r.report.lyrics, true);
  assert.strictEqual(r.song.measures[0].lyr, 'ดาว ส่อง แสง ดาว');
  const p = P.parseSong(r.song, 'Bb4');
  assert.strictEqual(p.measures[1].notes[0].lyric, 'ส่อง');
  assert.deepStrictEqual(p.issues.filter(i => i.code === 'lyric'), []);   // notes without a syllable get ~
});

t('chords in the melody keep the top note; off-key notes are snapped', () => {
  const chordy = twinkleNotes().flatMap(([m, s, l]) => [[m, s, l], [m - 12, s, l]]);
  chordy.push([66, 30, 1]);                     // F# — no key on a 13-key kalimba
  const r = P.midiToSong(smf([track(noteEvents(chordy))]), { tuning: 'B4', shift: 0 });
  assert.strictEqual(r.song.measures[0].mel, '1 1 5 5');
  assert(r.report.dropped >= 14);
  assert.strictEqual(r.report.snapped, 1);
  assert.deepStrictEqual(P.parseSong(r.song, 'B4').issues.filter(i => i.level === 'error'), []);
});

t('3/4 time signature, rests and ties across bar lines', () => {
  const notes = [[64, 0, 1], [64, 1, 3], [67, 4, 0.5], [65, 4.5, 0.5], [62, 5, 1], [60, 7, 2]];
  const f = smf([track([[0, meta(0x58, [3, 2, 24, 8])], ...noteEvents(notes)])]);
  const r = P.midiToSong(f, { tuning: 'B4', shift: 0 });
  assert.strictEqual(r.song.beats, 3);
  assert.deepStrictEqual(r.song.measures.map(m => m.mel), ['3 3 -', '- 5_4 2', '0 1 -']);
  assert.deepStrictEqual(P.parseSong(r.song, 'B4').issues, []);
});

t('rejects files that are not MIDI', () => {
  assert.throws(() => P.midiToSong(Uint8Array.from(ascii('hello world, not midi'))), /ไม่ใช่ไฟล์ MIDI/);
  assert.throws(() => P.midiToSong(smf([track(noteEvents([[38, 0, 1], [38, 1, 1]], 9))])), /ไม่พบทำนอง/);
});

t('every free song fits both tunings with full bars and no errors', () => {
  assert(P.FREE_SONGS.length >= 14);
  const ids = new Set();
  P.FREE_SONGS.forEach(f => {
    assert(!ids.has(f.id), 'duplicate ' + f.id); ids.add(f.id);
    const raw = P.importText(P.freeSongText(f), {});
    assert.deepStrictEqual(raw.msgs, [], f.id + ' ' + JSON.stringify(raw.msgs));
    const beatsWarn = P.parseSong(raw.song, 'B4').issues.filter(i => i.code === 'beats' || i.code === 'bad');
    assert.deepStrictEqual(beatsWarn, [], f.id + ' ' + JSON.stringify(beatsWarn));
    ['Bb4', 'B4'].forEach(tu => {
      const r = P.freeSong(f, tu);
      const errs = P.parseSong(r.song, tu).issues.filter(i => i.level === 'error');
      assert.deepStrictEqual(errs, [], f.id + ' ' + tu + ' ' + JSON.stringify(errs));
      assert(r.report.notes > 8);
    });
  });
});

t('refit keeps a song that already fits unchanged', () => {
  const f = P.FREE_SONGS.find(x => x.id === 'free-twinkle');
  const r = P.freeSong(f, 'Bb4');
  assert.strictEqual(r.report.shift, 0);
  assert.deepStrictEqual(r.song.measures.map(m => m.mel), f.mel.join(' | ').split(' | '));
});

console.log(n + ' passed');
