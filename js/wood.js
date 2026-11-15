'use strict';
/* Wood grain for the kalimba body, drawn by the browser (no image files). It is a seamless tile: periodic noise bends a set of
   growth rings (a slow light-to-dark gradient that snaps back at each ring line, the way real early/late wood looks), fine fibres
   run along the grain, small dark pores sit in the late wood, and a slow "cloud" of lightness and (for some species) a ribbon figure
   break up the repeat. Each species has its own palette and character. Returns a JPEG data URL, cached per species and size. */
const Wood = (() => {
  // integer lattice hash -> [0, 1)
  function hash(ix, iy, seed) {
    let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  // value noise that repeats every px x py cells, so the texture tiles without a seam
  function pnoise(x, y, px, py, seed) {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const w = (i, j) => hash(((i % px) + px) % px, ((j % py) + py) % py, seed);
    const a = w(x0, y0), b = w(x0 + 1, y0), c = w(x0, y0 + 1), d = w(x0 + 1, y0 + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  function fbm(u, v, px, py, seed, oct) {
    let s = 0, amp = 0.5, tot = 0;
    for (let o = 0; o < oct; o++) {
      const k = 1 << o;
      s += amp * pnoise(u * px * k, v * py * k, px * k, py * k, seed + o * 17);
      tot += amp; amp *= 0.5;
    }
    return s / tot;
  }
  const mix = (a, b, t) => a + (b - a) * t;
  const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
  const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  // per species: colours light / mid / dark, how many rings across the tile, how strong they are, fibre, pores, ribbon figure, flecks
  const SPECIES = {
    teak:     { light: [206, 138, 66], mid: [150, 90, 34], dark: [84, 44, 14],  rings: 36, contrast: 0.58, drift: 1.1, swing: 0.08, arch: 0.38, axis: 0.30, fibre: 0.55, pores: 0.55, ribbon: 0.00, fleck: 0.00, seed: 5 },
    walnut:   { light: [156, 112, 84], mid: [108, 74, 54], dark: [50, 32, 22],  rings: 26, contrast: 0.72, drift: 1.2, swing: 0.10, arch: 0.30, axis: 0.62, fibre: 0.50, pores: 0.45, ribbon: 0.10, fleck: 0.00, seed: 3 },
    mahogany: { light: [198, 108, 74], mid: [138, 68, 46], dark: [68, 28, 20],  rings: 30, contrast: 0.58, drift: 1.0, swing: 0.10, arch: 0.12, axis: 0.40, fibre: 0.45, pores: 0.40, ribbon: 0.34, fleck: 0.00, seed: 8 },
    maple:    { light: [248, 230, 192], mid: [224, 188, 138], dark: [176, 132, 88], rings: 48, contrast: 0.40, drift: 0.9, swing: 0.06, arch: 0.22, axis: 0.35, fibre: 0.35, pores: 0.12, ribbon: 0.12, fleck: 0.50, seed: 12 },
    ebony:    { light: [86, 76, 68], mid: [48, 43, 39], dark: [18, 16, 15],      rings: 52, contrast: 0.46, drift: 1.0, swing: 0.06, arch: 0.18, axis: 0.55, fibre: 0.60, pores: 0.30, ribbon: 0.00, fleck: 0.00, seed: 21 }
  };

  function draw(species, W, H) {
    const P = SPECIES[species] || SPECIES.teak, S = P.seed;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d'), img = g.createImageData(W, H), d = img.data;
    const lerp3 = (t, o) => {
      // dark -> mid -> light with t in [0,1] (0 = dark)
      const a = t < 0.5 ? P.dark : P.mid, b = t < 0.5 ? P.mid : P.light, k = t < 0.5 ? t * 2 : (t - 0.5) * 2;
      o[0] = mix(a[0], b[0], k); o[1] = mix(a[1], b[1], k); o[2] = mix(a[2], b[2], k);
    };
    const col = [0, 0, 0];
    for (let y = 0; y < H; y++) {
      const v = y / H;
      for (let x = 0; x < W; x++) {
        const u = x / W;
        // the rings. A plain stripe would look like corduroy, so the ring coordinate t is bent three ways: the spacing drifts (rings crowd and
        // open up), a slow S-swing runs along the board, and for flat-sawn species the lines fan out in nested arches around a tilted axis
        const drift = (fbm(u, v, 2, 3, S + 5, 3) - 0.5) * 2 * P.drift;
        const swing = (Math.sin(2 * Math.PI * (v * 2 + u)) * 0.35 + Math.sin(2 * Math.PI * (v - u * 2)) * 0.25) * P.swing / 0.35;
        const ud = 0.25 * (1 - Math.cos(2 * Math.PI * (u - P.axis)));                // distance from the arch axis, smooth and periodic (no crease where the tile wraps)
        const g = (1 - Math.cos(2 * Math.PI * (v + 0.18 * Math.sin(2 * Math.PI * u + 1)))) / 2;   // arch height along the board (0..1, periodic)
        const arch = P.arch * (ud * 0.9 + g * 0.55 * (0.4 + ud));
        const t = u * P.rings * (1 - P.arch) + arch * P.rings + drift + swing * (P.rings / 10);
        const f = t - Math.floor(t);
        // broad bands as well as fine lines: a second, wider set of rings that colours whole stretches darker
        const t2 = t / 5 + fbm(u, v, 2, 2, S + 25, 2) * 0.8, band = 0.5 - 0.5 * Math.cos(2 * Math.PI * t2);
        // early wood is pale and slowly darkens, late wood is a thin dark band, then a crisp ring line
        let ring = f < 0.8 ? Math.pow(f / 0.8, 1.9) * 0.40 : 0.40 + Math.pow((f - 0.8) / 0.2, 0.9) * 0.60;
        // some rings are bold, some faint, and a line breaks up along its length (never a clean ruled stripe)
        const bold = 0.45 + 1.0 * fbm(u, v, 5, 3, S + 40, 2);
        const along = 0.35 + 0.9 * pnoise(u * 18, v * 5, 18, 5, S + 60);
        ring = ring * bold * along * P.contrast + band * 0.07 * P.contrast;
        // fibres along the grain (long thin streaks) at two scales
        const fib1 = pnoise(u * 150, v * 7, 150, 7, S + 70), fib2 = pnoise(u * 330, v * 18, 330, 18, S + 90);
        let tone = 0.72 - ring + (fib1 - 0.5) * 0.30 * P.fibre + (fib2 - 0.5) * 0.22 * P.fibre;
        // slow clouds of light and dark, and the ribbon (broad bands that catch the light)
        tone += (fbm(u, v, 2, 2, S + 110, 3) - 0.5) * 0.16;
        if (P.ribbon) tone += Math.sin(2 * Math.PI * (u * 3 + v * 1 + (fbm(u, v, 2, 2, S + 130, 2) - 0.5) * 0.9)) * 0.13 * P.ribbon * 2;
        // pores: tiny dark dashes along the grain, mostly in the late wood
        const pn = pnoise(u * 210, v * 46, 210, 46, S + 150);
        if (pn > 0.86) tone -= ((pn - 0.86) / 0.14) * 0.32 * P.pores * (0.5 + ring * 1.6);
        // medullary flecks (maple): short pale strokes across the grain
        if (P.fleck) { const fn = pnoise(u * 40, v * 160, 40, 160, S + 170); if (fn > 0.9) tone += ((fn - 0.9) / 0.1) * 0.18 * P.fleck; }
        lerp3(clamp01(tone), col);
        const i = (y * W + x) * 4;
        d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return cv;
  }

  const cache = new Map();
  // a CSS url() for the species at the given pixel size (seamless tile); '' when the browser cannot draw it
  function url(species, W, H) {
    const key = species + ':' + W + 'x' + H;
    if (cache.has(key)) return cache.get(key);
    let out = '';
    try { out = 'url("' + draw(species, W, H).toDataURL('image/jpeg', 0.9) + '")'; } catch (e) { /* no canvas */ }
    cache.set(key, out);
    return out;
  }
  return { url, draw, SPECIES };
})();
window.Wood = Wood;
