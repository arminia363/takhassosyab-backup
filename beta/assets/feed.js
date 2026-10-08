/* lists: jobs (employer ads), resumes, saved */
(function () {
  'use strict';
  var TY = window.TY;
  TY.feedPage = function (o) {
    var type = o.type, isSaved = type === 'saved';
    TY.shell({title: o.title, nav: o.nav, actions: ''});
    var main = document.querySelector('main');
    main.innerHTML =
      '<div class="filters"><div class="searchbar"><label class="inputwrap"><span class="sr">جستجو</span>' + TY.ic('search', 'sm') +
      '<input class="input" type="search" id="q" placeholder="' + (type === 'jobseeker' ? 'جستجو در رزومه‌ها' : 'جستجو در آگهی‌ها') + '" enterkeyhint="search" autocomplete="off"></label>' +
      '<button class="btn outline" id="cityBtn" style="padding:0 12px" aria-label="فیلتر شهر">' + TY.ic('pin', 'sm') + '<span id="cityLbl">همه شهرها</span></button></div>' +
      '<div class="chips scroll" id="cats" role="tablist" aria-label="دسته‌ها"></div></div>' +
      '<p class="count" id="count"></p><div id="list" class="feed cols"></div>';
    var state = {q: '', cat: '', city: '', items: []};
    var listEl = document.getElementById('list');

    function source() {
      if (isSaved) return Promise.resolve(TY.saved.all());
      return TY.feed().then(function (all) { return all.filter(function (x) { return x.type === type; }); });
    }
    function paintCats() {
      var counts = {};
      state.items.forEach(function (it) { String(it.cat || '').split(' ').forEach(function (c) { if (c && c !== '#دورکاری') counts[c] = (counts[c] || 0) + 1; }); });
      var tags = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
      var h = '<button class="chip" role="tab" aria-pressed="' + (!state.cat) + '" data-cat="">همه <span class="faint num">' + TY.fa(state.items.length) + '</span></button>';
      h += tags.map(function (t) { return '<button class="chip" role="tab" aria-pressed="' + (state.cat === t) + '" data-cat="' + TY.esc(t) + '">' + TY.esc(TY.catName(t)) + ' <span class="faint num">' + TY.fa(counts[t]) + '</span></button>'; }).join('');
      document.getElementById('cats').innerHTML = h;
    }
    function match(it) {
      if (state.cat && String(it.cat || '').split(' ').indexOf(state.cat) < 0) return false;
      if (state.city && String(it.city || '').indexOf(state.city) < 0 && String(it.text).indexOf(state.city) < 0) return false;
      if (state.q) { var q = TY.en(state.q).trim().toLowerCase(); var hay = TY.en((it.title || '') + ' ' + (it.text || '')).toLowerCase(); return q.split(/\s+/).every(function (w) { return hay.indexOf(w) >= 0; }); }
      return true;
    }
    function card(it) {
      var cats = String(it.cat || '').split(' ').filter(function (c) { return c && c !== '#دورکاری'; });
      var body = TY.cleanText(TY.bodyOf(it.text)).split('\n').filter(function (l) { l = l.trim(); return l && !/عنوان/.test(l) && l !== it.title && !/^(راه ارتباط|تماس|نام)\s*:/.test(l); }).map(function (l) { return l.replace(/^•\s*/, ''); }).join(' · ');
      var fresh = (Date.now() - (TY.parseDate(it.created) || 0)) < 36e5 * 24;
      return '<article class="item" tabindex="0" data-id="' + TY.esc(it.id) + '"><div class="top">' + (fresh ? '<span class="new" title="تازه"></span>' : '') +
        '<div class="ttl">' + TY.esc(it.title || 'بدون عنوان') + '</div>' +
        '<button class="savebtn" data-save aria-label="ذخیره" aria-pressed="' + TY.saved.has(it.id) + '">' + TY.ic('bookmark', 'sm') + '</button></div>' +
        '<div class="meta">' + (it.city ? '<span>' + TY.ic('pin', 'xs') + TY.esc(it.city) + '</span>' : '') + (it.created ? '<span>' + TY.ic('clock', 'xs') + TY.ago(it.created) + '</span>' : '') + '</div>' +
        '<div class="snip">' + TY.esc(TY.fa(body)) + '</div>' +
        '<div class="foot">' + cats.slice(0, 2).map(function (c) { return '<span class="badge">' + TY.esc(TY.catName(c)) + '</span>'; }).join('') +
        (type !== 'jobseeker' && it.dm ? '<span class="badge brand">ارسال مستقیم رزومه</span>' : '') + '</div></article>';
    }
    function paint() {
      var rows = state.items.filter(match);
      document.getElementById('count').textContent = rows.length ? TY.fa(rows.length) + (type === 'jobseeker' ? ' رزومه' : (isSaved ? ' مورد ذخیره‌شده' : ' آگهی')) : '';
      if (!rows.length) {
        listEl.classList.remove('cols');
        listEl.innerHTML = state.items.length ? TY.empty('search', 'چیزی پیدا نشد', 'عبارت دیگری را امتحان کن یا فیلترها را بردار.', '<button class="btn outline" id="clr">پاک کردن فیلترها</button>')
          : (isSaved ? TY.empty('bookmark', 'هنوز چیزی ذخیره نکرده‌ای', 'روی علامت ذخیره‌ی هر آگهی یا رزومه بزن تا اینجا بماند.', '<a class="btn primary" href="jobs.html">دیدن آگهی‌ها</a>')
            : TY.empty(type === 'jobseeker' ? 'resume' : 'briefcase', type === 'jobseeker' ? 'هنوز رزومه‌ی عمومی نیست' : 'هنوز آگهی‌ای نیست', 'به‌زودی اینجا پر می‌شود.', '<a class="btn primary" href="' + (type === 'jobseeker' ? 'jobseeker.html' : 'employer.html') + '">' + (type === 'jobseeker' ? 'ساخت رزومه' : 'ثبت آگهی') + '</a>'));
        var c = document.getElementById('clr'); if (c) c.onclick = function () { state.q = state.cat = state.city = ''; document.getElementById('q').value = ''; document.getElementById('cityLbl').textContent = 'همه شهرها'; paintCats(); paint(); };
        return;
      }
      listEl.classList.add('cols');
      listEl.innerHTML = rows.slice(0, 120).map(card).join('');
    }
    function find(id) { return state.items.filter(function (x) { return String(x.id) === String(id); })[0]; }

    listEl.addEventListener('click', function (e) {
      var art = e.target.closest('.item'); if (!art) return;
      var it = find(art.getAttribute('data-id')); if (!it) return;
      if (e.target.closest('[data-save]')) { var on = TY.saved.toggle(it); e.target.closest('[data-save]').setAttribute('aria-pressed', on); TY.toast(on ? 'ذخیره شد' : 'از ذخیره‌ها برداشته شد'); if (isSaved && !on) { state.items = TY.saved.all(); paint(); } return; }
      open(it);
    });
    listEl.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.classList.contains('item')) e.target.click(); });
    document.getElementById('cats').addEventListener('click', function (e) { var b = e.target.closest('[data-cat]'); if (!b) return; state.cat = b.getAttribute('data-cat'); paintCats(); paint(); });
    document.getElementById('q').addEventListener('input', TY.debounce(function (e) { state.q = e.target.value; paint(); }, 120));
    document.getElementById('cityBtn').onclick = function () {
      var cities = {}; state.items.forEach(function (it) { if (it.city) cities[it.city] = (cities[it.city] || 0) + 1; });
      var keys = Object.keys(cities).sort(function (a, b) { return cities[b] - cities[a]; });
      var s = TY.sheet({title: 'شهر', body: '<div class="list">' + [''].concat(keys).map(function (c) {
        return '<button class="row" data-c="' + TY.esc(c) + '"><div class="grow"><div class="t">' + (c ? TY.esc(c) : 'همه شهرها') + '</div></div>' + (c ? '<span class="faint num small">' + TY.fa(cities[c]) + '</span>' : '') + (state.city === c ? TY.ic('check', 'sm') : '') + '</button>';
      }).join('') + '</div>'});
      s.body.addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (!b) return; state.city = b.getAttribute('data-c'); document.getElementById('cityLbl').textContent = state.city || 'همه شهرها'; paint(); s.close(); });
    };

    function open(it) {
      var phone = (TY.en(it.text).match(/(?:\+98|0)9\d{9}/) || [])[0];
      var isJob = it.type === 'employer';
      var foot = document.createElement('div'); foot.style.display = 'contents';
      var primary = isJob ? '<button class="btn primary" data-apply>' + TY.ic('send', 'sm') + 'ارسال رزومه' + '</button>'
        : (phone ? '<a class="btn primary" href="tel:' + phone + '">' + TY.ic('phone', 'sm') + 'تماس</a>' : '');
      foot.innerHTML = primary + '<button class="btn outline" data-save2 aria-pressed="' + TY.saved.has(it.id) + '">' + TY.ic('bookmark', 'sm') + (TY.saved.has(it.id) ? 'ذخیره شده' : 'ذخیره') + '</button>';
      var head = '<button class="iconbtn" data-share aria-label="اشتراک">' + TY.ic('share', 'sm') + '</button>';
      var cats = String(it.cat || '').split(' ').filter(Boolean);
      var body = '<div class="meta small muted hstack" style="flex-wrap:wrap;gap:6px 14px;margin-bottom:14px">' +
        (it.city ? '<span class="hstack" style="gap:4px">' + TY.ic('pin', 'xs') + TY.esc(it.city) + '</span>' : '') +
        (it.created ? '<span class="hstack" style="gap:4px">' + TY.ic('clock', 'xs') + TY.ago(it.created) + '</span>' : '') +
        cats.map(function (c) { return '<span class="badge">' + TY.esc(TY.catName(c)) + '</span>'; }).join('') + '</div>' +
        '<div class="posttext">' + TY.richText(it.text) + '</div>' +
        (it.msg ? '<a class="btn ghost sm mt4" target="_blank" rel="noopener" href="https://t.me/' + TY.CHANNEL + '/' + TY.esc(it.msg) + '">' + TY.ic('megaphone', 'xs') + 'دیدن در کانال</a>' : '') +
        (isJob && !it.dm ? '<p class="help mt3">این آگهی از کانال آمده؛ رزومه‌ات از طریق ادمین به کارفرما می‌رسد.</p>' : '');
      var s = TY.sheet({title: it.title || (isJob ? 'آگهی' : 'رزومه'), body: body, footer: foot, headExtra: head});
      s.el.querySelector('[data-share]').onclick = function () { TY.share(it.title, location.origin + location.pathname + '?id=' + encodeURIComponent(it.id)); };
      foot.querySelector('[data-save2]').onclick = function () { var on = TY.saved.toggle(it); this.innerHTML = TY.ic('bookmark', 'sm') + (on ? 'ذخیره شده' : 'ذخیره'); TY.toast(on ? 'ذخیره شد' : 'برداشته شد'); paint(); };
      var ap = foot.querySelector('[data-apply]'); if (ap) ap.onclick = function () { apply(it, s); };
      try { history.replaceState(history.state, '', location.pathname + '?id=' + encodeURIComponent(it.id)); } catch (e) {}
    }

    function apply(it, parent) {
      if (!TY.requireLogin()) return;
      var me = TY.cachedMe() || {};
      var seenT = {}, resumes = (me.mine || []).filter(function (x) { return x.type === 'jobseeker' && x.text && x.status !== 'rejected'; })
        .sort(function (x, y) { return (x.status === 'direct') - (y.status === 'direct'); }).filter(function (x) { var k = x.text.slice(0, 400); if (seenT[k]) return false; seenT[k] = 1; return true; });
      if (!resumes.length) { location.href = 'jobseeker.html?to=' + encodeURIComponent(it.id); return; }
      parent.close();
      var body = '<p class="muted small" style="margin-top:0">کدام رزومه برای «' + TY.esc(it.title) + '» فرستاده شود؟</p><div class="list">' + resumes.map(function (r, i) {
        return '<button class="row" data-i="' + i + '"><span class="tile-ic brand">' + TY.ic('resume', 'sm') + '</span><div class="grow"><div class="t">' + TY.esc(r.title || 'رزومه') + '</div><div class="s">' + TY.ago(r.created) + '</div></div>' + TY.ic('fwd', 'sm chev') + '</button>';
      }).join('') + '</div><a class="btn ghost block mt3" href="jobseeker.html?to=' + encodeURIComponent(it.id) + '">' + TY.ic('plus', 'sm') + 'ساخت رزومه‌ی تازه</a>';
      var s = TY.sheet({title: 'ارسال رزومه', body: body});
      s.body.addEventListener('click', function (e) {
        var b = e.target.closest('[data-i]'); if (!b) return;
        var r = resumes[+b.getAttribute('data-i')];
        TY.needV2().then(function (ok) {
          if (!ok) return;
          b.style.opacity = .5;
          TY.api('submit', {type: 'jobseeker', vis: 'direct', target: it.id, title: r.title, text: r.text, tags: r.cat}).then(function (res) {
            if (res && res.ok) { s.close(); TY.toast(it.dm ? 'رزومه برای کارفرما فرستاده شد' : 'رزومه برای ادمین فرستاده شد تا به کارفرما برساند'); }
            else { b.style.opacity = 1; TY.toast(TY.errText(res), 'err'); }
          }).catch(function () { b.style.opacity = 1; TY.toast(TY.errText(), 'err'); });
        });
      });
    }

    var cached = isSaved ? TY.saved.all() : (TY.cachedFeed() || []).filter(function (x) { return x.type === type; });
    if (cached.length || isSaved) { state.items = cached; paintCats(); paint(); } else listEl.innerHTML = TY.skeleton(4);
    var want = TY.qs('id');
    source().then(function (items) {
      state.items = items; paintCats(); paint();
      if (want) { var it = find(want); if (it) open(it); else TY.toast('این مورد دیگر فعال نیست', 'err'); want = null; }
    }).catch(function () { if (!state.items.length) listEl.innerHTML = TY.empty('alert', 'اتصال برقرار نشد', 'اینترنت را چک کن و دوباره امتحان کن.', '<button class="btn primary" onclick="location.reload()">تلاش دوباره</button>'); });
    if (TY.session()) { TY.me(); TY.startPolling(); }
  };
})();
