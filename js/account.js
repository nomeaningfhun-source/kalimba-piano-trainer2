/* Membership: Google sign-in + membership kept on the server (functions/ + D1).
   - The session lives in localStorage kt.acct { token, user, member:{active,until,plan}, admin, checkedAt }.
   - isMember() is true while the last server answer said active and was fetched less than GRACE ago, so a member who is offline
     (the app is a PWA) keeps the benefits for a week; an expired or revoked membership is dropped as soon as a refresh gets through.
   - Everything the app unlocks (MIDI import, kalimba looks) asks Account.isMember(); the old device member code still works next to it.
   - The Google sign-in script is loaded only when the account card is opened, so the app starts and works offline without it. */
const Account = (() => {
  const KEY = 'kt.acct', GRACE = 7 * 86400000, DAY = 86400000, TRIAL_KEY = 'kt.trial', TRIAL_DAYS = 7;
  const T = (th, en) => (typeof LANG !== 'undefined' && LANG === 'en' ? en : th);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let st = read(), cfg = null, gis = null, wasMember = null, busy = '', adminList = null, adminMsg = '', waitlist = null;

  function read() { try { const v = JSON.parse(localStorage.getItem(KEY)); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* storage blocked */ } }

  function isMember() {
    const m = st.member;
    if (!st.token || !m || !m.active) return false;
    if (m.until != null && m.until <= Date.now()) return false;
    return Date.now() - (st.checkedAt || 0) < GRACE;
  }
  // Everyone gets TRIAL_DAYS of the member features from the first time this device opens the app (kept on the device, no sign-in needed).
  // After that the free limits apply again: no song imports, the basic kalimba look. Imported songs stay on the device, locked.
  function trialStart() {
    try {
      let t = Number(localStorage.getItem(TRIAL_KEY));
      if (!t || t > Date.now() + DAY) { t = Date.now(); localStorage.setItem(TRIAL_KEY, String(t)); }   // first run (or a date from the future): start now
      return t;
    } catch (e) { return Date.now(); }   // storage blocked: treat as just started so a private window is not locked out
  }
  const trialMs = () => trialStart() + TRIAL_DAYS * DAY - Date.now();
  const trialActive = () => trialMs() > 0;
  const trialDays = () => Math.max(0, Math.ceil(trialMs() / DAY));
  function deviceCode() { try { return JSON.parse(localStorage.getItem('kt.member')) === true; } catch (e) { return false; } }
  // paid or granted membership (server), or the older device code, or the free trial: what the app unlocks asks this
  const hasAccess = () => isMember() || deviceCode() || trialActive();
  const isPaid = () => isMember() || deviceCode();
  trialStart();
  function changed() {
    const now = isMember();
    if (wasMember !== null && now !== wasMember) window.dispatchEvent(new Event('kt-member'));
    wasMember = now;
    render();
  }
  function fmtDate(ms) { return new Date(ms).toLocaleDateString(T('th-TH', 'en-GB'), { day: 'numeric', month: 'short', year: 'numeric' }); }

  async function api(path, opt) {
    opt = opt || {};
    const headers = { 'content-type': 'application/json' };
    if (st.token) headers.authorization = 'Bearer ' + st.token;
    const res = await fetch(path, { method: opt.method || 'GET', headers, body: opt.body ? JSON.stringify(opt.body) : undefined, cache: 'no-store' });
    let data = null;
    try { data = await res.json(); } catch (e) { /* not json */ }
    return { status: res.status, data };
  }
  async function config() {
    if (cfg) return cfg;
    try { const r = await api('/api/config'); cfg = r.status === 200 && r.data ? r.data : { enabled: false }; } catch (e) { cfg = { enabled: false, offline: true }; setTimeout(() => { cfg = null; }, 15000); }
    return cfg;
  }

  // ask the server again; offline keeps what we have, a rejected token signs out
  async function refresh() {
    if (!st.token) return;
    let r;
    try { r = await api('/api/me'); } catch (e) { return; }
    if (r.status === 401) { st = {}; save(); changed(); return; }
    if (r.status === 200 && r.data) {
      st = Object.assign({}, st, { user: r.data.user, member: r.data.member, admin: r.data.admin, checkedAt: Date.now() });
      save(); changed();
    }
  }

  function loadGis() {
    if (gis) return gis;
    gis = new Promise((resolve, reject) => {
      if (window.google && google.accounts && google.accounts.id) return resolve();
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = () => resolve(); s.onerror = () => { gis = null; reject(new Error('gis')); };
      document.head.appendChild(s);
    });
    return gis;
  }
  const standalone = () => !!(navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches));

  async function onCredential(resp) {
    busy = 'login'; render();
    try {
      const r = await api('/api/auth/google', { method: 'POST', body: { credential: resp.credential } });
      if (r.status === 200 && r.data && r.data.token) {
        st = { token: r.data.token, user: r.data.user, member: r.data.member, admin: r.data.admin, checkedAt: Date.now() };
        save(); busy = ''; changed();
        if (window.toast) toast(isMember() ? T('เข้าสู่ระบบแล้ว · เป็นสมาชิก ✓', 'Signed in · you are a member ✓') : T('เข้าสู่ระบบแล้ว', 'Signed in'), 3000);
        return;
      }
      if (window.toast) toast(T('เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง', 'Sign-in failed, please try again'), 3500);
    } catch (e) {
      if (window.toast) toast(T('เข้าสู่ระบบไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่', 'Cannot sign in. Check your connection.'), 3500);
    }
    busy = ''; render();
  }

  async function mountButton() {
    const holder = document.getElementById('acct-gbtn');
    if (!holder || holder.dataset.ready === LANGKEY()) return;
    const c = await config();
    if (!c.enabled || !c.googleClientId) return;
    try { await loadGis(); } catch (e) { holder.textContent = T('โหลดปุ่ม Google ไม่ได้ ตรวจอินเทอร์เน็ต', 'Could not load the Google button. Check your connection.'); return; }
    const opt = { client_id: c.googleClientId, callback: onCredential, auto_select: false, cancel_on_tap_outside: true };
    // an installed iPhone app cannot take the popup's answer, so there Google sends the user to our own address and back
    if (standalone()) { opt.ux_mode = 'redirect'; opt.login_uri = location.origin + '/api/auth/google-redirect'; }
    google.accounts.id.initialize(opt);
    holder.innerHTML = '';
    google.accounts.id.renderButton(holder, { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', width: 260, locale: LANGKEY() });
    holder.dataset.ready = LANGKEY();
  }
  const LANGKEY = () => (typeof LANG !== 'undefined' && LANG === 'en' ? 'en' : 'th');

  async function signOut() {
    try { if (st.token) await api('/api/auth/logout', { method: 'POST' }); } catch (e) { /* offline: the server session just expires */ }
    try { if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (e) { /* none */ }
    st = {}; save(); adminList = null; changed();
  }

  /* ---------- admin: give or take away membership by email ---------- */
  async function loadAdmin() {
    const r = await api('/api/admin/members');
    adminList = r.status === 200 && r.data ? r.data.members : [];
    render();
  }
  async function grant(email, body) {
    adminMsg = '';
    const r = await api('/api/admin/members', { method: 'POST', body: Object.assign({ email }, body) });
    if (r.status === 200) adminMsg = body.revoke ? T('ถอนสิทธิ์แล้ว', 'Removed') : T('ให้สิทธิ์แล้ว', 'Granted');
    else adminMsg = T('ไม่สำเร็จ: ', 'Failed: ') + ((r.data && r.data.error) || r.status);
    await loadAdmin();
    if (email === (st.user && st.user.email)) refresh();
  }

  /* ---------- the card in Settings ---------- */
  const btn = (a, label, cls) => '<button type="button" data-a="' + a + '" class="' + (cls || 'px-3 py-1.5 rounded-lg bg-slate-700 text-slate-100') + '">' + label + '</button>';
  function render() {
    const box = document.getElementById('acct-card');
    if (!box) return;
    const c = cfg, lines = [];
    lines.push('<div class="font-medium text-slate-200">' + T('บัญชีสมาชิก', 'Member account') + '</div>');
    if (!c) {
      lines.push('<div class="text-[11px] text-slate-400">' + T('กำลังตรวจระบบสมาชิก…', 'Checking membership…') + '</div>');
    } else if (!c.enabled) {
      lines.push('<div class="text-[11px] text-slate-400">' + (c.offline ? T('ต้องต่ออินเทอร์เน็ตเพื่อเข้าสู่ระบบ', 'Connect to the internet to sign in') : T('ระบบสมาชิกยังไม่เปิดใช้งาน', 'Membership is not open yet')) + '</div>');
    } else if (!st.token) {
      lines.push('<div class="text-[11px] text-slate-400">' + T('เข้าสู่ระบบด้วยบัญชี Google เพื่อใช้สิทธิ์สมาชิกบนทุกเครื่อง (นำเข้าเพลงไม่จำกัด หน้าตาคาลิมบาพรีเมียม)', 'Sign in with Google to use your membership on every device (unlimited imports, premium kalimba looks).') + '</div>');
      lines.push('<div id="acct-gbtn" class="min-h-[44px] flex items-center">' + (busy === 'login' ? T('กำลังเข้าสู่ระบบ…', 'Signing in…') : '') + '</div>');
    } else {
      const m = st.member || {}, mem = isMember();
      if (!mem && trialActive()) lines.push('<div class="text-[12px] text-amber-200">🎁 ' + T('ทดลองใช้ฟรี เหลือ ' + trialDays() + ' วัน', 'Free trial: ' + trialDays() + ' days left') + '</div>');
      lines.push('<div class="text-[12px] text-slate-200 break-all">' + esc(st.user && st.user.email) + '</div>');
      if (mem) {
        lines.push('<div class="text-[12px] text-emerald-300">⭐ ' + T('สมาชิก', 'Member') + ' · ' + (m.until == null ? T('ตลอดชีพ', 'lifetime') : T('ถึง ', 'until ') + fmtDate(m.until)) + '</div>');
      } else {
        lines.push('<div class="text-[12px] text-slate-300">' + (m.active ? T('ต้องเชื่อมต่ออินเทอร์เน็ตเพื่อยืนยันสมาชิกอีกครั้ง', 'Connect to the internet to confirm your membership again')
          : (m.plan || m.until ? T('สมาชิกหมดอายุแล้ว', 'Your membership has ended') : T('ยังไม่ได้เป็นสมาชิก', 'Not a member yet'))) + '</div>');
        if (!m.active && waitlist) lines.push('<div>' + btn('waitlist', '⭐ ' + T('ลงชื่อรอรุ่นสมาชิก', 'Join the member waitlist'), 'px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold') + '</div>');
      }
      lines.push('<div class="flex gap-2">' + btn('refresh', T('รีเฟรชสถานะ', 'Refresh')) + btn('logout', T('ออกจากระบบ', 'Sign out')) + '</div>');
      if (st.admin) lines.push(adminHtml());
    }
    box.innerHTML = lines.join('');
    if (c && c.enabled && !st.token) mountButton();
    if (st.admin && adminList === null) loadAdmin();
  }
  function adminHtml() {
    const rows = (adminList || []).map(r =>
      '<div class="flex items-center gap-2 text-[11px] bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">' +
      '<span class="flex-1 min-w-0 truncate" title="' + esc(r.note || '') + '">' + esc(r.email) + '</span>' +
      '<span class="text-slate-400 shrink-0">' + (r.until == null ? '∞' : (r.until > Date.now() ? fmtDate(r.until) : T('หมดอายุ', 'ended'))) + '</span>' +
      '<button type="button" data-a="fill" data-email="' + esc(r.email) + '" class="text-amber-300">' + T('เลือก', 'pick') + '</button></div>').join('');
    return '<details class="rounded-lg border border-slate-700 p-2"><summary class="text-[12px] text-amber-200 cursor-pointer">🛠 ' + T('ผู้ดูแล: ให้สิทธิ์สมาชิก', 'Admin: grant membership') + '</summary>' +
      '<div class="space-y-2 pt-2"><input id="acct-email" type="email" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="email@gmail.com" ' +
      'class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100">' +
      '<div class="grid grid-cols-4 gap-1.5 text-[11px]">' + ['30:30 ' + T('วัน', 'days'), '90:90 ' + T('วัน', 'days'), '365:1 ' + T('ปี', 'yr'), 'life:' + T('ตลอดชีพ', 'Lifetime')]
        .map(x => { const i = x.indexOf(':'); return '<button type="button" data-a="grant" data-d="' + x.slice(0, i) + '" class="h-9 rounded-lg bg-slate-700 text-slate-100">' + x.slice(i + 1) + '</button>'; }).join('') + '</div>' +
      '<div>' + btn('revoke', T('ถอนสิทธิ์', 'Remove'), 'px-3 py-1.5 rounded-lg border border-red-400/60 text-red-300 text-[11px]') + ' <span class="text-[11px] text-sky-300">' + esc(adminMsg) + '</span></div>' +
      '<div class="space-y-1">' + (rows || '<div class="text-[11px] text-slate-400">' + T('ยังไม่มีสมาชิก', 'No members yet') + '</div>') + '</div></div></details>';
  }

  function wire() {
    const box = document.getElementById('acct-card');
    if (!box) return;
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-a]');
      if (!b) return;
      const a = b.dataset.a, email = () => ((document.getElementById('acct-email') || {}).value || '').trim();
      if (a === 'logout') signOut();
      else if (a === 'refresh') refresh().then(() => { if (window.toast) toast(T('อัปเดตแล้ว', 'Updated'), 1500); });
      else if (a === 'waitlist' && waitlist) waitlist();
      else if (a === 'fill') { const f = document.getElementById('acct-email'); if (f) f.value = b.dataset.email; }
      else if (a === 'grant') grant(email(), b.dataset.d === 'life' ? { lifetime: true, plan: 'lifetime' } : { days: +b.dataset.d, plan: 'manual' });
      else if (a === 'revoke') { if (email() && confirm(T('ถอนสิทธิ์สมาชิกของ ', 'Remove membership of ') + email() + '?')) grant(email(), { revoke: true }); }
    });
    // opening Settings is when the account card matters: show it, fetch config, and re-check the membership
    const open = document.getElementById('btn-open-settings');
    if (open) open.addEventListener('click', () => { config().then(() => render()); refresh(); });
  }

  function init(opts) {
    waitlist = (opts && opts.waitlist) || null;
    wasMember = isMember();
    wire(); render();
    config().then(render);
    refresh();
    document.addEventListener('visibilitychange', () => { if (!document.hidden && st.token) refresh(); });
    window.addEventListener('online', () => { if (st.token) refresh(); });
  }

  return { init, isMember, isPaid, hasAccess, trialActive, trialDays, refresh, render, signOut, get user() { return st.user || null; }, get state() { return st; } };
})();
window.Account = Account;
