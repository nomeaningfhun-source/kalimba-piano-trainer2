/* Kalimba looks. Independent choices:
     material  - golden teak, walnut, mahogany, maple, ebony, clear acrylic, rose acrylic: the surface (real wood grain, or see-through acrylic) AND the sound
     shape     - flat board, resonator box, curved: the outline, AND a body resonance in the sound
     keys      - the colour set of the tines (and of the falling notes)
     chain     - a necklace draped across the tines (pearl, gold crystal, silver pearls)
     art       - a pattern on the body (sakura, engraved deer, moon and stars)
   Free: golden teak + flat board + the Aurora and Mocha key colours. The rest is for members (the member code that unlocks MIDI import unlocks
   it too, until a real membership system exists). A choice the device is not unlocked for falls back to the free one. Kept in kt.mat,
   kt.shape, kt.keys, kt.chain, kt.art. */

const MATERIALS = [
  // the default: the warm teak colour Fun picked (sampled from her wood swatch and her own kalimba)
  { id: 'teak', premium: false, wood: true, name: { th: 'ไม้สักทอง', en: 'Golden teak' },
    body: ['#93571F', '#804B18', '#6C3D11'], border: '#4A2808', ink: 'rgba(252,238,220,.86)', hole: ['#2F1A08', '#1F1005'], holeInk: '#FCEEDC', backdrop: '#3A2008',
    grain: { dark: [72, 36, 8], light: [176, 108, 46], seed: 5, fx: 0.075, wave: 0.8 },
    sound: { decay: 1.0, partial: 0.8, ratio: 6.52, tone: 6800 } },
  { id: 'walnut', premium: true, wood: true, name: { th: 'ไม้วอลนัท', en: 'Walnut' },
    body: ['#7A5440', '#684633', '#573828'], border: '#3F2A1E', ink: 'rgba(245,236,224,.82)', hole: ['#2C1D14', '#1E130D'], holeInk: '#F5ECE0', backdrop: '#2E2018',
    grain: { dark: [46, 28, 18], light: [150, 104, 72], seed: 3, fx: 0.07, wave: 0.9 },
    sound: { decay: 1.0, partial: 0.8, ratio: 6.52, tone: 6500 } },
  { id: 'mahogany', premium: true, wood: true, name: { th: 'มะฮอกกานี', en: 'Mahogany' },
    body: ['#86432F', '#713725', '#5B2C1E'], border: '#431E14', ink: 'rgba(252,236,226,.84)', hole: ['#321510', '#220D09'], holeInk: '#FCECE2', backdrop: '#33160F',
    grain: { dark: [60, 20, 12], light: [186, 98, 66], seed: 8, fx: 0.06, wave: 1.1 },
    sound: { decay: 1.1, partial: 0.45, ratio: 6.52, tone: 4300 } },
  { id: 'maple', premium: true, wood: true, name: { th: 'ไม้เมเปิล', en: 'Maple' },
    body: ['#D5AE78', '#C79F66', '#B58B54'], border: '#8F6B3D', ink: 'rgba(60,40,22,.84)', hole: ['#5E4122', '#46301A'], holeInk: '#FBF3E6', backdrop: '#4A3825',
    grain: { dark: [120, 80, 40], light: [244, 220, 180], seed: 12, fx: 0.09, wave: 0.5 },
    sound: { decay: 0.9, partial: 1.15, ratio: 6.52, tone: 9500 } },
  { id: 'ebony', premium: true, wood: true, name: { th: 'ไม้มะเกลือดำ', en: 'Ebony' },
    body: ['#3A3632', '#2E2A27', '#221F1D'], border: '#12100F', ink: 'rgba(240,234,226,.78)', hole: ['#121110', '#0A0908'], holeInk: '#F2EDE2', backdrop: '#161412',
    grain: { dark: [8, 7, 6], light: [92, 80, 70], seed: 21, fx: 0.11, wave: 0.6 },
    sound: { decay: 1.3, partial: 1.25, ratio: 6.52, tone: 8000 } },
  { id: 'acrylic', premium: true, wood: false, glassy: true, name: { th: 'อะคริลิคใส', en: 'Clear acrylic' },
    body: ['rgba(214,232,246,.46)', 'rgba(190,214,236,.40)', 'rgba(170,198,226,.36)'], border: 'rgba(255,255,255,.7)', ink: 'rgba(40,60,84,.82)',
    hole: ['rgba(60,86,116,.55)', 'rgba(40,62,90,.65)'], holeInk: '#F3F8FD', backdrop: '#56677A',
    sound: { decay: 1.55, partial: 1.9, ratio: 5.4, tone: 13000 } },
  { id: 'acrylic-rose', premium: true, wood: false, glassy: true, name: { th: 'อะคริลิคสีชมพู', en: 'Rose acrylic' },
    body: ['rgba(248,206,218,.5)', 'rgba(240,186,204,.44)', 'rgba(230,168,190,.4)'], border: 'rgba(255,255,255,.7)', ink: 'rgba(110,40,62,.82)',
    hole: ['rgba(140,60,86,.55)', 'rgba(110,40,66,.65)'], holeInk: '#FFF4F7', backdrop: '#6E4A58',
    sound: { decay: 1.4, partial: 1.5, ratio: 5.7, tone: 12000 } }
];
const SHAPES = [
  { id: 'board', premium: false, name: { th: 'แผ่นบาง', en: 'Flat board' }, sound: { decay: 1.0, partial: 1.0, body: null } },
  { id: 'box', premium: true, name: { th: 'กล่องมีรูเสียง', en: 'Resonator box' }, sound: { decay: 1.12, partial: 0.9, body: { f: 230, q: 2.2, g: 5 } } },
  { id: 'curve', premium: true, name: { th: 'ทรงโค้ง', en: 'Curved' }, sound: { decay: 1.0, partial: 1.05, body: { f: 330, q: 1.4, g: 3 } } }
];
const KEYSETS = [
  { id: 'aurora', premium: false, name: { th: 'ออโรรา', en: 'Aurora' },
    tine: { L: ['#D3F0E1', '#A5E6CF', '#5ED4B8', '#46A593'], R: ['#C9D9EC', '#98B9E4', '#7B76D0', '#6A5092'], C: '#F7F7F5' }, hand: { L: '#8FD6C0', R: '#9DB2E0', C: '#F1F3F4' } },
  { id: 'mocha', premium: false, name: { th: 'มอคค่า', en: 'Mocha' },
    tine: { L: ['#E9DCCB', '#8F6B4C'], R: ['#DDDAD4', '#3E3F40'], C: '#FBF8F2' }, hand: { L: '#D9C9B8', R: '#BDB9B2', C: '#F1ECE2' } },
  { id: 'sunrise', premium: true, name: { th: 'ซันไรซ์', en: 'Sunrise' },
    tine: { L: ['#F7D9A8', '#F3A06B', '#E8685F'], R: ['#CDEFE3', '#9CCFE8', '#8E7CD6'], C: '#FFFDF6' }, hand: { L: '#F2B98F', R: '#B7C2EA', C: '#FBF3E6' } },
  { id: 'rosegold', premium: true, name: { th: 'โรสโกลด์', en: 'Rose gold' },
    tine: { L: ['#F6E6CF', '#C47F72'], R: ['#F4E7CB', '#C99A45'], C: '#FFFBF2' }, hand: { L: '#E4B8AC', R: '#E3CB93', C: '#FBF3E6' } },
  { id: 'jewel', premium: true, name: { th: 'จิวเวลรี', en: 'Jewel' },
    tine: { L: ['#F7CDD6', '#D8647C', '#B03A55'], R: ['#C9EEE9', '#4DB5B0', '#167F80'], C: '#FFFDF8' }, hand: { L: '#E58FA1', R: '#74C6C0', C: '#FBF3E6' } },
  { id: 'silver', premium: true, name: { th: 'เงินโลหะ', en: 'Silver' },
    tine: { L: ['#F1F2F4', '#B9BCC2'], R: ['#F1F2F4', '#A3A7AE'], C: '#FFFFFF' }, hand: { L: '#D6D8DC', R: '#C4C7CC', C: '#F1F3F4' } },
  { id: 'pastel', premium: true, name: { th: 'พาสเทล', en: 'Pastel' },
    tine: { L: ['#FCEFE8', '#E1A99B'], R: ['#ECF2F1', '#9DB4B0'], C: '#FFFFFF' }, hand: { L: '#F2CFC5', R: '#CFE0DC', C: '#FFF7F2' } },
  { id: 'midnight', premium: true, name: { th: 'เที่ยงคืน', en: 'Midnight' },
    tine: { L: ['#EEF0F5', '#8A94AA'], R: ['#E4E9F1', '#5C6B86'], C: '#FBFCFE' }, hand: { L: '#C9D0DE', R: '#AEB9CC', C: '#EEF1F7' } }
];
// a necklace across the tines: bead radius as a share of the width, the bead fill, the string colour, strands
const CHAINS = [
  { id: 'none', premium: false, name: { th: 'ไม่มี', en: 'None' } },
  { id: 'pearl', premium: true, name: { th: 'สร้อยไข่มุก', en: 'Pearls' }, r: 0.0125, bead: ['#FFFFFF', '#F1E6DF', '#CDBFB7'], string: '#B9A89E', strands: 1 },
  { id: 'crystal', premium: true, name: { th: 'สร้อยคริสตัลทอง', en: 'Gold crystals' }, r: 0.0098, bead: ['#FFF6D2', '#F0C766', '#B8862B'], string: '#9A7424', strands: 1, sparkle: true },
  { id: 'silver', premium: true, name: { th: 'เงินไข่มุกคู่', en: 'Silver duo' }, r: 0.0088, bead: ['#FFFFFF', '#DDE2E8', '#9AA3AE'], string: '#8E97A3', strands: 2 }
];
const ARTS = [
  { id: 'none', premium: false, name: { th: 'ไม่มี', en: 'None' }, icon: '' },
  { id: 'sakura', premium: true, name: { th: 'ซากุระ', en: 'Sakura' }, icon: '🌸' },
  { id: 'deer', premium: true, name: { th: 'กวางแกะสลัก', en: 'Engraved deer' }, icon: '🦌' },
  { id: 'stars', premium: true, name: { th: 'ดาวและจันทร์', en: 'Moon and stars' }, icon: '🌙' }
];

const Skin = {
  mat: 'teak', shape: 'board', keys: 'aurora', chain: 'none', art: 'none',
  tine: { L: [], R: [], C: '' },    // read live by tineColor() in app.js
  hand: { L: '', R: '', C: '' },    // read live by the falling-notes canvas
  sound: { decay: 1, partial: 1, ratio: 6.52, tone: 6500, body: null },   // read live by kalimbaVoice() in app.js
  member() { if (window.Account && Account.isMember()) return true; try { return JSON.parse(localStorage.getItem('kt.member')) === true; } catch (e) { return false; } },   // signed-in member, or the older device member code
  usable(o) { return !o.premium || this.member(); },
  pick(list, id) { return list.find(x => x.id === id) || list[0]; },
  lists() { return { mat: MATERIALS, shape: SHAPES, keys: KEYSETS, chain: CHAINS, art: ARTS }; },

  // a fine wood grain drawn by the browser: streaks along the board plus a slow wave, in the species' dark and light tones
  woodURI(m) {
    const g = m.grain;
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='360' height='720'>" +
      "<filter id='w' x='0' y='0' width='100%' height='100%'>" +
      "<feTurbulence type='fractalNoise' baseFrequency='0.004 0.003' numOctaves='2' seed='" + (g.seed + 40) + "' result='warp'/>" +
      "<feTurbulence type='fractalNoise' baseFrequency='" + g.fx + " 0.0035' numOctaves='4' seed='" + g.seed + "' stitchTiles='stitch' result='grain'/>" +
      "<feDisplacementMap in='grain' in2='warp' scale='" + Math.round(60 * g.wave) + "' xChannelSelector='R' yChannelSelector='G' result='bent'/>" +
      "<feColorMatrix in='bent' type='matrix' values='0 0 0 0 " + g.dark[0] / 255 + " 0 0 0 0 " + g.dark[1] / 255 + " 0 0 0 0 " + g.dark[2] / 255 + " 0 0 0 -2.6 1.18' result='dk'/>" +
      "<feColorMatrix in='bent' type='matrix' values='0 0 0 0 " + g.light[0] / 255 + " 0 0 0 0 " + g.light[1] / 255 + " 0 0 0 0 " + g.light[2] / 255 + " 0 0 0 1.9 -1.02' result='lt'/>" +
      "<feMerge><feMergeNode in='dk'/><feMergeNode in='lt'/></feMerge></filter>" +
      "<rect width='100%' height='100%' filter='url(%23w)'/></svg>";
    return 'url("data:image/svg+xml;utf8,' + svg.replace(/#/g, '%23') + '")';
  },

  apply() {
    const m = this.pick(MATERIALS, this.mat), sh = this.pick(SHAPES, this.shape), k = this.pick(KEYSETS, this.keys);
    this.mat = m.id; this.shape = sh.id; this.keys = k.id;
    this.chain = this.pick(CHAINS, this.chain).id; this.art = this.pick(ARTS, this.art).id;
    const r = document.documentElement, st = r.style;
    st.setProperty('--kb-1', m.body[0]); st.setProperty('--kb-2', m.body[1]); st.setProperty('--kb-3', m.body[2]); st.setProperty('--kb-b', m.border);
    st.setProperty('--kb-ink', m.ink); st.setProperty('--hole-1', m.hole[0]); st.setProperty('--hole-2', m.hole[1]); st.setProperty('--hole-ink', m.holeInk);
    st.setProperty('--backdrop', m.backdrop);
    st.setProperty('--wood-tex', m.wood ? this.woodURI(m) : 'none');
    r.dataset.mat = m.id; r.dataset.shape = sh.id; r.dataset.glassy = m.glassy ? '1' : '';
    this.tine.L = k.tine.L.slice(); this.tine.R = k.tine.R.slice(); this.tine.C = k.tine.C;
    Object.assign(this.hand, k.hand);
    // the sound: the material sets the ring and the sparkle, the shape adds a body resonance
    const a = m.sound, b = sh.sound;
    this.sound = { decay: a.decay * b.decay, partial: a.partial * b.partial, ratio: a.ratio, tone: a.tone, body: b.body };
  },
  init() {
    const get = (key, list, fallback) => {
      let id = fallback;
      try { id = JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { /* storage blocked */ }
      return this.usable(this.pick(list, id)) ? id : fallback;
    };
    this.mat = get('kt.mat', MATERIALS, 'teak'); this.shape = get('kt.shape', SHAPES, 'board'); this.keys = get('kt.keys', KEYSETS, 'aurora');
    this.chain = get('kt.chain', CHAINS, 'none'); this.art = get('kt.art', ARTS, 'none');
    this.apply();
  },
  choose(kind, id) {
    this[kind] = id;
    this.apply();
    try { localStorage.setItem('kt.' + kind, JSON.stringify(id)); } catch (e) { /* storage blocked */ }
    if (typeof renderKalimba === 'function') renderKalimba();   // redraws the tines and the necklace
    this.art_();
    if (window.KTFall && KTFall.draw) KTFall.draw();
    this.render();
    if (kind === 'mat' || kind === 'shape') { try { audio.init(); audio.playPitch('C5'); setTimeout(() => audio.playPitch('G5'), 260); } catch (e) { /* no sound yet */ } }   // hear what it sounds like
  },

  /* ---- the necklace: beads along a sagging curve over the tines (an overlay inside the tine row, it never takes a tap) ---- */
  decorate() {
    const w = document.getElementById('kalimba-tines-wrapper');
    if (!w) return;
    const old = w.querySelector('.deco-chain');
    if (old) old.remove();
    const c = this.pick(CHAINS, this.chain);
    if (c.id === 'none') return;
    const W = w.clientWidth, H = w.clientHeight;
    if (!W || !H) return;
    const r = Math.max(2.4, Math.min(6.5, W * c.r)), y0 = H * 0.3, sag = H * 0.15;
    const pt = (t, dy) => [(1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * (W / 2) + t * t * W, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y0 + 2 * sag) + t * t * y0 + dy];
    const arc = Math.hypot(W, sag * 1.4) * 1.08, n = Math.max(12, Math.round(arc / (r * 2.15)));
    let g = '<defs><radialGradient id="bd" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="' + c.bead[0] + '"/><stop offset=".55" stop-color="' + c.bead[1] + '"/><stop offset="1" stop-color="' + c.bead[2] + '"/></radialGradient></defs>';
    const offs = c.strands === 2 ? [-r * 1.5, r * 1.5] : [0];
    offs.forEach(dy => {
      const a = pt(0, dy), b = pt(0.5, dy), e = pt(1, dy);
      g += '<path d="M' + a[0] + ' ' + a[1] + ' Q' + (W / 2) + ' ' + (y0 + 2 * sag + dy) + ' ' + e[0] + ' ' + e[1] + '" fill="none" stroke="' + c.string + '" stroke-width="1" opacity=".8"/>';
      for (let i = 0; i <= n; i++) {
        const p = pt(i / n, dy), big = c.sparkle && i % 6 === 3;
        g += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (big ? r * 1.45 : r).toFixed(1) + '" fill="url(#bd)" stroke="rgba(0,0,0,.18)" stroke-width=".6"/>';
        if (c.sparkle && i % 2 === 0) g += '<circle cx="' + (p[0] - r * 0.3).toFixed(1) + '" cy="' + (p[1] - r * 0.35).toFixed(1) + '" r="' + (r * 0.28).toFixed(1) + '" fill="#fff" opacity=".9"/>';
      }
    });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'deco-chain'); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:3;filter:drop-shadow(0 2px 2px rgba(0,0,0,.28))';
    svg.innerHTML = g;
    w.appendChild(svg);
  },

  /* ---- the pattern on the body: drawn behind the sound hole on the Play page ---- */
  artSVG(id) {
    const flower = (x, y, s, rot, f) => {
      let p = '';
      for (let i = 0; i < 5; i++) p += '<ellipse cx="0" cy="-9" rx="6" ry="9.5" fill="' + f + '" transform="rotate(' + i * 72 + ')"/>';
      return '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ') scale(' + s + ')">' + p + '<circle r="2.6" fill="#F7C95C"/></g>';
    };
    const petal = (x, y, s, rot, f) => '<ellipse cx="' + x + '" cy="' + y + '" rx="' + 5 * s + '" ry="' + 8 * s + '" fill="' + f + '" transform="rotate(' + rot + ' ' + x + ' ' + y + ')"/>';
    const wrap = body => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 360" preserveAspectRatio="xMidYMax slice" width="100%" height="100%">' + body + '</svg>';
    if (id === 'sakura') {
      const F = ['#F9B9CB', '#FDE3EB', '#F58FAE', '#FFD1DE'];
      let b = '';
      [[48, 300, 1.5, 10, 0], [352, 312, 1.7, 40, 2], [130, 336, 1.1, 70, 1], [286, 338, 1.2, 20, 3], [200, 262, 0.9, 0, 1], [40, 215, 1.0, 30, 3], [362, 220, 1.0, 55, 0], [100, 250, 0.8, 15, 2], [310, 262, 0.8, 5, 1]]
        .forEach(f => { b += flower(f[0], f[1], f[2], f[3], F[f[4]]); });
      [[80, 190, 1, 30], [150, 215, 0.8, 70], [255, 205, 1, 10], [330, 175, 0.9, 50], [20, 262, 0.8, 80], [385, 270, 0.9, 25], [180, 345, 0.8, 60], [240, 322, 0.7, 5]]
        .forEach((p, i) => { b += petal(p[0], p[1], p[2], p[3], F[i % 4]); });
      return wrap('<g opacity=".92">' + b + '</g>');
    }
    if (id === 'deer') {
      const stroke = (d, c, dx) => '<g transform="translate(' + dx + ' ' + dx + ')" fill="none" stroke="' + c + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' + d + '</g>';
      const antlers = 'M186 238 C170 210 160 184 132 160 M158 190 C140 186 126 172 112 150 M146 170 C150 150 144 132 130 116 M132 160 C118 152 104 150 92 138 M214 238 C230 210 240 184 268 160 M242 190 C260 186 274 172 288 150 M254 170 C250 150 256 132 270 116 M268 160 C282 152 296 150 308 138';
      const face = 'M200 322 L172 250 Q200 232 228 250 Z M170 246 Q150 244 140 258 Q156 266 172 262 M230 246 Q250 244 260 258 Q244 266 228 262';
      const leaves = 'M20 345 C60 300 90 292 130 296 M46 318 q-10 -16 -2 -28 M70 304 q-6 -16 6 -26 M380 345 C340 300 310 292 270 296 M354 318 q10 -16 2 -28 M330 304 q6 -16 -6 -26';
      const eyes = '<circle cx="186" cy="268" r="2.6" fill="CC"/><circle cx="214" cy="268" r="2.6" fill="CC"/><circle cx="200" cy="312" r="3.4" fill="CC"/>';
      return wrap('<g opacity=".62">' + stroke(antlers + face + leaves, 'rgba(255,255,255,.35)', 1.6) + stroke(antlers + face + leaves, 'rgba(18,8,3,.62)', 0) + eyes.replace(/CC/g, 'rgba(18,8,3,.7)') + '</g>');
    }
    if (id === 'stars') {
      const star = (x, y, s, o) => { let p = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 4 * s : 10 * s; p += (x + rr * Math.cos(a)).toFixed(1) + ',' + (y + rr * Math.sin(a)).toFixed(1) + ' '; } return '<polygon points="' + p + '" fill="#FFE9A8" opacity="' + o + '"/>'; };
      let b = '<path d="M318 205 a44 44 0 1 0 30 78 a35 35 0 1 1 -30 -78z" fill="#FFE9A8" opacity=".92"/>';
      [[60, 240, 1.2, .9], [120, 300, .8, .8], [190, 222, 1, .7], [250, 330, .9, .9], [40, 330, .7, .7], [300, 320, 1.1, .85], [150, 205, .6, .7], [370, 340, .8, .8]].forEach(s => { b += star(s[0], s[1], s[2], s[3]); });
      return wrap('<g>' + b + '</g>');
    }
    return '';
  },
  art_() {
    const sec = document.getElementById('section-play');
    if (!sec) return;
    let el = sec.querySelector('.deco-art');
    if (this.art === 'none') { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.className = 'deco-art'; el.setAttribute('aria-hidden', 'true'); sec.insertBefore(el, sec.firstChild); }
    el.innerHTML = this.artSVG(this.art);
  },

  /* ---- the pickers in Settings ---- */
  render() {
    const th = LANG === 'th', member = this.member(), nm = o => (th ? o.name.th : o.name.en);
    const set = (id, txt) => { const e = document.getElementById(id); if (e) e.textContent = txt; };
    set('skin-title', th ? 'หน้าตาและเสียงคาลิมบา' : 'Kalimba look and sound');
    set('skin-mat-h', th ? 'วัสดุ (เสียงเปลี่ยนตาม)' : 'Material (the sound changes too)');
    set('skin-shape-h', th ? 'รูปทรง (เสียงก้องต่างกัน)' : 'Shape (a different resonance)');
    set('skin-keys-h', th ? 'สีก้าน' : 'Key colours');
    set('skin-chain-h', th ? 'สร้อย' : 'Necklace');
    set('skin-art-h', th ? 'ลายบนตัวเครื่อง' : 'Pattern on the body');
    const btn = (kind, o, on, inner) => {
      const lock = o.premium && !member;
      return '<button type="button" data-kind="' + kind + '" data-id="' + o.id + '" aria-pressed="' + on + '" class="skin-btn' + (on ? ' on' : '') + (lock ? ' locked' : '') + '">' + inner +
        '<span class="skin-nm">' + (lock ? '🔒 ' : '') + nm(o) + '</span></button>';
    };
    const grid = (id, html) => { const e = document.getElementById(id); if (e) e.innerHTML = html; };
    grid('skin-mats', MATERIALS.map(m => {
      const tex = m.wood ? this.woodURI(m) + ' 0 0/150px 300px, ' : '';
      const css = ('background:' + tex + 'linear-gradient(180deg,' + m.body[0] + ',' + m.body[2] + ')' + (m.glassy ? ',' + m.backdrop : '') + ';border-color:' + (m.glassy ? 'rgba(255,255,255,.9)' : m.border)).replace(/"/g, '&quot;');
      return btn('mat', m, m.id === this.mat, '<span class="skin-pv skin-mat" style="' + css + '"></span>');
    }).join(''));
    grid('skin-shapes', SHAPES.map(s => btn('shape', s, s.id === this.shape, '<span class="skin-pv skin-shape sh-' + s.id + '"><i></i></span>')).join(''));
    grid('skin-keys', KEYSETS.map(k => btn('keys', k, k.id === this.keys,
      '<span class="skin-pv skin-kk">' + [k.tine.L[k.tine.L.length - 1], k.tine.L[0], k.tine.C, k.tine.R[0], k.tine.R[k.tine.R.length - 1]].map(c => '<i style="background:' + c + '"></i>').join('') + '</span>')).join(''));
    grid('skin-chains', CHAINS.map(c => btn('chain', c, c.id === this.chain, '<span class="skin-pv skin-ch">' + (c.id === 'none' ? '—' : ('<b style="background:radial-gradient(circle at 35% 30%,' + c.bead[0] + ',' + c.bead[1] + ' 55%,' + c.bead[2] + ')"></b>').repeat(6)) + '</span>')).join(''));
    grid('skin-arts', ARTS.map(a => btn('art', a, a.id === this.art, '<span class="skin-pv skin-ar">' + (a.icon || '—') + '</span>')).join(''));
    set('skin-note', member ? (th ? 'ปลดล็อกครบแล้ว' : 'Everything is unlocked')
      : (th ? 'ตัวเลือกที่มี 🔒 สำหรับสมาชิก เข้าสู่ระบบสมาชิกด้านล่างเพื่อปลดล็อก' : 'Options with 🔒 are for members. Sign in below to unlock them.'));
  },
  wire() {
    const box = document.getElementById('skin-box');
    if (!box) return;
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-kind]');
      if (!b) return;
      const o = this.pick(this.lists()[b.dataset.kind], b.dataset.id);
      if (this.usable(o)) { this.choose(b.dataset.kind, o.id); return; }
      document.getElementById('skin-note').textContent = LANG === 'th' ? '🔒 ตัวเลือกนี้สำหรับสมาชิก เข้าสู่ระบบสมาชิกด้านล่างเพื่อปลดล็อก' : '🔒 This option is for members. Sign in below to unlock it.';
      const f = document.getElementById('acct-card'); if (f) f.scrollIntoView({ block: 'center' });
    });
    window.addEventListener('kt-member', () => this.render());
    const w = document.getElementById('kalimba-tines-wrapper');
    if (w && window.ResizeObserver) new ResizeObserver(() => { cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(() => this.decorate()); }).observe(w);
    this.art_();
    this.render();
  }
};
Skin.init();
