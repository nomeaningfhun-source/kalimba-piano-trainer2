const assert = require('assert');
const P = require('./parser.js');
let n = 0; const t = (name, fn) => { try { fn(); n++; console.log('ok  ', name); } catch (e) { console.log('FAIL', name, '\n   ', e.message); process.exitCode = 1; } };

let SR = 48000, WIN = P.MIC_WINDOW, HOP = Math.round(0.025 * SR);
// kalimba-like pluck: the fundamental rings ~1.5 s and keeps ringing under later notes; the metallic
// 6.52x partial dies in ~0.15 s. Passed through the app's low-pass chain.
function render(notes, secs, noise = 0.002) {
  const x = new Float32Array(Math.round(secs * SR));
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
  notes.forEach(({ m, at, cents = 0, amp = 0.4 }, k) => {
    const f = P.midiHz(m) * Math.pow(2, cents / 1200), s0 = Math.round(at * SR);
    // re-plucking a tine: the finger stops its old ring (5 ms fade) about 30 ms before the new pluck
    const again = notes.find((o, j) => j > k && o.m === m);
    const end = again ? Math.round((again.at - 0.03) * SR) : x.length;
    for (let i = s0; i < Math.min(x.length, end + 240); i++) {
      const tt = (i - s0) / SR, atk = Math.min(1, tt / 0.004) * (i < end ? 1 : 1 - (i - end) / 240);
      x[i] += amp * atk * (Math.exp(-tt / 0.6) * Math.sin(2 * Math.PI * f * tt) + 0.7 * Math.exp(-tt / 0.05) * Math.sin(2 * Math.PI * f * 6.52 * tt));
    }
  });
  for (let i = 0; i < x.length; i++) x[i] += noise * rnd();
  const a = P.makeLowpass(SR, P.MIC_LOWPASS_HZ), b = P.makeLowpass(SR, P.MIC_LOWPASS_HZ);
  for (let i = 0; i < x.length; i++) x[i] = b(a(x[i]));
  return x;
}
function listen(x) {
  const L = P.makeKeyListener(SR, { hop: HOP / SR }), out = [];
  for (let s = 0; s + WIN <= x.length; s += HOP) {
    const ev = L.feed(x.subarray(s, s + WIN), (s + WIN) / SR);
    if (ev) out.push(ev);
  }
  return out;
}

t('every kalimba key (C4–E6) is heard as the right note, in tune', () => {
  for (let m = 60; m <= 88; m++) {
    const ev = listen(render([{ m, at: 0.1 }], 0.6));
    assert.strictEqual(ev.length, 1, m + ': ' + JSON.stringify(ev));
    assert.strictEqual(ev[0].midi, m);
    assert(Math.abs(ev[0].cents) <= 4, m + ' cents ' + ev[0].cents);
  }
});

t('a detuned tine shows its cents offset (tuner)', () => {
  [[69, 20], [72, -25], [64, 12], [81, -8]].forEach(([m, c]) => {
    const ev = listen(render([{ m, at: 0.1, cents: c }], 0.6));
    assert.strictEqual(ev[0].midi, m);
    assert(Math.abs(ev[0].cents - c) <= 4, m + ': want ' + c + ' got ' + ev[0].cents);
  });
});

t('repeats of one tine down to 0.25 s apart (eighths at 120 BPM), 48 and 44.1 kHz', () => {
  for (const sr of [48000, 44100]) {
    SR = sr; WIN = Math.round(P.MIC_WINDOW * sr / 48000); HOP = Math.round(0.025 * SR);
    try {
      [0.25, 0.3, 0.4].forEach(gap => {
        const tune = [60, 60, 67, 67, 64, 64, 64, 81, 81];
        assert.deepStrictEqual(listen(render(tune.map((m, i) => ({ m, at: 0.2 + i * gap })), 0.6 + tune.length * gap)).map(e => e.midi), tune, sr + ' gap ' + gap);
      });
    } finally { SR = 48000; WIN = P.MIC_WINDOW; HOP = Math.round(0.025 * SR); }
  }
});

t('a melody with ringing tines becomes the same notes, repeats included', () => {
  const tune = [60, 60, 67, 67, 69, 69, 67, 65, 65, 64, 64, 62, 62, 60];
  const got = listen(render(tune.map((m, i) => ({ m, at: 0.2 + i * 0.36 })), 6)).map(e => e.midi);
  assert.deepStrictEqual(got, tune);
});

t('fast changes (0.25 s apart) with soft plucks between loud ones', () => {
  const tune = [72, 74, 76, 77, 79, 81, 79, 77, 76, 74, 72];
  const got = listen(render(tune.map((m, i) => ({ m, at: 0.1 + i * 0.25, amp: i % 2 ? 0.12 : 0.3 })), 3.4)).map(e => e.midi);
  assert.deepStrictEqual(got, tune);
});

t('neighbouring keys and wide leaps', () => {
  const tune = [60, 62, 64, 81, 60, 79, 62, 77, 64];
  const got = listen(render(tune.map((m, i) => ({ m, at: 0.1 + i * 0.3 })), 3.4)).map(e => e.midi);
  assert.deepStrictEqual(got, tune);
});

t('44.1 kHz devices (window scaled to the same length in time)', () => {
  SR = 44100; WIN = Math.round(P.MIC_WINDOW * 44100 / 48000); HOP = Math.round(0.025 * SR);
  try {
    const tune = [60, 60, 67, 64, 62, 81, 72, 74];
    assert.deepStrictEqual(listen(render(tune.map((m, i) => ({ m, at: 0.2 + i * 0.3 })), 3)).map(e => e.midi), tune);
  } finally { SR = 48000; WIN = P.MIC_WINDOW; HOP = Math.round(0.025 * SR); }
});

t('silence and background noise give no notes', () => {
  assert.deepStrictEqual(listen(render([], 2, 0.004)), []);
  assert.deepStrictEqual(listen(render([], 2, 0.02)), []);
});

console.log(n + ' passed');
