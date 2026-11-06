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
  assert.strictEqual(P.checkNote(88, 'B4'), null);        // E6, top of 17 keys
  assert.strictEqual(P.checkNote(89, 'B4').code, 'high');
  assert.strictEqual(P.checkNote(66, 'B4').code, 'accidental');
});
t('all 17 keys in range for both tunings (sample 1)', () => {
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
  assert(!codes.some(c => c[0] === '0'));     // 7' (B5) is on the 17 keys
  assert(codes.includes("1:high:4''"));
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
  const r2 = P.importText("3' 4'' 5'' 6''\n", {});
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
t('sheet format: lyric words / melody groups / bass numbers aligned by column', () => {
  const mel = "3' 3'3'  2' 1' 3'  3'2' 1'  2'1'5";
  const text = 'ทดลองดู ร้องเพลงกัน ไปด้วยกัน ทุกคนเลย\n' + mel + '\n' + '1'.padEnd(mel.lastIndexOf("2'1'5"), ' ') + '6';
  const r = P.importText(text, {});
  assert.strictEqual(r.msgs.length, 0, JSON.stringify(r.msgs));
  assert.strictEqual(r.song.measures.length, 2);
  assert.strictEqual(r.song.measures[0].mel, "3' 3'3' 2' 1'");
  assert.strictEqual(r.song.measures[1].mel, "3' 3'2' 1' 2'1'5");
  const p = P.parseSong(r.song, 'B4');
  assert.strictEqual(p.issues.length, 0, JSON.stringify(p.issues));
  assert.strictEqual(p.measures[0].notes.length + p.measures[1].notes.length, 12);
  assert.deepStrictEqual(p.measures[0].notes.map(n => n.dur), [1, 0.5, 0.5, 1, 1]);
  assert.deepStrictEqual(p.measures[0].notes.map(n => n.lyric), ['ทด', 'ลอง', 'ดู', 'ร้อง', 'เพลง']);
  assert.strictEqual(p.measures[0].chords[0].midi, 60);   // bass 1 under the first note
  assert.strictEqual(p.measures[1].chords[0].midi, 69);   // bass 6 under the last slot
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
t('text copied from a photo of a sheet: " marks, dots, ° and l/I for 1', () => {
  assert.strictEqual(P.parseNoteToken('1"').midi, 84);
  assert.strictEqual(P.parseNoteToken('3”').midi, 88);
  assert.strictEqual(P.parseNoteToken('1″').midi, 84);
  assert.strictEqual(P.parseNoteToken('1̇').midi, 72);    // dot above
  assert.strictEqual(P.parseNoteToken('1̈').midi, 84);    // two dots above
  assert.strictEqual(P.parseNoteToken('6̣').midi, 57);    // dot below
  assert.strictEqual(P.parseNoteToken('1°').midi, 72);
  assert.strictEqual(P.parseNoteToken('l’').midi, 72);
  assert.strictEqual(P.parseNoteToken("I'").midi, 72);
  assert.strictEqual(P.parseNoteToken('l').type, 'bad');       // a lone letter stays a letter
  assert.strictEqual(P.parseChordToken('C°', 0).type, 'chord'); // dim chords untouched
  assert.strictEqual(P.parseChordToken('Bb', 0).type, 'chord');
  const m = P.parseMelody('3’2”2”3” l’1’2’', 0, null);
  assert.strictEqual(m.issues.length, 0, JSON.stringify(m.issues));
  assert.deepStrictEqual(m.notes.map(x => x.midi), [76, 86, 86, 88, 72, 72, 74]);
});
t('kalimba-sheet chords: tine numbers written together', () => {
  const c = P.parseChordToken('135', 0);
  assert.strictEqual(c.type, 'notes');
  assert.deepStrictEqual(c.midis, [60, 64, 67]);
  assert.deepStrictEqual(P.parseChordToken("2'4'", 0).midis, [74, 77]);
  assert.strictEqual(P.parseChordToken('6', 0).type, 'bass');
  assert.strictEqual(P.parseChordToken('105', 0).type, 'bad');
  const r = P.importText("ก ข ค ง | จ ฉ ช ซ ฌ ญ\n3’ 5’ 5’ 6’ | 3’ 5’5’ 3’ 5’5’\n135 . . . | 357 . 6 .", {});
  assert.strictEqual(r.msgs.length, 0, JSON.stringify(r.msgs));
  const p = P.parseSong(r.song, 'B4');
  assert.strictEqual(p.issues.length, 0, JSON.stringify(p.issues));
  assert.deepStrictEqual(p.measures[1].chords.map(x => [x.type, x.name, x.beat]), [['notes', '357', 0], ['bass', '6', 2]]);
  const bad = P.parseSong(r.song, 'Bb4').issues.map(i => i.code + ':' + i.tok);
  assert(bad.includes('tuning:357'), JSON.stringify(bad));      // B4 tine is Bb4 on that tuning
});
t('retuned tines: #4 plays once the F4 tine is tuned up, and plain 4 then warns', () => {
  const r = P.importText("3 #4 5 4", {});
  const std = P.parseSong(r.song, 'B4').issues.map(i => i.code + ':' + i.tok);
  assert(std.includes('accidental:#4'));
  const tuned = P.parseSong(r.song, 'B4 65+1').issues.map(i => i.code + ':' + i.tok);
  assert(!tuned.some(c => c.endsWith('#4')));
  assert(tuned.includes('tuning:4'), JSON.stringify(tuned));
  assert(P.keySet('B4 65+1 83-1').has(66) && P.keySet('B4 65+1 83-1').has(82) && !P.keySet('B4 65+1 83-1').has(83));
  assert.strictEqual(P.checkNote(65, 'B4 65+1').msg, 'F4 ไม่มีบนเครื่อง (ก้านนี้จูนเป็น F♯4 อยู่)');
});
t('Thai words sung over several notes split into syllables', () => {
  const cases = { 'เสมอ': 'ส|เมอ', 'ตลอด': 'ต|ลอด', 'พยายาม': 'พ|ยา|ยาม', 'สนุก': 'ส|นุก', 'บังเอิญ': 'บัง|เอิญ', 'เกรงใจ': 'เกรง|ใจ',
    'จริง': 'จริง', 'ความ': 'ความ', 'หน้า': 'หน้า', 'อยู่': 'อยู่', 'เปลี่ยน': 'เปลี่ยน', 'ทั้งหมด': 'ทั้ง|หมด', 'ทรงจำ': 'ทรง|จำ',
    'จะทวงชีวิต': 'จะ|ทวง|ชี|วิต', 'ของเธอ': 'ของ|เธอ', 'เท่าไร': 'เท่า|ไร', 'ร่วงโรยรา': 'ร่วง|โรย|รา', 'กลัว': 'กลัว', 'ถนน': 'ถ|นน', 'เวลา': 'เว|ลา', 'เฉพาะ': 'ฉ|เพาะ', 'แสดง': 'ส|แดง' };
  Object.keys(cases).forEach(w => assert.strictEqual(P.thaiSyllables(w).join('|'), cases[w], w));
  assert.strictEqual(P.splitSyllables(['อยู่', 'เสมอ', 'ตลอด', 'ไป'], 6).join('|'), 'อยู่|ส|เมอ|ต|ลอด|ไป');
  assert.strictEqual(P.splitSyllables(['พยายาม'], 2).join('|'), 'พยา|ยาม');       // fewer notes: merge back
  assert.strictEqual(P.lyricsByGroups(['เสมอ', 'สนุก'], [2, 2]).join('|'), 'ส|เมอ|ส|นุก');
  assert.strictEqual(P.lyricsByGroups(['เสมอ'], [1]).join('|'), 'เสมอ');
  // the 3-line importer gives each note its syllable
  const p = P.parseSong(P.importText('เสมอ ตลอด\n1 2   3 4', {}).song, 'B4');
  assert.deepStrictEqual(p.measures[0].notes.map(x => x.lyric), ['ส', 'เมอ', 'ต', 'ลอด']);
});
t('rhythm edits: join / split / rest / hold', () => {
  // mirrors app.js melSlots: single notes are sep "_", adjacent 2'2' is sep ""
  const mk = (...a) => a.map(x => Array.isArray(x) ? { subs: x, sep: '' } : { subs: [x], sep: '_' });
  const str = sl => sl.map(x => x.subs.join(x.sep)).join(' ');
  const beats = s => Math.round(Math.max(...P.parseMelody(s, 0).items.map(it => it.beat + it.dur)) * 1000) / 1000;
  // 6' 3' 5' 5'  ->  join last two: 6' 3' 5'5'  (4 notes in 3 beats)
  let sl = mk("6'", "3'", "5'", "5'");
  assert.strictEqual(P.melRhythm(sl, 2, 0, 'rj'), 0);
  assert.strictEqual(str(sl), "6' 3' 5'5'");
  assert.strictEqual(beats(str(sl)), 3);
  // and split it again
  assert.strictEqual(P.melRhythm(sl, 2, 0, 'rj'), 0);
  assert.strictEqual(str(sl), "6' 3' 5' 5'");
  // last note of the line has nothing to join
  assert.strictEqual(P.melRhythm(sl, 3, 0, 'rj'), null);
  // an explicit 1_2 beat stays underscored when joined
  sl = [{ subs: ['1', '2'], sep: '_' }, { subs: ['3'], sep: '_' }];
  P.melRhythm(sl, 0, 1, 'rj'); assert.strictEqual(str(sl), '1_2_3');
  // rests: before moves the chip index by one, after does not
  sl = mk('1', '2');
  assert.strictEqual(P.melRhythm(sl, 1, 0, 'rb'), 1); assert.strictEqual(str(sl), '1 0 2');
  assert.strictEqual(P.melRhythm(sl, 0, 0, 'ra'), 0); assert.strictEqual(str(sl), '1 0 0 2');
  assert.strictEqual(beats(str(sl)), 4);
  // hold: only on the last note of its beat, adds one beat
  sl = mk('3', '5');
  assert.strictEqual(P.melRhythm(sl, 0, 0, 'rh'), 0); assert.strictEqual(str(sl), '3 - 5');
  assert.strictEqual(beats(str(sl)), 3);
  sl = mk(['1', '2']);
  assert.strictEqual(P.melRhythm(sl, 0, 0, 'rh'), null);
  // joining a hold into a beat keeps it underscored (adjacent "5-" would not parse)
  sl = [{ subs: ['5'], sep: '_' }, { subs: ['-'], sep: '_' }];
  P.melRhythm(sl, 0, 0, 'rj'); assert.strictEqual(str(sl), '5_-');
});
t('line gap: beats of rest before a measure that starts a new line', () => {
  const song = { beats: 4, measures: [{ mel: '1 2 3 4', br: true }, { mel: '5 6 7 1', br: true, gap: 2 }, { mel: '2 3 4 5', br: false, gap: 3 }] };
  const p = P.parseSong(song, 'B4');
  assert.deepStrictEqual(p.measures.map(m => m.start), [0, 6, 10]);   // 4 + 2 gap; gap ignored without br
  assert.deepStrictEqual(p.measures.map(m => m.gap), [0, 2, 0]);
  assert.strictEqual(p.totalBeats, 14);
  // first measure and over-large gaps are clamped / ignored
  assert.strictEqual(P.parseSong({ beats: 4, measures: [{ mel: '1', br: true, gap: 2 }, { mel: '2', br: true, gap: 9 }] }, 'B4').measures[1].start, 1 + 4);
  // a hold at the top of a gapped line does not stretch the note before the gap
  const h = P.parseSong({ beats: 4, measures: [{ mel: '1', br: true }, { mel: '- 2', br: true, gap: 1 }] }, 'B4');
  assert.strictEqual(h.measures[0].notes[0].dur, 1);
});
t('a new line pauses only when its gap is set (default none)', () => {
  const ms = [{ mel: '1 2 3 4', br: true }, { mel: '5 6 7 1', br: true }, { mel: '2 3 4 5', br: true, gap: 0.5 }, { mel: '1 1 1 1' }];
  for (const source of ['photo', undefined]) {
    const p = P.parseSong({ beats: 4, source, measures: ms }, 'B4');
    assert.deepStrictEqual(p.measures.map(m => m.gap), [0, 0, 0.5, 0]);
    assert.deepStrictEqual(p.measures.map(m => m.start), [0, 4, 8.5, 12.5]);
  }
});
t('tight numbers are eighth notes (half a beat each); 1_2_3 still fits one beat; chords follow their written beat', () => {
  const m = P.parseMelody("4'3'2' 2' 6'", 0);
  assert.deepStrictEqual(m.notes.map(n => [n.beat, n.dur]), [[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 1], [2.5, 1]]);
  assert.strictEqual(m.end, 3.5); assert.strictEqual(m.slots, 3);
  assert.strictEqual(P.parseMelody('1_2_3 5', 0).notes[2].dur.toFixed(3), '0.333');
  assert.strictEqual(P.parseMelody("2'2' 1'", 0).end, 2);                       // a pair is still one beat
  const pm = P.parseSong({ beats: 4, source: 'photo', measures: [{ mel: "1'2'3' 5 6", chd: 'C . G' }, { mel: '1' }] }, 'B4');
  assert.deepStrictEqual(pm.measures[0].chords.map(c => c.beat), [0, 2.5]);     // G sits under the 3rd written beat (6)
  assert.strictEqual(pm.measures[1].start, 3.5);
});
t('photo sheets: a lone 0 is half a beat (typed songs keep a full beat)', () => {
  const ph = P.parseSong({ beats: 4, source: 'photo', measures: [{ mel: "5' 0 4'3'2' 0 2'" }] }, 'B4').measures[0];
  assert.deepStrictEqual(ph.items.filter(i => i.type === 'rest').map(i => i.dur), [0.5, 0.5]);
  assert.strictEqual(ph.len, 1 + 0.5 + 1.5 + 0.5 + 1);
  assert.strictEqual(P.parseSong({ beats: 4, measures: [{ mel: '1 0 2' }] }, 'B4').measures[0].len, 3);
});
t('~ is half a beat of the note before it (photo reader), - a full beat', () => {
  const m = P.parseMelody("5' ~ 3' - 2'", 0);
  assert.deepStrictEqual(m.notes.map(n => [n.beat, n.dur]), [[0, 1.5], [1.5, 2], [3.5, 1]]);
  assert.strictEqual(m.end, 4.5);
  assert.strictEqual(P.parseNoteToken('~').type, 'hold');
});
console.log(n + ' passed');
