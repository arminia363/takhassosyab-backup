/* تخصص‌یاب — خواندن متن آگهی استخدام (قالب کانال یا متن آزاد) و تبدیل به فیلدهای فرم ثبت آگهی.
   استخراج متن از فایل (PDF/DOCX/TXT) با TYResume انجام می‌شود؛ همه‌چیز داخل مرورگر است و چیزی آپلود نمی‌شود. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./resume.js')); else root.TYAd = factory(root.TYResume);
})(typeof self !== 'undefined' ? self : this, function (R) {
  'use strict';
  var norm = R.norm, K = R.K, clean = R.clean, faSafe = R.faSafe, ROLE = R.ROLE;

  var LAB = {};
  function add(key, list) { list.forEach(function (l) { LAB[K(l)] = key; }); }
  add('title', ['عنوان شغل', 'عنوان شغلی', 'عنوان', 'عنوان آگهی', 'سمت', 'سمت شغلی', 'موقعیت شغلی', 'موقعیت', 'پست', 'پست سازمانی', 'شغل', 'نیازمندیم', 'job title', 'position', 'role', 'title', 'vacancy', 'job']);
  add('industry', ['صنعت', 'حوزه فعالیت', 'حوزه', 'زمینه فعالیت', 'industry', 'sector']);
  add('company', ['فروشگاه / شرکت', 'فروشگاه شرکت', 'فروشگاه', 'شرکت', 'نام شرکت', 'نام فروشگاه', 'کارفرما', 'مجموعه', 'نام مجموعه', 'company', 'company name', 'employer', 'organization']);
  add('location', ['محل کار', 'محل فعالیت', 'محل', 'آدرس', 'نشانی', 'شهر', 'موقعیت مکانی', 'مکان', 'location', 'address', 'city', 'محل خدمت']);
  add('area', ['محدوده', 'منطقه']);
  add('coop', ['نوع همکاری', 'همکاری', 'نوع قرارداد', 'نوع استخدام', 'نوع شغل', 'job type', 'employment type']);
  add('reqs', ['شرایط و مهارت‌ها', 'شرایط و مهارتها', 'شرایط', 'شرایط احراز', 'شرایط متقاضی', 'شرایط لازم', 'مهارت‌ها', 'مهارتها', 'مهارت', 'مهارت‌های مورد نیاز', 'مهارت‌های لازم', 'توانایی‌ها', 'الزامات', 'نیازمندی‌ها', 'شرایط عمومی', 'شرایط اختصاصی', 'شرایط و ویژگی‌ها', 'ویژگی‌ها', 'ویژگی‌های مورد نیاز', 'requirements', 'qualifications', 'skills', 'required skills']);
  add('duties', ['شرح وظایف', 'وظایف', 'شرح شغل', 'شرح موقعیت', 'responsibilities', 'duties', 'about the role', 'job description']);
  add('hours', ['ساعت کاری', 'ساعات کاری', 'ساعت کار', 'ساعات کار', 'روز و ساعت کاری', 'روزها و ساعت کاری', 'working hours', 'work hours', 'hours', 'schedule', 'شیفت']);
  add('salary', ['حقوق', 'دستمزد', 'حقوق و مزایا', 'میزان حقوق', 'حقوق ماهانه', 'salary', 'pay', 'compensation', 'salary range']);
  add('benefits', ['مزایا', 'امکانات', 'مزایای شغل', 'مزایایی', 'benefits', 'perks']);
  add('contact', ['راه ارتباط', 'راه ارتباطی', 'راه‌های ارتباطی', 'راه ارتباط با ما', 'تماس', 'شماره تماس', 'تلفن', 'تلفن تماس', 'شماره', 'موبایل', 'همراه', 'ارتباط', 'ارسال رزومه', 'جهت ارسال رزومه', 'contact', 'phone', 'email', 'apply', 'how to apply', 'واتساپ', 'تلگرام', 'ایمیل', 'تماس بگیرید']);
  add('reqitem', ['جنسیت', 'سن', 'تحصیلات', 'مدرک', 'مدرک تحصیلی', 'سابقه', 'سابقه کار', 'نظام وظیفه', 'وضعیت نظام وظیفه', 'تعداد نیرو', 'تسلط', 'زبان', 'نرم‌افزار', 'نرم‌افزارها', 'تجربه', 'gender', 'age', 'education', 'experience', 'degree']);
  var MULTI = {reqs: 1, benefits: 1, duties: 1};
  var BUL = /^(?:[\-–•*▪▫●■◆‣·✓✔✅☑▶►▸➤➕➖⭕👈\uFE0F]|[\u{1F539}\u{1F538}\u{1F53A}\u{1F53B}\u{1F7E2}\u{1F7E3}\u{1F449}\u{2705}]|\d{1,2}\s*[.)]\s)/u;
  var SUBHEAD = /^(?:لازم|الزامی|مزیت|مزیت‌ها|ترجیحی|امتیاز|مزیت محسوب می‌شود|plus|nice to have|required|preferred|must have|bonus)\s*[:：]?\s*$/i;
  var CH = /@(?:JobVacencies|Takhasosbot|takhassosyab\w*)\b/ig;

  function stripDeco(s) { return s.replace(/^[^\u0600-\u06ffA-Za-z0-9]+/, '').replace(/[^\u0600-\u06ffA-Za-z0-9]+$/, ''); }
  function head(line) {
    var m = line.match(/^([^:：]{1,40}?)\s*[:：]\s*(.*)$/);
    if (m) { var k = LAB[K(stripDeco(m[1]))]; if (k) return {key: k, rest: m[2].trim(), label: stripDeco(m[1])}; }
    if (line.length <= 40) { var k2 = LAB[K(stripDeco(line))]; if (k2 && k2 !== 'reqitem') return {key: k2, rest: '', label: ''}; }
    return null;
  }
  function stripBul(s) { return clean(s.replace(/^[\s\-–•*▪▫●■◆‣·✓✔✅☑▶►▸➤➕➖⭕👈\uFE0F\u{1F539}\u{1F538}\u{1F53A}\u{1F53B}\u{1F7E2}\u{1F7E3}\u{1F449}]+/u, '').replace(/^\d{1,2}\s*[.)]\s+/, '')); }

  /* ---- cleanup of text pasted from Telegram / Instagram ---- */
  function pre(raw) {
    var t = norm(raw).replace(CH, ' ');
    var out = [];
    t.split('\n').forEach(function (l) {
      var s = l.trim();
      if (/^(?:forwarded from|فوروارد شده|فوروارد از|view in telegram|edited|reply to|مشاهده در تلگرام)/i.test(s)) return;
      if (/^[\d.,]+\s*[kKmM]?\s*(?:👁|views?|بازدید)/i.test(s) || /^\d{1,2}:\d{2}(?:\s*[AaPp][Mm])?$/.test(s)) return;
      if (/^(?:link in bio|لینک در بایو|لینک بایو|دایرکت|for more|follow us|فالو|@?\w*\s*instagram)\b.{0,30}$/i.test(s) && !/\d{9}/.test(s)) return;
      if (/^کانال\s*(?:آگهی|ما|رسمی)/.test(s)) return;
      if (s && !/[A-Za-z0-9\u0600-\u06ff]/.test(s)) { out.push(''); return; }
      out.push(s);
    });
    return out.join('\n');
  }
  function takeTags(text) {
    var tags = (text.match(/#[^\s#]+/g) || []).map(function (x) { return x.slice(1).replace(/_/g, ' ').replace(/[،,.؛!]+$/, ''); });
    return {tags: tags, text: text.replace(/#[^\s#]+/g, ' ').replace(/[ \t]+/g, ' ').replace(/^ +| +$/gm, '')};
  }

  /* ---- field helpers ---- */
  var STOP = /(?:^|\s)(?:با|در|برای|جهت|به|از|که|خانم|آقا|آقایان|خانمها|مسلط|ساکن|مجرب|فعال|دارای|تمام|پاره|فوری|ترجیحا|ترجیحاً|واجد|علاقه|مند|با\s*سابقه|می)(?=\s|$)/;
  function cutTitle(s) {
    s = s.replace(/\u200c/g, '\u200c');
    var m = /[،,.(–|:!؟؛\n]|\s-\s|\s\/\s/.exec(s); if (m) s = s.slice(0, m.index);
    var m2 = STOP.exec(s); if (m2) s = s.slice(0, m2.index);
    var w = s.trim().split(/\s+/), keep = [], cities = R.CITIES;
    for (var i = 0; i < w.length && keep.length < 5; i++) { if (cities.indexOf(w[i]) >= 0 && keep.length) break; keep.push(w[i]); }
    return keep.join(' ').trim();
  }
  function lastRole(s) { var re = new RegExp(R.ROLE.source, 'ig'), m, last = -1; while ((m = re.exec(s))) { last = m.index + (/^[^\u0600-\u06ffA-Za-z]/.test(m[0]) ? 1 : 0); } return last < 0 ? '' : s.slice(last); }
  function titleFromLine(l, D) {
    var m, s;
    m = /(?:استخدام|جذب|نیازمند(?:یم|\s+به)?|نیاز\s*به|نیاز\s*داریم|دعوت\s*به\s*همکاری\s*از|یک\s*نفر)\s*[:\-–]?\s*(?:یک|یه|تعدادی|\d+)?\s*(?:نفر|عدد|تن)?\s*([^\n.!؟]{2,70})/.exec(l);
    if (m) { s = cutTitle(m[1]); if (s && ((ROLE.test(s)) || R.mapTitle(s, D))) return s; }
    m = /^(.*?)\s+(?:استخدام\s*می[\u200c ]?کند|استخدام\s*می[\u200c ]?کنند|استخدام\s*می[\u200c ]?کنیم|جذب\s*می[\u200c ]?کند|جذب\s*می[\u200c ]?کنیم|نیازمند\s+است|می[\u200c ]?پذیرد|می[\u200c ]?پذیریم)/.exec(l);
    if (m) { s = lastRole(m[1]); if (s) return cutTitle(s) || s; }
    m = /(?:we(?:'re| are)\s+hiring|is\s+hiring|now\s+hiring|hiring|looking\s+for|seeking|vacancy|opening|wanted)\s*[:\-–]?\s*(?:an?\s+|the\s+)?([A-Za-z][A-Za-z\/& \-]{2,50}?)(?=\s+(?:for|at|in|to|with|who|based|to join)\b|[.,\n(!|:–]|$)/i.exec(l);
    if (m) return clean(m[1]);
    return '';
  }
  var COOP = [[/تمام\s*[\u200c ]?وقت|full[\s\-]?time/i, 'تمام‌وقت'], [/پاره\s*[\u200c ]?وقت|part[\s\-]?time/i, 'پاره‌وقت'], [/دور\s*[\u200c ]?کار|remote|work from home|\bwfh\b/i, 'دورکاری'], [/ترکیبی|hybrid/i, 'ترکیبی'], [/پروژه\s*[\u200c ]?ای|freelance|contract(?:or)?\b|project[\s\-]?based/i, 'پروژه‌ای']];
  function coopOf(t) {
    var out = [];
    COOP.forEach(function (c) { var m = c[0].exec(t); if (!m) return; var ctx = t.slice(Math.max(0, m.index - 14), m.index); if (/بدون|نیست|ندارد|غیر|no |not /i.test(ctx)) return; out.push(c[1]); });
    return out;
  }
  var IND_STRONG = [[/موبایل|گوشی|تبلت|mobile/i, 'موبایل و تبلت'], [/واردات|صادرات|ترخیص|بازرگانی|تجارت|import|export|trading/i, 'واردات و صادرات'], [/نرم\s*[\u200c ]?افزار|software|وب\s*سایت|\bIT\b/i, 'فناوری اطلاعات و نرم‌افزار'], [/داروخانه|دارو\b|pharma/i, 'دارو و تجهیزات پزشکی'], [/رستوران|کافه|restaurant|cafe/i, 'رستوران و کافه'], [/هتل|گردشگری|hotel|tourism/i, 'هتلداری و گردشگری'], [/بانک|بیمه|bank|insurance/i, 'بانک و بیمه'], [/پخش|توزیع/i, 'پخش و توزیع']];
  function industryOf(text, D, strongFrom) {
    var k = R.matchIndustry(text, D); if (k) return k;
    for (var i = 0; i < IND_STRONG.length; i++) if (IND_STRONG[i][0].test(strongFrom || '')) return IND_STRONG[i][1];
    return '';
  }
  var BENEF = /بیمه|پورسانت|پاداش|عیدی|سرویس\s*(?:رفت|ایاب)|ایاب\s*و\s*ذهاب|ناهار|غذا|وام|مرخصی|پورسانت|کمیسیون|bonus|insurance|commission|lunch|health|stock|equity/i;
  var REQW = /سابقه|آشنایی|مسلط|تسلط|مدرک|لیسانس|کارشناسی|کاردانی|دیپلم|متاهل|روابط\s*عمومی|حداقل|حداکثر|توانایی|روحیه|انگیزه|ظاهر|نظم|نرم\s*[\u200c ]?افزار|\bexcel\b|experience|degree|proficien|knowledge|familiar|years?\b|ability|bachelor|master|fluent|strong|excellent/i;

  function contactsOf(text, scoped) {
    var m = R.mobileOf(scoped || text) || (scoped ? R.mobileOf(text) : '');
    var t = norm(scoped || text);
    var handle = (t.match(/(?:^|[\s:(،,])@([A-Za-z][A-Za-z0-9_]{3,31})(?![A-Za-z0-9_@.])/) || [])[1];
    var tme = (t.match(/t(?:elegram)?\.me\/([A-Za-z0-9_+]{4,})/i) || [])[1];
    var mail = (t.match(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/) || [])[0];
    var land = (t.match(/(?:^|[^\d])(0\d{2}[\s\-]?\d{8}|0\d{2}[\s\-]?\d{4}[\s\-]?\d{4}|\(0\d{2}\)[\s\-]?\d{8})(?!\d)/) || [])[1];
    return m || (handle ? '@' + handle : '') || (tme ? '@' + tme.replace(/^\+/, '') : '') || mail || (land ? land.replace(/[\s()\-]/g, '') : '');
  }
  function areaOf(v, city) {
    var s = v; if (city) s = s.replace(new RegExp(city.replace(/\u200c/g, '\u200c?'), 'i'), ' ');
    s = clean(s.replace(/^(?:شهر|استان|آدرس|نشانی)\s*[:：]?/i, ' ').replace(/^[\s،,\-–/|:()]+|[\s،,\-–/|:()]+$/g, '').replace(/^(?:ایران|استان)[\s،,\-–]+/, ''));
    return s.length > 60 ? s.slice(0, 60).replace(/[\s،,]+\S*$/, '') : s;
  }

  function parse(rawText, D) {
    var text0 = pre(rawText), tg = takeTags(text0), text = tg.text, tags = tg.tags;
    var lines = text.split('\n'), secs = {}, cur = null, blank = false, unl = [], extraReq = [];
    lines.forEach(function (l) {
      var t = l.trim();
      if (!t) { blank = true; return; }
      var h = head(t);
      if (h) {
        blank = false;
        if (h.key === 'reqitem') { extraReq.push(clean(h.label + ': ' + h.rest)); if (cur && MULTI[cur.key]) { /* keep section open */ } else cur = null; return; }
        cur = {key: h.key}; (secs[h.key] = secs[h.key] || []).push(h.rest); if (!h.rest) secs[h.key].pop(); if (!secs[h.key].length) secs[h.key].length = 0; return;
      }
      var bullet = BUL.test(t);
      if (cur && (bullet || (!blank && MULTI[cur.key]) || (MULTI[cur.key] && SUBHEAD.test(t)))) { secs[cur.key].push(bullet ? stripBul(t) : t); blank = false; return; }
      cur = null; blank = false; unl.push(t);
    });
    function sec(k) { return (secs[k] || []).filter(Boolean); }
    var f = {}, found = {};
    function set(k, v) { if (v != null && v !== '' && !(Array.isArray(v) && !v.length)) { f[k] = v; found[k] = 1; } }
    var whole = text, firstLines = unl.slice(0, 4);
    var unlc = []; unl.forEach(function (l) { l.split(/\s[-–]\s|\s\|\s|•|[؛;]|\.\s|\s\+\s(?=\D)/).forEach(function (c) { c = c.trim(); if (c) unlc.push(c); }); });

    /* --- title / department --- */
    var titleRaw = sec('title').join(' ');
    if (titleRaw) titleRaw = clean(titleRaw);
    var allCand = firstLines.concat(unl.slice(4)).concat(sec('duties').slice(0, 0));
    if (!titleRaw) for (var i = 0; i < allCand.length && !titleRaw; i++) { var tt = titleFromLine(allCand[i], D); if (tt) titleRaw = tt; }
    if (!titleRaw) for (var j = 0; j < Math.min(3, unl.length) && !titleRaw; j++) { if (unl[j].length <= 60 && R.mapTitle(unl[j], D) && ROLE.test(unl[j])) titleRaw = unl[j]; }
    var gender = ''; var gm = /(?:^|[\s(،,])(خانم(?:ها)?|آقا(?:ی|یان)?)(?=[\s),،.]|$)/.exec(' ' + (titleRaw || '') + ' ' + (allCand[0] || '')); if (gm) gender = gm[1].replace(/ها$/, '').replace(/^آقایان$|^آقای$/, 'آقا');
    if (titleRaw) {
      titleRaw = titleRaw.replace(/\s+(?:needed|wanted|required|hiring)\s*$/i, '');
      var parts = titleRaw.split(/\s*[–|(]\s*|\s-\s/), main = clean(parts[0]).replace(/[)]/g, ''), extra = clean(parts.slice(1).join(' ').replace(/[)]/g, '')).slice(0, 40);
      var mp = R.mapTitle(main, D) || R.mapTitle(titleRaw, D);
      if (mp) {
        var dep = D.depts.filter(function (d) { return d.key === mp.dept; })[0]; set('dept', dep.name);
        if (mp.pos === 'سایر') { set('pos', 'سایر'); set('custom', faSafe(main)); } else {
          var remn = clean(main.replace(mp.pos, ' '));
          if (remn && remn !== main && /^(?:کارشناس|مسئول|مسوول|سرپرست|مدیر|کمک|کارمند|متخصص|مهندس)$/.test(remn)) { set('pos', 'سایر'); set('custom', faSafe(main)); mp = {dept: mp.dept, pos: 'سایر', keep: 1}; } else
          set('pos', mp.pos);
          if (!mp.keep && K(main) !== K(mp.pos) && K(mp.pos).indexOf(K(main)) < 0 && !extra) { var ix = main.indexOf(mp.pos); extra = ix >= 0 ? clean(main.replace(mp.pos, ' ')) : (main.length <= 40 ? main.replace(/\s+(?:needed|wanted|required|hiring)$/i, '') : ''); }
        }
        if (gender && K(extra).indexOf(K(gender)) < 0) extra = clean((extra ? extra + '، ' : '') + gender);
        if (extra && !/[\u0600-\u06ff]/.test(extra) === false) extra = extra; set('extra', faSafe(extra.replace(/^[،,\s]+|[،,\s]+$/g, '')));
      } else if (main.length >= 2 && main.length <= 60) { // unknown role: still pick a dept from keywords if any, else leave for the user
        var dk = null; [['sales', /فروش|بازاریاب|sales/i], ['finance', /مالی|حساب|account/i], ['hr', /منابع انسانی|اداری|منشی|\bhr\b/i], ['it', /\bit\b|شبکه|نرم.?افزار|software|developer|برنامه.?نویس/i], ['marketing', /مارکتینگ|محتوا|گرافیک|سئو|marketing|design/i], ['support', /پشتیبان|مشتری|support/i], ['warehouse', /انبار|لجستیک|warehouse/i], ['aftersales', /تعمیر|گارانتی|فنی/i], ['commerce', /بازرگان|ترخیص|خرید/i], ['management', /مدیر|manager|director/i]].forEach(function (x) { if (!dk && x[1].test(main)) dk = x[0]; });
        if (dk) { set('dept', D.depts.filter(function (d) { return d.key === dk; })[0].name); set('pos', 'سایر'); set('custom', faSafe(main)); }
      }
    }
    if (!f.dept) { // hashtag fallback
      tags.forEach(function (tg2) { if (f.dept) return; D.depts.forEach(function (d) { if (!f.dept && K(d.tag) === K('#' + tg2)) { set('dept', d.name); } }); });
    }

    /* --- company --- */
    var comp = clean(sec('company').join(' '));
    if (!comp) {
      var cm = /(?:^|[\s(،,:])((?:شرکت|فروشگاه|گروه|موسسه|مؤسسه|آموزشگاه|هلدینگ|کارخانه|مجتمع|رستوران|کافه|داروخانه|کلینیک|مطب|دفتر|بانک|استودیو|آتلیه|تعمیرگاه|کارگاه|سوپرمارکت|پاساژ)\s+[^\n،,.:؛()|!؟]{2,60})/.exec(unl.join('\n'));
      if (cm) {
        var cs = cm[1], rl = new RegExp(R.ROLE.source, 'i').exec(' ' + cs); if (rl && rl.index > 6) cs = cs.slice(0, rl.index - 1);
        cs = cs.replace(/\s+(?:در|به|جهت|برای|نیازمند\w*|استخدام\w*|تعدادی|دعوت|از|با|واقع|نیاز|می\S*|جذب|اعلام|تهران|مشهد|اصفهان|شیراز|تبریز|کرج).*$/, '');
        comp = clean(cs);
      }
      if (!comp) { var em = /(?:^|\n)([A-Z][A-Za-z0-9&.\- ]{1,40}?)\s+(?:is\s+(?:hiring|looking|seeking)|\(hiring\))/.exec(unl.join('\n')) || /\bat\s+([A-Z][A-Za-z0-9&.\-]+(?:\s+[A-Z][A-Za-z0-9&.\-]+){0,3})/.exec(unl.join('\n')); if (em) comp = clean(em[1]); }
    }
    comp = clean(comp.split(/[,،|]/)[0]);
    if (comp && comp.length > 60) comp = comp.slice(0, 60);
    set('company', faSafe(comp));

    /* --- location --- */
    var locV = clean(sec('location').join('، ')), areaV = clean(sec('area').join('، ')), city = null;
    if (locV) city = R.findCity(locV);
    if (!city) { tags.forEach(function (x) { if (!city) city = R.findCity(' ' + x + ' '); }); }
    if (!city && !locV) { var lc = unl.filter(function (l) { return /محل|آدرس|واقع|ساکن|شهر|location|based in|office/i.test(l); }).join(' '); city = R.findCity(lc) || R.findCity(unl.slice(0, 6).join(' \n ')) || R.findCity(whole); }
    if (!city && locV) city = R.findCity(whole);
    if (city) { set('city', city); if (locV) { var ar = areaOf(locV, city); if (ar && !areaV) areaV = ar; } }
    else if (locV && locV.length <= 40 && !/\d/.test(locV)) { set('city', faSafe(locV)); }
    if (areaV) set('area', faSafe(areaV));

    /* --- cooperation --- */
    var coopSrc = sec('coop').join(' ');
    var cp = coopOf(coopSrc); if (!cp.length) cp = coopOf(unl.concat(sec('hours')).join(' \n ') + ' ' + sec('title').join(' ') + ' ' + tags.join(' '));
    if (!cp.length) cp = coopOf(whole);
    var order = D.coop; set('coop', order.filter(function (c) { return cp.indexOf(c) >= 0; }));

    /* --- hours --- */
    var hrs = clean(sec('hours').join('، '));
    if (!hrs) {
      var TR = /(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:تا|الی|-|–|to|until)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i;
      for (var q = 0; q < unlc.length && !hrs; q++) {
        var ln = unlc[q];
        if (/میلیون|تومان|ریال|million|salary|حقوق/i.test(ln) && !/ساعت\s*(?:کاری|کار)|شنبه/.test(ln)) continue;
        if (TR.test(ln) && /ساعت|شنبه|شیفت|روز|work|hours|mon|fri|sat|shift/i.test(ln)) {
          var cl = ln.split(/[|•]|\s{2,}|[.؛;](?=\s)/).filter(function (c) { return TR.test(c); })[0] || ln;
          hrs = clean(cl.replace(/^.*?(?:ساع(?:ت|ات)\s*(?:کاری|کار)|working hours)\s*[:：\-–]?\s*/i, ''));
        }
      }
      if (!hrs) { var sm = /(?:شیفت\s*(?:صبح|عصر|شب)|(?:شنبه|یک\s?شنبه)\s*تا\s*(?:چهارشنبه|پنج\s?شنبه|جمعه)[^\n.،]{0,30})/.exec(whole); if (sm) hrs = clean(sm[0]); }
    }
    set('hours', faSafe(hrs.slice(0, 120)));

    /* --- salary --- */
    var salV = clean(sec('salary').join(' '));
    if (!salV) { for (var z = 0; z < unlc.length; z++) { if (/حقوق|دستمزد|salary|پرداختی|میلیون|million/i.test(unlc[z]) && !/ساعت\s*(?:کاری|کار)/.test(unlc[z])) { salV = clean(unlc[z].replace(/^.*?(?=حقوق|دستمزد|salary|پرداختی|\d)/i, '')); break; } } }
    if (!salV) { var all = sec('reqs').concat(sec('benefits')); for (var y = 0; y < all.length; y++) if (/حقوق\s*(?:ثابت|پایه|از|تا|[:：]|\d)|salary|دستمزد/i.test(all[y]) && /\d|توافق|negotiable/i.test(all[y])) { salV = all[y]; secs.reqs = (secs.reqs || []).filter(function (x) { return x !== all[y]; }); secs.benefits = (secs.benefits || []).filter(function (x) { return x !== all[y]; }); break; } }
    var salPlus = ''; if (salV && /\+/.test(salV)) { var sx = salV.split('+'); salV = sx[0]; salPlus = sx.slice(1).join('، '); }
    if (salV) {
      var sp = R.parseSalary(salV);
      if (sp && sp.mode === 'range') { set('salMode', 'range'); set('salMin', sp.min); set('salMax', sp.max); } else if (sp && sp.mode === 'agree') set('salMode', 'agree');
      else if (/توافق|negotiable/i.test(salV)) set('salMode', 'agree');
    }

    /* --- benefits --- */
    var ben = sec('benefits').map(stripBul);
    var benFromReqs = [];
    var reqL = sec('reqs').map(stripBul);
    if (!ben.length) {
      var rest = [];
      reqL.forEach(function (x) { if (BENEF.test(x) && !REQW.test(x)) benFromReqs.push(x); else rest.push(x); });
      unlc.forEach(function (x) { if (BENEF.test(x) && !REQW.test(x) && x.length <= 120 && !/حقوق\s*[:：]|salary/i.test(x) && f.salMode !== 'agree' || (BENEF.test(x) && /^(?:مزایا|✅|🎁)/.test(x))) benFromReqs.push(clean(x.replace(/^.*?(?:مزایا|benefits)\s*[:：]?\s*/i, ''))); });
      if (benFromReqs.length) { ben = benFromReqs; reqL = rest; }
    }
    if (salPlus && BENEF.test(salPlus)) ben.push(clean(salPlus));
    var benS = ben.join('، '); benS = benS.replace(/\s*\+\s*/g, '، ');
    set('benefits', faSafe(clean(benS).slice(0, 160)));

    /* --- requirements / skills --- */
    var reqs = reqL.slice();
    extraReq.forEach(function (x) { reqs.push(x); });
    var introReq = []; unl.forEach(function (x) { if (/می[\u200c ]?پذیر|استخدام|نیازمند/.test(x) || (comp && x.indexOf(comp) >= 0)) { var em2 = /(?:حداقل|حداکثر)?\s*\d+\s*سال\s*(?:سابقه|تجربه)(?:\s*(?:کار|مرتبط)\S*)?/.exec(x); if (em2) introReq.push(clean(em2[0])); } });
    if (!reqs.length) unl.forEach(function (x) {
      if (x.length > 160 || x === titleRaw || /@|\d{9,}|^حقوق|میلیون/.test(x) || x === comp || (comp && x.indexOf(comp) >= 0) || /می[\u200c ]?پذیر/.test(x) || BENEF.test(x) && !REQW.test(x)) return;
      if (BUL.test(x) || (REQW.test(x) && !/نیازمند|استخدام|جذب|hiring/i.test(x))) { var c = stripBul(x); if (!(hrs && c.indexOf(hrs.slice(0, 12)) >= 0) && c.length >= 3) reqs.push(c); }
    });
    if (reqs.length || introReq.length) reqs = introReq.concat(reqs);
    var seen = {}; reqs = reqs.map(function (x) { return clean(x).replace(/^[\s\-–•*]+/, ''); }).filter(function (x) { var k = K(x); if (!x || seen[k] || x.length < 2) return false; seen[k] = 1; return true; }).slice(0, 14).map(function (x) { return faSafe(x.slice(0, 140)); });
    set('reqs', reqs.join('\n'));

    /* --- contact --- */
    var cScoped = sec('contact').join(' \n ');
    set('contact', contactsOf(unl.join('\n') + '\n' + sec('contact').join('\n') + '\n' + sec('benefits').join('\n') + '\n' + sec('reqs').join('\n'), cScoped) || contactsOf(text));

    /* --- industry --- */
    var indV = clean(sec('industry').join(' ')), ind = '';
    if (indV) ind = R.matchIndustry(indV, D);
    if (!ind) tags.forEach(function (x) { if (!ind) D.industries.forEach(function (i) { if (!ind && K(i.tag) === K('#' + x)) ind = i.name; }); });
    if (!ind && comp) ind = industryOf(comp, D, comp);
    if (!ind) { var tl = titleRaw || ''; ind = industryOf(tl, D, tl + ' ' + comp + ' ' + whole.slice(0, 600)); }
    set('industry', ind);

    /* --- urgent --- */
    if (/فوری|urgent|asap|immediate/i.test((titleRaw || '') + ' ' + tags.join(' ') + ' ' + unl.slice(0, 3).join(' ') + ' ' + text0.slice(0, 80))) set('urgent', true);

    return {fields: f, found: found, tags: tags};
  }

  return {parse: parse, titleFromLine: titleFromLine};
});
