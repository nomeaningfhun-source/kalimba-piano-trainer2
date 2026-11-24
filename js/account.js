/* Membership: Google sign-in + membership kept on the server (functions/ + D1).
   - The session lives in localStorage kt.acct { token, user, member:{active,until,plan}, admin, checkedAt }.
   - isMember() is true while the last server answer said active and was fetched less than GRACE ago, so a member who is offline
     (the app is a PWA) keeps the benefits for a week; an expired or revoked membership is dropped as soon as a refresh gets through.
   - Everything the app unlocks (MIDI import, kalimba looks) asks Account.isPaid(): membership belongs to the Google account (Gmail), there is no code.
   - The Google sign-in script is loaded only when the account card is opened, so the app starts and works offline without it. */
const Account = (() => {
  const KEY = 'kt.acct', GRACE = 7 * 86400000, DAY = 86400000;
  const T = (th, en) => (typeof LANG !== 'undefined' && LANG === 'en' ? en : th);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let st = read(), cfg = null, gis = null, wasMember = null, busy = '', adminList = null, adminMsg = '', waitlist = null, stats = null, fbList = null;

  function read() { try { const v = JSON.parse(localStorage.getItem(KEY)); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* storage blocked */ } }

  function isMember() {
    const m = st.member;
    if (!st.token || !m || !m.active) return false;
    if (m.until != null && m.until <= Date.now()) return false;
    return Date.now() - (st.checkedAt || 0) < GRACE;
  }
  // The 7-day free trial now comes with the first subscription (card first, see functions/api/billing/checkout.js), not from the device.
  // what the app unlocks asks this: a membership of the signed-in Google account (paid, in its free trial, or granted by us)
  const isPaid = () => isMember();
  const hasAccess = isPaid;
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
    st = {}; save(); adminList = null; stats = null; fbList = null; changed();
  }

  /* ---------- admin: give or take away membership by email ---------- */
  async function loadAdmin() {
    const r = await api('/api/admin/members');
    adminList = r.status === 200 && r.data ? r.data.members : [];
    render();
  }
  // admin: usage numbers and the feedback inbox
  async function loadStats() {
    const [a, b] = await Promise.all([api('/api/admin/stats'), api('/api/admin/feedback')]);
    stats = a.status === 200 && a.data ? a.data : { error: a.status };
    fbList = b.status === 200 && b.data ? b.data.feedback : [];
    render();
  }
  async function fbAction(body) {
    await api('/api/admin/feedback', { method: 'POST', body });
    await loadStats();
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
  // the bar under the app header: for anyone who is not a member yet, the way in to the free trial / subscription
  function updateBar() {
    const bar = document.getElementById('member-bar'), txt = document.getElementById('member-bar-text');
    const fab = document.getElementById('member-fab'), ftxt = document.getElementById('member-fab-text');   // the same entry on the full-screen Play page, where the header is hidden
    if (!bar || !txt) return;
    const c = cfg, off = isPaid() || !(c && c.enabled), noTrial = st.member && st.member.trialEligible === false;
    bar.classList.toggle('hidden', off);
    txt.textContent = c && c.beta ? T('ช่วงเบต้า ใช้ฟรี · สมาชิกเปิดเร็วๆ นี้', 'Free beta · membership opens soon')
      : !c || !c.billing ? T('สมาชิก · ดูรายละเอียด', 'Membership · details')
      : noTrial ? T('สมัครสมาชิก ฿49/เดือน', 'Become a member · ฿49/month')
      : T('ทดลองฟรี 7 วัน · สมัครสมาชิก', 'Free 7-day trial · become a member');
    if (fab && ftxt) { fab.classList.toggle('hidden', off); ftxt.textContent = c && c.beta ? T('เบต้า', 'Beta') : !c || !c.billing ? T('สมาชิก', 'Membership') : noTrial ? T('สมัครสมาชิก', 'Become a member') : T('ทดลองฟรี 7 วัน', 'Free 7-day trial'); }
  }
  function render() {
    updateBar();
    // beta (sign-ups not open): a notice in the membership window, and the free-trial section is hidden because there is no trial to start yet
    const beta = !!(cfg && cfg.beta), bn = document.getElementById('mem-beta'), tr = document.getElementById('mi-trial');
    if (bn) bn.classList.toggle('hidden', !beta);
    if (tr) tr.classList.toggle('hidden', beta);
    const box = document.getElementById('acct-card');
    if (!box) return;
    const c = cfg, lines = [];
    lines.push('<div class="font-medium text-slate-200">' + T('บัญชีสมาชิก', 'Member account') + '</div>');
    if (!c) {
      lines.push('<div class="text-[11px] text-slate-400">' + T('กำลังตรวจระบบสมาชิก…', 'Checking membership…') + '</div>');
    } else if (!c.enabled) {
      lines.push('<div class="text-[11px] text-slate-400">' + (c.offline ? T('ต้องต่ออินเทอร์เน็ตเพื่อเข้าสู่ระบบ', 'Connect to the internet to sign in') : T('ระบบสมาชิกยังไม่เปิดใช้งาน', 'Membership is not open yet')) + '</div>');
    } else if (!st.token) {
      lines.push('<div class="text-[11px] text-slate-400">' + T('เข้าสู่ระบบด้วยบัญชี Google เพื่อใช้สิทธิ์สมาชิกบนทุกเครื่อง (เพิ่มเพลงเองได้ไม่จำกัด เลือกหน้าตาคาลิมบาได้ทุกแบบ)', 'Sign in with Google to use your membership on every device (add your own songs without limit, every kalimba look).') + '</div>');
      lines.push('<div id="acct-gbtn" class="min-h-[44px] flex items-center">' + (busy === 'login' ? T('กำลังเข้าสู่ระบบ…', 'Signing in…') : '') + '</div>');
    } else {
      const m = st.member || {}, mem = isMember();
      lines.push('<div class="text-[12px] text-slate-200 break-all">' + esc(st.user && st.user.email) + '</div>');
      if (mem) {
        lines.push('<div class="text-[12px] text-emerald-300">⭐ ' + T('สมาชิก', 'Member') + ' · ' + (m.until == null ? T('ตลอดชีพ', 'lifetime') : T('ถึง ', 'until ') + fmtDate(m.until)) + '</div>');
        if (m.cancelAtPeriodEnd) lines.push('<div class="text-[11px] text-amber-200">' + T('ยกเลิกต่ออายุแล้ว ใช้สิทธิ์ได้จนสิ้นรอบที่ชำระ', 'Renewal cancelled. You keep access until the end of the period you paid for.') + '</div>');
        if (m.managed && cfg && cfg.billing) lines.push('<div>' + btn('portal', '💳 ' + T('จัดการการชำระเงิน / ยกเลิก', 'Manage billing / cancel'), 'px-3 py-1.5 rounded-lg bg-slate-700 text-slate-100') + '</div>');
      } else {
        lines.push('<div class="text-[12px] text-slate-300">' + (m.active ? T('ต้องเชื่อมต่ออินเทอร์เน็ตเพื่อยืนยันสมาชิกอีกครั้ง', 'Connect to the internet to confirm your membership again')
          : (m.plan || m.until ? T('สมาชิกหมดอายุแล้ว', 'Your membership has ended') : T('ยังไม่ได้เป็นสมาชิก', 'Not a member yet'))) + '</div>');
        if (!mem && cfg && cfg.billing) {
          const trial = m.trialEligible !== false;   // a first subscription gets 7 free days (card first); someone who has had one pays from the start
          lines.push('<div class="grid grid-cols-2 gap-2">' +
            '<button type="button" data-a="checkout" data-plan="monthly" class="rounded-xl bg-amber-500 text-slate-950 font-bold py-2 leading-tight"' + (busy ? ' disabled' : '') + '>' + (trial ? T('ทดลองฟรี 7 วัน', 'Free 7-day trial') : T('สมัครรายเดือน', 'Monthly')) + '<br><span class="text-[13px]">' + (trial ? T('แล้ว ', 'then ') : '') + '฿49 / ' + T('เดือน', 'month') + '</span></button>' +
            '<button type="button" data-a="checkout" data-plan="yearly" class="rounded-xl bg-emerald-500 text-slate-950 font-bold py-2 leading-tight"' + (busy ? ' disabled' : '') + '>' + (trial ? T('ทดลองฟรี 7 วัน', 'Free 7-day trial') : T('สมัครรายปี', 'Yearly')) + '<br><span class="text-[13px]">' + (trial ? T('แล้ว ', 'then ') : '') + '฿539 / ' + T('ปี · ฟรี 1 เดือน', 'year · 1 month free') + '</span></button></div>');
          lines.push('<div class="text-[11px] text-slate-400">' + (busy === 'pay' ? T('กำลังเปิดหน้าชำระเงิน…', 'Opening the payment page…')
            : trial ? T('ใส่บัตรไว้ก่อน แต่ยังไม่เก็บเงินใน 7 วันแรก · ยกเลิกก่อนครบ 7 วันไม่เสียเงิน · หลังจากนั้นต่ออายุให้เอง · จ่ายด้วยบัตรเครดิตหรือเดบิต', 'Add a card first, but nothing is charged for 7 days · cancel before day 7 and you pay nothing · then it renews on its own · pay by credit or debit card')
            : T('ชำระผ่าน Stripe (บัตร) · ต่ออายุอัตโนมัติ ยกเลิกได้ทุกเมื่อ', 'Paid through Stripe (card) · renews automatically, cancel any time')) + '</div>');
          if (m.managed) lines.push('<div>' + btn('portal', '💳 ' + T('จัดการการชำระเงิน', 'Manage billing')) + '</div>');
        } else if (!m.active && waitlist) lines.push('<div>' + btn('waitlist', '⭐ ' + T('ลงชื่อรอรุ่นสมาชิก', 'Join the member waitlist'), 'px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold') + '</div>');
      }
      lines.push('<div class="flex gap-2">' + btn('refresh', T('รีเฟรชสถานะ', 'Refresh')) + btn('logout', T('ออกจากระบบ', 'Sign out')) + '</div>');
      if (st.admin) lines.push(adminHtml());
    }
    box.innerHTML = lines.join('');
    if (c && c.enabled && !st.token) mountButton();
    if (st.admin && adminList === null) loadAdmin();
    if (st.admin && stats === null) { stats = {}; loadStats(); }
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
      '<div class="space-y-1">' + (rows || '<div class="text-[11px] text-slate-400">' + T('ยังไม่มีสมาชิก', 'No members yet') + '</div>') + '</div></div></details>' +
      statsHtml() + feedbackHtml();
  }
  function statsHtml() {
    const s = stats || {};
    const head = '<details class="rounded-lg border border-slate-700 p-2"' + (s.days ? ' open' : '') + '><summary class="text-[12px] text-amber-200 cursor-pointer">📊 ' + T('สถิติการใช้งาน', 'Usage stats') + '</summary><div class="space-y-3 pt-2 text-[11px] text-slate-300">';
    if (!s.days) return head + '<div>' + (s.error ? T('โหลดไม่ได้ ', 'Could not load ') + esc(s.error) : T('กำลังโหลด…', 'Loading…')) + '</div></div></details>';
    const today = s.days[s.days.length - 1], week = s.days.slice(-7).reduce((a, d) => a + d.devices, 0), max = Math.max(1, ...s.days.map(d => d.devices));
    const tile = (n, label) => '<div class="rounded-lg bg-slate-900 border border-slate-700 p-2 text-center"><div class="text-lg font-bold text-slate-100">' + n + '</div><div class="text-[10px] text-slate-400 leading-tight">' + label + '</div></div>';
    const paying = (s.billing || []).filter(b => ['active', 'trialing', 'past_due'].includes(b.status)).reduce((a, b) => a + b.n, 0);
    const trial = (s.billing || []).filter(b => b.status === 'trialing').reduce((a, b) => a + b.n, 0);
    const bars = s.days.map(d => {
      const h = Math.round(d.devices / max * 56), hn = Math.round(d.fresh / max * 56);
      return '<div class="flex-1 flex flex-col items-center gap-0.5" title="' + esc(d.day) + ': ' + d.devices + ' (' + T('ใหม่ ', 'new ') + d.fresh + ')">' +
        '<div class="text-[9px] text-slate-400 h-3">' + (d.devices || '') + '</div>' +
        '<div class="w-full flex flex-col justify-end" style="height:56px"><div class="w-full rounded-t bg-slate-500 relative" style="height:' + h + 'px"><div class="absolute bottom-0 inset-x-0 bg-amber-500 rounded-t" style="height:' + hn + 'px"></div></div></div>' +
        '<div class="text-[9px] text-slate-500">' + esc(d.day.slice(8)) + '</div></div>';
    }).join('');
    const list = (rows, names) => (rows && rows.length ? rows.map(r => '<div class="flex justify-between gap-2"><span class="truncate">' + esc(names[r.k] || r.k) + '</span><span class="text-slate-100 font-semibold">' + r.n + '</span></div>').join('') : '<div class="text-slate-500">—</div>');
    const srcNames = { direct: T('พิมพ์ลิงก์เอง / แอปที่ติดตั้ง', 'Typed link / installed app'), facebook: 'Facebook', instagram: 'Instagram', line: 'LINE', google: 'Google', youtube: 'YouTube', tiktok: 'TikTok' };
    const devNames = { mobile: T('มือถือ', 'Phone'), tablet: T('แท็บเล็ต', 'Tablet'), desktop: T('คอม', 'Computer'), other: T('อื่นๆ', 'Other'), installed: T('เปิดจากแอปที่ติดตั้ง', 'Installed app'), browser: T('เปิดในเบราว์เซอร์', 'In a browser') };
    return head +
      '<div class="grid grid-cols-4 gap-1.5">' + tile(today.devices, T('เครื่องที่เข้าวันนี้', 'devices today')) + tile(week, T('เข้า 7 วัน (เครื่อง·วัน)', 'device-days, 7 d')) +
        tile(s.users.total, T('ล็อกอิน Google', 'signed up') + (s.users.new7 ? ' (+' + s.users.new7 + ')' : '')) + tile(paying, T('สมาชิกจ่ายเงิน', 'paying') + (trial ? ' · ' + T('ทดลอง ', 'trial ') + trial : '')) + '</div>' +
      '<div><div class="text-slate-400 mb-1">' + T('เครื่องที่เข้าใช้ 14 วัน (สีส้ม = เข้าครั้งแรก)', 'Devices per day, 14 days (orange = first visit)') + '</div><div class="flex items-end gap-0.5">' + bars + '</div></div>' +
      '<div class="grid grid-cols-2 gap-3"><div><div class="text-slate-400 mb-1">' + T('มาจากไหน (30 วัน)', 'Where from (30 d)') + '</div>' + list(s.sources, srcNames) + '</div>' +
        '<div><div class="text-slate-400 mb-1">' + T('อุปกรณ์ (30 วัน)', 'Devices (30 d)') + '</div>' + list(s.devices, devNames) + '<div class="h-1"></div>' + list(s.apps, devNames) + '</div></div>' +
      '<div class="text-[10px] text-slate-500">' + T('นับเครื่องละครั้งต่อวัน ไม่เก็บตัวตนผู้ใช้ · สมาชิกที่ให้สิทธิ์เอง ', 'One count per device per day, no personal data · members granted by you ') + s.members + '</div>' +
      '<button type="button" data-a="stats" class="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-100">' + T('รีเฟรชตัวเลข', 'Refresh') + '</button>' +
      '</div></details>';
  }
  function feedbackHtml() {
    const s = stats || {}, f = s.feedback || { total: 0, unseen: 0 }, items = fbList || [];
    const stars = n => n ? '<span class="text-amber-400">' + '★'.repeat(n) + '</span><span class="text-slate-600">' + '★'.repeat(5 - n) + '</span>' : '';
    const when = ms => new Date(ms).toLocaleString(T('th-TH', 'en-GB'), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const rows = items.map(x =>
      '<div class="rounded-lg border ' + (x.seen ? 'border-slate-700' : 'border-amber-500/70 bg-amber-500/5') + ' p-2 space-y-1">' +
        '<div class="flex items-center gap-2 text-[10px] text-slate-400"><span>' + stars(x.rating) + '</span><span>' + when(x.created_at) + '</span>' + (x.src ? '<span>· ' + esc(x.src) + '</span>' : '') + (x.seen ? '' : '<span class="text-amber-300 font-semibold">' + T('ใหม่', 'new') + '</span>') + '</div>' +
        '<div class="text-[12px] text-slate-100 whitespace-pre-wrap break-words">' + esc(x.message) + '</div>' +
        ((x.contact || x.email) ? '<div class="text-[10px] text-sky-300 break-all">' + esc([x.contact, x.email].filter(Boolean).join(' · ')) + '</div>' : '') +
        '<div class="flex gap-2">' + (x.seen ? '' : btn('fb-seen" data-id="' + x.id, T('อ่านแล้ว', 'Mark read'), 'px-2 py-1 rounded bg-slate-700 text-slate-100 text-[10px]')) +
          btn('fb-del" data-id="' + x.id, T('ลบ', 'Delete'), 'px-2 py-1 rounded border border-red-400/60 text-red-300 text-[10px]') + '</div>' +
      '</div>').join('');
    return '<details class="rounded-lg border border-slate-700 p-2"' + (f.unseen ? ' open' : '') + '><summary class="text-[12px] text-amber-200 cursor-pointer">💬 ' + T('ความคิดเห็นจากผู้ใช้', 'Feedback from users') + ' (' + f.total + (f.unseen ? ' · ' + T('ใหม่ ', 'new ') + f.unseen : '') + ')' + (f.avg ? ' · ★ ' + f.avg : '') + '</summary>' +
      '<div class="space-y-2 pt-2">' + (rows || '<div class="text-[11px] text-slate-400">' + T('ยังไม่มีข้อความ', 'No messages yet') + '</div>') +
      (f.unseen ? btn('fb-allseen', T('อ่านทั้งหมดแล้ว', 'Mark all read'), 'px-3 py-1.5 rounded-lg bg-slate-700 text-slate-100 text-[11px]') : '') + '</div></details>';
  }

  // Stripe pages: the server makes a Checkout / billing-portal session and we go there; membership itself comes back through the webhook
  async function pay(path, body) {
    if (busy) return;
    busy = 'pay'; render();
    try {
      const r = await api(path, { method: 'POST', body });
      // go to Stripe. The page may stay alive behind it (Back button, an installed app's in-app browser), so the busy state must not be left on:
      // it is cleared again after a few seconds and whenever the page shows again (see idle() below)
      if (r.status === 200 && r.data && r.data.url) { setTimeout(idle, 4000); location.href = r.data.url; return; }
      const msg = r.status === 409 ? T('คุณสมัครสมาชิกอยู่แล้ว ใช้ปุ่ม "จัดการการชำระเงิน" เพื่อเปลี่ยนหรือยกเลิก', 'You already have a subscription. Use "Manage billing" to change or cancel it.')
        : r.status === 401 ? T('เข้าสู่ระบบก่อน', 'Please sign in first')
        : T('เปิดหน้าชำระเงินไม่ได้ ลองใหม่อีกครั้ง', 'Could not open the payment page. Please try again.');
      if (window.toast) toast(msg, 4000);
      if (r.status === 409) refresh();
    } catch (e) {
      if (window.toast) toast(T('เปิดหน้าชำระเงินไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่', 'Could not open the payment page. Check your connection.'), 4000);
    }
    busy = ''; render();
  }
  // the buttons work again (they were disabled while a Stripe page was being opened)
  function idle() { if (busy === 'pay') { busy = ''; render(); } }
  // back from Stripe (?billing=success): the webhook may need a few seconds, so ask the server a few times
  function afterCheckout() {
    const q = new URLSearchParams(location.search), v = q.get('billing');
    if (!v) return;
    q.delete('billing');
    history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
    if (v === 'success') {
      if (window.toast) toast(T('ชำระเงินเรียบร้อย กำลังเปิดสิทธิ์สมาชิก…', 'Payment received. Turning on your membership…'), 4000);
      let n = 0;
      const tick = async () => { await refresh(); if (!isMember() && ++n < 10) setTimeout(tick, 2500); else if (isMember() && window.toast) toast(T('เป็นสมาชิกแล้ว ⭐ ขอบคุณที่สนับสนุน', 'You are a member now ⭐ Thank you!'), 4000); };
      tick();
    } else if (v === 'return') refresh();
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
      else if (a === 'checkout') pay('/api/billing/checkout', { plan: b.dataset.plan });
      else if (a === 'portal') pay('/api/billing/portal', {});
      else if (a === 'fill') { const f = document.getElementById('acct-email'); if (f) f.value = b.dataset.email; }
      else if (a === 'grant') grant(email(), b.dataset.d === 'life' ? { lifetime: true, plan: 'lifetime' } : { days: +b.dataset.d, plan: 'manual' });
      else if (a === 'stats') { stats = {}; render(); loadStats(); }
      else if (a === 'fb-seen') fbAction({ id: +b.dataset.id, seen: true });
      else if (a === 'fb-del') { if (confirm(T('ลบข้อความนี้?', 'Delete this message?'))) fbAction({ id: +b.dataset.id, remove: true }); }
      else if (a === 'fb-allseen') fbAction({ allSeen: true });
      else if (a === 'revoke') { if (email() && confirm(T('ถอนสิทธิ์สมาชิกของ ', 'Remove membership of ') + email() + '?')) grant(email(), { revoke: true }); }
    });
    // opening Settings is when the account card matters: show it, fetch config, and re-check the membership
    ['btn-open-settings', 'member-bar', 'member-fab', 'btn-open-member2'].forEach(id => {
      const open = document.getElementById(id);
      if (open) open.addEventListener('click', () => { config().then(() => render()); refresh(); });
    });
  }

  function init(opts) {
    waitlist = (opts && opts.waitlist) || null;
    wasMember = isMember();
    wire(); render();
    config().then(render);
    refresh();
    afterCheckout();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { idle(); if (st.token) refresh(); } });
    window.addEventListener('pageshow', e => { if (e.persisted) { idle(); if (st.token) refresh(); } });   // Back from Stripe restores this page exactly as it was left
    window.addEventListener('online', () => { if (st.token) refresh(); });
  }

  return { init, isMember, isPaid, hasAccess, refresh, render, signOut, isBeta: () => !!(cfg && cfg.beta), get user() { return st.user || null; }, get state() { return st; } };
})();
window.Account = Account;
