/* Feedback box + anonymous daily visit count.
   - Feedback.open(src): a small window (built here, so the text follows the app language) with 1–5 stars, a message and an optional
     way to reply; it goes to /api/feedback and only admins read it (Settings → Member account → admin panel).
   - Once a day per device the app tells /api/hit where it came from (referrer / utm_source), the device kind and whether it runs
     installed. Only day counters are kept on the server: no IP, no id. kt.hit holds the last day it was sent. */
const Feedback = (() => {
  const T = (th, en) => (typeof LANG !== 'undefined' && LANG === 'en' ? en : th);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let rating = 0, src = '', busy = false;

  function token() { try { return (JSON.parse(localStorage.getItem('kt.acct')) || {}).token || ''; } catch (e) { return ''; } }
  function say(msg) { if (window.toast) window.toast(msg, 2500); }

  function modal() {
    let m = document.getElementById('modal-feedback');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'modal-feedback';
    m.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4';
    document.body.appendChild(m);
    m.addEventListener('click', e => {
      if (e.target === m || e.target.closest('[data-fb=close]')) close();
      const star = e.target.closest('[data-star]');
      if (star) { rating = +star.dataset.star; paintStars(); }
      if (e.target.closest('[data-fb=send]')) send();
    });
    return m;
  }
  function paintStars() {
    document.querySelectorAll('#modal-feedback [data-star]').forEach(b => {
      const on = +b.dataset.star <= rating;
      b.textContent = on ? '★' : '☆';
      b.classList.toggle('text-amber-400', on);
      b.classList.toggle('text-slate-500', !on);
    });
  }
  function open(from) {
    src = from || '';
    rating = 0;
    const m = modal();
    const signed = !!token();
    m.innerHTML =
      '<div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-3 shadow-2xl max-h-[92dvh] overflow-y-auto">' +
        '<div class="flex items-center justify-between border-b border-slate-800 pb-3">' +
          '<h3 class="text-base font-semibold text-slate-100">💬 ' + T('ติชม · แนะนำเพลง', 'Feedback · song requests') + '</h3>' +
          '<button type="button" data-fb="close" class="text-slate-400 hover:text-white text-lg" aria-label="' + T('ปิด', 'Close') + '">✕</button>' +
        '</div>' +
        '<p class="text-xs text-slate-300">' + T('ใช้แล้วติดตรงไหน ชอบอะไร หรืออยากได้เพลงไหน บอกเราได้เลย เราอ่านทุกข้อความ', 'Stuck somewhere, liked something, or want a song? Tell us. We read every message.') + '</p>' +
        '<div class="flex items-center gap-1" role="radiogroup" aria-label="' + T('ให้คะแนน', 'Rating') + '">' +
          [1, 2, 3, 4, 5].map(n => '<button type="button" data-star="' + n + '" class="text-3xl leading-none text-slate-500 px-0.5" aria-label="' + n + '">☆</button>').join('') +
          '<span class="text-[11px] text-slate-400 ml-2">' + T('(ไม่บังคับ)', '(optional)') + '</span>' +
        '</div>' +
        '<textarea id="fb-msg" rows="4" maxlength="1000" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100" placeholder="' +
          esc(T('เช่น อยากได้เพลงลอยกระทง / ปุ่มนี้กดยาก / ชอบโหมดโน้ตตก', 'e.g. please add a song / this button is hard to tap / love the falling notes')) + '"></textarea>' +
        '<input id="fb-contact" type="text" maxlength="120" autocomplete="off" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100" placeholder="' +
          esc(T('ให้เราตอบกลับทาง (ไม่บังคับ) เช่น LINE ID หรืออีเมล', 'How we can reply (optional), e.g. LINE ID or email')) + '">' +
        '<p class="text-[11px] text-slate-400">' + (signed ? T('ข้อความจะแนบอีเมลบัญชีที่คุณล็อกอินไว้ด้วย', 'Your signed-in email is attached to the message.') : T('ไม่ต้องล็อกอินก็ส่งได้', 'No sign-in needed.')) +
          ' · <a href="privacy.html" target="_blank" rel="noopener" class="underline">' + T('ความเป็นส่วนตัว', 'Privacy') + '</a></p>' +
        '<button type="button" data-fb="send" class="w-full h-11 rounded-xl bg-amber-500 text-slate-950 font-bold">' + T('ส่งถึงเรา', 'Send') + '</button>' +
      '</div>';
    m.classList.remove('hidden');
    paintStars();
    setTimeout(() => { const f = document.getElementById('fb-msg'); if (f) f.focus(); }, 50);
  }
  function close() { const m = document.getElementById('modal-feedback'); if (m) m.classList.add('hidden'); }

  async function send() {
    if (busy) return;
    const message = ((document.getElementById('fb-msg') || {}).value || '').trim();
    const contact = ((document.getElementById('fb-contact') || {}).value || '').trim();
    if (message.length < 2) { say(T('พิมพ์ข้อความก่อนนะ', 'Please type a message first')); return; }
    busy = true;
    const btn = document.querySelector('#modal-feedback [data-fb=send]');
    if (btn) { btn.disabled = true; btn.textContent = T('กำลังส่ง…', 'Sending…'); }
    try {
      const headers = { 'content-type': 'application/json' };
      if (token()) headers.authorization = 'Bearer ' + token();
      const r = await fetch('/api/feedback', { method: 'POST', headers, body: JSON.stringify({ message, contact, rating: rating || null, lang: T('th', 'en'), src }) });
      if (r.ok) { close(); say(T('ส่งแล้ว ขอบคุณมาก 🙏', 'Sent. Thank you! 🙏')); }
      else if (r.status === 429) say(T('วันนี้ส่งครบแล้ว ลองใหม่พรุ่งนี้', 'Daily limit reached, try again tomorrow'));
      else say(T('ส่งไม่สำเร็จ ลองใหม่อีกครั้ง', 'Could not send, please try again'));
    } catch (e) { say(T('ต้องต่ออินเทอร์เน็ตเพื่อส่ง', 'You need to be online to send')); }
    busy = false;
    if (btn) { btn.disabled = false; btn.textContent = T('ส่งถึงเรา', 'Send'); }
  }

  /* ---------- once-a-day anonymous count ---------- */
  function hit() {
    const day = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
    let last = null;
    try { last = localStorage.getItem('kt.hit'); } catch (e) { return; }   // storage blocked: skip, we only count what we can de-duplicate
    if (last === day || !navigator.onLine) return;
    const q = new URLSearchParams(location.search), utm = q.get('utm_source');
    let ref = '';
    try { ref = document.referrer && new URL(document.referrer).host !== location.host ? document.referrer : ''; } catch (e) { /* none */ }
    const w = Math.min(screen.width, screen.height), touch = navigator.maxTouchPoints > 0;
    const dev = !touch ? 'desktop' : w >= 700 ? 'tablet' : 'mobile';
    const app = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone ? 'installed' : 'browser';
    fetch('/api/hit', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ src: utm ? 'utm:' + utm : ref, dev, app, fresh: last === null }) })
      .then(r => { if (r.ok) try { localStorage.setItem('kt.hit', day); } catch (e) { /* ignore */ } })
      .catch(() => { /* offline: try again next time */ });
  }

  function init() {
    document.addEventListener('click', e => { const b = e.target.closest('[data-open-feedback]'); if (b) open(b.dataset.openFeedback); });
    setTimeout(hit, 1500);
  }
  return { init, open, close, hit };
})();
window.Feedback = Feedback;
