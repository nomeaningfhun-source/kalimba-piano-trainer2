'use strict';
/* Reads a photo of a kalimba number sheet (lyrics, grey melody numbers with ' and " octave marks, red chord
   numbers, underlined red = strum) into the app's 3-line text, fully on the device.
   The page is split by colour and into text rows here; number rows are cut into digits, octave marks and
   underlines by their shapes, so OCR only has to name digits 1-7 and read the Thai lyrics.
   OCR is passed in as ocr(kind, img) → [{ text, x0, x1, y0, y1 }] in img pixels, where kind is
   'line' (one line of Thai/English), 'block' (a few lines) or 'digits' (a row of digits 1-7 and # sharps),
   and img = { w, h, data } is greyscale, 0 = ink, 255 = paper. */
const SheetRead = (() => {
  const RED = 16;          // r - max(g, b) above this = red ink
  const PAPER = 215;       // brighter than this = paper
  const ON = 110;          // ink strength that counts as a pixel of a glyph
  const REST_GAP = 3.5;    // a blank this many digit heights wide between melody numbers is a rest (the gaps between words are 2-2.8, a pause between phrases 4+)

  // ink strength 0..255 per pixel, one layer for red ink and one for everything else
  function splitLayers(px, w, h, ch) {
    ch = ch || 4;
    const n = w * h, dark = new Uint8Array(n), red = new Uint8Array(n);
    for (let p = 0, i = 0; p < n; p++, i += ch) {
      const r = px[i], g = px[i + 1], b = px[i + 2], lum = 0.3 * r + 0.59 * g + 0.11 * b;
      if (lum >= PAPER) continue;
      const redness = r - Math.max(g, b), ink = Math.round(255 - Math.max(0, Math.min(255, (lum - 90) * 2.1)));
      // red ink also counts by how red it is, so the thin pale strokes of red digits survive
      if (redness > RED) red[p] = Math.max(ink, Math.min(255, Math.round((redness - 10) * 4.5)));
      else dark[p] = ink;
    }
    eraseRules(dark, w, h);
    return { w, h, dark, red };
  }

  // frames and rules (a page-number box, a link underline) would glue text rows together: wipe long straight runs
  function eraseRules(layer, w, h) {
    const maxV = Math.max(40, Math.round(h * 0.04)), maxH = Math.max(60, Math.round(w * 0.12)), vert = [];
    for (let x = 0; x < w; x++) {
      let y0 = -1;
      for (let y = 0; y <= h; y++) {
        const on = y < h && layer[y * w + x] > ON;
        if (on && y0 < 0) y0 = y;
        if (!on && y0 >= 0) {
          if (y - y0 > maxV) { for (let k = y0; k < y; k++) layer[k * w + x] = 0; vert.push({ x, y0, y1: y - 1 }); }
          y0 = -1;
        }
      }
    }
    // a box (page number, cover photo frame): two upright rules side by side over the same height —
    // wipe what is inside too, or its contents would bridge the gaps between text rows
    vert.forEach((a, i) => vert.slice(i + 1).forEach(b => {
      const top = Math.max(a.y0, b.y0), bot = Math.min(a.y1, b.y1), span = Math.max(a.y1 - a.y0, b.y1 - b.y0);
      if (b.x - a.x < 8 || b.x - a.x > w * 0.4 || bot - top < span * 0.8) return;
      for (let y = top; y <= bot; y++) for (let x = a.x; x <= b.x; x++) layer[y * w + x] = 0;
    }));
    for (let y = 0; y < h; y++) {
      let x0 = -1;
      for (let x = 0; x <= w; x++) {
        const on = x < w && layer[y * w + x] > ON;
        if (on && x0 < 0) x0 = x;
        if (!on && x0 >= 0) { if (x - x0 > maxH) for (let k = x0; k < x; k++) layer[y * w + k] = 0; x0 = -1; }
      }
    }
  }

  // horizontal text rows; slivers (Thai tone marks, octave marks, underlines) join the row they touch
  function findRows(layer, w, h) {
    const cnt = new Array(h).fill(0);
    for (let y = 0; y < h; y++) { let c = 0; for (let i = y * w, e = i + w; i < e; i++) if (layer[i] > ON) c++; cnt[y] = c; }
    let rows = [], y0 = -1;
    for (let y = 0; y <= h; y++) {
      const on = y < h && cnt[y] >= 2;
      if (on && y0 < 0) y0 = y;
      if (!on && y0 >= 0) { if (y - y0 >= 2) rows.push({ y0, y1: y - 1 }); y0 = -1; }
    }
    if (!rows.length) return rows;
    // typical text height, ignoring slivers
    let hs = rows.map(r => r.y1 - r.y0 + 1).filter(v => v >= 6).sort((a, b) => a - b);
    if (!hs.length) hs = [8];
    const med = hs[hs.length >> 1];
    for (let k = 0; k < 2; k++) {
      const out = [];
      rows.forEach(r => {
        const last = out[out.length - 1], hr = r.y1 - r.y0 + 1, hl = last ? last.y1 - last.y0 + 1 : 0;
        if (last && r.y0 - last.y1 - 1 <= Math.max(2, med * 0.35) && (hr < med * 0.55 || hl < med * 0.55)) last.y1 = r.y1;
        else out.push({ y0: r.y0, y1: r.y1 });
      });
      rows = out;
    }
    return rows.map(r => {
      let x0 = w, x1 = -1;
      for (let y = r.y0; y <= r.y1; y++) for (let x = 0, i = y * w; x < w; x++, i++) if (layer[i] > ON) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
      return { y0: r.y0, y1: r.y1, x0, x1, hgt: r.y1 - r.y0 + 1, med };
    }).filter(r => r.x1 >= r.x0);
  }

  // 8-connected glyph pieces of a binary sub-image whose top-left sits at (ox, oy) on the page
  function components(bin, W, H, ox, oy) {
    const seen = new Uint8Array(W * H), out = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (seen[y * W + x] || !bin[y * W + x]) continue;
      const st = [x, y]; seen[y * W + x] = 1;
      const c = { x0: x, x1: x, y0: y, y1: y, n: 0, px: [] };
      while (st.length) {
        const cy = st.pop(), cx = st.pop();
        c.n++; c.px.push(cx, cy);
        if (cx < c.x0) c.x0 = cx; if (cx > c.x1) c.x1 = cx; if (cy < c.y0) c.y0 = cy; if (cy > c.y1) c.y1 = cy;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || !bin[ny * W + nx]) continue;
          seen[ny * W + nx] = 1; st.push(nx, ny);
        }
      }
      out.push(Object.assign(c, { x0: c.x0 + ox, x1: c.x1 + ox, y0: c.y0 + oy, y1: c.y1 + oy, rx: ox, ry: oy }));
    }
    return out.sort((a, b) => a.x0 - b.x0);
  }

  // a number row as pieces: digits (tall), octave marks (small, high up) and underlines (long flat runs,
  // taken out first so a line touching the digits does not glue them together)
  function numberPieces(layer, w, r) {
    const W = r.x1 - r.x0 + 1, H = r.y1 - r.y0 + 1, bin = new Uint8Array(W * H), lines = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) bin[y * W + x] = layer[(r.y0 + y) * w + r.x0 + x] > ON ? 1 : 0;
    const longRun = Math.max(8, r.med * 1.3), edgeRun = Math.max(8, r.med * 0.8);
    for (let y = Math.floor(H * 0.5); y < H; y++) {
      // the last rows of the row are where an underline sits: a shorter run counts there (digit feet are narrower)
      const need = y >= H - 4 ? edgeRun : longRun;
      let x0 = -1;
      for (let x = 0; x <= W; x++) {
        const on = x < W && bin[y * W + x];
        if (on && x0 < 0) x0 = x;
        if (!on && x0 >= 0) {
          if (x - x0 >= need) {
            for (let k = x0; k < x; k++) bin[y * W + k] = 0;
            const l = lines.find(q => q.x0 < r.x0 + x && q.x1 > r.x0 + x0);
            if (l) { l.x0 = Math.min(l.x0, r.x0 + x0); l.x1 = Math.max(l.x1, r.x0 + x - 1); }
            else lines.push({ x0: r.x0 + x0, x1: r.x0 + x - 1 });
          }
          x0 = -1;
        }
      }
    }
    // a faint digit can break into pieces stacked above each other: glue pieces that share most of their width
    const cs = [];
    components(bin, W, H, r.x0, r.y0).filter(c => c.n >= 3).forEach(c => {
      const o = cs.find(q => Math.min(q.x1, c.x1) - Math.max(q.x0, c.x0) + 1 >= 0.5 * Math.min(q.x1 - q.x0 + 1, c.x1 - c.x0 + 1));
      if (!o) { cs.push(c); return; }
      o.px = o.px.concat(c.px);   // both use the row's sub-image coordinates
      o.x0 = Math.min(o.x0, c.x0); o.x1 = Math.max(o.x1, c.x1); o.y0 = Math.min(o.y0, c.y0); o.y1 = Math.max(o.y1, c.y1); o.n += c.n;
    });
    if (!cs.length) return { digits: [], lines, dh: r.med };
    const tall = cs.map(c => c.y1 - c.y0 + 1).sort((a, b) => b - a);
    const dh = tall[Math.min(tall.length - 1, Math.floor(tall.length * 0.25))];   // digit height
    const digits = [], marks = [];
    cs.forEach(c => {
      if (c.y1 - c.y0 + 1 >= dh * 0.6) digits.push(c);
      else if (c.y1 < r.y0 + (r.y1 - r.y0) * 0.75) marks.push(c);
    });
    // each octave mark belongs to the digit on its left
    digits.forEach(d => { d.marks = 0; d.right = d.x1; });
    marks.forEach(m => {
      let owner = null;
      digits.forEach(d => { if (d.x0 <= m.x0) owner = d; });
      if (owner && m.x0 - owner.x1 < dh * 0.9) { owner.marks++; owner.right = Math.max(owner.right, m.x1); }
    });
    return { digits, lines, dh };
  }

  // digits pasted on a clean strip with even spacing, so OCR returns one character per digit.
  // opt changes how the same digits are drawn (spacing, stroke thickness) so a second reading can differ from the first
  function digitStrip(digits, dh, opt) {
    opt = opt || {};
    const gap = Math.round(dh * (opt.gap || 0.6)), pad = Math.round(dh * (opt.pad || 0.5));
    let wsum = 0;
    digits.forEach(d => { wsum += d.x1 - d.x0 + 1; });
    const W = wsum + gap * (digits.length - 1) + pad * 2, H = dh + pad * 2;
    let data = new Uint8Array(W * H).fill(255);
    let x = pad;
    digits.forEach(d => {
      const top = pad + (dh - (d.y1 - d.y0 + 1));
      for (let i = 0; i < d.px.length; i += 2) {
        const X = x + d.px[i] + d.rx - d.x0, Y = top + d.px[i + 1] + d.ry - d.y0;
        if (X >= 0 && X < W && Y >= 0 && Y < H) data[Y * W + X] = 0;
      }
      x += d.x1 - d.x0 + 1 + gap;
    });
    for (let k = 0; k < (opt.dilate || 0); k++) {       // thicker strokes: faint, thin digits read better
      const out = data.slice();
      for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
        if (data[y * W + xx] === 0) continue;
        if ((xx > 0 && !data[y * W + xx - 1]) || (xx < W - 1 && !data[y * W + xx + 1]) || (y > 0 && !data[(y - 1) * W + xx]) || (y < H - 1 && !data[(y + 1) * W + xx])) out[y * W + xx] = 0;
      }
      data = out;
    }
    return { w: W, h: H, data };
  }

  // the same row written in several ways; reading them all and keeping the most common answer fixes a digit that
  // one way of drawing makes unclear (a pale 5 read as 2)
  const VARIANTS = [
    {}, { dilate: 1 }, { gap: 1, pad: 0.8 }, { rev: true, dilate: 1 },
    { gap: 0.4 }, { dilate: 2 }, { gap: 1.4, dilate: 1 }, { rev: true, gap: 0.9 }
  ];
  async function stripText(digits, dh, ocr, opt) {
    const ds = opt && opt.rev ? digits.slice().reverse() : digits;
    const t = (await ocr('digits', digitStrip(ds, dh, opt))).map(x => x.text).join('').replace(/[^1-7#]/g, '');
    return opt && opt.rev ? t.split('').reverse().join('') : t;
  }
  const best = votes => {
    const ks = Object.keys(votes).sort((a, b) => votes[b] - votes[a]);
    return ks.length && votes[ks[0]] >= 2 && (ks.length < 2 || votes[ks[0]] > votes[ks[1]]) ? ks[0] : null;
  };

  // careful = pale ink (chords): read in at least three ways. Otherwise one reading, more only when it looks wrong.
  async function readDigits(digits, dh, ocr, careful) {
    if (!digits.length) return [];
    const n = digits.length, reads = [], sure = new Array(n).fill(null);
    const decide = () => {
      for (let i = 0; i < n; i++) { const v = {}; reads.forEach(r => { v[r[i]] = (v[r[i]] || 0) + 1; }); sure[i] = best(v); }
      return sure.every(c => c);
    };
    let k = 0;
    const next = async () => { const s = await stripText(digits, dh, ocr, VARIANTS[k++]); if (s.length === n) reads.push(s.split('')); };
    await next();
    if (!careful && reads.length === 1) return reads[0];
    // everything but the first reading is repeated until the votes settle
    const first = k;
    while (k < VARIANTS.length) {
      await next();
      if (k - first >= 2 && reads.length >= 3 && decide()) return sure.slice();
    }
    if (reads.length >= 2) decide();
    if (sure.every(c => c)) return sure.slice();
    // still unsure: each unsure digit is read alone, written three times plain and three times thickened
    const one = [];
    for (let i = 0; i < n; i++) {
      if (sure[i]) { one.push(sure[i]); continue; }
      const d = digits[i], votes = {};
      for (const opt of [{}, { dilate: 1 }]) {
        (await stripText([d, d, d], dh, ocr, opt)).split('').forEach(c => { votes[c] = (votes[c] || 0) + 1; });
      }
      // an earlier reading of this position counts too
      reads.forEach(r => { votes[r[i]] = (votes[r[i]] || 0) + 1; });
      one.push(best(votes) || '?');
    }
    return one;
  }

  // a number row → tokens with x positions; adjacent numbers (no space) share one token like 2'2'
  async function readNumberRow(layer, w, r, ocr, isChord) {
    const { digits, lines, dh } = numberPieces(layer, w, r);
    const names = await readDigits(digits, dh, ocr, isChord);
    const toks = [];
    let sharp = null, prev = null;
    digits.forEach((d, i) => {
      // a sharp sign goes with the number it touches: before it (#4) or after it and its marks (4#, 5'#)
      if (names[i] === '#') {
        const next = digits.slice(i + 1).find((x, k) => names[i + 1 + k] !== '#');
        const gPrev = prev ? d.x0 - prev.right : Infinity, gNext = next ? next.x0 - d.x1 : Infinity;
        const last = toks[toks.length - 1];
        if (last && gPrev < dh * 0.6 && gPrev <= gNext) { last.t = last.t.replace(/([1-7]'*)$/, '#$1'); last.right = Math.max(last.right, d.x1); }
        else sharp = d;
        return;
      }
      prev = d;
      const lead = sharp && d.x0 - sharp.x1 < dh * 0.6 ? sharp : null;
      sharp = null;
      const note = (lead ? '#' : '') + names[i] + (d.marks >= 2 ? "''" : d.marks === 1 ? "'" : '');
      const x0 = lead ? lead.x0 : d.x0, last = toks[toks.length - 1];
      const gap = last ? x0 - last.right : Infinity;
      // chords are written without spaces (135); melody numbers without a space share a beat
      if (last && gap < dh * (isChord ? 0.45 : 0.22)) { last.t += note; last.x1 = d.x1; last.right = d.right; }
      else toks.push({ t: note, x0, x1: d.x1, right: d.right });
    });
    if (isChord) toks.forEach(t => { t.strum = lines.some(l => l.x0 <= t.x0 + 2 && l.x1 >= t.x1 - 2); });
    else {
      // numbers far off to the right (a page-number box) are not part of the melody
      for (let i = 1; i < toks.length; i++) if (toks[i].x0 - toks[i - 1].right > dh * 10) { toks.length = i; break; }
      // a wide blank (the writer left a gap on purpose) is a rest of one beat: written 0, and it sits in the gap
      for (let i = toks.length - 1; i >= 1; i--) {
        const a = toks[i - 1], b = toks[i];
        if (b.x0 - a.right >= dh * REST_GAP) toks.splice(i, 0, { t: '0', x0: a.right + 1, x1: b.x0 - 1, right: b.x0 - 1, rest: true });
      }
    }
    return toks;
  }

  const THAI = /[฀-๿]/g, LATIN = /[A-Za-z]/g, DIGIT = /[0-9]/g;
  function classify(text) {
    const th = (text.match(THAI) || []).length, la = (text.match(LATIN) || []).length, di = (text.match(DIGIT) || []).length;
    if (la >= 4 && la > di * 0.5) return 'other';      // a header line like "123 Melody, 123 Chord"
    if (di >= 2 && di >= th) return 'melody';
    if (th >= 2 && th >= la) return 'lyric';
    return 'other';
  }

  // OCR spells sara am as nikhahit + sara aa
  const thaiText = s => s.replace(/\s+/g, '').replace(/ํา/g, 'ำ');

  // lyric row → word groups at wide blank gaps, each with the OCR text nearest to it
  function lyricGroups(layer, w, r, words) {
    const cols = [];
    for (let x = r.x0; x <= r.x1; x++) {
      let on = false;
      for (let y = r.y0; y <= r.y1 && !on; y++) if (layer[y * w + x] > ON) on = true;
      cols.push(on);
    }
    const minGap = Math.max(7, r.hgt * 0.45), groups = [];
    let start = -1, blank = 0;
    cols.forEach((on, i) => {
      if (on) { if (start < 0) start = i; else if (blank >= minGap) { groups.push({ x0: r.x0 + start, x1: r.x0 + i - blank - 1 }); start = i; } blank = 0; }
      else blank++;
    });
    if (start >= 0) groups.push({ x0: r.x0 + start, x1: r.x0 + cols.length - blank - 1 });
    // every OCR word goes to the nearest group, so glyphs at a group's edge are not lost
    groups.forEach(g => { g.words = []; });
    words.forEach(wd => {
      const c = (wd.x0 + wd.x1) / 2;
      let best = null, bd = Infinity;
      groups.forEach(g => { const d = c < g.x0 ? g.x0 - c : c > g.x1 ? c - g.x1 : 0; if (d < bd) { bd = d; best = g; } });
      if (best) best.words.push(wd);
    });
    groups.forEach(g => { g.text = thaiText(g.words.sort((a, b) => a.x0 - b.x0).map(wd => wd.text).join('')); });
    return groups.filter(g => g.text);
  }

  // rows already read → the 3-line text, one block per melody row; rects (if given) gets each block's box on the page
  function assemble(rows, rects) {
    const out = [];
    rows.forEach((m, i) => {
      if (m.kind !== 'melody' || !m.toks.some(t => /[1-7]/.test(t.t))) return;
      let lyr = null;
      for (let k = i - 1; k >= 0; k--) { if (rows[k].kind === 'lyric') { lyr = rows[k]; break; } if (rows[k].kind === 'melody') break; }
      if (lyr && m.y0 - lyr.y1 > m.hgt * 3) lyr = null;
      let next = null;
      for (let k = i + 1; k < rows.length; k++) if (rows[k].kind === 'melody' || rows[k].kind === 'lyric') { next = rows[k]; break; }
      const chords = rows.filter(c => c.kind === 'chord' && c.y0 > m.y0 && (!next || c.y0 < next.y0) && c.y0 - m.y1 < m.hgt * 3)
        .reduce((a, c) => a.concat(c.toks), []);
      const toks = m.toks, lg = lyr ? lyr.groups : [];
      // each lyric group claims the numbers under it
      const owner = toks.map(tk => {
        if (tk.rest) return null;     // takes its neighbour's word below
        const cx = (tk.x0 + tk.x1) / 2;
        let best = -1, bd = Infinity;
        lg.forEach((g, gi) => { const d = cx < g.x0 ? g.x0 - cx : cx > g.x1 ? cx - g.x1 : 0; if (d < bd) { bd = d; best = gi; } });
        return best;
      });
      owner.forEach((o, k) => { if (o === null) owner[k] = k ? owner[k - 1] : -1; });   // a rest stays with the number before it
      const melGroups = [], lyrGroups = [];
      toks.forEach((tk, k) => {
        if (k === 0 || owner[k] !== owner[k - 1]) { melGroups.push([]); lyrGroups.push(owner[k] >= 0 ? lg[owner[k]].text : '~'); }
        melGroups[melGroups.length - 1].push(tk.t);
      });
      // a chord is played with the last number starting at or before its middle (never with a rest)
      const chd = toks.map(() => '.');
      chords.forEach(c => {
        const cx = (c.x0 + c.x1) / 2;
        let k = toks.findIndex(tk => !tk.rest);
        toks.forEach((tk, j) => { if (!tk.rest && tk.x0 <= cx + 2) k = j; });
        if (chd[k] === '.') chd[k] = c.t + (c.strum ? '~' : '');
      });
      out.push([lyrGroups.join(' '), melGroups.map(g => g.join(' ')).join('   '), chd.join(' ')].join('\n'));
      if (rects) {
        const parts = [m].concat(lyr ? [lyr] : [], rows.filter(c => c.kind === 'chord' && c.toks.some(t => chords.includes(t))));
        rects.push({ x0: Math.min(...parts.map(r => r.x0)), x1: Math.max(...parts.map(r => r.x1)),
          y0: Math.min(...parts.map(r => r.y0)), y1: Math.max(...parts.map(r => r.y1)) });
      }
    });
    return out.join('\n\n');
  }

  function crop(layer, w, r, pad) {
    const h = layer.length / w, x0 = Math.max(0, r.x0 - pad), y0 = Math.max(0, r.y0 - pad);
    const W = Math.min(w - 1, r.x1 + pad) - x0 + 1, H = Math.min(h - 1, r.y1 + pad) - y0 + 1, data = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) data[y * W + x] = 255 - layer[(y0 + y) * w + x0 + x];
    return { w: W, h: H, data, ox: x0, oy: y0 };
  }
  const shift = (words, img) => words.map(x => Object.assign({}, x, { x0: x.x0 + img.ox, x1: x.x1 + img.ox, y0: x.y0 + img.oy, y1: x.y1 + img.oy }));

  // the whole page: { data, width, height, channels } → { text, title }
  async function read(page, ocr, onProgress) {
    const L = splitLayers(page.data, page.width, page.height, page.channels);
    const dRows = findRows(L.dark, L.w, L.h), rRows = findRows(L.red, L.w, L.h);
    const med = dRows.length ? dRows[0].med : 20, total = dRows.length + rRows.length;
    let done = 0, seenMelody = false;
    const tick = () => onProgress && onProgress(++done / total), heads = [];
    const tidy = t => thaiText(t.replace(/\s+(?=[฀-๿])|(?<=[฀-๿])\s+/g, ' ')).replace(/[^฀-๿A-Za-z0-9 .,'()&-].*$/, '').trim();
    for (const r of dRows) {
      if (r.hgt > med * 2.6) {
        // title and cover photo side by side: every line with words is a title candidate
        r.kind = 'tall';
        if (!seenMelody) {
          (await ocr('block', crop(L.dark, L.w, r, 4))).forEach(x => {
            if (/[฀-๿A-Za-z]{3}/.test(x.text.replace(/\s+/g, ''))) heads.push({ text: tidy(x.text), size: x.y1 - x.y0, y: r.y0 + x.y0 });
          });
        }
        tick(); continue;
      }
      const img = crop(L.dark, L.w, r, 4), words = shift(await ocr('line', img), img);
      r.kind = classify(words.map(x => x.text).join(' '));
      if (r.kind === 'melody') { r.toks = await readNumberRow(L.dark, L.w, r, ocr, false); seenMelody = true; }
      else if (r.kind === 'lyric') r.groups = lyricGroups(L.dark, L.w, r, words);
      if (!seenMelody && r.kind !== 'melody' && r.hgt > med * 1.4) heads.push({ text: tidy(words.map(x => x.text).join(' ')), size: r.hgt, y: r.y0 });
      tick();
    }
    // the title is the first big writing above the first numbers
    const hs = heads.filter(h => h.text.length >= 2).sort((a, b) => a.y - b.y);
    const title = ((hs.find(h => h.size >= med * 1.8) || hs.slice().sort((a, b) => b.size - a.size)[0]) || {}).text || '';
    for (const r of rRows) {
      r.kind = r.hgt > med * 2.6 ? 'tall' : 'chord';
      r.toks = r.kind === 'chord' ? await readNumberRow(L.red, L.w, r, ocr, true) : [];
      tick();
    }
    const rows = dRows.concat(rRows).sort((a, b) => a.y0 - b.y0), rects = [];
    return { text: assemble(rows, rects), title, rows, rects };
  }

  return { splitLayers, findRows, components, numberPieces, readNumberRow, classify, lyricGroups, assemble, read };
})();
if (typeof module !== 'undefined') module.exports = SheetRead;
