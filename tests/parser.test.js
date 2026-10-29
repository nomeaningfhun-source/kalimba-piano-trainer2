const assert = require('assert');
const P = require('./parser.js');
let n = 0; const t = (name, fn) => { try { fn(); n++; console.log('ok  ', name); } catch (e) { console.log('FAIL', name, '\n   ', e.message); process.exitCode = 1; } };

t('note tokens', () => {
  assert.deepStrictEqual(P.parseNoteToken('1').midi, 60);
  assert.strictEqual(P.parseNoteToken("2'").midi, 74);
  assert.strictEqual(P.parseNoteToken('6,').midi, 57);
  assert.strictEqual(P.parseNoteToken('b7').midi, 70);
  assert.strictEqual(P.parseNoteToken('#4').midi, 66);
  assert.strictEqual(P.parseNoteToken('0').type, 'rest');
  assert.strictEqual(P.parseNoteToken('-').type, 'hold');
  assert.strictEqual(P.parseNoteToken('8').type, 'bad');
  assert.strictEqual(P.parseNoteToken("1’").midi, 72);   // curly apostrophe
});
t('range check B4/Bb4', () => {
  assert.strictEqual(P.checkNote(60, 'Bb4'), null);
  assert.strictEqual(P.checkNote(81, 'Bb4'), null);
  assert.strictEqual(P.checkNote(70, 'Bb4'), null);
  assert.strictEqual(P.checkNote(71, 'Bb4').code, 'tuning');
  assert.strictEqual(P.checkNote(71, 'B4'), null);
  assert.strictEqual(P.checkNote(70, 'B4').code, 'tuning');
  assert.strictEqual(P.checkNote(59, 'B4').code, 'low');
  assert.strictEqual(P.checkNote(82, 'B4').code, 'high');
  assert.strictEqual(P.checkNote(66, 'B4').code, 'accidental');
});
t('all 13 keys in range for both tunings (sample 1)', () => {
  for (const tu of ['B4', 'Bb4']) {
    const r = P.importText(P.SAMPLE1, {});
    const s = P.summarize(P.parseSong(r.song, tu));
    assert.strictEqual(s.range, 0, tu + ' range ' + s.range);
    assert.strictEqual(s.errors, 0);
  }
});
t('sample 1 structure', () => {
  const r = P.importText(P.SAMPLE1, {});
  assert.strictEqual(r.song.title, 'ทวิงเคิล ทวิงเคิล');
  assert.strictEqual(r.song.tempo, 100);
  assert.strictEqual(r.song.measures.length, 8);
  assert.strictEqual(r.msgs.length, 0, JSON.stringify(r.msgs));
  const p = P.parseSong(r.song, 'B4');
  assert.strictEqual(p.issues.length, 0, JSON.stringify(p.issues));
  assert.strictEqual(p.totalBeats, 32);
  const m0 = p.measures[0];
  assert.deepStrictEqual(m0.notes.map(n => n.lyric), ['ทวิง', 'เคิล', 'ทวิง', 'เคิล']);
  assert.deepStrictEqual(m0.notes.map(n => n.midi), [60, 60, 67, 67]);
  assert.strictEqual(m0.chords.length, 1);
  assert.strictEqual(m0.chords[0].name, 'C');
  assert.strictEqual(m0.chords[0].dur, 4);
  const m1 = p.measures[1];       // 6 6 5 -  / F . C .
  assert.strictEqual(m1.notes[2].dur, 2);
  assert.deepStrictEqual(m1.chords.map(c => [c.name, c.beat, c.dur]), [['F', 0, 2], ['C', 2, 2]]);
  assert.deepStrictEqual(m1.notes.map(n => n.lyric), ['ลิต', 'เติล', 'สตาร์']);
});
t('sample 2 flags out-of-range', () => {
  const r = P.importText(P.SAMPLE2, {});
  assert.strictEqual(r.song.measures.length, 4);
  const p = P.parseSong(r.song, 'B4');
  const codes = p.issues.map(i => i.measure + ':' + i.code + ':' + i.tok);
  assert(codes.includes("0:high:7'"));
  assert(codes.includes("1:high:1''"));
  assert(codes.includes('2:low:7,'));
  assert(codes.includes('2:tuning:b7'));      // b7 with B4 tuning
  assert(codes.includes('3:accidental:#4'));
  const pb = P.parseSong(r.song, 'Bb4');
  assert(!pb.issues.some(i => i.tok === 'b7'));     // fine under Bb4
  assert(P.parseSong(P.importText('1 2 3 7', {}).song, 'Bb4').issues.some(i => i.code === 'tuning')); // plain 7 flagged under Bb4
});
t('octave suggestion', () => {
  const r = P.importText("1 3 5 7'\n", {});
  const s = P.suggestShift(r.song, 'B4');
  assert(s === null || s.left < 1);
  const r2 = P.importText("1' 2' 3' 7'\n", {});
  const s2 = P.suggestShift(r2.song, 'B4');
  assert.strictEqual(s2.shift, -1); assert.strictEqual(s2.left, 0);
});
t('auto bars + 2-line detection', () => {
  const r = P.importText("ทำ ๆ\n1 2 3 4 5 6 7 1'\n", { beats: 4 });
  assert.strictEqual(r.song.measures.length, 2);       // lyr + mel
  const r2 = P.importText("1 2 3 4 5 6 7 1'\nC F\n", { beats: 4 });
  assert.strictEqual(r2.song.measures.length, 2);
  assert.strictEqual(r2.song.measures[0].chd, 'C');
  assert.strictEqual(r2.song.measures[1].chd, 'F');
});
t('lyric mismatch warns', () => {
  const r = P.importText("a b c\n1 2 3 4 | 5 6 7 1'\n", {});
  const p = P.parseSong(r.song, 'B4');
  assert(p.issues.some(i => i.code === 'lyric'));
});
t('hold across barline + subdivisions', () => {
  const r = P.importText("1 - - - | - 2 3_4 0\n", {});
  const p = P.parseSong(r.song, 'B4');
  assert.strictEqual(p.measures[0].notes[0].dur, 5);       // 4 + 1 tie into next bar
  assert.strictEqual(p.measures[1].notes[1].dur, 0.5);
  assert.strictEqual(p.measures[1].notes[1].beat, 2);
  assert.strictEqual(p.measures[1].notes[2].beat, 2.5);
  assert.strictEqual(p.issues.length, 0, JSON.stringify(p.issues));
});
t('beat mismatch + bad token', () => {
  const r = P.importText("1 2 3 | 4 5 X 7\n", {});
  const p = P.parseSong(r.song, 'B4');
  assert(p.issues.some(i => i.code === 'beats' && i.measure === 0));
  assert(p.issues.some(i => i.code === 'bad' && i.tok === 'X'));
});
t('chords', () => {
  const c = P.parseChordToken('Am7', 0);
  assert.strictEqual(c.rootPc, 9); assert.deepStrictEqual(c.midis, [69, 72, 76, 79]);
  const g7 = P.parseChordToken('G7', 0);
  assert.deepStrictEqual(g7.midis.map(m => m - 60 - g7.rootPc), [0, 4, 7, 10]);
  const sl = P.parseChordToken('C/E', 0);
  assert.strictEqual(sl.bassPc, 4); assert.strictEqual(sl.bassMidi, 52);
  assert.strictEqual(P.parseChordToken('Bbmaj7', 0).rootPc, 10);
  assert.strictEqual(P.parseChordToken('F#m', 0).rootPc, 6);
  assert.strictEqual(P.parseChordToken("5'", 0).type, 'bass');
  assert.strictEqual(P.parseChordToken('xyz', 0).type, 'bad');
  assert.strictEqual(P.parseChordToken('.', 0).type, 'cont');
  const dm = P.parseChordToken('Dm', 0); assert.deepStrictEqual(dm.midis.map(m => m - 62), [0, 3, 7]);
  const sus = P.parseChordToken('Csus4', 0); assert.deepStrictEqual(sus.midis.map(m => m - 60), [0, 5, 7]);
});
t('chord root off-keys warns, explicit bass range checked', () => {
  const p = P.parseSong(P.importText("1 2 3 4\nC# 3\n", {}).song, 'B4');
  assert(p.issues.some(i => i.code === 'chordroot'));
  const p2 = P.parseSong(P.importText("1 2 3 4\n1 - 5, -\n", {}).song, 'B4');
  assert(p2.issues.some(i => i.level === 'error' && i.code === 'low'));
});
t('round trip text', () => {
  const r = P.importText(P.SAMPLE1, {});
  const r2 = P.importText(P.songToText(r.song), {});
  assert.deepStrictEqual(r2.song.measures, r.song.measures);
  assert.strictEqual(r2.song.title, r.song.title);
  const r3 = P.importText(P.SAMPLE2, {}); const r4 = P.importText(P.songToText(r3.song), {});
  assert.deepStrictEqual(r4.song.measures, r3.song.measures);
});
t('measure octave shift string', () => {
  assert.strictEqual(P.shiftMelodyStr("1 2' 3_4 - 0 b7", 1), "1' 2'' 3'_4' - 0 b7'");
  assert.strictEqual(P.shiftMelodyStr("1' 2", -1), "1 2,");
});
t('global shift applies', () => {
  const p = P.parseSong(P.importText("1 2 3 4\n", { octaveShift: 1 }).song, 'B4');
  assert.strictEqual(p.measures[0].notes[0].midi, 72);
});
t('labels', () => {
  assert.strictEqual(P.noteLabel(P.describe(60, false), 'thai'), 'ด');
  assert.strictEqual(P.noteLabel(P.describe(74, false), 'thai'), "ร'");
  assert.strictEqual(P.noteLabel(P.describe(70, true), 'western'), 'B♭4');
  assert.strictEqual(P.numeralLabel(P.describe(70, true)), '♭7');
  assert.strictEqual(P.numeralLabel(P.describe(61, false)), '♯1');
  assert.strictEqual(P.numeralLabel(P.describe(81, false)), "6'");
});
t('errors: empty / no melody', () => {
  assert(P.importText('', {}).msgs.some(m => m.level === 'error'));
  assert.strictEqual(P.importText('hello\nworld\nfoo\n', {}).song.measures.length, 0);
});
t('user format: Yours Ever (words / melody groups / column-aligned bass)', () => {
  const r = P.importText(P.SAMPLE_YOURS, {});
  assert.strictEqual(r.msgs.length, 0, JSON.stringify(r.msgs));
  assert.strictEqual(r.song.measures.length, 2);
  assert.strictEqual(r.song.measures[0].mel, "2' 2'2' 2' 1'");
  assert.strictEqual(r.song.measures[1].mel, "2' 2'1' 2' 3'2'1'");
  const p = P.parseSong(r.song, 'Bb4');
  assert.strictEqual(p.issues.length, 0, JSON.stringify(p.issues));
  assert.strictEqual(p.measures[0].notes.length + p.measures[1].notes.length, 12);
  assert.deepStrictEqual(p.measures[0].notes.map(n => n.dur), [1, 0.5, 0.5, 1, 1]);
  assert.deepStrictEqual(p.measures[0].notes.map(n => n.lyric), ['กิน', 'คน', 'เดียว', 'เดิน', 'คน']);
  assert.strictEqual(p.measures[0].chords[0].midi, 60);   // bass 1 under first note
  assert.strictEqual(p.measures[1].chords[0].midi, 69);   // bass 6 under last note
  assert.strictEqual(p.measures[1].chords[0].beat, 3);
});
t('adjacent notes share a beat, slash = bar', () => {
  const p = P.parseSong(P.importText("1 2'2' 3 / 4 5 6 7\n", {}).song, 'B4');
  assert.strictEqual(p.measures.length, 2);
  assert.deepStrictEqual(p.measures[0].notes.map(n => n.dur), [1, 0.5, 0.5, 1]);
  assert.strictEqual(P.parseChordToken('C/E', 0).type, 'chord');
  assert.strictEqual(P.slashToBar('1 2 / 3'), '1 2 | 3');
  assert.strictEqual(P.slashToBar('C/E G'), 'C/E G');
});
t('user Twinkle preset (slash bars)', () => {
  const r = P.importText('1 1 5 5 6 6 5 / 4 4 3 3 2 2 1', {});
  assert.strictEqual(r.song.measures.length, 2);
  assert.strictEqual(P.summarize(P.parseSong(r.song, 'B4')).errors, 0);
});
console.log(n + ' passed');
