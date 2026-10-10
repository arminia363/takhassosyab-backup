/* تخصص‌یاب — core runtime (vanilla, no deps) */
(function () {
  'use strict';
  var LIVE = 'https://script.google.com/macros/s/AKfycby-KF2DQ45TzhqLISN5Xcy0_VOd9-UV63HEh6-6GwlLq7bqxPcSibSgB2ddIdsbBFAU/exec';
  var isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var TY = window.TY = {API: isLocal ? '/exec' : LIVE, CHANNEL: 'JobVacencies', GROUP: 'https://t.me/+UqG0KBAd-pQ0YzQ0', SUPPORT: 'arminia363', BOT: 'Takhasosbot'};
  var LS = window.localStorage, $ = function (s, r) { return (r || document).querySelector(s); };
  TY.$ = $; TY.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------- helpers ---------------- */
  var FA = '۰۱۲۳۴۵۶۷۸۹';
  TY.fa = function (s) { return String(s == null ? '' : s).replace(/\d/g, function (d) { return FA[d]; }); };
  TY.en = function (s) { return String(s == null ? '' : s).replace(/[۰-۹]/g, function (c) { return FA.indexOf(c); }).replace(/[٠-٩]/g, function (c) { return c.charCodeAt(0) - 1632; }); };
  // search-friendly normal form: Arabic ي/ك → ی/ک, آ/أ/إ → ا, no ZWNJ/diacritics, ASCII digits, lowercase
  TY.norm = function (s) { return TY.en(s).replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[آأإ]/g, 'ا').replace(/[\u064B-\u065F\u0670\u200c\u200d]/g, '').toLowerCase(); };
  TY.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); };
  TY.mobile = function (s) { var d = TY.en(s).replace(/\D/g, ''); var m = d.match(/^(?:0098|98|0)?(9\d{9})$/); return m ? '0' + m[1] : ''; };
  TY.parseDate = function (s) { if (!s) return null; var d = new Date(String(s).replace(' ', 'T') + '+03:30'); return isNaN(d) ? null : d; };
  TY.ago = function (s) {
    var d = TY.parseDate(s); if (!d) return '';
    var m = Math.round((Date.now() - d.getTime()) / 60000);
    if (m < -30 && m > -300) m += 210; /* old rows saved 3.5h ahead */
    if (m < 1) return 'همین حالا'; if (m < 60) return TY.fa(m) + ' دقیقه پیش';
    var h = Math.round(m / 60); if (h < 24) return TY.fa(h) + ' ساعت پیش';
    var dd = Math.round(h / 24); if (dd === 1) return 'دیروز'; if (dd < 7) return TY.fa(dd) + ' روز پیش';
    if (dd < 35) return TY.fa(Math.round(dd / 7)) + ' هفته پیش';
    try { return new Intl.DateTimeFormat('fa-IR', {month: 'long', day: 'numeric'}).format(d); } catch (e) { return TY.fa(dd) + ' روز پیش'; }
  };
  TY.initial = function (name) { name = String(name || '').trim(); return name ? name.charAt(0) : '؟'; };
  TY.qs = function (k) { return new URLSearchParams(location.search).get(k); };
  TY.debounce = function (fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; };
  TY.store = {
    get: function (k, d) { try { var v = LS.getItem('ty2_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { LS.setItem('ty2_' + k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { LS.removeItem('ty2_' + k); } catch (e) {} }
  };

  /* ---------------- icons ---------------- */
  var P = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    briefcase: '<rect x="2.5" y="7" width="19" height="13.5" rx="2.5"/><path d="M16 7V5.5A2.5 2.5 0 0 0 13.5 3h-3A2.5 2.5 0 0 0 8 5.5V7M2.5 13h19"/>',
    resume: '<path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8z"/><path d="M14 2.5V8h5.5"/><circle cx="12" cy="12.5" r="2.2"/><path d="M8.3 18.2a3.8 3.8 0 0 1 7.4 0"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    pin: '<path d="M12 21.5s7-6 7-11.5a7 7 0 0 0-14 0c0 5.5 7 11.5 7 11.5z"/><circle cx="12" cy="10" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    fwd: '<path d="m15 18-6-6 6-6"/>',
    back: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    send: '<path d="M14.5 21.7a.5.5 0 0 0 .9 0l6.5-19a.5.5 0 0 0-.6-.6l-19 6.5a.5.5 0 0 0 0 .9l7.9 3.2a2 2 0 0 1 1.1 1.1z"/><path d="m21.8 2.2-10.9 10.9"/>',
    bookmark: '<path d="M18.5 21 12 17l-6.5 4V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2z"/>',
    share: '<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="m8.4 13.4 7.2 4.2M15.6 6.4l-7.2 4.2"/>',
    trash: '<path d="M3.5 6h17M9 6V4h6v2M18.5 6l-.9 13.1a2 2 0 0 1-2 1.9H8.4a2 2 0 0 1-2-1.9L5.5 6"/>',
    shield: '<path d="M12 21.5s8-3.8 8-10V5.2L12 2.5 4 5.2v6.3c0 6.2 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    inbox: '<path d="M22 12.5h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12.5V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.5l-3.5-7.4A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z"/>',
    phone: '<path d="M21.5 16.4v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 1.6 3.7 2 2 0 0 1 3.6 1.5h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L7.6 9.4a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    copy: '<rect x="9" y="9" width="12.5" height="12.5" rx="2"/><path d="M5 15H4.5a2 2 0 0 1-2-2V4.5a2 2 0 0 1 2-2H13a2 2 0 0 1 2 2V5"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M18 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5.5"/>',
    download: '<path d="M12 3.5v11m0 0-4.5-4.5m4.5 4.5 4.5-4.5M4.5 20.5h15"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M15 17l-5-5 5-5M10 12h11"/>',
    refresh: '<path d="M20.5 12A8.5 8.5 0 0 1 6 18M3.5 12A8.5 8.5 0 0 1 18 6"/><path d="M18 2.5V6h-3.5M6 21.5V18h3.5"/>',
    building: '<rect x="4" y="2.5" width="16" height="19" rx="2"/><path d="M9.5 21.5v-4h5v4M8.5 7h1M14.5 7h1M8.5 11h1M14.5 11h1M8.5 15h1M14.5 15h1"/>',
    users: '<path d="M16 21v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V21"/><circle cx="9" cy="7.5" r="4"/><path d="M22 21v-1.5a4 4 0 0 0-3-3.9M16 3.6a4 4 0 0 1 0 7.8"/>',
    alert: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7.5v5M12 16.2v.1"/>',
    sliders: '<path d="M4 6.5h16M7 12h10M10 17.5h4"/>',
    more: '<path d="M12 5.5v.01M12 12v.01M12 18.5v.01" stroke-width="3"/>',
    moon: '<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    link: '<path d="M10 13.5a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 10.5a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    lock: '<rect x="4" y="10.5" width="16" height="11" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
    megaphone: '<path d="M3.5 10v4a1 1 0 0 0 1 1H7l6 4.5v-15L7 9H4.5a1 1 0 0 0-1 1zM16.5 9a4.5 4.5 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    mark: '<path d="M14.1 18Q15.5 18 16.8 17.8Q18.1 17.6 19.1 17Q20 16.5 20.6 15.5Q21.1 14.5 21.1 12.9Q21.1 12 21 11Q20.9 10 20.7 8.9L17.8 9.6Q18 10.5 18.2 11.4Q18.4 12.3 18.4 13Q18.4 13.6 18.1 13.9Q17.8 14.3 17.2 14.5Q16.7 14.7 15.9 14.7Q15.1 14.8 14.1 14.8H11.6Q10.4 14.8 9.3 14.7Q8.2 14.7 7.4 14.4Q6.6 14.2 6.2 13.7Q5.7 13.2 5.7 12.4Q5.7 11.8 5.9 11.1Q6.1 10.4 6.3 9.9L3.6 8.9Q3.3 9.7 3.1 10.6Q2.9 11.6 2.9 12.5Q2.9 14.2 3.5 15.3Q4.2 16.3 5.3 16.9Q6.5 17.5 8.1 17.7Q9.7 18 11.6 18ZM13.9 6 12.1 7.9 13.9 9.8 15.8 7.9ZM10.2 6 8.4 7.9 10.2 9.8 12.1 7.9Z" fill="currentColor" stroke="none"/>'
  };
  TY.ic = function (n, cls) { return '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[n] || '') + '</svg>'; };

  /* ---------------- api ---------------- */
  function req(url, opt, ms) {
    return new Promise(function (res, rej) {
      var done = false, t = setTimeout(function () { if (!done) { done = true; rej(new Error('timeout')); } }, ms || 25000);
      fetch(url, opt).then(function (r) { return r.json(); }).then(function (j) { if (TY.netState) TY.netState(true); if (!done) { done = true; clearTimeout(t); res(j); } })
        .catch(function (e) { if (TY.netState) TY.netState(false); if (!done) { done = true; clearTimeout(t); rej(e); } });
    });
  }
  TY.api = function (action, data) {
    var body = Object.assign({action: action}, data || {});
    var s = TY.session(); if (s && s.token && !body.token) body.token = s.token;
    // hard gate: never POST to the v1 server (it stores unknown payloads as form rows)
    return TY.backend().then(function (v) { if (v < 2) return {ok: false, error: v === 1 ? 'oldserver' : 'network'}; return req(TY.API, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify(body), redirect: 'follow'})
      .then(function (r) { if (r && r.error === 'auth' && body.token && action !== 'login_poll') { TY.logout(true); } return r; }); });
  };
  TY.get = function (params) { return req(TY.API + '?' + new URLSearchParams(params).toString(), {redirect: 'follow'}); };

  // backend version gate: the new UI needs Code.gs v2. Until Armin deploys it, writes are disabled.
  TY.backend = function () {
    var c = TY.store.get('be'); if (c && Date.now() - c.t < (c.v >= 2 ? 1800000 : 120000)) return Promise.resolve(c.v);
    return TY.get({action: 'ping'}).then(function (r) { var v = (r && r.v) || 1; if (r && r.bot) TY.BOT = r.bot; TY.store.set('be', {v: v, t: Date.now()}); return v; })
      .catch(function () { return c ? c.v : 0; });
  };
  // آیا سرور ورود/تأیید با پیامک را فعال کرده؟ (ping تازه، نه کش؛ تا ۶ ثانیه صبر می‌کند و در شک «خیر» می‌گوید)
  TY.smsOn = function () {
    return Promise.race([TY.get({action: 'ping'}).then(function (r) { return !!(r && r.features && r.features.sms); }), new Promise(function (res) { setTimeout(function () { res(false); }, 6000); })]).catch(function () { return false; });
  };
  TY.needV2 = function () {
    return TY.backend().then(function (v) {
      if (v >= 2) return true;
      TY.toast(v === 1 ? 'نسخه‌ی جدید سرور هنوز فعال نشده است' : 'اتصال به سرور برقرار نشد', 'err');
      return false;
    });
  };

  /* ---------------- session ---------------- */
  TY.session = function () { return TY.store.get('s', null); };
  TY.setSession = function (token, user) { TY.store.set('s', {token: token, user: user}); if (user) TY.store.set('me', {user: user}); bridgeToken(token); };
  TY.user = function () { var m = TY.store.get('me'); var s = TY.session(); return (m && m.user) || (s && s.user) || null; };
  TY.logout = function (silent) {
    var s = TY.session();
    if (s && !silent) TY.api('profile', {logout: true}).catch(function () {});
    ['s', 'me', 'seen', 'inv_ok', 'sent', 'lastsub', 'draft_employer', 'draft_jobseeker', 'last_employer', 'last_jobseeker'].forEach(TY.store.del); bridgeToken('');
    if (!silent) location.href = 'enter.html';
  };
  TY.me = function () {
    if (!TY.session()) return Promise.resolve(null);
    return TY.api('me').then(function (r) {
      if (!r || !r.ok) return null;
      TY.store.set('me', r);
      if (r.bot) TY.BOT = r.bot;
      mergeSaved(r);
      handleNotifs(r);
      paintBell(r.unread || 0);
      return r;
    }).catch(function () { return TY.store.get('me'); });
  };
  TY.cachedMe = function () { return TY.store.get('me'); };
  // قابلیت‌های سرور (از me/ping). سرور قدیمی‌تر این فیلد را ندارد؛ آن‌وقت امکانات جدید پنهان می‌ماند.
  TY.feat = function (k) { var m = TY.store.get('me'); return !!(m && m.features && m.features[k]); };
  // ذخیره‌شده‌ها بین دستگاه‌ها: سرور فقط شناسه‌ها را نگه می‌دارد؛ آگهی کامل از فید ساخته می‌شود.
  function mergeSaved(r) {
    if (!r || !(r.saved instanceof Array) || !(r.features && r.features.inboxState)) return;
    var local = TY.store.get('saved', []), have = {}, feed = TY.cachedFeed() || [], changed = false;
    local.forEach(function (x) { have[x.id] = 1; });
    r.saved.forEach(function (id) {
      if (have[id]) return;
      var it = feed.filter(function (f) { return f.id === id; })[0];
      if (it) { local.push({id: it.id, type: it.type, title: it.title, text: it.text, cat: it.cat, city: it.city, created: it.created, dm: it.dm, msg: it.msg}); changed = true; }
    });
    if (changed) TY.store.set('saved', local.slice(0, 200));
    var onServer = {}; r.saved.forEach(function (id) { onServer[id] = 1; });
    var up = local.map(function (x) { return x.id; }).filter(function (id) { return !onServer[id]; });
    if (up.length) TY.api('saved_sync', {saved: up}).catch(function () {});
  }
  TY.requireLogin = function (msg) {
    if (TY.session()) return true;
    TY.store.set('ret', location.pathname.split('/').pop() + location.search);
    location.href = 'register.html' + (msg ? '?m=' + encodeURIComponent(msg) : '');
    return false;
  };
  TY.afterLogin = function () { var r = TY.store.get('ret'); TY.store.del('ret'); location.href = r || 'enter.html'; };

  /* ---------------- feed ---------------- */
  var CAT_TAGS = (window.TY_DATA ? TY_DATA.depts : []).map(function (d) { return d.tag; });
  TY.catName = function (tag) { var d = (window.TY_DATA ? TY_DATA.depts : []).filter(function (x) { return x.tag === tag; })[0]; return d ? d.name : String(tag || '').replace('#', '').replace(/_/g, ' '); };
  TY.catsOf = function (text) {
    var out = [], al = {'#تعمیرات_موبایل': '#خدمات_پس_از_فروش', '#مالی': '#حسابداری', '#انبار': '#انبارداری'};
    (String(text || '').match(/#[^\s#،,]+/g) || []).forEach(function (t) { t = al[t] || t; if (CAT_TAGS.indexOf(t) >= 0 && out.indexOf(t) < 0) out.push(t); });
    return out;
  };
  TY.titleOf = function (text) {
    var lines = String(text || '').split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l && !/^(#\S+\s*)+$/.test(l); });
    for (var i = 0; i < lines.length; i++) { var m = lines[i].match(/(?:عنوان شغل|عنوان)\s*[:：]\s*(.+)/); if (m) return m[1].slice(0, 80); }
    return (lines[0] || '').replace(/^[^\u0600-\u06FFA-Za-z0-9]+/, '').replace(/#\S+/g, '').trim().slice(0, 80);
  };
  TY.cityOf = function (text) { var m = String(text || '').match(/(تهران|مشهد|اصفهان|شیراز|تبریز|کرج|قم|اهواز|رشت|کرمان|یزد|ساری|قزوین|ارومیه|همدان|دورکاری)/); return m ? m[1] : ''; };
  TY.bodyOf = function (text) { // text for display: no hashtag line, no channel footer
    return String(text || '').split('\n').filter(function (l) { return !/^\s*(#\S+\s*)+$/.test(l) && !/کانال آگهی‌ها: @JobVacencies/.test(l) && !/ارسال رزومه از برنامه:/.test(l); })
      .join('\n').replace(/^\s+|\s+$/g, '').replace(/\n{3,}/g, '\n\n');
  };
  // display-only cleanup of channel text: emoji markers out, bullets unified
  var EMO = /[\u2300-\u23FF\u2190-\u21FF\u2600-\u27BF\u2B00-\u2BFF\uFE0F\u200D\u20E3]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDFFF]/g;
  TY.cleanText = function (text) {
    return String(text || '').split('\n').map(function (l) {
      var t = l.replace(/^\s*(?:🔹|🔸|▪️|▫️|🔺|✅|✔️|☑️|-|\*|•)\s*/, function (m) { return m.trim() ? '• ' : m; });
      return t.replace(EMO, '').replace(/^\s+/, function (m) { return t.indexOf('•') === 0 ? '' : ''; }).replace(/\s{2,}/g, ' ').replace(/\s+$/, '');
    }).join('\n');
  };
  TY.richText = function (text) { // escaped + linkified + soft labels
    return TY.linkify(TY.cleanText(TY.bodyOf(text)).split('\n').filter(function (l) { return !/^\s*عنوان شغلی?\s*:/.test(l); }).join('\n').replace(/^\s+/, '')).replace(/(^|\n)([^:\n<>]{2,26}):(?=\s)/g, '$1<span class="lbl">$2:</span>').replace(/(^|\n)• /g, '$1<span class="bul"></span>');
  };
  TY.hashtags = function (text) { return (String(text || '').match(/#[^\s#،,]+/g) || []).slice(0, 6); };
  function norm(it) {
    it.title = it.title || TY.titleOf(it.text); it.cat = it.cat || TY.catsOf(it.text).join(' '); it.city = it.city || TY.cityOf(it.text);
    if (!it.created && /^\d{13}/.test(String(it.id))) { var d = new Date(Number(String(it.id).slice(0, 13))); it.created = new Date(d.getTime() + 210 * 60000).toISOString().slice(0, 19).replace('T', ' '); }
    return it;
  }
  TY.feed = function () {
    return TY.backend().then(function (v) {
      if (v >= 2) return TY.get({action: 'feed'}).then(function (r) { return (r.items || []).map(norm); });
      return TY.get({action: 'list'}).then(function (r) { // legacy backend
        var seen = {};
        return (r.items || []).filter(function (x) {
          if (x.deleted === 'بله' || (x.type !== 'employer' && x.type !== 'jobseeker') || String(x.text || '').length < 6) return false;
          if (x.type === 'jobseeker' && x.public !== 'بله') return false;
          var k = x.text; if (seen[k]) return false; seen[k] = 1; return true;
        }).reverse().map(norm);
      });
    }).then(function (items) { TY.store.set('feed', {t: Date.now(), items: items}); return items; });
  };
  TY.cachedFeed = function () { var f = TY.store.get('feed'); return f ? f.items : null; };

  /* saved items (favorites) — local */
  TY.saved = {
    all: function () { return TY.store.get('saved', []); },
    has: function (id) { return TY.saved.all().some(function (x) { return x.id === id; }); },
    toggle: function (it) {
      var a = TY.saved.all(), on = a.some(function (x) { return x.id === it.id; });
      a = a.filter(function (x) { return x.id !== it.id; });
      if (!on) a.unshift({id: it.id, type: it.type, title: it.title, text: it.text, cat: it.cat, city: it.city, created: it.created, dm: it.dm, msg: it.msg});
      TY.store.set('saved', a.slice(0, 200));
      if (TY.feat('inboxState') && TY.session()) TY.api('saved_sync', on ? {remove: [it.id]} : {saved: [it.id]}).catch(function () {});
      return !on;
    }
  };

  /* ---------------- linkify ---------------- */
  TY.linkify = function (text) {
    var s = TY.esc(text);
    s = s.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/(^|[\s(:،])((?:\+98|0098|0)9\d{2}[\s-]?\d{3}[\s-]?\d{4})/g, function (m, a, p) { return a + '<a href="tel:' + p.replace(/[\s-]/g, '') + '">' + p + '</a>'; });
    s = s.replace(/(^|[\s(:،])([۰۹][۰-۹]{10})/g, function (m, a, p) { return a + '<a href="tel:' + TY.en(p) + '">' + p + '</a>'; });
    s = s.replace(/(^|[\s(:،])@([A-Za-z][A-Za-z0-9_]{3,31})/g, '$1<a href="https://t.me/$2" target="_blank" rel="noopener" dir="ltr">@$2</a>');
    return s;
  };

  /* ---------------- toast ---------------- */
  TY.toast = function (msg, kind) {
    var box = $('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
    var t = document.createElement('div'); t.className = 'toast' + (kind === 'err' ? ' err' : '');
    t.innerHTML = TY.ic(kind === 'err' ? 'alert' : 'check', 'sm') + '<span>' + TY.esc(msg) + '</span>';
    box.appendChild(t);
    setTimeout(function () { t.style.transition = 'opacity .25s, transform .25s'; t.style.opacity = '0'; t.style.transform = 'translateY(6px)'; setTimeout(function () { t.remove(); }, 260); }, kind === 'err' ? 4200 : 2600);
  };
  TY.errText = function (r) {
    var e = (r && (r.error || r.detail)) || 'net';
    return ({auth: 'دوباره وارد شو', key: 'رمز ادمین نادرست است', mobile: 'شماره موبایل درست نیست', name: 'نام را بنویس', text: 'متن کامل نیست', rate: 'امروز زیاد ارسال کرده‌ای؛ کمی بعد دوباره امتحان کن',
      target: 'این آگهی دیگر فعال نیست', owner: 'مالک اصلی را نمی‌شود برداشت', status: 'حساب تو فعال نیست', telegram: 'ارسال به تلگرام ناموفق بود: ' + ((r && r.detail) || ''), code: 'کد درست نیست', sms_wait: 'کمی صبر کن و دوباره امتحان کن', sms_hour: 'تعداد درخواست کد زیاد شد؛ یک ساعت بعد دوباره امتحان کن', sms_cap: 'ارسال پیامک امروز موقتاً در دسترس نیست', sms_busy: 'ارسال پیامک شلوغ است؛ کمی بعد دوباره امتحان کن', sms_fail: 'ارسال پیامک انجام نشد', nosms: 'تأیید با پیامک فعال نیست', exists: 'این شماره قبلاً ثبت شده', tries: 'تلاش زیاد؛ ۱۰ دقیقه بعد دوباره امتحان کن',
      nouser: 'با این شماره عضوی پیدا نشد', blocked: 'این حساب مسدود است', expired: 'زمان ورود تمام شد؛ دوباره امتحان کن', server: 'سرور مشغول است؛ کمی بعد دوباره امتحان کن', notfound: 'این مورد دیگر وجود ندارد', limit: 'در هر بار حداکثر ۳۰ مورد', state: 'وضعیت نامعتبر است', type: 'این کار برای این مورد ممکن نیست', deleted: 'این مورد حذف شده است', op: 'این کار الان ممکن نیست', action: 'این کار الان ممکن نیست', net: 'اتصال برقرار نشد؛ دوباره امتحان کن', network: 'اتصال برقرار نشد؛ دوباره امتحان کن', oldserver: 'نسخه‌ی جدید سرور هنوز فعال نشده است', timeout: 'سرور دیر جواب داد؛ دوباره امتحان کن'})[e] || 'مشکلی پیش آمد؛ کمی بعد دوباره امتحان کن';
  };

  /* ---------------- sheet ---------------- */
  // sheets share one history stack: Back closes the top sheet; closing one and opening another in the same tick reuses the entry
  var SHEETS = [], skipPop = 0, spare = 0;
  window.addEventListener('popstate', function () { if (skipPop > 0) { skipPop--; return; } var top = SHEETS.pop(); if (top) top._teardown(); });
  TY.sheet = function (o) {
    var scrim = document.createElement('div'); scrim.className = 'scrim';
    var sh = document.createElement('div'); sh.className = 'sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true');
    sh.innerHTML = '<div class="grab"></div><div class="sh-h"><h3>' + TY.esc(o.title || '') + '</h3>' + (o.headExtra || '') +
      '<button class="iconbtn" data-close aria-label="بستن">' + TY.ic('x') + '</button></div><div class="sh-b"></div>' + (o.footer ? '<div class="sh-f"></div>' : '');
    var b = sh.querySelector('.sh-b'); if (typeof o.body === 'string') b.innerHTML = o.body; else if (o.body) b.appendChild(o.body);
    if (o.footer) { var f = sh.querySelector('.sh-f'); if (typeof o.footer === 'string') f.innerHTML = o.footer; else f.appendChild(o.footer); }
    document.body.appendChild(scrim); document.body.appendChild(sh);
    var prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    var opener = document.activeElement; sh.setAttribute('tabindex', '-1'); sh.style.outline = 'none';
    requestAnimationFrame(function () { scrim.classList.add('on'); sh.classList.add('on'); try { sh.focus({preventScroll: true}); } catch (e) {} });
    var api = {el: sh, body: b, close: close, _teardown: teardown}, closed = false;
    function teardown() {
      if (closed) return; closed = true;
      scrim.classList.remove('on'); sh.classList.remove('on'); document.body.style.overflow = prev;
      setTimeout(function () { scrim.remove(); sh.remove(); }, 300);
      document.removeEventListener('keydown', esc);
      try { if (opener && opener.focus && document.body.contains(opener)) opener.focus({preventScroll: true}); } catch (e) {}
      if (o.onClose) o.onClose();
    }
    function close() { if (closed) return; var i = SHEETS.indexOf(api); if (i >= 0) SHEETS.splice(i, 1); teardown(); spare++; setTimeout(function () { if (spare > 0) { spare--; skipPop++; history.back(); } }, 60); }
    function esc(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', esc);
    scrim.addEventListener('click', close);
    sh.querySelector('[data-close]').addEventListener('click', close);
    var y0 = null; // swipe down to close
    sh.addEventListener('touchstart', function (e) { if (window.innerWidth < 720 && b.scrollTop <= 0 && !e.target.closest('input,textarea,.chips.scroll')) y0 = e.touches[0].clientY; }, {passive: true});
    sh.addEventListener('touchmove', function (e) { if (y0 == null) return; var dy = e.touches[0].clientY - y0; if (dy > 0) sh.style.transform = 'translateY(' + dy + 'px)'; }, {passive: true});
    sh.addEventListener('touchend', function (e) { if (y0 == null) return; var dy = e.changedTouches[0].clientY - y0; y0 = null; sh.style.transform = ''; if (dy > 110) close(); });
    SHEETS.push(api); if (spare > 0) spare--; else try { history.pushState({sheet: 1}, ''); } catch (e) {}
    return api;
  };
  TY.confirm = function (title, text, okLabel, danger) {
    return new Promise(function (res) {
      var done = false;
      var f = document.createElement('div'); f.style.display = 'contents';
      f.innerHTML = '<button class="btn outline" data-n>انصراف</button><button class="btn ' + (danger ? 'danger' : 'primary') + '" data-y>' + TY.esc(okLabel || 'تأیید') + '</button>';
      var s = TY.sheet({title: title, body: '<p class="muted" style="margin:0 0 8px">' + TY.esc(text || '') + '</p>', footer: f, onClose: function () { if (!done) res(false); }});
      f.querySelector('[data-y]').onclick = function () { done = true; res(true); s.close(); };
      f.querySelector('[data-n]').onclick = function () { done = true; res(false); s.close(); };
    });
  };
  TY.copy = function (text) {
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { TY.toast('کپی شد'); }).catch(function () {
      var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); TY.toast('کپی شد'); } catch (e) {} t.remove();
    });
  };
  TY.share = function (title, url) {
    if (navigator.share) navigator.share({title: title, url: url}).catch(function () {}); else TY.copy(url);
  };

  /* ---------------- shell ---------------- */
  var NAV = [['home', 'enter.html', 'خانه', 'home'], ['jobs', 'jobs.html', 'آگهی‌ها', 'briefcase'], ['add', 'post.html', 'ثبت', 'plus'], ['resumes', 'resumes.html', 'رزومه‌ها', 'resume'], ['me', 'me.html', 'من', 'user']];
  TY.shell = function (o) {
    o = o || {};
    var top = document.createElement('header'); top.className = 'topbar';
    var lead = o.back ? '<button class="iconbtn" data-back aria-label="بازگشت">' + TY.ic('back') + '</button>' : '';
    var title = o.brand ? '<a class="brand" href="enter.html"><span class="mark">' + TY.ic('mark') + '</span><b>تخصص‌یاب</b></a>' : (o.title ? '<h1>' + TY.esc(o.title) + '</h1>' : '<div style="flex:1"></div>');
    var trail = (o.actions || '') + (o.bell !== false && TY.session() ? '<a class="iconbtn" href="inbox.html" aria-label="اعلان‌ها">' + TY.ic('bell') + '<span class="dot" hidden></span></a>' : '');
    top.innerHTML = lead + title + trail;
    document.body.insertBefore(top, document.body.firstChild);
    var bb = top.querySelector('[data-back]');
    if (bb) bb.onclick = function () { if (history.length > 1 && document.referrer && document.referrer.indexOf(location.host) >= 0) history.back(); else location.href = o.backTo || 'enter.html'; };
    window.addEventListener('scroll', function () { top.classList.toggle('lined', window.scrollY > 4); }, {passive: true});
    if (o.nav) {
      var nav = document.createElement('nav'); nav.className = 'bottomnav'; nav.setAttribute('aria-label', 'منوی اصلی');
      nav.innerHTML = '<div class="in">' + NAV.map(function (n) {
        return '<a href="' + n[1] + '"' + (n[0] === 'add' ? ' class="plus"' : '') + (o.nav === n[0] ? ' aria-current="page"' : '') + '>' +
          (n[0] === 'add' ? '<span>' + TY.ic(n[3]) + '</span>' : TY.ic(n[3])) + (n[0] === 'add' ? '<span class="sr">' + n[2] + '</span>' : n[2]) + '</a>';
      }).join('') + '</div>';
      document.body.appendChild(nav);
    } else document.body.classList.add('nonav-page');
    var me = TY.cachedMe(); if (me) paintBell(me.unread || 0);
    return top;
  };
  function paintBell(n) { TY.$$('.topbar .dot').forEach(function (d) { d.hidden = !n; d.textContent = n > 9 ? '۹+' : TY.fa(n); }); }
  TY.paintBell = paintBell;

  TY.skeleton = function (n) { var h = ''; for (var i = 0; i < (n || 4); i++) h += '<div class="skitem"><div class="sk"></div><div class="sk" style="width:40%"></div><div class="sk" style="width:90%"></div></div>'; return '<div class="feed">' + h + '</div>'; };
  TY.empty = function (icon, title, text, action) {
    return '<div class="empty"><div class="ic">' + TY.ic(icon, 'lg') + '</div><h3>' + TY.esc(title) + '</h3><p>' + TY.esc(text || '') + '</p>' + (action || '') + '</div>';
  };
  TY.statusBadge = function (st, vis) {
    var m = {pending: ['warn', 'در انتظار تأیید'], approved: ['brand', 'منتشر شده'], rejected: ['danger', 'رد شده'], private: ['info', 'فقط برای ادمین'], direct: ['info', 'ارسال مستقیم'], deleted: ['', 'حذف شده'], closed: ['', vis === 'hired' ? 'استخدام شد' : 'بسته شد']}[st] || ['', st || ''];
    return '<span class="badge dotted ' + m[0] + '">' + m[1] + '</span>';
  };

  /* ---------------- notifications ---------------- */
  function handleNotifs(r) {
    var seen = TY.store.get('seen', null), list = (r.notifs || []).filter(function (n) { return !n.read; });
    var ids = (r.notifs || []).map(function (n) { return n.id; });
    if (seen === null) { TY.store.set('seen', ids); return; } // first sync: don't spam old ones
    var fresh = list.filter(function (n) { return seen.indexOf(n.id) < 0; });
    TY.store.set('seen', ids.concat(seen).slice(0, 300));
    fresh.slice(0, 3).forEach(function (n) {
      var url = notifUrl(n);
      if (document.visibilityState === 'visible') TY.toast(n.title);
      if (window.Android && Android.notify2) { try { Android.notify2(String(n.id), n.title, String(n.body || '').split('\n')[0], url); } catch (e) {} }
      else if (window.Android && Android.notifyUser) { try { Android.notifyUser(n.title, String(n.body || '').split('\n')[0]); } catch (e) {} }
      else if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible' && navigator.serviceWorker) {
        navigator.serviceWorker.getRegistration().then(function (reg) { if (reg) reg.showNotification(n.title, {body: String(n.body || '').split('\n').slice(0, 2).join(' · '), icon: 'icon-192.png', badge: 'icon-192.png', tag: n.id, lang: 'fa', dir: 'rtl', data: {url: url}}); });
      }
    });
  }
  function notifUrl(n) {
    if (n.kind === 'resume_direct') return 'inbox.html?tab=inbox&id=' + n.ref;
    if (n.kind === 'match' || n.kind === 'published') { var f = (TY.cachedFeed() || []).filter(function (x) { return x.id === n.ref; })[0]; return (f && f.type === 'jobseeker' ? 'resumes.html' : 'jobs.html') + '?id=' + n.ref; }
    if (n.kind === 'approved') return 'enter.html';
    if (/^admin_/.test(n.kind)) return n.kind === 'admin_role' ? 'me.html' : 'admin.html';
    return 'inbox.html';
  }
  TY.notifUrl = notifUrl;
  /* ---------------- admin notification preferences (shared by me.html and admin.html) ---------------- */
  var PREF_ROWS = [
    ['signup', 'درخواست عضویت جدید', 'کسی ثبت‌نام کرده و منتظر تأیید است'],
    ['ad', 'آگهی استخدام در انتظار تأیید', 'آگهی تازه‌ای که باید منتشر یا رد شود'],
    ['cv', 'رزومه‌ی در انتظار تأیید', 'رزومه‌ای که برای انتشار در کانال فرستاده شده'],
    ['private', 'رزومه‌ی فقط برای ادمین', 'رزومه‌هایی که فرستنده فقط برای ادمین گذاشته'],
    ['direct', 'رزومه‌ی ارسال‌شده به کارفرما', 'رزومه‌ی مستقیم برای یک آگهی'],
    ['channel', 'پست تازه‌ی کانال', 'وقتی آگهی یا رزومه‌ای مستقیم در کانال شناسایی شود'],
    ['daily', 'خلاصه‌ی روزانه', 'هر روز ساعت ۹ صبح، اگر مورد در انتظاری باشد']
  ];
  TY.adminPrefsSheet = function (opt) {
    opt = opt || {};
    if (!TY.session()) { TY.toast('اول با حساب خودت وارد شو', 'err'); return; }
    var u = TY.user() || {};
    var s = TY.sheet({title: 'تنظیمات اعلان ادمین', body: TY.skeleton(4)});
    TY.api('admin_prefs').then(function (r) {
      if (!r || !r.ok) { s.body.innerHTML = TY.empty('alert', 'باز نشد', TY.errText(r)); return; }
      var p = r.prefs;
      function tg(k, t, sub, dis) {
        return '<label class="between card flat" style="cursor:pointer;margin-bottom:8px;gap:12px"><span style="min-width:0"><span class="small" style="display:block"><b>' + TY.esc(t) + '</b></span><span class="xs muted" style="display:block;margin-top:2px">' + TY.esc(sub) + '</span></span>' +
          '<span class="toggle"><input type="checkbox" data-p="' + k + '"' + (p[k] ? ' checked' : '') + (dis ? ' disabled' : '') + '><span></span></span></label>';
      }
      s.body.innerHTML = '<p class="small muted" style="margin-top:0">انتخاب کن چه چیزهایی برای خودت بیاید. این تنظیمات فقط برای حساب خودت است.</p>' +
        '<div class="section-h" style="margin-top:4px"><h2>چه چیزهایی؟</h2></div>' + PREF_ROWS.map(function (x) { return tg(x[0], x[1], x[2]); }).join('') +
        '<div class="section-h"><h2>از کجا برسد؟</h2></div>' +
        tg('tg', 'پیام تلگرام', u.tg ? 'با دکمه‌ی ✅ و ❌ در ربات' : 'تلگرامت وصل نیست؛ از «حساب من» وصلش کن') + tg('app', 'اعلان داخل برنامه', 'در بخش اعلان‌ها و زنگوله');
      s.body.insertAdjacentHTML('beforeend', '<button class="btn primary block mt3" id="pSave">ذخیره</button>');
      s.body.querySelector('#pSave').onclick = function () {
        var b = this, o = {}; b.classList.add('loading');
        TY.$$('[data-p]', s.body).forEach(function (c) { o[c.getAttribute('data-p')] = c.checked ? 1 : 0; });
        TY.api('admin_prefs', {prefs: o}).then(function (x) {
          b.classList.remove('loading');
          if (x && x.ok) { var m = TY.store.get('me'); if (m) { m.adminPrefs = x.prefs; TY.store.set('me', m); } s.close(); TY.toast('ذخیره شد'); if (opt.onSaved) opt.onSaved(x.prefs); }
          else TY.toast(TY.errText(x), 'err');
        }).catch(function () { b.classList.remove('loading'); TY.toast(TY.errText(), 'err'); });
      };
    }).catch(function () { s.body.innerHTML = TY.empty('alert', 'اتصال برقرار نشد', 'دوباره امتحان کن'); });
  };
  TY.enablePush = function () {
    if (window.Android) { TY.toast('اعلان‌ها در برنامه فعال است'); return Promise.resolve(true); }
    if (!('Notification' in window)) { TY.toast('این مرورگر اعلان را پشتیبانی نمی‌کند؛ تلگرام را وصل کن', 'err'); return Promise.resolve(false); }
    return Notification.requestPermission().then(function (p) { if (p === 'granted') TY.toast('اعلان‌های گوشی فعال شد'); else TY.toast('اجازه‌ی اعلان داده نشد', 'err'); return p === 'granted'; });
  };
  function bridgeToken(t) { try { if (window.Android && Android.setToken) Android.setToken(t || '', TY.API); } catch (e) {} }

  var pollT;
  TY.startPolling = function (cb) {
    if (!TY.session()) return;
    clearInterval(pollT);
    pollT = setInterval(function () { if (document.visibilityState === 'visible') TY.me().then(function (r) { if (cb && r) cb(r); }); }, 45000);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') TY.me().then(function (r) { if (cb && r) cb(r); }); });
  };

  /* ---------------- connection banner: stale cached data is fine, but say so ---------------- */
  (function () {
    var bar = null, wasOff = false;
    TY.netState = function (ok) {
      if (!document.body) return;
      if (!ok && !bar && document.visibilityState === 'visible') {
        wasOff = true; bar = document.createElement('div'); bar.className = 'offbar'; bar.setAttribute('role', 'status');
        bar.innerHTML = '<span>اتصال برقرار نیست؛ آخرین اطلاعات ذخیره‌شده را می‌بینی</span><button type="button">تلاش دوباره</button>';
        bar.querySelector('button').onclick = function () { location.reload(); };
        document.body.appendChild(bar);
      } else if (ok && bar) { bar.remove(); bar = null; if (wasOff) { wasOff = false; TY.toast('دوباره آنلاین شدی'); } }
    };
    window.addEventListener('offline', function () { TY.netState(false); });
    window.addEventListener('online', function () { TY.netState(true); if (TY.session()) TY.me(); });
  })();

  /* ---------------- boot ---------------- */
  if (window.Android || /TakhassosyabApp/.test(navigator.userAgent)) document.documentElement.classList.add('in-app');
  if ('serviceWorker' in navigator && !isLocal) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  var s0 = TY.session(); if (s0) bridgeToken(s0.token);
})();
