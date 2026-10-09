/* admin dashboard — compact, dense, server-validated key */
(function () {
  'use strict';
  var TY = window.TY, esc = TY.esc;
  TY.adminPage = function () {
    var KEY = TY.store.get('akey', ''), viaToken = false, data = null, tab = 'signup', q = '', mfilter = 'all', timer;
    var top = TY.shell({title: 'پنل ادمین', bell: false,
      actions: '<button class="iconbtn" id="aRef" aria-label="به‌روزرسانی" hidden>' + TY.ic('refresh') + '</button><button class="iconbtn" id="aMore" aria-label="بیشتر" hidden>' + TY.ic('more') + '</button>'});
    var main = TY.$('main');
    main.style.maxWidth = '980px';

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
    function userRow(u, inline) {
      return '<div class="row arow" data-u="' + esc(u.mobile) + '"><span class="avatar">' + esc(TY.initial(u.name)) + '</span><div class="grow"><div class="t">' + esc(u.name || 'بدون نام') + '</div>' +
        '<div class="s"><span class="num" dir="ltr">' + TY.fa(u.mobile) + '</span> · ' + (u.role === 'employer' ? 'کارفرما' : u.role === 'jobseeker' ? 'کارجو' : 'نقش نامشخص') + ' · ' + TY.ago(u.created) + (u.tg ? ' · <span style="color:var(--brand-text)">تلگرام' + (u.verified ? ' ✓' : '') + '</span>' : '') + '</div></div>' +
        (inline ? acts('u', u.mobile) : '<span class="badge dotted ' + ({approved: 'brand', pending: 'warn', rejected: 'danger', blocked: 'danger'}[u.status] || '') + '">' + ({approved: 'تأییدشده', pending: 'در انتظار', rejected: 'رد شده', blocked: 'مسدود'}[u.status] || u.status) + '</span>') + '</div>';
    }
    function itemRow(x, inline) {
      var cats = String(x.cat || '').split(' ').filter(function (c) { return c && c !== '#دورکاری'; }).map(TY.catName).slice(0, 1).join('');
      var vis = x.status === 'private' ? '<span class="badge info">فقط ادمین</span>' : x.status === 'direct' ? '<span class="badge info">مستقیم</span>' : '';
      return '<div class="row arow" data-i="' + esc(x.id) + '"><span class="tile-ic ' + (x.type === 'employer' ? '' : 'info') + '">' + TY.ic(x.type === 'employer' ? 'briefcase' : 'resume', 'sm') + '</span><div class="grow"><div class="t">' + esc(x.title || TY.titleOf(x.text) || 'بدون عنوان') + '</div>' +
        '<div class="s">' + esc([x.ownerName || (x.src === 'channel' ? 'از کانال' : x.src === 'form-v1' ? 'فرم قدیمی' : ''), cats, TY.ago(x.created)].filter(Boolean).join(' · ')) + '</div></div>' +
        (inline && x.status === 'pending' ? acts('i', x.id) : vis || (x.status === 'approved' ? '' : TY.statusBadge(x.status))) + '</div>';
    }
    function acts(t, id) {
      return '<div class="hstack" style="gap:6px"><button class="iconbtn act ok" data-act="' + t + ':a:' + esc(id) + '" aria-label="تأیید" title="تأیید">' + TY.ic('check', 'sm') + '</button>' +
        '<button class="iconbtn act no" data-act="' + t + ':r:' + esc(id) + '" aria-label="رد" title="رد">' + TY.ic('x', 'sm') + '</button></div>';
    }

    function draw() {
      TY.$('#aRef').hidden = TY.$('#aMore').hidden = false;
      var L = lists();
      var T = [['signup', 'عضویت', L.signup.length, true], ['ads', 'آگهی‌ها', L.ads.length, true], ['cvs', 'رزومه‌ها', L.cvs.filter(function (x) { return x.status === 'pending'; }).length, true], ['pub', 'منتشرشده', L.pub.length], ['members', 'اعضا', L.members.filter(function (u) { return u.status === 'approved'; }).length]];
      var pendTotal = L.signup.length + L.ads.length + L.cvs.filter(function (x) { return x.status === 'pending'; }).length;
      var tgN = (data.admins || []).length;
      var h = '<div class="between" style="margin:8px 2px 12px"><div><div class="h3">' + (pendTotal ? TY.fa(pendTotal) + ' مورد منتظر تصمیم توست' : 'همه‌چیز بررسی شده') + '</div>' +
        '<div class="xs muted">' + TY.fa(L.members.filter(function (u) { return u.status === 'approved'; }).length) + ' عضو · ' + TY.fa(L.pub.length) + ' منتشرشده · ادمین تلگرام: ' + TY.fa(tgN) + '</div></div>' +
        (tgN ? '' : '<a class="btn primary sm" target="_blank" rel="noopener" href="' + esc(data.adminLink) + '">' + TY.ic('send', 'xs') + 'اتصال تلگرام</a>') + '</div>';
      h += '<div class="tabs" role="tablist">' + T.map(function (t) {
        return '<button role="tab" data-tab="' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + t[1] + (t[2] ? ' <span class="cnt' + (t[3] && t[2] ? ' hot' : '') + '">' + TY.fa(t[2]) + '</span>' : '') + '</button>';
      }).join('') + '</div>';
      h += '<div class="hstack" style="margin:12px 0"><label class="inputwrap" style="flex:1">' + TY.ic('search', 'sm') + '<input class="input" id="aq" type="search" placeholder="جستجوی نام، موبایل یا متن" value="' + esc(q) + '"></label></div>';
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
      var aq = TY.$('#aq'); aq.oninput = TY.debounce(function () { q = aq.value; var pos = aq.selectionStart; draw(); var n = TY.$('#aq'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} }, 200);
    }

    function findU(m) { return data.users.filter(function (u) { return u.mobile === m; })[0]; }
    function findI(id) { return data.items.filter(function (x) { return String(x.id) === String(id); })[0]; }
    function act(spec, btn) {
      var p = spec.split(':'), t = p[0], op = p[1], id = p.slice(2).join(':');
      var row = btn && btn.closest('.arow'); if (row) row.style.opacity = .45;
      if (btn) btn.classList.add('loading');
      var req = t === 'u' ? call('a_user', {mobile: id, op: op === 'a' ? 'approve' : op === 'r' ? 'reject' : op}) : call('a_item', {id: id, op: op === 'a' ? 'approve' : op === 'r' ? 'reject' : op});
      return req.then(function (r) {
        if (!r || !r.ok) { if (row) row.style.opacity = 1; if (btn) btn.classList.remove('loading'); TY.toast(TY.errText(r), 'err'); return false; }
        if (t === 'u') { var u = findU(id); if (u) u.status = op === 'a' ? 'approved' : op === 'r' ? 'rejected' : op === 'block' ? 'blocked' : op === 'restore' ? 'pending' : u.status; TY.toast(op === 'a' ? 'عضویت تأیید شد و لینک کانال فرستاده شد' : op === 'r' ? 'درخواست رد شد' : 'انجام شد'); }
        else { var x = findI(id); if (x) { if (op === 'a') x.status = 'approved'; else data.items = data.items.filter(function (y) { return y !== x; }); } TY.toast(op === 'a' ? 'در کانال منتشر شد' : op === 'r' ? 'رد شد' : 'حذف شد'); }
        draw(); return true;
      }).catch(function () { if (row) row.style.opacity = 1; if (btn) btn.classList.remove('loading'); TY.toast(TY.errText(), 'err'); return false; });
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
        '<dt>شهر</dt><dd>' + esc(u.city || '—') + '</dd><dt>حوزه‌ها</dt><dd>' + esc(ints || '—') + '</dd></dl>' +
        '<div class="list mt4">' + data.items.filter(function (x) { return x.owner === u.mobile; }).map(function (x) { return itemRow(x, false); }).join('') + '</div>', footer: f});
      f.addEventListener('click', function (e) { var b = e.target.closest('[data-a]'); if (!b) return; act(b.getAttribute('data-a'), b).then(function (ok) { if (ok) s.close(); }); });
      s.body.addEventListener('click', function (e) { var r = e.target.closest('[data-i]'); if (r) { s.close(); setTimeout(function () { itemSheet(findI(r.getAttribute('data-i'))); }, 320); } });
    }
    function itemSheet(x) {
      if (!x) return;
      var f = document.createElement('div'); f.style.display = 'contents';
      var pend = x.status === 'pending';
      f.innerHTML = (pend ? '<button class="btn primary" data-a="i:a:' + esc(x.id) + '">' + TY.ic('send', 'sm') + 'تأیید و انتشار</button><button class="btn danger" data-a="i:r:' + esc(x.id) + '">' + TY.ic('x', 'sm') + 'رد</button>' :
        '<button class="btn danger" data-a="i:delete:' + esc(x.id) + '">' + TY.ic('trash', 'sm') + (x.msg_id ? 'حذف از همه‌جا' : 'حذف') + '</button>') +
        '<button class="btn outline" data-copy>' + TY.ic('copy', 'sm') + 'کپی</button>' + (x.msg_id ? '<a class="btn ghost" target="_blank" rel="noopener" href="https://t.me/' + TY.CHANNEL + '/' + esc(x.msg_id) + '">' + TY.ic('external', 'sm') + 'کانال</a>' : '');
      var tgt = x.target ? findI(x.target) : null;
      var s = TY.sheet({title: x.title || TY.titleOf(x.text) || 'بدون عنوان', body: '<div class="hstack" style="flex-wrap:wrap;gap:6px;margin-bottom:12px">' + TY.statusBadge(x.status) +
        '<span class="badge">' + (x.type === 'employer' ? 'آگهی' : 'رزومه') + '</span>' + String(x.cat || '').split(' ').filter(Boolean).map(function (c) { return '<span class="badge">' + esc(TY.catName(c)) + '</span>'; }).join('') + '</div>' +
        '<dl class="kv" style="margin-bottom:14px"><dt>فرستنده</dt><dd>' + (x.owner ? esc(x.ownerName || '') + ' <a class="num" dir="ltr" href="tel:' + esc(x.owner) + '">' + TY.fa(x.owner) + '</a>' : (x.src === 'channel' ? 'پست کانال' : '—')) + '</dd><dt>زمان</dt><dd>' + esc(TY.ago(x.created)) + '</dd>' +
        (tgt ? '<dt>برای آگهی</dt><dd>' + esc(tgt.title) + '</dd>' : '') + '</dl><div class="preview" style="max-height:none">' + TY.linkify(x.text) + '</div>', footer: f});
      f.addEventListener('click', function (e) {
        if (e.target.closest('[data-copy]')) { TY.copy(x.text); return; }
        var b = e.target.closest('[data-a]'); if (!b) return;
        var spec = b.getAttribute('data-a');
        var go = function () { act(spec, b).then(function (ok) { if (ok) s.close(); }); };
        if (spec.indexOf(':delete:') > 0) TY.confirm('حذف شود؟', x.msg_id ? 'از برنامه و کانال تلگرام هم پاک می‌شود.' : 'از برنامه پاک می‌شود.', 'حذف', true).then(function (y) { if (y) go(); }); else go();
      });
    }
    function more() {
      var s = TY.sheet({title: 'ابزارها', body: '<div class="list">' +
        '<a class="row" target="_blank" rel="noopener" href="' + esc(data.adminLink) + '"><span class="tile-ic brand">' + TY.ic('send', 'sm') + '</span><div class="grow"><div class="t">اتصال تلگرام من</div><div class="s">درخواست‌ها با دکمه‌ی ✅/❌ در تلگرام می‌آید · ' + TY.fa((data.admins || []).length) + ' ادمین متصل</div></div>' + TY.ic('external', 'sm chev') + '</a>' +
        '<button class="row" id="mAdd"><span class="tile-ic">' + TY.ic('plus', 'sm') + '</span><div class="grow"><div class="t">افزودن آگهی تلگرامی به برنامه</div><div class="s">برای آگهی‌هایی که مستقیم در کانال گذاشته‌ای</div></div>' + TY.ic('fwd', 'sm chev') + '</button>' +
        '<button class="row" id="mLog"><span class="tile-ic">' + TY.ic('clock', 'sm') + '</span><div class="grow"><div class="t">رویدادهای اخیر</div></div>' + TY.ic('fwd', 'sm chev') + '</button>' +
        '<button class="row" id="mPref"><span class="tile-ic">' + TY.ic('bell', 'sm') + '</span><div class="grow"><div class="t">تنظیمات اعلان ادمین</div><div class="s">انتخاب کن چه چیزهایی برای خودت بیاید</div></div>' + TY.ic('fwd', 'sm chev') + '</button>' +
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

    main.addEventListener('click', function (e) {
      var a = e.target.closest('[data-act]'); if (a) { e.stopPropagation(); act(a.getAttribute('data-act'), a); return; }
      var t = e.target.closest('[data-tab]'); if (t) { tab = t.getAttribute('data-tab'); q = ''; draw(); return; }
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
