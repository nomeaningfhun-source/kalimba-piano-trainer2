const NOTE_THAI = { 'C':'ด','C#':'ด#','Db':'รb','D':'ร','D#':'ร#','Eb':'มb','E':'ม','F':'ฟ','F#':'ฟ#','Gb':'ซb','G':'ซ','G#':'ซ#','Ab':'ลb','A':'ล','A#':'ล#','Bb':'ทb','B':'ท' };
function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
function pitchToMidi(p) {
  const match = p.match(/^([A-G][b#]?)(-?\d+)$/);
  if (!match) return 60;
  const noteMap = { 'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11 };
  return 12 * (parseInt(match[2], 10) + 1) + (noteMap[match[1]] || 0);
}
function midiToPitch(midi) {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
  return `${notes[midi % 12]}${Math.floor(midi / 12) - 1}`;
}
function pitchToNumber(p) {
  const m = p.match(/^([A-G][b#]?)(-?\d+)$/); if (!m) return p;
  const map = { 'C':'1','C#':'1#','Db':'2b','D':'2','D#':'2#','Eb':'3b','E':'3','F':'4','F#':'4#','Gb':'5b','G':'5','G#':'5#','Ab':'6b','A':'6','A#':'6#','Bb':'7b','B':'7' };
  const base = map[m[1]] || m[1], oct = parseInt(m[2], 10);
  return oct === 4 ? base : (oct === 5 ? base + "'" : (oct === 6 ? base + "''" : "." + base));
}
function pitchToThai(p) {
  const m = p.match(/^([A-G][b#]?)(-?\d+)$/); if (!m) return p;
  const thai = NOTE_THAI[m[1]] || m[1], oct = parseInt(m[2], 10);
  return oct === 4 ? thai : (oct === 5 ? thai + "̇" : (oct === 6 ? thai + "̈" : thai + "̣"));
}
function numberTokenToPitch(token, baseOctave = 4) {
  const clean = token.trim();
  if (!clean || !/[1-7]/.test(clean.charAt(0))) return null;
  const numMap = { '1':'C', '2':'D', '3':'E', '4':'F', '5':'G', '6':'A', '7':'B' };
  let noteName = numMap[clean.charAt(0)], oct = baseOctave;
  if (clean.includes("''") || clean.includes('""')) oct += 2;
  else if (clean.includes("'") || clean.includes('°')) oct += 1;
  else if (clean.startsWith('.')) oct -= 1;
  if (clean.includes('b') || clean.includes('♭')) {
    if (noteName === 'B') noteName = 'Bb'; else if (noteName === 'E') noteName = 'Eb';
  }
  return `${noteName}${oct}`;
}

const PROFILE_KALIMBA_17 = {
  keys: [
    { pitch: 'D6', hand: 'L', lengthPct: 56 }, { pitch: 'B5', hand: 'L', lengthPct: 61 }, { pitch: 'G5', hand: 'L', lengthPct: 66 },
    { pitch: 'E5', hand: 'L', lengthPct: 72 }, { pitch: 'C5', hand: 'L', lengthPct: 78 }, { pitch: 'A4', hand: 'L', lengthPct: 84 },
    { pitch: 'F4', hand: 'L', lengthPct: 90 }, { pitch: 'D4', hand: 'L', lengthPct: 96 }, { pitch: 'C4', hand: 'C', lengthPct: 100 },
    { pitch: 'E4', hand: 'R', lengthPct: 96 }, { pitch: 'G4', hand: 'R', lengthPct: 90 }, { pitch: 'B4', hand: 'R', lengthPct: 84 },
    { pitch: 'D5', hand: 'R', lengthPct: 78 }, { pitch: 'F5', hand: 'R', lengthPct: 72 }, { pitch: 'A5', hand: 'R', lengthPct: 66 },
    { pitch: 'C6', hand: 'R', lengthPct: 61 }, { pitch: 'E6', hand: 'R', lengthPct: 56 }
  ]
};

// One kalimba voice for the keyboard page and the M2 previews, fitted to a reference
// kalimba-app recording: low tines ring ~2 s with a metallic 6.5x partial at the pluck,
// high tines decay fast (~45 dB/s at G5) with no audible overtone.
function kalimbaVoice(ctx, dest, freq, t, vel) {
  kalimbaVoice.lastT = Math.max(kalimbaVoice.lastT || 0, t);   // the mic ignores the app's own notes
  const midi = 69 + 12 * Math.log2(freq / 440);
  const rate = 9.5 * Math.pow(2, (midi - 60) / 8.4);          // tail decay, dB per second
  const l03 = -2.5 - Math.max(4.3, 0.22 * rate);              // level at 0.3 s, dB
  const t30 = 0.3 + (30 + l03) / rate;                        // time it reaches -30 dB
  const db = d => vel * Math.pow(10, d / 20);
  const out = ctx.createGain(); out.connect(dest);
  const o1 = ctx.createOscillator(), g1 = ctx.createGain();
  o1.type = 'sine'; o1.frequency.setValueAtTime(freq, t);
  g1.gain.setValueAtTime(0.0001, t);
  g1.gain.exponentialRampToValueAtTime(vel, t + 0.005);
  g1.gain.exponentialRampToValueAtTime(db(-2.5), t + 0.08);
  g1.gain.exponentialRampToValueAtTime(db(l03), t + 0.3);
  g1.gain.exponentialRampToValueAtTime(db(-30), t + t30);
  g1.gain.exponentialRampToValueAtTime(db(-70), t + t30 + 1.2);
  o1.connect(g1); g1.connect(out);
  o1.start(t); o1.stop(t + t30 + 1.25);
  const ov = freq <= 350 ? 1.1 : freq >= 420 ? 0.002 : 1.1 * Math.pow(0.002 / 1.1, (freq - 350) / 70);
  const o2 = ctx.createOscillator(), g2 = ctx.createGain();
  o2.type = 'sine'; o2.frequency.setValueAtTime(freq * 6.52, t);
  g2.gain.setValueAtTime(0.0001, t);
  g2.gain.exponentialRampToValueAtTime(vel * ov, t + 0.004);
  g2.gain.exponentialRampToValueAtTime(vel * ov * 0.18, t + 0.15);
  g2.gain.exponentialRampToValueAtTime(vel * ov * 0.001, t + 0.55);
  o2.connect(g2); g2.connect(out);
  o2.start(t); o2.stop(t + 0.6);
  o1.onended = () => { try { out.disconnect(); } catch (e) { /* already gone */ } };
}

class AudioEngine {
  constructor() { this.ctx = null; this.isUnlocked = false; }
  init() {
    // iOS can leave the context 'interrupted' for good (after the photo picker or a long photo read): resume()
    // never brings it back, so a new one is made — this runs inside a tap, where iOS allows that
    // (a context that is still not running a second after it was made was suspended by iOS - say after the first play - and resume() does
    // not always bring it back, which was the silent second play)
    // A context that says 'running' but whose clock has not moved since the last tap is dead too (iOS after the app sat in
    // the background or the screen was locked): drop it as well.
    const c0 = this.ctx, wall = performance.now();
    const frozen = c0 && c0.state === 'running' && this.chk && wall - this.chk.wall > 400 && c0.currentTime - this.chk.t < 0.05;
    if (c0 && (c0.state === 'interrupted' || c0.state === 'closed' || this.stuck || frozen ||
        (c0.state !== 'running' && wall - (this.madeAt || 0) > 1000))) this.drop();
    if (!this.ctx) { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.madeAt = performance.now(); this.chk = null; }
    if (this.ctx.state === 'running' && (!this.chk || this.ctx.currentTime - this.chk.t > 0.05)) this.chk = { t: this.ctx.currentTime, wall };
    // iPhone: sound that follows the silent switch is the usual "no sound" report; ask for media-style playback (iOS 16.4+)
    this.session(window.KTMicOn ? 'play-and-record' : 'playback');
    const c = this.ctx;
    if (c.state !== 'running') {
      // a resume that has not taken hold by the next tap means this context is stuck
      clearTimeout(this.stuckTimer);
      this.stuckTimer = setTimeout(() => { if (this.ctx === c && c.state !== 'running') this.stuck = true; }, 600);
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});   // iOS also uses 'interrupted'
    this.isUnlocked = true;
    // older iPhones have no audioSession: a looping silent clip is what lets Web Audio ignore the silent switch there
    const silent = document.getElementById('ios-silent-audio');
    if (silent && !navigator.audioSession) silent.play().catch(() => {});
  }
  session(type) {
    try { if (navigator.audioSession && navigator.audioSession.type !== type) navigator.audioSession.type = type; } catch (e) { /* not supported */ }
  }
  // close the context so the next tap builds a fresh one (the app goes to the background or the screen locks)
  drop() {
    const c = this.ctx;
    this.ctx = null; this.kBus = null; this.stuck = false; this.chk = null;
    clearTimeout(this.stuckTimer);
    if (c) { try { c.close(); } catch (e) { /* already gone */ } }
  }
  playKalimba(freq) {
    if (!this.ctx) return;
    if (!this.kBus || this.kBus.context !== this.ctx) {   // limiter so fast taps on low keys don't clip
      this.kBus = this.ctx.createDynamicsCompressor();
      this.kBus.threshold.value = -6; this.kBus.ratio.value = 8;
      this.kBus.attack.value = 0.002; this.kBus.release.value = 0.15;
      this.kBus.connect(this.ctx.destination);
    }
    kalimbaVoice(this.ctx, this.kBus, freq, this.ctx.currentTime, 0.6);
  }
  playMetronome(isDownbeat = false) {
    if (!this.ctx || window.KTMicOn) return;   // the click would be heard as a note while listening
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(isDownbeat ? 880 : 440, now);
    g.gain.setValueAtTime(0.4, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.09);
  }
  playPitch(pitchStr) {
    this.init();
    const freq = midiToFreq(pitchToMidi(pitchStr));
    this.playKalimba(freq);
  }
}

const audio = new AudioEngine();
const $ = id => document.getElementById(id);
const state = {
  currentView: 'play', labelMode: 'both', noteSystem: 'thai',
  // tines tuned a half step away from the standard C kalimba, by their standard MIDI note: { 65: 1 } = F4 → F#4
  retune: (() => { try { const v = JSON.parse(localStorage.getItem('kt.retune')); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } })(),
  get tuning() { return ['B4'].concat(Object.keys(this.retune).filter(k => this.retune[k]).sort((a, b) => a - b).map(k => k + (this.retune[k] > 0 ? '+1' : '-1'))).join(' '); },
  timingToleranceMs: 80, lastTriggerTime: 0, activeTouches: new Map(),
  lesson: { currentTarget: null, correctCount: 0, missMap: {}, timer: 0 },
  inspectingNotes: [],
  library: [
    { id: 's1', title: 'Twinkle, Twinkle, Little Star', bpm: 85, notes: ['C4','C4','G4','G4','A4','A4','G4','F4','F4','E4','E4','D4','D4','C4'] }
  ]
};

function unlockAudioUI() {
  audio.init();
  // once sound is on the pill shrinks to an icon, leaving the header room for the title
  const b = $('btn-audio-status');
  if (b.dataset.ready) return;
  b.dataset.ready = '1';
  b.className = 'w-9 h-9 rounded-full border border-emerald-500/50 text-emerald-400 flex items-center justify-center';
  b.dataset.i18nAria = 'audio.ready'; b.setAttribute('aria-label', t('audio.ready'));
  b.innerHTML = icon('volume', 'w-5 h-5');
}
$('btn-audio-status').onclick = unlockAudioUI;
document.addEventListener('touchstart', unlockAudioUI, { once: true });

// the note name in the chosen system: ด / C / 1
function noteName(pitch) {
  return state.noteSystem === 'thai' ? pitchToThai(pitch) : state.noteSystem === 'number' ? pitchToNumber(pitch) : pitch;
}

const VIEW_SECTIONS = { play: 'section-play', player: 'section-player', sheet: 'section-sheet', lesson: 'section-lesson', tuner: 'section-tuner', add: 'section-add', review: 'section-review' };
const NAV_OF = { play: 'play', player: 'add', sheet: 'add', lesson: 'lesson', tuner: 'tuner', add: 'add', review: 'add' };
const KALIMBA_SLOT = { play: 'play', player: 'player', lesson: 'lesson' };
function switchView(viewName) {
  if (state.currentView === 'review' && viewName !== 'review' && window.M2 && !M2.leaveReview()) return;
  const from = state.currentView;
  if (from === 'player' && viewName !== 'player' && window.KTFall) KTFall.pause();
  if (from === 'sheet' && viewName !== 'sheet' && window.KTSheet) KTSheet.stop();
  $('pl-ctrl').classList.add('hidden');
  state.currentView = viewName;
  Object.values(VIEW_SECTIONS).forEach(id => $(id).classList.add('hidden'));
  $(VIEW_SECTIONS[viewName]).classList.remove('hidden');
  document.querySelectorAll('#bottom-nav [data-view]').forEach(b => {
    if (b.dataset.view === NAV_OF[viewName]) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  document.body.classList.toggle('no-nav', viewName === 'review');
  document.body.classList.toggle('in-player', viewName === 'player');
  document.body.classList.toggle('on-play', viewName === 'play');
  const hdr = document.querySelector('header');   // the Play page hides the header; keep --hdr for the others
  if (hdr && hdr.offsetHeight) document.documentElement.style.setProperty('--hdr', (hdr.offsetHeight + 4) + 'px');
  if (KALIMBA_SLOT[viewName]) mountKalimba(KALIMBA_SLOT[viewName]);
  if (viewName === 'lesson') { if (window.KTLesson) KTLesson.enter(); else startNextLessonQuestion(); }
  else if (viewName === 'add') renderLibrary();
  if (window.KTMicSync) KTMicSync();
  if (viewName === 'player' && window.KTFall) KTFall.layout();
  window.scrollTo(0, 0);
}
document.querySelectorAll('#bottom-nav [data-view]').forEach(b => { b.onclick = () => switchView(b.dataset.view); });

// one kalimba moves between the pages that need it
function mountKalimba(slot) {
  const host = document.querySelector('[data-kslot="' + slot + '"]'), k = $('view-kalimba');
  if (host && k.parentNode !== host) host.appendChild(k);
}

function profileKeys() {
  return PROFILE_KALIMBA_17.keys.map(k => {
    const off = state.retune[pitchToMidi(k.pitch)] || 0;
    return Object.assign({}, k, { pitch: off ? midiToPitch(pitchToMidi(k.pitch) + off) : k.pitch, base: k.pitch, retuned: off });
  });
}
const retuneSummary = () => profileKeys().filter(k => k.retuned).map(k => tineNum(k.pitch)).join(' ');
// a tine's kalimba number with its octave marks and ♯/♭ in front, e.g. ♯4'
function tineNum(pitch) {
  const n = pitchToNumber(pitch), acc = /#/.test(n) ? '♯' : /b/.test(n) ? '♭' : '';
  return acc + n.replace(/[#b]/g, '');
}

// tine colours: the left hand's tines are warm (blush to terracotta), the right hand's cool (misty to olive),
// darker towards the edges like the reference design; the middle tine is cream
const TINE_COLORS = { L: ['#EDCBC2', '#B4613F'], R: ['#CDD8E3', '#5F6B50'], C: '#FBF8F2' };
function mixHex(a, b, t) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const x = p(a), y = p(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function hexLum(h) {
  const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function tineColor(k, i, keys) {
  if (k.hand === 'C') return TINE_COLORS.C;
  const ci = keys.findIndex(x => x.hand === 'C'), d = Math.abs(i - ci);
  const max = k.hand === 'L' ? ci : keys.length - 1 - ci, [near, far] = TINE_COLORS[k.hand];
  return mixHex(near, far, max > 1 ? (d - 1) / (max - 1) : 0);
}
// "5" with octave dots above (higher) or below (lower), as kalimba tabs write it
function numberParts(pitch) {
  const n = pitchToNumber(pitch), up = (n.match(/'/g) || []).length, dn = n[0] === '.' ? 1 : 0;
  let d = n.replace(/'/g, '').replace(/^\./, '');
  if (/b$/.test(d)) d = '♭' + d.slice(0, -1); else if (/#$/.test(d)) d = '♯' + d.slice(0, -1);
  return { d, up, dn };
}
function tineLabel(pitch) {
  if (state.labelMode === 'none') return '';
  const p = numberParts(pitch), dots = n => '<span class="tl-dots">' + '•'.repeat(n) + '</span>';
  const name = state.noteSystem === 'number' ? pitch : noteName(pitch);
  if (state.labelMode === 'note') return '<div class="tl"><span class="tl-num">' + name + '</span></div>';
  const num = dots(p.up) + '<span class="tl-num">' + p.d + '</span>' + dots(p.dn);
  return '<div class="tl">' + num + (state.labelMode === 'both' ? '<span class="tl-name">' + name + '</span>' : '') + '</div>';
}

function renderKalimba() {
  const wrapper = $('kalimba-tines-wrapper'); wrapper.innerHTML = '';
  const keys = profileKeys();
  keys.forEach((k, i) => {
    const tine = document.createElement('div');
    tine.className = 'kalimba-tine flex flex-col justify-end items-center pb-2 cursor-pointer select-none';
    tine.dataset.pitch = k.pitch;
    tine.dataset.hand = k.hand;
    tine.style.height = `calc(var(--tine-h) * ${k.lengthPct / 100} + 30px)`;
    const c = tineColor(k, i, keys), tip = mixHex(c, '#FFFFFF', 0.35);
    tine.style.background = `linear-gradient(180deg, ${c} 0, ${c} calc(100% - var(--tip)), ${tip} calc(100% - var(--tip)), ${tip} 100%)`;
    tine.style.color = hexLum(tip) > 0.32 ? '#3A402F' : '#FFF9F0';
    tine.innerHTML = tineLabel(k.pitch);
    wrapper.appendChild(tine);
  });
  if (window.KTFall) KTFall.layout();
  if (window.KTTuner) KTTuner.render();
}

// the sound hole on the Play page shows the note just played
function showPlayed(pitch) {
  const p = numberParts(pitch), el = $('active-note-display');
  el.innerHTML = '<div class="an-dots">' + '•'.repeat(p.up) + '</div><div class="an-num">' + p.d + '</div><div class="an-dots">' + '•'.repeat(p.dn) + '</div>' +
    '<div class="an-name">' + noteName(pitch) + (state.noteSystem === 'western' ? '' : ' · ' + pitch) + '</div>';
  el.classList.remove('hidden'); $('hole-idle').classList.add('hidden');
}

let activeTwoHandTimeout = null;
function triggerNotePlay(el) {
  if (!el || !el.dataset.pitch) return;
  const pitch = el.dataset.pitch;
  audio.playPitch(pitch);
  el.classList.add('active'); setTimeout(() => el.classList.remove('active'), 140);
  showPlayed(pitch);

  const now = performance.now(), diff = now - state.lastTriggerTime;
  if (diff > 5 && diff <= state.timingToleranceMs) {
    $('two-hand-badge').classList.remove('hidden'); $('two-hand-ms').textContent = `(${Math.round(diff)}ms)`;
    clearTimeout(activeTwoHandTimeout); activeTwoHandTimeout = setTimeout(() => $('two-hand-badge').classList.add('hidden'), 1200);
  }
  state.lastTriggerTime = now;
  judgePitch(pitch);
}

// a note the player produced: a tapped tine, or a real kalimba heard through the microphone.
// at = AudioContext time of the pluck when it is known (the microphone hears it a little late)
function judgePitch(pitch, at) {
  if (window.KTFirst) KTFirst.onNote(pitch);
  if (state.currentView === 'player' && window.KTFall) KTFall.onNote(pitch, at);
  if (state.currentView === 'sheet' && window.KTSheet) KTSheet.onNote(pitch, at);

  if (state.currentView === 'lesson' && window.KTLesson && KTLesson.mode === 'run') { KTLesson.onNote(pitch); return; }
  if (state.currentView === 'lesson' && state.lesson.currentTarget) {
    if (pitch === state.lesson.currentTarget) {
      $('lesson-feedback').innerHTML = '<span class="text-emerald-400 font-semibold">✓ ' + t('le.right') + '</span>';
      state.lesson.correctCount++; $('lesson-correct-count').textContent = state.lesson.correctCount;
      clearTimeout(state.lesson.timer);
      state.lesson.timer = setTimeout(startNextLessonQuestion, 800);
    } else {
      $('lesson-feedback').innerHTML = '<span class="text-red-400 font-semibold">' + t('le.wrong') + '</span>';
      state.lesson.missMap[state.lesson.currentTarget] = (state.lesson.missMap[state.lesson.currentTarget] || 0) + 1;
      $('lesson-weak-note').textContent = noteName(state.lesson.currentTarget);
    }
  }
}

// the tine nearest to a screen x: every point across the kalimba (and the note lanes above it) plays a key,
// so the gaps between the thin tines are never dead
function nearestTine(x) {
  let best = null, bd = Infinity;
  document.querySelectorAll('#kalimba-tines-wrapper [data-pitch]').forEach(t => {
    const r = t.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - x);
    if (!r.width) return;   // hidden in the player
    if (d < bd) { bd = d; best = t; }
  });
  return best;
}

// skip(e) lets buttons inside the area keep working
function attachTouch(container, skip) {
  container.addEventListener('touchstart', e => {
    if (skip && skip(e)) return;
    e.preventDefault(); unlockAudioUI();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i], target = nearestTine(t.clientX);
      if (target) { state.activeTouches.set(t.identifier, target); triggerNotePlay(target); }
    }
  }, { passive: false });
  container.addEventListener('touchmove', e => {
    if (skip && skip(e)) return;
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i], cur = nearestTine(t.clientX), prev = state.activeTouches.get(t.identifier);
      if (cur && cur !== prev) { state.activeTouches.set(t.identifier, cur); triggerNotePlay(cur); }
    }
  }, { passive: false });
  const end = e => { for (let i = 0; i < e.changedTouches.length; i++) state.activeTouches.delete(e.changedTouches[i].identifier); };
  container.addEventListener('touchend', end); container.addEventListener('touchcancel', end);
  let down = null;
  container.addEventListener('mousedown', e => {
    if (skip && skip(e)) return;
    down = nearestTine(e.clientX); if (down) triggerNotePlay(down);
  });
  window.addEventListener('mouseup', () => { down = null; });
  container.addEventListener('mousemove', e => {
    if (!down) return;
    const t = nearestTine(e.clientX);
    if (t && t !== down) { down = t; triggerNotePlay(t); }
  });
}
attachTouch($('view-kalimba'));
// in the song player the whole lane a note falls down is that note's key
attachTouch($('pl-stage'), e => !$('pl-result').classList.contains('hidden') || !(window.KTFall && KTFall.src));

$('select-label-mode').onchange = e => { state.labelMode = e.target.value; renderKalimba(); };
$('select-note-system').onchange = e => {
  state.noteSystem = e.target.value;
  try { localStorage.setItem('kt.noteSystem', JSON.stringify(state.noteSystem)); } catch (err) { /* storage blocked */ }
  renderKalimba();
  if (state.currentView === 'lesson' && state.lesson.currentTarget) showLessonTarget();
  if (window.KTLesson && state.currentView === 'lesson') KTLesson.relabel();
};

// Lesson: find the asked note on the kalimba
function showLessonTarget() {
  const p = state.lesson.currentTarget;
  $('lesson-prompt-note').textContent = state.noteSystem === 'number' ? `${pitchToNumber(p)} (${p})` : `${noteName(p)} · ${pitchToNumber(p)}`;
}
function startNextLessonQuestion() {
  const keys = profileKeys().map(k => k.pitch), miss = state.lesson.missMap;
  // notes missed before come back more often
  const pool = keys.concat(keys.filter(p => miss[p]).flatMap(p => Array(Math.min(3, miss[p])).fill(p)));
  let target = pool[Math.floor(Math.random() * pool.length)];
  if (target === state.lesson.currentTarget && keys.length > 1) target = keys[(keys.indexOf(target) + 1 + Math.floor(Math.random() * (keys.length - 1))) % keys.length];
  state.lesson.currentTarget = target;
  showLessonTarget();
  $('lesson-feedback').textContent = t('le.hint');
}
$('btn-lesson-next').onclick = startNextLessonQuestion;

// Presets, import, review and the song library live in the M2 module at the end of this script
function renderLibrary() { if (window.M2) M2.renderLibrary(); }

// settings: tap a tine to cycle it natural → ♯ (a half step up) → ♭ (a half step down)
function renderRetune() {
  $('set-retune').innerHTML = profileKeys().map(k =>
    '<button type="button" data-rt="' + pitchToMidi(k.base) + '" class="h-11 rounded-lg border text-[12px] font-semibold leading-tight ' +
    (k.retuned ? 'seg-on border-transparent' : 'border-slate-700 text-slate-300') + '">' + tineNum(k.pitch) +
    '<span class="block text-[9px] font-normal opacity-70">' + k.pitch + '</span></button>').join('');
  $('set-retune-note').textContent = retuneSummary() ? 'จูนไว้: ' + retuneSummary() + ' · อย่าลืมจูนก้านจริงตามนี้ (ดูได้ที่หน้าตั้งเสียง)' : 'ทุกก้านเป็นเสียงมาตรฐาน C';
}
// tune one tine (by its standard MIDI note) a half step up (1), down (-1) or back (0): kalimba, sheet strip, tuner and song checks follow
function applyRetune(m, v) {
  if (v) state.retune[m] = v; else delete state.retune[m];
  try { localStorage.setItem('kt.retune', JSON.stringify(state.retune)); } catch (err) { /* storage blocked */ }
  renderRetune(); renderKalimba();
  if (window.M2) M2.onTuning();
  if (window.KTTuner) KTTuner.render();
}
$('set-retune').addEventListener('click', e => {
  const b = e.target.closest('[data-rt]');
  if (!b) return;
  const m = b.dataset.rt, cur = state.retune[m] || 0;
  applyRetune(m, cur === 0 ? 1 : cur === 1 ? -1 : 0);
});
$('btn-open-settings').onclick = () => {
  renderRetune();
  $('set-haptic').checked = Haptic.on;
  const l = document.querySelector('input[name="app-lang"][value="' + LANG + '"]');
  if (l) l.checked = true;
  try { $('set-real').checked = JSON.parse(localStorage.getItem('kt.hasReal')) === true; } catch (e) { $('set-real').checked = false; }
  $('modal-settings').classList.remove('hidden');
};
$('btn-close-settings').onclick = () => $('modal-settings').classList.add('hidden');
$('btn-save-settings').onclick = () => {
  const lang = document.querySelector('input[name="app-lang"]:checked');
  if (lang && lang.value !== LANG) setLang(lang.value);
  try { localStorage.setItem('kt.hasReal', JSON.stringify($('set-real').checked)); } catch (e) { /* storage blocked */ }
  $('modal-settings').classList.add('hidden');
};

// Thai / English
function setLang(l) {
  LANG = l;
  let chosen = null;
  try { localStorage.setItem('kt.lang', JSON.stringify(l)); chosen = localStorage.getItem('kt.noteSystem'); } catch (e) { /* storage blocked */ }
  if (!chosen) { state.noteSystem = l === 'th' ? 'thai' : 'western'; $('select-note-system').value = state.noteSystem; }
  applyI18n();
  renderKalimba();
  if (state.currentView === 'lesson' && state.lesson.currentTarget) { showLessonTarget(); $('lesson-feedback').textContent = t('le.hint'); }
  if (window.KTLesson && state.currentView === 'lesson') KTLesson.relabel();
  if (state.currentView === 'add') renderLibrary();
  if (window.KTFirst && KTFirst.running) KTFirst.render();
  if (window.KTFall) KTFall.relabel();
  if (window.KTTuner) KTTuner.render();
}
$('btn-lang').onclick = () => setLang(LANG === 'th' ? 'en' : 'th');

(() => {   // saved preferences; English speakers get letter names unless they chose otherwise
  let ns = null;
  try { ns = JSON.parse(localStorage.getItem('kt.noteSystem')); } catch (e) { /* none saved */ }
  state.noteSystem = ns === 'thai' || ns === 'number' || ns === 'western' ? ns : (LANG === 'th' ? 'thai' : 'western');
  $('select-note-system').value = state.noteSystem;
})();
fillIcons();
applyI18n();
renderKalimba();
mountKalimba('play');
document.querySelector('#nav-tab-play').setAttribute('aria-current', 'page');
document.body.classList.add('on-play');

// Play page: round buttons and the options sheet
function playSheet(open) {
  $('play-sheet').classList.toggle('hidden', !open);
  if (open) $('play-sheet').querySelector('[data-close].w-10').focus(); else $('play-menu').focus();
}
$('play-menu').onclick = () => playSheet(true);
$('play-sheet').querySelectorAll('[data-close]').forEach(b => { b.onclick = () => playSheet(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('play-sheet').classList.contains('hidden')) playSheet(false); });
$('ps-sound').onclick = () => { unlockAudioUI(); audio.playPitch('C5'); };
$('ps-lang').onclick = () => setLang(LANG === 'th' ? 'en' : 'th');
$('ps-settings').onclick = () => { playSheet(false); $('btn-open-settings').click(); };

/* ============================ Milestone 2 ============================ */
(() => {
'use strict';


/* ====================== M2 app code (import · review · IndexedDB library) ====================== */

const $ = (s, r) => (r || document).querySelector(s);      // NB: shadows the M1 id-helper inside this scope only
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const byId = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ls = {
  get(k, d) { try { const v = localStorage.getItem('kt.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('kt.' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
};

// a small tap on the phone when a key is pressed: Android vibrates; iPhone (Safari 17.4+) answers a toggled <input switch> with a haptic tick.
// iOS only does it for a click made while the finger gesture is still being handled, on a switch made fresh each time and hidden with
// display:none (the recipe the ios-haptics library uses) — an off-screen, transparent, long-lived switch gave no tick on Fun's iPhone.
const Haptic = {
  on: ls.get('haptic', true),
  tick() {
    if (!this.on) return;
    try { if (navigator.vibrate && navigator.vibrate(8)) return; } catch (e) { /* no vibration here */ }
    try {
      const l = document.createElement('label'), c = document.createElement('input');
      l.setAttribute('aria-hidden', 'true'); l.style.display = 'none';
      c.type = 'checkbox'; c.setAttribute('switch', ''); l.appendChild(c);
      document.head.appendChild(l);
      l.click();
      l.remove();
    } catch (e) { /* no haptics here */ }
  }
};

// light / dark: the choice is kept; the page already got it from the <head> script before it painted
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('kt.theme', t); } catch (e) { /* storage blocked */ }
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = t === 'dark' ? '#1A1D17' : '#F2EDE2';
}
const isDark = () => document.documentElement.dataset.theme === 'dark';
setTheme(isDark() ? 'dark' : 'light');
document.getElementById('btn-theme').addEventListener('click', () => { setTheme(isDark() ? 'light' : 'dark'); Haptic.tick(); });
byId('set-haptic').addEventListener('change', e => { Haptic.on = e.target.checked; ls.set('haptic', Haptic.on); Haptic.tick(); });
window.Haptic = Haptic;   // the settings page (outside this closure) reads it
const uid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }

const S = {
  keypad: ls.get('keypad', true),
  addSub: 'library',
  songs: [],
  review: null,      // { song, dirty, from, notes }
  parsed: null,
  get tuning() { return state.tuning; },
  get noteSystem() { return state.noteSystem; }
};

let toastTimer = 0;
function toast(msg, ms) {
  const t = byId('toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), ms || 2200);
}

/* ---- sound for previews: shares the M1 AudioContext ---- */
const Synth = {
  ctx: null, master: null,
  freq(m) { return 440 * Math.pow(2, (m - 69) / 12); },
  ensure() {
    if (!audio.ctx || audio.ctx.state !== 'running') audio.init();
    const c = audio.ctx;
    if (!c) return false;
    if (this.ctx !== c) {
      this.ctx = c;
      this.master = c.createGain(); this.master.gain.value = 0.85;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
      this.master.connect(comp); comp.connect(c.destination);
    }
    if (c.state !== 'running') c.resume();
    return true;
  },
  kalimba(dest, midi, t, vel) {
    kalimbaVoice(this.ctx, dest, this.freq(midi), t, 0.6 * vel);   // same voice as the keyboard page
  }
};

const Player = {
  timer: 0, bus: null, ui: [], onEnd: null, playing: false,
  start(parsed, opt) {
    this.stop();
    if (!Synth.ensure()) { toast('เบราว์เซอร์นี้เล่นเสียงไม่ได้'); return; }
    const c = Synth.ctx, spb = 60 / opt.tempo, from = opt.from || 0;
    if (!parsed.measures[from]) return;
    const base = parsed.measures[from].start, ev = [];
    parsed.measures.forEach(pm => {
      if (pm.index < from) return;
      const mt = (pm.start - base) * spb;
      ev.push({ t: mt, k: 'm', i: pm.index });
      pm.notes.forEach(n => ev.push({ t: mt + n.beat * spb, k: 'n', midi: n.midi, tok: n.tok }));
      if (opt.chords) pm.chords.forEach(ch => ev.push({ t: mt + ch.beat * spb, k: 'c', ch }));
    });
    ev.sort((a, b) => a.t - b.t);
    const endT = (parsed.totalBeats - base) * spb;
    this.bus = c.createGain(); this.bus.connect(Synth.master);
    this.onEnd = opt.onEnd; this.playing = true;
    const bus = this.bus, token = this.token = (this.token || 0) + 1;
    let idx = 0;
    // a context iOS has not woken yet has a frozen clock: scheduling on it plays nothing and never moves on.
    // So wait until it runs; if it does not within 1.5 s, say so and make the next tap build a fresh one.
    const begin = () => {
    const T0 = c.currentTime + 0.15;
    this.timer = setInterval(() => {
      const now = c.currentTime;
      while (idx < ev.length && T0 + ev[idx].t < now + 0.25) {
        const e = ev[idx++], at = T0 + e.t;
        if (e.k === 'n') Synth.kalimba(bus, e.midi, at, 0.85);
        else if (e.k === 'c') {
          if (e.ch.type === 'chord') {
            e.ch.midis.slice(0, 4).forEach((m, j) => Synth.kalimba(bus, m, at + j * 0.012, 0.26));
            Synth.kalimba(bus, e.ch.bassMidi, at, 0.5);
          } else if (e.ch.type === 'notes') {
            e.ch.midis.forEach((m, j) => Synth.kalimba(bus, m, at + j * (e.ch.strum ? 0.07 : 0.012), 0.4));
          } else if (e.ch.type === 'bass') Synth.kalimba(bus, e.ch.midi, at, 0.55);
        }
        if (opt.onEvent && (e.k === 'n' || e.k === 'm')) this.ui.push(setTimeout(() => opt.onEvent(e), Math.max(0, (at - now) * 1000)));
      }
      if (idx >= ev.length && now > T0 + endT + 0.6) this.stop();
    }, 25);
    };
    if (c.state === 'running') begin();
    else {
      const t0 = performance.now();
      this.timer = setInterval(() => {
        if (this.token !== token) { clearInterval(this.timer); return; }
        if (c.state === 'running') { clearInterval(this.timer); begin(); }
        else if (performance.now() - t0 > 1500) { audio.stuck = true; this.stop(); toast('เสียงยังไม่ตื่น — แตะเล่นอีกครั้ง', 3000); }
      }, 40);
    }
  },
  stop() {
    this.token = (this.token || 0) + 1;
    clearInterval(this.timer); this.timer = 0;
    this.ui.forEach(clearTimeout); this.ui = [];
    if (this.bus && Synth.ctx) {
      const b = this.bus;
      b.gain.setTargetAtTime(0, Synth.ctx.currentTime, 0.03);
      setTimeout(() => { try { b.disconnect(); } catch (e) { /* gone */ } }, 400);
    }
    this.bus = null; this.playing = false;
    const cb = this.onEnd; this.onEnd = null;
    if (cb) cb();
  }
};

/* ---- IndexedDB ---- */
const DB = {
  _p: null,
  open() {
    if (this._p) return this._p;
    this._p = new Promise((res, rej) => {
      if (!window.indexedDB) { rej(new Error('เบราว์เซอร์นี้ไม่รองรับ IndexedDB')); return; }
      const r = indexedDB.open('kalimba-trainer', 1);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains('songs')) db.createObjectStore('songs', { keyPath: 'id' }).createIndex('updated', 'updated');
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    this._p.catch(() => { this._p = null; });
    return this._p;
  },
  async run(mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const t = db.transaction('songs', mode);
      let out;
      const rq = fn(t.objectStore('songs'));
      if (rq) rq.onsuccess = () => { out = rq.result; };
      t.oncomplete = () => res(out);
      t.onerror = t.onabort = () => rej(t.error || new Error('transaction failed'));
    });
  },
  put(s) { return this.run('readwrite', st => st.put(s)); },
  del(id) { return this.run('readwrite', st => st.delete(id)); },
  all() { return this.run('readonly', st => st.getAll()); }
};

/* ---- songs for the player: saved songs, the free catalog and the built-in samples ---- */
const BUILTIN = state.library.slice();
function syncPracticeLibrary() {
  state.library = S.songs.map(s => ({ id: s.id, title: s.title, song: s }))
    .concat(freeList().map(x => ({ id: x.song.id, title: x.meta.title, song: x.song })), BUILTIN);
}
function practiceWith(id) {
  const s = state.library.find(x => x.id === id);
  if (s) practiceRoute(s);
}
window.selectSongForPractice = practiceWith;

async function loadSongs() {
  try { S.songs = (await DB.all()).sort((a, b) => (b.updated || 0) - (a.updated || 0)); }
  catch (e) { S.songs = []; toast('อ่านเพลงในเครื่องไม่ได้: ' + (e && e.message || e), 3500); }
  syncPracticeLibrary();
  if (state.currentView === 'add') renderLibrary();
}

/* ---- navigation inside the add tab ---- */
function applyAddSub() {
  byId('add-library').classList.toggle('hidden', S.addSub !== 'library');
  byId('add-import').classList.toggle('hidden', S.addSub !== 'import');
}
function go(sub) { S.addSub = sub; applyAddSub(); switchView('add'); window.scrollTo(0, 0); }
function leaveReview() {
  if (S.review && S.review.dirty) {
    if (!confirm('มีการแก้ไขที่ยังไม่ได้บันทึก ทิ้งการแก้ไขไหม?')) return false;
    S.review.dirty = false;
  }
  Player.stop(); hideKeypad();
  return true;
}

/* ---- library ---- */
function fmtDate(ts) { try { return new Date(ts).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }); } catch (e) { return ''; } }

function renderLibrary() {
  applyAddSub();
  byId('lib-empty').classList.toggle('hidden', S.songs.length > 0);
  byId('lib-list').innerHTML = S.songs.map(s => {
    const sm = summarize(parseSong(s, state.tuning));
    const badge = sm.range ? '<span class="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] whitespace-nowrap">⚠ นอกช่วง ' + sm.range + '</span>'
      : sm.errors ? '<span class="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] whitespace-nowrap">⚠ ' + sm.errors + ' จุด</span>'
      : '<span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] whitespace-nowrap">✓ อยู่ในช่วง</span>';
    return '<div class="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2" data-id="' + esc(s.id) + '">' +
      '<div class="flex items-start gap-2"><div class="flex-1 min-w-0"><div class="font-bold text-slate-100 text-sm truncate">' + esc(s.title || 'เพลงไม่มีชื่อ') + '</div>' +
      '<div class="text-[10px] text-slate-400">' + s.measures.length + ' ห้อง • ' + s.tempo + ' BPM • ' + s.beats + ' จังหวะ • ' + esc(fmtDate(s.updated)) + '</div></div>' + badge + '</div>' +
      '<div class="flex flex-wrap gap-1.5 text-xs">' +
      '<button data-lib="prac" class="h-9 px-4 rounded-full bg-amber-500 text-slate-950 font-semibold">' + esc(t('lib.practice')) + '</button>' +
      '<button data-lib="sheet" class="h-9 px-3 rounded-full border border-slate-700 text-slate-200">' + esc(t('lib.sheet')) + '</button>' +
      '<button data-lib="edit" class="h-9 px-3 rounded-full border border-slate-700 text-slate-200">' + esc(t('lib.edit')) + '</button>' +
      '<button data-lib="copy" class="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700">📋</button>' +
      '<button data-lib="del" class="ml-auto px-3 py-1.5 rounded-lg bg-slate-800 text-rose-300 border border-slate-700">🗑</button></div></div>';
  }).join('');
  byId('lib-builtin').innerHTML = BUILTIN.map(b =>
    '<div class="p-3 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between text-xs" data-id="' + esc(b.id) + '">' +
    '<div><h4 class="font-semibold text-slate-100">' + esc(b.title) + '</h4><p class="text-[11px] text-slate-400">' + esc(t('lib.notes', { n: b.notes.length })) + ' · ' + b.bpm + ' BPM</p></div>' +
    '<button data-lib="prac" class="h-9 px-4 rounded-full bg-amber-500 text-slate-950 font-semibold shrink-0">' + esc(t('lib.practice')) + '</button></div>').join('');
  renderFree();
  applyLibSearch();
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* fall through */ }
  const ta = el('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* none */ }
  ta.remove(); return ok;
}

function setupLibrary() {
  byId('btn-lib-add').addEventListener('click', () => go('import'));
  byId('add-library').addEventListener('click', async e => {
    const b = e.target.closest('[data-lib]');
    if (!b) return;
    const id = b.closest('[data-id]').dataset.id, act = b.dataset.lib;
    if (act === 'prac') { practiceWith(id); return; }
    if (act === 'sheet') { const x = state.library.find(y => y.id === id); if (x) Sheet.open(x); return; }
    const s = S.songs.find(x => x.id === id);
    if (!s) return;
    if (act === 'play' || act === 'edit') openReview(JSON.parse(JSON.stringify(s)), { from: 'library', autoplay: act === 'play' });
    else if (act === 'copy') toast((await copyText(songToText(s))) ? 'คัดลอกโน้ตแล้ว ✓' : 'คัดลอกไม่ได้');
    else if (act === 'del') {
      if (!confirm('ลบเพลง "' + (s.title || 'ไม่มีชื่อ') + '" ออกจากเครื่อง?')) return;
      try { await DB.del(id); toast('ลบแล้ว'); } catch (err) { toast('ลบไม่ได้: ' + (err && err.message || err)); }
      loadSongs();
    }
  });
  byId('btn-backup').addEventListener('click', () => {
    if (!S.songs.length) { toast('ยังไม่มีเพลงให้สำรอง'); return; }
    const blob = new Blob([JSON.stringify({ app: 'kalimba-trainer', version: 1, exported: Date.now(), songs: S.songs }, null, 1)], { type: 'application/json' });
    const a = el('a'); a.href = URL.createObjectURL(blob); a.download = 'kalimba-songs-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });
  byId('btn-restore').addEventListener('click', () => byId('file-restore').click());
  byId('file-restore').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const list = (data && data.songs) || [];
      let n = 0;
      for (const s of list) {
        if (!s || !Array.isArray(s.measures)) continue;
        const cur = S.songs.find(x => x.id === s.id);
        if (cur && (cur.updated || 0) >= (s.updated || 0)) continue;
        await DB.put({
          id: s.id || uid(), title: String(s.title || ''), tempo: +s.tempo || 100, beats: +s.beats || 4, octaveShift: +s.octaveShift || 0,
          created: s.created || Date.now(), updated: s.updated || Date.now(),
          measures: s.measures.map(m => Object.assign({ mel: String(m.mel || ''), lyr: String(m.lyr || ''), chd: String(m.chd || ''), br: !!m.br }, m.gap != null && (m.br || m.gap > 0) ? { gap: Math.max(0, Math.min(4, +m.gap | 0)) } : {}))
        });
        n++;
      }
      toast('กู้คืน ' + n + ' เพลง'); loadSongs();
    } catch (err) { toast('อ่านไฟล์ไม่ได้: ' + (err && err.message || err), 3500); }
  });
}

/* ---- import from a photo of a number sheet: read on the device by js/sheetread.js + Tesseract ---- */
const PHOTO_TEMPO = 120;
const PhotoOCR = {
  base: 'vendor/tesseract/', text: null, num: null, psm: {},
  loadLib() {
    if (window.Tesseract) return Promise.resolve();
    return new Promise((res, rej) => {
      const sc = el('script'); sc.src = this.base + 'tesseract.min.js';
      sc.onload = res; sc.onerror = () => rej(new Error('โหลดตัวอ่านรูปไม่ได้ — ครั้งแรกต้องต่อเน็ต'));
      document.head.appendChild(sc);
    });
  },
  async start(onStatus) {
    await this.loadLib();
    const base = new URL(this.base, location.href).href;
    // cacheMethod none: the service worker keeps these files, so they are not stored twice
    const opt = { workerPath: base + 'worker.min.js', corePath: base, langPath: base + 'lang', gzip: true, cacheMethod: 'none', workerBlobURL: false,
      logger: m => onStatus && onStatus(m) };
    this.text = await Tesseract.createWorker(['tha', 'eng'], 1, opt);
    this.num = await Tesseract.createWorker('eng', 1, opt);
    await this.num.setParameters({ tessedit_char_whitelist: '1234567#' });
    this.psm = {};
  },
  async stop() {
    for (const w of [this.text, this.num]) if (w) { try { await w.terminate(); } catch (e) { /* already gone */ } }
    this.text = this.num = null;
  },
  // img: greyscale { w, h, data } from SheetRead; lines and digits are read 3x enlarged
  async ocr(kind, img) {
    const sc = kind === 'block' ? 1 : 3, wk = kind === 'line' || kind === 'block' ? this.text : this.num;
    const want = kind === 'block' ? '6' : '7', key = wk === this.text ? 't' : 'n';
    if (this.psm[key] !== want) { await wk.setParameters({ tessedit_pageseg_mode: want, preserve_interword_spaces: '1' }); this.psm[key] = want; }
    const src = el('canvas'); src.width = img.w; src.height = img.h;
    const sctx = src.getContext('2d'), id = sctx.createImageData(img.w, img.h);
    for (let i = 0; i < img.data.length; i++) { const v = img.data[i], j = i * 4; id.data[j] = id.data[j + 1] = id.data[j + 2] = v; id.data[j + 3] = 255; }
    sctx.putImageData(id, 0, 0);
    let cv = src;
    if (sc !== 1) {
      cv = el('canvas'); cv.width = Math.round(img.w * sc); cv.height = Math.round(img.h * sc);
      const c = cv.getContext('2d'); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(src, 0, 0, cv.width, cv.height);
    }
    const d = (await wk.recognize(cv, {}, { blocks: true })).data, out = [];
    (d.blocks || []).forEach(b => b.paragraphs.forEach(pg => pg.lines.forEach(l => {
      if (kind === 'block') out.push({ text: l.text.trim(), x0: l.bbox.x0, x1: l.bbox.x1, y0: l.bbox.y0, y1: l.bbox.y1 });
      else l.words.forEach(wd => out.push({ text: wd.text, x0: wd.bbox.x0 / sc, x1: wd.bbox.x1 / sc, y0: wd.bbox.y0 / sc, y1: wd.bbox.y1 / sc }));
    })));
    return out;
  }
};

// a picked image → RGBA pixels at most 1600 px wide, plus a small JPEG kept with the song for checking
function loadPage(file) {
  const draw = (src, nw, nh) => {
    const k = Math.min(1, 1600 / nw), w = Math.round(nw * k), h = Math.round(nh * k);
    const cv = el('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.drawImage(src, 0, 0, w, h);
    const tk = Math.min(1, 900 / w), tc = el('canvas'); tc.width = Math.round(w * tk); tc.height = Math.round(h * tk);
    tc.getContext('2d').drawImage(cv, 0, 0, tc.width, tc.height);
    return { data: c.getImageData(0, 0, w, h).data, width: w, height: h, channels: 4, thumb: tc.toDataURL('image/jpeg', 0.72) };
  };
  return new Promise((res, rej) => {
    const u = URL.createObjectURL(file), im = new Image();
    let done = false;
    const bad = () => rej(new Error('เปิดรูปไม่ได้: ' + file.name));
    // the picker sometimes hands over a file <img> cannot decode (or never answers): try the browser's other decoder before giving up
    const fallback = async () => {
      if (done) return; done = true; clearTimeout(timer); URL.revokeObjectURL(u);
      try { const bm = await createImageBitmap(file); const out = draw(bm, bm.width, bm.height); if (bm.close) bm.close(); res(out); }
      catch (e) { bad(); }
    };
    const timer = setTimeout(fallback, 15000);
    im.onerror = fallback;
    im.onload = () => {
      if (done) return; done = true; clearTimeout(timer); URL.revokeObjectURL(u);
      try { res(draw(im, im.naturalWidth, im.naturalHeight)); } catch (e) { bad(); }
    };
    im.src = u;
  });
}

async function importPhotos(list) {
  const files = Array.from(list || []).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  if (!files.length) return;
  const btn = byId('btn-photo'), bar = byId('photo-bar'), st = byId('photo-status');
  const show = (f, msg) => { bar.style.width = Math.round(f * 100) + '%'; st.textContent = msg; };
  byId('photo-progress').classList.remove('hidden'); btn.disabled = true;
  try {
    show(0.02, 'กำลังเปิดตัวอ่านรูป…');
    await PhotoOCR.start(m => { if (m && /load/.test(m.status || '')) show(0.02 + 0.08 * (m.progress || 0), 'กำลังโหลดตัวอ่านรูป (ครั้งแรกราว 8 MB)…'); });
    const texts = [], photos = [], meta = [], failed = [];
    let title = '';
    for (let i = 0; i < files.length; i++) {
      try {
        const page = await loadPage(files[i]);
        const res = await SheetRead.read(page, (k, img) => PhotoOCR.ocr(k, img),
          f => show(0.1 + 0.9 * (i + f) / files.length, 'กำลังอ่านหน้า ' + (i + 1) + '/' + files.length + '…'));
        if (!title) title = res.title;
        if (!res.text) { failed.push('หน้า ' + (i + 1) + ' ไม่พบเลขโน้ต'); continue; }
        const pi = photos.length;
        photos.push(page.thumb); texts.push(res.text);
        // each line's box as fractions of the page (a little margin around it)
        const W = page.width, H = page.height, pad = Math.round(W * 0.012), padY = Math.round(W * 0.022);
        res.rects.forEach(r => meta.push({ p: pi, ar: +(W / H).toFixed(4),
          x0: Math.max(0, r.x0 - pad) / W, x1: Math.min(W, r.x1 + pad) / W, y0: Math.max(0, r.y0 - padY) / H, y1: Math.min(H, r.y1 + padY) / H }));
      } catch (e) { failed.push('หน้า ' + (i + 1) + ': ' + (e && e.message || e)); }
    }
    if (!texts.length) throw new Error(failed.length ? failed.join(' · ') + ' — ลองเลือกรูปใหม่ หรือแคปหน้าจอแทนการถ่ายรูป' : 'ไม่พบเลขโน้ตในรูป — ลองรูปที่ชัดขึ้น หรือแคปหน้าจอแทนการถ่ายรูป');
    const text = texts.join('\n\n');
    byId('imp-text').value = text; byId('imp-title').value = title;
    byId('imp-tempo').value = PHOTO_TEMPO;   // one written slot is about half a second on the sheets measured, so 1 slot = 1 beat at ~120
    S.photoDraft = { photos, meta };
    show(1, 'อ่านเสร็จ ✓ ตรวจโน้ตก่อนบันทึก');
    convertImport([{ level: 'info', msg: 'อ่านจากรูป ' + texts.length + ' หน้า · ตัวที่อ่านไม่ออกเป็น ? ให้แก้ตามรูปต้นฉบับด้านล่าง' }]
      .concat(failed.length ? [{ level: 'warn', msg: 'อ่านไม่ได้: ' + failed.join(' · ') + ' — เลือกรูปที่ขาดไปอีกครั้งได้' }] : []));
  } catch (e) {
    show(0, '✖ ' + (e && e.message || e));
  } finally {
    btn.disabled = false;
    PhotoOCR.stop();
  }
}

// the import text → review page; a song read from photos keeps them and has no in-rhythm practice
function convertImport(extra) {
  const r = importText(byId('imp-text').value, {
    title: byId('imp-title').value.trim(),
    tempo: clamp(parseInt(byId('imp-tempo').value, 10) || 100, 30, 240),
    beats: parseInt(byId('imp-beats').value, 10) || 4,
    octaveShift: parseInt(byId('imp-shift').value, 10) || 0,
    blockMeta: S.photoDraft && S.photoDraft.meta
  });
  byId('imp-msg').innerHTML = r.msgs.map(m => '<div class="' + (m.level === 'error' ? 'text-red-300' : 'text-amber-300') + '">' + (m.level === 'error' ? '✖ ' : '⚠ ') + esc(m.msg) + '</div>').join('');
  if (!r.song.measures.length) return;
  if (S.photoDraft) { r.song.source = 'photo'; r.song.photos = S.photoDraft.photos; }
  openReview(r.song, { from: 'import', isNew: true, notes: (extra || []).concat(r.msgs) });
}

/* ---- import (3-line text) ---- */
function setupImport() {
  const ta = byId('imp-text');
  const fill = (t, bpm) => { ta.value = t; byId('imp-title').value = ''; if (bpm) byId('imp-tempo').value = bpm; byId('imp-msg').innerHTML = ''; S.photoDraft = null; };
  byId('btn-preset-twinkle').addEventListener('click', () => fill(SAMPLE1, 100));
  byId('btn-preset-over').addEventListener('click', () => fill(SAMPLE2, 90));
  byId('btn-clear').addEventListener('click', () => { ta.value = ''; byId('imp-title').value = ''; byId('imp-msg').innerHTML = ''; S.photoDraft = null; });
  byId('btn-photo').addEventListener('click', () => byId('file-photo').click());
  byId('file-photo').addEventListener('change', e => { const f = Array.from(e.target.files || []); e.target.value = ''; importPhotos(f); });
  byId('btn-paste').addEventListener('click', async () => {
    try { ta.value = await navigator.clipboard.readText(); } catch (e) { toast('อ่านคลิปบอร์ดไม่ได้ — กดค้างที่ช่องแล้ววางเอง'); }
  });
  byId('btn-import-back').addEventListener('click', () => go('library'));
  byId('btn-convert').addEventListener('click', () => convertImport());
}

/* ---- review ---- */
const Strip = {
  timer: 0,
  build() {
    byId('strip').innerHTML = SORTED17.map(m => '<div class="strip-key flex-1 rounded-sm" data-m="' + m + '" style="height:' + (40 + (m - 60) * 0.6) + '%"></div>').join('');
  },
  light(midi, tok) {
    $$('#strip .lit').forEach(x => x.classList.remove('lit'));
    const k = $('#strip [data-m="' + midi + '"]'), label = byId('strip-note');
    label.textContent = tok + ' · ' + noteLabel(describe(midi, midi === 70), S.noteSystem);
    if (k) { k.classList.add('lit'); label.classList.remove('text-red-400'); label.classList.add('text-amber-300'); }
    else { label.classList.add('text-red-400'); label.classList.remove('text-amber-300'); label.textContent += ' (ไม่มีคีย์)'; }
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { $$('#strip .lit').forEach(x => x.classList.remove('lit')); }, 220);
  }
};

function openReview(song, opt) {
  song.measures = song.measures || [];
  Fix.close(); Fix.cur = -1;
  S.review = { song, dirty: !!opt.isNew, from: opt.from || 'import', notes: opt.notes || [] };
  Undo.reset();
  switchView('review');
  renderReview();
  window.scrollTo(0, 0);
  if (opt.autoplay) setTimeout(() => togglePlay(0), 60);
}

function reparse() { S.parsed = parseSong(S.review.song, S.tuning); return S.parsed; }
const fmtDur = d => (Math.abs(d - 1) < 0.01 ? '' : Math.abs(d - 0.5) < 0.01 ? '½' : Math.abs(d - 1 / 3) < 0.01 ? '⅓' : Math.abs(d - 0.25) < 0.01 ? '¼' : '×' + (Math.round(d * 100) / 100));

function renderReview() {
  const s = S.review.song;
  byId('rv-title').value = s.title || '';
  byId('rv-tempo').value = s.tempo;
  const sel = byId('rv-beats');
  if (!$$('option', sel).some(o => o.textContent === String(s.beats))) { const o = el('option'); o.textContent = s.beats; sel.appendChild(o); }
  sel.value = String(s.beats);
  byId('rv-shift').textContent = (s.octaveShift > 0 ? '+' : '') + (s.octaveShift || 0);
  byId('rv-kp').checked = S.keypad;
  byId('rv-import-notes').innerHTML = (S.review.notes || []).map(m => '<div class="' + (m.level === 'error' ? 'text-red-300' : m.level === 'info' ? 'text-emerald-300' : 'text-amber-300') + '">' +
    (m.level === 'error' ? '✖ ' : m.level === 'info' ? '✓ ' : '⚠ ') + esc(m.msg) + '</div>').join('');
  const ph = s.photos || [];
  byId('rv-photos').classList.toggle('hidden', !ph.length);
  byId('rv-photos-list').innerHTML = ph.map((u, i) => '<img src="' + esc(u) + '" alt="หน้า ' + (i + 1) + '" class="w-full rounded-lg border border-slate-800">').join('');
  renderCards();
  setPlayButton(false);
  // the photo strips pin just below the sticky play bar
  requestAnimationFrame(() => document.documentElement.style.setProperty('--rvbar', (byId('rv-bar').offsetHeight + 6) + 'px'));
}

// beats of rest before this line: its own setting (none unless set)
const gapOf = m => lineGap(m, 1, 0);
const GAP_STEPS = [0, 1, 2], gapTxt = g => g > 0 ? g + ' จังหวะ' : 'ไม่เว้น';   // whole beats only: a half beat would put the line off the beat
function cardHTML(m, i) {
  const ph = { lyr: 'เนื้อร้อง (แยกพยางค์ด้วยช่องว่าง)', mel: "ทำนอง เช่น 1 1 5 5'", chd: 'คอร์ด / เบส เช่น C . F .' };
  const inp = (f, cls) => '<input data-f="' + f + '" value="' + esc(m[f]) + '" placeholder="' + ph[f] + '" ' + ((f === 'mel' || f === 'chd') && S.keypad ? 'inputmode="none" ' : '') +
    'spellcheck="false" autocomplete="off" autocapitalize="off" autocorrect="off" class="' + cls + ' w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 placeholder-slate-600">';
  const btn = (a, t, cls) => '<button data-act="' + a + '" class="px-2 py-1 rounded-md ' + (cls || 'bg-slate-800 text-slate-300 border border-slate-700') + ' text-[11px]">' + t + '</button>';
  return '<div class="mcard bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1.5" data-i="' + i + '">' +
    '<div class="flex items-center gap-1.5"><span class="text-xs font-semibold text-amber-300">ห้อง ' + (i + 1) + (m.br && i ? ' ·ท่อนใหม่' : '') + (i && gapOf(m) > 0 ? ' · เว้น ' + gapOf(m) : '') + '</span><span class="mbadge text-[10px]"></span>' +
    '<div class="ml-auto flex gap-1">' + btn('play', '▶', 'bg-amber-600 text-white') + btn('oct-dn', '8↓') + btn('oct-up', '8↑') + btn('dup', '⧉') + btn('ins', '＋') + btn('del', '🗑', 'bg-slate-800 text-rose-300 border border-slate-700') + '</div></div>' +
    (i ? '<div class="flex items-center gap-1">' + btn('br', m.br ? '↵ เริ่มบรรทัดใหม่ ✓' : '↵ เริ่มบรรทัดใหม่', m.br ? 'bg-amber-500/20 text-amber-200 border border-amber-500/60' : '') +
      btn('gap', (m.br ? 'เว้นก่อนบรรทัด: ' : 'เว้นก่อนห้อง: ') + gapTxt(gapOf(m)), gapOf(m) > 0 ? 'bg-amber-500/20 text-amber-200 border border-amber-500/60' : '') + '</div>' : '') +
    '<div class="chips flex flex-wrap gap-1 min-h-[1.6rem]"></div>' +
    inp('lyr', 'text-sm') + inp('mel', 'mono text-base') + inp('chd', 'mono text-sm') +
    '<ul class="issues text-[11px] space-y-0.5"></ul></div>';
}

// the card of measure i (cards are grouped into lines, so not every child of #rv-list is a card)
const cardEl = i => byId('rv-list').querySelector('.mcard[data-i="' + i + '"]');

// a strip of the source photo showing just this line, kept in view while its measures scroll by
function photoStripHTML(s, src) {
  const u = src && s.photos && s.photos[src.p];
  if (!u) return '';
  const w = src.x1 - src.x0, h = src.y1 - src.y0;
  return '<div class="rv-strip" style="aspect-ratio:' + (w * src.ar / h).toFixed(3) + '"><img src="' + esc(u) + '" alt="บรรทัดในรูปต้นฉบับ" style="width:' +
    (100 / w).toFixed(3) + '%;left:' + (-src.x0 / w * 100).toFixed(3) + '%;top:' + (-src.y0 / h * 100).toFixed(3) + '%"></div>';
}

function renderCards() {
  const s = S.review.song, html = [];
  let open = false;
  s.measures.forEach((m, i) => {
    if (i === 0 || m.br) { if (open) html.push('</div>'); html.push('<div class="rv-line space-y-2">' + photoStripHTML(s, m.src)); open = true; }
    html.push(cardHTML(m, i));
  });
  if (open) html.push('</div>');
  byId('rv-list').innerHTML = html.join('');
  reparse();
  s.measures.forEach((_, i) => refreshCard(i));
  renderSummary();
}

// the melody field as slots of notes, the way parseMelody reads it (2'2' and 1_2 are two notes in one slot)
function melSlots(mel) {
  return String(mel || '').trim().split(/\s+/).filter(Boolean).map(slot => {
    let subs = slot.split('_').filter(Boolean), sep = '_';
    if (subs.length === 1) {
      const t = normTok(subs[0]), parts = t.match(/[#b]?[0-7](?:'{1,3}|,{1,3})?/g);
      if (parts && parts.length > 1 && parts.join('') === t) { subs = parts; sep = ''; }
    }
    return { subs, sep };
  });
}
const melJoin = slots => slots.filter(x => x.subs.length).map(x => x.subs.join(x.sep)).join(' ');
// the lyric syllables of a measure, one per note -> [first, last] note of the word that note li sings
// (Thai syllables run together, so the word is found by segmenting the joined text)
function lyrWordAt(lt, li) {
  const txt = i => (lt[i] && lt[i] !== '~' && lt[i] !== '_' ? lt[i] : '');
  if (!txt(li)) return [li, li];
  let a = li, b = li;
  while (a > 0 && txt(a - 1)) a--;
  while (txt(b + 1)) b++;
  const offs = [];
  let joined = '';
  for (let i = a; i <= b; i++) { offs.push(joined.length); joined += txt(i); }
  if (typeof Intl === 'undefined' || !Intl.Segmenter) return [li, li];
  try {
    const me = offs[li - a], meEnd = me + txt(li).length;
    let first = li, last = li;
    for (const sg of new Intl.Segmenter('th', { granularity: 'word' }).segment(joined)) {
      const s0 = sg.index, s1 = s0 + sg.segment.length;
      if (s1 <= me || s0 >= meEnd) continue;            // a word this syllable is part of
      for (let i = a; i <= b; i++) { const o = offs[i - a], e = o + txt(i).length; if (o < s1 && e > s0) { first = Math.min(first, i); last = Math.max(last, i); } }
    }
    return [first, last];
  } catch (e) { return [li, li]; }
}

// the notes a card shows as chips (holds "-" have none), as [slot, sub] positions
const melChipPos = slots => { const out = []; slots.forEach((x, si) => x.subs.forEach((t, k) => { if (t !== '-' && t !== '~') out.push([si, k]); })); return out; };
const chdToks = chd => String(chd || '').trim().split(/\s+/).filter(Boolean);

function chipsHTML(pm, m) {
  let n = 0;
  const parts = pm.items.filter(it => it.type !== 'hold').map(it => {
    const k = n++;
    if (it.type === 'rest') return '<button data-n="' + k + '" class="chip px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 text-xs text-center">0</button>';
    if (it.type === 'bad') return '<button data-n="' + k + '" data-bad class="chip px-1.5 py-0.5 rounded bg-red-900/60 border border-red-500 text-red-200 text-xs text-center">' + esc(it.tok) + '?</button>';
    const d = describe(it.midi, it.midi === 70), bad = !!it.bad;
    return '<button data-n="' + k + '" data-midi="' + it.midi + '"' + (bad ? ' data-bad' : '') + ' class="chip px-1.5 py-0.5 rounded text-center leading-tight border ' + (bad ? 'bg-red-900/60 border-red-500 text-red-100' : 'bg-slate-800 border-slate-700 text-slate-100') + '">' +
      '<span class="text-sm font-semibold">' + esc(numeralLabel(d)) + '</span><sub class="text-[9px] text-amber-300">' + fmtDur(it.dur) + '</sub>' +
      '<span class="block text-[9px] ' + (bad ? 'text-red-200' : 'text-slate-400') + '">' + esc(noteLabel(d, S.noteSystem)) + '</span>' +
      (it.lyric ? '<span class="block text-[9px] text-sky-300">' + esc(it.lyric) + '</span>' : '') + '</button>';
  });
  // chords and bass from the field itself, so one that can't be read still shows (red) instead of vanishing
  chdToks(m.chd).forEach((tok, j) => {
    const c = parseChordToken(tok, S.review.song.octaveShift || 0);
    if (c.type === 'cont') return;
    const pc = pm.chords.find(x => x.name === c.name && x.type === c.type);
    const bad = c.type === 'bad' || !!(pc && pc.bad);
    const label = c.type === 'bad' ? tok + '?' : c.type === 'notes' && c.strum ? 'กรีด ' + c.name : c.type === 'chord' || c.type === 'notes' ? c.name : c.type === 'bass' ? 'เบส ' + c.name : '–';
    parts.push('<button data-c="' + j + '"' + (bad ? ' data-bad' : '') + ' class="chip px-1.5 py-0.5 rounded border text-[11px] self-center ' + (bad ? 'bg-red-900/60 border-red-500 text-red-200' : 'bg-sky-900/50 border-sky-700 text-sky-200') + '">♪ ' + esc(label) + '</button>');
  });
  return parts.join('') || '<span class="text-[11px] text-slate-600">ยังไม่มีโน้ต</span>';
}

function refreshCard(i) {
  const card = cardEl(i), pm = S.parsed && S.parsed.measures[i];
  if (!card || !pm) return;
  $('.chips', card).innerHTML = chipsHTML(pm, S.review.song.measures[i]);
  $('.issues', card).innerHTML = pm.issues.map(x => '<li class="' + (x.level === 'error' ? 'text-red-300' : 'text-amber-300') + '">' + (x.level === 'error' ? '✖ ' : '⚠ ') + esc(x.msg) + '</li>').join('');
  const e = pm.issues.filter(x => x.level === 'error').length, w = pm.issues.length - e;
  $('.mbadge', card).innerHTML = e ? '<span class="px-1.5 rounded bg-red-500/20 text-red-300">✖ ' + e + '</span>' : w ? '<span class="px-1.5 rounded bg-amber-500/20 text-amber-300">⚠ ' + w + '</span>' : '<span class="px-1.5 rounded bg-emerald-500/20 text-emerald-300">✓</span>';
  Fix.count();
}

// what is wrong with a red note, in plain words, and the one-tap fixes: a note the kalimba has instead, or telling the app the tine is tuned
function suggestFor(it) {
  const out = { msg: '', btns: [] };
  if (!it) return out;
  if (it.type === 'bad') { out.msg = 'อ่านตัวนี้ไม่ออก (' + it.tok + ') · แตะเลข 1–7 ที่ถูกตามรูปด้านบน'; return out; }
  if (!it.bad) return out;
  const keys = keySet(state.tuning), m = it.midi, nm = x => noteLabel(describe(x, x === 70), 'western');
  const tok = String(it.tok || ''), sharp = /^#/.test(tok), flat = /^b/.test(tok);
  out.msg = it.bad.msg;
  const cand = [];
  if (it.bad.code === 'low') { for (let x = m + 12; x <= KEY_MAX + 12 && !cand.length; x += 12) if (keys.has(x)) cand.push(x); }
  else if (it.bad.code === 'high') { for (let x = m - 12; x >= KEY_MIN - 12 && !cand.length; x -= 12) if (keys.has(x)) cand.push(x); }
  else {
    const order = flat ? [m + 1, m - 1] : [m - 1, m + 1];          // a ♯ falls back to the note below, a ♭ to the one above
    order.forEach(x => { if (keys.has(x)) cand.push(x); });
  }
  const label = x => it.bad.code === 'low' ? 'ขึ้น 1 ออคเทฟ → ' + nm(x) : it.bad.code === 'high' ? 'ลง 1 ออคเทฟ → ' + nm(x) : 'ใช้ ' + nm(x) + ' แทน';
  cand.slice(0, 2).forEach((x, i) => out.btns.push({ act: 'fixmidi', attr: 'data-mid="' + x + '"', label: (i === 0 ? '✨ ' : '') + label(x) + (i === 0 ? ' (แนะนำ)' : '') }));
  // a ♯/♭ written on purpose and the kalimba's tine is tuned that way: say so once
  if ((sharp || flat) && it.bad.code === 'accidental') {
    const base = sharp ? m - 1 : m + 1;
    if (KALIMBA17.indexOf(base) >= 0) out.btns.push({ act: 'retune', attr: 'data-base="' + base + '" data-dir="' + (sharp ? 1 : -1) + '"', label: 'เครื่องฉันจูนก้าน ' + nm(base) + (sharp ? ' เป็น ♯' : ' เป็น ♭') });
  }
  return out;
}

/* ---- tap a note or chord chip to fix it right there ---- */
const Fix = {
  at: null, cur: -1,
  open(chip) {
    const card = chip.closest('.mcard');
    this.at = { i: +card.dataset.i, n: chip.dataset.n != null ? +chip.dataset.n : null, c: chip.dataset.c != null ? +chip.dataset.c : null };
    $$('#rv-list .chip.sel').forEach(x => x.classList.remove('sel'));
    chip.classList.add('sel');
    const pop = byId('fix-pop'), body = byId('fix-body'), m = S.review.song.measures[this.at.i];
    if (this.at.c != null) {
      body.innerHTML = '<div class="flex gap-1 items-center"><span class="text-[11px] text-slate-400 shrink-0">คอร์ด/เบส</span>' +
        '<input id="fix-chord" value="' + esc(chdToks(m.chd)[this.at.c] || '') + '" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" class="mono min-w-0 flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100">' +
        '<button data-fx="ok" class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-bold">✓</button><button data-fx="cdel" class="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-rose-300">⌫</button>' +
        '<button data-fx="x" class="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">✕</button></div>' +
        '<div class="text-[10px] text-slate-500 mt-1">เลขติดกัน = ดีดพร้อมกัน เช่น 135 · ใส่ ~ ท้าย = กรีด (135~) · เลขเดียว = เบส</div>';
    } else {
      const it = (S.parsed && S.parsed.measures[this.at.i] ? S.parsed.measures[this.at.i].items : []).filter(x => x.type !== 'hold')[this.at.n];
      const sg = suggestFor(it), photo = S.review.song.source === 'photo';
      const NEUTRAL = 'bg-slate-800 border border-slate-700 text-slate-100';
      const nb = (k, t, cls, attr, size) => '<button data-fx="' + k + '" ' + (attr || '') + ' class="h-11 rounded-xl ' + (size || 'text-sm') + ' font-semibold active:scale-95 ' + (cls || NEUTRAL) + '">' + t + '</button>';
      const sec = t => '<div class="text-[11px] font-semibold text-slate-400 mt-2 mb-1">' + t + '</div>';
      const dsc = it && it.midi != null ? describe(it.midi, it.midi === 70) : null;
      const title = !it ? 'โน้ต' : it.type === 'rest' ? 'พัก (0)' : it.type === 'bad' ? esc(it.tok) + ' ?' :
        esc(numeralLabel(dsc)) + ' <span class="font-normal text-slate-400">' + esc(noteLabel(dsc, S.noteSystem)) + '</span>';
      let h = '<div class="flex items-center gap-2"><div class="flex-1 min-w-0 text-base font-bold text-slate-100 truncate">' + title +
        ' <span class="text-xs font-normal text-slate-400">· ห้อง ' + (this.at.i + 1) + '</span></div>' +
        '<button data-fx="x" class="h-9 px-3 rounded-xl text-xs font-semibold ' + NEUTRAL + '">✕ ปิด</button></div>';
      // a red note: what is wrong, in plain words, and one tap to fix it
      if (sg.msg) {
        h += '<div class="mt-1.5 rounded-xl border border-red-500 bg-red-900/60 text-red-100 p-2"><div class="text-xs font-semibold">⚠ ' + esc(sg.msg) + '</div>' +
          (sg.btns.length ? '<div class="grid gap-1.5 mt-1.5 ' + (sg.btns.length > 1 ? 'grid-cols-2' : '') + '">' +
            sg.btns.map((x, i) => nb(x.act, x.label, i === 0 ? 'bg-amber-600 text-white' : NEUTRAL, x.attr, 'text-xs')).join('') + '</div>' : '') + '</div>';
      }
      h += sec('เปลี่ยนเป็นโน้ต') + '<div class="grid grid-cols-7 gap-1.5">' + [1, 2, 3, 4, 5, 6, 7].map(d => nb('d' + d, d, NEUTRAL, '', 'text-base')).join('') + '</div>' +
        '<div class="grid grid-cols-4 gap-1.5 mt-1.5">' + nb('up', "สูง '") + nb('dn', 'ต่ำ') + nb('sharp', '♯') + nb('play', '▶ ฟัง', 'bg-amber-600 text-white') + '</div>';
      // rhythm
      const sl = melSlots(m.mel), rp = melChipPos(sl)[this.at.n];
      if (rp) {
        const sRow = sl[rp[0]], last = rp[1] === sRow.subs.length - 1, split = !last, canJoin = split || !!sl[rp[0] + 1];
        const rb = (k, t, on) => nb(k, t, on ? NEUTRAL : 'bg-slate-800 border border-slate-700 text-slate-500', on ? '' : 'disabled', 'text-xs');
        if (photo) {
          // photo songs: every number is one beat and gaps are holds (-), so no silent rests here
          const hz = x => !!x && x.subs.length === 1 && (x.subs[0] === '-' || x.subs[0] === '~');
          const canHx = (last && hz(sl[rp[0] + 1])) || (rp[1] === 0 && rp[0] > 0 && hz(sl[rp[0] - 1]));
          h += sec('ยืดเสียง · ทุกตัวเลขนับ 1 จังหวะ') + '<div class="grid grid-cols-3 gap-1.5">' + rb('ha', 'ต่อเสียง ▸', true) +
            rb('hb', '◂ ยืดตัวก่อนหน้า', this.at.n > 0 || this.at.i > 0) + rb('hx', 'เอาออก ✕', !!canHx) + '</div>';
        } else {
          h += sec('จังหวะ') + '<div class="grid grid-cols-4 gap-1.5">' + rb('rj', split ? '✂ แยก' : '⌒ ติดกัน', canJoin) +
            rb('rb', 'พักก่อน', true) + rb('ra', 'พักหลัง', true) + rb('rh', 'ต่อเสียง', last) + '</div>';
        }
      }
      h += sec('จัดการ') + '<div class="grid grid-cols-3 gap-1.5">' + nb('ins', '＋ เพิ่มซ้ำ') + nb('del', '🗑 ลบโน้ต', 'bg-slate-800 border border-slate-700 text-rose-300') + nb('undo', '↶ ย้อนกลับ') + '</div>';
      body.innerHTML = h;
      // the lyric word this note sings, edited as a whole word; the app splits it over the same notes again
      const li = this.lyrIndex(this.at.i, this.at.n);
      if (li >= 0) {
        const lt = lyricTokens(m.lyr), w = lyrWordAt(lt, li);
        this.at.lw = w;
        const word = lt.slice(w[0], w[1] + 1).filter(x => x !== '~' && x !== '_').join('');
        body.innerHTML += '<div class="fix-keep flex gap-1 items-center mt-1.5"><span class="text-[11px] text-slate-400 shrink-0">เนื้อร้อง</span>' +
          '<input id="fix-lyr" value="' + esc(word) + '" autocomplete="off" autocapitalize="off" spellcheck="false" class="min-w-0 flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100">' +
          '<button data-fx="lyr" class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-bold">✓</button></div>' +
          '<div class="fix-keep text-[10px] text-slate-500 mt-1">แก้ทั้งคำ แอปแบ่งพยางค์ให้เองตาม ' + (w[1] - w[0] + 1) + ' โน้ต · ว่าง = ไม่มีเนื้อร้อง</div>';
      }
    }
    pop.classList.remove('hidden', 'typing');
    this.place(chip);
    if (this.at.c != null) setTimeout(() => { const f = byId('fix-chord'); if (f) f.focus(); }, 30);
  },
  // the panel stays at the bottom of the screen (above the iOS keyboard); the page scrolls so the chip being
  // fixed sits between the pinned photo strip and the panel, never under either
  place(chip, instant) {
    const pop = byId('fix-pop'), vv = window.visualViewport;
    const kb = vv ? Math.max(0, innerHeight - vv.height - vv.offsetTop) : 0;
    pop.style.bottom = 'calc(' + (kb + 8) + 'px + env(safe-area-inset-bottom))';
    document.body.style.paddingBottom = (pop.offsetHeight + 24) + 'px';   // room to bring the last chips above it
    if (!chip) return;
    const line = chip.closest('.rv-line'), strip = line && $('.rv-strip', line);
    const top = (strip ? strip.getBoundingClientRect().bottom : byId('rv-bar').getBoundingClientRect().bottom) + 8;
    const bot = pop.getBoundingClientRect().top - 10, r = chip.getBoundingClientRect();
    const behavior = instant ? 'auto' : 'smooth';
    if (r.bottom > bot) window.scrollBy({ top: Math.min(r.bottom - bot, r.top - top), behavior });
    else if (r.top < top) window.scrollBy({ top: r.top - top, behavior });
  },
  close() {
    byId('fix-pop').classList.add('hidden'); document.body.style.paddingBottom = '';
    $$('#rv-list .chip.sel').forEach(x => x.classList.remove('sel')); this.at = null;
  },
  // chip number n of measure i -> its place among the measure's notes (rests and unreadable tokens have no lyric)
  lyrIndex(i, n) {
    const pm = S.parsed && S.parsed.measures[i], items = pm ? pm.items.filter(it => it.type !== 'hold') : [];
    if (!items[n] || items[n].type !== 'note') return -1;
    return items.slice(0, n).filter(it => it.type === 'note').length;
  },
  chip() {
    const card = this.at && cardEl(this.at.i);
    return card && $(this.at.c != null ? '[data-c="' + this.at.c + '"]' : '[data-n="' + this.at.n + '"]', card);
  },
  apply(act, el) {
    const at = this.at;
    if (!at) return;
    if (act === 'x') { this.close(); return; }
    if (act === 'undo') { Undo.undo(); return; }
    const m = S.review.song.measures[at.i];
    if (at.c != null) {
      const toks = chdToks(m.chd), v = (byId('fix-chord').value || '').trim().replace(/\s+/g, '');
      toks[at.c] = act === 'cdel' || !v ? '.' : v;
      m.chd = toks.join(' ');
      this.commit(at.i, 'chd');
      this.close();
      return;
    }
    if (act === 'lyr') {
      const lt = lyricTokens(m.lyr), w = at.lw, v = (byId('fix-lyr').value || '').replace(/\s+/g, ''), n = w[1] - w[0] + 1;
      while (lt.length <= w[1]) lt.push('~');
      lt.splice(w[0], n, ...(v ? lyricsByGroups([v], [n]) : new Array(n).fill('~')));
      while (lt.length && lt[lt.length - 1] === '~') lt.pop();
      m.lyr = lt.join(' ');
      this.commit(at.i, 'lyr');
      const chip = this.chip();
      if (chip) this.open(chip); else this.close();
      return;
    }
    if (act === 'retune') {                      // "my kalimba has this tine tuned a half step off"
      applyRetune(+el.dataset.base, +el.dataset.dir);
      const chip0 = this.chip();
      if (chip0) this.open(chip0); else this.close();
      return;
    }
    const slots = melSlots(m.mel), pos = melChipPos(slots)[at.n];
    if (!pos) { this.close(); return; }
    const [si, k] = pos, x = /^([#b]?)([0-7])('{0,3}|,{0,3})$/.exec(normTok(slots[si].subs[k]));
    let acc = x ? x[1] : '', deg = x ? x[2] : '', oct = x ? x[3] : (normTok(slots[si].subs[k]).match(/'/g) || []).join('');
    if (act === 'play') {
      const p = parseNoteToken(slots[si].subs[k]);
      if (p.type === 'note') { unlockAudioUI(); if (Synth.ensure()) Synth.kalimba(Synth.master, p.midi + 12 * (S.review.song.octaveShift || 0), Synth.ctx.currentTime + 0.01, 0.9); }
      return;
    }
    if (act === 'rj' || act === 'rb' || act === 'ra' || act === 'rh' || act === 'ha' || act === 'hb' || act === 'hx') {
      const shift = melRhythm(slots, si, k, act);
      if (shift == null) return;
      m.mel = melJoin(slots);
      this.at.n = at.n + shift;
      this.commit(at.i, 'mel');
      const chip = this.chip();
      if (chip) this.open(chip); else this.close();
      return;
    }
    if (act === 'del') {
      slots[si].subs.splice(k, 1);
    } else if (act === 'fixmidi') {              // swap for a note the kalimba has
      slots[si].subs[k] = midiTok(+el.dataset.mid - 12 * (S.review.song.octaveShift || 0));
    } else if (act === 'ins') {
      slots.splice(si + 1, 0, { subs: [slots[si].subs[k]], sep: '' });
    } else {
      if (/^d\d$/.test(act)) { deg = act[1]; if (!x) acc = ''; }
      else if (act === 'up') oct = oct[0] === ',' ? oct.slice(1) : oct.length < 3 ? oct + "'" : oct;
      else if (act === 'dn') oct = oct[0] === "'" ? oct.slice(1) : oct.length < 3 ? oct + ',' : oct;
      else if (act === 'sharp') acc = acc === '#' ? '' : '#';
      if (!deg) return;                         // an unreadable token needs a number first
      slots[si].subs[k] = acc + deg + oct;
    }
    m.mel = melJoin(slots);
    this.commit(at.i, 'mel');
    if (act === 'del') { this.close(); return; }
    if (act === 'ins') this.at.n = at.n + 1;
    const chip = this.chip();
    if (!chip) { this.close(); return; }
    this.open(chip);                             // redraw the panel: its title and red box follow the change
    // hear the fixed note
    if (act !== 'ins' && chip.dataset.midi) { unlockAudioUI(); if (Synth.ensure()) Synth.kalimba(Synth.master, +chip.dataset.midi, Synth.ctx.currentTime + 0.01, 0.9); }
  },
  commit(i, f) {
    const card = cardEl(i);
    if (card) $('input[data-f="' + f + '"]', card).value = S.review.song.measures[i][f];
    markDirty(); refreshAfterEdit(i);
  },
  // the ⚠ jumper: every red chip, in order
  count() {
    const bad = $$('#rv-list .chip[data-bad]'), box = byId('rv-jump');
    if (!box) return;
    box.classList.toggle('hidden', !bad.length);
    byId('rv-jump-n').textContent = bad.length ? (this.cur >= 0 ? (Math.min(this.cur, bad.length - 1) + 1) + '/' : '') + bad.length + ' จุด' : '';
  },
  jump(d) {
    const bad = $$('#rv-list .chip[data-bad]');
    if (!bad.length) return;
    this.cur = ((this.cur < 0 ? (d > 0 ? -1 : 0) : this.cur) + d + bad.length) % bad.length;
    const chip = bad[this.cur];
    chip.scrollIntoView({ block: 'center' });
    this.count();
    setTimeout(() => this.open(chip), 60);
  }
};

function renderSummary() {
  const s = S.review.song, sm = summarize(S.parsed), box = byId('rv-summary');
  if (!s.measures.length) {
    box.className = 'rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-xs'; box.innerHTML = 'ยังไม่มีห้อง — กด "เพิ่มห้องท้ายเพลง"'; return;
  }
  if (!sm.errors && !sm.warns) {
    box.className = 'rounded-xl border border-emerald-600/50 bg-emerald-900/20 p-2.5 text-xs text-emerald-200';
    box.innerHTML = '✅ ผ่านการตรวจ — ' + sm.notes + ' โน้ตอยู่ในช่วง 17 คีย์ (C4–E6) ทุกห้อง';
    return;
  }
  const bad = sm.errors > 0;
  box.className = 'rounded-xl border p-2.5 text-xs space-y-1.5 ' + (bad ? 'border-red-500/60 bg-red-900/20 text-red-100' : 'border-amber-500/50 bg-amber-900/10 text-amber-100');
  let html = '<div class="font-semibold">' + (bad ? '⚠️ ต้องแก้ ' + sm.errors + ' จุด' : '⚠️ มีข้อสังเกต ' + sm.warns + ' จุด') +
    (sm.range ? ' · โน้ตเกินช่วง/ไม่มีคีย์ ' + sm.range + ' โน้ต' : '') + ' <span class="font-normal text-slate-400">(ช่วงเครื่อง 17 คีย์ C4–E6)</span></div>';
  const sug = sm.range ? suggestShift(s, S.tuning) : null;
  if (sug) {
    html += '<button data-fix="shift" data-shift="' + sug.shift + '" class="px-2.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-[11px] font-bold">🪄 เลื่อนทั้งเพลงเป็น ' + (sug.shift > 0 ? '+' : '') + sug.shift + ' ออคเทฟ → เหลือเกินช่วง ' + sug.left + ' โน้ต</button>';
  }
  const nAcc = S.parsed.issues.filter(x => x.code === 'accidental').length;
  if (nAcc) {
    html += '<button data-fix="nat" class="w-full h-11 rounded-xl bg-amber-600 text-white text-xs font-bold active:scale-95">✨ ตัด ♯/♭ ที่ไม่มีคีย์ทั้งเพลง (' + nAcc + ' โน้ต)</button>' +
      '<div class="text-[11px] text-slate-400">ได้โน้ตธรรมดาที่ใกล้ที่สุดที่เครื่องมี · ถ้าเครื่องคุณจูนก้านเป็น ♯/♭ ไว้ ให้แตะตัวแดงแล้วกด "เครื่องฉันจูน…" แทน · ผิดกด ↶ ย้อนกลับ</div>';
  }
  html += '<details ' + (S.helpOpen ? 'open ' : '') + 'class="rounded-xl border border-slate-700 bg-slate-900 p-2"><summary class="font-semibold cursor-pointer text-slate-100">❓ ตัวแดงคืออะไร แก้ยังไง</summary>' +
    '<div class="mt-1.5 space-y-1.5 text-[11px] text-slate-300 leading-relaxed">' +
    '<p><b>ตัวแดง</b> = เล่นบนคาลิมบา 17 คีย์ไม่ได้ หรือตัวอ่านรูปอ่านไม่ออก แตะตัวแดงตัวนั้น แล้วดูกล่องสีแดงในแผงด้านล่าง กดปุ่มสีส้ม <b>✨ แนะนำ</b> ได้เลย</p>' +
    '<p>• <b>มี ♯ หรือ ♭ แต่ไม่มีคีย์</b> → กด "ใช้ … แทน" (เล่นโน้ตธรรมดาที่ใกล้สุด) หรือ "เครื่องฉันจูนก้าน…" ถ้าก้านนั้นจูนไว้จริง</p>' +
    '<p>• <b>สูง/ต่ำเกินช่วง</b> → กด "ขึ้น/ลง 1 ออคเทฟ" ทีละตัว หรือ 🪄 เลื่อนทั้งเพลงด้านบน</p>' +
    '<p>• <b>มี ? ต่อท้าย</b> → อ่านไม่ออก ดูรูปต้นฉบับด้านบน แล้วแตะเลข 1–7 ที่ถูก</p>' +
    '<p>• ลูกศร ◀ ▶ ที่แถบบนพาไปตัวแดงตัวถัดไป · แก้ผิดกด <b>↶ ย้อนกลับ</b> (ในแป้นหรือในแผง) ได้เสมอ</p></div></details>';
  html += '<div class="space-y-0.5 max-h-40 overflow-y-auto">' + S.parsed.issues.slice(0, 40).map(x =>
    '<button data-goto="' + x.measure + '" class="block w-full text-left ' + (x.level === 'error' ? 'text-red-300' : 'text-amber-300') + '">ห้อง ' + (x.measure + 1) + ': ' + esc(x.msg) + '</button>').join('') + '</div>';
  box.innerHTML = html;
}

function markDirty(kind) { S.review.dirty = true; Undo.note(kind); }
// ↶ undo for the review page: every change that calls markDirty() is noticed by comparing the song with how it was a moment ago;
// quick typing in one field counts as one step
const Undo = {
  stack: [], last: '', t: 0, kind: null, busy: false,
  snap() { const s = S.review.song; return JSON.stringify({ m: s.measures, o: s.octaveShift || 0, tempo: s.tempo, beats: s.beats, title: s.title }); },
  reset() { this.stack = []; this.kind = null; this.last = this.snap(); this.sync(); },
  note(kind) {
    if (this.busy || !S.review || !S.review.song) return;
    const cur = this.snap();
    if (cur === this.last) return;
    const now = Date.now();
    if (!(kind === 'typing' && this.kind === 'typing' && now - this.t < 800)) { this.stack.push(this.last); if (this.stack.length > 60) this.stack.shift(); }
    this.last = cur; this.t = now; this.kind = kind || null; this.sync();
  },
  undo() {
    if (!this.stack.length) { toast('ไม่มีอะไรให้ย้อนกลับ'); return; }
    const prev = this.stack.pop(), d = JSON.parse(prev), s = S.review.song;
    // remember which field the cursor was in, to put it back after the cards are redrawn (the keypad stays open)
    const ae = document.activeElement, ac = ae && ae.closest && ae.closest('.mcard'), at = ac ? { i: +ac.dataset.i, f: ae.dataset.f } : null;
    this.busy = true;
    Fix.close();
    s.measures = d.m; s.octaveShift = d.o; s.tempo = d.tempo; s.beats = d.beats; s.title = d.title;
    byId('rv-title').value = s.title || ''; byId('rv-tempo').value = s.tempo; byId('rv-beats').value = s.beats;
    byId('rv-shift').textContent = (s.octaveShift > 0 ? '+' : '') + (s.octaveShift || 0);
    renderCards();
    if (at) { const card = cardEl(Math.min(at.i, s.measures.length - 1)), inp = card && $('input[data-f="' + at.f + '"]', card); if (inp) inp.focus(); }
    this.last = prev; this.kind = null; this.busy = false; this.sync();
    toast('ย้อนกลับแล้ว');
  },
  sync() { const b = byId('rv-undo'); if (b) b.disabled = !this.stack.length; }
};
function refreshAfterEdit(i) { reparse(); refreshCard(i); refreshCard(i + 1); renderSummary(); }
function refreshAll() { reparse(); S.review.song.measures.forEach((_, i) => refreshCard(i)); renderSummary(); }

function setPlayButton(on) {
  const b = byId('btn-play-all');
  b.textContent = on ? '⏹ หยุด' : '▶ ฟังทั้งเพลง';
  b.classList.toggle('bg-rose-700', on); b.classList.toggle('bg-amber-600', !on);
}
function togglePlay(from) {
  if (Player.playing) { Player.stop(); return; }
  unlockAudioUI();
  const s = S.review.song;
  reparse();
  if (!S.parsed.measures.length) { toast('ยังไม่มีโน้ตให้ฟัง'); return; }
  setPlayButton(true);
  Player.start(S.parsed, {
    tempo: clamp(+s.tempo || 100, 30, 240), from, chords: byId('rv-chords').checked,
    onEvent: e => {
      if (e.k === 'n') Strip.light(e.midi, e.tok);
      else {
        $$('#rv-list .playing').forEach(c => c.classList.remove('playing'));
        const c = cardEl(e.i);
        if (c) {
          c.classList.add('playing');
          const r = c.getBoundingClientRect();
          if (r.top < 200 || r.bottom > innerHeight - 200) c.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }
    },
    onEnd: () => { setPlayButton(false); $$('#rv-list .playing').forEach(c => c.classList.remove('playing')); }
  });
}

/* the app's own keypads: numbers for the melody field, chords for the chord field (the phone keyboard only when asked for with the keyboard key) */
let kpTarget = null, kpSystem = null;

/* a card field typed on the phone keyboard (lyrics, or a field the keyboard key was pressed on): iOS scrolls the page only a little, so
   the field ended up under the keyboard (seen on Fun's screen recording). While such a field has focus the page gets room at the bottom
   and is nudged, without animation, just enough to keep the field between the pinned top bar and the keyboard. */
const FieldView = {
  el: null, timer: 0,
  on(el) {
    this.el = el;
    document.body.style.paddingBottom = Math.round(innerHeight * 0.6) + 'px';   // room to lift the last cards above the keyboard
    clearInterval(this.timer);
    let n = 0;
    this.timer = setInterval(() => { this.fit(); if (++n > 12) clearInterval(this.timer); }, 100);   // while the keyboard slides up
    this.fit();
  },
  off() { this.el = null; clearInterval(this.timer); },
  fit() {
    const el = this.el, vv = window.visualViewport;
    if (!el || !el.isConnected || !vv) return;
    if (innerHeight - vv.height - vv.offsetTop < 80) return;   // no keyboard yet
    const bottom = vv.offsetTop + vv.height - 56;               // the keyboard's own tool bar sits above the keys
    const top = byId('rv-bar').getBoundingClientRect().bottom + 8, r = el.getBoundingClientRect();
    if (r.bottom > bottom) window.scrollBy({ top: r.bottom - bottom, behavior: 'auto' });
    else if (r.top < top) window.scrollBy({ top: r.top - top, behavior: 'auto' });
  }
};
function showKeypad(kind) {
  if (!S.keypad || state.currentView !== 'review') return;
  const chd = kind === 'chd', on = byId(chd ? 'keypad-chd' : 'keypad');
  byId('keypad').classList.toggle('hidden', chd); byId('keypad-chd').classList.toggle('hidden', !chd);
  if (!ls.get('kpTip', false)) { ls.set('kpTip', true); toast('เคล็ดลับ: กดปุ่มเว้นวรรคค้างแล้วลากซ้าย-ขวา เพื่อเลื่อนเคอร์เซอร์', 4500); }
  document.body.style.paddingBottom = (on.offsetHeight + 24) + 'px';   // the last cards can still be scrolled above it
  if (kpTarget) setTimeout(() => {
    const r = kpTarget.getBoundingClientRect(), room = innerHeight - on.offsetHeight - 8;
    if (r.bottom > room) window.scrollBy({ top: r.bottom - room + 8, behavior: 'smooth' });
  }, 60);
}
function hideKeypad() {
  byId('keypad').classList.add('hidden'); byId('keypad-chd').classList.add('hidden');
  if (!Fix.at && !FieldView.el) document.body.style.paddingBottom = '';
}
function applyKeypadMode() {
  $$('#rv-list input[data-f="mel"], #rv-list input[data-f="chd"]').forEach(i => { i.inputMode = S.keypad ? 'none' : 'text'; });
  if (!S.keypad) hideKeypad();
}
function keypadPress(k) {
  if (k === 'close') { hideKeypad(); if (document.activeElement) document.activeElement.blur(); return; }
  if (k === 'undo') { Undo.undo(); return; }
  if (k === 'kbd') {   // the phone keyboard for this field only (rare symbols); the keypad comes back on the next field
    const t0 = kpTarget;
    if (!t0) return;
    kpSystem = t0; t0.inputMode = 'text'; hideKeypad(); t0.blur(); setTimeout(() => t0.focus(), 30);
    return;
  }
  const t = kpTarget;
  if (!t) return;
  t.focus();
  let a = t.selectionStart, b = t.selectionEnd;
  if (a == null) { a = b = t.value.length; }
  if (k === 'bs') {
    if (a === b && a > 0) a--;
    t.setRangeText('', a, b, 'end');
  } else {
    t.setRangeText(k, a, b, 'end');
  }
  t.dispatchEvent(new Event('input', { bubbles: true }));
}

// buttons of a keypad: a tap types, holding the space key and sliding moves the cursor
function wireKeypad(kp) {
  kp.addEventListener('mousedown', e => e.preventDefault());   // keeps the field focused; not touchstart (iOS would drop the click)
  let kpSwallow = false;
  kp.addEventListener('click', e => {
    const b = e.target.closest('button[data-k]');
    if (!b) return;
    if (kpSwallow && b.dataset.k === ' ') { kpSwallow = false; return; }   // that press moved the cursor: no space
    Haptic.tick();
    keypadPress(b.dataset.k);
  });
  // hold the space key and slide: the cursor follows (like the phone keyboard), so a spot in the middle of the numbers is easy to reach
  const sp = kp.querySelector('button[data-k=" "]');
  if (sp) {
    const label = sp.innerHTML;
    let g = null;
    const finish = () => {
      if (!g) return;
      clearTimeout(g.timer);
      if (g.on) { sp.innerHTML = label; kpSwallow = true; setTimeout(() => { kpSwallow = false; }, 500); }
      g = null;
    };
    sp.addEventListener('pointerdown', e => {
      const t = kpTarget;
      if (!t) return;
      g = { t, x0: e.clientX, cx: e.clientX, on: false, id: e.pointerId };
      g.timer = setTimeout(() => {
        if (!g) return;
        g.on = true; g.x = g.cx;
        g.base = t.selectionStart == null ? t.value.length : t.selectionStart;
        sp.textContent = '◂  เลื่อนเคอร์เซอร์  ▸';
        try { sp.setPointerCapture(g.id); } catch (err) { /* not capturable */ }
      }, 280);
    });
    sp.addEventListener('pointermove', e => {
      if (!g) return;
      g.cx = e.clientX;
      if (!g.on) { if (Math.abs(e.clientX - g.x0) > 14) { clearTimeout(g.timer); g = null; } return; }
      e.preventDefault();
      const pos = clamp(g.base + Math.round((e.clientX - g.x) / 11), 0, g.t.value.length);
      g.t.focus();
      if (pos !== g.t.selectionStart) Haptic.tick();
      g.t.setSelectionRange(pos, pos);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => sp.addEventListener(ev, finish));
  }
}

function setupReview() {
  Strip.build();
  const rs = () => S.review.song;
  byId('btn-review-back').addEventListener('click', () => go(S.review.from === 'library' ? 'library' : 'import'));
  byId('rv-title').addEventListener('input', e => { rs().title = e.target.value; markDirty('typing'); });
  byId('rv-tempo').addEventListener('input', e => { rs().tempo = clamp(parseInt(e.target.value, 10) || 100, 30, 240); markDirty('typing'); });
  byId('rv-beats').addEventListener('change', e => { rs().beats = parseInt(e.target.value, 10) || 4; markDirty(); refreshAll(); });
  const shift = d => {
    rs().octaveShift = clamp((rs().octaveShift || 0) + d, -3, 3); markDirty();
    byId('rv-shift').textContent = (rs().octaveShift > 0 ? '+' : '') + rs().octaveShift; refreshAll();
  };
  byId('rv-shift-dn').addEventListener('click', () => shift(-1));
  byId('rv-shift-up').addEventListener('click', () => shift(1));
  // every note and chord a semitone up or down; the cards and their text fields are rebuilt from the song
  const semi = d => {
    Fix.close();
    transposeSong(rs(), d); markDirty(); renderCards();
    toast(d > 0 ? 'เลื่อนขึ้นครึ่งเสียงทั้งเพลงแล้ว' : 'เลื่อนลงครึ่งเสียงทั้งเพลงแล้ว');
  };
  byId('rv-semi-dn').addEventListener('click', () => semi(-1));
  byId('rv-semi-up').addEventListener('click', () => semi(1));
  byId('btn-play-all').addEventListener('click', () => togglePlay(0));
  byId('rv-kp').addEventListener('change', e => { S.keypad = e.target.checked; ls.set('keypad', S.keypad); applyKeypadMode(); });
  byId('btn-add-measure').addEventListener('click', () => {
    const last = rs().measures[rs().measures.length - 1];
    rs().measures.push({ mel: '', lyr: '', chd: '', br: !last }); markDirty(); renderCards();
    const c = cardEl(rs().measures.length - 1); if (c) c.scrollIntoView({ block: 'center' });
  });
  byId('btn-save').addEventListener('click', saveSong);

  byId('rv-summary').addEventListener('click', e => {
    if (e.target.closest('summary')) setTimeout(() => { const d = byId('rv-summary').querySelector('details'); S.helpOpen = !!(d && d.open); }, 0);
    const f = e.target.closest('[data-fix]');
    if (f && f.dataset.fix === 'nat') {
      Fix.close();
      let n = 0;
      const sh = rs().octaveShift || 0;
      rs().measures.forEach(m => {
        const slots = melSlots(m.mel);
        slots.forEach(sl => sl.subs.forEach((sub, k) => {
          const p = parseNoteToken(sub);
          if (p.type !== 'note') return;
          const c = checkNote(p.midi + 12 * sh, state.tuning);
          if (c && c.code === 'accidental') { sl.subs[k] = normTok(sub).replace(/^[#b]/, ''); n++; }
        }));
        if (n) m.mel = melJoin(slots);
      });
      if (n) { markDirty(); renderCards(); toast('ตัด ♯/♭ แล้ว ' + n + ' โน้ต · ผิดกด ↶ ย้อนกลับ ได้', 3200); } else toast('ไม่มี ♯/♭ ที่ต้องตัด');
      return;
    }
    if (f) { shift(parseInt(f.dataset.shift, 10) - (rs().octaveShift || 0)); return; }
    const g = e.target.closest('[data-goto]');
    if (g) {
      const c = cardEl(+g.dataset.goto);
      if (c) { c.scrollIntoView({ block: 'center', behavior: 'smooth' }); c.classList.add('playing'); setTimeout(() => c.classList.remove('playing'), 1200); }
    }
  });

  const list = byId('rv-list');
  list.addEventListener('input', e => {
    const inp = e.target.closest('input[data-f]');
    if (!inp) return;
    const i = +inp.closest('.mcard').dataset.i;
    rs().measures[i][inp.dataset.f] = inp.value;
    markDirty('typing'); refreshAfterEdit(i);
    FieldView.fit();   // the chips above the field may have wrapped onto another line
  });
  list.addEventListener('focusin', e => {
    const inp = e.target.closest('input[data-f="mel"], input[data-f="chd"]');
    if (inp && inp === kpSystem) { FieldView.on(inp); hideKeypad(); return; }   // the phone keyboard was asked for on this field
    if (inp) { kpTarget = inp; FieldView.off(); showKeypad(inp.dataset.f); }
    else if (e.target.matches('input')) { FieldView.on(e.target); hideKeypad(); }
  });
  list.addEventListener('focusout', () => {
    setTimeout(() => {
      const ae = document.activeElement;
      if (kpSystem && ae !== kpSystem) { kpSystem.inputMode = S.keypad ? 'none' : 'text'; kpSystem = null; }
      if (!ae || !ae.matches('#rv-list input')) FieldView.off();
      if (!ae || !ae.matches('input[data-f="mel"], input[data-f="chd"]')) hideKeypad();
    }, 160);
  });
  list.addEventListener('click', e => {
    const chip = e.target.closest('.chip[data-n], .chip[data-c]');
    if (chip) {
      if (chip.dataset.midi) { unlockAudioUI(); if (Synth.ensure()) Synth.kalimba(Synth.master, +chip.dataset.midi, Synth.ctx.currentTime + 0.01, 0.9); }
      Fix.open(chip);
      return;
    }
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const card = b.closest('.mcard'), i = +card.dataset.i, ms = rs().measures, act = b.dataset.act;
    if (act === 'play') { if (Player.playing) Player.stop(); togglePlay(i); }
    else if (act === 'oct-dn' || act === 'oct-up') {
      const m = ms[i]; m.mel = shiftMelodyStr(m.mel, act === 'oct-up' ? 1 : -1);
      $('input[data-f="mel"]', card).value = m.mel; markDirty(); refreshAfterEdit(i);
    } else if (act === 'br') {
      const mm = ms[i]; mm.br = !mm.br; delete mm.gap; markDirty(); renderCards(); const c = cardEl(i); if (c) c.scrollIntoView({ block: 'nearest' });
    } else if (act === 'gap') {
      ms[i].gap = GAP_STEPS[(GAP_STEPS.indexOf(gapOf(ms[i])) + 1) % GAP_STEPS.length]; markDirty(); renderCards(); const c = cardEl(i); if (c) c.scrollIntoView({ block: 'nearest' });
    } else if (act === 'dup') { { const d = Object.assign({}, ms[i], { br: false }); delete d.gap; ms.splice(i + 1, 0, d); } markDirty(); renderCards(); }
    else if (act === 'ins') { ms.splice(i + 1, 0, { mel: '', lyr: '', chd: '', br: false }); markDirty(); renderCards(); }
    else if (act === 'del') {
      const m = ms[i];
      if ((m.mel + m.lyr + m.chd).trim() && !confirm('ลบห้อง ' + (i + 1) + ' ?')) return;
      if (m.br && ms[i + 1]) { if (!ms[i + 1].br) { if (m.gap == null) delete ms[i + 1].gap; else ms[i + 1].gap = m.gap; } ms[i + 1].br = true; }
      ms.splice(i, 1); markDirty(); renderCards();
    }
  });

  const pop = byId('fix-pop');
  // mousedown only: cancelling touchstart makes iOS drop the click, so none of the panel's buttons would work on a phone
  pop.addEventListener('mousedown', e => { if (!e.target.closest('input')) e.preventDefault(); });
  pop.addEventListener('click', e => { const b = e.target.closest('[data-fx]'); if (b && !b.disabled) { Haptic.tick(); Fix.apply(b.dataset.fx, b); } });
  pop.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'fix-chord') Fix.apply('ok'); if (e.key === 'Enter' && e.target.id === 'fix-lyr') Fix.apply('lyr'); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { if (Fix.at) Fix.place(Fix.chip(), true); FieldView.fit(); });
  // typing a lyric: iOS scrolls the page by itself to reach the field, which threw the view to another bar.
  // The panel shrinks to just the field (so the chip stays visible) and the chip is brought back while the keyboard slides up.
  pop.addEventListener('focusin', e => {
    if (!e.target.matches('input')) return;
    if (e.target.id === 'fix-lyr') pop.classList.add('typing');
    [60, 320, 700].forEach(ms => setTimeout(() => { if (Fix.at && pop.contains(document.activeElement)) Fix.place(Fix.chip(), true); }, ms));
  });
  pop.addEventListener('focusout', () => setTimeout(() => { if (!pop.contains(document.activeElement)) pop.classList.remove('typing'); }, 250));
  // tapping anywhere else closes it; scrolling keeps it next to its chip
  // (the path, not e.target: a button the panel just re-drew is already detached when this runs)
  document.addEventListener('click', e => {
    if (Fix.at && !e.composedPath().some(x => x.id === 'fix-pop' || (x.classList && x.classList.contains('chip')))) Fix.close();
  });
  byId('rv-jump-prev').addEventListener('click', () => Fix.jump(-1));
  byId('rv-jump-next').addEventListener('click', () => Fix.jump(1));

  wireKeypad(byId('keypad')); wireKeypad(byId('keypad-chd'));
}

async function saveSong() {
  const s = S.review.song;
  s.title = (s.title || '').trim() || 'เพลงไม่มีชื่อ';
  byId('rv-title').value = s.title;
  if (!s.measures.length) { toast('ยังไม่มีห้องโน้ต'); return; }
  const sm = summarize(reparse());
  if (sm.range && !confirm('ยังมีโน้ตเกินช่วง/ไม่มีคีย์บนคาลิมบา 17 คีย์ ' + sm.range + ' โน้ต\nบันทึกไว้ก่อนแล้วแก้ทีหลัง?')) return;
  if (!sm.range && sm.errors && !confirm('มีโทเค็นที่อ่านไม่ได้ ' + sm.errors + ' จุด (จะถูกข้ามตอนเล่น)\nบันทึกไว้ก่อน?')) return;
  const now = Date.now();
  const rec = {
    id: s.id || uid(), title: s.title, tempo: s.tempo, beats: s.beats, octaveShift: s.octaveShift || 0,
    created: s.created || now, updated: now,
    measures: s.measures.map(m => Object.assign({ mel: m.mel || '', lyr: m.lyr || '', chd: m.chd || '', br: !!m.br }, m.src ? { src: m.src } : {}, m.gap != null && (m.br || m.gap > 0) ? { gap: m.gap } : {}))
  };
  if (s.source) rec.source = s.source;
  if (s.photos && s.photos.length) rec.photos = s.photos;
  try {
    await DB.put(rec);
    Object.assign(s, { id: rec.id, created: rec.created, updated: rec.updated });
    S.review.dirty = false;
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    toast('บันทึกลงเครื่องแล้ว ✓');
    await loadSongs();
    go('library');
  } catch (e) {
    toast('บันทึกไม่ได้: ' + (e && e.message || e), 4000);
  }
}

/* ---- a retuned tine changes which notes the songs can use ---- */
function onTuning() {
  syncPracticeLibrary();
  if (state.currentView === 'review') refreshAll();
  if (state.currentView === 'add') renderLibrary();
}

function setHdr() {
  const h = document.querySelector('header');
  if (h) document.documentElement.style.setProperty('--hdr', (h.offsetHeight + 4) + 'px');
}

function initM2() {
  setupLibrary(); setupImport(); setupReview();
  applyAddSub(); setHdr();
  window.addEventListener('resize', setHdr);
  window.addEventListener('orientationchange', setHdr);
  window.M2 = { renderLibrary, leaveReview, onTuning };
  loadSongs();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    // a new version takes over in the background: reload once so the update shows without reopening the app
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloaded || state.currentView === 'review' || (window.KTFall && KTFall.running)) return;
      reloaded = true; location.reload();
    });
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline cache unavailable */ });
  }
  window.KT = { S, parseSong, importText, songToText, summarize, suggestShift, DB };
}

/* ---- growth: first-song onboarding, install guide, premium waitlist ---- */
const APP_URL = location.origin + location.pathname;
const WAITLIST_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdMIDCW_EaCVFcD43Z4aQ5AXbXHQzc_aQe9iKpz6gVYU9FLvQ/viewform';   // premium waitlist (Google Form); buttons hide while empty
const FIRST_SONG = {
  notes: ['C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4', 'D4', 'C4'],
  words: ['ทวิง', 'เคิล', 'ทวิง', 'เคิล', 'ลิต', 'เติล', 'สตาร์', 'ฮาว', 'ไอ', 'วัน', 'เดอร์', 'วอท', 'ยู', 'อาร์'],
  wordsEn: ['Twin', 'kle', 'twin', 'kle', 'lit', 'tle', 'star', 'how', 'I', 'won', 'der', 'what', 'you', 'are']
};
const UA = navigator.userAgent;
const inApp = /\bLine\//i.test(UA) ? 'line' : /FBAN|FBAV|FB_IAB|Instagram|BytedanceWebview|musical_ly|TikTok/i.test(UA) ? 'social' : '';
const isIOS = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = /Android/i.test(UA);
const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
let installPrompt = null;

const First = {
  idx: 0, running: false, listening: false, misses: 0, t0: 0, timers: [],
  tineFor(pitch) { return document.querySelector('#kalimba-tines-wrapper [data-pitch="' + pitch + '"]'); },
  clearGlow() { document.querySelectorAll('#kalimba-tines-wrapper .guide-target').forEach(t => t.classList.remove('guide-target')); },
  glow() {
    this.clearGlow();
    const t = this.tineFor(FIRST_SONG.notes[this.idx]);
    if (t) t.classList.add('guide-target');
  },
  render() {
    const n = FIRST_SONG.notes, cur = n[this.idx];
    byId('fs-step').textContent = this.listening ? t('fs.listening')
      : t('fs.step', { i: this.idx + 1, n: n.length, note: noteName(cur) + ' (' + pitchToNumber(cur) + ')' });
    byId('fs-notes').innerHTML = n.map((p, i) => {
      const cls = i < this.idx ? 'bg-emerald-600/80 text-white' : i === this.idx ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-200' : 'bg-slate-800 text-slate-400';
      return '<span class="chip shrink-0 text-center rounded px-1 py-0.5 leading-tight ' + cls + '"><b class="block text-[11px]">' + pitchToNumber(p) +
        '</b><span class="block text-[9px] whitespace-nowrap">' + (LANG === 'th' ? FIRST_SONG.words : FIRST_SONG.wordsEn)[i] + '</span></span>';
    }).join('');
    const now = byId('fs-notes').children[this.idx];
    if (now) now.scrollIntoView({ block: 'nearest', inline: 'center' });
  },
  show() {
    const card = byId('first-song-card');
    card.classList.toggle('hidden', !!(ls.get('fs.done', false) || ls.get('fs.closed', false)));
  },
  start() {
    unlockAudioUI();
    if (state.currentView !== 'play') switchView('play');
    Object.assign(this, { idx: 0, running: true, listening: false, misses: 0, t0: Date.now() });
    byId('fs-intro').classList.add('hidden'); byId('fs-run').classList.remove('hidden');
    byId('fs-hint').textContent = t('fs.hint');
    hideBanner();
    this.render(); this.glow();
  },
  stop() {
    this.running = false; this.listening = false;
    this.timers.forEach(clearTimeout); this.timers = [];
    this.clearGlow();
    byId('fs-run').classList.add('hidden'); byId('fs-intro').classList.remove('hidden');
  },
  listen() {
    if (!this.running || this.listening) return;
    unlockAudioUI();
    this.listening = true; this.clearGlow(); this.render();
    const n = FIRST_SONG.notes, gap = 520;
    n.forEach((p, i) => this.timers.push(setTimeout(() => {
      audio.playPitch(p);
      const t = this.tineFor(p);
      if (t) { t.classList.add('active'); setTimeout(() => t.classList.remove('active'), 260); }
    }, i * gap + (i >= 7 ? gap : 0))));
    this.timers.push(setTimeout(() => {
      this.listening = false; this.timers = [];
      if (this.running) { this.render(); this.glow(); }
    }, n.length * gap + gap + 300));
  },
  onNote(pitch) {
    if (!this.running || this.listening || state.currentView !== 'play') return;
    const want = FIRST_SONG.notes[this.idx];
    if (pitch !== want) {
      this.misses++;
      byId('fs-hint').innerHTML = '<span class="text-amber-300">' + esc(t('fs.wrong', { note: noteName(want) + ' / ' + pitchToNumber(want) })) + '</span>';
      return;
    }
    this.idx++;
    byId('fs-hint').innerHTML = '<span class="text-emerald-300">✓ ' + esc(t('fs.right')) + '</span>';
    if (this.idx >= FIRST_SONG.notes.length) { this.finish(); return; }
    this.render(); this.glow();
  },
  finish() {
    const secs = Math.max(1, Math.round((Date.now() - this.t0) / 1000));
    this.stop();
    ls.set('fs.done', true);
    this.show();
    const time = secs >= 60 ? Math.floor(secs / 60) + ' นาที ' + (secs % 60) + ' วินาที' : secs + ' วินาที';
    byId('fs-done-text').textContent = 'ใช้เวลา ' + time + (this.misses ? ' · พลาด ' + this.misses + ' ครั้ง' : ' · ไม่พลาดเลย!') + ' ลองฝึกตามจังหวะต่อเพื่อให้คล่องขึ้น';
    byId('fs-done-install').classList.toggle('hidden', isStandalone());
    byId('fs-done-premium').classList.toggle('hidden', !WAITLIST_URL);
    byId('modal-firstsong-done').classList.remove('hidden');
  }
};

async function shareApp() {
  const data = { title: 'ครูฝึกคาลิมบา', text: 'ฝึกคาลิมบาฟรี เล่นเพลงแรกได้ใน 5 นาที 🎵', url: APP_URL };
  if (navigator.share) {
    try { await navigator.share(data); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  copyLink();
}
function copyLink() {
  const done = () => toast('คัดลอกลิงก์แล้ว ส่งให้เพื่อนได้เลย');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(APP_URL).then(done, () => toast(APP_URL, 5000));
  else toast(APP_URL, 5000);
}
function openExternal() {
  location.href = APP_URL + '?openExternalBrowser=1';   // LINE opens this in Safari / Chrome
}

function stepList(items) {
  return '<ol class="space-y-2">' + items.map((s, i) =>
    '<li class="flex gap-2 items-start"><span class="w-5 h-5 shrink-0 rounded-full bg-amber-500 text-slate-950 text-[11px] font-bold flex items-center justify-center">' + (i + 1) +
    '</span><span>' + s + '</span></li>').join('') + '</ol>';
}
function actionBtn(label, primary, fn) {
  const b = el('button', primary ? 'py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold' : 'py-2 rounded-xl bg-slate-800 text-slate-100 border border-slate-700');
  b.textContent = label; b.onclick = fn;
  return b;
}
function openInstall() {
  const steps = byId('install-steps'), acts = byId('install-actions');
  acts.innerHTML = '';
  if (isStandalone()) {
    steps.innerHTML = '<p>✅ ติดตั้งแล้ว เปิดจากหน้าจอโฮมได้เลย</p>';
  } else if (inApp === 'line') {
    steps.innerHTML = '<p class="text-amber-200">ตอนนี้เปิดอยู่ในแอป LINE ซึ่งติดตั้งไม่ได้ และเพลงที่บันทึกอาจหาย</p>' +
      stepList(['กดปุ่มด้านล่างเพื่อเปิดใน ' + (isIOS ? 'Safari' : 'Chrome'), 'แล้วกดปุ่ม "📲 ติดตั้ง" อีกครั้ง']);
    acts.appendChild(actionBtn('เปิดในเบราว์เซอร์', true, openExternal));
  } else if (inApp) {
    steps.innerHTML = '<p class="text-amber-200">ตอนนี้เปิดอยู่ในแอปโซเชียล ซึ่งติดตั้งไม่ได้ และเพลงที่บันทึกอาจหาย</p>' +
      stepList(['กด ••• หรือ ⋮ ที่มุมจอ', 'เลือก "เปิดในเบราว์เซอร์" (หรือ "เปิดใน Safari/Chrome")', 'แล้วกดปุ่ม "📲 ติดตั้ง" อีกครั้ง']);
    acts.appendChild(actionBtn('คัดลอกลิงก์ไปเปิดเอง', false, copyLink));
  } else if (isIOS) {
    steps.innerHTML = stepList([
      'กดปุ่ม <b>แชร์</b> <span class="inline-block px-1 rounded bg-slate-700">⬆️</span> (ถ้าไม่เห็น ให้กด <b>•••</b> ก่อน)',
      'เลื่อนลงแล้วเลือก <b>"เพิ่มไปยังหน้าจอโฮม"</b>',
      'กด <b>"เพิ่ม"</b> มุมขวาบน แล้วเปิดแอปจากไอคอนบนหน้าจอโฮม'
    ]);
  } else if (installPrompt) {
    steps.innerHTML = '<p>กดปุ่มด้านล่าง แล้วเลือก "ติดตั้ง"</p>';
    acts.appendChild(actionBtn('ติดตั้งเลย', true, async () => {
      const ev = installPrompt; installPrompt = null;
      ev.prompt();
      try { await ev.userChoice; } catch (e) { /* prompt dismissed */ }
      byId('modal-install').classList.add('hidden');
      updateInstallUI();
    }));
  } else if (isAndroid) {
    steps.innerHTML = stepList(['กด <b>⋮</b> มุมขวาบนของ Chrome', 'เลือก <b>"ติดตั้งแอป"</b> หรือ <b>"เพิ่มลงในหน้าจอหลัก"</b>', 'กด <b>"ติดตั้ง"</b>']);
  } else {
    steps.innerHTML = '<p>ใช้บนมือถือจะสะดวกที่สุด เปิดลิงก์นี้บนมือถือ แล้วกด "📲 ติดตั้ง"</p>';
    acts.appendChild(actionBtn('คัดลอกลิงก์', false, copyLink));
  }
  acts.appendChild(actionBtn('📤 ชวนเพื่อนมาลอง', false, shareApp));
  hideBanner();
  byId('modal-install').classList.remove('hidden');
}
function hideBanner() { byId('install-banner').classList.add('hidden'); }
function updateInstallUI() {
  const can = !isStandalone() && (isIOS || isAndroid || !!inApp || !!installPrompt);
  byId('btn-install').classList.toggle('hidden', !can);
  return can;
}
function maybeBanner(visits) {
  if (!updateInstallUI() || ls.get('install.dismissed', false) || First.running) return;
  if (!inApp && visits < 2) return;
  byId('install-banner-text').textContent = inApp
    ? 'เปิดผ่าน' + (inApp === 'line' ? ' LINE' : 'แอปโซเชียล') + 'อยู่ เปิดในเบราว์เซอร์เพื่อติดตั้งและบันทึกเพลงได้'
    : 'ติดตั้งเป็นแอปบนหน้าจอโฮม เปิดเร็ว ใช้ออฟไลน์ได้';
  byId('install-banner-go').textContent = inApp === 'line' ? 'เปิดเลย' : 'ติดตั้ง';
  byId('install-banner').classList.remove('hidden');
}

function initGrowth() {
  const visits = ls.get('visits', 0) + 1;
  ls.set('visits', visits);
  byId('fs-start').onclick = () => First.start();
  byId('fs-close').onclick = () => { ls.set('fs.closed', true); First.show(); };
  byId('fs-stop').onclick = () => First.stop();
  byId('fs-listen').onclick = () => First.listen();
  byId('fs-done-practice').onclick = () => { byId('modal-firstsong-done').classList.add('hidden'); practiceWith('s1'); };
  byId('fs-done-share').onclick = shareApp;
  byId('fs-done-install').onclick = () => { byId('modal-firstsong-done').classList.add('hidden'); openInstall(); };
  const openWaitlist = () => { if (WAITLIST_URL) window.open(WAITLIST_URL, '_blank', 'noopener'); };
  byId('fs-done-premium').onclick = openWaitlist;
  byId('btn-premium').onclick = openWaitlist;
  byId('premium-card').classList.toggle('hidden', !WAITLIST_URL);
  byId('fs-done-close').onclick = () => byId('modal-firstsong-done').classList.add('hidden');
  byId('btn-install').onclick = openInstall;
  byId('modal-install-close').onclick = () => byId('modal-install').classList.add('hidden');
  byId('install-banner-go').onclick = () => (inApp === 'line' ? openExternal() : openInstall());
  byId('install-banner-close').onclick = () => { ls.set('install.dismissed', true); hideBanner(); };
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; updateInstallUI(); });
  window.addEventListener('appinstalled', () => { installPrompt = null; hideBanner(); updateInstallUI(); toast('ติดตั้งแล้ว 🎉 เปิดจากหน้าจอโฮมได้เลย', 3000); });
  window.KTFirst = First;
  First.show();
  setTimeout(() => maybeBanner(visits), 1500);
}

/* ---- free catalog, library search, MIDI / karaoke import ---- */
const MIDI_FREE_LIMIT = 3;
const MEMBER_CODE_SHA256 = ['eb74418202dbfcb44ceaec6018f8602d2865959293cdce1e657fb2190a283572'];   // SHA-256 of codes that unlock unlimited imports on a device
const REQUEST_ENTRY = 'entry.593957736';   // "เพลงที่อยากเล่นบนคาลิมบา" on the waitlist form
let freeCache = null;
function freeList() {
  if (!freeCache || freeCache.tuning !== state.tuning) {
    freeCache = { tuning: state.tuning, list: FREE_SONGS.map(f => Object.assign(freeSong(f, state.tuning), { meta: f })) };
  }
  return freeCache.list;
}
function renderFree() {
  const list = freeList();
  byId('free-count').textContent = t('lib.songs', { n: list.length });
  byId('lib-free').innerHTML = list.map(x =>
    '<div class="p-2.5 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center gap-2 text-xs" data-id="' + esc(x.song.id) + '" data-tags="' + esc(x.meta.tags.toLowerCase()) + '">' +
    '<div class="flex-1 min-w-0"><h4 class="font-bold text-slate-100 truncate">' + esc(x.meta.title) + '</h4>' +
    '<p class="text-[10px] text-slate-400 truncate">' + '★'.repeat(x.report.level) + ' · ' + esc(x.meta.origin) + '</p></div>' +
    '<button data-lib="fplay" class="h-9 px-3 rounded-full border border-slate-700 text-slate-200">' + esc(t('lib.sheet')) + '</button>' +
    '<button data-lib="prac" class="h-9 px-4 rounded-full bg-amber-500 text-slate-950 font-semibold">' + esc(t('lib.practice')) + '</button></div>').join('');
}
function libQuery() { return (byId('lib-search').value || '').trim(); }
function applyLibSearch() {
  const q = libQuery().toLowerCase();
  let shown = 0;
  $$('#lib-list [data-id], #lib-free [data-id], #lib-builtin [data-id]').forEach(r => {
    const ok = !q || r.textContent.toLowerCase().includes(q) || (r.dataset.tags || '').includes(q);
    r.classList.toggle('hidden', !ok);
    if (ok) shown++;
  });
  byId('lib-noresult').classList.toggle('hidden', !q || shown > 0);
  byId('lib-q').textContent = libQuery();
  if (q) byId('lib-empty').classList.add('hidden');
}
function googleMidi(q) {
  window.open('https://www.google.com/search?q=' + encodeURIComponent((q ? q + ' ' : 'kalimba ') + 'midi'), '_blank', 'noopener');
}
function requestSong(q) {
  if (WAITLIST_URL) window.open(WAITLIST_URL + '?usp=pp_url&' + REQUEST_ENTRY + '=' + encodeURIComponent(q), '_blank', 'noopener');
}

const GUIDE = {
  ios: [
    ['🔎', 'ค้นหา', 'กด <b>"หาไฟล์ MIDI ใน Google"</b> ในแอป หรือเปิด Safari พิมพ์ <b>ชื่อเพลง midi</b> (เพลงไทยลอง <b>ชื่อเพลง คาราโอเกะ midi</b>)'],
    ['🌐', 'เลือกไฟล์ในเว็บ', 'เข้าเว็บที่ขึ้นมา หาลิงก์ที่ชื่อไฟล์ลงท้าย <b>.mid</b> หรือ <b>.kar</b> แล้วแตะ'],
    ['⬇️', 'ดาวน์โหลด', 'Safari ถามว่าจะดาวน์โหลดไหม กด <b>"ดาวน์โหลด"</b> ไฟล์จะไปอยู่ที่แอป <b>ไฟล์ (Files) → ดาวน์โหลด</b>'],
    ['🎵', 'กลับมาที่แอปนี้', 'แท็บ <b>➕ เพิ่ม/คลัง</b> → <b>➕ เพิ่มเพลง</b> → <b>📂 เลือกไฟล์</b>'],
    ['📁', 'เลือกไฟล์', 'แตะ <b>"เรียกดู"</b> → โฟลเดอร์ <b>"ดาวน์โหลด"</b> → แตะไฟล์เพลง'],
    ['✅', 'พร้อมฝึก', 'กด <b>"ใช้ทำนองที่แนะนำ"</b> → ฟังดู → <b>💾 บันทึก</b> แล้วกด <b>🎯 ฝึก</b> ได้เลย ใช้ออฟไลน์ได้']
  ],
  android: [
    ['🔎', 'ค้นหา', 'กด <b>"หาไฟล์ MIDI ใน Google"</b> ในแอป หรือเปิด Chrome พิมพ์ <b>ชื่อเพลง midi</b> (เพลงไทยลอง <b>ชื่อเพลง คาราโอเกะ midi</b>)'],
    ['🌐', 'เลือกไฟล์ในเว็บ', 'เข้าเว็บที่ขึ้นมา หาลิงก์ที่ชื่อไฟล์ลงท้าย <b>.mid</b> หรือ <b>.kar</b> แล้วแตะ'],
    ['⬇️', 'ดาวน์โหลด', 'Chrome ดาวน์โหลดให้ทันที (ถ้าถาม กด <b>"ดาวน์โหลด"</b>) ไฟล์จะอยู่ในโฟลเดอร์ <b>Download</b>'],
    ['🎵', 'กลับมาที่แอปนี้', 'แท็บ <b>➕ เพิ่ม/คลัง</b> → <b>➕ เพิ่มเพลง</b> → <b>📂 เลือกไฟล์</b>'],
    ['📁', 'เลือกไฟล์', 'เลือก <b>"ไฟล์ล่าสุด"</b> หรือ <b>"ดาวน์โหลด"</b> → แตะไฟล์เพลง'],
    ['✅', 'พร้อมฝึก', 'กด <b>"ใช้ทำนองที่แนะนำ"</b> → ฟังดู → <b>💾 บันทึก</b> แล้วกด <b>🎯 ฝึก</b> ได้เลย ใช้ออฟไลน์ได้']
  ]
};
function showGuide(os) {
  $$('#modal-guide [data-os]').forEach(b => { b.className = 'py-1.5 rounded-lg ' + (b.dataset.os === os ? 'bg-amber-600 text-white' : 'text-slate-400'); });
  byId('guide-steps').innerHTML = GUIDE[os].map((s, i) =>
    '<div class="flex gap-2.5 items-start bg-slate-800/70 border border-slate-700 rounded-xl p-2.5">' +
    '<div class="w-9 h-9 shrink-0 rounded-lg bg-slate-950 flex items-center justify-center text-lg">' + s[0] + '</div>' +
    '<div><div class="font-semibold text-amber-200 text-xs">ขั้นที่ ' + (i + 1) + ' · ' + s[1] + '</div><div class="text-[12px] leading-relaxed">' + s[2] + '</div></div></div>').join('');
}
function openGuide() {
  showGuide(isAndroid ? 'android' : 'ios');
  byId('modal-midi').classList.add('hidden');
  byId('modal-guide').classList.remove('hidden');
}

const Midi = {
  pending: null, bus: null,
  used() { return ls.get('midi.count', 0); },
  isMember() { return !!ls.get('member', false); },   // turned on by the membership system once it exists
  refreshQuota() {
    byId('midi-quota').textContent = this.isMember() ? 'สมาชิก · นำเข้าได้ไม่จำกัด'
      : 'ฟรีเหลือ ' + Math.max(0, MIDI_FREE_LIMIT - this.used()) + '/' + MIDI_FREE_LIMIT + ' เพลง';
  },
  pick() {
    if (!this.isMember() && this.used() >= MIDI_FREE_LIMIT) { this.showLimit(); return; }
    byId('modal-guide').classList.add('hidden');
    const f = byId('file-midi'); f.value = ''; f.click();
  },
  async onFile(file) {
    if (!file) return;
    if (file.size > 2000000) { this.showError('ไฟล์ใหญ่เกินไป ไฟล์ MIDI ปกติมีขนาดไม่กี่สิบ KB'); return; }
    let bytes;
    try { bytes = new Uint8Array(await file.arrayBuffer()); } catch (e) { this.showError('อ่านไฟล์ไม่ได้'); return; }
    let r;
    try { r = midiToSong(bytes, { tuning: S.tuning }); } catch (e) { this.showError(e.message); return; }
    this.pending = { bytes, fileTitle: file.name.replace(/\.(mid|midi|kar|rmi)$/i, '').replace(/[_]+/g, ' ').trim(), r };
    if (r.voices.length <= 1) this.use(r.voices[0].id); else this.showPicker();
  },
  convert(voice) {
    const p = this.pending, r = midiToSong(p.bytes, { tuning: S.tuning, voice });
    r.song.title = r.karTitle || p.fileTitle || r.song.title || 'เพลงจากไฟล์ MIDI';
    return r;
  },
  open(title, html) {
    byId('midi-h').textContent = title;
    byId('midi-body').innerHTML = html;
    byId('modal-midi').classList.remove('hidden');
  },
  close() { this.stopPreview(); byId('modal-midi').classList.add('hidden'); },
  showPicker() {
    const vs = this.pending.r.voices;
    this.open('🎵 เลือกทำนอง',
      '<p class="text-xs text-slate-300">ไฟล์นี้มี ' + vs.length + ' แทร็ก แอปเลือกทำนองร้องให้แล้ว ถ้าไม่แน่ใจ กดปุ่มเขียวได้เลย</p>' +
      '<button data-act="use" data-mv="' + vs[0].id + '" class="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold">✅ ใช้ทำนองที่แนะนำ</button>' +
      vs.map((v, i) => '<div class="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs">' +
        '<div class="flex-1 min-w-0"><div class="font-semibold text-slate-100 truncate">' + (i === 0 ? '⭐ ' : '') + esc(v.name) + '</div>' +
        '<div class="text-[10px] text-slate-400">' + v.count + ' โน้ต' + (v.lyricHit > 0.3 ? ' · 🎤 ตรงกับเนื้อร้อง' : '') + '</div></div>' +
        '<button data-act="play" data-mv="' + v.id + '" class="px-2.5 py-1.5 rounded-lg bg-slate-700 text-slate-100">▶ ฟัง</button>' +
        '<button data-act="use" data-mv="' + v.id + '" class="px-2.5 py-1.5 rounded-lg bg-slate-700 text-emerald-300">ใช้</button></div>').join(''));
  },
  preview(voice) {
    unlockAudioUI();
    if (!Synth.ensure()) return;
    this.stopPreview();
    const r = this.convert(voice), parsed = parseSong(r.song, S.tuning), c = Synth.ctx, spb = 60 / r.song.tempo, t0 = c.currentTime + 0.1;
    const bus = c.createGain(); bus.connect(Synth.master); this.bus = bus;
    parsed.measures.forEach(pm => pm.notes.forEach(n => {
      const t = (pm.start + n.beat) * spb;
      if (t < 12) Synth.kalimba(bus, n.midi, t0 + t, 0.85);
    }));
  },
  stopPreview() {
    if (!this.bus) return;
    const b = this.bus; this.bus = null;
    b.gain.setTargetAtTime(0, Synth.ctx.currentTime, 0.03);
    setTimeout(() => { try { b.disconnect(); } catch (e) { /* gone */ } }, 300);
  },
  use(voice) {
    const r = this.convert(voice), rp = r.report;
    this.close();
    if (!this.isMember()) ls.set('midi.count', this.used() + 1);
    this.refreshQuota();
    const notes = [{ level: 'info', msg: 'แปลงจากไฟล์ MIDI: ทำนอง "' + rp.voice + '" · ' + rp.notes + ' โน้ต · ความยาก ' + '★'.repeat(rp.level) }];
    if (rp.shift) notes.push({ level: 'info', msg: 'ย้ายคีย์ ' + (rp.shift > 0 ? '+' : '') + rp.shift + ' ครึ่งเสียง ให้ลงคาลิมบา 17 คีย์' });
    if (rp.dropped) notes.push({ level: 'info', msg: 'ตัดโน้ตซ้อนและโน้ตประดับที่เร็วเกินไป ' + rp.dropped + ' ตัว ให้เล่นง่ายขึ้น' });
    if (rp.folded) notes.push({ level: 'warn', msg: rp.folded + ' โน้ตถูกย้ายขึ้นหรือลง 1 ออกเทฟ ให้อยู่บนแป้น' });
    if (rp.snapped) notes.push({ level: 'warn', msg: rp.snapped + ' โน้ตไม่มีบนแป้น จึงปรับไปโน้ตที่ใกล้สุด เสียงอาจต่างจากต้นฉบับเล็กน้อย' });
    if (rp.lyrics) notes.push({ level: 'info', msg: 'ใส่เนื้อร้องจากไฟล์คาราโอเกะให้แล้ว' });
    notes.push({ level: 'info', msg: 'กด ▶ ฟัง แล้ว 💾 บันทึก เพื่อเก็บไว้ฝึกแบบออฟไลน์' });
    openReview(r.song, { from: 'import', isNew: true, notes });
  },
  showLimit() {
    this.open('⭐ นำเข้าฟรีครบ ' + MIDI_FREE_LIMIT + ' เพลงแล้ว',
      '<p class="text-xs text-slate-300">สมาชิกนำเข้าไฟล์ MIDI ได้ไม่จำกัด รุ่นสมาชิกกำลังจะเปิด ลงชื่อไว้ก่อน เราจะแจ้งเมื่อเปิด</p>' +
      (WAITLIST_URL ? '<button data-act="waitlist" class="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold">⭐ ลงชื่อรอรุ่นสมาชิก</button>' : '') +
      '<p class="text-[11px] text-slate-400">ระหว่างนี้ยังฝึกเพลงในคลังเพลงฟรี และวางโน้ตตัวเลขเองได้ไม่จำกัด</p>');
  },
  showError(msg) {
    this.open('😕 แปลงไฟล์นี้ไม่ได้',
      '<p class="text-xs text-red-200">' + esc(msg) + '</p>' +
      '<p class="text-[11px] text-slate-300">ไฟล์ต้องเป็น .mid หรือ .kar (ไม่ใช่ .mp3 หรือรูปภาพ) ลองหาไฟล์อื่นของเพลงเดียวกัน</p>' +
      '<button data-act="guide" class="w-full py-2 rounded-xl bg-slate-800 text-slate-100 border border-slate-700">📖 ดูวิธีหาไฟล์</button>');
  }
};

function initMidi() {
  byId('btn-midi').onclick = () => Midi.pick();
  byId('file-midi').onchange = e => Midi.onFile(e.target.files && e.target.files[0]);
  byId('btn-midi-guide').onclick = openGuide;
  byId('btn-q-guide').onclick = openGuide;
  byId('btn-q-google').onclick = () => googleMidi(libQuery());
  byId('btn-q-request').onclick = () => { requestSong(libQuery()); };
  byId('btn-q-request').classList.toggle('hidden', !WAITLIST_URL);
  byId('lib-search').addEventListener('input', applyLibSearch);
  byId('modal-midi-close').onclick = () => Midi.close();
  byId('modal-guide-close').onclick = () => byId('modal-guide').classList.add('hidden');
  byId('guide-google').onclick = () => googleMidi(libQuery());
  byId('guide-pick').onclick = () => Midi.pick();
  $$('#modal-guide [data-os]').forEach(b => { b.onclick = () => showGuide(b.dataset.os); });
  byId('midi-body').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act, v = b.dataset.mv != null ? +b.dataset.mv : null;
    if (act === 'use') Midi.use(v);
    else if (act === 'play') Midi.preview(v);
    else if (act === 'waitlist') window.open(WAITLIST_URL, '_blank', 'noopener');
    else if (act === 'guide') openGuide();
  });
  byId('lib-free').addEventListener('click', e => {
    const b = e.target.closest('[data-lib="fplay"]');
    if (!b) return;
    const x = freeList().find(f => f.song.id === b.closest('[data-id]').dataset.id);
    if (!x) return;
    Sheet.open({ id: x.song.id, title: x.meta.title, song: x.song });
  });
  Midi.refreshQuota();
  const showUnlock = () => {
    byId('unlock-status').textContent = Midi.isMember() ? '✅ เครื่องนี้ปลดล็อกแล้ว นำเข้าไฟล์ได้ไม่จำกัด' : 'ยังไม่ได้ปลดล็อก (ฟรี ' + MIDI_FREE_LIMIT + ' เพลง)';
  };
  const tryUnlock = async (code, quiet) => {
    if (!(await isMemberCode(code))) { if (!quiet) toast('รหัสไม่ถูกต้อง'); return false; }
    ls.set('member', true);
    Midi.refreshQuota(); showUnlock();
    toast('ปลดล็อกแล้ว ✓ นำเข้าไฟล์ MIDI ได้ไม่จำกัด', 3000);
    return true;
  };
  byId('btn-unlock').onclick = () => tryUnlock(byId('unlock-code').value.trim()).then(ok => { if (ok) byId('unlock-code').value = ''; });
  showUnlock();
  // a link with ?unlock=CODE unlocks the device it is opened on, then drops the code from the address bar
  const q = new URLSearchParams(location.search), code = q.get('unlock');
  if (code) {
    q.delete('unlock');
    history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
    tryUnlock(code.trim());
  }
}
async function isMemberCode(code) {
  if (!code || !(window.crypto && crypto.subtle)) return false;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return MEMBER_CODE_SHA256.includes(hex);
}

/* ---- listen to a real kalimba through the microphone ---- */
const MIC_LAG = 0.1;   // the listener reports a pluck about this long after it happens
const Mic = {
  on: false, starting: false, stream: null, src: null, nodes: [], an: null, buf: null, timer: 0, L: null, quietSince: 0,
  async start() {
    if (this.on || this.starting) return true;
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) { toast(t('tu.nomic'), 3000); return false; }
    unlockAudioUI();
    this.starting = true;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch (e) {
      this.starting = false;
      toast(e && e.name === 'NotAllowedError' ? t('tu.denied') : t('tu.fail'), 4500);
      return false;
    }
    this.starting = false;
    if (!micWanted()) { stream.getTracks().forEach(tr => tr.stop()); return false; }   // left the page meanwhile
    this.listen(audio.ctx.createMediaStreamSource(stream), stream);
    return true;
  },
  listen(src, stream) {                 // src: any AudioNode — the microphone, or a test signal
    const c = audio.ctx;
    this.stream = stream || null; this.src = src;
    this.nodes = [0, 1].map(() => {
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = MIC_LOWPASS_HZ; f.Q.value = Math.SQRT1_2; return f;
    });
    this.an = c.createAnalyser(); this.an.fftSize = 4096;
    src.connect(this.nodes[0]); this.nodes[0].connect(this.nodes[1]); this.nodes[1].connect(this.an);
    this.buf = new Float32Array(this.an.fftSize);
    this.L = makeKeyListener(c.sampleRate, { hop: 0.025, win: this.an.fftSize });
    this.timer = setInterval(() => this.tick(), 25);
    this.on = true; window.KTMicOn = true;
    audio.session('play-and-record');
    micUI();
  },
  stop() {
    if (!this.on) return;
    clearInterval(this.timer);
    [this.src].concat(this.nodes).forEach(n => { try { n.disconnect(); } catch (e) { /* already gone */ } });
    if (this.stream) this.stream.getTracks().forEach(tr => tr.stop());
    this.on = false; window.KTMicOn = false; this.stream = null;
    audio.session('playback');
    Tuner.level(null);
    micUI();
  },
  tick() {
    const tm = audio.ctx.currentTime;
    this.an.getFloatTimeDomainData(this.buf);
    const ev = this.L.feed(this.buf, tm), lv = this.L.level(this.buf);
    // the app's own sound (a tapped tine, a preview) reaches the mic as well
    const own = kalimbaVoice.lastT != null && tm - kalimbaVoice.lastT > -0.2 && tm - kalimbaVoice.lastT < 0.35;
    if (lv) { this.quietSince = 0; Tuner.level(lv); }
    else if (!this.quietSince) this.quietSince = tm;
    else if (tm - this.quietSince > 0.6) Tuner.level(null);
    if (ev && !own) this.heard(ev);
  },
  heard(ev) {
    const pitch = midiToPitch(ev.midi);
    const tine = document.querySelector('#kalimba-tines-wrapper [data-pitch="' + pitch + '"]');
    if (tine) { tine.classList.add('active'); setTimeout(() => tine.classList.remove('active'), 160); }
    showPlayed(pitch);
    Tuner.pluck(ev);
    judgePitch(pitch, ev.t - MIC_LAG);
  }
};

// "Real kalimba" is one setting shared by the player and the lessons; the tuner has its own switch
const Real = { on: ls.get('real', false) };
function micWanted() {
  const v = state.currentView;
  return !document.hidden && ((v === 'tuner' && Tuner.on) || ((v === 'player' || v === 'lesson') && Real.on) || (v === 'sheet' && Sheet.listening));
}
function micSync() {
  if (micWanted()) { if (!Mic.on) Mic.start(); }
  else Mic.stop();
  micUI();
}
function micUI() {
  const pm = byId('pl-mic');
  pm.classList.toggle('tog-on', Real.on); pm.setAttribute('aria-pressed', String(Real.on));
  byId('tu-toggle-label').textContent = t(Tuner.on ? 'tu.stop' : 'tu.start');
  byId('tu-toggle').className = 'h-12 rounded-full font-semibold flex items-center justify-center gap-2 ' +
    (Tuner.on ? 'border border-slate-700 text-slate-200' : 'bg-amber-500 text-slate-950');
  if (!Mic.on) Tuner.level(null);
  Fall.message();
}

/* ---- tuner page ---- */
const Tuner = {
  on: false, readings: {}, last: null, run: 0, runMidi: -1, runCents: [],
  render() {
    byId('tu-kind').textContent = '17 · C' + (retuneSummary() ? ' · ' + retuneSummary() : '');
    byId('tu-tines').innerHTML = profileKeys().map(k =>
      '<button class="flex flex-col items-center gap-1" data-tu="' + k.pitch + '" aria-label="' + k.pitch + '">' +
      '<span class="tu-tine" style="height:' + Math.round(k.lengthPct * 0.55 + 12) + 'px"></span>' +
      '<span class="text-[10px] text-slate-400 font-mono leading-none">' + pitchToNumber(k.pitch) + '</span></button>').join('');
    this.paint();
    this.level(this.lastLv || null);
  },
  paint() {
    const keys = profileKeys().map(k => k.pitch);
    let checked = 0, ok = 0;
    $$('#tu-tines [data-tu]').forEach(b => {
      const p = b.dataset.tu, c = this.readings[p], bar = b.firstChild;
      bar.className = 'tu-tine' + (c == null ? '' : Math.abs(c) <= 10 ? ' ok' : ' off') + (this.last === p ? ' now' : '');
      if (c != null) { checked++; if (Math.abs(c) <= 10) ok++; }
    });
    byId('tu-summary').textContent = checked ? t('tu.checked', { a: checked, n: keys.length, ok }) : '';
  },
  // live reading every 25 ms (null = quiet)
  level(lv) {
    this.lastLv = lv;
    const needle = byId('tu-needle');
    if (!lv) {
      byId('tu-note').textContent = '–'; byId('tu-sub').textContent = '';
      byId('tu-cents').textContent = '–';
      byId('tu-status').textContent = Mic.on ? t('tu.pluck') : (this.on ? '' : t('tu.idle'));
      byId('tu-status').className = 'text-[14px] font-medium mt-1 min-h-[22px] text-center text-slate-300';
      needle.style.transform = 'rotate(0deg)'; needle.setAttribute('stroke', '#C3BBA9');
      this.run = 0;
      return;
    }
    const pitch = midiToPitch(lv.midi), c = clamp(lv.cents, -50, 50), inTune = Math.abs(c) <= 10;
    const onKey = profileKeys().some(k => k.pitch === pitch);
    byId('tu-note').textContent = state.noteSystem === 'western' ? pitch : noteName(pitch);
    byId('tu-sub').textContent = [pitchToNumber(pitch), state.noteSystem === 'western' ? '' : pitch, onKey ? '' : t('tu.offkey')].filter(Boolean).join(' · ');
    byId('tu-cents').textContent = t('tu.c', { c: (c > 0 ? '+' : '') + c });
    byId('tu-status').textContent = inTune ? '✓ ' + t('tu.in') : t(c < 0 ? 'tu.low' : 'tu.high', { c: Math.abs(c) });
    byId('tu-status').className = 'text-[14px] font-medium mt-1 min-h-[22px] text-center ' + (inTune ? 'text-emerald-400' : 'text-red-400');
    needle.style.transform = 'rotate(' + (c / 50 * 90) + 'deg)';
    needle.setAttribute('stroke', inTune ? '#5B634B' : '#A9603F');
    // a steady tone for ~0.2 s becomes that tine's reading
    if (lv.midi === this.runMidi) { this.run++; this.runCents.push(c); } else { this.runMidi = lv.midi; this.run = 1; this.runCents = [c]; }
    if (onKey && this.run >= 8 && this.run % 4 === 0) {
      const s = this.runCents.slice(-8).sort((a, b) => a - b);
      this.readings[pitch] = s[4]; this.last = pitch; this.paint();
    }
  },
  pluck(ev) {
    const p = midiToPitch(ev.midi);
    if (profileKeys().some(k => k.pitch === p)) { this.readings[p] = ev.cents; this.last = p; this.paint(); }
  },
  toggle() {
    this.on = !this.on;
    micSync();
  }
};

/* ---- song player: falling notes over the kalimba, judged from taps or a real kalimba ---- */
const HAND_COLOR = { L: '#E7B9B2', R: '#B7C6D6', C: '#EFE6D6' };
const CHORD_COLOR = '#C4483C';   // chord tones fall red
// the player runs on the page clock: iOS can suspend or interrupt the audio clock, which would freeze the notes
const clock = () => performance.now() / 1000;
const Fall = {
  src: null, events: [], skipped: 0, tempo: 80, beats: 4, totalBeats: 0, minGap: 1,
  mode: ls.get('fall.mode', 'wait'), speed: ls.get('fall.speed', 1), loop: false, chords: ls.get('fall.chords', true),
  pos: 0, startAt: 0, running: false, demo: false, done: false, raf: 0, last: 0, next: 0, clickBeat: null,
  stats: null, lanes: {}, cv: null, g: null, W: 0, H: 0, flashes: [], t0: 0, guided: null, lyricM: -1,

  get spb() { return 60 / (this.tempo * this.speed); },

  // src: { id, title, song } with a 3-line song, or { id, title, bpm, notes } with one pitch per beat
  open(src) {
    this.halt();
    this.src = src;
    this.noRhythm = !!(src.song && src.song.source === 'photo');
    this.mode = this.noRhythm ? 'wait' : ls.get('fall.mode', 'wait');
    const ev = [];
    if (src.song) {
      const p = parseSong(src.song, state.tuning);
      this.tempo = src.song.tempo || 80; this.beats = src.song.beats || 4; this.totalBeats = p.totalBeats;
      p.measures.forEach(pm => pm.notes.forEach(n => ev.push({ beat: pm.start + n.beat, midi: n.midi, lyric: n.lyric || '', m: pm.index })));
      // chords fall as red notes in the same lanes: a written chord (135) as written, a letter chord as its first three tones,
      // a bass note as itself; a tone the melody already plays on that beat is not doubled
      const seen = new Set(ev.map(e => e.beat.toFixed(3) + '/' + e.midi));
      p.measures.forEach(pm => (pm.chords || []).forEach(ch => {
        const ms = ch.type === 'notes' ? ch.midis : ch.type === 'chord' ? ch.midis.slice(0, 3) : ch.type === 'bass' ? [ch.midi] : [];
        ms.forEach(m => {
          const beat = pm.start + ch.beat, k = beat.toFixed(3) + '/' + m;
          if (!seen.has(k)) { seen.add(k); ev.push({ beat, midi: m, lyric: '', m: pm.index, chord: true }); }
        });
      }));
    } else {
      this.tempo = src.bpm || 80; this.beats = 4; this.totalBeats = src.notes.length;
      src.notes.forEach((p, i) => ev.push({ beat: i, midi: pitchToMidi(p), lyric: '', m: Math.floor(i / 4) }));
    }
    ev.sort((a, b) => a.beat - b.beat);
    ev.forEach(e => { e.pitch = midiToPitch(e.midi); e.res = null; });
    this.all = ev;
    let gap = 4;
    for (let i = 1; i < ev.length; i++) { const d = ev[i].beat - ev[i - 1].beat; if (d > 0.01 && d < gap) gap = d; }
    this.minGap = gap;
    byId('pl-title').textContent = src.title || '-';
    switchView('player');
    this.layout();
    this.reset(0);
  },
  // which notes this kalimba can play; the rest are skipped
  pickPlayable() {
    const keys = new Set(profileKeys().map(k => k.pitch));
    this.events = (this.all || []).filter(e => keys.has(e.pitch) && (this.chords || !e.chord));
    this.skipped = (this.all || []).filter(e => !e.chord).length - this.events.filter(e => !e.chord).length;   // chord tones outside the kalimba are not counted
  },
  reset(at) {
    this.pickPlayable();
    this.events.forEach(e => { e.res = e.beat < at - 0.001 ? 'skip' : null; });
    this.stats = { hit: 0, perfect: 0, good: 0, miss: 0, wrong: 0 };
    this.pos = at; this.startAt = at; this.done = false; this.flashes = [];
    this.next = this.firstOpen();
    byId('pl-result').classList.add('hidden');
    this.meta(); this.controls(); this.message(); this.lyric(true); this.progress(); this.draw(); this.guide();
  },
  firstOpen() { let i = 0; while (i < this.events.length && this.events[i].res) i++; return i; },
  meta() {
    const bpm = Math.round(this.tempo * this.speed);
    byId('pl-meta').textContent = bpm + ' BPM · ' + this.events.length + ' ' + (LANG === 'th' ? 'โน้ต' : 'notes') +
      (this.skipped ? ' · ' + t('pl.skipped', { n: this.skipped }) : '');
  },
  controls() {
    $$('[data-plmode]').forEach(b => { b.className = 'h-8 px-3 rounded-full ' + (b.dataset.plmode === this.mode ? 'seg-on' : 'seg-off') + (this.noRhythm && b.dataset.plmode === 'rhythm' ? ' hidden' : ''); });
    byId('pl-speed').textContent = Math.round(this.speed * 100) + '%';
    byId('pl-chords').classList.toggle('tog-on', this.chords); byId('pl-chords').setAttribute('aria-pressed', String(this.chords));
    byId('pl-loop').classList.toggle('tog-on', this.loop); byId('pl-loop').setAttribute('aria-pressed', String(this.loop));
    byId('pl-listen').classList.toggle('tog-on', this.demo && this.running);
    const playing = this.running && !this.demo;
    byId('pl-play-icon').innerHTML = icon(playing ? 'player-pause' : 'player-play', 'w-5 h-5');
    const label = byId('pl-play-label');
    label.dataset.i18n = playing ? 'pl.pause' : (this.pos > this.startAt + 0.01 && !this.done ? 'pl.resume' : 'pl.start');
    label.textContent = t(label.dataset.i18n);
  },
  message(txt) {
    const m = byId('pl-msg');
    if (txt != null) { m.textContent = txt; return; }
    if (this.running || this.done) { m.textContent = ''; return; }
    m.textContent = !this.src ? t('pl.nosong') : this.pos > this.startAt + 0.01 ? '' : t(Real.on ? 'pl.ready.mic' : 'pl.ready');
  },
  relabel() { if (this.src) { this.meta(); this.controls(); this.message(); this.lyric(true); this.draw(); } },

  /* lanes line up with the tines below the stage */
  layout() {
    const cv = byId('pl-canvas'), stage = byId('pl-stage');
    if (!cv || stage.offsetParent === null) return;
    const r = stage.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = r.width; this.H = r.height;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    this.cv = cv; this.g = cv.getContext('2d'); this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.lanes = {};
    $$('#kalimba-tines-wrapper [data-pitch]').forEach(tn => {
      const tr = tn.getBoundingClientRect();
      if (!tr.width) return;
      this.lanes[tn.dataset.pitch] = { x: tr.left - r.left + tr.width / 2, w: tr.width, hand: tn.dataset.hand || 'C', el: tn };
    });
    if (this.src) { this.pickPlayable(); this.next = Math.min(this.next, this.events.length); }
    this.draw();
  },
  pxPerBeat() { return Math.max(46, this.H / 5); },

  /* clock */
  play(demo) {
    if (!this.src) return;
    unlockAudioUI();
    if (this.done || this.next >= this.events.length) this.reset(0);
    if (demo && Real.on === false) { /* listening needs no microphone */ }
    if (!demo && Real.on && this.mode === 'rhythm') this.fitMic();
    this.demo = !!demo;
    // one measure of lead-in: notes fall while the count runs
    const at = this.pos;
    this.startAt = at; this.pos = at - this.beats; this.clickBeat = Math.floor(this.pos);
    this.running = true; this.t0 = Date.now();
    this.last = clock();
    byId('pl-result').classList.add('hidden');
    this.controls(); this.message();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => this.frame());
  },
  pause() {
    if (!this.running) return;
    this.running = false;
    if (this.pos < this.startAt) this.pos = this.startAt;
    this.demo = false;
    byId('pl-count').classList.add('hidden');
    this.controls(); this.message(); this.draw();
  },
  halt() { this.running = false; this.demo = false; cancelAnimationFrame(this.raf); this.unguide(); byId('pl-count').classList.add('hidden'); },
  // the microphone hears at most ~4 notes a second
  fitMic() {
    const max = Math.floor((this.minGap * 60 / this.tempo) / 0.25 * 20) / 20;
    if (this.speed > max && max >= 0.3) { this.speed = max; ls.set('fall.speed', this.speed); this.meta(); this.controls(); toast(t('pl.mic.fast'), 3000); }
  },
  frame() {
    const now = clock();
    const dt = Math.min(0.1, Math.max(0, now - this.last));
    this.last = now;
    try {
      if (this.running) this.advance(dt / this.spb, now);
      this.flashes = this.flashes.filter(f => now - f.t < 0.35);
      this.draw(now); this.guide(); this.progress();
    } catch (e) {
      console.error(e);   // keep the song moving rather than freezing on one bad frame
    }
    if (this.running || this.flashes.length) this.raf = requestAnimationFrame(() => this.frame());
  },
  advance(db, now) {
    const e0 = this.events[this.next];
    let p = this.pos + db;
    // lead-in count and clicks
    if (this.pos < this.startAt) {
      const left = Math.ceil(this.startAt - p - 1e-6), cnt = byId('pl-count');
      if (p < this.startAt) { cnt.textContent = left; cnt.classList.remove('hidden'); } else cnt.classList.add('hidden');
      if (Math.floor(p) > this.clickBeat && p < this.startAt + 0.01) { this.clickBeat = Math.floor(p); audio.playMetronome(left === this.beats); }
    }
    if (this.demo) {
      while (this.next < this.events.length && this.events[this.next].beat <= p) {
        const e = this.events[this.next++];
        if (e.res) continue;
        e.res = 'demo';
        if (Synth.ensure()) Synth.kalimba(Synth.master, e.midi, Synth.ctx.currentTime, e.chord ? 0.5 : 0.85);
        this.flash(e, '#E6B9A3', now);
        const ln = this.lanes[e.pitch];
        if (ln) { ln.el.classList.add('active'); setTimeout(() => ln.el.classList.remove('active'), 160); }
      }
    } else if (this.mode === 'wait') {
      if (e0 && p >= e0.beat) p = e0.beat;   // wait for the player
    } else {
      const late = this.win().good;
      while (this.next < this.events.length && (this.events[this.next].res || p - this.events[this.next].beat > late)) {
        const e = this.events[this.next];
        if (!e.res) { e.res = 'miss'; this.stats.miss++; this.score(); }
        this.next++;
      }
    }
    this.pos = p;
    if (this.next !== this.lyricIdx) this.lyric();
    const last = this.events.length ? this.events[this.events.length - 1].beat : 0;
    if (this.next >= this.events.length && p > Math.max(last + 1, this.startAt)) this.finish();
  },
  // timing windows in beats; the microphone is less exact than a tap
  win() {
    const mic = Real.on, s = this.spb;
    return { perfect: (mic ? 0.15 : 0.1) / s, good: (mic ? 0.3 : 0.22) / s };
  },
  onNote(pitch, at) {
    if (!this.running || this.demo || !this.src || this.pos < this.startAt - 0.25) return;
    const c = audio.ctx, ago = at != null && c ? Math.max(0, c.currentTime - at) : 0;
    const p = this.pos - ago / this.spb, now = clock();
    if (this.mode === 'wait') {
      const e0 = this.events[this.next];
      if (!e0 || p < e0.beat - 0.75) return;   // too early to count
      const hit = this.events.find((e, i) => i >= this.next && !e.res && Math.abs(e.beat - e0.beat) < 0.01 && e.pitch === pitch);
      if (hit) {
        hit.res = 'hit'; this.stats.hit++; this.flash(hit, '#A7B59C', now);
        this.next = this.firstOpenFrom(this.next);
      } else this.wrong(pitch, now);
      this.score();
      return;
    }
    const w = this.win();
    let best = null, bestD = 1e9;
    for (let i = this.next; i < this.events.length; i++) {
      const e = this.events[i];
      if (e.beat - p > w.good) break;
      const d = Math.abs(e.beat - p);
      if (!e.res && e.pitch === pitch && d <= w.good && d < bestD) { best = e; bestD = d; }
    }
    if (best) {
      const perfect = bestD <= w.perfect;
      best.res = perfect ? 'perfect' : 'good'; this.stats[best.res]++;
      this.flash(best, perfect ? '#A7B59C' : '#B7C6D6', now);
      this.next = this.firstOpenFrom(this.next);
    } else this.wrong(pitch, now);
    this.score();
  },
  firstOpenFrom(i) { while (i < this.events.length && this.events[i].res) i++; return i; },
  wrong(pitch, now) {
    this.stats.wrong++;
    const ln = this.lanes[pitch];
    if (ln) {
      this.flashes.push({ x: ln.x, w: ln.w, t: now, color: '#C47A5C' });
      ln.el.classList.add('wrong'); setTimeout(() => ln.el.classList.remove('wrong'), 220);
    }
  },
  flash(e, color, now) {
    const ln = this.lanes[e.pitch];
    if (ln) this.flashes.push({ x: ln.x, w: ln.w, t: now, color });
    if (!this.running) { cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(() => this.frame()); }
  },
  score() {
    const s = this.stats;
    byId('pl-score').textContent = this.mode === 'wait'
      ? t('pl.correct') + ' ' + s.hit + '/' + this.events.length + (s.wrong ? ' · ' + t('pl.wrong') + ' ' + s.wrong : '')
      : t('pl.perfect') + ' ' + s.perfect + ' · ' + t('pl.good') + ' ' + s.good + ' · ' + t('pl.miss') + ' ' + s.miss;
  },
  finish() {
    const s = this.stats, n = this.events.length || 1, wasDemo = this.demo;
    this.halt(); this.done = true; this.pos = Math.max(this.pos, this.startAt);
    this.controls(); this.message(); this.draw();
    if (wasDemo) { this.reset(0); return; }
    let acc, stars;
    if (this.mode === 'wait') {
      acc = s.hit / Math.max(1, s.hit + s.wrong);
      stars = s.wrong === 0 ? 3 : acc >= 0.8 ? 2 : 1;
    } else {
      acc = (s.perfect + 0.7 * s.good) / n;
      stars = acc >= 0.95 ? 3 : acc >= 0.8 ? 2 : acc >= 0.5 ? 1 : 0;
    }
    const pct = Math.round(acc * 100);
    if (this.loop) { toast(t('pl.acc') + ' ' + pct + '%', 1500); setTimeout(() => { if (this.loop && state.currentView === 'player') { this.reset(0); this.play(); } }, 1200); return; }
    const key = 'best.' + this.src.id + '.' + this.mode, best = ls.get(key, null);
    if (best == null || pct > best) ls.set(key, pct);
    byId('pl-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    byId('pl-res-acc').textContent = pct + '%';
    const secs = Math.round((Date.now() - this.t0) / 1000);
    byId('pl-res-detail').textContent = this.mode === 'wait'
      ? t('pl.correct') + ' ' + s.hit + ' · ' + t('pl.wrong') + ' ' + s.wrong + ' · ' + t('pl.time') + ' ' + Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0')
      : t('pl.perfect') + ' ' + s.perfect + ' · ' + t('pl.good') + ' ' + s.good + ' · ' + t('pl.miss') + ' ' + s.miss;
    byId('pl-res-best').textContent = best == null || pct > best ? (best == null ? '' : '★ ' + t('pl.newbest')) : t('pl.best', { n: best });
    byId('pl-result').classList.remove('hidden');
  },
  seek(frac) {
    if (!this.src || this.running) return;
    // start of the measure that was tapped
    this.reset(Math.max(0, Math.floor(clamp(frac, 0, 1) * this.totalBeats / this.beats) * this.beats));
  },

  /* drawing */
  draw(now) {
    const g = this.g;
    if (!g) return;
    const W = this.W, H = this.H, hitY = H - 4, pxb = this.pxPerBeat();
    now = now != null ? now : clock();
    g.clearRect(0, 0, W, H);
    // lanes
    Object.values(this.lanes).forEach((ln, i) => { g.fillStyle = isDark() ? (i % 2 ? '#20241C' : '#252922') : (i % 2 ? '#F6F1E7' : '#FBF9F4'); g.fillRect(ln.x - ln.w / 2, 0, ln.w, H); });
    // beats and measures
    for (let b = Math.ceil(this.pos); ; b++) {
      const y = hitY - (b - this.pos) * pxb;
      if (y < 0) break;
      g.fillStyle = isDark() ? (b % this.beats === 0 ? '#3A3F34' : '#2E3229') : (b % this.beats === 0 ? '#E0D8C8' : '#ECE5D8');
      g.fillRect(0, Math.round(y), W, 1);
    }
    // notes
    const h = Math.max(12, Math.min(22, this.minGap * pxb - 3));
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '600 ' + (h >= 18 ? 12 : 10) + 'px "IBM Plex Sans Thai", system-ui, sans-serif';
    for (let i = 0; i < this.events.length; i++) {
      const e = this.events[i], y = hitY - (e.beat - this.pos) * pxb;
      if (y < -h) break;
      if (y > H + h || (e.res && e.res !== 'miss')) continue;
      const ln = this.lanes[e.pitch];
      if (!ln) continue;
      const w = Math.max(10, Math.min(ln.w - 2, 44)), x = ln.x - w / 2;
      g.fillStyle = e.res === 'miss' ? (isDark() ? '#4A4F44' : '#E5DFD3') : e.chord ? CHORD_COLOR : HAND_COLOR[ln.hand] || HAND_COLOR.C;
      this.round(x, y - h, w, h, Math.min(7, h / 2));
      g.fill();
      if (i === this.next && !this.demo) { g.lineWidth = 2; g.strokeStyle = '#3A402F'; g.stroke(); }
      if (w >= 14) { g.fillStyle = e.res === 'miss' ? '#8A8F80' : e.chord ? '#FFF6F2' : '#3A402F'; g.fillText(pitchToNumber(e.pitch), ln.x, y - h / 2 + 0.5); }
    }
    // hit line and flashes
    g.fillStyle = '#C47A5C'; g.fillRect(0, hitY, W, 2);
    this.flashes.forEach(f => {
      const a = Math.max(0, 1 - (now - f.t) / 0.35);
      g.globalAlpha = a * 0.85; g.fillStyle = f.color;
      g.fillRect(f.x - f.w / 2, hitY - 26, f.w, 28);
      g.globalAlpha = 1;
    });
  },
  round(x, y, w, h, r) {
    const g = this.g;
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  },
  // the next tine to play glows gold once its note is close
  guide() {
    const e = this.events[this.next];
    const want = e && !this.demo && this.src && state.currentView === 'player' && e.beat - this.pos < 2 ? (this.lanes[e.pitch] || {}).el : null;
    if (want === this.guided) return;
    this.unguide();
    if (want) { want.classList.add('guide-target'); this.guided = want; }
  },
  unguide() { if (this.guided) this.guided.classList.remove('guide-target'); this.guided = null; },
  lyric(force) {
    this.lyricIdx = this.next;
    const e = this.events[Math.min(this.next, this.events.length - 1)];
    if (!e) { byId('pl-lyric').textContent = ''; return; }
    const line = (this.all || []).filter(x => x.m === e.m && x.lyric);
    if (!line.length) { if (force || this.lyricM !== e.m) byId('pl-lyric').textContent = ''; this.lyricM = e.m; return; }
    this.lyricM = e.m;
    byId('pl-lyric').innerHTML = line.map(x => '<span class="' + (x === e ? 'text-amber-300 font-semibold' : x.res ? 'text-slate-500' : '') + '">' + esc(x.lyric) + '</span>').join(' ');
  },
  progress() {
    const tb = this.totalBeats || 1, p = clamp(Math.max(this.pos, 0) / tb, 0, 1);
    byId('pl-progress-fill').style.width = (p * 100).toFixed(1) + '%';
    const sec = b => { const s = Math.max(0, Math.round(b * this.spb)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    byId('pl-pos').textContent = sec(Math.max(this.pos, 0)) + ' / ' + sec(tb);
  },

  setChords(on) {
    this.chords = !!on; ls.set('fall.chords', this.chords);
    if (!this.src) { this.controls(); return; }
    this.halt(); this.reset(Math.max(0, this.startAt));
  },
  setMode(m) { this.mode = m; ls.set('fall.mode', m); if (!this.running) this.reset(this.startAt); else { this.controls(); this.score(); } },
  setSpeed(d) {
    this.speed = Math.round(clamp(this.speed + d, 0.3, 1.5) * 100) / 100;
    ls.set('fall.speed', this.speed);
    this.meta(); this.controls(); this.progress();
  }
};

/* ---- song sheet: kalimba numbers over the lyrics. Listen to the tune, then practise on a real kalimba:
   note by note (the next note waits for you), line by line (hear a line, play it back) or the whole song in
   rhythm. The microphone hears the kalimba; tapping the mini kalimba strip counts as playing too. ---- */
const SH_DEG = ['1', '#1', '2', 'b3', '3', '4', '#4', '5', '#5', '6', 'b7', '7'];
const SH_MODES = ['listen', 'follow', 'phrase', 'rhythm'];
const HINT_AFTER = 3;   // seconds without the right note before the app plays it as a hint
const Sheet = {
  src: null, notes: [], lines: [], speed: ls.get('sheet.speed', 1), mode: ls.get('sheet.mode', 'follow'),
  playing: false, running: false, listening: false, from: 0, cur: -1, bus: null, timer: 0, raf: 0, T0: 0, base: 0,
  idx: 0, line: 0, phase: '', hintTimer: 0, stats: null, t0: 0,
  get spb() { return 60 / ((((this.src && this.src.song && this.src.song.tempo) || (this.src && this.src.bpm)) || 90) * this.speed); },

  open(src) {
    this.stop();
    this.src = src; this.from = 0; this.cur = -1;
    this.noRhythm = !!(src.song && src.song.source === 'photo');   // a photo sheet has no rhythm to follow
    if (!SH_MODES.includes(this.mode) || (this.noRhythm && this.mode === 'rhythm')) this.mode = 'follow';
    byId('sh-title').textContent = src.title || '-';
    switchView('sheet');
    this.render();
  },
  cell(n, k, chd) {
    const rel = n.midi - 60, oct = Math.floor(rel / 12), d = SH_DEG[((rel % 12) + 12) % 12];
    const num = d.length > 1 ? '<small>' + d[0] + '</small>' + d.slice(1) : d;
    // notes sharing one beat (written together, like 5'5') sit close together, as on the sheet
    return '<button class="sh-n' + (n.dur && n.dur < 1 ? ' sh-tie' : '') + '" data-k="' + k + '"><span class="sh-up">' + '•'.repeat(Math.max(0, oct)) + '</span>' +
      '<span class="sh-d">' + num + '</span><span class="sh-dn">' + '•'.repeat(Math.max(0, -oct)) + '</span>' +
      '<span class="sh-l">' + esc(n.lyric || '') + '</span>' + this.chordHTML(chd) + '</button>';
  },
  // a rest or held beat takes the same room as a note, so gaps in the sheet look like gaps here
  restCell(it, chd) {
    return '<span class="sh-rest"><span class="sh-up"></span><span class="sh-d">' + (it.type === 'hold' ? '–' : '·') + '</span><span class="sh-dn"></span>' +
      '<span class="sh-l"></span>' + this.chordHTML(chd) + '</span>';
  },
  chordHTML(list) {
    return '<span class="sh-c">' + (list || []).map(c => esc(c.type === 'bass' ? 'เบส ' + c.name : c.type === 'notes' && c.strum ? c.name + '~' : c.name)).join(' ') + '</span>';
  },
  render() {
    const song = this.src.song;
    if (!song || !song.measures) {   // built-in samples are plain pitch lists, one per beat
      const notes = this.src.notes.map((p, i) => ({ beat: i % 4, midi: pitchToMidi(p), lyric: '' }));
      this.parsed = { measures: [] };
      for (let i = 0; i < notes.length; i += 4) this.parsed.measures.push({ start: i, notes: notes.slice(i, i + 4) });
    } else this.parsed = parseSong(song, state.tuning);
    const keys = new Set(profileKeys().map(k => k.pitch)), html = [];
    let k = 0, line = [];
    this.notes = []; this.lines = [];
    const close = () => { if (line.length) { html.push('<div class="sh-line">' + line.join('') + '</div>'); line = []; } };
    this.parsed.measures.forEach((pm, i) => {
      if (i && song && song.measures && song.measures[i] && song.measures[i].br) close();
      // the beats of rest the sheet leaves before this line (or before a room the player gave a pause)
      if (i && pm.gap) line.push('<div class="sh-bar">' + this.restCell({ type: 'rest' }, null).repeat(Math.ceil(pm.gap)) + '</div>');
      // each chord goes under the first note or rest that starts on or after its beat
      const items = pm.items || pm.notes, chdAt = new Map();
      (pm.chords || []).forEach(c => {
        const it = items.find(x => x.beat >= c.beat - 1e-6);
        if (it) chdAt.set(it, (chdAt.get(it) || []).concat(c));
      });
      line.push('<div class="sh-bar">' + items.map(it => {
        if (it.type === 'rest' || it.type === 'hold') return this.restCell(it, chdAt.get(it));
        if (it.type === 'bad') return '';
        const pitch = midiToPitch(it.midi);
        this.notes.push({ t: pm.start + it.beat, midi: it.midi, pitch, line: html.length, ok: keys.has(pitch) });
        return this.cell(it, k++, chdAt.get(it));
      }).join('') + '</div>');
    });
    close();
    byId('sh-body').innerHTML = html.join('');
    $$('#sh-body .sh-n').forEach((el, i) => { this.notes[i].el = el; });
    // lines as note ranges, for line-by-line practice
    this.notes.forEach((n, i) => { if (!this.lines[n.line]) this.lines[n.line] = [i, i + 1]; else this.lines[n.line][1] = i + 1; });
    this.lines = this.lines.filter(Boolean);
    const lyr = $$('#sh-body .sh-l').some(x => x.textContent);
    byId('sh-meta').textContent = Math.round(((song && song.tempo) || this.src.bpm || 90) * this.speed) + ' BPM · ' + t('lib.notes', { n: this.notes.length }) + (lyr ? '' : ' · ' + t('sh.nolyrics'));
    this.strip(); this.mark(); this.controls(); this.status(t('sh.idle.' + this.mode));
  },
  // a small kalimba: which tine to play, left or right of the middle
  strip() {
    byId('sh-strip').innerHTML = profileKeys().map(k =>
      '<button class="ms-t" data-p="' + k.pitch + '" aria-label="' + k.pitch + '" style="height:' + Math.round(k.lengthPct * 0.42 + 12) + 'px"><span>' + pitchToNumber(k.pitch) + '</span></button>').join('');
  },
  stripMark(pitch, cls, ms) {
    const b = document.querySelector('#sh-strip [data-p="' + pitch + '"]');
    if (!b) return;
    if (ms) { b.classList.add(cls); setTimeout(() => b.classList.remove(cls), ms); return; }
    $$('#sh-strip .' + cls).forEach(x => x.classList.remove(cls));
    b.classList.add(cls);
  },
  controls() {
    $$('[data-shmode]').forEach(b => {
      b.className = 'h-9 rounded-full text-[12px] ' + (b.dataset.shmode === this.mode ? 'seg-on' : 'seg-off') + (this.noRhythm && b.dataset.shmode === 'rhythm' ? ' hidden' : '');
    });
    byId('sh-modes').classList.toggle('grid-cols-4', !this.noRhythm); byId('sh-modes').classList.toggle('grid-cols-3', !!this.noRhythm);
    const busy = this.playing || this.running;
    byId('sh-play-icon').innerHTML = icon(busy ? 'player-stop' : (this.mode === 'listen' ? 'headphones' : 'player-play'), 'w-5 h-5');
    const l = byId('sh-play-label'); l.dataset.i18n = busy ? 'sh.stop' : (this.mode === 'listen' ? 'sh.play' : 'sh.start'); l.textContent = t(l.dataset.i18n);
    byId('sh-speed').textContent = Math.round(this.speed * 100) + '%';
    byId('sh-again').classList.toggle('hidden', !(this.running && this.mode === 'phrase'));
  },
  status(txt, tone) {
    const s = byId('sh-status');
    s.textContent = txt || '';
    s.className = 'text-[13px] min-h-[20px] mt-1.5 text-center ' + (tone === 'ok' ? 'text-emerald-300 font-semibold' : tone === 'bad' ? 'text-red-400 font-semibold' : tone === 'go' ? 'text-amber-300 font-semibold' : 'text-slate-300');
  },
  mark() {
    const tgt = this.running && this.mode !== 'rhythm' && this.phase !== 'listen' ? this.idx : -1;
    this.notes.forEach((n, i) => {
      n.el.classList.toggle('on', i === this.cur && (this.playing || (this.running && this.mode === 'rhythm')));
      n.el.classList.toggle('target', i === tgt);
      n.el.classList.toggle('done', !!n.res || ((this.playing || (this.running && this.mode === 'rhythm')) && i < this.cur));
      n.el.classList.toggle('hit', n.res === 'hit' || n.res === 'perfect' || n.res === 'good');   // played right: stays green
      n.el.classList.toggle('wrong', !!n.bad && i === tgt);                                     // played wrong: stays red until it is right
      n.el.classList.toggle('sel', !this.playing && !this.running && i === this.from && this.from > 0);
    });
  },
  // keeps the note being played at one fixed height, so the page slides under it as the song goes on
  scrollTo(el) {
    if (!el) return;
    const r = el.getBoundingClientRect(), top = byId('sh-head').getBoundingClientRect().bottom + 12;
    const want = top + Math.max(20, (window.innerHeight - 90 - top) * 0.3), d = r.top - want;
    if (Math.abs(d) > 8) window.scrollBy({ top: d, behavior: 'smooth' });
  },

  /* playing notes [from, to) with the note being played lit up */
  playRange(from, to, done) {
    unlockAudioUI();
    if (!Synth.ensure()) return;
    this.stopAudio();
    const c = Synth.ctx, spb = this.spb, notes = this.notes, bus = c.createGain();
    bus.connect(Synth.master); this.bus = bus;
    this.playing = true; this.cur = -1;
    this.base = notes[from].t; this.T0 = c.currentTime + 0.15;
    const at = i => this.T0 + (notes[i].t - this.base) * spb, end = at(to - 1) + 0.6;
    let idx = from;
    this.timer = setInterval(() => {
      const now = c.currentTime;
      while (idx < to && at(idx) < now + 0.25) { Synth.kalimba(bus, notes[idx].midi, at(idx), 0.85); idx++; }
      if (idx >= to && now > end) { this.stopAudio(); this.mark(); this.controls(); if (done) done(); }
    }, 25);
    const step = () => {
      if (!this.playing) return;
      const now = c.currentTime;
      let k = this.cur < from ? from - 1 : this.cur;
      while (k + 1 < to && at(k + 1) <= now) k++;
      if (k !== this.cur && k >= from) { this.cur = k; this.mark(); this.scrollTo(notes[k].el); }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
    this.controls();
  },
  stopAudio() {
    clearInterval(this.timer); this.timer = 0; cancelAnimationFrame(this.raf);
    if (this.bus && Synth.ctx) {
      const b = this.bus;
      b.gain.setTargetAtTime(0, Synth.ctx.currentTime, 0.03);
      setTimeout(() => { try { b.disconnect(); } catch (e) { /* gone */ } }, 400);
    }
    this.bus = null; this.playing = false; this.cur = -1;
  },

  /* start / stop */
  go() {
    if (this.playing || this.running) { this.stop(); return; }
    if (!this.notes.length) return;
    if (this.mode === 'listen') { this.playRange(this.from, this.notes.length, () => { this.from = 0; this.status(t('sh.idle.listen')); this.mark(); }); this.status(''); return; }
    this.notes.forEach(n => { n.res = n.ok ? null : 'skip'; n.bad = false; });
    this.stats = { hit: 0, wrong: 0, perfect: 0, good: 0, miss: 0 };
    this.running = true; this.listening = true; this.t0 = Date.now();
    micSync();
    const first = this.nextOpen(this.from);
    if (this.mode === 'follow') { this.idx = first; this.phase = 'yours'; this.target(); }
    else if (this.mode === 'phrase') { this.line = Math.max(0, this.lines.findIndex(l => first < l[1])); this.listenLine(); }
    else this.rhythmStart(first);
    this.controls();
  },
  stop() {
    this.stopAudio();
    clearTimeout(this.hintTimer); this.hintTimer = 0;
    const was = this.running;
    this.running = false; this.phase = '';
    if (this.listening) { this.listening = false; micSync(); }
    $$('#sh-strip .target').forEach(x => x.classList.remove('target'));
    if (was && this.idx > 0 && this.idx < this.notes.length) this.from = this.idx;
    if (this.src) { this.mark(); this.controls(); if (was) this.status(t('sh.idle.' + this.mode)); }
  },
  nextOpen(i) { while (i < this.notes.length && this.notes[i].res) i++; return i; },

  /* note by note, and the "your turn" half of line by line */
  target() {
    clearTimeout(this.hintTimer);
    const lineEnd = this.mode === 'phrase' && this.lines[this.line] ? this.lines[this.line][1] : this.notes.length;
    this.idx = this.nextOpen(this.idx);
    if (this.idx >= lineEnd) { this.mode === 'phrase' ? this.lineDone() : this.finish(); return; }
    const n = this.notes[this.idx];
    this.mark(); this.scrollTo(n.el); this.stripMark(n.pitch, 'target');
    this.status(t(this.mode === 'phrase' ? 'sh.st.yours' : 'sh.st.follow', { note: noteName(n.pitch) + ' · ' + pitchToNumber(n.pitch) }), 'go');
    this.hintTimer = setTimeout(() => this.hint(), HINT_AFTER * 1000);
  },
  hint() {
    if (!this.running || this.phase !== 'yours') return;
    const n = this.notes[this.idx];
    if (!n) return;
    unlockAudioUI();
    if (Synth.ensure()) Synth.kalimba(Synth.master, n.midi, Synth.ctx.currentTime, 0.85);   // the mic ignores the app's own notes
    this.stripMark(n.pitch, 'hint', 700);
    this.status(t('sh.st.hint', { note: noteName(n.pitch) + ' · ' + pitchToNumber(n.pitch) }), 'go');
    this.hintTimer = setTimeout(() => this.hint(), (HINT_AFTER + 1) * 1000);
  },
  listenLine() {
    const l = this.lines[this.line];
    if (!l) { this.finish(); return; }
    this.phase = 'listen';
    this.status(t('sh.st.listen', { i: this.line + 1, n: this.lines.length }));
    $$('#sh-strip .target').forEach(x => x.classList.remove('target'));
    this.mark();
    this.playRange(l[0], l[1], () => {
      if (!this.running) return;
      setTimeout(() => {
        if (!this.running) return;
        this.phase = 'yours'; this.idx = l[0];
        this.notes.slice(l[0], l[1]).forEach(n => { if (n.res !== 'skip') n.res = null; n.bad = false; });
        this.target(); this.controls();
      }, 350);
    });
    this.controls();
  },
  lineDone() {
    this.status('✓ ' + t('sh.st.lineok'), 'ok');
    this.phase = 'between';
    setTimeout(() => { if (!this.running) return; this.line++; this.line < this.lines.length ? this.listenLine() : this.finish(); }, 800);
  },

  /* whole song in rhythm: the highlight moves at the song's speed, no tune (the mic would hear it) */
  rhythmStart(first) {
    this.idx = first; this.phase = 'count';
    this.base = (this.notes[first] || { t: 0 }).t;
    const lead = (this.src.song && this.src.song.beats) || 4;
    this.T0 = clock() + lead * this.spb;
    const step = () => {
      if (!this.running) return;
      const now = clock();
      if (now < this.T0) { this.status(t('sh.st.count', { n: Math.ceil((this.T0 - now) / this.spb) }), 'go'); this.raf = requestAnimationFrame(step); return; }
      if (this.phase === 'count') { this.phase = 'rhythm'; this.status(t('sh.st.rhythm')); }
      const pos = this.base + (now - this.T0) / this.spb, late = this.win().good;
      while (this.idx < this.notes.length && (this.notes[this.idx].res || pos - this.notes[this.idx].t > late)) {
        const n = this.notes[this.idx];
        if (!n.res) { n.res = 'miss'; this.stats.miss++; n.el.classList.add('miss'); }
        this.idx++;
      }
      let k = this.cur < first ? first - 1 : this.cur;
      while (k + 1 < this.notes.length && this.notes[k + 1].t <= pos) k++;
      if (k !== this.cur && k >= first) { this.cur = k; this.mark(); this.scrollTo(this.notes[k].el); const nx = this.notes[this.nextOpen(k)]; if (nx) this.stripMark(nx.pitch, 'target'); }
      const last = this.notes[this.notes.length - 1];
      if (this.idx >= this.notes.length && pos > last.t + 1) { this.finish(); return; }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  },
  win() { return { perfect: 0.15 / this.spb, good: 0.3 / this.spb }; },

  /* a note heard by the mic (at = AudioContext time of the pluck) or tapped on the strip */
  onNote(pitch, at) {
    if (!this.running) return;
    if (this.mode === 'rhythm') {
      if (this.phase !== 'rhythm') return;
      const c = audio.ctx, ago = at != null && c ? Math.max(0, c.currentTime - at) : 0;
      const p = this.base + (clock() - ago - this.T0) / this.spb, w = this.win();
      let best = null, bd = 1e9;
      for (let i = this.idx; i < this.notes.length && this.notes[i].t - p <= w.good; i++) {
        const n = this.notes[i], d = Math.abs(n.t - p);
        if (!n.res && n.pitch === pitch && d <= w.good && d < bd) { best = n; bd = d; }
      }
      if (best) { best.res = bd <= w.perfect ? 'perfect' : 'good'; this.stats[best.res]++; this.stripMark(pitch, 'hit', 250); best.el.classList.add('done'); }
      else { this.stats.wrong++; this.stripMark(pitch, 'bad', 300); }
      return;
    }
    if (this.phase !== 'yours') return;
    const n = this.notes[this.idx];
    if (!n) return;
    if (pitch === n.pitch) {
      n.res = 'hit'; n.bad = false; this.stats.hit++; this.stripMark(pitch, 'hit', 250);
      this.idx++; this.target();
    } else {
      this.stats.wrong++; this.stripMark(pitch, 'bad', 300);
      n.bad = true; this.mark();
      this.status(t('sh.st.wrong', { note: noteName(n.pitch) + ' · ' + pitchToNumber(n.pitch) }), 'bad');
    }
  },
  tapStrip(pitch) {
    audio.playPitch(pitch);
    if (this.running) this.onNote(pitch);
  },
  finish() {
    const s = this.stats, mode = this.mode, secs = Math.round((Date.now() - this.t0) / 1000);
    this.stop(); this.from = 0; this.mark();
    let pct, stars, detail;
    if (mode === 'rhythm') {
      const n = Math.max(1, s.perfect + s.good + s.miss);
      pct = Math.round((s.perfect + 0.7 * s.good) / n * 100);
      stars = pct >= 95 ? 3 : pct >= 80 ? 2 : pct >= 50 ? 1 : 0;
      detail = t('pl.perfect') + ' ' + s.perfect + ' · ' + t('pl.good') + ' ' + s.good + ' · ' + t('pl.miss') + ' ' + s.miss;
    } else {
      pct = Math.round(s.hit / Math.max(1, s.hit + s.wrong) * 100);
      stars = s.wrong === 0 ? 3 : pct >= 80 ? 2 : 1;
      detail = t('pl.correct') + ' ' + s.hit + ' · ' + t('pl.wrong') + ' ' + s.wrong + ' · ' + Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
    }
    this.status('★'.repeat(stars) + '☆'.repeat(3 - stars) + '  ' + t('pl.done') + ' · ' + t('pl.acc') + ' ' + pct + '% · ' + detail, 'ok');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  tap(k) {
    const n = this.notes[k];
    if (!n || this.running) return;
    if (this.playing) { this.from = k; this.go(); this.go(); return; }
    this.from = k; this.mark();
    unlockAudioUI();
    if (Synth.ensure()) Synth.kalimba(Synth.master, n.midi, Synth.ctx.currentTime, 0.85);
  },
  setMode(m) {
    if (this.running || this.playing) this.stop();
    this.mode = m; ls.set('sheet.mode', m);
    this.controls(); this.status(t('sh.idle.' + m)); this.mark();
  },
  setSpeed(d) {
    this.speed = Math.round(clamp(this.speed + d, 0.3, 1.5) * 100) / 100;
    ls.set('sheet.speed', this.speed);
    if (this.running || this.playing) this.stop();
    this.render();
  }
};

// "Practise" goes to the sheet when the player has a real kalimba, to the falling notes when not; asked once
function practiceRoute(src) {
  const has = ls.get('hasReal', null);
  if (has === null) {
    byId('modal-real').classList.remove('hidden');
    byId('modal-real').dataset.pending = JSON.stringify({ id: src.id });
    return;
  }
  if (has) { Sheet.open(src); if (Sheet.mode === 'listen') Sheet.setMode('follow'); }
  else Fall.open(src);
}
function answerReal(has) {
  ls.set('hasReal', has);
  const m = byId('modal-real'), p = m.dataset.pending ? JSON.parse(m.dataset.pending) : null;
  m.classList.add('hidden'); m.dataset.pending = '';
  if (p) practiceWith(p.id);
}

function initPlayer() {
  byId('sh-back').onclick = () => switchView('add');
  byId('sh-play').onclick = () => Sheet.go();
  byId('sh-again').onclick = () => { if (Sheet.running && Sheet.mode === 'phrase') { clearTimeout(Sheet.hintTimer); Sheet.stopAudio(); Sheet.listenLine(); } };
  $$('[data-shmode]').forEach(b => { b.onclick = () => Sheet.setMode(b.dataset.shmode); });
  byId('sh-strip').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b) Sheet.tapStrip(b.dataset.p); });
  byId('pl-sheet').onclick = () => { if (Fall.src) { byId('pl-ctrl').classList.add('hidden'); Sheet.open(Fall.src); } };
  byId('real-yes').onclick = () => answerReal(true);
  byId('real-no').onclick = () => answerReal(false);
  byId('sh-slower').onclick = () => Sheet.setSpeed(-0.1);
  byId('sh-faster').onclick = () => Sheet.setSpeed(0.1);
  byId('sh-practice').onclick = () => { if (Sheet.src) { Sheet.stop(); Fall.open(Sheet.src); } };
  byId('sh-body').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) Sheet.tap(+b.dataset.k); });
  window.KTSheet = Sheet;
  byId('pl-back').onclick = () => switchView('add');
  byId('pl-choose').onclick = () => switchView('add');
  byId('pl-play').onclick = () => {
    if (!Fall.src) { switchView('add'); return; }
    if (Fall.running && !Fall.demo) Fall.pause(); else { Fall.halt(); Fall.play(false); }
  };
  byId('pl-listen').onclick = () => {
    if (!Fall.src) return;
    if (Fall.running && Fall.demo) { Fall.pause(); return; }
    Fall.halt(); Fall.play(true);
  };
  byId('pl-again').onclick = () => { Fall.reset(0); Fall.play(false); };
  byId('pl-slow10').onclick = () => { Fall.setSpeed(-0.1); Fall.reset(0); Fall.play(false); };
  $$('[data-plmode]').forEach(b => { b.onclick = () => Fall.setMode(b.dataset.plmode); });
  byId('pl-slower').onclick = () => Fall.setSpeed(-0.05);
  byId('pl-faster').onclick = () => Fall.setSpeed(0.05);
  byId('pl-loop').onclick = () => { Fall.loop = !Fall.loop; Fall.controls(); };
  byId('pl-chords').onclick = () => Fall.setChords(!Fall.chords);
  byId('pl-more').onclick = e => {
    e.stopPropagation();
    const open = byId('pl-ctrl').classList.toggle('hidden') === false;
    byId('pl-more').setAttribute('aria-expanded', String(open));
  };
  document.addEventListener('click', e => {
    if (!byId('pl-ctrl').classList.contains('hidden') && !e.target.closest('#pl-ctrl')) { byId('pl-ctrl').classList.add('hidden'); byId('pl-more').setAttribute('aria-expanded', 'false'); }
  });
  byId('pl-mic').onclick = () => { Real.on = !Real.on; ls.set('real', Real.on); micSync(); };
  byId('pl-progress').onclick = e => { const r = e.currentTarget.getBoundingClientRect(); Fall.seek((e.clientX - r.left) / r.width); };
  byId('tu-toggle').onclick = () => Tuner.toggle();
  byId('tu-tines').addEventListener('click', e => { const b = e.target.closest('[data-tu]'); if (b) audio.playPitch(b.dataset.tu); });
  window.addEventListener('resize', () => { Fall.layout(); Fall.message(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { goQuiet(); return; }
    micSync();
  });
  // app switch / screen lock: stop everything and drop the audio context. iOS leaves it dead (silent, or 'running' with a frozen
  // clock); the next tap makes a fresh one. The photo picker only needs the old resume (a picker does not close the page).
  function goQuiet() {
    Fall.pause(); Mic.stop();
    try { Player.stop(); } catch (e) { /* nothing playing */ }
    audio.drop();
  }
  window.addEventListener('pagehide', goQuiet);
  window.addEventListener('pageshow', e => { if (e.persisted) micSync(); });
  window.KTFall = Fall; window.KTMic = Mic; window.KTTuner = Tuner; window.KTMicSync = micSync;
  Fall.controls(); Fall.message(); Tuner.render(); micUI();
}

// the app moved to playkalimba.pages.dev; songs live per site, so the old address offers a backup first (no auto-redirect)
function initMoved() {
  if (!/\.github\.io$/.test(location.hostname)) return;
  const NEW = 'https://playkalimba.pages.dev/';
  const bar = el('div', 'moved-bar');
  bar.innerHTML = '<b>แอปย้ายบ้านแล้ว → playkalimba.pages.dev</b>' +
    '<span>เพลงที่บันทึกไว้อยู่ที่เว็บนี้ ① กดสำรองเพลง ② เปิดเว็บใหม่ แล้วกด "กู้คืนจากไฟล์" ③ เพิ่มไอคอนใหม่ลงหน้าโฮม</span>' +
    '<div><button type="button" data-mv="backup">⬇️ สำรองเพลง</button><a href="' + NEW + '" target="_blank" rel="noopener">เปิดเว็บใหม่ ↗</a></div>';
  bar.querySelector('[data-mv="backup"]').onclick = () => byId('btn-backup').click();
  document.body.prepend(bar);
}

/* ---- step-by-step lessons (Learn page): levels, each 10 questions (level 1: 5); at most 2 wrong passes (level 1: 1) and gives 1-3 stars,
   a passed level unlocks the next. Taps and a real kalimba heard by the microphone both come in through judgePitch -> KTLesson.onNote. ---- */
function initLessons() {
  const L = o => (typeof o === 'string' ? o : (o[LANG] || o.th));
  const P = tok => numberTokenToPitch(tok);
  const T = (th, en) => ({ th, en });
  const SETS = [['1', '3', '5'], ['4', '6'], ['2', '4', '6'], ['5', '7'], ['3', '5', '7'], ['2', '4']];   // red chord numbers as they appear on Fun's sheets
  const LV = [
    { id: 'l1', n: 5, kind: 'find', pool: ['1'], title: T('หาก้านกลาง', 'Find the middle tine'), sub: T('โน้ต 1 (โด)', 'Note 1 (do)'),
      intro: T('ก้านยาวสุดตรงกลางคือโน้ต 1 (โด) ก้านที่กะพริบคือก้านที่ต้องดีด ลองดีดดู', 'The longest tine in the middle is note 1 (do). The tine that blinks is the one to play.') },
    { id: 'l2', n: 10, kind: 'find', pool: ['1', '2', '3'], title: T('โน้ต 1-2-3', 'Notes 1-2-3'), sub: T('กลาง ซ้าย ขวา', 'Middle, left, right'),
      intro: T('จากกลางออกไป ซ้ายเป็น 2 ขวาเป็น 3 ก้านจะสลับซ้ายขวา เสียงสูงขึ้นเรื่อยๆ', 'From the middle: left is 2, right is 3. The tines alternate left and right, getting higher.') },
    { id: 'l3', n: 10, kind: 'find', pool: ['1', '2', '3', '4', '5'], title: T('โน้ต 1-5', 'Notes 1-5'), sub: T('เพิ่ม 4 และ 5', 'Add 4 and 5'),
      intro: T('ต่อไปอีกสองก้าน ซ้ายเป็น 4 ขวาเป็น 5', 'Two more tines: left is 4, right is 5.') },
    { id: 'l4', n: 10, kind: 'find', pool: ['1', '2', '3', '4', '5', '6', '7'], title: T('ครบ 1-7', 'All of 1-7'), sub: T('หนึ่งช่วงเสียงเต็ม', 'A full octave'),
      intro: T('ซ้ายเป็น 6 ขวาเป็น 7 ครบ 1 ถึง 7 แล้ว', 'Left is 6, right is 7. Now you have 1 to 7.') },
    { id: 'l5', n: 10, kind: 'find', pool: ['1', '3', '5', "1'", "3'", "5'", "1''", "3''"], title: T('เสียงสูง เสียงต่ำ', 'High and low'), sub: T("ขีด ' และ ''", "Marks ' and ''"),
      intro: T("เลขที่มีขีดเล็ก 1' คือเสียงสูงขึ้นหนึ่งช่วง สองขีด 1'' สูงขึ้นอีก ยิ่งไปปลายซ้ายขวายิ่งสูง", "A number with a small mark, 1', is one octave higher. Two marks, 1'', is higher again. The tines at the far ends are the highest.") },
    { id: 'l6', n: 10, kind: 'mix', title: T('อ่านแผ่นโน้ต', 'Reading a sheet'), sub: T('เลขเทา เลขแดง', 'Grey and red numbers'),
      intro: T('ในแผ่นโน้ตรูปถ่าย เลขเทาคือทำนอง ดีดทีละตัวตามลำดับ เลขแดงคือคอร์ด ดีดทุกก้านพร้อมกัน (ตัวไหนก่อนก็ได้)', 'On a photo sheet grey numbers are the tune: play them one by one in order. Red numbers are a chord: play all of them together (any order).') },
    { id: 'l7', n: 10, kind: 'seq', title: T('เพลงแรก Twinkle, Twinkle, Little Star', 'First song: Twinkle, Twinkle, Little Star'), sub: T('ทีละท่อน ช้าๆ', 'One phrase at a time'),
      phrases: [['1', '1', '5', '5'], ['6', '6', '5'], ['4', '4', '3', '3'], ['2', '2', '1'], ['5', '5', '4', '4'], ['3', '3', '2']],
      lyrics: ['ทวิง เคิล ทวิง เคิล', 'ลิต เติล สตาร์', 'ฮาว ไอ วัน เดอร์', 'ว็อต ยู อาร์', 'อัพ อะ บัฟ เดอะ', 'เวิลด์ โซ ไฮ'],
      intro: T('เพลงแรกคือ Twinkle, Twinkle, Little Star ดีดทีละท่อน ดูเลขแล้วดีดตามลำดับ ตัวหนังสือเล็กๆ คือเนื้อร้องช่วยจำจังหวะ', 'The first song is Twinkle, Twinkle. Play one phrase at a time in order. The small words are the lyrics, to help you remember the rhythm.') },
    { id: 'l8', n: 10, kind: 'set', sets: SETS, title: T('คอร์ดดีด', 'Plucked chords'), sub: T('2-3 ก้านพร้อมกัน และกรีด ~', '2-3 tines together, and strums ~'),
      intro: T('คอร์ดดีดคือดีด 2-3 ก้านพร้อมกัน เลขที่มี ~ คือกรีด ไล่ดีดเร็วๆ ดีดครบทุกก้านถึงผ่านข้อ ตัวไหนก่อนก็ได้', 'A plucked chord is 2-3 tines at once. A number with ~ is a strum: play them quickly one after another. Play every tine to finish the question, in any order.') }
  ];
  const SEMI = ['1', '2', '3', '4', '5', '6', '7'];
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  // n questions, each pool member about equally often, never the same one twice in a row
  const spread = (items, n) => {
    let out = [];
    while (out.length < n) { let batch = shuffle(items); if (out.length && items.length > 1 && JSON.stringify(batch[0]) === JSON.stringify(out[out.length - 1])) batch.push(batch.shift()); out = out.concat(batch); }
    return out.slice(0, n);
  };
  const mk = (type, toks, lyr) => ({ type, toks, pitches: toks.map(P), lyr: lyr || '' });
  function questions(lv) {
    if (lv.kind === 'find') return spread(lv.pool, lv.n).map(tk => mk('find', [tk]));
    if (lv.kind === 'seq') return spread(lv.phrases.map((p, i) => i), lv.n).map(i => mk('seq', lv.phrases[i], lv.lyrics[i]));
    if (lv.kind === 'set') return spread(SETS.map((s, i) => i), lv.n).map(i => mk('set', SETS[i]));
    const qs = [];   // mix: 5 grey runs of 3 numbers and 5 red chords, shuffled
    for (let i = 0; i < 5; i++) { const s = rnd(SEMI.slice(0, 5)), toks = [s, rnd(SEMI.slice(0, 5)), rnd(SEMI.slice(0, 5))].map((x, k) => (k === 2 && Math.random() < 0.4 ? x + "'" : x)); qs.push(mk('seq', toks)); }
    spread(SETS.map((s, i) => i), 5).forEach(i => qs.push(mk('set', SETS[i])));
    return shuffle(qs);
  }
  const prog = () => ls.get('lessons', {});
  const unlocked = i => i === 0 || (prog()[LV[i - 1].id] || 0) >= 1;
  const need = lv => Math.ceil(lv.n * 0.8);
  const starTxt = s => '★'.repeat(s) + '☆'.repeat(3 - s);
  const lab = p => state.noteSystem === 'number' ? pitchToNumber(p) + ' (' + p + ')' : noteName(p) + ' · ' + pitchToNumber(p);

  const Lesson = { mode: 'path', lv: null, qs: [], i: 0, pos: 0, got: new Set(), wrongQs: 0, curWrong: false, locked: false, timer: 0 };
  const slot = () => $('[data-kslot="lesson"]');
  function show(mode) {
    Lesson.mode = mode;
    byId('le-path').classList.toggle('hidden', mode !== 'path');
    byId('le-run').classList.toggle('hidden', mode !== 'run');
    byId('le-free-box').classList.toggle('hidden', mode !== 'free');
    if (slot()) slot().classList.toggle('hidden', mode === 'path');
    if (mode !== 'free') state.lesson.currentTarget = null;
    glow([]);
    micSync();
  }
  function glow(pitches) {
    $$('#kalimba-tines-wrapper .guide-target').forEach(e => e.classList.remove('guide-target'));
    pitches.forEach(p => { const e = $('#kalimba-tines-wrapper [data-pitch="' + p + '"]'); if (e) e.classList.add('guide-target'); });
  }
  const goBack = () => { clearTimeout(Lesson.timer); show('path'); renderPath(); };

  function renderPath() {
    byId('le-path-title').textContent = L(T('บทเรียนคาลิมบา', 'Kalimba lessons'));
    byId('le-path-sub').textContent = L(T('เรียนทีละขั้น ผ่านแล้วปลดบทถัดไป', 'Learn step by step. Pass a level to unlock the next one.'));
    const pr = prog();
    byId('le-list').innerHTML = LV.map((lv, i) => {
      const ok = unlocked(i), s = pr[lv.id] || 0;
      return '<button data-lv="' + i + '" ' + (ok ? '' : 'disabled aria-disabled="true"') + ' class="w-full text-left rounded-2xl bg-slate-900 border ' + (s ? 'border-amber-500/50' : 'border-slate-800') +
        ' p-3 flex items-center gap-3 ' + (ok ? '' : 'opacity-50') + '"><span class="w-9 h-9 shrink-0 rounded-full border border-slate-700 flex items-center justify-center font-semibold ' + (ok ? 'text-amber-300' : 'text-slate-500') + '">' + (ok ? i + 1 : '🔒') +
        '</span><span class="min-w-0 flex-1"><span class="block font-semibold text-slate-100 truncate">' + esc(L(lv.title)) + '</span><span class="block text-[12px] text-slate-400 truncate">' + esc(L(lv.sub)) +
        '</span></span><span class="text-amber-400 tracking-wider">' + (ok ? starTxt(s) : '') + '</span></button>';
    }).join('');
    byId('le-free').textContent = L(T('ฝึกสุ่มทุกโน้ต', 'Random practice, all notes'));
  }
  function open(i) {
    const lv = LV[i];
    Object.assign(Lesson, { lv, qs: questions(lv), i: 0, pos: 0, got: new Set(), wrongQs: 0, curWrong: false, locked: false });
    show('run');
    byId('le-title').textContent = (i + 1) + '. ' + L(lv.title);
    byId('le-intro-text').textContent = L(lv.intro);
    byId('le-start').textContent = L(T('เริ่มฝึก', 'Start'));
    byId('le-intro').classList.remove('hidden'); byId('le-q').classList.add('hidden'); byId('le-res').classList.add('hidden');
    byId('le-prog').style.width = '0%';
    const pool = lv.kind === 'find' ? lv.pool : lv.kind === 'set' ? [].concat(...SETS) : lv.kind === 'seq' ? [].concat(...lv.phrases) : [];
    glow(Array.from(new Set(pool.map(P))));   // the tines this level is about blink while it is explained
    window.scrollTo(0, 0);
  }
  function start() {
    byId('le-intro').classList.add('hidden'); byId('le-q').classList.remove('hidden');
    glow([]); next(true);
  }
  function renderQ() {
    const q = Lesson.qs[Lesson.i], lv = Lesson.lv;
    byId('le-count').textContent = L(T('ข้อ ', 'Question ')) + (Lesson.i + 1) + '/' + lv.n;
    byId('le-prog').style.width = (Lesson.i / lv.n * 100) + '%';
    const lbl = byId('le-q-label'), sub = byId('le-q-sub');
    if (q.type === 'find') {
      lbl.className = 'text-4xl font-semibold text-amber-400'; lbl.textContent = lab(q.pitches[0]);
      sub.textContent = L(T('หาแล้วดีดโน้ตนี้', 'Find and play this note'));
    } else {
      const set = q.type === 'set';
      lbl.className = 'text-3xl font-semibold tracking-wide ' + (set ? 'text-red-500' : 'text-slate-200');
      lbl.innerHTML = q.toks.map((tk, k) => {
        const done = set ? Lesson.got.has(q.pitches[k]) : k < Lesson.pos, cur = !set && k === Lesson.pos;
        return '<span class="' + (done ? 'text-emerald-500' : cur ? 'underline decoration-2 underline-offset-8' : '') + '">' + esc(pitchToNumber(q.pitches[k])) + '</span>';
      }).join(' ');
      sub.textContent = set ? L(T('คอร์ด: ดีดทุกก้านพร้อมกัน หรือไล่เร็วๆ ตัวไหนก่อนก็ได้', 'Chord: play every tine together, or quickly one after another, in any order'))
        : (q.lyr ? q.lyr + ' · ' : '') + L(T('ดีดตามลำดับ', 'Play in order'));
    }
  }
  function next(first) {
    if (!first) Lesson.i++;
    if (Lesson.i >= Lesson.lv.n) { finish(); return; }
    Lesson.pos = 0; Lesson.got = new Set(); Lesson.curWrong = false; Lesson.locked = false;
    glow([]); byId('le-fb').textContent = L(T('แตะก้าน หรือดีดคาลิมบาจริง (เปิดคาลิมบาจริงในเมนูเพลงหรือหน้าตั้งเสียง)', 'Tap a tine, or pluck your kalimba (turn on Real kalimba in Songs or Tuner)'));
    byId('le-fb').className = 'text-[13px] text-slate-400 min-h-[20px]';
    renderQ();
  }
  function wanted(q) {
    return q.type === 'set' ? q.pitches.filter(p => !Lesson.got.has(p)) : [q.pitches[Lesson.pos]];
  }
  function onNote(pitch) {
    if (Lesson.mode !== 'run' || Lesson.locked || byId('le-q').classList.contains('hidden')) return;
    const q = Lesson.qs[Lesson.i];
    if (!q) return;
    const fb = byId('le-fb');
    if (q.type === 'set') {
      if (Lesson.got.has(pitch)) return;
      if (q.pitches.includes(pitch)) Lesson.got.add(pitch); else return wrong(q);
      if (Lesson.got.size < q.pitches.length) { renderQ(); fb.textContent = '✓'; fb.className = 'text-[13px] text-emerald-500 font-semibold min-h-[20px]'; return; }
    } else {
      if (pitch !== q.pitches[Lesson.pos]) return wrong(q);
      Lesson.pos++;
      if (Lesson.pos < q.pitches.length) { renderQ(); fb.textContent = '✓'; fb.className = 'text-[13px] text-emerald-500 font-semibold min-h-[20px]'; return; }
    }
    renderQ();
    fb.textContent = '✓ ' + L(T('ถูกต้อง เก่งมาก', 'Correct, well done'));
    fb.className = 'text-[13px] text-emerald-500 font-semibold min-h-[20px]';
    Lesson.locked = true; glow([]);
    Lesson.timer = setTimeout(() => next(false), 800);
  }
  function wrong(q) {
    if (!Lesson.curWrong) { Lesson.curWrong = true; Lesson.wrongQs++; }
    const fb = byId('le-fb');
    fb.textContent = L(T('ยังไม่ใช่ ก้านที่กะพริบคือก้านที่ต้องดีด', 'Not quite. The blinking tine is the one to play.'));
    fb.className = 'text-[13px] text-red-500 font-semibold min-h-[20px]';
    glow(wanted(q));
  }
  function finish() {
    const lv = Lesson.lv, w = Lesson.wrongQs, ok = lv.n - w >= need(lv), stars = !ok ? 0 : w === 0 ? 3 : w === 1 ? 2 : 1;
    if (ok) { const pr = prog(); pr[lv.id] = Math.max(pr[lv.id] || 0, stars); ls.set('lessons', pr); }
    glow([]);
    byId('le-q').classList.add('hidden'); byId('le-res').classList.remove('hidden');
    byId('le-prog').style.width = '100%';
    byId('le-res-stars').textContent = starTxt(stars);
    byId('le-res-text').textContent = ok
      ? L(T('ผ่านแล้ว ถูก ' + (lv.n - w) + ' จาก ' + lv.n + ' ข้อ', 'Passed: ' + (lv.n - w) + ' of ' + lv.n + ' right'))
      : L(T('ยังไม่ผ่าน ถูก ' + (lv.n - w) + ' จาก ' + lv.n + ' ข้อ ต้องถูกอย่างน้อย ' + need(lv) + ' ลองอีกครั้งนะ', (lv.n - w) + ' of ' + lv.n + ' right. You need at least ' + need(lv) + '. Try again.'));
    const idx = LV.indexOf(lv), hasNext = ok && idx + 1 < LV.length;
    byId('le-res-next').classList.toggle('hidden', !hasNext);
    byId('le-res-next').textContent = L(T('บทต่อไป', 'Next level'));
    byId('le-res-again').textContent = L(T('ทำอีกครั้ง', 'Try again'));
    byId('le-res-list').textContent = L(T('กลับไปรายการ', 'Back to the list'));
    renderPath();
  }

  byId('le-list').addEventListener('click', e => { const b = e.target.closest('[data-lv]'); if (b && !b.disabled) open(+b.dataset.lv); });
  byId('le-start').onclick = start;
  byId('le-back').onclick = goBack;
  byId('le-res-again').onclick = () => open(LV.indexOf(Lesson.lv));
  byId('le-res-next').onclick = () => open(LV.indexOf(Lesson.lv) + 1);
  byId('le-res-list').onclick = goBack;
  byId('le-free').onclick = () => { show('free'); startNextLessonQuestion(); };
  byId('le-free-back').onclick = goBack;
  window.KTLesson = {
    get mode() { return Lesson.mode; },
    enter() { clearTimeout(Lesson.timer); show('path'); renderPath(); },
    onNote,
    relabel() {
      if (Lesson.mode === 'path') renderPath();
      else if (Lesson.mode === 'run' && Lesson.lv) {
        const i = LV.indexOf(Lesson.lv);
        byId('le-title').textContent = (i + 1) + '. ' + L(Lesson.lv.title); byId('le-intro-text').textContent = L(Lesson.lv.intro);
        byId('le-start').textContent = L(T('เริ่มฝึก', 'Start'));
        if (!byId('le-q').classList.contains('hidden')) renderQ();
      }
    },
    levels: LV, questions
  };
}

initM2();
initLessons();
initGrowth();
initMidi();
initPlayer();
initMoved();

})();
