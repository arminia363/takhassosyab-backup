/* admin dashboard — compact, dense, server-validated key */
(function () {
  'use strict';
  var TY = window.TY, esc = TY.esc;
  TY.adminPage = function () {
    var KEY = TY.store.get('akey', ''), viaToken = false, data = null, tab = 'signup', q = '', mfilter = 'all', timer, selMode = false, sel = {}, busy = false;
    var top = TY.shell({title: 'پنل ادمین', bell: false,
      actions: '<button class="iconbtn" id="aRef" aria-label="به‌روزرسانی" hidden>' + TY.ic('refresh') + '</button><button class="iconbtn" id="aMore" aria-label="بیشتر" hidden>' + TY.ic('more') + '</button>'});
    var main = TY.$('main');
    main.style.maxWidth = '980px';

    function feat(k) { return !!(data && data.features && data.features[k]); }
    function call(action, d) { return TY.api(action, Object.assign({key: KEY}, d || {})); }
    function loginView(err) {
      TY.$('#aRef').hidden = TY.$('#aMore').hidden = true;
      main.innerHTML = '<div style="max-width:380px;margin:40px auto 0"><span class="tile-ic brand" style="width:52px;height:52px;border-radius:16px">' + TY.ic('shield') + '</span>' +
        '<h1 class="h2 mt4">ورود ادمین</h1><p class="muted small mt1">رمز را یک بار وارد کن؛ روی همین دستگاه می‌ماند.</p>' +
        '<form id="lf" class="mt4"><div class="field' + (err ? ' err' : '') + '"><label for="k">رمز ادمین</label><input class="input ltr" id="k" type="password" autocomplete="current-password" enterkeyhint="go">' + (err ? '<div class="errmsg">' + esc(err) + '</div>' : '') + '</div>' +
        '<button class="btn primary block lg" id="lb">ورود</button></form>' +
        '<p class="xs muted center mt4">ادمین هستی؟ با حساب خودت در برنامه وارد شو؛ دیگر رمز لازم نیست.<br><a href="register.html?login=1" style="color:var(--brand-text);font-weight:700">ورود به حساب</a></p></div>';
      TY.$('#k').focus();
      TY.$('#lf').onsubmit = function (e) { e.preventDefault(); KEY = TY.$('#k').value.trim(); if (!KEY) return; TY.$('#lb').classList.add('loading'); load(true); };
    }
    function load(fromLogin) {
      return TY.backend().then(function (v) {
        if (v < 2) { main.innerHTML = TY.empty('alert', 'سرور هنوز نسخه‌ی قدیمی است', 'برای این پنل باید Code.gs جدید در Apps Script منتشر شود.', '<a class="btn outline" href="../admin.html">پنل قبلی</a>'); return; }
        return call('a_list').then(function (r) {
          if (!r || !r.ok) { if (r && r.error === 'key') { TY.store.del('akey'); if (viaToken) { viaToken = false; KEY = ''; data = null; loginView(); } else loginView(fromLogin ? 'رمز نادرست است' : ''); } else if (!data) main.innerHTML = TY.empty('alert', 'اتصال برقرار نشد', TY.errText(r), '<button class="btn primary" id="rt">تلاش دوباره</button>'); var rt = TY.$('#rt'); if (rt) rt.onclick = function () { load(); }; return; }
          if (KEY) TY.store.set('akey', KEY); data = r; TY.store.set('adata', r); draw();
        });
      }).catch(function () { if (!data) main.innerHTML = TY.empty('alert', 'اتصال برقرار نشد', 'اینترنت را چک کن.', '<button class="btn primary" onclick="location.reload()">تلاش دوباره</button>'); else TY.toast(TY.errText(), 'err'); });
    }

    function lists() {
      var it = data.items, us = data.users;
      return {
        signup: us.filter(function (u) { return u.status === 'pending'; }),
        ads: it.filter(function (x) { return x.type === 'employer' && x.status === 'pending'; }),
        cvs: it.filter(function (x) { return x.type === 'jobseeker' && (x.status === 'pending' || x.status === 'private' || x.status === 'direct'); }),
        pub: it.filter(function (x) { return x.status === 'approved'; }),
        members: us
      };
    }
    function hit(s) { if (!q) return true; var n = TY.en(q).toLowerCase(); return TY.en(s).toLowerCase().indexOf(n) >= 0; }
    // ---- تکراری‌ها: نام یکسان یا ۸ رقم آخر موبایل یکسان؛ متن/عنوان یکسان از یک فرستنده یا متن مشابه از چند نفر ----
    var dupCache = null, dupFor = null;
    function textKey(t) { return TY.norm(String(t || '').replace(/#\S+/g, ' ').replace(/https?:\/\/\S+/g, ' ')).replace(/[^a-z0-9\u0600-\u06FF]+/g, '').slice(0, 90); }
    function dups() {
      if (dupCache && dupFor === data) return dupCache;
      var m = {}, byName = {}, byTail = {}, byText = {}, byTitle = {};
      (data.users || []).forEach(function (u) {
        var nk = TY.norm(u.name || '').replace(/\s+/g, ''), tk = String(u.mobile || '').slice(-8);
        if (nk.length > 2) (byName[nk] = byName[nk] || []).push(u);
        (byTail[tk] = byTail[tk] || []).push(u);
      });
      (data.items || []).forEach(function (x) {
        var k = x.type + ':' + textKey(x.text); if (k.length > 14) (byText[k] = byText[k] || []).push(x);
        if (x.owner && x.title) { var tkey = x.owner + ':' + x.type + ':' + TY.norm(x.title); (byTitle[tkey] = byTitle[tkey] || []).push(x); }
      });
      function mark(g, label, pre) { if (g.length > 1) g.forEach(function (o) { var id = pre + (o.mobile || o.id), others = g.filter(function (z) { return z !== o; }); (m[id] = m[id] || []).push({label: label, others: others}); }); }
      Object.keys(byName).forEach(function (k) { mark(byName[k], 'هم‌نام', 'u'); });
      Object.keys(byTail).forEach(function (k) { mark(byTail[k], 'شماره‌ی مشابه', 'u'); });
      Object.keys(byText).forEach(function (k) { mark(byText[k], 'متن تکراری', 'i'); });
      Object.keys(byTitle).forEach(function (k) { mark(byTitle[k], 'عنوان تکراری', 'i'); });
      dupCache = m; dupFor = data; return m;
    }
    function dupBadge(kind, id) {
      var d = dups()[kind + id]; if (!d || !d.length) return '';
      var seen = {}, labels = d.map(function (z) { return z.label; }).filter(function (l) { return seen[l] ? false : (seen[l] = 1); });
      return '<div style="margin-top:3px"><span class="badge warn" title="' + esc(labels.join('، ')) + '">' + TY.ic('alert', 'xs') + 'تکراری؟ ' + esc(labels[0]) + '</span></div>';
    }
    function dupList(kind, id) {
      var d = dups()[kind + id]; if (!d) return [];
      var out = [], seen = {}; d.forEach(function (z) { z.others.forEach(function (o) { var k = o.mobile || o.id; if (!seen[k]) { seen[k] = 1; out.push(o); } }); }); return out;
    }
    function selBox(key) { return '<span class="selbox" aria-hidden="true">' + TY.ic('check', 'xs') + '</span>'; }
    function userRow(u, inline) {
      var sk = 'u:' + u.mobile;
      return '<div class="row arow' + (selMode && sel[sk] ? ' sel' : '') + '" data-u="' + esc(u.mobile) + '"' + (selMode ? ' role="checkbox" tabindex="0" aria-checked="' + !!sel[sk] + '"' : '') + '>' + (selMode ? selBox() : '') + '<span class="avatar">' + esc(TY.initial(u.name)) + '</span><div class="grow"><div class="t">' + esc(u.name || 'بدون نام') + '</div>' +
        '<div class="s"><span class="num" dir="ltr">' + TY.fa(u.mobile) + '</span> · ' + (u.admin ? 'ادمین' : u.role === 'employer' ? 'کارفرما' : u.role === 'jobseeker' ? 'کارجو' : 'عضو') + ' · ' + TY.ago(u.created) + (u.tg ? ' · <span style="color:var(--brand-text)">تلگرام' + (u.verified ? ' ✓' : '') + '</span>' : '') + '</div>' + dupBadge('u', u.mobile) + '</div>' +
        (inline && !selMode ? acts('u', u.mobile) : '<span class="badge dotted ' + ({approved: 'brand', pending: 'warn', rejected: 'danger', blocked: 'danger'}[u.status] || '') + '">' + ({approved: 'تأییدشده', pending: 'در انتظار', rejected: 'رد شده', blocked: 'مسدود'}[u.status] || u.status) + '</span>') + '</div>';
    }
    function itemRow(x, inline) {
      var cats = String(x.cat || '').split(' ').filter(function (c) { return c && c !== '#دورکاری'; }).map(TY.catName).slice(0, 1).join('');
      var vis = x.status === 'private' ? '<span class="badge info">فقط ادمین</span>' : x.status === 'direct' ? '<span class="badge info">مستقیم</span>' : '';
      var sk = 'i:' + x.id;
      return '<div class="row arow' + (selMode && sel[sk] ? ' sel' : '') + '" data-i="' + esc(x.id) + '"' + (selMode ? ' role="checkbox" tabindex="0" aria-checked="' + !!sel[sk] + '"' : '') + '>' + (selMode ? selBox() : '') + '<span class="tile-ic ' + (x.type === 'employer' ? '' : 'info') + '">' + TY.ic(x.type === 'employer' ? 'briefcase' : 'resume', 'sm') + '</span><div class="grow"><div class="t">' + esc(x.title || TY.titleOf(x.text) || 'بدون عنوان') + '</div>' +
        '<div class="s">' + esc([x.ownerName || (x.src === 'channel' ? 'از کانال' : x.src === 'form-v1' ? 'فرم قدیمی' : ''), cats, TY.ago(x.created)].filter(Boolean).join(' · ')) + '</div>' + (x.status === 'pending' ? dupBadge('i', x.id) : '') + '</div>' +
        (inline && !selMode && x.status === 'pending' ? acts('i', x.id) : vis || (x.status === 'approved' ? '' : TY.statusBadge(x.status))) + '</div>';
    }
    function acts(t, id) {
      return '<div class="hstack" style="gap:6px"><button class="iconbtn act ok" data-act="' + t + ':a:' + esc(id) + '" aria-label="تأیید" title="تأیید">' + TY.ic('check', 'sm') + '</button>' +
        '<button class="iconbtn act no" data-act="' + t + ':r:' + esc(id) + '" aria-label="رد" title="رد">' + TY.ic('x', 'sm') + '</button></div>';
    }

    function draw() {
      TY.$('#aRef').hidden = TY.$('#aMore').hidden = false;
      var L = lists();
      var T = [['signup', 'عضویت', L.signup.length, true], ['ads', 'آگهی‌ها', L.ads.length, true], ['cvs', 'رزومه‌ها', L.cvs.filter(function (x) { return x.status === 'pending'; }).length, true], ['pub', 'منتشرشده', L.pub.length], ['members', 'اعضا', L.members.filter(function (u) { return u.status === 'approved'; }).length]];
      if (data.stats) T.push(['stats', 'آمار', 0]);
      var pendTotal = L.signup.length + L.ads.length + L.cvs.filter(function (x) { return x.status === 'pending'; }).length;
      var tgN = (data.admins || []).length;
      var h = '<div class="between" style="margin:8px 2px 12px"><div><div class="h3">' + (pendTotal ? TY.fa(pendTotal) + ' مورد منتظر تصمیم توست' : 'همه‌چیز بررسی شده') + '</div>' +
        '<div class="xs muted">' + TY.fa(L.members.filter(function (u) { return u.status === 'approved'; }).length) + ' عضو · ' + TY.fa(L.pub.length) + ' منتشرشده · ادمین تلگرام: ' + TY.fa(tgN) + '</div></div>' +
        (tgN ? '' : '<a class="btn primary sm" target="_blank" rel="noopener" href="' + esc(data.adminLink) + '">' + TY.ic('send', 'xs') + 'اتصال تلگرام</a>') + '</div>';
      h += '<div class="tabs" role="tablist">' + T.map(function (t) {
        return '<button role="tab" data-tab="' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + t[1] + (t[2] ? ' <span class="cnt' + (t[3] && t[2] ? ' hot' : '') + '">' + TY.fa(t[2]) + '</span>' : '') + '</button>';
      }).join('') + '</div>';
      if (tab === 'stats') { main.innerHTML = h + (feat('smsAdmin') ? '<div id="smsBox"></div>' : '') + statsView(); syncBar(); loadSms(TY.$('#smsBox')); return; }
      var canSel = (tab === 'signup' || tab === 'ads' || tab === 'cvs') && selectable().length > 1;
      if (!canSel && selMode) { selMode = false; sel = {}; }
      h += '<div class="hstack" style="margin:12px 0"><label class="inputwrap" style="flex:1">' + TY.ic('search', 'sm') + '<input class="input" id="aq" type="search" placeholder="جستجوی نام، موبایل یا متن" value="' + esc(q) + '"></label>' + (canSel ? '<button class="btn ' + (selMode ? 'primary' : 'outline') + '" id="aSel" aria-pressed="' + selMode + '">' + TY.ic('check', 'sm') + (selMode ? 'پایان انتخاب' : 'انتخاب') + '</button>' : '') + '</div>';
      if (tab === 'members') h += '<div class="chips scroll" style="margin-bottom:12px">' + [['all', 'همه'], ['approved', 'تأییدشده'], ['pending', 'در انتظار'], ['employer', 'کارفرما'], ['jobseeker', 'کارجو'], ['rejected', 'رد/مسدود']].map(function (c) { return '<button class="chip" data-mf="' + c[0] + '" aria-pressed="' + (mfilter === c[0]) + '">' + c[1] + '</button>'; }).join('') + '</div>';
      var rows = '', list = L[tab];
      if (tab === 'signup') rows = list.filter(function (u) { return hit(u.name + ' ' + u.mobile); }).map(function (u) { return userRow(u, true); }).join('');
      else if (tab === 'members') rows = list.filter(function (u) {
        if (mfilter === 'approved' || mfilter === 'pending') { if (u.status !== mfilter) return false; } else if (mfilter === 'rejected') { if (u.status !== 'rejected' && u.status !== 'blocked') return false; } else if (mfilter !== 'all' && u.role !== mfilter) return false;
        return hit(u.name + ' ' + u.mobile);
      }).map(function (u) { return userRow(u, false); }).join('');
      else rows = list.filter(function (x) { return hit(x.title + ' ' + x.text + ' ' + (x.ownerName || '') + ' ' + (x.owner || '')); }).map(function (x) { return itemRow(x, tab !== 'pub'); }).join('');
      var emptyTxt = {signup: ['users', 'درخواست عضویت تازه‌ای نیست'], ads: ['briefcase', 'آگهی در انتظاری نیست'], cvs: ['resume', 'رزومه‌ی تازه‌ای نیست'], pub: ['megaphone', 'هنوز چیزی منتشر نشده'], members: ['users', 'عضوی پیدا نشد']}[tab];
      h += rows ? '<div class="list">' + rows + '</div>' : TY.empty(emptyTxt[0], q ? 'نتیجه‌ای پیدا نشد' : emptyTxt[1], q ? '' : 'موارد تازه همین‌جا و در تلگرام ادمین‌ها می‌آید.');
      main.innerHTML = h;
      syncBar();
      var aq = TY.$('#aq'); aq.oninput = TY.debounce(function () { q = aq.value; var pos = aq.selectionStart; draw(); var n = TY.$('#aq'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} }, 200);
    }

    /* ---------------- انتخاب چندتایی و عملیات گروهی ---------------- */
    function visibleRows() {
      var L = lists(), list = L[tab] || [];
      if (tab === 'signup') return list.filter(function (u) { return hit(u.name + ' ' + u.mobile); }).map(function (u) { return 'u:' + u.mobile; });
      if (tab === 'ads' || tab === 'cvs') return list.filter(function (x) { return x.status === 'pending' && hit(x.title + ' ' + x.text + ' ' + (x.ownerName || '') + ' ' + (x.owner || '')); }).map(function (x) { return 'i:' + x.id; });
      return [];
    }
    function selectable() { var L = lists(), l = L[tab] || []; return tab === 'signup' ? l : l.filter(function (x) { return x.status === 'pending'; }); }
    function selKeys() { var vis = visibleRows(), n = []; vis.forEach(function (k) { if (sel[k]) n.push(k); }); return n; }
    function syncBar() {
      var old = TY.$('#bBar'); if (old) old.remove();
      document.body.classList.toggle('has-ab', selMode);
      if (!selMode) return;
      var n = selKeys().length, all = visibleRows().length;
      var b = document.createElement('div'); b.className = 'actionbar'; b.id = 'bBar';
      b.innerHTML = '<div class="in"><button class="btn ghost" id="bAll" style="min-width:76px">' + (n && n === all ? 'هیچ‌کدام' : 'همه') + '</button>' +
        '<button class="btn primary" id="bOk"' + (n ? '' : ' disabled') + '>' + TY.ic('check', 'sm') + 'تأیید' + (n ? ' (' + TY.fa(n) + ')' : '') + '</button>' +
        '<button class="btn danger" id="bNo"' + (n ? '' : ' disabled') + '>' + TY.ic('x', 'sm') + 'رد' + (n ? ' (' + TY.fa(n) + ')' : '') + '</button></div>';
      document.body.appendChild(b);
      TY.$('#bAll').onclick = function () { var allOn = selKeys().length === visibleRows().length; visibleRows().forEach(function (k) { if (allOn) delete sel[k]; else sel[k] = 1; }); draw(); };
      TY.$('#bOk').onclick = function () { runBulk('approve'); };
      TY.$('#bNo').onclick = function () { runBulk('reject'); };
    }
    function runBulk(op) {
      var keys = selKeys(); if (!keys.length || busy) return;
      var isU = tab === 'signup', n = keys.length;
      var ask = op === 'approve'
        ? TY.confirm(TY.fa(n) + (isU ? ' عضویت تأیید شود؟' : ' مورد منتشر شود؟'), isU ? 'برای هر نفر لینک ورود به کانال فرستاده می‌شود.' : 'همه‌ی این موارد همین حالا در کانال @JobVacencies گذاشته می‌شود. پست‌ها یکی‌یکی فرستاده می‌شود و کمی طول می‌کشد.', 'تأیید همه').then(function (y) { return y ? '' : null; })
        : askReason((isU ? 'u' : 'i') + ':r:x', n);
      ask.then(function (reason) {
        if (reason === null) return;
        busy = true; var bo = TY.$('#bOk'), bn = TY.$('#bNo'); [bo, bn].forEach(function (b) { if (b) b.disabled = true; }); (op === 'approve' ? bo : bn).classList.add('loading');
        var users = keys.filter(function (k) { return k.charAt(0) === 'u'; }).map(function (k) { return k.slice(2); }), items = keys.filter(function (k) { return k.charAt(0) === 'i'; }).map(function (k) { return k.slice(2); });
        bulkSend(op, users, items, reason).then(function (res) {
          busy = false; var okN = 0, bad = [];
          res.forEach(function (r) {
            if (!r.ok) { bad.push(r); return; } okN++;
            if (r.t === 'u') { var u = findU(r.id); if (u) u.status = op === 'approve' ? 'approved' : 'rejected'; }
            else { var x = findI(r.id); if (x) { if (op === 'approve') x.status = 'approved'; else data.items = data.items.filter(function (y) { return y !== x; }); } }
          });
          selMode = false; sel = {}; draw();
          TY.toast(TY.fa(okN) + (op === 'approve' ? ' مورد تأیید شد' : ' مورد رد شد') + (bad.length ? ' · ' + TY.fa(bad.length) + ' ناموفق' + (bad[0].error === 'telegram' ? ' (تلگرام)' : '') : ''), bad.length ? 'err' : undefined);
          if (bad.length) load();
        });
      });
    }
    // سرور جدید: a_bulk (۳۰ تایی)؛ سرور قدیمی‌تر: یکی‌یکی با a_user / a_item
    function bulkSend(op, users, items, reason) {
      var all = users.map(function (m) { return {t: 'u', id: m}; }).concat(items.map(function (i) { return {t: 'i', id: i}; })), out = [];
      var rx = reason ? {reason: reason} : {};
      function chunk(i) {
        if (i >= all.length) return Promise.resolve(out);
        var part = all.slice(i, i + 30);
        if (feat('bulk')) {
          return call('a_bulk', Object.assign({op: op, users: part.filter(function (z) { return z.t === 'u'; }).map(function (z) { return z.id; }), items: part.filter(function (z) { return z.t === 'i'; }).map(function (z) { return z.id; })}, rx))
            .then(function (r) { if (r && r.ok) out = out.concat(r.results); else part.forEach(function (z) { out.push({t: z.t, id: z.id, ok: false, error: (r && r.error) || 'net'}); }); return chunk(i + 30); })
            .catch(function () { part.forEach(function (z) { out.push({t: z.t, id: z.id, ok: false, error: 'net'}); }); return chunk(i + 30); });
        }
        var p = Promise.resolve();
        part.forEach(function (z) {
          p = p.then(function () {
            var req = z.t === 'u' ? call('a_user', Object.assign({mobile: z.id, op: op}, rx)) : call('a_item', Object.assign({id: z.id, op: op}, rx));
            return req.then(function (r) { out.push({t: z.t, id: z.id, ok: !!(r && r.ok), error: (r && r.error) || ''}); }).catch(function () { out.push({t: z.t, id: z.id, ok: false, error: 'net'}); });
          });
        });
        return p.then(function () { return chunk(i + 30); });
      }
      return chunk(0);
    }

    /* ---------------- آمار ---------------- */
    function dur(m) { return !m ? '—' : m < 60 ? TY.fa(m) + ' دقیقه' : m < 1440 ? TY.fa(Math.round(m / 60)) + ' ساعت' : TY.fa(Math.round(m / 1440)) + ' روز'; }
    function statsView() {
      var st = data.stats, days = st.days || [], mx = 1, L = lists(), pend = L.signup.length + L.ads.length + L.cvs.filter(function (x) { return x.status === 'pending'; }).length;
      days.forEach(function (d) { mx = Math.max(mx, d.u + d.a + d.c); });
      var tot = days.reduce(function (a, d) { return {u: a.u + d.u, a: a.a + d.a, c: a.c + d.c}; }, {u: 0, a: 0, c: 0});
      function lbl(d) { try { return new Date(d + 'T12:00:00').toLocaleDateString('fa-IR', {day: 'numeric', month: 'short'}); } catch (e) { return d.slice(5); } }
      var bars = days.map(function (d) {
        var t = d.u + d.a + d.c, seg = function (n, c) { return n ? '<i style="height:' + Math.max(4, Math.round(n / mx * 100)) + 'px;background:var(' + c + ')"></i>' : ''; };
        return '<div class="bar" role="img" aria-label="' + esc(lbl(d.date || d.d) + ': ' + TY.fa(d.u) + ' عضویت، ' + TY.fa(d.a) + ' آگهی، ' + TY.fa(d.c) + ' رزومه') + '"><span class="n">' + (t ? TY.fa(t) : '') + '</span><div class="stk">' + seg(d.c, '--info') + seg(d.a, '--warn') + seg(d.u, '--brand') + '</div></div>';
      }).join('');
      return '<div class="statgrid"><div class="card flat"><div class="num h2">' + TY.fa(st.members || 0) + '</div><div class="xs muted">عضو تأییدشده</div></div>' +
        '<div class="card flat"><div class="num h2">' + dur(st.medUserMin) + '</div><div class="xs muted">زمان معمول تأیید عضویت</div></div>' +
        '<div class="card flat"><div class="num h2">' + dur(st.medItemMin) + '</div><div class="xs muted">زمان معمول انتشار آگهی</div></div>' +
        '<div class="card flat"><div class="num h2">' + TY.fa(st.userRejectPct || 0) + '٪</div><div class="xs muted">نرخ رد عضویت</div></div>' +
        '<div class="card flat"><div class="num h2">' + TY.fa(st.itemRejectPct || 0) + '٪</div><div class="xs muted">نرخ رد آگهی و رزومه</div></div>' +
        '<div class="card flat"><div class="num h2">' + TY.fa(pend) + '</div><div class="xs muted">منتظر تصمیم</div></div></div>' +
        '<div class="section-h"><h2>۱۴ روز اخیر</h2></div><div class="card flat"><div class="chart" dir="ltr">' + bars + '</div>' +
        '<div class="between xs muted" dir="ltr" style="margin-top:8px"><span dir="rtl">' + esc(lbl(days[0].d)) + '</span><span dir="rtl">' + esc(lbl(days[days.length - 1].d)) + '</span></div>' +
        '<div class="hstack legend" style="gap:14px;margin-top:10px;flex-wrap:wrap"><span><i style="background:var(--brand)"></i>عضویت ' + TY.fa(tot.u) + '</span><span><i style="background:var(--warn)"></i>آگهی ' + TY.fa(tot.a) + '</span><span><i style="background:var(--info)"></i>رزومه ' + TY.fa(tot.c) + '</span></div></div>' +
        '<p class="xs muted mt3">زمان‌ها میانه‌ی فاصله‌ی ثبت تا تأیید (حداکثر ۷ روز) است. آگهی‌های واردشده از کانال شمرده نمی‌شوند.</p>';
    }

    function findU(m) { return data.users.filter(function (u) { return u.mobile === m; })[0]; }
    function findI(id) { return data.items.filter(function (x) { return String(x.id) === String(id); })[0]; }
    // reject needs a second look (two small buttons side by side; the sender is notified). With a backend that supports it, the admin can add a reason.
    function askReason(spec, cnt) {
      var isU = spec.charAt(0) === 'u';
      if (!(data && data.features && data.features.reason)) return TY.confirm(cnt ? TY.fa(cnt) + ' مورد رد شود؟' : isU ? 'عضویت رد شود؟' : 'این مورد رد شود؟', isU ? 'کاربر خبر رد را می‌گیرد؛ بعداً می‌توانی بازگردانی کنی.' : 'فرستنده خبر رد را می‌گیرد و مورد منتشر نمی‌شود.', 'رد کن', true).then(function (y) { return y ? '' : null; });
      return new Promise(function (res) {
        var R = isU ? ['اطلاعات کامل نیست', 'نام یا شماره درست نیست', 'تکراری است', 'اسپم یا تبلیغاتی'] : ['متن کامل نیست', 'راه ارتباط ندارد', 'تکراری است', 'مناسب کانال نیست', 'اطلاعات اشتباه یا ناقص'];
        var f = document.createElement('div'); f.style.display = 'contents'; f.innerHTML = '<button class="btn outline" data-n>انصراف</button><button class="btn danger" data-y>رد کن</button>';
        var done = false, s = TY.sheet({title: (cnt ? TY.fa(cnt) + ' مورد · ' : '') + (isU ? 'دلیل رد عضویت' : 'دلیل رد'), body: '<p class="small muted" style="margin-top:0">اختیاری؛ یکی را بزن یا خودت بنویس. فرستنده این دلیل را می‌بیند.</p><div class="chips" id="rsC">' + R.map(function (x) { return '<button type="button" class="chip" aria-pressed="false" data-r="' + esc(x) + '">' + esc(x) + '</button>'; }).join('') + '</div><div class="field mt3"><textarea class="textarea" id="rsT" rows="2" placeholder="توضیح کوتاه"></textarea></div>', footer: f, onClose: function () { if (!done) res(null); }});
        s.body.addEventListener('click', function (e) { var c = e.target.closest('[data-r]'); if (!c) return; var on = c.getAttribute('aria-pressed') !== 'true'; TY.$$('[data-r]', s.body).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); c.setAttribute('aria-pressed', on); if (on) TY.$('#rsT', s.body).value = c.getAttribute('data-r'); });
        f.querySelector('[data-y]').onclick = function () { done = true; res(TY.$('#rsT', s.body).value.trim()); s.close(); };
        f.querySelector('[data-n]').onclick = function () { done = true; res(null); s.close(); };
      });
    }
    function actAsk(spec, btn) {
      if (!/^[ui]:r:/.test(spec)) return act(spec, btn);
      return askReason(spec).then(function (rs) { return rs === null ? false : act(spec, btn, rs); });
    }
    function act(spec, btn, reason) {
      var p = spec.split(':'), t = p[0], op = p[1], id = p.slice(2).join(':');
      var row = btn && btn.closest('.arow'); if (row) row.style.opacity = .45;
      if (btn) btn.classList.add('loading');
      var rx = reason ? {reason: reason} : {};
      var req = t === 'u' ? call('a_user', Object.assign({mobile: id, op: op === 'a' ? 'approve' : op === 'r' ? 'reject' : op}, rx)) : call('a_item', Object.assign({id: id, op: op === 'a' ? 'approve' : op === 'r' ? 'reject' : op}, rx));
      return req.then(function (r) {
        if (!r || !r.ok) { if (row) row.style.opacity = 1; if (btn) btn.classList.remove('loading'); TY.toast(TY.errText(r), 'err'); return false; }
        if (t === 'u') { var u = findU(id); if (u) u.status = op === 'a' ? 'approved' : op === 'r' ? 'rejected' : op === 'block' ? 'blocked' : op === 'restore' ? 'pending' : u.status; TY.toast(op === 'a' ? 'عضویت تأیید شد و لینک کانال فرستاده شد' : op === 'r' ? 'درخواست رد شد' : 'انجام شد'); }
        else { var x = findI(id); if (x) { if (op === 'a') x.status = 'approved'; else data.items = data.items.filter(function (y) { return y !== x; }); } TY.toast(op === 'a' ? 'در کانال منتشر شد' : op === 'r' ? 'رد شد' : 'حذف شد'); }
        draw(); return true;
      }).catch(function () { if (row) row.style.opacity = 1; if (btn) btn.classList.remove('loading'); TY.toast(TY.errText(), 'err'); return false; });
    }
    function dupBlock(kind, id) {
      var o = dupList(kind, id); if (!o.length) return '';
      return '<div class="banner warn" style="margin-bottom:12px">' + TY.ic('alert', 'sm') + '<div class="grow"><b>شبیه به ' + TY.fa(o.length) + ' مورد دیگر</b>' + o.slice(0, 4).map(function (z) {
        return '<div class="xs" style="margin-top:3px">' + (kind === 'u' ? '<span class="num" dir="ltr">' + TY.fa(z.mobile) + '</span> · ' + esc(z.name || '') + ' · ' + ({approved: 'تأییدشده', pending: 'در انتظار', rejected: 'رد شده', blocked: 'مسدود'}[z.status] || '') : esc(z.title || TY.titleOf(z.text) || 'بدون عنوان') + ' · ' + esc(TY.ago(z.created)) + ' · ' + TY.statusBadge(z.status)) + '</div>';
      }).join('') + '</div></div>';
    }
    function userSheet(u) {
      var f = document.createElement('div'); f.style.display = 'contents';
      f.innerHTML = (u.status !== 'approved' ? '<button class="btn primary" data-a="u:a:' + esc(u.mobile) + '">' + TY.ic('check', 'sm') + 'تأیید</button>' : '') +
        (u.status === 'pending' ? '<button class="btn danger" data-a="u:r:' + esc(u.mobile) + '">' + TY.ic('x', 'sm') + 'رد</button>' : '') +
        (u.status === 'rejected' || u.status === 'blocked' ? '<button class="btn outline" data-a="u:restore:' + esc(u.mobile) + '">بازگردانی</button>' : '') +
        (u.status !== 'blocked' ? '<button class="btn ghost" data-a="u:block:' + esc(u.mobile) + '">مسدود</button>' : '') +
        '<a class="btn outline" href="tel:' + esc(u.mobile) + '">' + TY.ic('phone', 'sm') + 'تماس</a>';
      var ints = String(u.interests || '').split(' ').filter(Boolean).map(TY.catName).join('، ');
      var s = TY.sheet({title: u.name || 'عضو', body: '<dl class="kv"><dt>موبایل</dt><dd class="num" dir="ltr" style="text-align:right">' + TY.fa(u.mobile) + '</dd><dt>نقش</dt><dd>' + (u.role === 'employer' ? 'کارفرما' : u.role === 'jobseeker' ? 'کارجو' : '—') + '</dd>' +
        '<dt>وضعیت</dt><dd>' + ({approved: 'تأییدشده', pending: 'در انتظار', rejected: 'رد شده', blocked: 'مسدود'}[u.status] || u.status) + '</dd><dt>ثبت‌نام</dt><dd>' + esc(TY.ago(u.created)) + '</dd>' +
        '<dt>تلگرام</dt><dd>' + (u.tg ? (u.tg_user ? '<a href="https://t.me/' + esc(u.tg_user) + '" target="_blank" rel="noopener" dir="ltr">@' + esc(u.tg_user) + '</a>' : 'متصل') + (u.verified ? ' · شماره تأییدشده' : '') : 'متصل نشده') + '</dd>' +
        '<dt>شهر</dt><dd>' + esc(u.city || '—') + '</dd><dt>حوزه‌ها</dt><dd>' + esc(ints || '—') + '</dd>' + (u.reason ? '<dt>دلیل رد</dt><dd>' + esc(u.reason) + '</dd>' : '') + '</dl>' + dupBlock('u', u.mobile) +
        '<div class="list mt4">' + data.items.filter(function (x) { return x.owner === u.mobile; }).map(function (x) { return itemRow(x, false); }).join('') + '</div>', footer: f});
      f.addEventListener('click', function (e) { var b = e.target.closest('[data-a]'); if (!b) return; actAsk(b.getAttribute('data-a'), b).then(function (ok) { if (ok) s.close(); }); });
      s.body.addEventListener('click', function (e) { var r = e.target.closest('[data-i]'); if (r) { s.close(); setTimeout(function () { itemSheet(findI(r.getAttribute('data-i'))); }, 320); } });
    }
    /* ---------------- پیش‌نمایش پست کانال و ویرایش ---------------- */
    function localPreview(x, text) {
      var t = String(text != null ? text : x.text || ''), link = false;
      if (x.type === 'employer' && x.owner && t.indexOf('takhassosyab.ir') < 0) { t += '\n\n📩 ارسال رزومه از برنامه: https://takhassosyab.ir/jobs.html?id=' + x.id; link = true; }
      return {ok: true, text: t, chars: t.length, over: t.length > 4000, link: link, posted: !!(x.msg_id && x.status === 'approved')};
    }
    function previewSheet(x, text) {
      var s = TY.sheet({title: 'پیش‌نمایش پست کانال', body: '<div class="skitem"><div class="sk" style="width:60%"></div><div class="sk"></div><div class="sk" style="width:80%"></div></div>'});
      var get = feat('preview') ? call('a_preview', {id: x.id, text: text != null ? text : undefined}).then(function (r) { return r && r.ok ? r : localPreview(x, text); }).catch(function () { return localPreview(x, text); }) : Promise.resolve(localPreview(x, text));
      get.then(function (r) {
        s.body.innerHTML = '<div class="tgpost"><div class="tgh"><span class="avatar" style="width:30px;height:30px;font-size:13px">ت</span><b dir="ltr">' + esc(TY.CHANNEL ? '@' + String(TY.CHANNEL).replace('@', '') : '@JobVacencies') + '</b></div><div class="tgb">' + TY.linkify(r.text) + '</div></div>' +
          '<div class="xs muted mt3 between"><span>' + TY.fa(r.chars) + ' از ' + TY.fa(4000) + ' نویسه</span><span>' + (r.posted ? 'در کانال هست؛ با ذخیره، همین پست ویرایش می‌شود' : 'بعد از تأیید همین‌طور منتشر می‌شود') + '</span></div>' +
          (r.over ? '<div class="banner warn mt3">' + TY.ic('alert', 'sm') + '<div class="grow"><b>متن بلندتر از حد تلگرام است</b>ادامه‌ی متن بعد از ۴۰۰۰ نویسه بریده می‌شود. بهتر است قبل از انتشار کوتاهش کنی.</div></div>' : '') +
          (r.link ? '<p class="xs muted mt3">خط «ارسال رزومه از برنامه» را خودکار اضافه می‌کنیم تا کارجوها از کانال مستقیم رزومه بفرستند.</p>' : '');
      });
    }
    function editSheet(x) {
      var f = document.createElement('div'); f.style.display = 'contents';
      f.innerHTML = '<button class="btn primary" id="edGo">' + TY.ic('check', 'sm') + 'ذخیره</button><button class="btn outline" id="edPv">' + TY.ic('eye', 'sm') + 'پیش‌نمایش</button>';
      var s = TY.sheet({title: 'ویرایش ' + (x.type === 'employer' ? 'آگهی' : 'رزومه'), body: '<div class="field"><label for="edT">عنوان</label><input class="input" id="edT" value="' + esc(x.title || '') + '" maxlength="120"></div>' +
        '<div class="field"><label for="edC">شهر</label><input class="input" id="edC" value="' + esc(x.city || '') + '" maxlength="60"></div>' +
        '<div class="field"><label for="edX">متن کامل</label><textarea class="textarea" id="edX" rows="12" style="min-height:220px">' + esc(x.text || '') + '</textarea></div>' +
        '<p class="xs muted">' + (x.msg_id && x.status === 'approved' ? 'این مورد در کانال هست؛ با ذخیره، پست کانال هم ویرایش می‌شود.' : 'تغییرها قبل از انتشار روی متن نهایی اثر می‌گذارد.') + (x.owner ? ' فرستنده خبر ویرایش را می‌گیرد.' : '') + '</p>', footer: f});
      f.querySelector('#edPv').onclick = function () { previewSheet(x, TY.$('#edX', s.body).value); };
      f.querySelector('#edGo').onclick = function () {
        var b = this, t = TY.$('#edT', s.body).value.trim(), c = TY.$('#edC', s.body).value.trim(), tx = TY.$('#edX', s.body).value.trim();
        if (tx.length < 10) { TY.toast('متن کامل نیست', 'err'); return; }
        b.classList.add('loading');
        call('a_item', {op: 'edit', id: x.id, title: t, city: c, text: tx}).then(function (r) {
          b.classList.remove('loading');
          if (!r || !r.ok) { TY.toast(TY.errText(r), 'err'); return; }
          if (r.item) { x.title = r.item.title; x.text = r.item.text; x.cat = r.item.cat; x.city = r.item.city; }
          s.close(); draw();
          TY.toast(r.unchanged ? 'تغییری نبود' : r.channel === true ? 'ذخیره شد و پست کانال به‌روز شد' : r.channel === false ? 'ذخیره شد، ولی پست کانال به‌روز نشد' : 'ذخیره شد', r.channel === false ? 'err' : undefined);
        }).catch(function () { b.classList.remove('loading'); TY.toast(TY.errText(), 'err'); });
      };
    }
    function itemSheet(x) {
      if (!x) return;
      var f = document.createElement('div'); f.style.display = 'contents';
      var pend = x.status === 'pending';
      f.innerHTML = (pend ? '<button class="btn primary" data-a="i:a:' + esc(x.id) + '">' + TY.ic('send', 'sm') + 'تأیید و انتشار</button><button class="btn danger" data-a="i:r:' + esc(x.id) + '">' + TY.ic('x', 'sm') + 'رد</button>' :
        '<button class="btn danger" data-a="i:delete:' + esc(x.id) + '">' + TY.ic('trash', 'sm') + (x.msg_id ? 'حذف از همه‌جا' : 'حذف') + '</button>') +
        '<button class="btn outline" data-prev>' + TY.ic('eye', 'sm') + 'پیش‌نمایش پست</button>' + (feat('edit') ? '<button class="btn outline" data-edit>' + TY.ic('edit', 'sm') + 'ویرایش</button>' : '') +
        '<button class="btn outline" data-copy>' + TY.ic('copy', 'sm') + 'کپی</button>' + (x.msg_id ? '<a class="btn ghost" target="_blank" rel="noopener" href="https://t.me/' + TY.CHANNEL + '/' + esc(x.msg_id) + '">' + TY.ic('external', 'sm') + 'کانال</a>' : '');
      var tgt = x.target ? findI(x.target) : null;
      var s = TY.sheet({title: x.title || TY.titleOf(x.text) || 'بدون عنوان', body: '<div class="hstack" style="flex-wrap:wrap;gap:6px;margin-bottom:12px">' + TY.statusBadge(x.status) +
        '<span class="badge">' + (x.type === 'employer' ? 'آگهی' : 'رزومه') + '</span>' + String(x.cat || '').split(' ').filter(Boolean).map(function (c) { return '<span class="badge">' + esc(TY.catName(c)) + '</span>'; }).join('') + '</div>' +
        '<dl class="kv" style="margin-bottom:14px"><dt>فرستنده</dt><dd>' + (x.owner ? esc(x.ownerName || '') + ' <a class="num" dir="ltr" href="tel:' + esc(x.owner) + '">' + TY.fa(x.owner) + '</a>' : (x.src === 'channel' ? 'پست کانال' : '—')) + '</dd><dt>زمان</dt><dd>' + esc(TY.ago(x.created)) + '</dd>' +
        (tgt ? '<dt>برای آگهی</dt><dd>' + esc(tgt.title) + '</dd>' : '') + '</dl>' + dupBlock('i', x.id) + '<div class="preview" style="max-height:none">' + TY.linkify(x.text) + '</div>', footer: f});
      f.addEventListener('click', function (e) {
        if (e.target.closest('[data-copy]')) { TY.copy(x.text); return; }
        if (e.target.closest('[data-prev]')) { previewSheet(x); return; }
        if (e.target.closest('[data-edit]')) { s.close(); setTimeout(function () { editSheet(x); }, 320); return; }
        var b = e.target.closest('[data-a]'); if (!b) return;
        var spec = b.getAttribute('data-a');
        var go = function () { actAsk(spec, b).then(function (ok) { if (ok) s.close(); }); };
        if (spec.indexOf(':delete:') > 0) TY.confirm('حذف شود؟', x.msg_id ? 'از برنامه و کانال تلگرام هم پاک می‌شود.' : 'از برنامه پاک می‌شود.', 'حذف', true).then(function (y) { if (y) go(); }); else go();
      });
    }
    /* ---------------- پیامک (وضعیت؛ کلید فقط در Script Properties است، اینجا نه نشان داده می‌شود و نه وارد) ---------------- */
    var PROV = {ghasedak: 'قاصدک', kavenegar: 'کاوه‌نگار', relay: 'رله (سرور واسط)'};
    function smsCard(st) {
      if (!st || !st.ok) return '<div class="card flat mt3"><div class="h3">پیامک ورود</div><p class="small muted" style="margin:6px 0 0">وضعیت پیامک خوانده نشد.</p></div>';
      var pct = st.cap ? Math.min(100, Math.round(100 * st.today / st.cap)) : 0, hot = pct >= 80;
      return '<div class="card flat mt3" id="smsCard"><div class="between"><div class="h3">پیامک ورود (SMS)</div><span class="badge ' + (st.configured ? 'ok' : '') + '">' + (st.configured ? 'فعال' : 'تنظیم نشده') + '</span></div>' +
        (st.configured ? '<dl class="kv" style="margin-top:10px"><dt>ارائه‌دهنده</dt><dd>' + esc(PROV[st.provider] || st.provider) + '</dd>' +
          '<dt>امروز</dt><dd><span class="num">' + TY.fa(st.today) + '</span> از <span class="num">' + TY.fa(st.cap) + '</span> پیامک' +
          '<div style="height:6px;border-radius:3px;background:var(--line,#0002);margin-top:6px;overflow:hidden"><i style="display:block;height:100%;width:' + pct + '%;background:var(' + (hot ? '--danger' : '--brand') + ')"></i></div></dd>' +
          '<dt>آخرین ارسال موفق</dt><dd>' + (st.lastOk ? esc(TY.ago(st.lastOk)) : '—') + '</dd>' +
          '<dt>آخرین خطا</dt><dd' + (st.lastError ? ' style="color:var(--danger)"' : '') + '>' + (st.lastError ? '<span dir="ltr" style="display:inline-block;text-align:left">' + esc(st.lastError) + '</span> · ' + esc(TY.ago(st.lastErrorAt)) : 'بدون خطا') + '</dd></dl>' :
          '<p class="small muted" style="margin:8px 0 0">ورود فعلاً فقط با تلگرام است. برای فعال‌سازی، در Apps Script ▸ Project Settings ▸ Script properties این‌ها را بگذار: <span dir="ltr" class="num">SMS_PROVIDER</span>، <span dir="ltr" class="num">SMS_API_KEY</span>، <span dir="ltr" class="num">SMS_TEMPLATE</span>. کلید هرگز در این پنل وارد نمی‌شود.</p>') + '</div>';
    }
    function loadSms(box) {
      if (!box || !feat('smsAdmin')) return;
      box.innerHTML = '<div class="card flat mt3"><div class="sk" style="width:50%"></div></div>';
      call('a_sms').then(function (r) { if (box.isConnected) box.innerHTML = smsCard(r); }).catch(function () { if (box.isConnected) box.innerHTML = smsCard(null); });
    }
    function smsSheet() { var s = TY.sheet({title: 'وضعیت پیامک', body: '<div id="smsBox2"></div>'}); loadSms(s.el.querySelector('#smsBox2')); }
    function more() {
      var s = TY.sheet({title: 'ابزارها', body: '<div class="list">' +
        '<a class="row" target="_blank" rel="noopener" href="' + esc(data.adminLink) + '"><span class="tile-ic brand">' + TY.ic('send', 'sm') + '</span><div class="grow"><div class="t">اتصال تلگرام من</div><div class="s">درخواست‌ها با دکمه‌ی ✅/❌ در تلگرام می‌آید · ' + TY.fa((data.admins || []).length) + ' ادمین متصل</div></div>' + TY.ic('external', 'sm chev') + '</a>' +
        '<button class="row" id="mAdd"><span class="tile-ic">' + TY.ic('plus', 'sm') + '</span><div class="grow"><div class="t">افزودن آگهی تلگرامی به برنامه</div><div class="s">برای آگهی‌هایی که مستقیم در کانال گذاشته‌ای</div></div>' + TY.ic('fwd', 'sm chev') + '</button>' +
        '<button class="row" id="mLog"><span class="tile-ic">' + TY.ic('clock', 'sm') + '</span><div class="grow"><div class="t">رویدادهای اخیر</div></div>' + TY.ic('fwd', 'sm chev') + '</button>' +
        '<button class="row" id="mPref"><span class="tile-ic">' + TY.ic('bell', 'sm') + '</span><div class="grow"><div class="t">تنظیمات اعلان ادمین</div><div class="s">انتخاب کن چه چیزهایی برای خودت بیاید</div></div>' + TY.ic('fwd', 'sm chev') + '</button>' +
        (feat('smsAdmin') ? '<button class="row" id="mSms"><span class="tile-ic">' + TY.ic('send', 'sm') + '</span><div class="grow"><div class="t">وضعیت پیامک ورود</div><div class="s">مصرف امروز، سقف و آخرین خطا</div></div>' + TY.ic('fwd', 'sm chev') + '</button>' : '') +
        '<button class="row" id="mAdm"><span class="tile-ic">' + TY.ic('shield', 'sm') + '</span><div class="grow"><div class="t">مدیریت ادمین‌ها</div><div class="s">' + TY.fa((data.adminPeople || []).length) + ' ادمین · افزودن با شماره‌ی موبایل</div></div>' + TY.ic('fwd', 'sm chev') + '</button>' +
        '<a class="row" href="enter.html"><span class="tile-ic">' + TY.ic('eye', 'sm') + '</span><div class="grow"><div class="t">دیدن نسخه‌ی کاربر</div></div>' + TY.ic('fwd', 'sm chev') + '</a>' +
        '<button class="row" id="mOut" style="color:var(--danger)"><span class="tile-ic danger">' + TY.ic('logout', 'sm') + '</span><div class="grow"><div class="t">خروج از پنل</div></div></button></div>' +
        ((data.admins || []).length ? '<p class="xs muted mt3">ادمین‌های متصل: ' + data.admins.map(function (a) { return esc(a.username ? '@' + a.username : a.name); }).join('، ') + '</p>' : '')});
      s.el.querySelector('#mOut').onclick = function () { TY.store.del('akey'); TY.store.del('adata'); s.close(); KEY = ''; data = null; if (viaToken) { location.href = 'me.html'; return; } loginView(); };
      s.el.querySelector('#mPref').onclick = function () {
        s.close();
        if (!viaToken && !(TY.user() && TY.user().isAdmin)) { setTimeout(function () { TY.toast('برای تنظیم اعلان، با حساب ادمین‌ات وارد برنامه شو', 'err'); }, 320); return; }
        setTimeout(function () { TY.adminPrefsSheet(); }, 320);
      };
      s.el.querySelector('#mAdm').onclick = function () { s.close(); setTimeout(adminsSheet, 320); };
      var mS = s.el.querySelector('#mSms'); if (mS) mS.onclick = function () { s.close(); setTimeout(smsSheet, 320); };
      s.el.querySelector('#mAdd').onclick = function () { s.close(); setTimeout(addSheet, 320); };
      s.el.querySelector('#mLog').onclick = function () { s.close(); setTimeout(logSheet, 320); };
    }
    function adminsSheet() {
      var people = data.adminPeople || [];
      var f = document.createElement('div'); f.style.display = 'contents'; f.innerHTML = '<button class="btn primary" id="aaGo">' + TY.ic('plus', 'sm') + 'افزودن ادمین</button>';
      var s = TY.sheet({title: 'مدیریت ادمین‌ها', body: '<p class="small muted" style="margin-top:0">ادمین‌ها در «حساب من» نقش ادمین و پنل را می‌بینند. نفر جدید باید در برنامه عضو و تأییدشده باشد و شماره‌اش را با ربات تلگرام تأیید کرده باشد (دکمه‌ی «تأیید شماره»).</p>' +
        '<div id="aaList" class="list">' + adminRows(people) + '</div>' +
        '<div class="field mt4"><label for="aaM">شماره‌ی موبایل ادمین جدید</label><input class="input ltr num" id="aaM" inputmode="tel" placeholder="۰۹۱۲۳۴۵۶۷۸۹" autocomplete="off"></div>', footer: f});
      function adminRows(ps) {
        return ps.map(function (a) {
          return '<div class="row" style="cursor:default"><span class="avatar">' + esc(TY.initial(a.name || 'ا')) + '</span><div class="grow"><div class="t">' + esc(a.name || 'هنوز ثبت‌نام نکرده') + '</div>' +
            '<div class="s"><span class="num" dir="ltr">' + TY.fa(a.mobile) + '</span> · ' + (a.owner ? 'مالک' : a.active ? 'فعال' : !a.registered ? 'منتظر ثبت‌نام' : 'منتظر تأیید شماره') + '</div></div>' +
            (a.owner ? '<span class="badge brand">مالک</span>' : '<button class="iconbtn act no" data-rm="' + esc(a.mobile) + '" aria-label="حذف ادمین" title="حذف ادمین">' + TY.ic('x', 'sm') + '</button>') + '</div>';
        }).join('') || '<div class="small muted">ادمینی ثبت نشده.</div>';
      }
      function done(r, msg) { if (r && r.ok) { data.adminPeople = r.admins; TY.$('#aaList', s.body).innerHTML = adminRows(r.admins); TY.toast(msg); } else TY.toast(TY.errText(r), 'err'); }
      f.querySelector('#aaGo').onclick = function () {
        var b = this, m = TY.$('#aaM', s.body).value.trim(); if (!m) return; b.classList.add('loading');
        call('a_user', {op: 'make_admin', mobile: TY.en(m)}).then(function (r) { b.classList.remove('loading'); if (r && r.ok) TY.$('#aaM', s.body).value = ''; done(r, r.registered === false ? 'اضافه شد؛ بعد از ثبت‌نام فعال می‌شود' : 'ادمین اضافه شد'); }).catch(function () { b.classList.remove('loading'); TY.toast(TY.errText(), 'err'); });
      };
      s.body.addEventListener('click', function (e) {
        var x = e.target.closest('[data-rm]'); if (!x) return;
        TY.confirm('حذف ادمین؟', 'این شماره دیگر به پنل دسترسی ندارد.', 'حذف', true).then(function (y) { if (y) call('a_user', {op: 'remove_admin', mobile: x.getAttribute('data-rm')}).then(function (r) { done(r, 'ادمین حذف شد'); }); });
      });
    }
    function addSheet() {
      var f = document.createElement('div'); f.style.display = 'contents'; f.innerHTML = '<button class="btn primary" id="ad">افزودن</button>';
      var s = TY.sheet({title: 'افزودن آگهی', body: '<div class="seg" style="margin-bottom:12px"><button data-ty="employer" aria-selected="true">آگهی استخدام</button><button data-ty="jobseeker" aria-selected="false">رزومه</button></div>' +
        '<div class="field"><label for="at">عنوان</label><input class="input" id="at"></div><div class="field"><label for="ax">متن</label><textarea class="textarea" id="ax" rows="8" placeholder="متن کامل همراه با هشتگ‌ها"></textarea></div>' +
        '<label class="between card flat" style="cursor:pointer"><span class="small"><b>در کانال هم منتشر شود</b></span><span class="toggle"><input type="checkbox" id="ap"><span></span></span></label>', footer: f});
      var ty = 'employer';
      s.body.onclick = function (e) { var b = e.target.closest('[data-ty]'); if (!b) return; ty = b.getAttribute('data-ty'); TY.$$('[data-ty]', s.body).forEach(function (x) { x.setAttribute('aria-selected', x === b); }); };
      f.querySelector('#ad').onclick = function () {
        var b = this, t = TY.$('#at', s.body).value.trim(), x = TY.$('#ax', s.body).value.trim();
        if (x.length < 10) { TY.toast('متن کامل نیست', 'err'); return; }
        b.classList.add('loading');
        call('a_add', {type: ty, title: t, text: x, post: TY.$('#ap', s.body).checked}).then(function (r) { b.classList.remove('loading'); if (r && r.ok) { s.close(); TY.toast('اضافه شد'); load(); } else TY.toast(TY.errText(r), 'err'); });
      };
    }
    function logSheet() {
      var ns = data.notifs || [];
      TY.sheet({title: 'رویدادهای اخیر', body: ns.length ? '<div class="list">' + ns.map(function (n) { return '<div class="row" style="cursor:default"><span class="tile-ic">' + TY.ic(n.kind === 'signup' ? 'user' : n.kind === 'item' ? 'briefcase' : 'bell', 'sm') + '</span><div class="grow"><div class="t" style="white-space:normal">' + esc(n.title) + '</div><div class="s">' + esc(TY.ago(n.created)) + '</div></div></div>'; }).join('') + '</div>' : TY.empty('clock', 'رویدادی نیست', '')});
    }

    main.addEventListener('keydown', function (e) { if (selMode && (e.key === ' ' || e.key === 'Enter') && e.target.classList && e.target.classList.contains('arow')) { e.preventDefault(); e.target.click(); } });
    main.addEventListener('click', function (e) {
      var sb = e.target.closest('#aSel'); if (sb) { selMode = !selMode; sel = {}; draw(); return; }
      if (selMode) { var rw = e.target.closest('.arow'); if (rw) { var k = rw.hasAttribute('data-u') ? 'u:' + rw.getAttribute('data-u') : 'i:' + rw.getAttribute('data-i'); if (sel[k]) delete sel[k]; else sel[k] = 1; var pos = window.pageYOffset; draw(); window.scrollTo(0, pos); return; } }
      var a = e.target.closest('[data-act]'); if (a) { e.stopPropagation(); actAsk(a.getAttribute('data-act'), a); return; }
      var t = e.target.closest('[data-tab]'); if (t) { tab = t.getAttribute('data-tab'); q = ''; selMode = false; sel = {}; draw(); return; }
      var mf = e.target.closest('[data-mf]'); if (mf) { mfilter = mf.getAttribute('data-mf'); draw(); return; }
      var u = e.target.closest('[data-u]'); if (u) { userSheet(findU(u.getAttribute('data-u'))); return; }
      var i = e.target.closest('[data-i]'); if (i) { itemSheet(findI(i.getAttribute('data-i'))); }
    });
    TY.$('#aRef').onclick = function () { var b = this; b.classList.add('spin'); load().then(function () { b.classList.remove('spin'); TY.toast('به‌روز شد'); }); };
    TY.$('#aMore').onclick = more;

    if (!KEY) {
      // بدون رمز: اگر با حساب ادمین وارد برنامه شده‌ای، توکن همان حساب کافی است (رمز فقط روی سرور می‌ماند)
      var sess = TY.session(), cu = TY.user();
      if (!sess) { loginView(); return; }
      main.innerHTML = TY.skeleton(5);
      (cu && cu.isAdmin ? Promise.resolve({user: cu}) : TY.me()).then(function (m) {
        if (m && m.user && m.user.isAdmin) { viaToken = true; var c0 = TY.store.get('adata'); if (c0 && c0.users) { data = c0; draw(); } load(); timer = setInterval(function () { if (document.visibilityState === 'visible' && viaToken && data) load(); }, 30000); }
        else loginView();
      }).catch(function () { loginView(); });
      return;
    }
    var cached = TY.store.get('adata'); if (cached && cached.users) { data = cached; draw(); } else main.innerHTML = TY.skeleton(5);
    load();
    timer = setInterval(function () { if (document.visibilityState === 'visible' && KEY && data) load(); }, 30000);
  };
})();
