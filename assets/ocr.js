/* On-device OCR (Persian + English) for photos/screenshots/scanned PDFs. Local files only (assets/vendor/ocr), no CDN, nothing is uploaded. */
(function () {
  'use strict';
  var BASE = 'assets/vendor/ocr/', VQ = ''; try { VQ = ((document.currentScript && document.currentScript.src) || '').match(/\?v=[\w.]+/)[0]; } catch (e) {}
  var CFG = {max: 2000, min: 1500, minShort: 1100, up: 2};
  function abs(p) { return new URL(p, location.href).href; }
  function loadJS(src) { return new Promise(function (ok, no) { var el = document.createElement('script'); el.src = src + VQ; el.async = true; el.onload = ok; el.onerror = function () { no(new Error('load')); }; document.head.appendChild(el); }); }
  function fail(code) { var e = new Error(code); e.code = code; return e; }

  /* ---- image decode + preprocessing: orientation, resize, grayscale, shadow flattening, contrast stretch, dark-mode invert */
  function decode(blob) {
    if (window.createImageBitmap) {
      return createImageBitmap(blob, {imageOrientation: 'from-image'}).catch(function () { return createImageBitmap(blob); }).catch(function () { return viaImg(blob); });
    }
    return viaImg(blob);
  }
  function viaImg(blob) {
    return new Promise(function (ok, no) { var u = URL.createObjectURL(blob), im = new Image(); im.onload = function () { URL.revokeObjectURL(u); ok(im); }; im.onerror = function () { URL.revokeObjectURL(u); no(fail('corrupt')); }; im.src = u; });
  }
  function dims(src) { return {w: src.naturalWidth || src.videoWidth || src.width, h: src.naturalHeight || src.videoHeight || src.height}; }
  function prep(src) { // src: ImageBitmap | HTMLImageElement | canvas → canvas (grayscale, enhanced)
    var d = dims(src), long = Math.max(d.w, d.h), k = 1;
    if (long > CFG.max) k = CFG.max / long; else if (long < CFG.min && Math.min(d.w, d.h) < CFG.minShort) k = Math.min(CFG.up, CFG.min / long);
    var w = Math.max(1, Math.round(d.w * k)), h = Math.max(1, Math.round(d.h * k));
    var c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d', {willReadFrequently: true});
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, w, h);
    if (src.close) try { src.close(); } catch (e) {}
    var im = x.getImageData(0, 0, w, h), a = im.data, n = w * h, g = new Uint8ClampedArray(n), i, sum = 0;
    for (i = 0; i < n; i++) { var v = (a[i * 4] * 299 + a[i * 4 + 1] * 587 + a[i * 4 + 2] * 114) / 1000; g[i] = v; sum += v; }
    // background estimate on a tiny grid (lighting gradients / shadows), then divide it out
    var gw = Math.max(2, Math.round(w / 40)), gh = Math.max(2, Math.round(h / 40)), bg = document.createElement('canvas'); bg.width = gw; bg.height = gh;
    var bx = bg.getContext('2d', {willReadFrequently: true}); bx.imageSmoothingQuality = 'high'; bx.drawImage(c, 0, 0, gw, gh);
    var bd = bx.getImageData(0, 0, gw, gh).data, cell = new Float32Array(gw * gh);
    for (i = 0; i < gw * gh; i++) cell[i] = (bd[i * 4] * 299 + bd[i * 4 + 1] * 587 + bd[i * 4 + 2] * 114) / 1000;
    // text pulls the cell mean down; lift each cell toward the page's brightest neighbourhood
    var mx = new Float32Array(gw * gh);
    for (var yy = 0; yy < gh; yy++) for (var xx = 0; xx < gw; xx++) { var m = 0; for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) { var X = xx + dx, Y = yy + dy; if (X >= 0 && Y >= 0 && X < gw && Y < gh && cell[Y * gw + X] > m) m = cell[Y * gw + X]; } mx[yy * gw + xx] = m; }
    var invert = sum / n < 105, out = new Uint8ClampedArray(n), lo = 255, hi = 0, hist = new Uint32Array(256);
    for (var y = 0; y < h; y++) {
      var fy = Math.min(gh - 1.001, Math.max(0, (y + 0.5) / h * gh - 0.5)), y0 = fy | 0, ty = fy - y0;
      for (var xq = 0; xq < w; xq++) {
        var fx = Math.min(gw - 1.001, Math.max(0, (xq + 0.5) / w * gw - 0.5)), x0 = fx | 0, tx = fx - x0;
        var b = (mx[y0 * gw + x0] * (1 - tx) + mx[y0 * gw + x0 + 1] * tx) * (1 - ty) + (mx[(y0 + 1) * gw + x0] * (1 - tx) + mx[(y0 + 1) * gw + x0 + 1] * tx) * ty;
        var p = g[y * w + xq]; if (invert) p = 255 - p, b = 255 - Math.min(b, 255) + 0; // dark theme: flip so text is dark on light
        var q = invert ? p : (b > 20 ? Math.min(255, p / b * 255) : p); out[y * w + xq] = q; hist[q | 0]++;
      }
    }
    // percentile contrast stretch (1% / 99%)
    var acc = 0, t1 = n * 0.01, t2 = n * 0.995; for (i = 0; i < 256; i++) { acc += hist[i]; if (acc >= t1 && lo === 255) lo = i; if (acc >= t2) { hi = i; break; } }
    if (hi - lo < 70) { lo = 0; hi = 255; } // flat page: don't blow the sensor noise up into fake text
    var sc = 255 / (hi - lo);
    for (i = 0; i < n; i++) { var z = (out[i] - lo) * sc; z = z < 0 ? 0 : z > 255 ? 255 : z; a[i * 4] = a[i * 4 + 1] = a[i * 4 + 2] = z; a[i * 4 + 3] = 255; }
    x.putImageData(im, 0, 0);
    var dark = 0; for (i = 0; i < n; i++) if (a[i * 4] < 110) dark++;
    c.blank = dark < n * 0.0006; return c;
  }

  /* ---- two-column layouts (CVs with a sidebar): find a clean vertical gutter inside each text band and read the columns separately,
     right column first (RTL), so the OCR doesn't interleave lines of both columns */
  function columns(c) {
    var w = c.width, h = c.height, im = c.getContext('2d').getImageData(0, 0, w, h).data, y, x;
    var g = gutter(im, w, 0, h) || gutter(im, w, Math.round(h * 0.25), h); if (!g) return [c];
    var cross = new Uint8Array(h); // rows with ink inside the gutter = full-width lines (title, etc.)
    for (y = 0; y < h; y++) { var n = 0, o = y * w * 4; for (x = g.x0; x < g.x1; x++) if (im[o + x * 4] < 140) n++; cross[y] = n >= 2 ? 1 : 0; }
    var gap = Math.max(8, Math.round(h * 0.012)), segs = [], i = 0;
    while (i < h) {
      var j = i, k = cross[i]; while (j < h && cross[j] === k) j++;
      segs.push({y0: i, y1: j, span: !!k}); i = j;
    }
    // a tiny non-spanning run between two spanning ones is just a gap between lines: merge it into the spanning band
    var m = [];
    segs.forEach(function (sg) { var t = m[m.length - 1]; if (t && ((t.span && sg.span) || (t.span && !sg.span && sg.y1 - sg.y0 < gap && sg.y1 < h) )) { if (sg.span || t.span) { t.y1 = sg.y1; t.span = true; } } else if (t && !t.span && sg.span && t.y1 - t.y0 < gap && m.length) { t.y1 = sg.y1; t.span = true; } else m.push({y0: sg.y0, y1: sg.y1, span: sg.span}); });
    var out = [], real = false;
    m.forEach(function (sg) {
      var hh = sg.y1 - sg.y0; if (hh < 6) return;
      if (sg.span) out.push(crop(c, 0, sg.y0, w, hh));
      else { if (hh >= h * 0.08) real = true; out.push(crop(c, g.x1, sg.y0, w - g.x1, hh), crop(c, 0, sg.y0, g.x0, hh)); }
    });
    return real ? out : [c];
  }
  function gutter(im, w, y0, y1) {
    var bh = y1 - y0, col = new Uint32Array(w), x, y, tot = 0, lim = Math.max(2, bh * 0.004 | 0);
    for (y = y0; y < y1; y++) { var o = y * w * 4; for (x = 0; x < w; x++) if (im[o + x * 4] < 140) { col[x]++; tot++; } }
    var lo = Math.floor(w * 0.25), hi = Math.ceil(w * 0.75), need = Math.max(14, Math.round(w * 0.018)), best = null, run = 0;
    for (x = lo; x <= hi; x++) {
      if (col[x] <= lim) run++; else { if (run >= need && (!best || run > best.n)) best = {x0: x - run, x1: x, n: run}; run = 0; }
    }
    if (run >= need && (!best || run > best.n)) best = {x0: hi - run + 1, x1: hi + 1, n: run};
    if (!best) return 0;
    var left = 0, right = 0; for (x = 0; x < best.x0; x++) left += col[x]; for (x = best.x1; x < w; x++) right += col[x];
    return left > tot * 0.15 && right > tot * 0.15 ? best : 0;
  }
  function crop(c, x, y, w, h) { var P = 14, o = document.createElement('canvas'), q = o.getContext('2d'); o.width = w + 2 * P; o.height = h + 2 * P; q.fillStyle = '#fff'; q.fillRect(0, 0, o.width, o.height); q.drawImage(c, x, y, w, h, P, P, w, h); return o; }

  /* ---- scanned PDF → canvases (pdfjs lib supplied by the caller) */
  function pdfPages(lib, buf, maxPages) {
    return lib.getDocument({data: new Uint8Array(buf), isEvalSupported: false, disableFontFace: true, useSystemFonts: false, verbosity: 0}).promise.then(function (doc) {
      var n = Math.min(doc.numPages, maxPages || 3), out = [], p = Promise.resolve();
      for (var i = 1; i <= n; i++) (function (k) {
        p = p.then(function () { return doc.getPage(k); }).then(function (pg) {
          var v1 = pg.getViewport({scale: 1}), sc = Math.max(1, 1800 / Math.max(v1.width, v1.height)); var vp = pg.getViewport({scale: sc});
          var c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
          var cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height);
          return pg.render({canvasContext: cx, viewport: vp}).promise.then(function () { out.push(c); });
        });
      })(i);
      return p.then(function () { var tot = doc.numPages; try { doc.destroy(); } catch (e) {} return {pages: out, total: tot}; });
    });
  }

  /* ---- clean OCR output so the existing parsers see ordinary text */
  var KEEP = 'from forwarded excel word box office java python django react redis docker linux git jira canva figma zoom teams slack sql css html php ios android mac windows chrome wifi lan wan vpn cctv dvr nvr pos erp crm seo sem cad gps ups hr it pc cv pdf ui ux ai b2b b2c kpi roi cpa ceo cto cfo mba bim bom jpg png usb ssd hdd cpu gpu ram led lcd oled tft ic smd bga sim imei icdl ielts toefl ms access outlook power bi photoshop illustrator premiere capcut'.split(' ');
  function clean(t, vocab) {
    var keep = {}; KEEP.forEach(function (k) { keep[k] = 1; }); (vocab || []).forEach(function (k) { keep[String(k).toLowerCase()] = 1; });
    t = String(t || '').replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff\ufffd]/g, '').replace(/\u00ad/g, '');
    t = t.replace(/([\u0600-\u06ff])[»«](?=\s)/g, '$1،').replace(/[«»©®™§¢]/g, '').replace(/[|¦](?=\s*$)/gm, '');
    t = t.replace(/([\u0600-\u06ff]),(?=\s)/g, '$1،').replace(/^[ \t*•·●■»«'"‘’“”+]*[0O۰](?=[ \t]+\S)/gm, '•').replace(/^[ \t]*[*»·+][ \t]+/gm, '• ');
    t = t.replace(/(^|[\s(])([A-Za-z0-9_.]{3,})@(?=[\s)،,.]|$)/g, '$1@$2'); // the bidi algorithm moves a leading @ to the end of the handle
    var PER = /[\u0600-\u06ff]/g;
    t = t.split('\n').map(function (ln) {
      var per = (ln.match(PER) || []).length; if (per < 3) return ln;
      ln = ln.replace(/^[ \t]*[\[\]\\&+<>{}~=]{1,3}[ \t]*(?=[\u0600-\u06ff])/, '').replace(/^[ \t]*(?:[A-Za-z]{1,4}|[0-9]\)?)[ \t]+(?=[\u0600-\u06ff]{2,}[^\n]*[:：])/, ''); // emoji / icon at the line start read as noise
      var words = ln.split(/([ \t]+)/), n = ln.replace(/[ \t]+/g, ' ').trim().split(' ').length, i, w, core, nw = 0;
      for (i = 0; i < words.length; i += 2) if (words[i]) nw++;
      for (i = 0; i < words.length; i += 2) {
        w = words[i]; core = w.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, ''); if (!w || w.replace(/[^A-Za-z]/g, '') !== core || !/^[A-Za-z]{1,6}$/.test(core) || keep[core.toLowerCase()]) continue;
        var up = core === core.toUpperCase() && core.length > 1, low = core === core.toLowerCase(), edge = (i === 0 || i === words.length - 1) && nw <= 3;
        if ((low && core.length <= 5) || (core.length <= 3 && !(up && core.length === 3 && !edge)) || (up && edge)) words[i] = '';
      }
      return words.join('').replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+[0O]$/, '');
    }).join('\n');
    t = t.split('\n').map(function (ln) { return /^[^\u0600-\u06ff]{4,80}$/.test(ln) && (ln.match(/[A-Za-z0-9]\.\s+[A-Za-z0-9]/g) || []).length >= 2 && ln.indexOf(',') < 0 ? ln.replace(/([A-Za-z0-9])\.\s+(?=[A-Za-z0-9])/g, '$1، ') : ln; }).join('\n');
    t = t.replace(/([A-Za-z\u0600-\u06ff])[ \t]+[0O][ \t]*$/gm, '$1');
    t = t.replace(/^[^\n\u0600-\u06ffA-Za-z0-9]*[A-Za-z]{1,3}\)?\s+(همکاری\s*[:：])/gm, 'نوع $1');
    t = t.replace(/^(?:[•\s]*)سوابق[ \t]*$/gm, 'سوابق کاری').replace(/مهار[ \t]+ت(?=[ \t]|$)/g, 'مهارت');
    return t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }

  /* ---- worker */
  function start(sources, opt) {
    opt = opt || {}; var cancelled = false, worker = null, job = {};
    var tell = function (p, label) { if (opt.onProgress) try { opt.onProgress(Math.max(0, Math.min(100, Math.round(p))), label || ''); } catch (e) {} };
    job.cancel = function () { cancelled = true; if (worker) { try { worker.terminate(); } catch (e) {} } };
    var total = sources.length, cur = 0, phase = 0, sub = [0, 1]; // phase 0: loading engine/lang (0-30%), 1: reading pages (30-100%)
    job.promise = loadJS(abs(BASE + 'tesseract.min.js')).catch(function () { throw fail('load'); }).then(function () {
      if (cancelled) throw fail('cancel'); tell(2, 'load');
      var langSeen = {};
      return window.Tesseract.createWorker(['fas', 'eng'], 1, {
        workerPath: abs(BASE + 'worker.min.js') + VQ, corePath: abs(BASE + 'core'), langPath: abs(BASE + 'lang'), workerBlobURL: false, gzip: true,
        logger: function (m) {
          if (cancelled || !m) return;
          if (m.status === 'recognizing text') { tell(30 + 70 * ((cur + (sub[0] + m.progress) / sub[1]) / total), 'read'); }
          else if (phase === 0 && typeof m.progress === 'number') { tell(2 + 28 * (m.status === 'loading tesseract core' ? m.progress * 0.5 : 0.5 + m.progress * 0.5), 'load'); }
        }
      }).catch(function (e) { if (cancelled) throw fail('cancel'); throw fail('load'); });
    }).then(function (w) {
      worker = w; if (cancelled) { try { w.terminate(); } catch (e) {} throw fail('cancel'); }
      phase = 1; var texts = [], confs = [], p = Promise.resolve();
      sources.forEach(function (s, i) {
        p = p.then(function () { if (cancelled) throw fail('cancel'); cur = i; sub = [0, 1]; tell(30 + 70 * i / total, 'read');
          return (s instanceof Blob ? decode(s) : Promise.resolve(s)).then(function (im) {
            var pc = prep(im), units = pc.blank ? [] : columns(pc), q = Promise.resolve(), parts = [], cf = [];
            units.forEach(function (u, j) { q = q.then(function () { if (cancelled) throw fail('cancel'); sub = [j, units.length]; return w.recognize(u); }).then(function (r) { parts.push(r.data.text || ''); cf.push(r.data.confidence || 0); }); });
            return q.then(function () { texts.push(parts.join('\n')); confs.push(cf.reduce(function (a, b) { return a + b; }, 0) / (cf.length || 1)); });
          });
        });
      });
      return p.then(function () { try { w.terminate(); } catch (e) {} worker = null; tell(100, 'done'); return {text: clean(texts.join('\n\n'), opt.vocab), conf: confs.length ? confs.reduce(function (a, b) { return a + b; }, 0) / confs.length : 0}; })
        .catch(function (e) { try { w.terminate(); } catch (x) {} if (cancelled) throw fail('cancel'); throw (e && e.code ? e : fail('ocr')); });
    });
    return job;
  }

  window.TYOcr = {columns: columns, cfg: CFG, start: start, pdfPages: pdfPages, clean: clean, prep: prep, decode: decode};
})();
