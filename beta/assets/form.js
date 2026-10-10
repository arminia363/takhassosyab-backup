/* multi-step builder for employer ads & resumes — output text matches the v1 channel format */
(function () {
  'use strict';
  var TY = window.TY, D = window.TY_DATA, esc = TY.esc;
  var VQ = ''; try { VQ = ((document.currentScript && document.currentScript.src) || '').match(/\?v=[\w.]+/)[0]; } catch (e) {}
  var loaded = {};
  function loadJS(src) { // lazy, local-only (no CDN: must work in Iran without VPN)
    if (loaded[src]) return loaded[src];
    return (loaded[src] = new Promise(function (ok, no) { var el = document.createElement('script'); el.src = src + VQ; el.async = true; el.onload = ok; el.onerror = function () { delete loaded[src]; no(new Error('load')); }; document.head.appendChild(el); }));
  }
  var RLIBS = {
    pdf: function () { return loadJS('assets/vendor/pdf.min.js').then(function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('assets/vendor/pdf.worker.min.js' + VQ, location.href).href; return window.pdfjsLib; }); },
    zip: function () { return loadJS('assets/vendor/jszip.min.js').then(function () { return window.JSZip; }); }
  };
  var RERR = {
    type: 'فقط فایل PDF، Word (با پسوند docx) یا متنی (txt) پشتیبانی می‌شود.',
    doc: 'فایل Word قدیمی (doc) خوانده نمی‌شود. آن را به‌صورت DOCX یا PDF ذخیره کن و دوباره امتحان کن.',
    size: 'حجم فایل بیشتر از ۵ مگابایت است. فایل کوچک‌تری انتخاب کن.',
    empty: 'این فایل خالی است.',
    noText: 'این فایل متن ندارد؛ احتمالاً اسکن یا عکس است و فعلاً خوانده نمی‌شود. فایل PDF یا Word اصلی رزومه را انتخاب کن، یا فرم را دستی پر کن.',
    password: 'این PDF رمز دارد. نسخه‌ی بدون رمز را انتخاب کن.',
    corrupt: 'فایل خراب است یا قابل خواندن نیست. یک فایل دیگر امتحان کن.',
    load: 'بخش خواندن رزومه بارگذاری نشد. اینترنتت را بررسی کن و دوباره امتحان کن.',
    nothing: 'چیز مشخصی در این فایل پیدا نشد. فرم را خودت پر کن.',
    timeout: 'خواندن فایل بیش‌ازحد طول کشید. فایل ساده‌تر یا کوچک‌تری امتحان کن.'
  };
  var CITY_TAGS = ['تهران', 'مشهد', 'اصفهان', 'شیراز', 'تبریز', 'کرج', 'دورکاری'];
  function toTag(s) {
    s = String(s || '').trim().replace(/^#+/, '').replace(/[،؛؟«»]/g, '').replace(/[\s\u200c\-]+/g, '_').replace(/[^0-9A-Za-z_\u0600-\u06FF]/g, '').replace(/_+/g, '_').replace(/^_|_$/g, '');
    return s ? '#' + s : '';
  }
  function lines(s) { return String(s || '').split(/\n|،(?=\s)/).map(function (x) { return x.replace(/^[\s\-–•*🔹▫️\d.)]+/, '').trim(); }).filter(Boolean); }
  function validContact(s) {
    s = TY.en(String(s || '').trim()); if (!s) return false;
    var c = s.replace(/[\s\-().]/g, '');
    return /(\+98|0098|0)9\d{9}/.test(c) || /(^|\s)@[A-Za-z][A-Za-z0-9_]{3,31}(\s|$)/.test(s) || /t(elegram)?\.me\/[A-Za-z0-9_+]{4,}/i.test(s) || /[^\s@]+@[^\s@]+\.[A-Za-z]{2,}/.test(s);
  }
  function num(s) { return TY.en(String(s || '')).replace(/[^\d.]/g, ''); }

  TY.formPage = function (kind) {
    var isCV = kind === 'jobseeker';
    var KEY = 'draft_' + kind;
    TY.shell({title: isCV ? 'ساخت رزومه' : 'ثبت آگهی استخدام', back: true, backTo: 'post.html', bell: false});
    var main = document.querySelector('main');
    var me = TY.cachedMe(), user = TY.user();

    if (!TY.session()) {
      main.innerHTML = '<div class="empty" style="padding-top:48px"><div class="ic">' + TY.ic('lock', 'lg') + '</div><h3>' + (isCV ? 'برای ساخت رزومه اول عضو شو' : 'برای ثبت آگهی اول عضو شو') + '</h3>' +
        '<p>عضویت رایگان است و یک دقیقه طول می‌کشد. بعد از تأیید ادمین، ' + (isCV ? 'رزومه‌ات' : 'آگهی‌ات') + ' در کانال و برنامه منتشر می‌شود.</p>' +
        '<div class="stack" style="max-width:320px;margin:0 auto"><a class="btn primary block lg" href="register.html" id="goReg">ثبت‌نام</a><a class="btn outline block" href="register.html?login=1" id="goLog">قبلاً عضو شده‌ام</a></div></div>';
      TY.store.set('ret', location.pathname.split('/').pop() + location.search);
      return;
    }

    // ویرایش یک ارسال قبلی (?edit=<id>): فقط وقتی سرور my_edit دارد و فرم ذخیره‌شده در me.mine هست
    var editId = TY.qs('edit'), editItem = null;
    if (editId && TY.feat('edit')) editItem = ((TY.cachedMe() || {}).mine || []).filter(function (x) { return String(x.id) === editId && x.type === kind && x.data && typeof x.data === 'object' && Object.keys(x.data).length; })[0] || null;
    if (editItem) KEY = 'draft_edit_' + kind;
    var rawDraft = editItem ? JSON.parse(JSON.stringify(editItem.data)) : TY.store.get(KEY, null), lastSt = editItem ? null : TY.store.get('last_' + kind, null);
    var hadDraft = !editItem && !!(rawDraft && (rawDraft.dept || rawDraft.pos || rawDraft.reqs || rawDraft.summary || rawDraft.headline || rawDraft.extra));
    function freshSt() {
      var s0 = {coop: [], salMode: isCV ? 'none' : 'agree', exp: [{}], skills: [], soft: [], vis: 'channel'};
      if (user) { s0.contact = user.mobile; if (isCV) s0.name = user.name; if (user.city) s0.city = user.city; }
      return s0;
    }
    var st = rawDraft || freshSt();
    if (!st.contact && user) st.contact = user.mobile;
    if (isCV && !st.name && user) st.name = user.name;
    if (!st.city && user && user.city) st.city = user.city;
    var to = editItem ? '' : TY.qs('to'); if (isCV && to) { st.vis = 'direct'; st.target = to; }
    var step = 0, finished = false, confirmedDup = false;
    var AKEY = 'auto_' + kind, auto = {}, autoPrev = null, autoBanner = true, busy = false, upMsg = '';
    if (isCV && !editItem) { (TY.store.get(AKEY, []) || []).forEach(function (k) { auto[k] = 1; }); if (!rawDraft) auto = {}; }
    function autoCount() { return Object.keys(auto).length; }
    function autoKey(k) { return {dept: 'title', pos: 'title', custom: 'title', salMode: 'sal', salMin: 'sal', salMax: 'sal'}[k] || k; }
    function dropAuto(k) { k = autoKey(k); if (auto[k]) { delete auto[k]; TY.store.set(AKEY, Object.keys(auto)); var ids = {title: ['w_dept', 'w_pos', 'w_custom'], city: ['w_city', 'w_city2'], sal: ['w_sal']}[k] || ['w_' + k]; ids.forEach(function (id) { var e = document.getElementById(id); if (e) e.classList.remove('auto'); }); } }

    function deptObj() { return D.depts.filter(function (d) { return d.name === st.dept; })[0]; }
    function titleTxt() { var p = st.pos === 'سایر' || !st.pos ? (st.custom || '') : st.pos; return p && st.extra ? p + ' – ' + st.extra : (p || st.extra || ''); }
    function industryTag() { var i = D.industries.filter(function (x) { return x.name === st.industry; })[0]; return i ? i.tag : ''; }
    function salaryTxt() {
      if (st.salMode === 'agree') return 'توافقی';
      if (st.salMode !== 'range') return '';
      var a = num(st.salMin), b = num(st.salMax);
      if (a && b) return (a === b ? TY.fa(a) : TY.fa(a) + ' تا ' + TY.fa(b)) + ' میلیون تومان';
      if (a) return 'از ' + TY.fa(a) + ' میلیون تومان'; if (b) return 'تا ' + TY.fa(b) + ' میلیون تومان'; return '';
    }
    function tags() {
      var out = [isCV ? '#کارجو' : '#استخدام'], add = function (t) { if (t && out.indexOf(t) < 0) out.push(t); };
      if (st.urgent) add('#فوری');
      add(industryTag());
      var d = deptObj(); if (d) add(d.tag);
      if (st.pos && D.posTags[st.pos]) add(D.posTags[st.pos]);
      var c = String(st.city || '').split(/[،,\-–\/(]/)[0].trim(); if (c) add(toTag(c));
      if ((st.coop || []).indexOf('دورکاری') >= 0) add('#دورکاری');
      return out;
    }
    function contactOut(s) { s = TY.en(String(s || '').trim()); var u = s.match(/^@?([A-Za-z][A-Za-z0-9_]{3,31})$/); return u ? '@' + u[1] : s; }
    function buildText() {
      var L = [tags().join(' '), ''];
      if (!isCV) {
        var push = function (e, l, v) { if (v) L.push(e + ' ' + l + ': ' + v); };
        push('💼', 'عنوان شغل', titleTxt()); push('🏭', 'صنعت', st.industry); push('🏪', 'فروشگاه / شرکت', st.company);
        push('📍', 'محل کار', [st.city, st.area].filter(Boolean).join('، '));
        if ((st.coop || []).length) L.push('⏰ نوع همکاری: ' + D.coop.filter(function (c) { return st.coop.indexOf(c) >= 0; }).join(' / '));
        var r = lines(st.reqs);
        if (r.length === 1) L.push('📋 شرایط و مهارت‌ها: ' + r[0]); else if (r.length > 1) { L.push('📋 شرایط و مهارت‌ها:'); r.forEach(function (x) { L.push('🔹 ' + x); }); }
        push('🕘', 'ساعت کاری', st.hours); push('💰', 'حقوق', salaryTxt()); push('🎁', 'مزایا', st.benefits); push('📞', 'راه ارتباط', contactOut(st.contact));
      } else {
        var t = titleTxt();
        L.push('👤 ' + (st.name || '') + (t ? ' | ' + t : ''));
        if (st.headline) L.push('✨ ' + st.headline);
        var parts = []; if (st.city) parts.push('📍 ' + st.city); if ((st.coop || []).length) parts.push('⏰ ' + st.coop.join(' / ')); if (st.start) parts.push('🚀 شروع: ' + st.start);
        if (parts.length) L.push(parts.join(' | '));
        if (st.summary) L.push('', '📝 ' + String(st.summary).replace(/\s*\n+\s*/g, ' '));
        var ex = (st.exp || []).filter(function (j) { return j.role || j.company; });
        if (ex.length) { L.push('', '💼 سوابق کاری:'); ex.slice(0, 3).forEach(function (j) { L.push('▫️ ' + (j.role || '') + (j.role && j.company ? ' – ' : '') + (j.company || '') + (j.years ? ' (' + TY.fa(j.years) + ')' : '')); if (j.ach) L.push('   • ' + j.ach); }); }
        var more = [];
        if (st.skills.length) more.push('🧠 مهارت‌ها: ' + st.skills.join('، '));
        if (st.soft.length) more.push('💻 نرم‌افزارها: ' + st.soft.join('، '));
        var edu = st.degree ? st.degree + (st.major ? ' ' + st.major : '') : (st.major || '');
        if (edu) more.push('🎓 تحصیلات: ' + edu + (st.uni ? ' – ' + st.uni : ''));
        if (st.certs) more.push('📜 دوره‌ها: ' + st.certs);
        if (st.langs) more.push('🌐 زبان‌ها: ' + st.langs);
        if (more.length) { L.push(''); L.push.apply(L, more); }
        var tail = [];
        var sal = salaryTxt(); if (sal) tail.push('💰 حقوق درخواستی: ' + sal);
        if (st.industry) tail.push('🏭 صنعت مورد علاقه: ' + st.industry);
        var info = []; if (st.age) info.push(TY.fa(st.age) + (/^\d{1,2}$/.test(TY.en(st.age)) ? ' ساله' : '')); if (st.military) info.push('نظام وظیفه: ' + st.military);
        if (info.length) tail.push('ℹ️ ' + info.join(' | '));
        if (st.link) tail.push('🔗 ' + st.link);
        if (st.contact) tail.push('📞 تماس: ' + contactOut(st.contact));
        if (tail.length) { L.push(''); L.push.apply(L, tail); }
      }
      L.push('', 'کانال آگهی‌ها: @JobVacencies');
      return L.join('\n');
    }

    /* ---------- field renderers ---------- */
    function F(k, label, o) {
      o = o || {};
      var v = st[k] == null ? '' : st[k];
      var inp = o.area ? '<textarea class="textarea" id="f_' + k + '" data-k="' + k + '" placeholder="' + esc(o.ph || '') + '" rows="' + (o.rows || 5) + '">' + esc(v) + '</textarea>'
        : '<input class="input' + (o.ltr ? ' ltr' : '') + '" id="f_' + k + '" data-k="' + k + '" value="' + esc(v) + '" placeholder="' + esc(o.ph || '') + '"' + (o.mode ? ' inputmode="' + o.mode + '"' : '') + (o.auto ? ' autocomplete="' + o.auto + '"' : '') + ' enterkeyhint="next">';
      return '<div class="field" id="w_' + k + '"><label for="f_' + k + '">' + esc(label) + (o.req ? '' : ' <span class="opt">اختیاری</span>') + '</label>' + inp + (o.help ? '<div class="help">' + esc(o.help) + '</div>' : '') + '<div class="errmsg" hidden></div></div>';
    }
    function chips(k, opts, multi, label, o) {
      o = o || {};
      var v = st[k];
      return '<div class="field" id="w_' + k + '">' + (label ? '<span class="label">' + esc(label) + (o.req ? '' : ' <span class="opt">اختیاری</span>') + '</span>' : '') + '<div class="chips' + (o.scroll ? ' scroll' : '') + '">' + opts.map(function (x) {
        var on = multi ? (v || []).indexOf(x) >= 0 : v === x;
        return '<button type="button" class="chip" aria-pressed="' + on + '" data-chip="' + k + '" data-m="' + (multi ? 1 : 0) + '" data-v="' + esc(x) + '">' + esc(x) + '</button>';
      }).join('') + '</div><div class="errmsg" hidden></div></div>';
    }
    function seg(k, opts) {
      return '<div class="seg" role="tablist">' + opts.map(function (o) { return '<button type="button" role="tab" data-seg="' + k + '" data-v="' + o[0] + '" aria-selected="' + (st[k] === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>';
    }
    function sel(k, label, opts, o) {
      o = o || {};
      return '<div class="field" id="w_' + k + '"><label for="f_' + k + '">' + esc(label) + (o.req ? '' : ' <span class="opt">اختیاری</span>') + '</label><select class="select" id="f_' + k + '" data-k="' + k + '"><option value="">انتخاب کن</option>' +
        opts.map(function (x) { return '<option' + (st[k] === x ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select></div>';
    }
    function titleBlock() {
      var d = deptObj();
      var h = chips('dept', D.depts.map(function (x) { return x.name; }), false, isCV ? 'در چه حوزه‌ای کار می‌کنی؟' : 'دپارتمان', {req: true});
      if (d) h += chips('pos', d.pos.concat(['سایر']), false, isCV ? 'عنوان شغلی' : 'عنوان شغل', {req: true});
      if (d && st.pos === 'سایر') h += F('custom', 'عنوان دلخواه', {req: true, ph: isCV ? 'مثلاً کارشناس ارشد فروش' : 'مثلاً کارشناس فروش سازمانی'});
      if (d) h += F('extra', 'توضیح کوتاه کنار عنوان', {ph: isCV ? 'مثلاً با ۵ سال سابقه' : 'مثلاً خانم، با سابقه'});
      return h;
    }
    function salaryBlock(label) {
      var modes = isCV ? [['none', 'ذکر نشود'], ['agree', 'توافقی'], ['range', 'مبلغ']] : [['agree', 'توافقی'], ['range', 'مبلغ']];
      var h = '<div class="field" id="w_sal"><span class="label">' + label + ' <span class="opt">اختیاری</span></span>' + seg('salMode', modes);
      if (st.salMode === 'range') h += '<div class="grid2 mt3">' + '<input class="input" data-k="salMin" inputmode="numeric" placeholder="از (میلیون تومان)" value="' + esc(st.salMin || '') + '"><input class="input" data-k="salMax" inputmode="numeric" placeholder="تا (میلیون تومان)" value="' + esc(st.salMax || '') + '"></div>';
      return h + '</div>';
    }
    function sugFor(kind2) { var d = deptObj(); var s = (D.sug[kind2] || {}); return (d && s[d.key]) || s._ || []; }
    function tagPicker(k, label, kind2, ph) {
      var sugg = sugFor(kind2), cur = st[k] || [];
      var all = cur.concat(sugg.filter(function (x) { return cur.indexOf(x) < 0; }));
      return '<div class="field" id="w_' + k + '"><span class="label">' + esc(label) + ' <span class="opt">اختیاری · روی پیشنهادها بزن</span></span><div class="chips">' +
        all.map(function (x) { return '<button type="button" class="chip brand" aria-pressed="' + (cur.indexOf(x) >= 0) + '" data-chip="' + k + '" data-m="1" data-v="' + esc(x) + '">' + esc(x) + '</button>'; }).join('') +
        '</div><div class="hstack mt2"><input class="input" id="add_' + k + '" placeholder="' + esc(ph) + '" enterkeyhint="done"><button type="button" class="btn outline" data-addtag="' + k + '" aria-label="افزودن">' + TY.ic('plus', 'sm') + '</button></div></div>';
    }
    function expBlock() {
      var h = '<div class="field"><span class="label">سوابق کاری <span class="opt">اختیاری · جدیدترین اول، تا ۳ مورد</span></span>';
      st.exp.forEach(function (j, i) {
        h += '<div class="card flat mt2"><div class="between"><b class="small">سابقه‌ی ' + TY.fa(i + 1) + '</b>' + (st.exp.length > 1 ? '<button type="button" class="iconbtn" data-delexp="' + i + '" aria-label="حذف">' + TY.ic('trash', 'sm') + '</button>' : '') + '</div>' +
          '<div class="grid2 mt2"><input class="input" data-exp="' + i + '" data-f="role" placeholder="سمت" value="' + esc(j.role || '') + '"><input class="input" data-exp="' + i + '" data-f="company" placeholder="شرکت / فروشگاه" value="' + esc(j.company || '') + '"></div>' +
          '<div class="grid2 mt2"><input class="input" data-exp="' + i + '" data-f="years" placeholder="مدت، مثلاً ۱۴۰۰ تا ۱۴۰۳" value="' + esc(j.years || '') + '"><input class="input" data-exp="' + i + '" data-f="ach" placeholder="یک دستاورد" value="' + esc(j.ach || '') + '"></div></div>';
      });
      if (st.exp.length < 3) h += '<button type="button" class="btn ghost mt2" data-addexp>' + TY.ic('plus', 'sm') + 'افزودن سابقه</button>';
      return h + '</div>';
    }
    function targetBlock() {
      var ad = st.target ? (TY.cachedFeed() || []).filter(function (x) { return String(x.id) === String(st.target); })[0] : null;
      return '<div class="mt3" id="targetBox">' + (ad ? '<div class="list"><button type="button" class="row" data-pickad><span class="tile-ic">' + TY.ic('briefcase', 'sm') + '</span><div class="grow"><div class="t">' + esc(ad.title) + '</div><div class="s">' + esc([ad.city, ad.dm ? 'مستقیم به کارفرما' : 'از طریق ادمین'].filter(Boolean).join(' · ')) + '</div></div><span class="small" style="color:var(--brand-text);font-weight:600">تغییر</span></button></div>'
        : '<button type="button" class="btn outline block" data-pickad>' + TY.ic('briefcase', 'sm') + 'انتخاب آگهی</button>') + '<div class="errmsg" hidden id="err_target"></div></div>';
    }
    function visBlock() {
      var o = [['channel', 'انتشار در کانال و برنامه', 'بعد از تأیید ادمین، کارفرماهای مرتبط هم خبردار می‌شوند.'],
        ['admin', 'فقط برای ادمین', 'رزومه عمومی نمی‌شود؛ ادمین برای فرصت مناسب معرفی‌ات می‌کند.'],
        ['direct', 'ارسال مستقیم به یک کارفرما', 'رزومه فقط برای صاحب همان آگهی فرستاده می‌شود.']];
      return '<div class="field"><span class="label">رزومه کجا برود؟</span><div role="radiogroup">' + o.map(function (x) {
        return '<button type="button" class="choice" role="radio" aria-checked="' + (st.vis === x[0]) + '" data-vis="' + x[0] + '"><span class="radio"></span><span><div class="t">' + x[1] + '</div><div class="s">' + x[2] + '</div></span></button>' + (x[0] === 'direct' && st.vis === 'direct' ? targetBlock() : '');
      }).join('') + '</div></div>';
    }
    function previewBlock() {
      return '<details class="card flat mt4"><summary class="between" style="cursor:pointer;list-style:none;min-height:28px"><b class="small">پیش‌نمایش متن کانال</b>' + TY.ic('eye', 'sm') + '</summary><div class="preview mt3" id="pv">' + esc(buildText()) + '</div></details>';
    }

    var STEPS = !isCV ? [
      {t: 'شغل', s: 'چه کسی را استخدام می‌کنی؟', r: function () { return titleBlock() + sel('industry', 'صنعت', D.industries.map(function (x) { return x.name; })) + F('company', 'نام فروشگاه / شرکت', {ph: 'مثلاً موبایل پارسه'}); }, req: ['title']},
      {t: 'محل و همکاری', s: 'کجا و چطور؟', r: function () { return chips('city', CITY_TAGS, false, 'شهر', {req: true}) + (st.city && CITY_TAGS.indexOf(st.city) < 0 ? '' : '') + F('city', 'یا شهر دیگر', {ph: 'نام شهر', req: true}).replace('id="w_city"', 'id="w_city2"') + F('area', 'محدوده', {ph: 'مثلاً علاءالدین، جمهوری'}) + chips('coop', D.coop, true, 'نوع همکاری') + F('hours', 'ساعت کاری', {ph: 'مثلاً شنبه تا پنجشنبه ۱۰ تا ۱۹'}); }, req: ['city']},
      {t: 'شرایط و حقوق', s: 'چه کسی مناسب است؟', r: function () { return F('reqs', 'شرایط و مهارت‌ها', {area: true, rows: 6, ph: 'هر مورد در یک خط\nحداقل ۱ سال سابقه فروش موبایل\nآشنایی با نرم‌افزار حسابداری', help: 'هر خط یک مورد می‌شود.'}) + salaryBlock('حقوق') + F('benefits', 'مزایا', {ph: 'مثلاً بیمه، پورسانت فروش'}) + '<label class="between card flat" style="cursor:pointer"><span><b class="small">آگهی فوری است</b><div class="xs muted">هشتگ #فوری اضافه می‌شود</div></span><span class="toggle"><input type="checkbox" data-k="urgent"' + (st.urgent ? ' checked' : '') + '><span></span></span></label>'; }},
      {t: 'ارتباط و ارسال', s: 'آخرین قدم', r: function () { return F('contact', 'راه ارتباط', {req: true, ph: '09121234567 یا @username', ltr: true, help: 'در آگهی نمایش داده می‌شود.'}) + previewBlock(); }, req: ['contact']}
    ] : [
      {t: 'نقش', s: 'دنبال چه کاری هستی؟', r: function () { return titleBlock() + F('headline', 'تیتر حرفه‌ای', {ph: 'مثلاً فروشنده‌ی موبایل با ۵ سال سابقه در علاءالدین'}); }, req: ['title']},
      {t: 'مشخصات', s: 'کمی درباره‌ی خودت', r: function () { return F('name', 'نام و نام خانوادگی', {req: true, auto: 'name'}) + chips('city', CITY_TAGS, false, 'شهر', {req: true}) + F('city', 'یا شهر دیگر', {ph: 'نام شهر', req: true}).replace('id="w_city"', 'id="w_city2"') + '<div class="grid2">' + F('age', 'سن', {mode: 'numeric', ph: 'مثلاً ۲۸'}) + sel('military', 'نظام وظیفه', D.military) + '</div>'; }, req: ['name', 'city']},
      {t: 'سوابق', s: 'کجاها کار کرده‌ای؟', r: function () { return expBlock() + F('summary', 'خلاصه‌ی حرفه‌ای', {area: true, rows: 3, ph: 'دو سه جمله درباره‌ی تجربه و نقاط قوتت'}); }},
      {t: 'مهارت‌ها', s: 'چه کارهایی بلدی؟', r: function () { return tagPicker('skills', 'مهارت‌های کلیدی', 'skills', 'مهارت دیگر') + tagPicker('soft', 'نرم‌افزارها و ابزارها', 'soft', 'نرم‌افزار دیگر'); }},
      {t: 'تحصیلات و شرایط', s: 'و شرایط همکاری', r: function () { return '<div class="grid2">' + sel('degree', 'مقطع', D.degree) + F('major', 'رشته', {ph: 'مثلاً حسابداری'}) + '</div>' + F('uni', 'دانشگاه / آموزشگاه') + F('certs', 'دوره‌ها و گواهی‌ها', {ph: 'با «،» جدا کن'}) + F('langs', 'زبان‌ها', {ph: 'مثلاً انگلیسی (متوسط)'}) + chips('coop', D.coop, true, 'نوع همکاری') + chips('start', D.start, false, 'آماده‌ی شروع') + salaryBlock('حقوق درخواستی') + sel('industry', 'صنعت مورد علاقه', D.industries.map(function (x) { return x.name; })); }},
      {t: 'ارسال', s: 'راه ارتباط و مقصد رزومه', r: function () { return F('contact', 'راه ارتباط', {req: true, ph: '09121234567 یا @username', ltr: true}) + F('link', 'لینک رزومه / نمونه‌کار', {ph: 'https://', ltr: true}) + visBlock() + previewBlock(); }, req: ['contact', 'target']}
    ];

    function uploadCard() {
      if (!isCV || editItem || step !== 0) return '';
      return '<section class="upcard mb" aria-labelledby="upT"><span class="tile-ic brand">' + TY.ic('resume', 'sm') + '</span><div class="grow"><b class="small" id="upT">رزومه‌ی آماده داری؟</b>' +
        '<div class="xs muted" id="upH" style="margin:2px 0 10px">فایل PDF، Word (docx) یا متنی را انتخاب کن تا فرم خودکار پر شود. فایل فقط روی همین گوشی خوانده می‌شود و جایی ارسال نمی‌شود.</div>' +
        '<button type="button" class="btn outline" id="resumeBtn" aria-describedby="upH"' + (busy ? ' disabled' : '') + '>' + TY.ic('resume', 'sm') + 'آپلود رزومه و پر کردن خودکار</button>' +
        '<input type="file" id="resumeFile" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" style="display:none" aria-label="انتخاب فایل رزومه">' +
        '<div class="xs" id="resumeStatus" role="status" aria-live="polite" style="margin-top:8px">' + esc(upMsg) + '</div></div></section>';
    }
    function autoBannerHtml() {
      if (!isCV || !autoCount() || !autoBanner) return '';
      return '<div class="banner brand mb" id="autoBanner" role="status">' + TY.ic('check', 'sm') + '<div class="grow"><b>موارد به‌صورت خودکار پر شده‌اند؛ لطفاً مرور و اصلاح کن.</b>' +
        '<div class="xs" style="margin-top:2px">کادرهای دارای برچسب «خودکار» از رزومه‌ات خوانده شده‌اند. چیزی که پیدا نشد خالی مانده و تا نرسی به مرحله‌ی آخر و ارسال را نزنی، چیزی فرستاده نمی‌شود.</div>' +
        '<div class="hstack mt2" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn ghost sm" data-autoundo>برگرداندن</button><button type="button" class="btn ghost sm" data-autook>متوجه شدم</button></div></div></div>';
    }
    function paintAuto() {
      if (!isCV) return;
      var ids = {title: ['w_dept', 'w_pos', 'w_custom'], city: [CITY_TAGS.indexOf(st.city) >= 0 ? 'w_city' : 'w_city2'], sal: ['w_sal']};
      Object.keys(auto).forEach(function (k) {
        if (k === 'exp') { TY.$$('[data-exp]').forEach(function (i) { if (i.value) i.classList.add('auto'); }); return; }
        (ids[k] || ['w_' + k]).forEach(function (id) { var e = document.getElementById(id); if (e) e.classList.add('auto'); });
      });
    }
    function render() {
      var S = STEPS[step];
      main.innerHTML = autoBannerHtml() + uploadCard() + (step === 0 && hadDraft ? '<div class="banner brand mb">' + TY.ic('check', 'sm') + '<div class="grow">پیش‌نویس قبلی‌ات برگشت؛ از همان‌جا ادامه بده.<div><button type="button" class="btn ghost sm" data-newdraft>شروع از نو</button></div></div></div>' : '') +
        (step === 0 && !hadDraft && lastSt ? '<div class="banner mb">' + TY.ic('copy', 'sm') + '<div class="grow">' + (isCV ? 'رزومه‌ی قبلی‌ات را داری.' : 'آگهی قبلی‌ات را داری.') + '<div><button type="button" class="btn outline sm" data-uselast>' + (isCV ? 'پر کردن از رزومه‌ی قبلی' : 'پر کردن از آگهی قبلی') + '</button></div></div></div>' : '') +
        (user && user.status === 'pending' ? '<div class="banner warn mb">' + TY.ic('clock', 'sm') + '<div class="grow">عضویتت هنوز در انتظار تأیید است؛ ' + (isCV ? 'رزومه‌ات' : 'آگهی‌ات') + ' همراه آن بررسی می‌شود.</div></div>' : '') +
        '<div class="steps" aria-hidden="true">' + STEPS.map(function (x, i) { return '<i class="' + (i < step ? 'done' : (i === step ? 'on' : '')) + '"></i>'; }).join('') + '</div>' +
        '<div class="stephead"><div><div class="eyebrow">مرحله‌ی ' + TY.fa(step + 1) + ' از ' + TY.fa(STEPS.length) + '</div><h2 class="h2">' + esc(S.s) + '</h2></div></div>' +
        '<form id="form" novalidate>' + S.r() + '</form>';
      var bar = document.querySelector('.actionbar');
      if (!bar) { bar = document.createElement('div'); bar.className = 'actionbar'; document.body.appendChild(bar); } document.body.classList.add('has-ab');
      var last = step === STEPS.length - 1;
      bar.innerHTML = '<div class="in">' + (step ? '<button class="btn ghost" id="prev">' + TY.ic('back', 'sm') + 'قبلی</button>' : '') +
        '<button class="btn ' + (last ? 'primary' : 'dark') + ' lg" id="next">' + (last ? (isCV && st.vis === 'direct' ? 'ارسال برای کارفرما' : (isCV && st.vis === 'admin' ? 'ارسال برای ادمین' : 'ارسال برای تأیید')) : 'ادامه') + (last ? '' : TY.ic('fwd', 'sm')) + '</button></div>';
      document.getElementById('next').onclick = next;
      var pv = document.getElementById('prev'); if (pv) pv.onclick = function () { if (history.state && history.state.fstep === step) history.back(); else { step--; render(); window.scrollTo(0, 0); } };
      paintAuto();
      // city free text mirrors chip
      var cityIn = document.getElementById('f_city'); if (cityIn && CITY_TAGS.indexOf(st.city) >= 0) cityIn.value = '';
    }
    function save() { TY.store.set(KEY, st); var pv = document.getElementById('pv'); if (pv) pv.textContent = buildText(); }
    function err(k, msg) {
      var w = document.getElementById('w_' + k) || document.getElementById('w_' + k + '2'); if (!w) { if (k === 'title') w = document.getElementById('w_pos') || document.getElementById('w_dept'); if (k === 'target') w = document.getElementById('targetBox'); }
      if (!w) return;
      w.classList.toggle('err', !!msg);
      var e = w.querySelector('.errmsg'); if (e) { e.hidden = !msg; e.textContent = msg || ''; }
    }
    function check() {
      var S = STEPS[step], bad = null;
      (S.req || []).forEach(function (k) {
        var m = '';
        if (k === 'title' && !titleTxt()) m = st.dept ? 'عنوان را انتخاب کن' : 'دپارتمان و عنوان را انتخاب کن';
        if (k === 'city' && !String(st.city || '').trim()) m = 'شهر را انتخاب کن';
        if (k === 'name' && String(st.name || '').trim().length < 3) m = 'نام کامل را بنویس';
        if (k === 'contact' && !validContact(st.contact)) m = 'شماره موبایل یا آیدی تلگرام درست وارد کن';
        if (k === 'target' && st.vis === 'direct' && !st.target) m = 'آگهی مقصد را انتخاب کن';
        err(k, m); if (m && !bad) bad = k;
      });
      if (bad) { var el = document.querySelector('.field.err, #targetBox .errmsg:not([hidden])'); if (el) el.scrollIntoView({behavior: 'smooth', block: 'center'}); }
      return !bad;
    }
    function next() {
      if (!check()) return;
      if (step < STEPS.length - 1) { step++; try { history.pushState({fstep: step}, ''); } catch (e) {} render(); window.scrollTo(0, 0); return; }
      submit();
    }
    function submit() {
      var b = document.getElementById('next');
      if (b && b.classList.contains('loading')) return;
      var tx = buildText(), h = tx.length + ':' + tx.slice(0, 160) + tx.slice(-100), ls = TY.store.get('lastsub', null);
      if (!editItem && ls && ls.h === h && Date.now() - ls.t < 900000 && !confirmedDup) {
        TY.confirm('همین را چند دقیقه پیش فرستاده‌ای', 'اگر ارسال قبلی انجام نشد دوباره بفرست؛ وگرنه «ارسال‌های من» را ببین تا دو بار برای ادمین نرود.', 'ارسال دوباره').then(function (y) { if (y) { confirmedDup = true; submit(); } });
        return;
      }
      TY.store.set('lastsub', {h: h, t: Date.now()});
      TY.needV2().then(function (ok) {
        if (!ok) return;
        b.classList.add('loading');
        var text = buildText();
        TY.api(editItem ? 'my_edit' : 'submit', {id: editItem ? editItem.id : undefined, type: kind, title: isCV ? (st.name + (titleTxt() ? ' | ' + titleTxt() : '')) : titleTxt(), text: text, tags: tags().join(' '), city: [st.city, st.area].filter(Boolean).join('، '),
          contact: TY.en(st.contact || ''), vis: isCV ? st.vis : 'channel', target: isCV && st.vis === 'direct' ? st.target : '', fields: st}).then(function (r) {
          b.classList.remove('loading');
          if (!r || !r.ok) { TY.store.del('lastsub'); TY.toast(TY.errText(r), 'err'); return; }
          if (r.dup) TY.toast('این را همین چند ساعت پیش فرستاده بودی؛ همان ارسال قبلی ثبت است');
          if (editItem) { TY.store.del(KEY); done(r.status); TY.me(); return; }
          var keep = JSON.parse(JSON.stringify(st)); delete keep.target; if (keep.vis === 'direct') keep.vis = isCV ? 'channel' : keep.vis; TY.store.set('last_' + kind, keep);
          TY.store.del(KEY); done(r.status);
          TY.me();
        }).catch(function (e) { b.classList.remove('loading'); TY.toast(TY.errText({error: e && e.message === 'timeout' ? 'timeout' : 'net'}), 'err'); });
      });
    }
    function done(status) {
      TY.store.del(AKEY); finished = true; var bar = document.querySelector('.actionbar'); if (bar) bar.remove(); document.body.classList.remove('has-ab');
      var msg = {pending: [isCV ? 'رزومه‌ات برای ادمین رفت' : 'آگهی‌ات برای بررسی رفت', 'بعد از تأیید ادمین در کانال @JobVacencies و برنامه منتشر می‌شود و همین‌جا و در تلگرام خبرت می‌کنیم.'],
        private: ['رزومه‌ات برای ادمین فرستاده شد', 'رزومه عمومی نمی‌شود. ادمین‌ها آن را می‌بینند و برای فرصت مناسب معرفی‌ات می‌کنند.'],
        direct: ['رزومه‌ات برای کارفرما رفت', 'کارفرما در برنامه و تلگرام آن را می‌بیند. موفق باشی!']}[status] || ['ارسال شد', ''];
      main.innerHTML = '<div class="empty" style="padding-top:56px"><div class="ic" style="background:var(--brand-soft);color:var(--brand-text)">' + TY.ic('check', 'lg') + '</div><h3 class="h2" style="margin-bottom:8px">' + esc(msg[0]) + '</h3><p>' + esc(msg[1]) + '</p>' +
        '<div class="stack" style="max-width:320px;margin:0 auto">' + (user && !user.tg && user.tgLink ? '<a class="btn outline block" target="_blank" rel="noopener" href="' + esc(user.tgLink) + '">' + TY.ic('send', 'sm') + 'برای خبر تأیید، تلگرام را وصل کن</a>' : '') + '<a class="btn primary block lg" href="me.html#mine">دیدن ارسال‌های من</a><a class="btn outline block" href="enter.html">بازگشت به خانه</a></div></div>';
      window.scrollTo(0, 0);
    }
    function pickAd() {
      var ads = (TY.cachedFeed() || []).filter(function (x) { return x.type === 'employer'; });
      var draw = function (q) {
        q = TY.en(q || '').trim();
        var rows = ads.filter(function (a) { return !q || TY.en(a.title + ' ' + a.text).indexOf(q) >= 0; }).slice(0, 60);
        return rows.length ? '<div class="list">' + rows.map(function (a) { return '<button class="row" data-ad="' + esc(a.id) + '"><div class="grow"><div class="t">' + esc(a.title) + '</div><div class="s">' + esc([a.city, TY.ago(a.created)].filter(Boolean).join(' · ')) + '</div></div>' + (a.dm ? '<span class="badge brand">مستقیم</span>' : '<span class="badge">با ادمین</span>') + '</button>'; }).join('') + '</div>'
          : TY.empty('briefcase', 'آگهی‌ای پیدا نشد', '');
      };
      var s = TY.sheet({title: 'انتخاب آگهی', body: '<label class="inputwrap" style="margin-bottom:12px;display:block">' + TY.ic('search', 'sm') + '<input class="input" id="adq" placeholder="جستجو در آگهی‌ها"></label><div id="adl">' + draw('') + '</div>'});
      if (!ads.length) TY.feed().then(function (all) { ads = all.filter(function (x) { return x.type === 'employer'; }); s.body.querySelector('#adl').innerHTML = draw(''); });
      s.body.querySelector('#adq').addEventListener('input', function (e) { s.body.querySelector('#adl').innerHTML = draw(e.target.value); });
      s.body.addEventListener('click', function (e) { var b = e.target.closest('[data-ad]'); if (!b) return; st.target = b.getAttribute('data-ad'); save(); s.close(); render(); });
    }

    /* ---------- رزومه → فرم (همه‌چیز داخل مرورگر) ---------- */
    function setUp(msg, bad) { upMsg = msg || ''; var e = document.getElementById('resumeStatus'); if (e) { e.textContent = upMsg; e.style.color = bad ? 'var(--danger)' : ''; e.setAttribute('role', bad ? 'alert' : 'status'); } }
    function hasContent() { return !!(st.dept || st.summary || st.headline || (st.skills || []).length || (st.exp || []).some(function (j) { return j.role || j.company; })); }
    function importResume(file) {
      if (busy) return; busy = true; var btn = document.getElementById('resumeBtn'); if (btn) btn.disabled = true; setUp('در حال خواندن رزومه… چند ثانیه صبر کن.');
      var to = new Promise(function (_, no) { setTimeout(function () { no({code: 'timeout'}); }, 40000); });
      var work = loadJS('assets/resume.js').catch(function () { throw {code: 'load'}; }).then(function () {
        return window.TYResume.readFile(file, {pdf: function () { return RLIBS.pdf().catch(function () { throw {code: 'load'}; }); }, zip: function () { return RLIBS.zip().catch(function () { throw {code: 'load'}; }); }}, {maxBytes: 5 * 1024 * 1024});
      }).then(function (text) { return window.TYResume.parse(text, D); });
      Promise.race([work, to]).then(function (res) {
        busy = false; var f = res.fields, n = 0; ['name', 'contact', 'city', 'dept', 'headline', 'summary', 'exp', 'skills', 'soft', 'degree', 'major', 'uni', 'certs', 'langs', 'salMode', 'coop', 'start', 'industry', 'age', 'military', 'link'].forEach(function (k) { if (f[k] && (!Array.isArray(f[k]) || f[k].length)) n++; });
        if (n < 2) { setUp(RERR.nothing, true); if (btn) btn.disabled = false; return; }
        var go = function () { applyResume(f); };
        if (hasContent()) TY.confirm('فرم قبلاً پر شده', 'مواردی که از رزومه خوانده شد جایگزین مقدارهای فعلی می‌شود. «برگرداندن» هم می‌توانی بزنی.', 'پر کردن از رزومه').then(function (y) { if (y) go(); else { setUp(''); if (btn) btn.disabled = false; } });
        else go();
      }).catch(function (e) {
        busy = false; var c = e && e.code; setUp(RERR[c] || RERR.corrupt, true); var b2 = document.getElementById('resumeBtn'); if (b2) b2.disabled = false;
        try { if (window.console && !RERR[c]) console.warn('resume import failed', e); } catch (x) {}
      });
    }
    function applyResume(f) {
      autoPrev = JSON.parse(JSON.stringify(st)); var A = {}, userDefault = function (cur, def) { return !String(cur || '').trim() || (def && String(cur).trim() === String(def).trim()); };
      var put = function (k, v, a) { st[k] = v; A[a || k] = 1; };
      if (f.name && userDefault(st.name, user && user.name)) put('name', f.name);
      if (f.contact && userDefault(st.contact, user && user.mobile)) put('contact', f.contact);
      if (f.city && userDefault(st.city, user && user.city)) put('city', f.city);
      if (f.dept) { st.dept = f.dept; st.pos = f.pos || ''; st.custom = f.pos === 'سایر' ? (f.custom || '') : ''; A.title = 1; }
      ['headline', 'age', 'military', 'summary', 'degree', 'major', 'uni', 'certs', 'langs', 'start', 'industry', 'link'].forEach(function (k) { if (f[k]) put(k, f[k]); });
      ['skills', 'soft', 'coop'].forEach(function (k) { if (f[k] && f[k].length) put(k, f[k].slice()); });
      if (f.exp && f.exp.length) { st.exp = f.exp.map(function (j) { return {role: j.role || '', company: j.company || '', years: j.years || '', ach: j.ach || ''}; }); A.exp = 1; }
      if (f.salMode === 'range') { st.salMode = 'range'; st.salMin = f.salMin; st.salMax = f.salMax; A.sal = 1; } else if (f.salMode === 'agree') { st.salMode = 'agree'; A.sal = 1; }
      auto = A; autoBanner = true; TY.store.set(AKEY, Object.keys(A)); upMsg = ''; save();
      step = 0; try { history.replaceState({fstep: 0}, ''); } catch (e) {} render(); window.scrollTo(0, 0);
      TY.toast(TY.fa(Object.keys(A).length) + ' مورد از رزومه پر شد؛ لطفاً مرور و اصلاح کن');
      var ab = document.getElementById('autoBanner'); if (ab) { ab.setAttribute('tabindex', '-1'); ab.focus({preventScroll: true}); }
    }
    function undoAuto() { if (!autoPrev) return; st = autoPrev; autoPrev = null; auto = {}; TY.store.del(AKEY); save(); upMsg = ''; render(); TY.toast('به حالت قبل برگشت'); }

    main.addEventListener('input', function (e) {
      var t = e.target, k = t.getAttribute('data-k');
      if (k) { dropAuto(k); st[k] = t.type === 'checkbox' ? t.checked : t.value; if (k === 'city') { TY.$$('[data-chip="city"]').forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-v') === t.value); }); } err(k === 'custom' ? 'title' : k, ''); save(); }
      var ex = t.getAttribute('data-exp'); if (ex != null) { st.exp[+ex][t.getAttribute('data-f')] = t.value; t.classList.remove('auto'); save(); }
    });
    main.addEventListener('change', function (e) {
      if (e.target.id === 'resumeFile') { var f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) importResume(f); return; }
      var t = e.target, k = t.getAttribute('data-k'); if (k) { dropAuto(k); st[k] = t.type === 'checkbox' ? t.checked : t.value; save(); } });
    main.addEventListener('click', function (e) {
      if (e.target.closest('[data-newdraft]')) { TY.store.del(KEY); TY.store.del(AKEY); auto = {}; hadDraft = false; st = freshSt(); render(); return; }
      if (e.target.closest('[data-uselast]')) { st = JSON.parse(JSON.stringify(lastSt)); delete st.target; if (st.vis === 'direct') st.vis = 'channel'; if (!isCV) st.vis = 'channel'; save(); render(); TY.toast('پر شد؛ هر چه لازم است عوض کن'); return; }
      if (e.target.closest('#resumeBtn')) { var fi = document.getElementById('resumeFile'); if (fi) fi.click(); return; }
      if (e.target.closest('[data-autoundo]')) { undoAuto(); return; }
      if (e.target.closest('[data-autook]')) { autoBanner = false; var ab = document.getElementById('autoBanner'); if (ab) ab.remove(); return; }
      var c = e.target.closest('[data-chip]');
      if (c) {
        var k = c.getAttribute('data-chip'), v = c.getAttribute('data-v'); dropAuto(k);
        if (c.getAttribute('data-m') === '1') { st[k] = st[k] || []; var i = st[k].indexOf(v); if (i >= 0) st[k].splice(i, 1); else st[k].push(v); c.setAttribute('aria-pressed', i < 0); }
        else {
          st[k] = st[k] === v && k !== 'dept' ? '' : v;
          if (k === 'dept') { st.pos = ''; save(); render(); return; }
          if (k === 'pos') { save(); render(); err('title', ''); return; }
          TY.$$('[data-chip="' + k + '"]').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-v') === st[k]); });
          if (k === 'city') { var ci = document.getElementById('f_city'); if (ci) ci.value = ''; err('city', ''); }
        }
        save(); return;
      }
      var sg = e.target.closest('[data-seg]'); if (sg) { dropAuto(sg.getAttribute('data-seg')); st[sg.getAttribute('data-seg')] = sg.getAttribute('data-v'); save(); render(); return; }
      var vb = e.target.closest('[data-vis]'); if (vb) { st.vis = vb.getAttribute('data-vis'); save(); render(); if (st.vis === 'direct' && !st.target) pickAd(); return; }
      if (e.target.closest('[data-pickad]')) { pickAd(); return; }
      if (e.target.closest('[data-addexp]')) { st.exp.push({}); save(); render(); return; }
      var de = e.target.closest('[data-delexp]'); if (de) { st.exp.splice(+de.getAttribute('data-delexp'), 1); save(); render(); return; }
      var at = e.target.closest('[data-addtag]'); if (at) { addTag(at.getAttribute('data-addtag')); }
    });
    main.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id && e.target.id.indexOf('add_') === 0) { e.preventDefault(); addTag(e.target.id.slice(4)); } else if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault(); });
    function addTag(k) { var i = document.getElementById('add_' + k); var v = (i.value || '').trim(); if (!v) return; st[k] = st[k] || []; if (st[k].indexOf(v) < 0) st[k].unshift(v); save(); render(); setTimeout(function () { var n = document.getElementById('add_' + k); if (n) n.focus(); }, 0); }

    if (isCV && !TY.cachedFeed()) TY.feed().then(function () { if (st.vis === 'direct') render(); });
    try { history.replaceState({fstep: 0}, ''); } catch (e) {}
    window.addEventListener('popstate', function (e) { var fs = e.state && e.state.fstep; if (!finished && typeof fs === 'number' && fs < step) { step = fs; render(); window.scrollTo(0, 0); } });
    render();
    TY.me().then(function (r) { if (r && r.user) { user = r.user; } });
  };
})();
