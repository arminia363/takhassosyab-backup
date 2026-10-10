/* تخصص‌یاب — خواندن رزومه (PDF / DOCX / TXT) و پر کردن خودکار فرم رزومه.
   همه‌چیز داخل مرورگر انجام می‌شود؛ فایل جایی آپلود نمی‌شود. فقط وقتی کاربر دکمه‌ی آپلود را می‌زند بارگذاری می‌شود. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.TYResume = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------------------------------------------------------------- text normalisation */
  var DIAC = /[\u064B-\u065F\u0670\u0640]/g, ZW = /[\u200b\u200d\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff\u00ad]/g;
  var LAM_FIX = {'خالصه': 'خلاصه', 'اطالعات': 'اطلاعات', 'کالس': 'کلاس', 'تالش': 'تلاش', 'سالم': 'سلام', 'پالن': 'پلان', 'عالقه': 'علاقه', 'عالیق': 'علایق', 'تحصیالت': 'تحصیلات', 'سالمت': 'سلامت', 'مالقات': 'ملاقات', 'کالسهای': 'کلاسهای'};
  function norm(s) {
    s = String(s == null ? '' : s).replace(/\r/g, '');
    try { s = s.normalize('NFKC'); } catch (e) {}
    s = s.replace(ZW, '').replace(/[\u00a0\u2000-\u200a\u202f\u205f\u3000\t]/g, ' ')
      .replace(/[يىۍ]/g, 'ی').replace(/[كڪ]/g, 'ک').replace(/ة/g, 'ه').replace(/ۀ/g, 'ه').replace(/ؤ/g, 'ؤ')
      .replace(/[أإٱ]/g, 'ا').replace(DIAC, '')
      .replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 1776); })
      .replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); })
      .replace(/٬/g, ',').replace(/٫/g, '.').replace(/[–—‒―]/g, '–');
    return s;
  }
  function fixLam(s) { return s.replace(/[\u0600-\u06ff]+/g, function (w) { return LAM_FIX[w] || w; }); }
  function K(s) { return norm(s).replace(/[\s\u200c_\-–:：·•*#.'"«»()\[\]{}|\/\\,،؛;]+/g, '').toLowerCase(); }
  function clean(s) { return String(s || '').replace(/\u200c{2,}/g, '\u200c').replace(/\s+/g, ' ').trim(); }
  function faSafe(s) { s = String(s || ''); if (!/[\u0600-\u06ff]/.test(s)) return s; return s.replace(/\d+/g, function (m, off) { var b = s[off - 1] || '', a = s[off + m.length] || ''; return /[A-Za-z]/.test(b) || /[A-Za-z]/.test(a) ? m : fa(m); }); }
  function fa(s) { return String(s).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); }
  var RTLCH = /[\u0620-\u063f\u0641-\u064a\u066e-\u06d3\u06fa-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff\u05d0-\u05ea]/, RTLCH_G = new RegExp(RTLCH.source, 'g');

  /* ---------------------------------------------------------------- PDF → text */
  function itemType(s) { if (RTLCH.test(s)) return 'R'; if (/[A-Za-z]/.test(s)) return 'L'; if (/[0-9\u06f0-\u06f9\u0660-\u0669]/.test(s)) return 'D'; return 'N'; }
  function buildLine(its, rtlDoc) { // its: sorted by x ascending (visual order)
    var i, rc = 0, lc = 0, t;
    for (i = 0; i < its.length; i++) { rc += (its[i].s.match(RTLCH_G) || []).length; lc += (its[i].s.match(/[A-Za-z]/g) || []).length; }
    var dirR = rtlDoc ? (rc > 0 || lc === 0) : (rc > 0 && rc >= lc);
    if (dirR) { // a number with spaces inside one text item (e.g. a phone number): in RTL text its groups appear in reversed visual order
      var ex = [];
      its.forEach(function (it) {
        var str = it.s;
        if (itemType(str) === 'D' && /\S\s+\S/.test(str)) {
          var cw = it.w / Math.max(1, str.length), pos = 0;
          str.split(/(\s+)/).forEach(function (tk) { if (tk && !/^\s+$/.test(tk)) ex.push({s: tk, x: it.x + pos * cw, w: tk.length * cw, y: it.y, fs: it.fs}); pos += tk.length; });
        } else ex.push(it);
      });
      its = ex;
    }
    var ty = its.map(function (it) { return itemType(it.s); }), a;
    if (!dirR) ty = ty.map(function (x) { return x === 'D' ? 'L' : x; });
    else ty.forEach(function (x, k) { // a number that follows Latin text belongs to it (W7)
      if (x !== 'D') return; for (a = k - 1; a >= 0; a--) if (ty[a] !== 'N') { if (ty[a] === 'L') ty[k] = 'L'; break; }
    });
    ty.forEach(function (x, k) { // resolve neutrals (digits count as RTL for this, like the Unicode algorithm)
      if (x !== 'N') return; var p = null, n = null;
      for (a = k - 1; a >= 0; a--) if (ty[a] !== 'N') { p = ty[a] === 'D' ? 'R' : ty[a]; break; }
      for (a = k + 1; a < ty.length; a++) if (ty[a] !== 'N') { n = ty[a] === 'D' ? 'R' : ty[a]; break; }
      ty[k] = (p && p === n) ? p : (dirR ? 'R' : 'L');
    });
    function gapBetween(k) {
      if (k + 1 >= its.length) return false;
      var p = its[k], q = its[k + 1], g = q.x - (p.x + p.w);
      return g > Math.max(1.2, 0.2 * Math.min(p.fs, q.fs));
    }
    var runs = [];
    its.forEach(function (it, k) {
      var last = runs[runs.length - 1];
      if (last && last.t === ty[k] && !(ty[k] === 'D' && gapBetween(k - 1))) last.items.push(k); else runs.push({t: ty[k], items: [k]});
    });
    function gapAfter(k) { // is there a visible gap between item k and k+1 (visual)
      if (k + 1 >= its.length) return false;
      var a = its[k], b = its[k + 1], g = b.x - (a.x + a.w);
      return g > Math.max(1.2, 0.2 * Math.min(a.fs, b.fs));
    }
    var out = runs.map(function (r) {
      var idx = r.items.slice(), s = '';
      var seq = r.t === 'R' ? idx.slice().reverse() : idx;
      seq.forEach(function (k, j) {
        s += its[k].s;
        if (j < seq.length - 1) { var nx = seq[j + 1], lo = Math.min(k, nx); if (gapAfter(lo)) s += ' '; }
      });
      return {s: s, first: idx[0], last: idx[idx.length - 1]};
    });
    var order = dirR ? out.slice().reverse() : out, res = '';
    order.forEach(function (r, j) {
      res += r.s;
      if (j < order.length - 1) { var nx = order[j + 1], lo = Math.min(r.first, nx.first); if (gapAfter(lo === r.first && lo === nx.first ? lo : (r.first < nx.first ? r.last : nx.last))) res += ' '; }
    });
    return res;
  }
  function pageLines(items, pageW) {
    items = items.filter(function (it) { return it.s && it.s.replace(/\s/g, ''); });
    if (!items.length) return [];
    // group into visual lines
    function group(list) {
      var s = list.slice().sort(function (a, b) { return b.y - a.y || a.x - b.x; }), lines = [];
      s.forEach(function (it) {
        var L = lines[lines.length - 1];
        if (L && Math.abs(L.y - it.y) <= 0.45 * Math.min(L.fs, it.fs)) { L.items.push(it); } else lines.push({y: it.y, fs: it.fs, items: [it]});
      });
      lines.forEach(function (L) { L.items.sort(function (a, b) { return a.x - b.x; }); });
      return lines;
    }
    // column gutter detection (tolerates a few full-width header lines)
    var W = pageW || 600, bins = new Array(Math.ceil(W) + 2).fill(0);
    var allLines = group(items), nL = allLines.length;
    allLines.forEach(function (L) {
      var seen = {};
      L.items.forEach(function (it) { for (var x = Math.floor(it.x); x <= Math.ceil(it.x + it.w); x++) if (x >= 0 && x < bins.length) seen[x] = 1; });
      // mark coverage by line (a line covers the bin if any item spans it)
      for (var x in seen) bins[x]++;
    });
    var cmin = -1, cmax = -1, x;
    for (x = 0; x < bins.length; x++) if (bins[x] > 0) { if (cmin < 0) cmin = x; cmax = x; }
    var span = cmax - cmin, lo = cmin + Math.floor(span * 0.18), hi = cmax - Math.floor(span * 0.18), best = null, run = null;
    for (x = lo; x <= hi; x++) {
      var empty = bins[x] <= Math.max(1, Math.floor(nL * 0.12));
      if (empty) { if (!run) run = {a: x, b: x}; else run.b = x; } else { if (run && (!best || run.b - run.a > best.b - best.a)) best = run; run = null; }
    }
    if (run && (!best || run.b - run.a > best.b - best.a)) best = run;
    var cols = null;
    var allText = items.map(function (i) { return i.s; }).join('');
    var rtlDoc = (allText.match(RTLCH_G) || []).length > (allText.match(/[A-Za-z]/g) || []).length;
    if (best && best.b - best.a >= 8 && nL >= 8) {
      var gx = (best.a + best.b) / 2, left = [], right = [];
      items.forEach(function (it) { ((it.x + it.w / 2) < gx ? left : right).push(it); });
      if (left.length >= items.length * 0.15 && right.length >= items.length * 0.15) cols = {gx: gx};
    }
    if (!cols) return allLines.map(function (L) { return buildLine(L.items, rtlDoc); });
    // two columns: lines crossing the gutter are full-width bands
    var out = [], region = [];
    function flush() {
      if (!region.length) return;
      var l = [], r = [];
      region.forEach(function (L) {
        var li = L.items.filter(function (it) { return it.x + it.w / 2 < cols.gx; }), ri = L.items.filter(function (it) { return it.x + it.w / 2 >= cols.gx; });
        if (li.length) l.push(buildLine(li, rtlDoc)); if (ri.length) r.push(buildLine(ri, rtlDoc));
      });
      (rtlDoc ? r.concat(l) : l.concat(r)).forEach(function (t) { out.push(t); }); region = [];
    }
    allLines.forEach(function (L) {
      var span = L.items.some(function (it) { return it.x < cols.gx - 2 && it.x + it.w > cols.gx + 2; }) ||
        (L.items.every(function (it) { return it.x + it.w / 2 < cols.gx; }) === false && L.items.every(function (it) { return it.x + it.w / 2 >= cols.gx; }) === false && false);
      if (span) { flush(); out.push(buildLine(L.items, rtlDoc)); } else region.push(L);
    });
    flush();
    return out;
  }
  function reverseLine(s) { // for PDFs whose text came out visually reversed
    var r = s.split('').reverse().join('').replace(/[()]/g, function (c) { return c === '(' ? ')' : '('; });
    return r.replace(/[A-Za-z0-9@._+\-\/:,]+/g, function (m) { return m.split('').reverse().join(''); });
  }
  var FWD = ['شرکت', 'تحصیلات', 'مهارت', 'سوابق', 'تماس', 'موبایل', 'کاری', 'دانشگاه', 'زبان', 'نرم', 'تلفن', 'شهر'];
  function looksReversed(text) {
    var f = 0, b = 0; FWD.forEach(function (w) { f += text.split(w).length - 1; b += text.split(w.split('').reverse().join('')).length - 1; });
    return b >= 3 && b > f * 1.5;
  }
  function extractPdf(lib, buf, opt) {
    opt = opt || {};
    return lib.getDocument({data: new Uint8Array(buf), isEvalSupported: false, disableFontFace: true, useSystemFonts: false, verbosity: 0}).promise.then(function (doc) {
      var n = Math.min(doc.numPages, opt.maxPages || 6), p = Promise.resolve(), pages = [];
      var fn = function (i) {
        return doc.getPage(i).then(function (pg) {
          var vp = pg.getViewport({scale: 1});
          return pg.getTextContent({disableCombineTextItems: true}).then(function (tc) {
            var items = tc.items.map(function (it) {
              var t = it.transform || [0, 0, 0, 0, 0, 0], fs = Math.abs(t[3]) || Math.abs(it.height) || 10;
              return {s: it.str || '', x: t[4], y: t[5], w: it.width || 0, fs: fs};
            });
            pages.push(pageLines(items, vp.width).join('\n'));
          });
        });
      };
      for (var i = 1; i <= n; i++) (function (k) { p = p.then(function () { return fn(k); }); })(i);
      return p.then(function () { try { doc.destroy(); } catch (e) {} return pages.join('\n'); });
    });
  }

  /* ---------------------------------------------------------------- DOCX → text */
  function extractDocx(JSZip, buf) {
    return JSZip.loadAsync(buf).then(function (zip) {
      var f = zip.file('word/document.xml'); if (!f) throw new Error('badDocx');
      return f.async('string');
    }).then(function (xml) {
      if (xml.length > 30e6) throw new Error('badDocx');
      var doc = new DOMParser().parseFromString(xml, 'application/xml');
      if (doc.getElementsByTagName('parsererror').length) throw new Error('badDocx');
      var out = [];
      function para(p) {
        var s = '', numbered = false, nested = [];
        (function walk(n) {
          for (var c = n.firstChild; c; c = c.nextSibling) {
            if (c.nodeType !== 1) continue; var nm = c.nodeName;
            if (nm === 'mc:Fallback') continue;
            if (nm === 'w:txbxContent') { nested.push(c); continue; }
            if (nm === 'w:numPr') { numbered = true; continue; }
            if (nm === 'w:t') s += c.textContent; else if (nm === 'w:tab') s += ' '; else if (nm === 'w:br' || nm === 'w:cr') s += '\n';
            else if (nm === 'w:instrText' || nm === 'w:delText') continue; else walk(c);
          }
        })(p);
        s.split('\n').forEach(function (ln, i) { if (ln.trim()) out.push((numbered && i === 0 ? '• ' : '') + ln); });
        nested.forEach(block);
      }
      function block(n) {
        for (var c = n.firstChild; c; c = c.nextSibling) {
          if (c.nodeType !== 1) continue;
          if (c.nodeName === 'w:p') para(c); else if (c.nodeName === 'w:tbl' || c.nodeName === 'w:tr' || c.nodeName === 'w:tc' || c.nodeName === 'w:sdt' || c.nodeName === 'w:sdtContent' || c.nodeName === 'w:body') block(c);
        }
      }
      block(doc.getElementsByTagName('w:body')[0] || doc.documentElement);
      return out.join('\n');
    });
  }
  function decodeText(buf) {
    var u8 = new Uint8Array(buf), s = '';
    try { s = new TextDecoder('utf-8', {fatal: true}).decode(u8); } catch (e) { try { s = new TextDecoder('windows-1256').decode(u8); } catch (e2) { s = new TextDecoder('utf-8').decode(u8); } }
    return s;
  }

  /* ---------------------------------------------------------------- headings & vocab */
  var HEADS = {
    summary: ['خلاصه', 'خلاصه حرفه ای', 'خلاصه رزومه', 'درباره من', 'درباره ی من', 'هدف شغلی', 'هدف حرفه ای', 'هدف', 'معرفی', 'معرفی کوتاه', 'پروفایل', 'خلاصه ی حرفه ای', 'summary', 'professional summary', 'profile', 'professional profile', 'about', 'about me', 'objective', 'career objective'],
    contact: ['مشخصات', 'مشخصات فردی', 'اطلاعات فردی', 'اطلاعات شخصی', 'اطلاعات تماس', 'راه های ارتباطی', 'راه ارتباطی', 'تماس', 'ارتباط با من', 'contact', 'contact info', 'contact information', 'personal info', 'personal information', 'personal details', 'personal'],
    exp: ['سوابق کاری', 'سوابق شغلی', 'سابقه کار', 'سابقه کاری', 'سابقه شغلی', 'تجربیات کاری', 'تجربه کاری', 'تجربیات شغلی', 'تجارب شغلی', 'تجربیات', 'سوابق حرفه ای', 'سوابق', 'سوابق کار', 'experience', 'work experience', 'professional experience', 'employment history', 'work history', 'employment', 'career history'],
    edu: ['تحصیلات', 'سوابق تحصیلی', 'سابقه تحصیلی', 'اطلاعات تحصیلی', 'تحصیلات دانشگاهی', 'مدارک تحصیلی', 'education', 'academic background', 'academic qualifications', 'qualifications'],
    skills: ['مهارت ها', 'مهارت', 'مهارتها', 'مهارت های کلیدی', 'مهارت های حرفه ای', 'مهارت های تخصصی', 'مهارت های فنی', 'توانایی ها', 'توانمندی ها', 'توانایی های حرفه ای', 'skills', 'key skills', 'technical skills', 'core skills', 'core competencies', 'professional skills', 'skills & tools'],
    soft: ['نرم افزار ها', 'نرم افزارها', 'نرم افزار', 'نرم افزارها و ابزارها', 'ابزارها', 'تسلط بر نرم افزار', 'تسلط بر نرم افزارها', 'ابزارها و نرم افزارها', 'software', 'tools', 'technologies', 'tech stack', 'tools & technologies', 'software skills', 'tools and technologies'],
    langs: ['زبان ها', 'زبان های خارجی', 'زبان', 'زبانها', 'languages', 'language', 'language skills'],
    certs: ['دوره ها', 'دوره ها و گواهینامه ها', 'دوره های آموزشی', 'گواهینامه ها', 'گواهی ها', 'گواهینامه', 'دوره ها و گواهی ها', 'courses', 'certifications', 'certificates', 'training', 'certification', 'courses & certifications'],
    salary: ['حقوق درخواستی', 'حقوق', 'حقوق مورد انتظار', 'انتظار حقوق', 'حقوق پیشنهادی', 'expected salary', 'salary', 'salary expectation', 'salary expectations'],
    other: ['اطلاعات تکمیلی', 'سایر', 'سایر اطلاعات', 'علایق', 'علاقه مندی ها', 'معرف', 'معرفین', 'پروژه ها', 'پروژه', 'افتخارات', 'مراجع', 'نمونه کار', 'نمونه کارها', 'projects', 'references', 'interests', 'hobbies', 'awards', 'additional information', 'publications', 'volunteer', 'volunteering', 'achievements', 'honors', 'other']
  };
  var HMAP = {};
  Object.keys(HEADS).forEach(function (k) { HEADS[k].forEach(function (h) { HMAP[K(h)] = k; }); });
  function stripDeco(s) { return s.replace(/^[^\u0600-\u06ffA-Za-z0-9]+/, '').replace(/[^\u0600-\u06ffA-Za-z0-9]+$/, ''); }
  function headOf(line) { // → {key, rest} | null
    var l = norm(line).trim(); if (!l) return null;
    var m = l.match(/^([^:：]{1,45})[:：]\s*(.*)$/);
    if (m) { var k = HMAP[K(stripDeco(m[1]))]; if (k) return {key: k, rest: m[2].trim()}; }
    if (l.length <= 45) { var k2 = HMAP[K(stripDeco(l))]; if (k2) return {key: k2, rest: ''}; }
    return null;
  }

  var CITIES = ['تهران', 'مشهد', 'اصفهان', 'شیراز', 'تبریز', 'کرج', 'اهواز', 'قم', 'رشت', 'ارومیه', 'یزد', 'کرمان', 'کرمانشاه', 'همدان', 'اراک', 'زاهدان', 'بندرعباس', 'ساری', 'گرگان', 'قزوین', 'زنجان', 'سنندج', 'خرم‌آباد', 'بوشهر', 'اردبیل', 'بیرجند', 'بجنورد', 'شهرکرد', 'ایلام', 'یاسوج', 'سمنان', 'قشم', 'کیش', 'ورامین', 'شهریار', 'اسلامشهر', 'پردیس', 'دماوند', 'نیشابور', 'سبزوار', 'بابل', 'آمل', 'لاهیجان', 'رباط‌کریم', 'ملارد', 'فردیس', 'کاشان', 'نجف‌آباد', 'ساوه', 'بروجرد', 'دزفول', 'آبادان', 'خوی', 'مراغه', 'میانه', 'رفسنجان', 'جیرفت', 'ایرانشهر', 'چابهار', 'مهاباد', 'بانه', 'سقز'];
  var CITY_EN = {tehran: 'تهران', mashhad: 'مشهد', isfahan: 'اصفهان', esfahan: 'اصفهان', shiraz: 'شیراز', tabriz: 'تبریز', karaj: 'کرج', ahvaz: 'اهواز', qom: 'قم', rasht: 'رشت', urmia: 'ارومیه', yazd: 'یزد', kerman: 'کرمان', hamedan: 'همدان', arak: 'اراک', ghazvin: 'قزوین', qazvin: 'قزوین', sari: 'ساری', zanjan: 'زنجان', bushehr: 'بوشهر'};
  function findCity(text) {
    var t = ' ' + norm(text).replace(/\u200c/g, '') + ' ', best = null, bi = 1e9;
    CITIES.forEach(function (c) {
      var cc = c.replace(/\u200c/g, ''), re = new RegExp('[\\s,،\\-–/|:()؛;]' + cc + '(?=[\\s,،\\-–/|:()؛;.]|$)'), m = re.exec(t);
      if (m && m.index < bi) { bi = m.index; best = c; }
    });
    var low = t.toLowerCase();
    Object.keys(CITY_EN).forEach(function (c) { var m = new RegExp('[\\s,\\-/|:()]' + c + '(?=[\\s,\\-/|:().]|$)').exec(low); if (m && m.index < bi) { bi = m.index; best = CITY_EN[c]; } });
    return best;
  }

  /* ---------------------------------------------------------------- job title → department / position */
  var SYN = [ // [collapsed pattern, dept key, position]
    ['برنامهنویس', 'it', 'برنامه‌نویس'], ['توسعهدهنده', 'it', 'برنامه‌نویس'], ['مهندسنرمافزار', 'it', 'برنامه‌نویس'], ['developer', 'it', 'برنامه‌نویس'], ['programmer', 'it', 'برنامه‌نویس'], ['softwareengineer', 'it', 'برنامه‌نویس'], ['frontend', 'it', 'برنامه‌نویس'], ['backend', 'it', 'برنامه‌نویس'], ['fullstack', 'it', 'برنامه‌نویس'], ['دولوپر', 'it', 'برنامه‌نویس'],
    ['مدیرit', 'it', 'مدیر IT'], ['کارشناسit', 'it', 'کارشناس IT'], ['کارشناسشبکه', 'it', 'شبکه'], ['networkadmin', 'it', 'شبکه'], ['networkengineer', 'it', 'شبکه'], ['sysadmin', 'it', 'کارشناس IT'], ['itsupport', 'it', 'پشتیبانی فنی'], ['helpdesk', 'it', 'پشتیبانی فنی'],
    ['accountant', 'finance', 'حسابدار'], ['حسابدار', 'finance', 'حسابدار'], ['کارشناسمالی', 'finance', 'حسابدار'], ['صندوقدار', 'finance', 'خزانه‌دار/صندوق‌دار'], ['خزانهدار', 'finance', 'خزانه‌دار/صندوق‌دار'],
    ['salesmanager', 'sales', 'مدیر فروش'], ['salesexpert', 'sales', 'کارشناس فروش'], ['salesspecialist', 'sales', 'کارشناس فروش'], ['salesrepresentative', 'sales', 'کارشناس فروش'], ['salesperson', 'sales', 'کارشناس فروش'], ['salesman', 'sales', 'فروشنده حضوری'], ['salesassociate', 'sales', 'فروشنده حضوری'], ['فروشنده', 'sales', 'فروشنده حضوری'], ['بازاریاب', 'sales', 'بازاریاب'], ['کارشناسفروش', 'sales', 'کارشناس فروش'],
    ['humanresources', 'hr', 'کارشناس منابع انسانی'], ['hrspecialist', 'hr', 'کارشناس منابع انسانی'], ['hrmanager', 'hr', 'مدیر منابع انسانی'], ['recruiter', 'hr', 'کارشناس منابع انسانی'], ['کارشناسجذب', 'hr', 'کارشناس منابع انسانی'], ['منشی', 'hr', 'منشی/مسئول دفتر'], ['مسئولدفتر', 'hr', 'منشی/مسئول دفتر'], ['receptionist', 'hr', 'منشی/مسئول دفتر'],
    ['graphicdesigner', 'marketing', 'طراح گرافیک'], ['گرافیست', 'marketing', 'طراح گرافیک'], ['طراحگرافیک', 'marketing', 'طراح گرافیک'], ['uiuxdesigner', 'marketing', 'طراح گرافیک'], ['digitalmarketing', 'marketing', 'کارشناس مارکتینگ'], ['marketingspecialist', 'marketing', 'کارشناس مارکتینگ'], ['marketingmanager', 'marketing', 'مدیر مارکتینگ'], ['contentcreator', 'marketing', 'ادمین شبکه اجتماعی'], ['socialmedia', 'marketing', 'ادمین شبکه اجتماعی'], ['عکاس', 'marketing', 'عکاس/تدوینگر'], ['تدوینگر', 'marketing', 'عکاس/تدوینگر'],
    ['warehouse', 'warehouse', 'انباردار'], ['storekeeper', 'warehouse', 'انباردار'], ['انباردار', 'warehouse', 'انباردار'], ['راننده', 'warehouse', 'راننده/پیک'], ['پیک', 'warehouse', 'راننده/پیک'],
    ['customersupport', 'support', 'پشتیبانی آنلاین'], ['customerservice', 'support', 'پشتیبانی آنلاین'], ['callcenter', 'support', 'اپراتور تماس'], ['اپراتور', 'support', 'اپراتور تماس'], ['پشتیبانمشتری', 'support', 'پشتیبانی آنلاین'],
    ['securityguard', 'security', 'نگهبان/حراست'], ['نگهبان', 'security', 'نگهبان/حراست'], ['آبدارچی', 'security', 'آبدارچی/خدمات'],
    ['تعمیرکارموبایل', 'aftersales', 'تعمیرکار موبایل'], ['تعمیرگوشی', 'aftersales', 'تعمیرکار موبایل'], ['mobilerepair', 'aftersales', 'تعمیرکار موبایل'], ['mobiletechnician', 'aftersales', 'تعمیرکار موبایل'], ['technician', 'aftersales', 'سرپرست فنی/تعمیرات'], ['تکنسین', 'aftersales', 'سرپرست فنی/تعمیرات'], ['تعمیرکار', 'aftersales', 'تعمیرکار موبایل'],
    ['مدیرفروشگاه', 'management', 'مدیر فروشگاه'], ['storemanager', 'management', 'مدیر فروشگاه'], ['مدیرشعبه', 'management', 'مدیر شعبه'], ['branchmanager', 'management', 'مدیر شعبه'], ['operationsmanager', 'management', 'مدیر عملیات'], ['generalmanager', 'management', 'مدیر اجرایی'], ['مدیرعامل', 'management', 'مدیر اجرایی']
  ];
  var DEPT_KW = [['sales', /فروش|بازاریاب|sales/i], ['finance', /مالی|حساب|accounting|finance/i], ['commerce', /بازرگان|ترخیص|خرید|procurement|import|export/i], ['hr', /منابع انسانی|اداری|منشی|\bhr\b|human resource/i], ['aftersales', /تعمیر|گارانتی|پس از فروش|فنی|technician/i], ['warehouse', /انبار|لجستیک|توزیع|logistic|warehouse/i], ['it', /\bit\b|شبکه|نرم.?افزار|software|developer|برنامه.?نویس|وب|network/i], ['marketing', /مارکتینگ|محتوا|گرافیک|سئو|شبکه اجتماعی|marketing|design|seo/i], ['support', /پشتیبان|مشتری|support|call center|customer/i], ['security', /نگهبان|حراست|security/i], ['management', /مدیر|manager|director/i]];
  var ROLE = new RegExp('(?:^|[^\\u0600-\\u06ffA-Za-z])(?:(?:کمک|مدیر|سرپرست|کارشناس|کارمند|حسابدار|فروشنده|بازاریاب|تکنسین|تعمیر\\s?کار|مسئول|مسوول|رییس|رئیس|معاون|منشی|اپراتور|انباردار|راننده|پیک|نگهبان|طراح|برنامه.?نویس|توسعه.?دهنده|مهندس|مشاور|آبدارچی|مترجم|مدرس|معلم|پشتیبان|پشتیبانی|کارآموز|دستیار|ناظر|سرشیفت|صندوق.?دار|خزانه.?دار|ادمین|تدوینگر|عکاس|گرافیست|تحلیلگر|متخصص|کارگر|استادکار|آشپز|گارسون|بریستا|حسابرس|بازرس)|(?:manager|developer|engineer|specialist|analyst|designer|technician|accountant|assistant|officer|executive|coordinator|consultant|lead|director|intern|administrator|representative|supervisor|salesperson|clerk|agent|operator|programmer|architect|tester|qa|devops|admin|head|cashier|driver|teacher|instructor|receptionist|recruiter|developers|engineers|managers))(?![\\u0600-\\u06ffA-Za-z])', 'i');
  var COMPANY_START = /^(شرکت|فروشگاه|گروه|بانک|موسسه|مؤسسه|سازمان|هلدینگ|کارخانه|دانشگاه|آموزشگاه|مجتمع|company|group|bank|institute|university)\b/i;
  var COMPANY = /(شرکت|فروشگاه|گروه|بانک|موسسه|مؤسسه|هلدینگ|سازمان|کارخانه|آموزشگاه|مجتمع|تولیدی|بازرگانی|صنعتی|صنایع|صنعت|\bco\b\.?|\bltd\b|\binc\b|\bllc\b|\bcorp\b|company|group|holding|\bbank\b|\bgmbh\b)/i;
  function mapTitle(text, D) {
    if (!text) return null; var k = K(text);
    var cands = SYN.map(function (s) { return {p: s[0], d: s[1], pos: s[2]}; });
    D.depts.forEach(function (d) { d.pos.forEach(function (p) { p.split('/').forEach(function (a) { cands.push({p: K(a), d: d.key, pos: p}); }); }); });
    cands.sort(function (a, b) { return b.p.length - a.p.length; });
    // «تعمیرکار/تکنسین» + موبایل/گوشی → تعمیرکار موبایل
    if (/تعمیرکار|تکنسین|technician|repair/.test(k) && /موبایل|گوشی|تبلت|mobile|phone/.test(k)) return {dept: 'aftersales', pos: 'تعمیرکار موبایل'};
    for (var i = 0; i < cands.length; i++) if (cands[i].p && k.indexOf(cands[i].p) >= 0) return {dept: cands[i].d, pos: cands[i].pos};
    for (var j = 0; j < DEPT_KW.length; j++) if (DEPT_KW[j][1].test(norm(text)) && ROLE.test(norm(text))) return {dept: DEPT_KW[j][0], pos: 'سایر'};
    return null;
  }

  /* ---------------------------------------------------------------- small extractors */
  var YEAR = '(?:1[34]\\d\\d|(?:19|20)\\d\\d)', MON = '(?:[A-Za-z]{3,9}\\.?\\s+|(?:فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند)\\s+|\\d{1,2}\\s*\\/\\s*)?';
  var PRESENT = '(?:تا\\s*کنون|تاکنون|هم\\s*اکنون|اکنون|حال\\s*حاضر|الان|present|now|current|ongoing|today|مشغول)';
  var DR = new RegExp('(?:^|[^\\d])' + '(' + MON + YEAR + ')(?:\\s*\\/\\s*\\d{1,2})?\\s*(?:-|–|~|تا|to|until|till|الی)\\s*(' + MON + '(?:' + YEAR + '|' + PRESENT + '))(?![\\d])', 'i');
  var YEARONLY = new RegExp('\\(?\\b(' + YEAR + ')\\b\\)?');
  function yearsOf(m) {
    var a = (m[1].match(new RegExp(YEAR)) || [''])[0], b = (m[2].match(new RegExp(YEAR)) || [''])[0];
    if (!b) return a + ' تا کنون';
    if (+a > +b) { var t = a; a = b; b = t; }
    return a + ' تا ' + b;
  }
  function splitDate(line) { // → {rest, years}
    var m = DR.exec(line);
    if (m) { var full = m[0].replace(/^[^\d A-Za-z\u0600-\u06ff]/, ''); var rest = line.replace(m[0].replace(/^(?=[^\d])[^\w\u0600-\u06ff]/, ''), ' '); return {rest: clean(rest.replace(/[()\[\]]/g, ' ')), years: yearsOf(m)}; }
    return {rest: line, years: ''};
  }
  function mobileOf(text) {
    var t = norm(text), re = /(^|[^\d])((?:\+|00)?98[\s\-]?9\d[\s\-]?\d{3}[\s\-]?\d{4}|0?9\d{2}[\s\-]?\d{3}[\s\-]?\d{4})(?!\d)/g, m, all = [];
    while ((m = re.exec(t))) { var d = m[2].replace(/[^\d]/g, ''); if (d.indexOf('0098') === 0) d = d.slice(4); else if (d.indexOf('98') === 0 && d.length === 12) d = d.slice(2); if (d.length === 10 && d[0] === '9') d = '0' + d; if (/^09\d{9}$/.test(d)) all.push({v: d, i: m.index}); }
    if (!all.length) return '';
    // prefer one near a contact label
    for (var i = 0; i < all.length; i++) { var ctx = t.slice(Math.max(0, all[i].i - 25), all[i].i + 2); if (/موبایل|همراه|تلفن|تماس|mobile|phone|tel|cell|whatsapp|واتس/i.test(ctx)) return all[i].v; }
    return all[0].v;
  }
  function splitList(s, noDash) {
    return String(s || '').split(noDash ? /\n|[،,;؛•▪▫●■◆‣·|]+/ : /\n|[،,;؛•▪▫●■◆‣·|]+|\s[-–]\s|\s\/\s/).map(function (x) {
      return clean(x.replace(/^\s*\d{1,2}[.)]\s+/, '').replace(/^[\s\-–•*▪▫●■◆‣·✓✔►▸➤]+/, ''));
    }).filter(function (x) { return x.length >= 2 && x.length <= 60 && !/^[\d\s.]+$/.test(x); });
  }
  function dedupe(a) { var seen = {}, o = []; a.forEach(function (x) { var k = K(x); if (!seen[k]) { seen[k] = 1; o.push(x); } }); return o; }
  var BULLET = /^\s*[•▪▫●■◆‣·✓✔►▸➤*\-–]\s*/, BULLET_INLINE = /\s+[•▪●■◆‣·]\s+/;

  var LANG_FA = {english: 'انگلیسی', persian: 'فارسی', farsi: 'فارسی', arabic: 'عربی', german: 'آلمانی', french: 'فرانسه', turkish: 'ترکی', russian: 'روسی', spanish: 'اسپانیایی', italian: 'ایتالیایی', kurdish: 'کردی', azeri: 'آذری'};
  var LEVEL_FA = {native: 'زبان مادری', 'mother tongue': 'زبان مادری', fluent: 'مسلط', proficient: 'مسلط', advanced: 'پیشرفته', 'upper intermediate': 'خوب', intermediate: 'متوسط', basic: 'مقدماتی', beginner: 'مقدماتی', elementary: 'مقدماتی', good: 'خوب'};
  function fixLang(item) {
    var s = clean(item), m = s.match(/^([A-Za-z]+)\s*[-–:(]?\s*([A-Za-z ]+?)\)?$/);
    if (m && LANG_FA[m[1].toLowerCase()]) { var lv = LEVEL_FA[m[2].toLowerCase().trim()]; return LANG_FA[m[1].toLowerCase()] + (lv ? ' (' + lv + ')' : ''); }
    if (/^[A-Za-z]+$/.test(s) && LANG_FA[s.toLowerCase()]) return LANG_FA[s.toLowerCase()];
    return s.replace(/\s*[-–:]\s*([\u0600-\u06ff ]+)$/, ' ($1)').replace(/\(\s*\(/g, '(').replace(/\)\s*\)/g, ')');
  }
  function degreeOf(s) {
    var t = norm(s).replace(/\u200c/g, ' ').toLowerCase();
    if (/کارشناسی\s*ارشد|فوق\s*لیسانس|\bm\.?sc\b|\bmaster|\bm\.?a\b|\bmba\b/.test(t)) return 'کارشناسی ارشد';
    if (/دکتری|دکترا|\bph\.?d\b|doctorate/.test(t)) return 'دکتری';
    if (/کارشناسی|لیسانس|\bb\.?sc\b|\bb\.?a\b|bachelor/.test(t)) return 'کارشناسی';
    if (/کاردانی|فوق\s*دیپلم|associate/.test(t)) return 'کاردانی';
    if (/زیر\s*دیپلم|سیکل|راهنمایی/.test(t)) return 'زیر دیپلم';
    if (/دیپلم|high school|diploma/.test(t)) return 'دیپلم';
    return '';
  }
  var DEG_RANK = {'زیر دیپلم': 1, 'دیپلم': 2, 'کاردانی': 3, 'کارشناسی': 4, 'کارشناسی ارشد': 5, 'دکتری': 6};
  var DEG_RE = /(کارشناسی\s*ارشد|فوق\s*لیسانس|کارشناسی|لیسانس|کاردانی|فوق\s*دیپلم|دکتری|دکترا|زیر\s*دیپلم|دیپلم|Master(?:'s)?(?: of (?:Science|Arts|Business Administration))?|Bachelor(?:'s)?(?: of (?:Science|Arts))?|\bM\.?Sc\b\.?|\bB\.?Sc\b\.?|\bB\.?A\b\.?|\bM\.?A\b\.?|\bMBA\b|\bPh\.?D\b\.?|Associate|High School Diploma|Diploma)/gi;
  var UNI_RE = /(دانشگاه|هنرستان|آموزشکده|آموزشگاه|مؤسسه|موسسه|دبیرستان|\bUniversity\b|\bCollege\b|\bInstitute\b|\bSchool\b)/i;
  function parseEdu(lines) {
    var entries = [], cur = null;
    lines.forEach(function (raw) {
      var l = raw.replace(BULLET, ''), dg = degreeOf(l);
      if (dg && (!cur || cur.degree)) { cur = {degree: dg, pieces: []}; entries.push(cur); }
      else if (dg && cur && !cur.degree) cur.degree = dg;
      else if (!cur) { cur = {degree: '', pieces: []}; entries.push(cur); }
      cur.pieces.push(splitDate(l).rest);
    });
    if (!entries.length) return {};
    entries.sort(function (a, b) { return (DEG_RANK[b.degree] || 0) - (DEG_RANK[a.degree] || 0); });
    var e = entries[0], uni = '', major = '';
    var toks = [];
    e.pieces.forEach(function (p) { p.split(/\s+[-–|]\s+|\s*\|\s*|[،]\s*|\s+[-–]\s*|,\s+|\n/).forEach(function (t) { t = clean(t.replace(/^[-–:,،\s]+|[-–:,،\s]+$/g, '')); if (t) toks.push(t); }); });
    toks.forEach(function (t) {
      if (!uni && UNI_RE.test(t)) { if (/\b(?:University|College|Institute|School)\b/i.test(t) && /^[A-Za-z]/.test(t.replace(DEG_RE, '').trim())) { uni = clean(t.replace(DEG_RE, '').replace(/^(?:\s*(?:in|of)\s+)+/i, '')); return; } var m = t.match(new RegExp(UNI_RE.source + '.*', 'i')), before = t.slice(0, m.index).trim(); uni = clean(m[0].replace(/\s*(?:\d{4}.*)$/, '')); if (before && !degreeOf(before) && !major) major = before; if (degreeOf(before)) { var mj = clean(before.replace(DEG_RE, '').replace(/^(?:\s*(?:در|رشته|رشته‌ی|رشته ی|of|in)\s+)+/i, '')); if (mj && !major) major = mj; } return; }
      if (degreeOf(t) && !major) { var r = clean(t.replace(DEG_RE, ' ').replace(/^(?:\s*(?:در|رشته|رشته‌ی|رشته ی|گرایش|of|in)[:\s]+)+/i, '').replace(/^[\s,،:]+/, '')); if (r && !/^\d+$/.test(r)) major = r; return; }
      if (!major && !/^\d{4}$/.test(t) && !UNI_RE.test(t) && t.length > 2 && !/^(معدل|gpa|grade)/i.test(t)) major = t.replace(/^(?:رشته|گرایش|major)[:\s]+/i, '');
    });
    return {degree: e.degree, major: major.slice(0, 60), uni: uni.slice(0, 70)};
  }
  function parseSalary(v) {
    var t = norm(v).replace(/\u200c/g, ' ');
    if (/توافق|negotiable|negotiation/i.test(t) && !/\d/.test(t)) return {mode: 'agree'};
    var re = /(\d[\d,]*(?:\.\d+)?)/g, nums = [], m, unit = 1;
    if (/ریال|rial/i.test(t)) unit = 1e-7; else if (/میلیون|million|\bm\b|\bmn\b|م\b/i.test(t)) unit = 1; else if (/هزار|thousand|\bk\b/i.test(t)) unit = 1e-3;
    var hasUnit = unit !== 1 || /میلیون|million|\bm\b|\bmn\b|م\b/i.test(t);
    while ((m = re.exec(t))) { var n = parseFloat(m[1].replace(/,/g, '')); if (isNaN(n)) continue; var val = n >= 1e6 ? n / 1e6 * (unit === 1e-7 ? 0.1 : 1) : n * (unit === 1e-7 ? 0.1 * 1e6 / 1e6 : unit); if (n >= 1e6 && unit === 1e-3) val = n / 1e6; nums.push(Math.round(val * 10) / 10); }
    nums = nums.filter(function (x) { return x >= 1 && x <= 1000; });
    if (!nums.length) return null; if (nums.length > 2) nums = nums.slice(0, 2);
    var a = nums[0], b = nums.length > 1 ? nums[1] : nums[0]; if (a > b) { var tt = a; a = b; b = tt; }
    return {mode: 'range', min: String(a), max: String(b)};
  }
  function matchIndustry(v, D) {
    var k = K(v); if (!k) return '';
    var best = '', bl = 0;
    D.industries.forEach(function (i) { var n = K(i.name); if ((k.indexOf(n) >= 0 || n.indexOf(k) >= 0) && n.length > bl) { best = i.name; bl = n.length; } });
    if (best) return best;
    D.industries.forEach(function (i) { (i.kw || '').split(/\s+/).forEach(function (w) { var kw = K(w); if (kw.length >= 3 && k.indexOf(kw) >= 0 && kw.length > bl) { best = i.name; bl = kw.length; } }); });
    return best;
  }

  /* ---------------------------------------------------------------- experience */
  function roleOrCompany(a) {
    if (/^(?:شرکت|فروشگاه|company|co\.?)$/i.test(clean(a))) return {lab: 1};
    var s = clean(a.replace(/^(?:شرکت|فروشگاه|company)\s*[:\-–]\s*/i, '')); if (!s) return {};
    if (COMPANY_START.test(s)) return {c: 2, s: s};
    if (ROLE.test(s)) return {r: 2, s: s};
    if (COMPANY.test(s)) return {c: 1, s: s};
    return {s: s};
  }
  function assignRC(pieces) {
    var all = pieces.map(roleOrCompany), labs = all.filter(function (x) { return x.lab; }).length, ps = all.filter(function (x) { return x.s; });
    if (!ps.length) return {};
    if (labs && ps.length === 1) return ps[0].r ? {role: ps[0].s} : {company: ps[0].s};
    if (ps.length === 1) { var p = ps[0]; return p.r || (!p.c && ROLE.test(p.s)) ? {role: p.s} : (p.c ? {company: p.s} : {role: p.s}); }
    var a = ps[0], b = ps[1];
    if ((a.c || 0) > (a.r || 0) && (b.r || 0) >= (b.c || 0) && (b.r)) return {role: b.s, company: a.s};
    if (!a.r && !a.c && b.r) return {role: b.s, company: a.s};
    return {role: a.s, company: b.s};
  }
  function parseExp(lines) {
    var entries = [], cur = null;
    function isDone(c) { return c.years || c.parts >= 2 || c.hl.length >= 2; }
    lines.forEach(function (raw) {
      var segs = raw.split(BULLET_INLINE), head = segs[0], extra = segs.slice(1).map(clean).filter(Boolean);
      var isB = BULLET.test(head); var text = clean(head.replace(BULLET, ''));
      if (!text && !extra.length) return;
      if (isB) { if (cur) { cur.sawBullet = true; if (text && !cur.ach) cur.ach = text.slice(0, 140); } return; }
      var sd = splitDate(text), pureDate = !clean(sd.rest.replace(/[()\-–|،,\s]/g, '')) && sd.years;
      var onlyYear = !sd.years && /^\(?\s*(?:1[34]\d\d|(?:19|20)\d\d)\s*\)?$/.test(text);
      if (cur && !cur.years && (pureDate)) { cur.years = sd.years; return; }
      var looksHeader = sd.years || /\s[|–\-]\s|\|/.test(text) || ROLE.test(text) || COMPANY.test(text);
      var desc = text.length > 70 || /[.!؟]$/.test(text) || !looksHeader || /^(?:[A-Z][a-z]+(?:ed|ped|led)|Led|Built|Ran|Wrote|Made|Drove|Took|Managed|Developed|Designed|Mentored)\b/.test(text) || (/^[A-Za-z]/.test(text) && !sd.years && !/\|/.test(text) && text.split(/\s+/).length > 5);
      if (cur && !cur.sawBullet && isDone(cur) && desc) { if (!cur.ach) cur.ach = text.slice(0, 140); return; }
      var startNew = !cur || cur.sawBullet || isDone(cur) || cur.hl.length >= 3;
      if (cur && !startNew && sd.years && cur.years) startNew = true;
      if (startNew) { cur = {hl: [], parts: 0, years: '', ach: '', pieces: [], sawBullet: false}; entries.push(cur); }
      var parts = sd.rest.split(/\s+[|–\-\/·]\s+|\s*\|\s*|\s+[-–]\s*|،\s*|\s+(?:در|at|@)\s+|,\s+/).map(clean).filter(function (x) { return x && !/^[()\-–]*$/.test(x); });
      cur.hl.push(text); cur.parts = Math.max(cur.parts, parts.length); cur.pieces = cur.pieces.concat(parts);
      if (sd.years) cur.years = sd.years;
      extra.forEach(function (e) { if (!cur.ach) cur.ach = e.slice(0, 140); });
    });
    var res = entries.map(function (e) {
      var rc = assignRC(e.pieces.slice(0, 3)); return {role: (rc.role || '').slice(0, 60), company: (rc.company || '').slice(0, 60), years: e.years ? fa(e.years) : '', ach: e.ach};
    }).filter(function (e) { return e.role || e.company; });
    // newest first: if the list is ascending by start year, reverse it
    var ys = res.map(function (e) { var m = (e.years || '').match(/\d+/); return m ? +String(m[0]).replace(/[۰-۹]/g, function (c) { return c.charCodeAt(0) - 1776; }) : 0; });
    if (ys.length > 1 && ys[0] && ys[ys.length - 1] && ys[0] < ys[ys.length - 1]) res.reverse();
    return res.slice(0, 3);
  }

  /* ---------------------------------------------------------------- main parser */
  var STOPNAME = /^(رزومه|رزومه کاری|رزومه ی من|سی ?وی|resume|cv|curriculum vitae|بیوگرافی|resume of)$/i;
  function jalaliYear() { try { var y = new Intl.DateTimeFormat('en-u-ca-persian', {year: 'numeric'}).format(new Date()); var n = parseInt(String(y).replace(/\D/g, ''), 10); if (n > 1300 && n < 1600) return n; } catch (e) {} return 1405; }
  function parse(rawText, D) {
    var text = fixLam(norm(rawText)), fields = {}, found = [];
    var lines = text.split('\n').map(function (l) { return clean(l); }).filter(Boolean);
    var sections = {}, order = [], cur = '_head';
    sections._head = [];
    lines.forEach(function (l) {
      var h = headOf(l);
      if (h) { cur = h.key; if (!sections[cur]) sections[cur] = []; order.push(cur); if (h.rest) sections[cur].push(h.rest); return; }
      (sections[cur] = sections[cur] || []).push(l);
    });
    var head = sections._head;
    // flat segments for label scanning
    var segs = []; lines.forEach(function (l) { l.split(/\s*[|]\s*|\s{3,}/).forEach(function (s) { s = s.trim(); if (s) segs.push(s); }); });
    function label(re) { for (var i = 0; i < segs.length; i++) { var m = segs[i].match(re); if (m) return clean(m[1]); } return ''; }
    function set(k, v) { if (v && (!Array.isArray(v) || v.length)) { fields[k] = v; if (found.indexOf(k) < 0) found.push(k); } }

    /* mobile / contact */
    var mob = mobileOf(text);
    var email = (text.match(/[\w.+\-]+@[A-Za-z0-9\-]+\.[A-Za-z.]{2,}/) || [''])[0];
    var tg = (text.match(/(?:^|\s)(@[A-Za-z][A-Za-z0-9_]{4,31})(?=\s|$)/) || ['', ''])[1];
    set('contact', mob || tg || email);

    /* link */
    var lk = text.match(/(?:https?:\/\/|www\.)[^\s|،]+|(?:linkedin\.com\/in|github\.com|behance\.net|dribbble\.com)\/[^\s|،]+/i);
    if (lk) { var u = lk[0].replace(/[.,)]+$/, ''); if (!/^https?:/i.test(u)) u = 'https://' + u; if (!/t\.me\//i.test(u)) set('link', u); }

    /* name */
    var name = label(/^(?:نام\s*و\s*نام\s*خانوادگی|نام\s*و\s*نام‌خانوادگی|نام(?:\s*کامل)?|full\s*name|name)\s*[:：]\s*(.+)$/i);
    var headTitle = '';
    function nameOk(s) {
      s = clean(s); if (s.length < 4 || s.length > 40 || /\d|@|#|:|:|\/|www/.test(s) || STOPNAME.test(s) || HMAP[K(s)] || COMPANY_START.test(s)) return false;
      var w = s.split(/\s+/); if (w.length < 2 || w.length > 5) return false; return !/[^A-Za-z\u0600-\u06ff\u200c\s.'\-]/.test(s);
    }
    if (!name) {
      var picked = -1, cands = head.slice(0, 10);
      for (var pass = 0; pass < 2 && picked < 0; pass++) for (var i = 0; i < cands.length && picked < 0; i++) {
        var l0 = cands[i].replace(/^[^\u0600-\u06ffA-Za-z]+/, ''), cs = l0.split(/\s*[|–]\s*|\s+-\s+/);
        if (/^#/.test(cands[i])) continue;
        if (nameOk(cs[0]) && (pass === 1 || !ROLE.test(cs[0]))) { picked = i; name = clean(cs[0]); if (cs[1]) headTitle = clean(cs.slice(1).join(' ')); }
      }
      if (picked >= 0 && !headTitle) { var nx = cands[picked + 1]; if (nx && !headOf(nx) && nx.length <= 90 && !/\d{5,}|@|:|http/.test(nx) && !/^#/.test(nx)) headTitle = clean(nx.replace(/^[^\u0600-\u06ffA-Za-z]+/, '')); }
      if (picked < 0) for (var j = 0; j < lines.length - 1 && !name; j++) { // name somewhere later (sidebar / table layouts): a name-like line followed by a short job-title line
        var nl = lines[j], tl2 = lines[j + 1];
        if (!headOf(nl) && !headOf(tl2) && nameOk(nl) && !ROLE.test(nl) && !COMPANY.test(nl) && ROLE.test(tl2) && tl2.length <= 50 && !/\d|@|:/.test(tl2)) { name = clean(nl); headTitle = clean(tl2); }
      }
    } else name = clean(name.split(/\s*[|–]\s*/)[0]);
    if (name && nameOk(name)) set('name', name.replace(/\s+/g, ' ')); else if (name && name.length >= 3) set('name', name);

    /* title → dept/pos */
    var tLabel = label(/^(?:عنوان\s*شغلی|سمت(?:\s*شغلی)?|عنوان|زمینه\s*(?:فعالیت|کاری)|job\s*title|position|title|current\s*role|role|desired\s*position|سمت\s*مورد\s*نظر)\s*[:：]\s*(.+)$/i);
    var expLines0 = sections.exp || [];
    var exp = parseExp(expLines0);
    var titleSrc = [tLabel, headTitle, exp[0] && exp[0].role].filter(Boolean), mapped = null, usedTitle = '';
    for (var ti = 0; ti < titleSrc.length && !mapped; ti++) { mapped = mapTitle(titleSrc[ti], D); if (mapped) usedTitle = titleSrc[ti]; }
    if (mapped) {
      set('dept', D.depts.filter(function (d) { return d.key === mapped.dept; })[0].name);
      if (mapped.pos === 'سایر') { set('pos', 'سایر'); set('custom', clean(usedTitle.split(/\s*[|–]\s*/)[0]).slice(0, 60)); } else set('pos', mapped.pos);
    }
    var tl = tLabel || headTitle;
    if (tl) { tl = clean(tl).slice(0, 100); if (K(tl) !== K(fields.pos || '') && ROLE.test(tl) || (!fields.dept && tl.length <= 80 && !/\d/.test(tl))) set('headline', tl); }

    /* city */
    var cityV = label(/^(?:شهر|محل\s*سکونت|محل\s*زندگی|سکونت|city|location|based\s*in|address|آدرس)\s*[:：]\s*(.+)$/i), city = cityV ? findCity(cityV) : null;
    if (cityV && !city) { var c0 = clean(cityV.split(/[،,\-–/(]/)[0]); if (/^[\u0600-\u06ff\u200c\s]{2,20}$/.test(c0) && !/خیابان|بلوار|کوچه|پلاک/.test(c0)) city = c0; }
    if (!city) { var hs = lines.slice(0, 14).join(' | '); var segsH = hs.split(/\s*[|]\s*/); for (var si = 0; si < segsH.length && !city; si++) { var sg = segsH[si].replace(/^[^\u0600-\u06ffA-Za-z]+/, '').trim(); if (K(sg) && CITIES.some(function (c) { return K(c) === K(sg); })) city = CITIES.filter(function (c) { return K(c) === K(sg); })[0]; } }
    if (!city) city = findCity((head.slice(0, 8)).join(' | '));
    if (!city && sections.contact) { city = findCity((sections.contact || []).join(' | ')); }
    set('city', city);

    /* age / military / coop / start */
    var ageV = label(/^(?:سن|age)\s*[:：]\s*(.+)$/i), birth = label(/^(?:تاریخ\s*تولد|سال\s*تولد|متولد|تولد|date\s*of\s*birth|dob|birth(?:\s*year)?)\s*[:：]?\s*(.+)$/i);
    if (ageV) { var am = ageV.match(/\d{2}/); if (am && +am[0] >= 15 && +am[0] <= 75) set('age', am[0]); }
    else if (birth) { var bm = birth.match(/(1[34]\d\d)|((?:19|20)\d\d)/); if (bm) { var by = +bm[0], age = by < 1700 ? jalaliYear() - by : new Date().getFullYear() - by; if (age >= 15 && age <= 75) set('age', String(age)); } }
    var milV = label(/^(?:وضعیت\s*)?(?:نظام\s*وظیفه|خدمت\s*سربازی|سربازی|military(?:\s*status)?)\s*[:：]\s*(.+)$/i);
    if (milV) { var mt = norm(milV).replace(/\u200c/g, ' '); var mm = /پایان\s*خدمت|completed/i.test(mt) ? 'پایان خدمت' : /معاف|exempt/i.test(mt) ? 'معاف' : /در\s*حال\s*خدمت|serving/i.test(mt) ? 'در حال خدمت' : /مشمول\s*نیست|خانم|not\s*required/i.test(mt) ? 'مشمول نیست' : ''; set('military', mm); }
    var coopV = label(/^(?:نوع\s*همکاری|نوع\s*قرارداد|نوع\s*استخدام|employment\s*type|job\s*type)\s*[:：]\s*(.+)$/i);
    var coopSeg = ''; segs.slice(0, 20).forEach(function (s) { if (!coopV && /^(?:تمام|پاره)[\s\u200c]*وقت(?:\s*[\/،,]\s*(?:تمام|پاره)[\s\u200c]*وقت|\s*[\/،,]\s*دورکاری)*$/.test(norm(s).trim())) coopSeg = s; });
    var cv = norm(coopV || coopSeg).replace(/\u200c/g, ' '), coop = [];
    if (cv) { if (/تمام\s*وقت|full[\s-]*time/i.test(cv)) coop.push('تمام‌وقت'); if (/پاره\s*وقت|part[\s-]*time/i.test(cv)) coop.push('پاره‌وقت'); if (/دورکار|remote/i.test(cv)) coop.push('دورکاری'); if (/ترکیبی|hybrid/i.test(cv)) coop.push('ترکیبی'); if (/پروژه\s*ای|freelance|contract/i.test(cv)) coop.push('پروژه‌ای'); }
    set('coop', coop);
    var stV = label(/^(?:آماده\s*(?:شروع|همکاری)(?:\s*از)?|آمادگی\s*(?:برای\s*)?(?:شروع|همکاری)|زمان\s*شروع|شروع(?:\s*همکاری)?|availability|available|start\s*date|notice\s*period)\s*[:：]\s*(.+)$/i);
    if (stV) { var sv = norm(stV).replace(/\u200c/g, ' '); set('start', /فوری|بلافاصله|immediate|asap|now/i.test(sv) ? 'فوری' : /(?:یک|1)\s*هفته|(?:one|1)\s*week|2\s*weeks?|دو\s*هفته/i.test(sv) ? 'یک هفته' : /(?:یک|1)\s*ماه|(?:one|1)\s*month/i.test(sv) ? 'یک ماه' : ''); }

    /* salary */
    var salV = label(/^(?:حقوق(?:\s*(?:درخواستی|مورد\s*انتظار|پیشنهادی|مورد\s*نظر))?|انتظار\s*حقوق|expected\s*salary|salary(?:\s*expectations?)?)\s*[:：]\s*(.+)$/i) || ((sections.salary || []).filter(function (l) { return /\d|توافق|negotiable/i.test(l) && !/:/.test(l); })[0] || '');
    if (salV) { var sal = parseSalary(salV); if (sal) { if (sal.mode === 'agree') set('salMode', 'agree'); else { set('salMode', 'range'); set('salMin', sal.min); set('salMax', sal.max); } } }

    /* industry */
    var indV = label(/^(?:صنعت(?:\s*مورد\s*علاقه)?|حوزه\s*فعالیت\s*مورد\s*علاقه|industry)\s*[:：]\s*(.+)$/i);
    if (indV) set('industry', matchIndustry(indV, D));

    /* summary */
    var sumT = clean((sections.summary || []).join(' ')); if (sumT.length >= 20) set('summary', sumT.slice(0, 400));

    /* experience */
    set('exp', exp);

    /* skills / software */
    var allSoft = {}, allSkill = {};
    Object.keys(D.sug.soft).forEach(function (k) { D.sug.soft[k].forEach(function (x) { allSoft[K(x)] = x; }); });
    Object.keys(D.sug.skills).forEach(function (k) { D.sug.skills[k].forEach(function (x) { allSkill[K(x)] = x; }); });
    var skills = [], soft = [];
    splitList((sections.skills || []).join('\n')).forEach(function (x) { var k = K(x); skills.push(allSkill[k] || allSoft[k] || x); });
    splitList((sections.soft || []).join('\n')).forEach(function (x) { soft.push(allSoft[K(x)] || x); });
    set('skills', dedupe(skills).slice(0, 12)); set('soft', dedupe(soft).slice(0, 12));

    /* education */
    var eduL = sections.edu || [], ed = parseEdu(eduL);
    if (!eduL.length) { var eV = label(/^(?:مدرک(?:\s*تحصیلی)?|مقطع(?:\s*تحصیلی)?)\s*[:：]\s*(.+)$/i); if (eV) ed = parseEdu([eV]); }
    if (ed.degree) set('degree', ed.degree); if (ed.major) set('major', ed.major); if (ed.uni) set('uni', ed.uni);
    var mjL = label(/^(?:رشته(?:\s*تحصیلی)?|major|field\s*of\s*study)\s*[:：]\s*(.+)$/i); if (mjL && !fields.major) set('major', clean(mjL).slice(0, 60));

    /* certs / languages */
    set('certs', dedupe(splitList((sections.certs || []).join('\n'))).slice(0, 6).join('، '));
    var langItems = splitList((sections.langs || []).join('\n').replace(/\(([^)]*)\)/g, function (m) { return m.replace(/[،,]/g, '؛'); }), true).map(function (x) { return fixLang(x.replace(/؛/g, '،')); });
    set('langs', dedupe(langItems).slice(0, 5).join('، '));

    ['summary', 'certs', 'langs', 'headline', 'custom', 'major', 'uni'].forEach(function (k) { if (fields[k]) fields[k] = faSafe(fields[k]); });
    (fields.exp || []).forEach(function (e) { e.ach = faSafe(e.ach); e.role = faSafe(e.role); e.company = faSafe(e.company); });
    return {fields: fields, found: found, sections: order};
  }

  /* ---------------------------------------------------------------- orchestrator (browser) */
  function fail(code) { var e = new Error(code); e.code = code; return e; }
  function readFile(file, libs, opt) {
    opt = opt || {};
    var max = opt.maxBytes || 5 * 1024 * 1024, nm = String(file.name || '').toLowerCase(), ty = String(file.type || '').toLowerCase();
    var kind = /\.pdf$/.test(nm) || ty === 'application/pdf' ? 'pdf' : /\.docx$/.test(nm) || /wordprocessingml/.test(ty) ? 'docx' : /\.txt$/.test(nm) || ty === 'text/plain' ? 'txt' : /\.doc$/.test(nm) || ty === 'application/msword' ? 'doc' : '';
    if (!kind) return Promise.reject(fail('type')); if (kind === 'doc') return Promise.reject(fail('doc'));
    if (file.size > max) return Promise.reject(fail('size')); if (!file.size) return Promise.reject(fail('empty'));
    return file.arrayBuffer().then(function (buf) {
      if (kind === 'txt') return decodeText(buf);
      if (kind === 'pdf') {
        var head = new Uint8Array(buf.slice(0, 5)); if (String.fromCharCode.apply(null, head) !== '%PDF-') throw fail('corrupt');
        return libs.pdf().then(function (lib) { return extractPdf(lib, buf, opt); }).catch(function (e) { if (e && e.code) throw e; throw fail(e && e.name === 'PasswordException' ? 'password' : 'corrupt'); });
      }
      return libs.zip().then(function (Z) { return extractDocx(Z, buf); }).catch(function (e) { if (e && e.code) throw e; throw fail('corrupt'); });
    }).then(function (txt) {
      var n = norm(txt);
      if (kind === 'pdf') {
        if (looksReversed(n)) n = n.split('\n').map(reverseLine).join('\n');
        var bad = (n.match(/\)[^()\n]*\(/g) || []).length, good = (n.match(/\([^()\n]*\)/g) || []).length;
        if (bad > good) n = n.replace(/[()]/g, function (c) { return c === '(' ? ')' : '('; });
      }
      if ((n.match(/[A-Za-z\u0600-\u06ff]/g) || []).length < 25) throw fail('noText');
      return n;
    });
  }

  return {norm: norm, K: K, parse: parse, extractPdf: extractPdf, extractDocx: extractDocx, decodeText: decodeText, readFile: readFile, pageLines: pageLines, buildLine: buildLine, mapTitle: mapTitle, mobileOf: mobileOf, parseSalary: parseSalary, headOf: headOf};
});
