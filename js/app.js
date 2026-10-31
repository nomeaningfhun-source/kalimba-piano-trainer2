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

const PROFILE_KALIMBA_13 = {
  keys: [
    { pitch: 'G5', hand: 'L', lengthPct: 62 }, { pitch: 'E5', hand: 'L', lengthPct: 68 }, { pitch: 'C5', hand: 'L', lengthPct: 75 },
    { pitch: 'A4', hand: 'L', lengthPct: 82 }, { pitch: 'F4', hand: 'L', lengthPct: 89 }, { pitch: 'D4', hand: 'L', lengthPct: 95 },
    { pitch: 'C4', hand: 'C', lengthPct: 100 },
    { pitch: 'E4', hand: 'R', lengthPct: 95 }, { pitch: 'G4', hand: 'R', lengthPct: 89 }, { pitch: 'Bb4', hand: 'R', lengthPct: 82, tunable: true },
    { pitch: 'D5', hand: 'R', lengthPct: 75 }, { pitch: 'F5', hand: 'R', lengthPct: 68 }, { pitch: 'A5', hand: 'R', lengthPct: 62 }
  ]
};
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
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.isUnlocked = true;
    const silent = document.getElementById('ios-silent-audio');
    if (silent) silent.play().catch(() => {});
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
  currentView: 'play', currentProfile: 'kalimba13', tuning13: 'Bb4', labelMode: 'both', noteSystem: 'thai',
  timingToleranceMs: 80, lastTriggerTime: 0, activeTouches: new Map(),
  lesson: { currentTarget: null, correctCount: 0, missMap: {}, timer: 0 },
  inspectingNotes: [],
  library: [
    { id: 's1', title: 'ดาวส่องแสง (โดเมนสาธารณะ)', bpm: 85, notes: ['C4','C4','G4','G4','A4','A4','G4','F4','F4','E4','E4','D4','D4','C4'] },
    { id: 's2', title: 'Yours Ever (3 บรรทัดจากรูป)', bpm: 78, notes: ['D5','D5','D5','C5','D5','E5','D5','C5','G5','G5','G5','A5'] }
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

const VIEW_SECTIONS = { play: 'section-play', player: 'section-player', lesson: 'section-lesson', tuner: 'section-tuner', add: 'section-add', review: 'section-review' };
const NAV_OF = { play: 'play', player: 'add', lesson: 'lesson', tuner: 'tuner', add: 'add', review: 'add' };
const KALIMBA_SLOT = { play: 'play', player: 'player', lesson: 'lesson' };
function switchView(viewName) {
  if (state.currentView === 'review' && viewName !== 'review' && window.M2 && !M2.leaveReview()) return;
  const from = state.currentView;
  if (from === 'player' && viewName !== 'player' && window.KTFall) KTFall.pause();
  state.currentView = viewName;
  Object.values(VIEW_SECTIONS).forEach(id => $(id).classList.add('hidden'));
  $(VIEW_SECTIONS[viewName]).classList.remove('hidden');
  document.querySelectorAll('#bottom-nav [data-view]').forEach(b => {
    if (b.dataset.view === NAV_OF[viewName]) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  document.body.classList.toggle('no-nav', viewName === 'review');
  document.body.classList.toggle('in-player', viewName === 'player');
  if (KALIMBA_SLOT[viewName]) mountKalimba(KALIMBA_SLOT[viewName]);
  if (viewName === 'lesson') startNextLessonQuestion();
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

function getNoteLabel(pitch) {
  if (state.labelMode === 'none') return { top: '', bottom: '' };
  const numStr = pitchToNumber(pitch);
  if (state.labelMode === 'number') return { top: numStr, bottom: '' };
  if (state.labelMode === 'note') return { top: noteName(pitch), bottom: '' };
  return { top: numStr, bottom: state.noteSystem === 'number' ? pitch : noteName(pitch) };
}

function currentProfile() { return state.currentProfile === 'kalimba17' ? PROFILE_KALIMBA_17 : PROFILE_KALIMBA_13; }
function profileKeys() {
  return currentProfile().keys.map(k => Object.assign({}, k, { pitch: state.currentProfile === 'kalimba13' && k.tunable ? state.tuning13 : k.pitch }));
}

function renderKalimba() {
  const wrapper = $('kalimba-tines-wrapper'); wrapper.innerHTML = '';
  $('kalimba-hole-label').textContent = state.currentProfile === 'kalimba17' ? '17 KEYS' : '13 KEYS';
  profileKeys().forEach(k => {
    const tine = document.createElement('div');
    tine.className = 'kalimba-tine rounded-b-xl flex flex-col justify-end items-center pb-2 cursor-pointer select-none';
    tine.dataset.pitch = k.pitch;
    tine.dataset.hand = k.hand;
    tine.style.height = `calc(var(--tine-h) * ${k.lengthPct / 100} + 30px)`;
    tine.style.width = state.currentProfile === 'kalimba17' ? 'calc(5.8% - 2px)' : 'calc(7.6% - 2px)';
    const labels = getNoteLabel(k.pitch);
    tine.innerHTML = `<div class="pointer-events-none flex flex-col items-center leading-none">
      <span class="text-[11px] font-bold text-slate-950 font-mono">${labels.top}</span>
      <span class="text-[9px] font-semibold text-slate-700 mt-0.5">${labels.bottom}</span>
    </div>`;
    wrapper.appendChild(tine);
  });
  if (window.KTFall) KTFall.layout();
  if (window.KTTuner) KTTuner.render();
}

let activeTwoHandTimeout = null;
function triggerNotePlay(el) {
  if (!el || !el.dataset.pitch) return;
  const pitch = el.dataset.pitch;
  audio.playPitch(pitch);
  el.classList.add('active'); setTimeout(() => el.classList.remove('active'), 140);
  $('active-note-display').textContent = `${pitch} (${pitchToThai(pitch)} / ${pitchToNumber(pitch)})`;

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

function attachTouch(container) {
  const getTarget = touch => { const el = document.elementFromPoint(touch.clientX, touch.clientY); return el ? el.closest('[data-pitch]') : null; };
  container.addEventListener('touchstart', e => {
    e.preventDefault(); unlockAudioUI();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i], target = getTarget(t);
      if (target) { state.activeTouches.set(t.identifier, target); triggerNotePlay(target); }
    }
  }, { passive: false });
  container.addEventListener('touchmove', e => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i], cur = getTarget(t), prev = state.activeTouches.get(t.identifier);
      if (cur && cur !== prev) { state.activeTouches.set(t.identifier, cur); triggerNotePlay(cur); }
    }
  }, { passive: false });
  const end = e => { for (let i = 0; i < e.changedTouches.length; i++) state.activeTouches.delete(e.changedTouches[i].identifier); };
  container.addEventListener('touchend', end); container.addEventListener('touchcancel', end);
  let isDown = false;
  container.addEventListener('mousedown', e => { isDown = true; const t = e.target.closest('[data-pitch]'); if (t) triggerNotePlay(t); });
  window.addEventListener('mouseup', () => isDown = false);
  container.addEventListener('mouseover', e => { if (isDown) { const t = e.target.closest('[data-pitch]'); if (t) triggerNotePlay(t); } });
}
attachTouch($('kalimba-tines-wrapper'));

function switchProfile(pid) {
  state.currentProfile = pid;
  $('tab-profile-kalimba13').className = 'h-9 rounded-full font-medium ' + (pid === 'kalimba13' ? 'seg-on' : 'seg-off');
  $('tab-profile-kalimba17').className = 'h-9 rounded-full font-medium ' + (pid === 'kalimba17' ? 'seg-on' : 'seg-off');
  try { localStorage.setItem('kt.profile', JSON.stringify(pid)); } catch (e) { /* storage blocked */ }
  renderKalimba();
}
$('tab-profile-kalimba13').onclick = () => switchProfile('kalimba13');
$('tab-profile-kalimba17').onclick = () => switchProfile('kalimba17');
$('select-label-mode').onchange = e => { state.labelMode = e.target.value; renderKalimba(); };
$('select-note-system').onchange = e => {
  state.noteSystem = e.target.value;
  try { localStorage.setItem('kt.noteSystem', JSON.stringify(state.noteSystem)); } catch (err) { /* storage blocked */ }
  renderKalimba();
  if (state.currentView === 'lesson' && state.lesson.currentTarget) showLessonTarget();
};
function setTuning13(v) {
  state.tuning13 = v;
  $('current-tuning-name').textContent = v;
  renderKalimba();
  if (window.M2) M2.onTuning();
}
$('btn-toggle-tuning-quick').onclick = () => setTuning13(state.tuning13 === 'Bb4' ? 'B4' : 'Bb4');

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

$('btn-open-settings').onclick = () => {
  const r = document.querySelector('input[name="kalimba-tuning"][value="' + state.tuning13 + '"]');
  if (r) r.checked = true;
  const l = document.querySelector('input[name="app-lang"][value="' + LANG + '"]');
  if (l) l.checked = true;
  $('modal-settings').classList.remove('hidden');
};
$('btn-close-settings').onclick = () => $('modal-settings').classList.add('hidden');
$('btn-save-settings').onclick = () => {
  const lang = document.querySelector('input[name="app-lang"]:checked');
  if (lang && lang.value !== LANG) setLang(lang.value);
  setTuning13(document.querySelector('input[name="kalimba-tuning"]:checked').value);
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
  if (state.currentView === 'add') renderLibrary();
  if (window.KTFirst && KTFirst.running) KTFirst.render();
  if (window.KTFall) KTFall.relabel();
  if (window.KTTuner) KTTuner.render();
}
$('btn-lang').onclick = () => setLang(LANG === 'th' ? 'en' : 'th');

(() => {   // saved preferences; English speakers get letter names unless they chose otherwise
  let ns = null, pf = null;
  try { ns = JSON.parse(localStorage.getItem('kt.noteSystem')); pf = JSON.parse(localStorage.getItem('kt.profile')); } catch (e) { /* none saved */ }
  state.noteSystem = ns === 'thai' || ns === 'number' || ns === 'western' ? ns : (LANG === 'th' ? 'thai' : 'western');
  $('select-note-system').value = state.noteSystem;
  if (pf === 'kalimba17') state.currentProfile = 'kalimba17';
})();
fillIcons();
applyI18n();
switchProfile(state.currentProfile);
mountKalimba('play');
document.querySelector('#nav-tab-play').setAttribute('aria-current', 'page');

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
const uid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }

const S = {
  keypad: ls.get('keypad', true),
  addSub: 'library',
  songs: [],
  review: null,      // { song, dirty, from, notes }
  parsed: null,
  get tuning() { return state.tuning13; },
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
    const T0 = c.currentTime + 0.15, bus = this.bus;
    let idx = 0;
    this.timer = setInterval(() => {
      const now = c.currentTime;
      while (idx < ev.length && T0 + ev[idx].t < now + 0.25) {
        const e = ev[idx++], at = T0 + e.t;
        if (e.k === 'n') Synth.kalimba(bus, e.midi, at, 0.85);
        else if (e.k === 'c') {
          if (e.ch.type === 'chord') {
            e.ch.midis.slice(0, 4).forEach((m, j) => Synth.kalimba(bus, m, at + j * 0.012, 0.26));
            Synth.kalimba(bus, e.ch.bassMidi, at, 0.5);
          } else if (e.ch.type === 'bass') Synth.kalimba(bus, e.ch.midi, at, 0.55);
        }
        if (opt.onEvent && (e.k === 'n' || e.k === 'm')) this.ui.push(setTimeout(() => opt.onEvent(e), Math.max(0, (at - now) * 1000)));
      }
      if (idx >= ev.length && now > T0 + endT + 0.6) this.stop();
    }, 25);
  },
  stop() {
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
  if (s) Fall.open(s);
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
    const sm = summarize(parseSong(s, state.tuning13));
    const badge = sm.range ? '<span class="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] whitespace-nowrap">⚠ นอกช่วง ' + sm.range + '</span>'
      : sm.errors ? '<span class="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] whitespace-nowrap">⚠ ' + sm.errors + ' จุด</span>'
      : '<span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] whitespace-nowrap">✓ อยู่ในช่วง</span>';
    return '<div class="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2" data-id="' + esc(s.id) + '">' +
      '<div class="flex items-start gap-2"><div class="flex-1 min-w-0"><div class="font-bold text-slate-100 text-sm truncate">' + esc(s.title || 'เพลงไม่มีชื่อ') + '</div>' +
      '<div class="text-[10px] text-slate-400">' + s.measures.length + ' ห้อง • ' + s.tempo + ' BPM • ' + s.beats + ' จังหวะ • ' + esc(fmtDate(s.updated)) + '</div></div>' + badge + '</div>' +
      '<div class="flex flex-wrap gap-1.5 text-xs">' +
      '<button data-lib="prac" class="h-9 px-4 rounded-full bg-amber-500 text-slate-950 font-semibold">' + esc(t('lib.practice')) + '</button>' +
      '<button data-lib="play" class="h-9 px-3 rounded-full border border-slate-700 text-slate-200">' + esc(t('lib.listen')) + '</button>' +
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
          measures: s.measures.map(m => ({ mel: String(m.mel || ''), lyr: String(m.lyr || ''), chd: String(m.chd || ''), br: !!m.br }))
        });
        n++;
      }
      toast('กู้คืน ' + n + ' เพลง'); loadSongs();
    } catch (err) { toast('อ่านไฟล์ไม่ได้: ' + (err && err.message || err), 3500); }
  });
}

/* ---- import (3-line text) ---- */
function setupImport() {
  const ta = byId('imp-text');
  const fill = (t, bpm) => { ta.value = t; byId('imp-title').value = ''; if (bpm) byId('imp-tempo').value = bpm; byId('imp-msg').innerHTML = ''; };
  byId('btn-preset-twinkle').addEventListener('click', () => fill(SAMPLE1, 100));
  byId('btn-preset-yours-ever').addEventListener('click', () => fill(SAMPLE_YOURS, 78));
  byId('btn-preset-over').addEventListener('click', () => fill(SAMPLE2, 90));
  byId('btn-clear').addEventListener('click', () => { ta.value = ''; byId('imp-title').value = ''; byId('imp-msg').innerHTML = ''; });
  byId('btn-paste').addEventListener('click', async () => {
    try { ta.value = await navigator.clipboard.readText(); } catch (e) { toast('อ่านคลิปบอร์ดไม่ได้ — กดค้างที่ช่องแล้ววางเอง'); }
  });
  byId('btn-import-back').addEventListener('click', () => go('library'));
  byId('btn-convert').addEventListener('click', () => {
    const r = importText(ta.value, {
      title: byId('imp-title').value.trim(),
      tempo: clamp(parseInt(byId('imp-tempo').value, 10) || 100, 30, 240),
      beats: parseInt(byId('imp-beats').value, 10) || 4,
      octaveShift: parseInt(byId('imp-shift').value, 10) || 0
    });
    byId('imp-msg').innerHTML = r.msgs.map(m => '<div class="' + (m.level === 'error' ? 'text-red-300' : 'text-amber-300') + '">' + (m.level === 'error' ? '✖ ' : '⚠ ') + esc(m.msg) + '</div>').join('');
    if (!r.song.measures.length) return;
    openReview(r.song, { from: 'import', isNew: true, notes: r.msgs });
  });
}

/* ---- review ---- */
const Strip = {
  timer: 0,
  build() {
    byId('strip').innerHTML = SORTED13.map(m => '<div class="strip-key flex-1 rounded-sm" data-m="' + m + '" style="height:' + (40 + (m - 60) * 0.6) + '%"></div>').join('');
  },
  light(midi, tok) {
    const key = S.tuning === 'Bb4' && midi === 70 ? 71 : (S.tuning === 'Bb4' && midi === 71 ? -1 : midi);
    $$('#strip .lit').forEach(x => x.classList.remove('lit'));
    const k = $('#strip [data-m="' + key + '"]'), label = byId('strip-note');
    label.textContent = tok + ' · ' + noteLabel(describe(midi, midi === 70), S.noteSystem);
    if (k) { k.classList.add('lit'); label.classList.remove('text-red-400'); label.classList.add('text-amber-300'); }
    else { label.classList.add('text-red-400'); label.classList.remove('text-amber-300'); label.textContent += ' (ไม่มีคีย์)'; }
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { $$('#strip .lit').forEach(x => x.classList.remove('lit')); }, 220);
  }
};

function openReview(song, opt) {
  song.measures = song.measures || [];
  S.review = { song, dirty: !!opt.isNew, from: opt.from || 'import', notes: opt.notes || [] };
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
  renderCards();
  setPlayButton(false);
}

function cardHTML(m, i) {
  const ph = { lyr: 'เนื้อร้อง (แยกพยางค์ด้วยช่องว่าง)', mel: "ทำนอง เช่น 1 1 5 5'", chd: 'คอร์ด / เบส เช่น C . F .' };
  const inp = (f, cls) => '<input data-f="' + f + '" value="' + esc(m[f]) + '" placeholder="' + ph[f] + '" ' + (f === 'mel' && S.keypad ? 'inputmode="none" ' : '') +
    'spellcheck="false" autocomplete="off" autocapitalize="off" autocorrect="off" class="' + cls + ' w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 placeholder-slate-600">';
  const btn = (a, t, cls) => '<button data-act="' + a + '" class="px-2 py-1 rounded-md ' + (cls || 'bg-slate-800 text-slate-300 border border-slate-700') + ' text-[11px]">' + t + '</button>';
  return '<div class="mcard bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1.5" data-i="' + i + '">' +
    '<div class="flex items-center gap-1.5"><span class="text-xs font-semibold text-amber-300">ห้อง ' + (i + 1) + (m.br && i ? ' ·ท่อนใหม่' : '') + '</span><span class="mbadge text-[10px]"></span>' +
    '<div class="ml-auto flex gap-1">' + btn('play', '▶', 'bg-amber-600 text-white') + btn('oct-dn', '8↓') + btn('oct-up', '8↑') + btn('dup', '⧉') + btn('ins', '＋') + btn('del', '🗑', 'bg-slate-800 text-rose-300 border border-slate-700') + '</div></div>' +
    '<div class="chips flex flex-wrap gap-1 min-h-[1.6rem]"></div>' +
    inp('lyr', 'text-sm') + inp('mel', 'mono text-base') + inp('chd', 'mono text-sm') +
    '<ul class="issues text-[11px] space-y-0.5"></ul></div>';
}

function renderCards() {
  const s = S.review.song;
  byId('rv-list').innerHTML = s.measures.map(cardHTML).join('');
  reparse();
  s.measures.forEach((_, i) => refreshCard(i));
  renderSummary();
}

function chipsHTML(pm) {
  const parts = pm.items.filter(it => it.type !== 'hold').map(it => {
    if (it.type === 'rest') return '<span class="chip px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 text-xs text-center">0</span>';
    if (it.type === 'bad') return '<span class="chip px-1.5 py-0.5 rounded bg-red-900/60 border border-red-500 text-red-200 text-xs text-center">' + esc(it.tok) + '?</span>';
    const d = describe(it.midi, it.midi === 70), bad = !!it.bad;
    return '<button data-midi="' + it.midi + '" class="chip px-1.5 py-0.5 rounded text-center leading-tight border ' + (bad ? 'bg-red-900/60 border-red-500 text-red-100' : 'bg-slate-800 border-slate-700 text-slate-100') + '">' +
      '<span class="text-sm font-semibold">' + esc(numeralLabel(d)) + '</span><sub class="text-[9px] text-amber-300">' + fmtDur(it.dur) + '</sub>' +
      '<span class="block text-[9px] ' + (bad ? 'text-red-200' : 'text-slate-400') + '">' + esc(noteLabel(d, S.noteSystem)) + '</span>' +
      (it.lyric ? '<span class="block text-[9px] text-sky-300">' + esc(it.lyric) + '</span>' : '') + '</button>';
  });
  pm.chords.forEach(c => {
    const label = c.type === 'chord' ? c.name : c.type === 'bass' ? 'เบส ' + c.name : '–';
    parts.push('<span class="chip px-1.5 py-0.5 rounded border text-[11px] self-center ' + (c.bad ? 'bg-red-900/60 border-red-500 text-red-200' : 'bg-sky-900/50 border-sky-700 text-sky-200') + '">♪ ' + esc(label) + '</span>');
  });
  return parts.join('') || '<span class="text-[11px] text-slate-600">ยังไม่มีโน้ต</span>';
}

function refreshCard(i) {
  const card = byId('rv-list').children[i], pm = S.parsed && S.parsed.measures[i];
  if (!card || !pm) return;
  $('.chips', card).innerHTML = chipsHTML(pm);
  $('.issues', card).innerHTML = pm.issues.map(x => '<li class="' + (x.level === 'error' ? 'text-red-300' : 'text-amber-300') + '">' + (x.level === 'error' ? '✖ ' : '⚠ ') + esc(x.msg) + '</li>').join('');
  const e = pm.issues.filter(x => x.level === 'error').length, w = pm.issues.length - e;
  $('.mbadge', card).innerHTML = e ? '<span class="px-1.5 rounded bg-red-500/20 text-red-300">✖ ' + e + '</span>' : w ? '<span class="px-1.5 rounded bg-amber-500/20 text-amber-300">⚠ ' + w + '</span>' : '<span class="px-1.5 rounded bg-emerald-500/20 text-emerald-300">✓</span>';
}

function renderSummary() {
  const s = S.review.song, sm = summarize(S.parsed), box = byId('rv-summary');
  if (!s.measures.length) {
    box.className = 'rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-xs'; box.innerHTML = 'ยังไม่มีห้อง — กด "เพิ่มห้องท้ายเพลง"'; return;
  }
  if (!sm.errors && !sm.warns) {
    box.className = 'rounded-xl border border-emerald-600/50 bg-emerald-900/20 p-2.5 text-xs text-emerald-200';
    box.innerHTML = '✅ ผ่านการตรวจ — ' + sm.notes + ' โน้ตอยู่ในช่วง 13 คีย์ (C4–A5, จูน ' + S.tuning + ') ทุกห้อง';
    return;
  }
  const bad = sm.errors > 0;
  box.className = 'rounded-xl border p-2.5 text-xs space-y-1.5 ' + (bad ? 'border-red-500/60 bg-red-900/20 text-red-100' : 'border-amber-500/50 bg-amber-900/10 text-amber-100');
  let html = '<div class="font-semibold">' + (bad ? '⚠️ ต้องแก้ ' + sm.errors + ' จุด' : '⚠️ มีข้อสังเกต ' + sm.warns + ' จุด') +
    (sm.range ? ' · โน้ตเกินช่วง/ไม่มีคีย์ ' + sm.range + ' โน้ต' : '') + ' <span class="font-normal text-slate-400">(ช่วงเครื่อง C4–A5, จูน ' + S.tuning + ')</span></div>';
  const sug = sm.range ? suggestShift(s, S.tuning) : null;
  if (sug) {
    html += '<button data-fix="shift" data-shift="' + sug.shift + '" class="px-2.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-[11px] font-bold">🪄 เลื่อนทั้งเพลงเป็น ' + (sug.shift > 0 ? '+' : '') + sug.shift + ' ออคเทฟ → เหลือเกินช่วง ' + sug.left + ' โน้ต</button>';
  }
  html += '<div class="space-y-0.5 max-h-40 overflow-y-auto">' + S.parsed.issues.slice(0, 40).map(x =>
    '<button data-goto="' + x.measure + '" class="block w-full text-left ' + (x.level === 'error' ? 'text-red-300' : 'text-amber-300') + '">ห้อง ' + (x.measure + 1) + ': ' + esc(x.msg) + '</button>').join('') + '</div>';
  box.innerHTML = html;
}

function markDirty() { S.review.dirty = true; }
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
        const c = byId('rv-list').children[e.i];
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

/* keypad for the melody field */
let kpTarget = null;
function showKeypad() { if (S.keypad && state.currentView === 'review') byId('keypad').classList.remove('hidden'); }
function hideKeypad() { byId('keypad').classList.add('hidden'); }
function applyKeypadMode() {
  $$('#rv-list input[data-f="mel"]').forEach(i => { i.inputMode = S.keypad ? 'none' : 'text'; });
  if (!S.keypad) hideKeypad();
}
function keypadPress(k) {
  if (k === 'close') { hideKeypad(); if (document.activeElement) document.activeElement.blur(); return; }
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

function setupReview() {
  Strip.build();
  const rs = () => S.review.song;
  byId('btn-review-back').addEventListener('click', () => go(S.review.from === 'library' ? 'library' : 'import'));
  byId('rv-title').addEventListener('input', e => { rs().title = e.target.value; markDirty(); });
  byId('rv-tempo').addEventListener('input', e => { rs().tempo = clamp(parseInt(e.target.value, 10) || 100, 30, 240); markDirty(); });
  byId('rv-beats').addEventListener('change', e => { rs().beats = parseInt(e.target.value, 10) || 4; markDirty(); refreshAll(); });
  const shift = d => {
    rs().octaveShift = clamp((rs().octaveShift || 0) + d, -3, 3); markDirty();
    byId('rv-shift').textContent = (rs().octaveShift > 0 ? '+' : '') + rs().octaveShift; refreshAll();
  };
  byId('rv-shift-dn').addEventListener('click', () => shift(-1));
  byId('rv-shift-up').addEventListener('click', () => shift(1));
  byId('btn-play-all').addEventListener('click', () => togglePlay(0));
  byId('rv-kp').addEventListener('change', e => { S.keypad = e.target.checked; ls.set('keypad', S.keypad); applyKeypadMode(); });
  byId('btn-add-measure').addEventListener('click', () => {
    const last = rs().measures[rs().measures.length - 1];
    rs().measures.push({ mel: '', lyr: '', chd: '', br: !last }); markDirty(); renderCards();
    const c = byId('rv-list').lastElementChild; if (c) c.scrollIntoView({ block: 'center' });
  });
  byId('btn-save').addEventListener('click', saveSong);

  byId('rv-summary').addEventListener('click', e => {
    const f = e.target.closest('[data-fix]');
    if (f) { shift(parseInt(f.dataset.shift, 10) - (rs().octaveShift || 0)); return; }
    const g = e.target.closest('[data-goto]');
    if (g) {
      const c = byId('rv-list').children[+g.dataset.goto];
      if (c) { c.scrollIntoView({ block: 'center', behavior: 'smooth' }); c.classList.add('playing'); setTimeout(() => c.classList.remove('playing'), 1200); }
    }
  });

  const list = byId('rv-list');
  list.addEventListener('input', e => {
    const inp = e.target.closest('input[data-f]');
    if (!inp) return;
    const i = +inp.closest('.mcard').dataset.i;
    rs().measures[i][inp.dataset.f] = inp.value;
    markDirty(); refreshAfterEdit(i);
  });
  list.addEventListener('focusin', e => {
    const inp = e.target.closest('input[data-f="mel"]');
    if (inp) { kpTarget = inp; showKeypad(); }
    else if (e.target.matches('input')) hideKeypad();
  });
  list.addEventListener('focusout', () => {
    setTimeout(() => { if (!document.activeElement || !document.activeElement.matches('input[data-f="mel"]')) hideKeypad(); }, 160);
  });
  list.addEventListener('click', e => {
    const chip = e.target.closest('button[data-midi]');
    if (chip) { unlockAudioUI(); if (Synth.ensure()) Synth.kalimba(Synth.master, +chip.dataset.midi, Synth.ctx.currentTime + 0.01, 0.9); return; }
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const card = b.closest('.mcard'), i = +card.dataset.i, ms = rs().measures, act = b.dataset.act;
    if (act === 'play') { if (Player.playing) Player.stop(); togglePlay(i); }
    else if (act === 'oct-dn' || act === 'oct-up') {
      const m = ms[i]; m.mel = shiftMelodyStr(m.mel, act === 'oct-up' ? 1 : -1);
      $('input[data-f="mel"]', card).value = m.mel; markDirty(); refreshAfterEdit(i);
    } else if (act === 'dup') { ms.splice(i + 1, 0, Object.assign({}, ms[i], { br: false })); markDirty(); renderCards(); }
    else if (act === 'ins') { ms.splice(i + 1, 0, { mel: '', lyr: '', chd: '', br: false }); markDirty(); renderCards(); }
    else if (act === 'del') {
      const m = ms[i];
      if ((m.mel + m.lyr + m.chd).trim() && !confirm('ลบห้อง ' + (i + 1) + ' ?')) return;
      if (m.br && ms[i + 1]) ms[i + 1].br = true;
      ms.splice(i, 1); markDirty(); renderCards();
    }
  });

  const kp = byId('keypad');
  ['mousedown', 'touchstart'].forEach(ev => kp.addEventListener(ev, e => e.preventDefault(), { passive: false }));
  kp.addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (b) keypadPress(b.dataset.k); });
}

async function saveSong() {
  const s = S.review.song;
  s.title = (s.title || '').trim() || 'เพลงไม่มีชื่อ';
  byId('rv-title').value = s.title;
  if (!s.measures.length) { toast('ยังไม่มีห้องโน้ต'); return; }
  const sm = summarize(reparse());
  if (sm.range && !confirm('ยังมีโน้ตเกินช่วง/ไม่มีคีย์บนคาลิมบา 13 คีย์ ' + sm.range + ' โน้ต\nบันทึกไว้ก่อนแล้วแก้ทีหลัง?')) return;
  if (!sm.range && sm.errors && !confirm('มีโทเค็นที่อ่านไม่ได้ ' + sm.errors + ' จุด (จะถูกข้ามตอนเล่น)\nบันทึกไว้ก่อน?')) return;
  const now = Date.now();
  const rec = {
    id: s.id || uid(), title: s.title, tempo: s.tempo, beats: s.beats, octaveShift: s.octaveShift || 0,
    created: s.created || now, updated: now,
    measures: s.measures.map(m => ({ mel: m.mel || '', lyr: m.lyr || '', chd: m.chd || '', br: !!m.br }))
  };
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

/* ---- tuning shared with M1 settings ---- */
function onTuning() {
  ls.set('tuning', state.tuning13);
  syncPracticeLibrary();
  if (state.currentView === 'review') refreshAll();
  if (state.currentView === 'add') renderLibrary();
}

function setHdr() {
  const h = document.querySelector('header');
  if (h) document.documentElement.style.setProperty('--hdr', (h.offsetHeight + 4) + 'px');
}

function initM2() {
  const saved = ls.get('tuning', null);
  if (saved === 'B4' || saved === 'Bb4') {
    state.tuning13 = saved;
    byId('current-tuning-name').textContent = saved;
    const r = document.querySelector('input[name="kalimba-tuning"][value="' + saved + '"]');
    if (r) r.checked = true;
    renderKalimba();
  }
  setupLibrary(); setupImport(); setupReview();
  applyAddSub(); setHdr();
  window.addEventListener('resize', setHdr);
  window.addEventListener('orientationchange', setHdr);
  window.M2 = { renderLibrary, leaveReview, onTuning };
  loadSongs();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
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
  if (!freeCache || freeCache.tuning !== state.tuning13) {
    freeCache = { tuning: state.tuning13, list: FREE_SONGS.map(f => Object.assign(freeSong(f, state.tuning13), { meta: f })) };
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
    '<button data-lib="fplay" aria-label="' + esc(t('lib.listen')) + '" class="w-9 h-9 rounded-full border border-slate-700 text-slate-200 flex items-center justify-center">' + icon('player-play', 'w-4 h-4') + '</button>' +
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
    if (rp.shift) notes.push({ level: 'info', msg: 'ย้ายคีย์ ' + (rp.shift > 0 ? '+' : '') + rp.shift + ' ครึ่งเสียง ให้ลงคาลิมบา 13 คีย์' });
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
    const song = JSON.parse(JSON.stringify(x.song));
    delete song.id;                      // saving it makes the user's own copy
    openReview(song, { from: 'library', autoplay: true, notes: [{ level: 'info', msg: 'เพลงฟรี: ' + x.meta.origin + ' · กด 💾 บันทึก ถ้าอยากแก้หรือเก็บเป็นเพลงของฉัน' }] });
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
    micUI();
  },
  stop() {
    if (!this.on) return;
    clearInterval(this.timer);
    [this.src].concat(this.nodes).forEach(n => { try { n.disconnect(); } catch (e) { /* already gone */ } });
    if (this.stream) this.stream.getTracks().forEach(tr => tr.stop());
    this.on = false; window.KTMicOn = false; this.stream = null;
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
    byId('active-note-display').textContent = pitch + ' (' + noteName(pitch) + ' / ' + pitchToNumber(pitch) + ')';
    Tuner.pluck(ev);
    judgePitch(pitch, ev.t - MIC_LAG);
  }
};

// "Real kalimba" is one setting shared by the player and the lessons; the tuner has its own switch
const Real = { on: ls.get('real', false) };
function micWanted() {
  const v = state.currentView;
  return !document.hidden && ((v === 'tuner' && Tuner.on) || ((v === 'player' || v === 'lesson') && Real.on));
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
    byId('tu-kind').textContent = (state.currentProfile === 'kalimba17' ? '17' : '13') + ' · ' + (state.currentProfile === 'kalimba17' ? 'C' : state.tuning13);
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
      needle.style.transform = 'rotate(0deg)'; needle.setAttribute('stroke', '#566176');
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
    needle.setAttribute('stroke', inTune ? '#7FC8A0' : '#E58B7A');
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
const HAND_COLOR = { L: '#7FA3D6', R: '#E39A86', C: '#C9A46A' };
const Fall = {
  src: null, events: [], skipped: 0, tempo: 80, beats: 4, totalBeats: 0, minGap: 1,
  mode: ls.get('fall.mode', 'wait'), speed: ls.get('fall.speed', 1), loop: false,
  pos: 0, startAt: 0, running: false, demo: false, done: false, raf: 0, last: 0, next: 0, clickBeat: null,
  stats: null, lanes: {}, cv: null, g: null, W: 0, H: 0, flashes: [], t0: 0, guided: null, lyricM: -1,

  get spb() { return 60 / (this.tempo * this.speed); },

  // src: { id, title, song } with a 3-line song, or { id, title, bpm, notes } with one pitch per beat
  open(src) {
    this.halt();
    this.src = src;
    const ev = [];
    if (src.song) {
      const p = parseSong(src.song, state.tuning13);
      this.tempo = src.song.tempo || 80; this.beats = src.song.beats || 4; this.totalBeats = p.totalBeats;
      p.measures.forEach(pm => pm.notes.forEach(n => ev.push({ beat: pm.start + n.beat, midi: n.midi, lyric: n.lyric || '', m: pm.index })));
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
    this.events = (this.all || []).filter(e => keys.has(e.pitch));
    this.skipped = (this.all || []).length - this.events.length;
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
    $$('[data-plmode]').forEach(b => { b.className = 'h-8 px-3 rounded-full ' + (b.dataset.plmode === this.mode ? 'seg-on' : 'seg-off'); });
    byId('pl-speed').textContent = Math.round(this.speed * 100) + '%';
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
    this.last = audio.ctx ? audio.ctx.currentTime : performance.now() / 1000;
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
    const c = audio.ctx, now = c ? c.currentTime : performance.now() / 1000;
    const dt = Math.min(0.1, Math.max(0, now - this.last));
    this.last = now;
    if (this.running) this.advance(dt / this.spb, now);
    this.flashes = this.flashes.filter(f => now - f.t < 0.35);
    this.draw(now); this.guide(); this.progress();
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
        if (Synth.ensure()) Synth.kalimba(Synth.master, e.midi, now, 0.85);
        this.flash(e, '#C9A46A', now);
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
    const p = this.pos - ago / this.spb, now = c ? c.currentTime : 0;
    if (this.mode === 'wait') {
      const e0 = this.events[this.next];
      if (!e0 || p < e0.beat - 0.75) return;   // too early to count
      const hit = this.events.find((e, i) => i >= this.next && !e.res && Math.abs(e.beat - e0.beat) < 0.01 && e.pitch === pitch);
      if (hit) {
        hit.res = 'hit'; this.stats.hit++; this.flash(hit, '#7FC8A0', now);
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
      this.flash(best, perfect ? '#7FC8A0' : '#C9A46A', now);
      this.next = this.firstOpenFrom(this.next);
    } else this.wrong(pitch, now);
    this.score();
  },
  firstOpenFrom(i) { while (i < this.events.length && this.events[i].res) i++; return i; },
  wrong(pitch, now) {
    this.stats.wrong++;
    const ln = this.lanes[pitch];
    if (ln) {
      this.flashes.push({ x: ln.x, w: ln.w, t: now, color: '#D9705E' });
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
    now = now != null ? now : (audio.ctx ? audio.ctx.currentTime : 0);
    g.clearRect(0, 0, W, H);
    // lanes
    Object.values(this.lanes).forEach((ln, i) => { g.fillStyle = i % 2 ? '#131B2A' : '#111827'; g.fillRect(ln.x - ln.w / 2, 0, ln.w, H); });
    // beats and measures
    for (let b = Math.ceil(this.pos); ; b++) {
      const y = hitY - (b - this.pos) * pxb;
      if (y < 0) break;
      g.fillStyle = b % this.beats === 0 ? '#2A3550' : '#1B2438';
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
      g.fillStyle = e.res === 'miss' ? '#34405A' : HAND_COLOR[ln.hand] || HAND_COLOR.C;
      this.round(x, y - h, w, h, Math.min(7, h / 2));
      g.fill();
      if (i === this.next && !this.demo) { g.lineWidth = 2; g.strokeStyle = '#F2EDE3'; g.stroke(); }
      if (w >= 14) { g.fillStyle = e.res === 'miss' ? '#A3ACBC' : '#0F1522'; g.fillText(pitchToNumber(e.pitch), ln.x, y - h / 2 + 0.5); }
    }
    // hit line and flashes
    g.fillStyle = '#C9A46A'; g.fillRect(0, hitY, W, 2);
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

  setMode(m) { this.mode = m; ls.set('fall.mode', m); if (!this.running) this.reset(this.startAt); else { this.controls(); this.score(); } },
  setSpeed(d) {
    this.speed = Math.round(clamp(this.speed + d, 0.3, 1.5) * 100) / 100;
    ls.set('fall.speed', this.speed);
    this.meta(); this.controls(); this.progress();
  }
};

function initPlayer() {
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
  byId('pl-mic').onclick = () => { Real.on = !Real.on; ls.set('real', Real.on); micSync(); };
  byId('pl-progress').onclick = e => { const r = e.currentTarget.getBoundingClientRect(); Fall.seek((e.clientX - r.left) / r.width); };
  byId('tu-toggle').onclick = () => Tuner.toggle();
  byId('tu-tines').addEventListener('click', e => { const b = e.target.closest('[data-tu]'); if (b) audio.playPitch(b.dataset.tu); });
  window.addEventListener('resize', () => Fall.layout());
  document.addEventListener('visibilitychange', () => { if (document.hidden) { Fall.pause(); Mic.stop(); } else micSync(); });
  window.KTFall = Fall; window.KTMic = Mic; window.KTTuner = Tuner; window.KTMicSync = micSync;
  Fall.controls(); Fall.message(); Tuner.render(); micUI();
}

initM2();
initGrowth();
initMidi();
initPlayer();

})();
