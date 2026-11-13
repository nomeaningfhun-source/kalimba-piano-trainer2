// Pure music code shared by the app and the node tests (tests/run.sh extracts the marked blocks).
'use strict';

/* @@PARSER-START — pure music theory + notation parser (no DOM) */

const KALIMBA17 = [86, 83, 79, 76, 72, 69, 65, 62, 60, 64, 67, 71, 74, 77, 81, 84, 88];   // D6 B5 G5 E5 C5 A4 F4 D4 | C4 | E4 G4 B4 D5 F5 A5 C6 E6
const SORTED17 = KALIMBA17.slice().sort((a, b) => a - b);
const KEY_MIN = SORTED17[0];                       // 60  C4
const KEY_MAX = SORTED17[SORTED17.length - 1];     // 88  E6
const THAI_DEGREES = ['ด', 'ร', 'ม', 'ฟ', 'ซ', 'ล', 'ท'];
const NOTE_WEST = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SEMI = [null, 0, 2, 4, 5, 7, 9, 11];
const PC_TABLE = [[1, 0], [1, 1], [2, 0], [2, 1], [3, 0], [4, 0], [4, 1], [5, 0], [5, 1], [6, 0], [6, 1], [7, 0]];
const ROOT_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function describe(midi, flat) {
  const pc = ((midi % 12) + 12) % 12, oct = Math.floor(midi / 12) - 1;
  let deg = PC_TABLE[pc][0], acc = PC_TABLE[pc][1];
  if (acc === 1 && flat) { deg += 1; acc = -1; }
  return { midi, deg, acc, oct, rel: oct - 4 };
}
const octMarks = rel => (rel > 0 ? "'".repeat(rel) : rel < 0 ? ','.repeat(-rel) : '');
const accSym = acc => (acc > 0 ? '♯' : acc < 0 ? '♭' : '');
const numeralLabel = d => accSym(d.acc) + d.deg + octMarks(d.rel);
function noteLabel(d, system) {
  const a = accSym(d.acc);
  if (system === 'western') return NOTE_WEST[d.deg - 1] + a + d.oct;
  if (system === 'number') return a + d.deg + octMarks(d.rel);
  return THAI_DEGREES[d.deg - 1] + a + octMarks(d.rel);
}

// a tuning is 'B4' (standard C) or 'Bb4', optionally followed by tines retuned a half step,
// e.g. 'B4 65+1 77-1' = the F4 tine tuned up to F#4 and the F5 tine down to E5
function retunes(tuning) {
  const out = {};
  String(tuning || '').trim().split(/\s+/).slice(1).forEach(t => { const m = /^(\d+)([+-]1)$/.exec(t); if (m) out[+m[1]] = +m[2]; });
  return out;
}
const tuningBase = tuning => String(tuning || 'B4').trim().split(/\s+/)[0];

// keys that physically exist on the 17-key kalimba for a tuning
function keySet(tuning) {
  const base = tuningBase(tuning), rt = retunes(tuning);
  return new Set(KALIMBA17.map(m => (m === 71 && base === 'Bb4' ? 70 : m) + (rt[m] || 0)));
}

function checkNote(midi, tuning) {
  if (keySet(tuning).has(midi)) return null;
  const nm = noteLabel(describe(midi, midi === 70), 'western'), base = tuningBase(tuning), rt = retunes(tuning);
  if (midi < KEY_MIN) return { code: 'low', msg: nm + ' ต่ำกว่า C4 (เกินช่วง 17 คีย์)' };
  if (midi > KEY_MAX) return { code: 'high', msg: nm + ' สูงกว่า E6 (เกินช่วง 17 คีย์)' };
  if (rt[midi]) return { code: 'tuning', msg: nm + ' ไม่มีบนเครื่อง (ก้านนี้จูนเป็น ' + noteLabel(describe(midi + rt[midi], rt[midi] < 0), 'western') + ' อยู่)' };
  if (midi === 71 && base === 'Bb4') return { code: 'tuning', msg: 'B4 ไม่มีบนเครื่อง (จูน B♭4 อยู่)' };
  if (midi === 70 && base === 'B4') return { code: 'tuning', msg: 'B♭4 ไม่มีบนเครื่อง (จูนก้าน 7 เป็น ♭7 ได้ในตั้งค่า)' };
  return { code: 'accidental', msg: nm + ' ไม่มีคีย์ (จูนก้านเป็นชาร์ป/แฟลตได้ในตั้งค่า)' };
}

// also undoes what text copied from a photo of a sheet tends to contain:
// " ” ″ / a dot or two above = 1-2 octaves up, a dot below = 1 down, 1° = 1', and l / I misread for 1
function normTok(t) {
  let s = String(t).replace(/[’′ʼ´`‘]/g, "'").replace(/["”“″]/g, "''")
    .replace(/̈/g, "''").replace(/̇/g, "'").replace(/̤/g, ',,').replace(/̣/g, ',')
    .replace(/([0-7])°/g, "$1'")
    .replace(/[–—−]/g, '-').replace(/♯/g, '#').replace(/♭/g, 'b');
  if (/^[#b0-7lI',_-]+$/.test(s) && /[0-7']/.test(s)) s = s.replace(/[lI]/g, '1');
  return s;
}

const NOTE_RE = /^([#b]?)([0-7])('{0,3}|,{0,3})$/;
function parseNoteToken(raw) {
  const tok = normTok(raw);
  if (tok === '-') return { type: 'hold' };
  if (tok === '~') return { type: 'hold', half: true };   // half a beat of the note before (written by the photo reader)
  const m = NOTE_RE.exec(tok);
  if (!m) return { type: 'bad' };
  const deg = +m[2];
  if (deg === 0) return m[1] || m[3] ? { type: 'bad' } : { type: 'rest' };
  const acc = m[1] === '#' ? 1 : m[1] === 'b' ? -1 : 0;
  const oct = m[3] ? (m[3][0] === "'" ? m[3].length : -m[3].length) : 0;
  return { type: 'note', deg, acc, oct, midi: 60 + SEMI[deg] + acc + 12 * oct };
}

function parseMelody(str, shift, prev, even) {
  const items = [], notes = [], issues = [];
  const slots = String(str || '').trim().split(/\s+/).filter(Boolean);
  let pos = 0, last = slots.length ? (prev || null) : null;
  const starts = [];
  for (const slot of slots) {
    starts.push(pos);
    let subs = slot.split('_').filter(Boolean), tight = false;
    if (subs.length === 1) {
      // adjacent notes without a space (e.g. 2'2' or 3'2'1') share one beat
      const t = normTok(subs[0]), parts = t.match(/[#b]?[0-7](?:'{1,3}|,{1,3})?/g);
      if (parts && parts.length > 1 && parts.join('') === t) { subs = parts; tight = true; }
    }
    if (!subs.length) { pos += 1; continue; }
    // numbers written tight together (2'2', 4'3'2') are eighth notes, half a beat each; 1_2_3 squeezes its notes into one beat
    // a lone 0 lasts restBeat (photo sheets: half a beat, since their blanks are only the typist's spacing)
    const one = subs.length === 1 ? parseNoteToken(subs[0]) : null;
    // even (songs read from a photo): every written number is one whole beat, tight or not, so the pulse stays steady
    const d0 = tight ? (even ? 1 : 0.5) : one && one.half ? (even ? 1 : 0.5) : 1 / subs.length;   // photo songs: an old half-beat hold ~ is a whole beat
    // an odd run of tight notes (4'3'2') would end in the middle of a beat: its last note takes the whole beat, so what follows stays on the beat
    const lastWhole = !even && tight && subs.length % 2 === 1;
    for (let si = 0; si < subs.length; si++) {
      const sub = subs[si], d = lastWhole && si === subs.length - 1 ? 1 : d0;
      const t = parseNoteToken(sub);
      if (t.type === 'note') {
        const n = { type: 'note', beat: pos, dur: d, midi: t.midi + 12 * shift, tok: normTok(sub), lyric: '' };
        items.push(n); notes.push(n); last = n;
      } else if (t.type === 'rest') {
        items.push({ type: 'rest', beat: pos, dur: d, tok: '0' }); last = null;
      } else if (t.type === 'hold') {
        if (last) last.dur += d; else issues.push({ level: 'warn', code: 'hold', tok: '-', msg: '"-" ไม่มีโน้ตให้ต่อเสียง' });
        items.push({ type: 'hold', beat: pos, dur: d, tok: t.half ? '~' : '-' });
      } else {
        issues.push({ level: 'error', code: 'bad', tok: sub, msg: 'อ่าน "' + sub + '" ไม่ได้' });
        items.push({ type: 'bad', beat: pos, dur: d, tok: sub }); last = null;
      }
      pos += d;
    }
  }
  return { items, notes, slots: slots.length, starts, end: pos, tail: last, issues };
}

// Rhythm edits on a melody given as slots [{subs, sep}] (a slot = one beat; sep '' = written 2'2', '_' = 1_2).
// si/k = slot and position of the note being fixed. Acts: 'rj' join with / split from the next note,
// 'rb' / 'ra' a one-beat rest before / after the beat, 'rh' hold the note one more beat.
// Returns how far the note's chip index moves (0 or 1), or null when the edit does not apply.
function melRhythm(slots, si, k, act) {
  const s = slots[si];
  if (!s || k < 0 || k >= s.subs.length) return null;
  const plain = t => { const p = parseNoteToken(t).type; return p === 'note' || p === 'rest'; };
  if (act === 'rj') {
    if (k < s.subs.length - 1) {                         // same beat as the next note -> give it its own beat
      slots.splice(si + 1, 0, { subs: s.subs.splice(k + 1), sep: s.sep });
      return 0;
    }
    const nx = slots[si + 1];                            // last in its beat -> share the next beat
    if (!nx) return null;
    const under = [s, nx].some(x => x.subs.length > 1 && x.sep === '_');
    s.subs.push(...nx.subs); slots.splice(si + 1, 1);
    s.sep = !under && s.subs.every(plain) ? '' : '_';
    return 0;
  }
  // photo songs: holds instead of rests. 'ha' = this note keeps sounding one more beat, 'hb' = the note before it does
  // (a note inside a tight run first gets a beat of its own, so the hold lands between the right two notes)
  if (act === 'ha' || act === 'hb') {
    const hold = { subs: ['-'], sep: '_' };
    if (act === 'ha') {
      if (k < s.subs.length - 1) slots.splice(si + 1, 0, { subs: s.subs.splice(k + 1), sep: s.sep });
      slots.splice(si + 1, 0, hold);
    } else if (k > 0) {
      slots.splice(si + 1, 0, { subs: s.subs.splice(k), sep: s.sep });
      slots.splice(si + 1, 0, hold);
    } else slots.splice(si, 0, hold);
    return 0;
  }
  // 'hx': take away a hold right after this note, or right before it (the one 'hb' of the next note added)
  if (act === 'hx') {
    const isHold = x => !!x && x.subs.length === 1 && (x.subs[0] === '-' || x.subs[0] === '~');
    if (k === s.subs.length - 1 && isHold(slots[si + 1])) { slots.splice(si + 1, 1); return 0; }
    if (k === 0 && si > 0 && isHold(slots[si - 1])) { slots.splice(si - 1, 1); return 0; }
    return null;
  }
  if (act === 'rb') { slots.splice(si, 0, { subs: ['0'], sep: '_' }); return 1; }
  if (act === 'ra') { slots.splice(si + 1, 0, { subs: ['0'], sep: '_' }); return 0; }
  if (act === 'rh') {
    if (k !== s.subs.length - 1) return null;            // a hold lengthens the last note of its beat
    slots.splice(si + 1, 0, { subs: ['-'], sep: '_' });
    return 0;
  }
  return null;
}

const CHORD_RE = /^([A-G])([#b]?)([^\/]*)(?:\/(.+))?$/;
function chordIntervals(q) {
  const minor = /^(m(?!aj)|min|-)/.test(q), dim = /^(dim|°)/.test(q), aug = /^(aug|\+)/.test(q);
  const third = minor || dim ? 3 : 4;
  let fifth = dim ? 6 : aug ? 8 : 7;
  if (/b5/.test(q)) fifth = 6;
  const iv = /sus2/.test(q) ? [0, 2, fifth] : /sus/.test(q) ? [0, 5, fifth] : [0, third, fifth];
  if (/maj7|M7|Δ/.test(q)) iv.push(11);
  else if (/dim7/.test(q)) iv.push(9);
  else if (/(^|[^d])(7|9|11|13)/.test(q.replace(/add\d+/g, ''))) iv.push(10);
  if (/9/.test(q)) iv.push(14);
  if (/6/.test(q) && !/dim7/.test(q)) iv.push(9);
  return iv;
}
function parseChordToken(raw, shift) {
  const tok = normTok(raw);
  if (/^[.%_-]$/.test(tok)) return { type: 'cont' };
  if (tok === '0' || /^N\.?C\.?$/i.test(tok)) return { type: 'none' };
  const nt = parseNoteToken(tok);
  if (nt.type === 'note') return { type: 'bass', name: tok, midi: nt.midi + 12 * shift };
  // kalimba-sheet chord: tine numbers written together (135 = pluck 1, 3 and 5 at once); 135~ = strum them
  const strum = /^[^~]+~$/.test(tok), nums = strum ? tok.slice(0, -1) : tok;
  const parts = nums.match(/[#b]?[1-7](?:'{1,3}|,{1,3})?/g);
  if (parts && parts.join('') === nums && (parts.length > 1 || strum)) {
    return { type: 'notes', name: nums, strum, midis: parts.map(p => parseNoteToken(p).midi + 12 * shift) };
  }
  const m = CHORD_RE.exec(tok);
  if (!m || !/^[A-Za-z0-9+°()#b\-Δ]*$/.test(m[3])) return { type: 'bad', name: tok };
  const rootPc = ((ROOT_PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0)) % 12 + 12) % 12;
  let bassPc = null;
  if (m[4]) {
    const bm = /^([A-G])([#b]?)$/.exec(m[4]);
    if (bm) bassPc = ((ROOT_PC[bm[1]] + (bm[2] === '#' ? 1 : bm[2] === 'b' ? -1 : 0)) % 12 + 12) % 12;
    else {
      const bn = parseNoteToken(m[4]);
      if (bn.type !== 'note') return { type: 'bad', name: tok };
      bassPc = ((bn.midi % 12) + 12) % 12;
    }
  }
  const iv = chordIntervals(m[3]);
  return {
    type: 'chord', name: tok, rootPc, bassPc,
    midis: iv.map(i => 60 + rootPc + i),
    bassMidi: 48 + (bassPc == null ? rootPc : bassPc)
  };
}

// Thai written syllables, for spreading one word over several notes: บังเอิญ → บัง|เอิญ, พยายาม → พ|ยา|ยาม.
// A first consonant with a hidden vowel stands alone (สนุก → ส|นุก, เสมอ → ส|เมอ); not a full dictionary,
// so rare spellings can split oddly — the review page shows every syllable for checking.
const TH_C = 'กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ', TH_LV = 'เแโใไ', TH_UV = 'ัิีึืุู็', TH_TONE = '่้๊๋', TH_FV = 'ะาำๅ';
const thC = c => !!c && TH_C.includes(c);
const thMark = c => !!c && (TH_UV.includes(c) || TH_TONE.includes(c) || c === '์' || c === 'ํ');
function thaiSyllables(word) {
  const ch = Array.from(word), n = ch.length, out = [];
  const vowelAt = j => j < n && (TH_UV.includes(ch[j]) || TH_TONE.includes(ch[j]) || TH_FV.includes(ch[j]) || ch[j] === 'อ');
  // a true cluster (กร, ปล, คว…), a silent ร (จริง, สร้าง) or a silent leader (หน, อย) reads as one onset
  const onset2 = (a, b, lv, j) => ((a === 'ห' && 'งญนมยรลว'.includes(b)) || (a === 'อ' && b === 'ย') ||
    (/^(?:[กขค][รลว]|ตร|[ปพบฟ][รล]|ผล|ดร|ทร|[จซศส]ร)$/.test(a + b) && (lv || vowelAt(j) || (thC(ch[j]) && !vowelAt(j + 1)))));
  let i = 0, carry = '';
  while (i < n) {
    let lv = carry; carry = '';
    if (TH_LV.includes(ch[i])) lv += ch[i++];
    if (i >= n) { out.push(lv); break; }
    if (!thC(ch[i])) { out.push(lv + ch[i++]); continue; }
    let on = ch[i++];
    if (thC(ch[i]) && onset2(on, ch[i], lv, i + 1)) on += ch[i++];
    // hidden vowel: the next consonant carries the vowel (or, after เ/แ, is followed by its own final;
    // or three bare consonants like ถนน, ขนม)
    // (with a leading vowel the next consonant must take it: เสมอ = ส|เมอ, but เวลา = เว|ลา)
    const takesLv = j => ch[j] === 'อ' || TH_UV.includes(ch[j]) || TH_TONE.includes(ch[j]) || (ch[j] === 'า' && ch[j + 1] === 'ะ');
    if (on.length === 1 && thC(ch[i]) &&
        ((lv ? takesLv(i + 1) : vowelAt(i + 1)) || (!'อวย'.includes(ch[i]) && thC(ch[i + 1]) && (i + 2 >= n || TH_LV.includes(ch[i + 2])) && (lv || !vowelAt(i + 2))))) {
      out.push(on); carry = lv; continue;
    }
    let s = lv + on;
    while (i < n && thMark(ch[i])) s += ch[i++];
    if (i < n && TH_FV.includes(ch[i])) { s += ch[i++]; if (ch[i] === 'ะ') s += ch[i++]; }
    else if (ch[i] === 'อ' && !vowelAt(i + 1)) s += ch[i++];                                 // -อ, เ-อ, เ-ือ
    else if (ch[i] === 'ย' && /เ/.test(lv) && /[ี]/.test(s) && !vowelAt(i + 1)) s += ch[i++];   // เ-ีย
    else if (ch[i] === 'ว' && thC(ch[i + 1]) && !vowelAt(i + 1) && !/[ิีึืุู]/.test(s)) s += ch[i++];  // -ัว- written without ั
    else if (ch[i] === 'ว' && /ั/.test(s) && !vowelAt(i + 1)) s += ch[i++];                   // -ัว
    // final consonant (plus a silenced one with ์), unless it starts the next syllable; -ะ -ำ ใ- ไ- เ-า have none
    const open = /[ะำ]$/.test(s) || /ใ/.test(lv) || (/ไ/.test(lv) && !(ch[i] === 'ย' && i === n - 1)) || (/เ/.test(lv) && /า$/.test(s));
    if (!open && thC(ch[i]) && !vowelAt(i + 1) && !(thC(ch[i + 1]) && onset2(ch[i], ch[i + 1], '', i + 2) && vowelAt(i + 2))) {
      s += ch[i++];
      while (i < n && (ch[i] === '์' || (thC(ch[i]) && ch[i + 1] === '์'))) s += ch[i++];
    }
    out.push(s);
  }
  return out.filter(Boolean);
}

// merge neighbouring syllables, shortest pair first, until there are k
function mergeTo(parts, k) {
  const p = parts.slice();
  while (p.length > k) {
    let best = 0;
    for (let i = 1; i < p.length - 1; i++) if (p[i].length + p[i + 1].length < p[best].length + p[best + 1].length) best = i;
    p.splice(best, 2, p[best] + p[best + 1]);
  }
  return p;
}

// words → n pieces by splitting the words with the most syllables first
function splitSyllables(parts, n) {
  if (parts.length >= n) return parts;
  const out = parts.map(p => [p]), syl = parts.map(p => thaiSyllables(p));
  let need = n - parts.length;
  parts.map((p, i) => i).sort((a, b) => syl[b].length - syl[a].length || a - b).forEach(i => {
    if (need <= 0) return;
    let s = syl[i];
    if (s.length < 2) return;
    if (s.length - 1 > need) s = mergeTo(s, need + 1);
    need -= s.length - 1; out[i] = s;
  });
  return [].concat(...out);
}

function lyricTokens(str) {
  return String(str || '').trim().split(/[\s\/]+/).filter(Boolean);
}

function parseMeasure(m, ctx) {
  const mel = parseMelody(m.mel, ctx.shift, ctx.prev, !!ctx.free);
  const issues = mel.issues.map(i => Object.assign({}, i));
  const slots = mel.slots, len = slots ? mel.end : ctx.beats;   // len = beats the measure lasts; slots = written beats

  mel.notes.forEach(n => {
    const c = checkNote(n.midi, ctx.tuning);
    if (c) {
      n.bad = c;
      issues.push({ level: 'error', code: c.code, tok: n.tok, beat: n.beat, msg: n.tok + ' → ' + c.msg });
    }
  });

  if (mel.slots === 0) {
    issues.push({ level: 'warn', code: 'empty', msg: 'ห้องว่าง (ไม่มีโน้ต)' });
  } else if (mel.slots !== ctx.beats && !ctx.free) {      // photo sheets have no bars to count
    issues.push({ level: 'warn', code: 'beats', msg: 'ห้องนี้มี ' + mel.slots + ' จังหวะ (กำหนด ' + ctx.beats + ')' });
  }

  const lt = lyricTokens(m.lyr);
  if (lt.length) {
    mel.notes.forEach((n, i) => { n.lyric = lt[i] && lt[i] !== '~' && lt[i] !== '_' ? lt[i] : ''; });
    if (lt.length !== mel.notes.length) {
      issues.push({ level: 'warn', code: 'lyric', msg: 'เนื้อร้อง ' + lt.length + ' พยางค์ แต่มี ' + mel.notes.length + ' โน้ต' });
    }
  }

  const ct = String(m.chd || '').trim().split(/\s+/).filter(Boolean);
  const chords = [];
  const avail = new Set(Array.from(keySet(ctx.tuning)).map(x => ((x % 12) + 12) % 12));
  ct.forEach((raw, i) => {
    // a chord belongs to the beat (slot) it is written under
    const at = x => { const lo = Math.min(Math.floor(x + 1e-9), slots - 1), a = mel.starts[lo], b = lo + 1 < slots ? mel.starts[lo + 1] : mel.end; return a + (x - lo) * (b - a); };
    const beat = !slots ? (i * len) / ct.length : at(ct.length === slots ? i : (i * slots) / ct.length);
    const p = parseChordToken(raw, ctx.shift);
    if (p.type === 'cont') return;
    if (p.type === 'bad') {
      issues.push({ level: 'warn', code: 'chord', tok: raw, msg: 'อ่านคอร์ด "' + raw + '" ไม่ได้' });
      return;
    }
    const ev = Object.assign({ beat, dur: 0 }, p);
    if (p.type === 'bass') {
      const c = checkNote(p.midi, ctx.tuning);
      if (c) { ev.bad = c; issues.push({ level: 'error', code: c.code, tok: raw, beat, msg: 'เบส ' + raw + ' → ' + c.msg }); }
    } else if (p.type === 'notes') {
      p.midis.forEach(mi => {
        const c = checkNote(mi, ctx.tuning);
        if (c && !ev.bad) { ev.bad = c; issues.push({ level: 'error', code: c.code, tok: raw, beat, msg: 'คอร์ด ' + raw + ' → ' + c.msg }); }
      });
    } else if (p.type === 'chord') {
      const pcs = [p.rootPc].concat(p.bassPc == null ? [] : [p.bassPc]);
      pcs.forEach(pc => {
        if (!avail.has(pc)) {
          issues.push({ level: 'warn', code: 'chordroot', tok: raw, beat, msg: 'คอร์ด ' + raw + ': โน้ตเบส ' + noteLabel(describe(60 + pc, pc === 10), 'western').replace(/\d/, '') + ' ไม่มีบนคาลิมบา' });
        }
      });
    }
    chords.push(ev);
  });
  chords.forEach((c, i) => { c.dur = (i + 1 < chords.length ? chords[i + 1].beat : len) - c.beat; });

  return { items: mel.items, notes: mel.notes, chords, len, slots: mel.slots, tail: mel.slots ? mel.tail : null, issues };
}

// beats of rest before a measure that starts a new line: its own gap, else def (songs read from a photo use half a beat)
// beats of rest before a measure: at a new line by default (def), or anywhere the player set one
const lineGap = (m, i, def) => (i && m && (m.br || +m.gap > 0) ? Math.max(0, Math.min(4, m.gap == null ? (m.br ? def || 0 : 0) : Math.round(+m.gap || 0))) : 0);
function parseSong(song, tuning) {
  const measures = [], issues = [];
  let prev = null, start = 0;
  song.measures.forEach((m, i) => {
    // a measure that starts a new line can wait a few beats first (the rests the sheet leaves there)
    const gap = lineGap(m, i, 0);
    start += gap;
    const pm = parseMeasure(m, { shift: song.octaveShift || 0, beats: song.beats, prev: gap ? null : prev, tuning, free: song.source === 'photo' });
    pm.index = i; pm.start = start; pm.gap = gap;
    start += pm.len; prev = pm.tail;
    pm.issues.forEach(x => issues.push(Object.assign({ measure: i }, x)));
    measures.push(pm);
  });
  return { measures, issues, totalBeats: start };
}

function summarize(parsed) {
  const s = { errors: 0, warns: 0, range: 0, notes: 0 };
  parsed.measures.forEach(m => { s.notes += m.notes.length; });
  parsed.issues.forEach(i => {
    if (i.level === 'error') s.errors++; else s.warns++;
    if (i.code === 'low' || i.code === 'high' || i.code === 'tuning' || i.code === 'accidental') s.range++;
  });
  return s;
}

// find a whole-song octave shift that leaves the fewest notes outside C4–A5
function suggestShift(song, tuning) {
  const count = sh => parseSong(Object.assign({}, song, { octaveShift: sh }), tuning)
    .issues.filter(i => i.code === 'low' || i.code === 'high').length;
  const base = song.octaveShift || 0, cur = count(base);
  let best = null;
  for (let sh = -3; sh <= 3; sh++) {
    if (sh === base) continue;
    const c = count(sh);
    if (c < cur && (!best || c < best.left || (c === best.left && Math.abs(sh - base) < Math.abs(best.shift - base)))) best = { shift: sh, left: c };
  }
  return best;
}

const NOTE_UNIT = "[#b]?[0-7](?:'+|,+)?";
const MEL_ITEM = '(?:(?:' + NOTE_UNIT + ')+|-)';
const MEL_TOKEN_RE = new RegExp('^' + MEL_ITEM + '(?:_' + MEL_ITEM + ')*$');

// a lone "/" between spaces is a phrase/bar separator (C/E slash chords are untouched)
const slashToBar = s => s.replace(/(^|\s)\/(?=\s|$)/g, '$1|');

// Thai lyrics written without spaces: split words with Intl.Segmenter when that matches the note count better
function expandLyrics(toks, need) {
  if (toks.length >= need || typeof Intl === 'undefined' || !Intl.Segmenter) return toks;
  try {
    const seg = new Intl.Segmenter('th', { granularity: 'word' }), out = [];
    toks.forEach(t => {
      const parts = Array.from(seg.segment(t)).filter(x => x.isWordLike).map(x => x.segment);
      out.push.apply(out, parts.length ? parts : [t]);
    });
    const syl = splitSyllables(out, need);
    return Math.abs(syl.length - need) < Math.abs(toks.length - need) ? syl : toks;
  } catch (e) { return toks; }
}

// one lyric word per melody group: split the word over the group's notes ("~" = empty syllable when it can't be split)
function lyricsByGroups(toks, counts) {
  const out = [];
  toks.forEach((t, i) => {
    const n = counts[i];
    if (n <= 0) return;
    let parts = [t];
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      try {
        const seg = Array.from(new Intl.Segmenter('th', { granularity: 'word' }).segment(t)).filter(x => x.isWordLike).map(x => x.segment);
        if (seg.length) parts = seg;
      } catch (e) { /* keep whole word */ }
    }
    // more notes than words: sing a word over several notes, one syllable each (เสมอ → ส|เมอ)
    parts = splitSyllables(parts, n);
    if (parts.length > n) parts = parts.slice(0, n - 1).concat(parts.slice(n - 1).join(''));
    while (parts.length < n) parts.push('~');
    out.push.apply(out, parts);
  });
  return out;
}

// chord/bass line aligned by column under the melody line (no "|"): attach each token to the melody slot at or before its column
function alignByColumn(melRaw, chdRaw) {
  const slots = [], re = /\S+/g;
  let m;
  while ((m = re.exec(melRaw))) if (m[0] !== '|') slots.push(m.index);
  const out = slots.map(() => '');
  const cr = /\S+/g;
  while ((m = cr.exec(chdRaw))) {
    let k = 0;
    for (let i = 0; i < slots.length; i++) if (slots[i] <= m.index) k = i;
    out[k] = out[k] ? out[k] + ' ' + m[0] : m[0];
  }
  return out;
}

// loose = tolerate a few typos (≥60% of tokens valid) so one bad token doesn't reject the whole line
function isMelodyLine(line, loose) {
  const toks = line.replace(/\|/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (!toks.length) return false;
  const ok = toks.filter(t => MEL_TOKEN_RE.test(normTok(t))).length;
  return loose ? ok / toks.length >= 0.6 : ok === toks.length;
}

function splitBars(line, trimTrailing) {
  if (line.indexOf('|') < 0) return null;
  const p = line.split('|').map(s => s.trim());
  if (p.length && p[0] === '') p.shift();
  if (p.length && p[p.length - 1] === '') p.pop();
  if (trimTrailing) while (p.length && p[p.length - 1] === '') p.pop();
  return p;
}

function slotCount(s) { return String(s).trim().split(/\s+/).filter(Boolean).length; }

// 3-line text → song. Returns { song, msgs:[{level,msg}] }
function importText(text, opts) {
  opts = opts || {};
  const msgs = [];
  const song = { title: opts.title || '', tempo: opts.tempo || 100, beats: opts.beats || 4, octaveShift: opts.octaveShift || 0, measures: [] };
  const blocks = [];
  let cur = [];
  String(text || '').replace(/\r/g, '').split('\n').forEach(raw => {
    const line = raw.trim();
    const d = /^@(title|tempo|beats|shift)\s+(.+)$/i.exec(line);
    if (d) {
      const k = d[1].toLowerCase(), v = d[2].trim();
      if (k === 'title') song.title = v;
      else if (k === 'tempo') song.tempo = Math.min(240, Math.max(30, parseInt(v, 10) || song.tempo));
      else if (k === 'beats') song.beats = Math.min(12, Math.max(1, parseInt(v, 10) || song.beats));
      else if (k === 'shift') song.octaveShift = Math.min(3, Math.max(-3, parseInt(v, 10) || 0));
      return;
    }
    if (line.indexOf('//') === 0) return;
    if (!line) { if (cur.length) { blocks.push(cur); cur = []; } return; }
    cur.push(raw.replace(/\s+$/, ''));     // keep leading spaces: bass lines may be column-aligned
  });
  if (cur.length) blocks.push(cur);

  blocks.forEach((rawLines, bi) => {
    const tag = 'ท่อนที่ ' + (bi + 1) + ': ';
    const lines = rawLines.map(s => slashToBar(s.trim()));
    const rawOf = s => rawLines.find(r => slashToBar(r.trim()) === s) || s;
    let lyr = null, mel = null, chd = null;
    if (lines.length >= 3) {
      lyr = lines[0]; mel = lines[1]; chd = lines[2];
      if (lines.length > 3) msgs.push({ level: 'warn', msg: tag + 'มี ' + lines.length + ' บรรทัด ใช้แค่ 3 บรรทัดแรก (เว้นบรรทัดว่างระหว่างท่อน)' });
    } else if (lines.length === 2) {
      if (isMelodyLine(lines[1], true) && !isMelodyLine(lines[0], true)) { lyr = lines[0]; mel = lines[1]; }
      else if (isMelodyLine(lines[0], true)) { mel = lines[0]; chd = lines[1]; }
    } else if (isMelodyLine(lines[0], true)) {
      mel = lines[0];
    }
    const hasNote = mel != null && mel.split(/[\s|]+/).some(t => MEL_TOKEN_RE.test(normTok(t)));
    if (mel == null || !hasNote || (lines.length < 3 && !isMelodyLine(mel, true))) {
      msgs.push({ level: 'error', msg: tag + 'ไม่พบบรรทัดทำนอง (ต้องเป็นเลข 1-7) — ข้ามท่อนนี้' });
      return;
    }

    let melBars = splitBars(mel, true);
    if (!melBars) {
      const toks = mel.split(/\s+/).filter(Boolean);
      melBars = [];
      for (let i = 0; i < toks.length; i += song.beats) melBars.push(toks.slice(i, i + song.beats).join(' '));
    }
    const onsets = melBars.map(s => parseMelody(s, 0, null).notes.length);

    let lyrBars = melBars.map(() => '');
    if (lyr != null) {
      const lb = splitBars(lyr, false);
      if (lb) {
        lyrBars = melBars.map((_, i) => lb[i] || '');
        if (lb.length > melBars.length && lb.slice(melBars.length).some(Boolean)) msgs.push({ level: 'warn', msg: tag + 'เนื้อร้องมีห้องมากกว่าทำนอง' });
      } else {
        // lyric words line up with melody groups separated by 2+ spaces
        const gcounts = rawOf(mel).trim().split(/\s{2,}/).map(g => parseMelody(slashToBar(g).replace(/\|/g, ' '), 0, null).notes.length);
        let toks = lyricTokens(lyr);
        const byGroup = toks.length > 1 && toks.length === gcounts.length ? lyricsByGroups(toks, gcounts) : null;
        toks = byGroup || expandLyrics(toks, onsets.reduce((a, c) => a + c, 0));
        let p = 0;
        lyrBars = onsets.map(c => { const s = toks.slice(p, p + c).join(' '); p += c; return s; });
        if (p < toks.length) {
          lyrBars[lyrBars.length - 1] = (lyrBars[lyrBars.length - 1] + ' ' + toks.slice(p).join(' ')).trim();
          msgs.push({ level: 'warn', msg: tag + 'เนื้อร้องเกินจำนวนโน้ต ' + (toks.length - p) + ' พยางค์' });
        }
      }
    }

    let chdBars = melBars.map(() => '');
    if (chd != null) {
      const cb = splitBars(chd, false);
      if (cb) {
        chdBars = melBars.map((_, i) => cb[i] || '');
        if (cb.length > melBars.length && cb.slice(melBars.length).some(Boolean)) msgs.push({ level: 'warn', msg: tag + 'คอร์ดมีห้องมากกว่าทำนอง' });
      } else {
        const toks = chd.split(/\s+/).filter(Boolean);
        const total = melBars.reduce((a, s) => a + slotCount(s), 0);
        if (toks.length === total) {
          let p = 0;
          chdBars = melBars.map(s => { const c = slotCount(s); const r = toks.slice(p, p + c).join(' '); p += c; return r; });
        } else if (/\S\s{3,}\S/.test(rawOf(chd)) || /^\s{2,}\S/.test(rawOf(chd))) {
          // column-aligned under the melody
          const perSlot = alignByColumn(slashToBar(rawOf(mel)), rawOf(chd));
          let p = 0;
          chdBars = melBars.map(s => {
            const c = slotCount(s), part = perSlot.slice(p, p + c); p += c;
            return part.some(Boolean) ? part.map(x => x || '.').join(' ') : '';
          });
        } else {
          chdBars = melBars.map((_, i) => toks[i] || '');
          if (toks.length !== melBars.length) msgs.push({ level: 'warn', msg: tag + 'บรรทัดคอร์ดไม่มี | และจำนวนไม่ตรง จึงใส่ 1 คอร์ดต่อห้อง — ลองใส่ | กั้นห้อง' });
        }
      }
    }

    melBars.forEach((s, i) => song.measures.push({ mel: s, lyr: lyrBars[i], chd: chdBars[i], br: i === 0 }));
    // where this line sits in a source photo, so the review page can show it next to the notes
    if (opts.blockMeta && opts.blockMeta[bi]) song.measures[song.measures.length - melBars.length].src = opts.blockMeta[bi];
  });

  if (!song.measures.length) msgs.push({ level: 'error', msg: 'ไม่พบโน้ตที่แปลงได้ — ตรวจรูปแบบ 3 บรรทัดอีกครั้ง' });
  return { song, msgs };
}

function songToText(song) {
  const out = [];
  if (song.title) out.push('@title ' + song.title);
  out.push('@tempo ' + song.tempo, '@beats ' + song.beats);
  if (song.octaveShift) out.push('@shift ' + song.octaveShift);
  const groups = [];
  song.measures.forEach(m => {
    if (m.br || !groups.length) groups.push([]);
    groups[groups.length - 1].push(m);
  });
  groups.forEach(g => {
    out.push('');
    const join = k => '| ' + g.map(m => m[k] || '').join(' | ') + ' |';
    if (g.some(m => (m.lyr || '').trim())) out.push(join('lyr'));
    out.push(join('mel'));
    if (g.some(m => (m.chd || '').trim())) out.push(join('chd'));
  });
  return out.join('\n');
}

// the whole song a number of semitones up or down: melody numbers, number chords (135~), bass numbers and
// letter chords (C, Am/G). Sharps are written as #, except the B-flat tine (b7) the kalimba has.
const SEMI_TOK = ['1', '#1', '2', '#2', '3', '4', '#4', '5', '#5', '6', 'b7', '7'];
const SEMI_ROOT = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
function semiNote(tok, d) {
  const p = parseNoteToken(tok);
  if (p.type !== 'note') return tok;
  const m = p.midi + d, oct = Math.floor((m - 60) / 12);
  return SEMI_TOK[((m % 12) + 12) % 12] + (oct > 0 ? "'".repeat(oct) : ','.repeat(-oct));
}
const NOTE_RUN = /[#b]?[0-7](?:'{1,3}|,{1,3})?/g;
function semiRun(s, d) {                       // 2'2' or 135: notes written together stay together
  const parts = s.match(NOTE_RUN);
  return parts && parts.join('') === s ? parts.map(x => semiNote(x, d)).join('') : s;
}
function transposeMelody(str, d) {
  return String(str || '').trim().split(/\s+/).filter(Boolean)
    .map(slot => slot.split('_').map(sub => semiRun(normTok(sub), d)).join('_')).join(' ');
}
function transposeChords(str, d) {
  const letter = (root, acc) => SEMI_ROOT[(((ROOT_PC[root] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0) + d) % 12) + 12) % 12];
  return String(str || '').trim().split(/\s+/).filter(Boolean).map(raw => {
    const tok = normTok(raw), p = parseChordToken(tok, 0);
    if (p.type === 'bass' || p.type === 'notes') return semiRun(tok.replace(/~$/, ''), d) + (/~$/.test(tok) ? '~' : '');
    if (p.type !== 'chord') return raw;
    const m = CHORD_RE.exec(tok);
    let out = letter(m[1], m[2]) + m[3];
    if (m[4]) {
      const bm = /^([A-G])([#b]?)$/.exec(m[4]);
      out += '/' + (bm ? letter(bm[1], bm[2]) : semiRun(m[4], d));
    }
    return out;
  }).join(' ');
}
function transposeSong(song, d) {
  song.measures.forEach(m => { m.mel = transposeMelody(m.mel, d); m.chd = transposeChords(m.chd, d); });
  return song;
}

function shiftMelodyStr(str, d) {
  return String(str || '').trim().split(/\s+/).filter(Boolean).map(slot => slot.split('_').map(sub => {
    const m = /^([#b]?)([1-7])('{0,3}|,{0,3})$/.exec(normTok(sub));
    if (!m) return sub;
    let o = m[3] ? (m[3][0] === "'" ? m[3].length : -m[3].length) : 0;
    o = Math.max(-3, Math.min(3, o + d));
    return m[1] + m[2] + (o > 0 ? "'".repeat(o) : o < 0 ? ','.repeat(-o) : '');
  }).join('_')).join(' ');
}

const SAMPLE1 = [
  '@title Twinkle, Twinkle, Little Star',
  '@tempo 100',
  '',
  'ทวิง เคิล ทวิง เคิล ลิต เติล สตาร์',
  '1 1 5 5 | 6 6 5 -',
  'C . . . | F . C .',
  '',
  'ฮาว ไอ วัน เดอร์ ว็อต ยู อาร์',
  '4 4 3 3 | 2 2 1 -',
  'F . C . | G . C .',
  '',
  'อัพ อะ บัฟ เดอะ เวิลด์ โซ ไฮ',
  '5 5 4 4 | 3 3 2 -',
  'C . F . | C . G .',
  '',
  'ไลค์ อะ ได มอนด์ อิน เดอะ สกาย',
  '5 5 4 4 | 3 3 2 -',
  'C . F . | C . G7 .'
].join('\n');

const SAMPLE2 = [
  '@title ตัวอย่างโน้ตเกินช่วง',
  '@tempo 90',
  '',
  "1 3 5 7' | 4'' 3'' 6' 5'",
  'C . . . | G7 . . .',
  '',
  '7, 6, 5 b7 | #4 3 2 1',
  'C | F'
].join('\n');

/* @@PARSER-END */

/* @@MIDI-START  MIDI / karaoke (.mid .midi .kar) → beginner kalimba song. Pure: no DOM, testable in node. */
const MELODY_NAME_RE = /melody|melodi|vocal|voice|lead|sing|solo|tune|ร้อง|ทำนอง|เมโลดี้|นักร้อง/i;
const BASS_NAME_RE = /bass|cello|contra|tuba|trombone|เบส|เชลโล/i;

function decodeText(bytes) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch (e) { /* not UTF-8 */ }
  try { return new TextDecoder('windows-874').decode(bytes); } catch (e) { /* no Thai codec */ }
  return String.fromCharCode.apply(null, Array.from(bytes));
}

function parseMidi(input) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  let p = 0;
  const tag = at => String.fromCharCode(b[at], b[at + 1], b[at + 2], b[at + 3]);
  const u32 = () => { const v = ((b[p] << 24) | (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3]) >>> 0; p += 4; return v; };
  const u16 = () => { const v = (b[p] << 8) | b[p + 1]; p += 2; return v; };
  const vlq = () => { let v = 0, c; do { c = b[p++]; v = (v << 7) | (c & 0x7f); } while (c & 0x80 && p < b.length); return v; };

  if (b.length > 12 && tag(0) === 'RIFF') {            // RMID wrapper
    for (let i = 12; i < b.length - 4; i++) if (tag(i) === 'MThd') { p = i; break; }
  }
  if (b.length < 14 || tag(p) !== 'MThd') throw new Error('ไฟล์นี้ไม่ใช่ไฟล์ MIDI (.mid / .kar)');
  const hStart = p + 8; p += 4;
  const hLen = u32(), format = u16(), nTracks = u16(), division = u16();
  if (division & 0x8000) throw new Error('ไฟล์ MIDI แบบเวลา SMPTE ยังไม่รองรับ');
  p = hStart + hLen;

  const ppq = division || 480, tracks = [];
  let tempo = 0, timeSig = null;
  while (tracks.length < nTracks && p + 8 <= b.length) {
    const id = tag(p); p += 4;
    const len = u32(), end = Math.min(p + len, b.length);
    if (id !== 'MTrk') { p = end; continue; }
    let tick = 0, run = 0, name = '';
    const open = new Map(), notes = [], texts = [];
    while (p < end) {
      tick += vlq();
      let st = b[p];
      if (st & 0x80) { p++; if (st < 0xf0) run = st; } else if (run) st = run; else break;
      if (st === 0xff) {
        const type = b[p++], l = vlq(), data = b.subarray(p, p + l); p += l;
        if (type === 0x2f) break;
        if (type === 0x03 && !name) name = decodeText(data).trim();
        else if (type === 0x51 && l === 3 && !tempo) tempo = (data[0] << 16) | (data[1] << 8) | data[2];
        else if (type === 0x58 && l >= 2 && !timeSig) timeSig = [data[0], 1 << data[1]];
        else if (type === 0x01 || type === 0x05) texts.push({ tick, type, text: decodeText(data) });
      } else if (st === 0xf0 || st === 0xf7) {
        p += vlq();
      } else {
        const hi = st & 0xf0, ch = st & 0x0f;
        if (hi === 0xc0 || hi === 0xd0) { p += 1; continue; }
        const a1 = b[p], a2 = b[p + 1]; p += 2;
        const key = ch * 128 + a1;
        if (hi === 0x90 && a2 > 0) {
          const o = open.get(key);
          if (o) notes.push({ ch, midi: a1, start: o.tick, end: tick, vel: o.vel });
          open.set(key, { tick, vel: a2 });
        } else if (hi === 0x80 || hi === 0x90) {
          const o = open.get(key);
          if (o) { notes.push({ ch, midi: a1, start: o.tick, end: tick, vel: o.vel }); open.delete(key); }
        }
      }
    }
    open.forEach((o, key) => notes.push({ ch: key >> 7, midi: key & 127, start: o.tick, end: Math.max(tick, o.tick + ppq / 2), vel: o.vel }));
    p = end;
    tracks.push({ index: tracks.length, name, notes: notes.filter(n => n.end > n.start), texts });
  }
  return { format, ppq, tempo: tempo || 500000, timeSig: timeSig || [4, 4], tracks };
}

// karaoke lyrics: lyric meta events, or the text events of a .kar "Words" track (lines marked with / or \)
function midiLyrics(mid) {
  const all = [];
  mid.tracks.forEach(t => t.texts.forEach(x => all.push(x)));
  let title = '';
  const head = all.filter(x => x.type === 0x01 && /^@T/.test(x.text));
  if (head.length) title = head[0].text.slice(2).trim();
  let lyr = all.filter(x => x.type === 0x05);
  if (lyr.length < 8) {
    let best = [];
    mid.tracks.forEach(t => {
      const tx = t.texts.filter(x => x.type === 0x01 && !/^[@%]/.test(x.text));
      if (tx.length > best.length) best = tx;
    });
    lyr = best.length >= 8 ? best : [];
  }
  lyr = lyr.map(x => ({ tick: x.tick, text: x.text.replace(/[\/\\\r\n]/g, ' ').replace(/\s+/g, '') })).filter(x => x.text);
  lyr.sort((a, b) => a.tick - b.tick);
  return { title, lyrics: lyr };
}

function midiVoices(mid, lyrics) {
  const voices = [], tol = mid.ppq / 8;
  const lyrTicks = lyrics.map(x => x.tick);
  mid.tracks.forEach(t => {
    const byCh = new Map();
    t.notes.forEach(n => { if (n.ch !== 9) { if (!byCh.has(n.ch)) byCh.set(n.ch, []); byCh.get(n.ch).push(n); } });
    byCh.forEach((notes, ch) => {
      if (notes.length < 4) return;
      notes.sort((a, b) => a.start - b.start || b.midi - a.midi);
      let poly = 0, sum = 0;
      notes.forEach((n, i) => { sum += n.midi; if (i && n.start < notes[i - 1].end - tol) poly++; });
      let hit = 0, j = 0;
      lyrTicks.forEach(lt => {
        while (j < notes.length && notes[j].start < lt - tol) j++;
        if (j < notes.length && Math.abs(notes[j].start - lt) <= tol) hit++;
      });
      const mean = sum / notes.length, mono = 1 - poly / notes.length;
      const named = MELODY_NAME_RE.test(t.name);
      const score = (named ? 3 : 0) + (lyrTicks.length ? 4 * hit / lyrTicks.length : 0) + 2 * mono +
        (mean >= 55 && mean <= 84 ? 1 : 0) + Math.min(notes.length, 300) / 300;
      voices.push({ id: t.index * 16 + ch, track: t.index, ch, name: t.name || ('แทร็ก ' + (t.index + 1)) + ' · ช่อง ' + (ch + 1),
        notes, count: notes.length, mean, mono, lyricHit: lyrTicks.length ? hit / lyrTicks.length : 0, score });
    });
  });
  voices.sort((a, b) => b.score - a.score);
  return voices;
}

const TOK_BY_PC = { 0: '1', 2: '2', 4: '3', 5: '4', 7: '5', 9: '6', 10: 'b7', 11: '7' };
function midiTok(m) {
  const oct = Math.floor((m - 60) / 12), pc = ((m % 12) + 12) % 12;
  return TOK_BY_PC[pc] + (oct > 0 ? "'".repeat(oct) : ','.repeat(-oct));
}

// best whole-song transposition onto the 17 keys: most notes playable as-is, then fewest that need
// an octave fold, then the smallest move
function bestShift(notes, tuning) {
  const keys = keySet(tuning), pcs = new Set(Array.from(keys).map(m => m % 12));
  let best = { shift: 0, score: -1 };
  for (let s = -36; s <= 36; s++) {
    let sc = 0;
    notes.forEach(n => {
      const m = n.midi + s, w = n.len || 1;
      if (n.pcOnly) { if (pcs.has(((m % 12) + 12) % 12)) sc += w; return; }   // the bass is moved to the lowest octave anyway: only its note name matters
      if (keys.has(m)) sc += 2 * w - (m === 70 || m === 71 ? 0.01 : 0);   // tie-break: avoid the tunable B/Bb key
      else if (pcs.has(((m % 12) + 12) % 12)) sc += w;
    });
    if (sc > best.score || (sc === best.score && Math.abs(s) < Math.abs(best.shift))) best = { shift: s, score: sc };
  }
  return best.shift;
}

function fitNote(m, tuning) {
  const keys = keySet(tuning);
  if (keys.has(m)) return { midi: m, how: '' };
  const pc = ((m % 12) + 12) % 12;
  if (Array.from(keys).some(k => k % 12 === pc)) {
    let f = m;
    while (f < KEY_MIN) f += 12;
    while (f > KEY_MAX) f -= 12;
    if (keys.has(f)) return { midi: f, how: 'fold' };
  }
  let near = null;
  Array.from(keys).forEach(k => { if (near === null || Math.abs(k - m) < Math.abs(near - m) || (Math.abs(k - m) === Math.abs(near - m) && k < near)) near = k; });
  return { midi: near, how: Math.abs(near - m) <= 2 ? 'snap' : 'fold' };
}

// one beat of grid cells (a note token, '-' = still sounding, '0' = silence) as the shortest token:
// '5', '5_6' (two 8ths) or '5_6_-_1' (16ths). A kalimba note rings on, so silence after a note in the
// same beat is written as a hold.
function beatTok(cells) {
  const c = cells.slice();
  for (let k = 1; k < c.length; k++) if (c[k] === '0' && c[k - 1] !== '0') c[k] = '-';
  if (c.every(x => x === '0')) return '0';
  if (c.slice(1).every(x => x === '-')) return c[0];
  if (c.length === 4 && c[1] === '-' && c[3] === '-') return c[0] + '_' + c[2];
  return c.join('_');
}

// notes: [{midi, start, end, lyric?}] in ticks (ppq per beat). Returns a song in the importText shape.
function notesToSong(raw, opt) {
  const ppq = opt.ppq, tuning = opt.tuning || 'B4';
  // 16th-note grid, or 8ths for very fast songs where 16ths would be unplayable anyway
  const sub = (opt.tempo || 90) > 130 ? 2 : 4, unit = ppq / sub;
  const beats = Math.max(1, Math.min(12, opt.beats || 4)), perBar = beats * sub;
  // one note at a time: highest note wins at the same onset (skyline), later onsets cut the previous one
  const src = raw.slice().sort((a, b) => a.start - b.start || b.midi - a.midi);
  const q = [];
  let dropped = 0;
  src.forEach(n => {
    const s = Math.round(n.start / unit);
    let e = Math.max(s + 1, Math.round(n.end / unit));
    const prev = q[q.length - 1];
    if (prev && s <= prev.s) {
      if (s === prev.s) { if (n.lyric && !prev.lyric) prev.lyric = n.lyric; dropped++; return; }
    }
    if (prev && prev.e > s) prev.e = s;
    q.push({ s, e, midi: n.midi, lyric: n.lyric || '' });
  });
  if (!q.length) return { song: { title: opt.title || '', tempo: opt.tempo || 90, beats, octaveShift: 0, measures: [] }, report: { notes: 0 } };
  q.forEach(n => { n.len = n.e - n.s; });

  // the bass counts a little when choosing the transposition, so the bass line also lands on keys the kalimba has
  const bassW = (opt.bass || []).map(n => ({ midi: n.midi, len: Math.max(0.5, ((n.end - n.start) / unit) * 0.4), pcOnly: true }));
  const shift = opt.shift != null ? opt.shift : bestShift(q.concat(bassW), tuning);
  let folded = 0, snapped = 0;
  q.forEach(n => {
    const f = fitNote(n.midi + shift, tuning);
    if (f.how === 'fold') folded++; else if (f.how === 'snap') snapped++;
    n.out = f.midi;
  });

  const firstBar = Math.floor(q[0].s / perBar), off = firstBar * perBar;
  const total = Math.ceil((q[q.length - 1].e - off) / perBar) * perBar;
  const grid = new Array(total).fill('0'), lyrAt = new Map();
  q.forEach(n => {
    const s = n.s - off;
    grid[s] = midiTok(n.out);
    for (let k = s + 1; k < n.e - off; k++) grid[k] = '-';
    lyrAt.set(s, n.lyric);
  });
  // the bass: one token per beat in the chord line (the note that starts in that beat, else '-' = keep ringing). It is moved onto the
  // lowest octave of the kalimba (C4-B4) with the same transposition as the melody; a pitch the kalimba lacks goes to the nearest key.
  let bassCount = 0;
  const bq = (opt.bass || []).slice().sort((a, b) => a.start - b.start || a.midi - b.midi);
  const bassAt = new Map();   // grid cell -> token
  bq.forEach(n => {
    const cell = Math.round(n.start / unit) - off, beatCell = Math.floor(cell / sub) * sub;
    if (cell < 0 || cell >= total || bassAt.has(beatCell)) return;
    const pc = (((n.midi + shift) % 12) + 12) % 12, f = fitNote(60 + pc, tuning);
    if (!f || Math.abs(f.midi - (60 + pc)) > 2) return;
    bassAt.set(beatCell, midiTok(f.midi)); bassCount++;
  });
  const bassLine = bassCount >= 4 ? bar => {
    const toks = [];
    for (let bt = 0; bt < beats; bt++) toks.push(bassAt.get(bar * perBar + bt * sub) || '-');
    return toks.every(x => x === '-') ? '' : toks.join(' ');
  } : null;
  const measures = [];
  let anyLyric = false;
  for (let bar = 0; bar * perBar < total; bar++) {
    const slots = [], lyr = [];
    for (let bt = 0; bt < beats; bt++) {
      const i = bar * perBar + bt * sub, cells = grid.slice(i, i + sub);
      slots.push(beatTok(cells));
      cells.forEach((_, k) => { if (lyrAt.has(i + k)) { const t = lyrAt.get(i + k); lyr.push(t || '~'); if (t) anyLyric = true; } });
    }
    measures.push({ mel: slots.join(' '), lyr: lyr.some(t => t !== '~') ? lyr.join(' ') : '', chd: bassLine ? bassLine(bar) : '', br: bar % 4 === 0 });
  }
  const tempo = Math.max(40, Math.min(200, Math.round(opt.tempo || 90)));
  const secs = (total / sub) * 60 / tempo, nps = q.length / Math.max(1, secs);
  let level = nps < 1.6 ? 1 : nps < 2.6 ? 2 : 3;
  if (snapped / q.length > 0.08 && level < 3) level++;
  return {
    song: { title: opt.title || '', tempo, beats, octaveShift: 0, measures },
    report: { notes: q.length, shift, folded, snapped, dropped, level, lyrics: anyLyric, bass: bassLine ? bassCount : 0 }
  };
}

// the bass part: a lower track that is named bass/cello or sits low and plays one note at a time; else, when the melody's own track also
// holds low notes (a piano with both hands), the lowest note at each onset among those below E3 (the left hand)
function midiBass(voices, mel, mid) {
  const lows = voices.filter(x => x.id !== mel.id && x.mean < mel.mean - 6 && (BASS_NAME_RE.test(x.name) || (x.mean < 56 && x.mono >= 0.6)));
  lows.sort((a, b) => (BASS_NAME_RE.test(b.name) ? 1 : 0) - (BASS_NAME_RE.test(a.name) ? 1 : 0) || b.mono - a.mono || a.mean - b.mean);
  if (lows.length) return { name: lows[0].name, notes: lows[0].notes.map(n => ({ midi: n.midi, start: n.start, end: n.end })) };
  const low = mel.notes.filter(n => n.midi < 52), by = new Map();
  low.forEach(n => { const k = Math.round(n.start / (mid.ppq / 8)); if (!by.has(k) || n.midi < by.get(k).midi) by.set(k, n); });
  if (by.size < 4 || mel.mean < 58 || low.length > mel.notes.length * 0.6) return null;   // a melody that itself lies low is left alone
  return { name: mel.name, same: true, notes: Array.from(by.values()).map(n => ({ midi: n.midi, start: n.start, end: n.end })) };
}

function midiToSong(input, opt) {
  opt = opt || {};
  const mid = parseMidi(input), kar = midiLyrics(mid), voices = midiVoices(mid, kar.lyrics);
  if (!voices.length) throw new Error('ไม่พบทำนองในไฟล์นี้ (มีแต่กลองหรือไม่มีโน้ต)');
  const v = voices.find(x => x.id === opt.voice) || voices[0];
  const tol = mid.ppq / 8, notes = v.notes.map(n => ({ midi: n.midi, start: n.start, end: n.end, lyric: '' }));
  if (kar.lyrics.length && v.lyricHit > 0.3) {
    // each syllable goes to the note it starts on (or the last note before it)
    let j = 0;
    kar.lyrics.forEach(l => {
      while (j + 1 < notes.length && notes[j + 1].start <= l.tick + tol) j++;
      if (notes[j] && notes[j].start <= l.tick + tol) notes[j].lyric += l.text;
    });
  }
  const ts = mid.timeSig, beats = Math.max(1, Math.round(ts[0] * 4 / ts[1]));
  const title = (opt.title || kar.title || (mid.tracks[0] && mid.tracks[0].name) || '').trim();
  const bs = opt.bass === false ? null : midiBass(voices, v, mid);
  const r = notesToSong(bs && bs.same ? notes.filter(n => n.midi >= 52) : notes, { ppq: mid.ppq, beats, tempo: 60000000 / mid.tempo, tuning: opt.tuning, title, bass: bs ? bs.notes : null });
  r.report.voice = v.name;
  if (r.report.bass) r.report.bassVoice = bs.name;
  r.karTitle = kar.title;
  r.voices = voices.slice(0, 6).map(x => ({ id: x.id, name: x.name, count: x.count, lyricHit: x.lyricHit, score: x.score }));
  return r;
}

// a catalog / typed song re-fitted onto the current tuning with the same rules as MIDI imports
function refitSong(song, tuning) {
  const parsed = parseSong(song, 'B4'), ppq = 480, notes = [];
  parsed.measures.forEach(pm => pm.notes.forEach(n => notes.push({
    midi: n.midi, start: Math.round((pm.start + n.beat) * ppq), end: Math.round((pm.start + n.beat + n.dur) * ppq), lyric: n.lyric
  })));
  return notesToSong(notes, { ppq, beats: song.beats, tempo: song.tempo, tuning, title: song.title });
}

// free song catalog: public-domain melodies written out by us (no third-party arrangement)
const FREE_SONGS = [
  { id: 'free-twinkle', title: 'Twinkle, Twinkle, Little Star', tags: 'twinkle star ดาว', origin: 'เพลงพื้นบ้านฝรั่งเศส ศตวรรษที่ 18', tempo: 90, beats: 4,
    mel: ['1 1 5 5 | 6 6 5 - | 4 4 3 3 | 2 2 1 -', '5 5 4 4 | 3 3 2 - | 5 5 4 4 | 3 3 2 -', '1 1 5 5 | 6 6 5 - | 4 4 3 3 | 2 2 1 -'] },
  { id: 'free-hotcross', title: 'Hot Cross Buns', tags: 'hot cross buns ง่าย', origin: 'เพลงพื้นบ้านอังกฤษ', tempo: 90, beats: 4,
    mel: ['3 2 1 - | 3 2 1 - | 1_1 1_1 2_2 2_2 | 3 2 1 -'] },
  { id: 'free-mary', title: 'Mary Had a Little Lamb', tags: 'mary lamb แมรี่ แกะ', origin: 'เพลงพื้นบ้านอเมริกัน ค.ศ. 1830', tempo: 100, beats: 4,
    mel: ['3 2 1 2 | 3 3 3 - | 2 2 2 - | 3 5 5 -', '3 2 1 2 | 3 3 3 3 | 2 2 3 2 | 1 - - -'] },
  { id: 'free-lightly', title: 'Lightly Row (Hänschen klein)', tags: 'lightly row hanschen', origin: 'เพลงพื้นบ้านเยอรมัน', tempo: 100, beats: 4,
    mel: ['5 3 3 - | 4 2 2 - | 1 2 3 4 | 5 5 5 -', '5 3 3 - | 4 2 2 - | 1 3 5 5 | 1 - - -',
      '2 2 2 2 | 2 3 4 - | 3 3 3 3 | 3 4 5 -', '5 3 3 - | 4 2 2 - | 1 3 5 5 | 1 - - -'] },
  { id: 'free-clair', title: 'Au Clair de la Lune (แสงจันทร์)', tags: 'au clair de la lune moon จันทร์', origin: 'เพลงพื้นบ้านฝรั่งเศส ศตวรรษที่ 18', tempo: 96, beats: 4,
    mel: ['1 1 1 2 | 3 - 2 - | 1 3 2 2 | 1 - - -', '1 1 1 2 | 3 - 2 - | 1 3 2 2 | 1 - - -',
      '2 2 2 2 | 6, - 6, - | 2 1 7, 6, | 5, - - -', '1 1 1 2 | 3 - 2 - | 1 3 2 2 | 1 - - -'] },
  { id: 'free-london', title: 'London Bridge Is Falling Down', tags: 'london bridge สะพานลอนดอน', origin: 'เพลงพื้นบ้านอังกฤษ', tempo: 100, beats: 4,
    mel: ['5 -_6 5 4 | 3 4 5 - | 2 3 4 - | 3 4 5 -', '5 -_6 5 4 | 3 4 5 - | 2 - 5 - | 3 1 - -'] },
  { id: 'free-frere', title: 'Frère Jacques (Are You Sleeping)', tags: 'frere jacques brother john are you sleeping', origin: 'เพลงพื้นบ้านฝรั่งเศส', tempo: 100, beats: 4,
    mel: ['1 2 3 1 | 1 2 3 1 | 3 4 5 - | 3 4 5 -', '5_6 5_4 3 1 | 5_6 5_4 3 1 | 1 5, 1 - | 1 5, 1 -'] },
  { id: 'free-row', title: 'Row, Row, Row Your Boat', tags: 'row your boat เรือ', origin: 'เพลงพื้นบ้านอเมริกัน ค.ศ. 1852', tempo: 100, beats: 3,
    mel: ['1 -_1 - | 1 2_3 - | 3 2_3 -_4 | 5 - -', "1'_1' 1'_5 5_5 | 3_3 3_1 1_1 | 5 4_3 -_2 | 1 - -"] },
  { id: 'free-ode', title: 'Ode to Joy (Beethoven)', tags: 'ode to joy beethoven เบโธเฟน', origin: 'เบโธเฟน (เสียชีวิต ค.ศ. 1827)', tempo: 100, beats: 4,
    mel: ['3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 3 -_2 2 -', '3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 2 -_1 1 -',
      '2 2 3 1 | 2 3_4 3 1 | 2 3_4 3 2 | 1 2 5, -', '3 3 4 5 | 5 4 3 2 | 1 1 2 3 | 2 -_1 1 -'] },
  { id: 'free-jingle', title: 'Jingle Bells (ท่อนฮุก)', tags: 'jingle bells christmas คริสต์มาส', origin: 'James Lord Pierpont (เสียชีวิต ค.ศ. 1893)', tempo: 110, beats: 4,
    mel: ['3 3 3 - | 3 3 3 - | 3 5 1 -_2 | 3 - - -', '4 4 4 -_4 | 4 3 3 3_3 | 3 2 2 3 | 2 - 5 -',
      '3 3 3 - | 3 3 3 - | 3 5 1 -_2 | 3 - - -', '4 4 4 4 | 4 3 3 3_3 | 5 5 4 2 | 1 - - -'] },
  { id: 'free-birthday', title: 'Happy Birthday (สุขสันต์วันเกิด)', tags: 'happy birthday วันเกิด', origin: 'Mildred & Patty Hill (เสียชีวิต ค.ศ. 1916, 1946)', tempo: 100, beats: 3,
    mel: ["0 0 5_5 | 6 5 1' | 7 - 5_5 | 6 5 2'", "1' - 5_5 | 5' 3' 1' | 7 6 4'_4' | 3' 1' 2' | 1' - -"] },
  { id: 'free-wewish', title: 'We Wish You a Merry Christmas', tags: 'we wish you merry christmas คริสต์มาส', origin: 'เพลงพื้นบ้านอังกฤษ', tempo: 110, beats: 3,
    mel: ['0 0 5, | 1 1_2 1_7, | 6, 6, 6, | 2 2_3 2_1', '7, 5, 5, | 3 3_4 3_2 | 1 6, 5,_5, | 6, 2 7, | 1 - -'] },
  { id: 'free-macdonald', title: 'Old MacDonald Had a Farm', tags: 'old macdonald farm ฟาร์ม', origin: 'เพลงพื้นบ้านอเมริกัน', tempo: 110, beats: 4,
    mel: ['1 1 1 5, | 6, 6, 5, - | 3 3 2 2 | 1 - - 5,', '1 1 1 5, | 6, 6, 5, - | 3 3 2 2 | 1 - - -'] },
  { id: 'free-yankee', title: 'Yankee Doodle', tags: 'yankee doodle', origin: 'เพลงพื้นบ้านอเมริกัน ศตวรรษที่ 18', tempo: 110, beats: 4,
    mel: ['1 1 2 3 | 1 3 2 5, | 1 1 2 3 | 1 - 7, -', '1 1 2 3 | 4 3 2 1 | 7, 5, 6, 7, | 1 - 1 -'] }
];

function freeSongText(f) {
  return ['@title ' + f.title, '@tempo ' + f.tempo, '@beats ' + f.beats].concat(...f.mel.map(l => ['', l])).join('\n');
}
function freeSong(f, tuning) {
  const r = refitSong(importText(freeSongText(f), {}).song, tuning);
  r.song.id = f.id;
  return r;
}
/* @@MIDI-END */

/* @@PITCH-START  microphone note detection for a real kalimba. Pure: no DOM, testable in node. */
// Tines keep ringing after they are plucked, so a plain pitch tracker sees a chord. Instead every frame
// measures the energy at each semitone (Goertzel, Hann window) and a pluck is the semitone whose energy
// jumps the most; the tuner then scans ±50 cents around it.
const MIC_MIDI_LO = 55, MIC_MIDI_HI = 90;   // G3–F#6: covers the 17-key kalimba with room for detuning

// 2nd-order Butterworth low-pass (same response as a Web Audio "lowpass" biquad at Q 0.7071); run twice it
// tames the kalimba's metallic 6.5x partial
function makeLowpass(sampleRate, fc) {
  const w = 2 * Math.PI * fc / sampleRate, al = Math.sin(w) / (2 * Math.SQRT1_2), cw = Math.cos(w), a0 = 1 + al;
  const b0 = (1 - cw) / 2 / a0, b1 = (1 - cw) / a0, a1 = -2 * cw / a0, a2 = (1 - al) / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return x => { const y = b0 * x + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}
const MIC_LOWPASS_HZ = 1600;
const DRIFT_LO = Math.pow(2, -20 / 1200), DRIFT_HI = Math.pow(2, 20 / 1200);   // the extra measuring points around each semitone
const MIC_WINDOW = 4096;   // ≈85 ms at 48 kHz: long enough to tell C4 from C#4

const hannCache = {};
function hann(n) {
  if (!hannCache[n]) { const w = new Float32Array(n); for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)); hannCache[n] = w; }
  return hannCache[n];
}
// amplitude of the sinusoid at freq in buf (Hann-windowed Goertzel)
function toneAmp(buf, sampleRate, freq) {
  const n = buf.length, w = hann(n), k = 2 * Math.cos(2 * Math.PI * freq / sampleRate);
  let s1 = 0, s2 = 0;
  for (let i = 0; i < n; i++) { const s = buf[i] * w[i] + k * s1 - s2; s2 = s1; s1 = s; }
  return 4 * Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - k * s1 * s2)) / n;
}
function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

// cents offset of the strongest tone within ±50 cents of midi
function centsNear(buf, sampleRate, midi) {
  let best = -50, bestA = -1;
  const amps = [];
  for (let c = -50; c <= 50; c += 5) {
    const a = toneAmp(buf, sampleRate, midiHz(midi) * Math.pow(2, c / 1200));
    amps.push(a);
    if (a > bestA) { bestA = a; best = c; }
  }
  const i = (best + 50) / 5, l = amps[i - 1], r = amps[i + 1];
  if (l == null || r == null) return best;
  const den = l + r - 2 * bestA;
  return Math.round(best + (den ? 5 * (l - r) / (2 * den) : 0));
}

function rmsOf(buf) { let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]; return Math.sqrt(s / buf.length); }

// feed() one analysis frame (Float32Array of MIC_WINDOW samples, low-passed) every hop seconds;
// returns { midi, cents, t } for each pluck, about 0.1 s after it. level() reports the strongest
// semitone right now for the tuner display.
// A pluck is first noticed as energy growing anywhere; the note is decided once a whole window lies after
// the pluck, by comparing it with the quietest level each semitone had since just before the pluck. That
// lowest level also catches re-plucking a ringing tine: the finger damps it for a moment, then it rings again.
function makeKeyListener(sampleRate, opt) {
  opt = opt || {};
  const lo = opt.lo || MIC_MIDI_LO, hi = opt.hi || MIC_MIDI_HI, minAmp = opt.minAmp || 0.006;
  const hop = opt.hop || 0.025, win = (opt.win || MIC_WINDOW) / sampleRate;
  const settle = Math.ceil(win / hop) + 1;    // frames until a window holds only post-pluck sound
  const hist = [];                            // { e, top } per frame, newest last
  let pending = null, now = null, frameNo = 0, decided = -1;
  return {
    feed(frame, t) {
      const e = new Float32Array(hi - lo + 1);
      let top = 0;
      // each semitone is measured at three frequencies (-20, 0, +20 cents) and keeps the strongest: a tine that has drifted
      // flat or sharp (they do while a kalimba is played) would otherwise fall outside the narrow Hann window of the
      // exact semitone and a high key more than ~35 cents off was not heard at all
      for (let m = lo; m <= hi; m++) {
        const f = midiHz(m);
        const a = Math.max(toneAmp(frame, sampleRate, f), toneAmp(frame, sampleRate, f * DRIFT_LO), toneAmp(frame, sampleRate, f * DRIFT_HI));
        e[m - lo] = a; if (a > top) top = a;
      }
      hist.push({ e, top, n: frameNo++ });
      if (hist.length > settle + 4) hist.shift();
      now = top > minAmp ? { e, top } : null;
      const back = k => hist[hist.length - 1 - k];

      if (pending) {
        for (let i = 0; i < e.length; i++) if (e[i] < pending.low[i]) pending.low[i] = e[i];
        if (frameNo - 1 - pending.at < settle) return null;
        const low = pending.low, inc = e.map((v, i) => v - low[i]);
        pending = null; decided = frameNo - 1;
        let best = -1, bestInc = 0;
        for (let i = 0; i < e.length; i++) {
          // the plucked semitone grows more than its neighbours, which only pick up leakage from it
          if (inc[i] > bestInc && inc[i] >= (i ? inc[i - 1] : 0) && inc[i] >= (i + 1 < e.length ? inc[i + 1] : 0)) { bestInc = inc[i]; best = i; }
        }
        if (best < 0 || bestInc < Math.max(minAmp, 0.2 * top)) return null;
        // plucks at the same moment (a bass note with a melody note, two thumbs): other keys that grew nearly as much as the strongest
        // are heard too (at most two more, never next to one already taken: a neighbour only carries leakage)
        const more = [], taken = [best];
        const cand = [];
        for (let i = 0; i < e.length; i++) {
          if (i === best || inc[i] < Math.max(minAmp, 0.4 * bestInc)) continue;
          if (inc[i] >= (i ? inc[i - 1] : 0) && inc[i] >= (i + 1 < e.length ? inc[i + 1] : 0)) cand.push(i);
        }
        cand.sort((a, b) => inc[b] - inc[a]).forEach(i => {
          if (more.length < 2 && taken.every(k => Math.abs(k - i) > 1)) { taken.push(i); more.push({ midi: lo + i, cents: centsNear(frame, sampleRate, lo + i) }); }
        });
        return { midi: lo + best, cents: centsNear(frame, sampleRate, lo + best), t, more };
      }
      const bk = back(Math.min(settle - 1, 4));   // a window from before the pluck, ≈0.1 s back
      if (!bk || bk.n < decided) return null;     // compare only with windows after the last pluck
      let rise = 0;
      for (let i = 0; i < e.length; i++) {
        rise = Math.max(rise, e[i] - 1.2 * bk.e[i]);
        // a dip and recovery counts only on a tine that was really ringing (a peak), not on the
        // beating between two ringing neighbours
        if (bk.e[i] >= (bk.e[i - 1] || 0) && bk.e[i] >= (bk.e[i + 1] || 0)) {
          let dip = bk.e[i];
          for (let k = 1; k < 4; k++) if (back(k) && back(k).e[i] < dip) dip = back(k).e[i];
          rise = Math.max(rise, e[i] - 1.5 * dip);
        }
      }
      if (rise > Math.max(minAmp, 0.12 * top)) {   // relative threshold: ringing tines wobble a little
        const low = Float32Array.from(bk.e);
        for (let k = 0; k < 4; k++) { const f = back(k); if (f) for (let i = 0; i < e.length; i++) if (f.e[i] < low[i]) low[i] = f.e[i]; }
        pending = { at: frameNo - 1, low };
      }
      return null;
    },
    level(frame) {
      if (!now) return null;
      let bi = 0;
      for (let i = 1; i < now.e.length; i++) if (now.e[i] > now.e[bi]) bi = i;
      return { midi: lo + bi, cents: centsNear(frame, sampleRate, lo + bi), amp: now.top };
    }
  };
}
// The tuner's target mode: how many cents the strongest tone within ±span cents of midi is above (+) or below (-) it. Unlike centsNear this
// reaches a whole semitone and more (a tine tuned far off). null when there is no clear single tone (silence, noise).
function centsAround(buf, sampleRate, midi, span) {
  span = span || 400;
  const f0 = midiHz(midi), cs = [], amps = [];
  for (let c = -span; c <= span; c += 16) { cs.push(c); amps.push(toneAmp(buf, sampleRate, f0 * Math.pow(2, c / 1200))); }   // coarse: every 16 cents
  let bi = 0;
  for (let i = 1; i < amps.length; i++) if (amps[i] > amps[bi]) bi = i;
  const sorted = amps.slice().sort((a, b) => a - b), med = sorted[sorted.length >> 1];
  if (amps[bi] < 0.003 || amps[bi] < 5 * (med + 1e-9)) return null;
  const fine = [];
  for (let c = cs[bi] - 16; c <= cs[bi] + 16; c += 4) fine.push([c, toneAmp(buf, sampleRate, f0 * Math.pow(2, c / 1200))]);
  let fb = 0;
  for (let i = 1; i < fine.length; i++) if (fine[i][1] > fine[fb][1]) fb = i;
  let cents = fine[fb][0];
  if (fb > 0 && fb < fine.length - 1) {
    const l = fine[fb - 1][1], m = fine[fb][1], r = fine[fb + 1][1], den = l + r - 2 * m;
    if (den) cents += 4 * (l - r) / (2 * den);
  }
  return { cents: Math.round(cents), amp: fine[fb][1], edge: Math.abs(cents) >= span - 16 };
}
/* @@PITCH-END */
