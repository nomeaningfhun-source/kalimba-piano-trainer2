'use strict';
/* Patterns for the kalimba body (premium). Each pattern is drawn as SVG around the sound hole, in pixels, so it always fits the
   screen: draw(id, { W, H, cx, cy, R, ink }) -> inner SVG markup, where W x H is the body, (cx, cy) the centre of the sound hole,
   R its radius and ink = [r, g, b] the engraving colour of the material (light on dark wood, dark on pale wood).
   Patterns are engraved-line work with a little colour (gold dots, blossom pink), not clip-art: thin strokes, symmetric where it
   matters, kept clear of the tines above and of the two buttons at the bottom corners. */
const SkinArt = (() => {
  const f = n => (Math.round(n * 10) / 10).toString();
  const rgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  const lum = c => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
  const GOLD = '#E8C77D';
  const circle = (x, y, r, fill, op) => '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="' + fill + '"' + (op != null ? ' opacity="' + op + '"' : '') + '/>';
  const path = (d, stroke, w, op, extra) => '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' + (op != null ? ' opacity="' + op + '"' : '') + (extra || '') + '/>';
  const ring = (x, y, r, stroke, w, op, extra) => '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="none" stroke="' + stroke + '" stroke-width="' + w + '"' + (op != null ? ' opacity="' + op + '"' : '') + (extra || '') + '/>';
  const pol = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const bez = (p0, p1, p2, p3, t) => {
    const u = 1 - t;
    return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
  };
  // a small seeded random, so a pattern is the same every time it is drawn
  const rnd = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  // ---- lotus: a ring of pointed petals around the hole, like a carved mandala ----
  function lotus(o) {
    const { cx, cy, R, ink } = o, L = rgba(ink, 1);
    let s = '';
    s += ring(cx, cy, R * 1.12, L, 1.4, 0.6);
    s += ring(cx, cy, R * 1.19, L, 2.4, 0.55, ' stroke-dasharray="0.1 ' + f(R * 0.075) + '"');
    const N = 16, r0 = R * 1.27, len = R * 0.58, w = R * 0.15;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2, [bx, by] = pol(cx, cy, r0, a), [tx, ty] = pol(cx, cy, r0 + len, a);
      const nx = -Math.sin(a), ny = Math.cos(a), mx = bx + (tx - bx) * 0.45, my = by + (ty - by) * 0.45;
      // the petal: two curves meeting at a point, with a centre line
      s += path('M' + f(bx) + ' ' + f(by) + ' C' + f(mx + nx * w * 1.5) + ' ' + f(my + ny * w * 1.5) + ' ' + f(tx + nx * w * 0.3) + ' ' + f(ty + ny * w * 0.3) + ' ' + f(tx) + ' ' + f(ty) +
        ' C' + f(tx - nx * w * 0.3) + ' ' + f(ty - ny * w * 0.3) + ' ' + f(mx - nx * w * 1.5) + ' ' + f(my - ny * w * 1.5) + ' ' + f(bx) + ' ' + f(by) + 'Z', L, 1.3, 0.7);
      const [ix, iy] = pol(cx, cy, r0 + len * 0.62, a);
      s += path('M' + f(bx + (tx - bx) * 0.2) + ' ' + f(by + (ty - by) * 0.2) + ' L' + f(ix) + ' ' + f(iy), L, 1, 0.45);
      s += circle(tx, ty, R * 0.022, GOLD, 0.95);
      // the short petal between two long ones
      const a2 = a + Math.PI / N, [sx, sy] = pol(cx, cy, r0, a2), [ex, ey] = pol(cx, cy, r0 + len * 0.5, a2);
      s += path('M' + f(sx) + ' ' + f(sy) + ' L' + f(ex) + ' ' + f(ey), L, 1.2, 0.5);
      s += circle(ex, ey, R * 0.016, L, 0.6);
    }
    s += ring(cx, cy, r0 + len + R * 0.1, L, 1, 0.4);
    s += ring(cx, cy, r0 + len + R * 0.17, L, 2, 0.35, ' stroke-dasharray="0.1 ' + f(R * 0.1) + '"');
    return s;
  }

  // ---- sunburst: fine rays from the hole, long and short in turn, fading outwards ----
  function sunburst(o) {
    const { cx, cy, R, ink } = o, L = rgba(ink, 1);
    let s = ring(cx, cy, R * 1.12, L, 1.4, 0.6) + ring(cx, cy, R * 1.2, L, 0.9, 0.45);
    const N = 72;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2, long = i % 3 === 0, mid = i % 3 === 1;
      const r1 = R * 1.3, r2 = R * (long ? 2.55 : mid ? 1.95 : 1.6);
      const [x1, y1] = pol(cx, cy, r1, a), [x2, y2] = pol(cx, cy, r2, a);
      s += path('M' + f(x1) + ' ' + f(y1) + ' L' + f(x2) + ' ' + f(y2), L, long ? 1.6 : 1, long ? 0.55 : 0.38);
      if (long) s += circle(x2, y2, R * 0.025, GOLD, 0.9);
    }
    return s;
  }

  // ---- waves (seigaiha): rows of overlapping scallops, a band of inlay across the bottom of the body ----
  function waves(o) {
    const { W, H, cx, cy, R, ink } = o, L = rgba(ink, 1);
    const sc = Math.max(14, R * 0.62), top = cy + R * 1.32, rowH = sc * 0.5;
    const rows = Math.ceil((H - top) / rowH) + 1;
    let s = '<defs><linearGradient id="wvf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.28" stop-color="#fff" stop-opacity="1"/></linearGradient>' +
      '<mask id="wvm" maskUnits="userSpaceOnUse" x="0" y="' + f(top - 2) + '" width="' + f(W) + '" height="' + f(H - top + 4) + '"><rect x="0" y="' + f(top - 2) + '" width="' + f(W) + '" height="' + f(H - top + 4) + '" fill="url(#wvf)"/></mask></defs><g mask="url(#wvm)">';
    for (let r = 0; r < rows; r++) {
      const y = top + r * rowH, off = r % 2 ? sc : 0;
      for (let x = -sc * 2 + off; x < W + sc * 2; x += sc * 2) {
        // every scallop is a few concentric arcs; later rows paint over the lower part of earlier ones
        s += '<circle cx="' + f(x) + '" cy="' + f(y + sc * 0.5) + '" r="' + f(sc) + '" fill="' + rgba(ink, 0.07) + '" stroke="none"/>';
        [1, 0.68, 0.36].forEach((k, j) => { s += path('M' + f(x - sc * k) + ' ' + f(y + sc * 0.5) + ' A' + f(sc * k) + ' ' + f(sc * k) + ' 0 0 1 ' + f(x + sc * k) + ' ' + f(y + sc * 0.5), L, j === 0 ? 1.4 : 1.1, j === 0 ? 0.5 : 0.34); });
      }
    }
    s += '</g>' + ring(cx, cy, R * 1.12, L, 1.4, 0.6) + ring(cx, cy, R * 1.2, L, 0.9, 0.45);
    return s;
  }

  // ---- a cherry-blossom branch: blossoms drawn as five notched petals on a curved twig ----
  function blossom(x, y, s, rot) {
    let g = '';
    for (let i = 0; i < 5; i++) g += '<path d="M0 0 C-0.62 -0.34 -0.56 -1.02 -0.13 -1.02 L0 -0.88 L0.13 -1.02 C0.56 -1.02 0.62 -0.34 0 0Z" fill="url(#sk)" stroke="#E58CA8" stroke-width="0.045" transform="rotate(' + i * 72 + ')"/>';
    let st = '';
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2, x2 = Math.cos(a) * 0.34, y2 = Math.sin(a) * 0.34; st += '<path d="M0 0 L' + f(x2 * 100) / 100 + ' ' + f(y2 * 100) / 100 + '" stroke="#D86A8E" stroke-width="0.03"/><circle cx="' + f(x2 * 100) / 100 + '" cy="' + f(y2 * 100) / 100 + '" r="0.04" fill="' + GOLD + '"/>'; }
    return '<g transform="translate(' + f(x) + ' ' + f(y) + ') rotate(' + f(rot) + ') scale(' + f(s) + ')">' + g + '<circle r="0.11" fill="#F4B5C6"/>' + st + '</g>';
  }
  function sakura(o) {
    const { W, H, cx, cy, R, ink } = o, light = lum(ink) > 0.5;
    const bark = light ? '#D8B48C' : '#5E3A22', bark2 = light ? 'rgba(255,255,255,.35)' : 'rgba(255,230,200,.3)';
    let s = '<defs><radialGradient id="sk" cx="50%" cy="85%" r="95%"><stop offset="0" stop-color="#F29BB5"/><stop offset="0.45" stop-color="#F9C6D5"/><stop offset="1" stop-color="#FFF1F5"/></radialGradient></defs>';
    const rn = rnd(7);
    const branch = (pts, w, flowers, buds) => {
      const [p0, p1, p2, p3] = pts;
      const d = 'M' + f(p0[0]) + ' ' + f(p0[1]) + ' C' + f(p1[0]) + ' ' + f(p1[1]) + ' ' + f(p2[0]) + ' ' + f(p2[1]) + ' ' + f(p3[0]) + ' ' + f(p3[1]);
      let g = path(d, bark, w, 0.95) + path(d, bark2, w * 0.28, 1, ' transform="translate(' + f(-w * 0.18) + ' ' + f(-w * 0.18) + ')"');
      // small twigs
      [0.3, 0.55, 0.8].forEach((t, i) => {
        const [x, y] = bez(p0, p1, p2, p3, t), dir = i % 2 ? 1 : -1, ex = x + dir * R * 0.5, ey = y - R * (0.35 + 0.1 * i);
        g += path('M' + f(x) + ' ' + f(y) + ' Q' + f(x + dir * R * 0.1) + ' ' + f(y - R * 0.3) + ' ' + f(ex) + ' ' + f(ey), bark, w * 0.45, 0.9);
        buds.push([ex, ey]);
      });
      flowers.forEach(([t, sz]) => { const [x, y] = bez(p0, p1, p2, p3, t); g += blossom(x, y, R * sz, rn() * 72); });
      buds.forEach(([x, y]) => { g += blossom(x, y, R * (0.16 + rn() * 0.08), rn() * 72); });
      return g;
    };
    // the left branch sweeps in from the bottom-left corner and rises beside the hole; a shorter one comes from the right
    s += branch([[-14, H - 20], [W * 0.1, H - R * 1.0], [cx - R * 2.15, cy + R * 0.9], [cx - R * 1.75, cy - R * 0.35]], Math.max(3.4, R * 0.075), [[0.28, 0.34], [0.52, 0.42], [0.76, 0.38], [0.97, 0.46]], []);
    s += branch([[W + 14, cy + R * 1.45], [W - R * 0.55, cy + R * 1.2], [cx + R * 2.0, cy + R * 0.5], [cx + R * 1.72, cy - R * 0.3]], Math.max(2.6, R * 0.055), [[0.5, 0.3], [0.88, 0.4]], []);
    // a few petals drifting down
    for (let i = 0; i < 9; i++) {
      const x = W * (0.12 + rn() * 0.76), y = cy + R * (0.2 + rn() * 1.6);
      if (Math.hypot(x - cx, y - cy) < R * 1.25) continue;
      s += '<ellipse cx="' + f(x) + '" cy="' + f(y) + '" rx="' + f(R * 0.05) + '" ry="' + f(R * 0.085) + '" fill="#F9C6D5" opacity="0.8" transform="rotate(' + f(rn() * 180) + ' ' + f(x) + ' ' + f(y) + ')"/>';
    }
    return s + ring(cx, cy, R * 1.12, rgba(ink, 1), 1.2, 0.5);
  }

  // ---- constellation: thin lines between four-point stars and a crescent moon ----
  function sparkle(x, y, r, c, op) {
    return '<path d="M' + f(x) + ' ' + f(y - r) + ' Q' + f(x) + ' ' + f(y) + ' ' + f(x + r) + ' ' + f(y) + ' Q' + f(x) + ' ' + f(y) + ' ' + f(x) + ' ' + f(y + r) + ' Q' + f(x) + ' ' + f(y) + ' ' + f(x - r) + ' ' + f(y) + ' Q' + f(x) + ' ' + f(y) + ' ' + f(x) + ' ' + f(y - r) + 'Z" fill="' + c + '" opacity="' + op + '"/>';
  }
  function stars(o) {
    const { W, H, cx, cy, R, ink } = o, L = rgba(ink, 1);
    const P = (a, b) => [cx + a * R, cy + b * R];
    const left = [P(-2.0, -0.35), P(-1.62, 0.3), P(-2.02, 0.95), P(-1.42, 1.5), P(-0.7, 1.55)];
    const right = [P(0.85, 1.58), P(1.5, 1.42), P(1.95, 0.85), P(1.62, 0.2)];
    let s = '';
    [left, right].forEach(g => {
      s += path('M' + g.map(p => f(p[0]) + ' ' + f(p[1])).join(' L'), L, 1, 0.42, ' stroke-dasharray="' + f(R * 0.05) + ' ' + f(R * 0.05) + '"');
      g.forEach((p, i) => { s += sparkle(p[0], p[1], R * (i % 2 ? 0.13 : 0.19), GOLD, 0.95) + circle(p[0], p[1], R * 0.03, '#FFF6D8', 0.95); });
    });
    // the crescent moon, up on the right where the tines are short
    const mx = Math.min(W - R * 0.7, cx + R * 1.95), my = cy - R * 0.72, mr = R * 0.42;
    s += '<path d="M' + f(mx + mr * 0.2) + ' ' + f(my - mr) + ' A' + f(mr) + ' ' + f(mr) + ' 0 1 0 ' + f(mx + mr * 0.2) + ' ' + f(my + mr) + ' A' + f(mr * 1.35) + ' ' + f(mr * 1.35) + ' 0 0 1 ' + f(mx + mr * 0.2) + ' ' + f(my - mr) + 'Z" fill="#F6E3A8" opacity="0.92"/>';
    const rn = rnd(11);
    for (let i = 0; i < 26; i++) {
      const x = W * rn(), y = cy - R * 0.5 + (H - cy + R * 0.5) * rn();
      if (Math.hypot(x - cx, y - cy) < R * 1.3) continue;
      s += circle(x, y, 0.8 + rn() * 1.3, GOLD, 0.35 + rn() * 0.4);
    }
    return s + ring(cx, cy, R * 1.12, L, 1.2, 0.5);
  }


  // ---- stickers on the tines: small die-cut decals (white edge + soft shadow, added by one SVG filter) ----
  // each art is drawn in a box of about 20 x 20 around (0, 0); stickerMarkup() places and scales it
  const SK = {
    flower: c => { let p = ''; for (let i = 0; i < 5; i++) p += '<ellipse cx="0" cy="-5.2" rx="3.6" ry="4.8" fill="' + c[0] + '" transform="rotate(' + i * 72 + ')"/>'; return p + '<circle r="2.6" fill="' + c[1] + '"/><circle r="1" cx="-.5" cy="-.6" fill="#fff" opacity=".7"/>'; },
    star: c => '<path d="M0 -9.5 L2.7 -3.2 L9.4 -2.8 L4.3 1.5 L6 8 L0 4.4 L-6 8 L-4.3 1.5 L-9.4 -2.8 L-2.7 -3.2Z" fill="' + c[0] + '" stroke="' + c[0] + '" stroke-width="1.4" stroke-linejoin="round"/><path d="M0 -6 L1.3 -2.6 L-1.3 -2.6Z" fill="#fff" opacity=".55"/>',
    heart: c => '<path d="M0 8.5 C-12 0 -7.5 -9 -3.6 -7.2 C-1.4 -6.2 0 -4 0 -4 C0 -4 1.4 -6.2 3.6 -7.2 C7.5 -9 12 0 0 8.5Z" fill="' + c[0] + '"/><ellipse cx="-4" cy="-3.6" rx="1.8" ry="1.1" fill="#fff" opacity=".6" transform="rotate(-30 -4 -3.6)"/>',
    note: c => '<ellipse cx="-3" cy="6" rx="4.2" ry="3.2" fill="' + c[0] + '" transform="rotate(-20 -3 6)"/><path d="M0.8 5 L0.8 -8" stroke="' + c[0] + '" stroke-width="1.8" stroke-linecap="round"/><path d="M0.8 -8 C5 -6.5 7 -4.5 6 -0.5 C5 -3.5 3.5 -4 0.8 -4.5Z" fill="' + c[0] + '"/>',
    cat: c => '<path d="M-8 -3 L-7.4 -10 L-2.4 -6.2Z M8 -3 L7.4 -10 L2.4 -6.2Z" fill="' + c[0] + '"/><circle r="8.2" cy="1" fill="' + c[0] + '"/><circle cx="-3" cy="0" r="1.2" fill="#3A2A22"/><circle cx="3" cy="0" r="1.2" fill="#3A2A22"/><path d="M-1 3 L1 3 L0 4.2Z" fill="#E58C9E"/><path d="M-9.5 2 L-5 2.6 M-9.5 5 L-5 4 M9.5 2 L5 2.6 M9.5 5 L5 4" stroke="#3A2A22" stroke-width=".6" opacity=".6"/><ellipse cx="-5.3" cy="3" rx="1.6" ry="1" fill="#F4A6B4" opacity=".7"/><ellipse cx="5.3" cy="3" rx="1.6" ry="1" fill="#F4A6B4" opacity=".7"/>',
    bunny: c => '<ellipse cx="-3.6" cy="-6.6" rx="2.2" ry="5.6" fill="' + c[0] + '"/><ellipse cx="3.6" cy="-6.6" rx="2.2" ry="5.6" fill="' + c[0] + '"/><ellipse cx="-3.6" cy="-6.4" rx="1" ry="3.6" fill="#F4A6B4"/><ellipse cx="3.6" cy="-6.4" rx="1" ry="3.6" fill="#F4A6B4"/><circle r="7.6" cy="2.4" fill="' + c[0] + '"/><circle cx="-2.8" cy="1.6" r="1.1" fill="#3A2A22"/><circle cx="2.8" cy="1.6" r="1.1" fill="#3A2A22"/><circle cy="4.2" r="1" fill="#E58C9E"/><ellipse cx="-5" cy="4.4" rx="1.5" ry="1" fill="#F4A6B4" opacity=".7"/><ellipse cx="5" cy="4.4" rx="1.5" ry="1" fill="#F4A6B4" opacity=".7"/>',
    bear: c => '<circle cx="-6.2" cy="-6.2" r="3.2" fill="' + c[0] + '"/><circle cx="6.2" cy="-6.2" r="3.2" fill="' + c[0] + '"/><circle cx="-6.2" cy="-6.2" r="1.6" fill="' + c[1] + '"/><circle cx="6.2" cy="-6.2" r="1.6" fill="' + c[1] + '"/><circle r="8.4" cy="1" fill="' + c[0] + '"/><ellipse cy="4" rx="3.6" ry="2.7" fill="' + c[1] + '"/><circle cx="-3.1" cy="-.4" r="1.1" fill="#3A2A22"/><circle cx="3.1" cy="-.4" r="1.1" fill="#3A2A22"/><ellipse cy="2.8" rx="1.3" ry=".9" fill="#3A2A22"/>',
    cloud: c => '<path d="M-7 5 C-11 5 -11 -1 -6.5 -1.2 C-6.5 -6 0 -7.5 2.2 -3.6 C5.5 -5.2 9 -2 7.8 1 C11 1.5 10.5 5 7 5Z" fill="' + c[0] + '"/><circle cx="-2.4" cy="1.4" r=".9" fill="#3A2A22"/><circle cx="2.4" cy="1.4" r=".9" fill="#3A2A22"/><path d="M-1 3.2 Q0 4.2 1 3.2" stroke="#3A2A22" stroke-width=".7" fill="none"/>',
    leaf: c => '<path d="M-7 8 C-9 -2 -3 -9 7 -9 C8 1 2 8 -7 8Z" fill="' + c[0] + '"/><path d="M-6.5 7.5 C-2 2 2 -2 5.5 -7.5" stroke="' + c[1] + '" stroke-width="1" fill="none" stroke-linecap="round"/><path d="M-3 4 L-5.5 3 M-0.5 1.2 L-2.5 -1.2 M2 -2 L0 -4.6" stroke="' + c[1] + '" stroke-width=".7" stroke-linecap="round"/>'
  };
  const PACKS = {
    flowers: { items: ['flower'], pal: [['#F7A8C0', '#FFE08A'], ['#FFD36E', '#E8803A'], ['#C9A8F0', '#FFF1A8'], ['#FFB48A', '#FFF1A8'], ['#9ADBC6', '#FFF1A8']] },
    stars: { items: ['star'], pal: [['#F7CE5B'], ['#FFFFFF'], ['#F4B8D0'], ['#BFE3F5'], ['#F7CE5B']] },
    hearts: { items: ['heart'], pal: [['#EE5A72'], ['#F7A8C0'], ['#E94B6B'], ['#FF8FA3'], ['#C93A5A']] },
    notes: { items: ['note'], pal: [['#5B6BD6'], ['#E8703A'], ['#2EA58A'], ['#C9438F'], ['#3A8FD6']] },
    animals: { items: ['cat', 'bunny', 'bear'], pal: [['#F5D7A0', '#EBBF7A'], ['#FFFFFF', '#F2E7DA'], ['#C98B5B', '#EBCDA8'], ['#B9B9C6', '#E4E4EC'], ['#F7C3C3', '#FBE3E3']] },
    mix: { items: ['cat', 'star', 'flower', 'heart', 'cloud', 'note', 'bunny', 'leaf'], pal: [['#F7A8C0', '#FFE08A'], ['#F7CE5B', '#E8803A'], ['#9ADBC6', '#FFF1A8'], ['#BFE3F5', '#8FC4E0'], ['#C9A8F0', '#FFF1A8'], ['#FFB48A', '#E8803A']] }
  };
  // one sticker, centred on (x, y), about `size` px across; i picks which art and colours from the pack
  function sticker(pack, i, x, y, size) {
    const P = PACKS[pack];
    if (!P) return '';
    const art = P.items[i % P.items.length], pal = P.pal[(i * 2 + Math.floor(i / P.items.length)) % P.pal.length], rot = ((i * 37) % 31) - 15;
    let pc = pal;
    if (art === 'leaf') pc = ['#7DC47E', '#3F8F52'];
    if (pack === 'mix' && art === 'cat') pc = ['#F5D7A0', '#EBBF7A'];
    if (pack === 'mix' && art === 'bunny') pc = ['#FFFFFF', '#F2E7DA'];
    if (pack === 'mix' && art === 'cloud') pc = ['#FFFFFF'];
    if (pack === 'mix' && art === 'note') pc = ['#5B6BD6'];
    if (pack === 'mix' && art === 'heart') pc = ['#EE5A72'];
    return '<g filter="url(#stk)" transform="translate(' + f(x) + ' ' + f(y) + ') rotate(' + rot + ') scale(' + f(size / 21) + ')">' + SK[art](pc) + '</g>';
  }
  // the filter that makes a shape a sticker: a white edge around it and a soft shadow underneath (put once in each SVG that uses stickers)
  const STICKER_DEFS = '<defs><filter id="stk" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB">' +
    '<feMorphology in="SourceAlpha" operator="dilate" radius="1.5" result="d"/><feFlood flood-color="#FFFFFF" result="w"/><feComposite in="w" in2="d" operator="in" result="edge"/>' +
    '<feGaussianBlur in="d" stdDeviation="1.1" result="b"/><feOffset in="b" dx="0.4" dy="1.5" result="o"/><feFlood flood-color="#000" flood-opacity="0.34" result="k"/><feComposite in="k" in2="o" operator="in" result="shadow"/>' +
    '<feMerge><feMergeNode in="shadow"/><feMergeNode in="edge"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';

  const DRAW = { lotus, sunburst, waves, sakura, stars };
  function draw(id, o) { return DRAW[id] ? DRAW[id](o) : ''; }
  return { draw, ids: Object.keys(DRAW), sticker, STICKER_DEFS, PACKS };
})();
window.SkinArt = SkinArt;
