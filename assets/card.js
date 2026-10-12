/* کارت تصویری آگهی/رزومه (فلایر کانال): کاملاً داخل مرورگر با canvas ساخته می‌شود، بدون CDN و بدون آپلود تا لحظه‌ی ارسال.
   TYCard.mount(el, opts) رابط مرحله‌ی «کارت» را می‌سازد؛ TYCard.render/exportCard/fromText برای پنل ادمین و تست. */
(function () {
  'use strict';
  var TY = window.TY, D = window.TY_DATA || {};
  var W = 1080, H = 1350, BRAND = '#0A7A5A', INK = '#1B1A17', MUTE = '#6A655B', PAPER = '#F5F4F1', SHEET = '#FBFAF8';
  var PAL = {sales: '#B8431B', commerce: '#0F5E7A', finance: '#1F6B45', hr: '#7B3F6E', aftersales: '#A4630A', warehouse: '#5E6B2B', it: '#2A52A0', marketing: '#B0305F', support: '#0E7C86', security: '#3F4752', management: '#2B2E36', _: BRAND};
  var PALNAME = {sales: 'نارنجی', commerce: 'آبی نفتی', finance: 'سبز', hr: 'بادمجانی', aftersales: 'عسلی', warehouse: 'زیتونی', it: 'آبی', marketing: 'تمشکی', support: 'فیروزه‌ای', security: 'خاکستری', management: 'دودی', _: 'سبز تخصص‌یاب'};
  var ICON = { // 24×24 stroke icons
    sales: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0',
    commerce: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z',
    finance: 'M5 2h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1ZM8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01',
    hr: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    aftersales: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z',
    warehouse: 'M16.5 9.4 7.5 4.21M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16ZM3.27 6.96 12 12.01l8.73-5.05M12 22.08V12',
    it: 'M3 3h18v14H3ZM8 21h8M12 17v4',
    marketing: 'm3 11 18-5v12L3 14v-3ZM11.6 16.8a3 3 0 1 1-5.8-1.6',
    support: 'M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3',
    security: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z',
    management: 'M3 7h18v14H3ZM16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16',
    _: 'M3 7h18v14H3ZM16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16'
  };
  var STYLES = [['a', 'برگ'], ['b', 'تیتر'], ['c', 'کاغذ'], ['d', 'شب']];
  var FONT = 'Vazirmatn, Tahoma, "Segoe UI", sans-serif';
  var MAXLEN = 200000; // سقف طول dataURL کارت (سرور تا ۲۲۵ هزار می‌پذیرد)

  /* ---------- small helpers ---------- */
  function fa(s) { s = String(s == null ? '' : s); return TY && TY.fa ? TY.fa(s) : s; }
  function hex(c) { var n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgb(a) { return 'rgb(' + a.map(Math.round).join(',') + ')'; }
  function mix(c, w, t) { var a = hex(c), b = hex(w); return rgb([0, 1, 2].map(function (i) { return a[i] + (b[i] - a[i]) * t; })); }
  function rgba(c, al) { var a = hex(c); return 'rgba(' + a[0] + ',' + a[1] + ',' + a[2] + ',' + al + ')'; }
  function toHex(r) { var m = r.match(/\d+/g).map(Number); return '#' + m.map(function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function lighten(c, t) { return toHex(mix(c, '#ffffff', t)); }
  function darken(c, t) { return toHex(mix(c, '#000000', t)); }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function font(c, px, wt) { c.font = (wt || 600) + ' ' + Math.round(px) + 'px ' + FONT; }
  function tw(c, s) { return c.measureText(s).width; }
  function clip(c, s, maxW) { if (tw(c, s) <= maxW) return s; while (s.length > 1 && tw(c, s + '…') > maxW) s = s.slice(0, -1); return s.replace(/\s+$/, '') + '…'; }
  function fit(c, s, maxW, px, min, wt) { font(c, px, wt); while (px > min && tw(c, s) > maxW) { px -= 2; font(c, px, wt); } return px; }
  function wrap(c, s, maxW, maxLines) {
    var words = String(s).split(/\s+/), lines = [], cur = '';
    words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (tw(c, t) <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; } });
    if (cur) lines.push(cur);
    if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = clip(c, lines[maxLines - 1] + ' …', maxW); }
    return lines.map(function (l) { return clip(c, l, maxW); });
  }
  function pill(c, xr, y, text, px, bg, fg, padX, h, wt) { // xr = right edge; returns left edge
    font(c, px, wt || 700); var w = tw(c, text) + padX * 2; c.fillStyle = bg; rr(c, xr - w, y, w, h, h / 2); c.fill();
    c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, xr - w / 2, y + h / 2 + px * 0.04); c.textAlign = 'right'; return xr - w;
  }
  function icon(c, key, cx, cy, size, color, lw, alpha) {
    c.save(); c.translate(cx - size / 2, cy - size / 2); var s = size / 24; c.scale(s, s); c.lineWidth = lw || 1.6; c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = color; c.globalAlpha = alpha == null ? 1 : alpha; c.stroke(new Path2D(ICON[key] || ICON._)); c.restore();
  }
  function brand(c, xr, y, fg, sub, handleX) { // «ت» + تخصص‌یاب در راست، @JobVacencies در چپ
    c.fillStyle = fg; rr(c, xr - 62, y - 31, 62, 62, 17); c.fill();
    c.fillStyle = sub; c.textAlign = 'center'; c.textBaseline = 'middle'; font(c, 44, 800); c.fillText('ت', xr - 31, y + 4);
    c.textAlign = 'right'; c.fillStyle = fg; font(c, 38, 800); c.fillText('تخصص‌یاب', xr - 80, y + 2);
    c.textAlign = 'left'; c.globalAlpha = .75; font(c, 30, 600); c.direction = 'ltr'; c.fillText('@JobVacencies', handleX, y + 2); c.direction = 'rtl'; c.globalAlpha = 1; c.textAlign = 'right';
  }
  function cover(c, im, x, y, w, h) { var r = Math.max(w / im.width, h / im.height), sw = w / r, sh = h / r; c.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, x, y, w, h); }
  function contain(c, im, x, y, w, h) { var r = Math.min(w / im.width, h / im.height), dw = im.width * r, dh = im.height * r; c.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); }
  function logoTile(c, im, x, y, s, bg, line) {
    c.fillStyle = bg; rr(c, x, y, s, s, 30); c.fill(); if (line) { c.strokeStyle = line; c.lineWidth = 2; rr(c, x + 1, y + 1, s - 2, s - 2, 30); c.stroke(); }
    c.save(); rr(c, x, y, s, s, 30); c.clip(); contain(c, im, x + 14, y + 14, s - 28, s - 28); c.restore();
  }
  function initials(n) { var w = String(n || '').trim().split(/\s+/).filter(Boolean); return w.length ? w[0].charAt(0) + (w.length > 1 ? '\u200c' + w[w.length - 1].charAt(0) : '') : ''; }
  function avatar(c, cx, cy, r, d, o, bg, fg, ring) {
    if (ring) { c.fillStyle = ring; c.beginPath(); c.arc(cx, cy, r + 12, 0, 7); c.fill(); }
    c.save(); c.beginPath(); c.arc(cx, cy, r, 0, 7); c.clip();
    if (o.photo && o.showPhoto !== false) cover(c, o.photo, cx - r, cy - r, 2 * r, 2 * r);
    else {
      c.fillStyle = bg; c.fillRect(cx - r, cy - r, 2 * r, 2 * r); var ini = initials(d.name);
      c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
      if (ini) { font(c, r * .85, 800); c.fillText(ini, cx, cy + r * .06); } else icon(c, d.deptKey || '_', cx, cy, r * 1.1, fg, 1.5);
      c.textAlign = 'right';
    }
    c.restore();
  }
  function rows(c, list, xr, y, maxW, o) { // «برچسب  مقدار» با نقطه‌ی رنگی؛ برمی‌گرداند y بعدی
    o = o || {}; var step = o.step || 76;
    list.forEach(function (r) {
      c.fillStyle = o.dot; rr(c, xr - 14, y - 7, 14, 14, 4); c.fill();
      font(c, o.lp || 32, 500); c.fillStyle = o.lc; c.textAlign = 'right'; c.textBaseline = 'middle'; var l = r[0] + ':'; c.fillText(l, xr - 34, y + 2);
      var lw = tw(c, l), vw = maxW - lw - 56; fit(c, r[1], vw, o.vp || 40, 28, 700); c.fillStyle = o.vc; c.fillText(clip(c, r[1], vw), xr - 34 - lw - 16, y + 2); y += step;
    });
    return y;
  }
  function chips(c, list, xr, y, maxW, bg, fg, px, h) {
    var maxY = H - 190; // چیپ‌ها، چند ردیفه (حداکثر ۲)
    var x = xr, line = 0; c.textBaseline = 'middle'; font(c, px, 600);
    for (var i = 0; i < list.length; i++) {
      var w = tw(c, list[i]) + 40; if (x - w < xr - maxW) { line++; if (line > 1 || y + 2 * h + 14 > maxY) break; x = xr; y += h + 14; }
      c.fillStyle = bg; rr(c, x - w, y, w, h, h / 2); c.fill(); c.fillStyle = fg; c.textAlign = 'center'; c.fillText(list[i], x - w / 2, y + h / 2 + 2); x -= w + 12;
    }
    c.textAlign = 'right'; return y + h;
  }
  function contactPill(c, xr, y, d, bg, fg) {
    if (!d.contact) return;
    var t = d.contact, isLtr = /^[\x20-\x7e]+$/.test(t), px = 44; font(c, px, 700);
    var w = Math.min(tw(c, t) + 170, W - 160), tx = isLtr ? tw(c, t) : 0;
    c.fillStyle = bg; rr(c, xr - w, y, w, 96, 48); c.fill(); c.fillStyle = fg; c.textBaseline = 'middle'; c.textAlign = 'right';
    c.direction = isLtr ? 'ltr' : 'rtl'; c.fillText(clip(c, t, w - 150), xr - 112, y + 50); c.direction = 'rtl';
    icon(c, '_ph', xr - 58, y + 48, 40, fg, 1.8);
  }
  ICON._ph = 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z';

  /* ---------- the four layouts ---------- */
  function lay(d) { // محتوای مشترک: ردیف‌ها حداکثر ۴ تا
    return {rows: (d.rows || []).filter(function (r) { return r[1]; }).slice(0, 4), chips: (d.chips || []).slice(0, 7)};
  }
  function titleBlock(c, d, xr, y, maxW, color, sub, maxPx, minPx, lines) {
    var t = d.title || (d.kind === 'cv' ? 'نام و نام خانوادگی' : 'عنوان شغل'), px = maxPx;
    font(c, px, 900); var ls = wrap(c, t, maxW, lines);
    var bal = function () { if (ls.length < 2) return; var n = ls.length, lo = maxW * .45, hi = maxW, w; for (var i = 0; i < 12; i++) { w = (lo + hi) / 2; var t2 = wrap(c, t, w, n); if (t2.length === n && t2.join(' ').indexOf('…') < 0) hi = w; else lo = w; } var r = wrap(c, t, hi, n); if (r.length === n) ls = r; };
    bal();
    while ((ls.length > 1 && px > minPx + 12 && ls.length >= lines && tw(c, t) > maxW * (lines - .3))) { px -= 4; font(c, px, 900); ls = wrap(c, t, maxW, lines); bal(); }
    c.fillStyle = color; c.textAlign = 'right'; c.textBaseline = 'alphabetic'; if (!d.title) c.globalAlpha = .45;
    ls.forEach(function (l, i) { c.fillText(l, xr, y + i * px * 1.28); }); c.globalAlpha = 1; y += (ls.length - 1) * px * 1.28 + 22;
    if (d.sub) { c.textBaseline = 'top'; font(c, 40, 600); c.fillStyle = sub; c.fillText(clip(c, d.sub, maxW), xr, y + 12); y += 70; }
    return y;
  }
  function styleA(c, d, o, col) { // برگ: بالا رنگی با واژه‌ی بزرگ، پایین کاغذ
    var L = lay(d), pad = 80, xr = W - pad, dark = darken(col, .25);
    c.fillStyle = col; c.fillRect(0, 0, W, 560);
    icon(c, d.deptKey, 230, 330, 600, '#ffffff', .55, .13);
    brand(c, xr, 86, '#ffffff', col, pad);
    if (d.cat) pill(c, xr, 170, clip(c, d.cat, 700), 34, 'rgba(255,255,255,.18)', '#ffffff', 28, 62, 600);
    c.textBaseline = 'alphabetic'; c.textAlign = 'right'; c.fillStyle = '#ffffff'; font(c, d.kind === 'cv' ? 130 : 156, 900); c.fillText(d.label, xr, 410);
    if (d.urgent) pill(c, pad + 190, 300, 'فوری', 40, '#FFC83D', INK, 34, 76, 800);
    c.fillStyle = SHEET; rr(c, 0, 500, W, H - 500 + 80, 64); c.fill();
    var hasMedia = (d.kind === 'ad' && o.logo) || d.kind === 'cv', tx = xr, tmax = W - pad * 2 - (hasMedia ? 210 : 0), y0 = 640;
    if (d.kind === 'ad' && o.logo) logoTile(c, o.logo, pad, 548, 170, '#ffffff', '#E4E1DA');
    if (d.kind === 'cv') avatar(c, pad + 95, 640, 95, d, o, col, '#ffffff', SHEET);
    var y = titleBlock(c, d, tx, y0, tmax, INK, MUTE, 78, 50, 2);
    y = Math.max(y, 770) + 10;
    c.fillStyle = rgba(col, .08); var bh = L.rows.length * 76 + 44; if (L.rows.length) { rr(c, pad, y, W - pad * 2, bh, 36); c.fill(); }
    var yy = rows(c, L.rows, xr - 36, y + 56, W - pad * 2 - 72, {dot: col, lc: MUTE, vc: INK}); y += L.rows.length ? bh + 28 : 0;
    if (L.chips.length && y < 1100) chips(c, L.chips, xr, y, W - pad * 2, rgba(col, .12), dark, 30, 54);
    contactPill(c, xr, H - 156, d, col, '#ffffff');
  }
  function styleB(c, d, o, col) { // تیتر: تمام‌رنگ، متن درشت
    var L = lay(d), pad = 84, xr = W - pad, bg = darken(col, .08);
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    icon(c, d.deptKey, 220, 1130, 760, '#ffffff', .5, .09);
    brand(c, xr, 92, '#ffffff', bg, pad);
    var yy = 210; if (d.kind === 'ad' && o.logo) { logoTile(c, o.logo, pad, 170, 150, '#ffffff'); }
    if (d.kind === 'cv') avatar(c, pad + 100, 300, 100, d, o, rgba('#ffffff', .2), '#ffffff', 'rgba(255,255,255,.35)');
    var lx = xr; pill(c, lx, yy, d.label, 40, '#ffffff', bg, 36, 76, 800); if (d.urgent) pill(c, lx - 190, yy, 'فوری', 40, '#FFC83D', INK, 34, 76, 800);
    if (d.cat) { c.textBaseline = 'top'; font(c, 36, 500); c.fillStyle = 'rgba(255,255,255,.8)'; c.textAlign = 'right'; c.fillText(clip(c, d.cat, 700), xr, yy + 108); }
    var y = titleBlock(c, d, xr, 520, W - pad * 2, '#ffffff', 'rgba(255,255,255,.85)', 112, 64, 3);
    y = Math.max(y + 10, 800); c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 2;
    L.rows.forEach(function (r, i) { var yr = y + i * 78; c.beginPath(); c.moveTo(pad, yr - 38); c.lineTo(xr, yr - 38); c.stroke(); });
    rows(c, L.rows, xr - 4, y, W - pad * 2 - 8, {dot: '#ffffff', lc: 'rgba(255,255,255,.7)', vc: '#ffffff', step: 78});
    if (L.chips.length && y + L.rows.length * 78 < 1100) chips(c, L.chips, xr, y + L.rows.length * 78 - 10, W - pad * 2, 'rgba(255,255,255,.16)', '#ffffff', 30, 54);
    contactPill(c, xr, H - 150, d, '#ffffff', bg);
  }
  function styleC(c, d, o, col) { // کاغذ: روشن، نوار رنگی
    var L = lay(d), pad = 84, xr = W - pad;
    c.fillStyle = PAPER; c.fillRect(0, 0, W, H); c.fillStyle = col; c.fillRect(W - 28, 0, 28, H);
    brand(c, xr - 20, 92, col, '#ffffff', pad); c.strokeStyle = '#DAD6CC'; c.lineWidth = 2; c.beginPath(); c.moveTo(pad, 160); c.lineTo(xr - 20, 160); c.stroke();
    var xr2 = xr - 20;
    if (d.kind === 'cv') avatar(c, xr2 - 120, 330, 120, d, o, col, '#ffffff', PAPER);
    else { c.fillStyle = col; c.beginPath(); c.arc(xr2 - 100, 320, 100, 0, 7); c.fill(); icon(c, d.deptKey, xr2 - 100, 320, 112, '#ffffff', 1.5); }
    c.textBaseline = 'alphabetic'; c.textAlign = 'right'; c.fillStyle = col; font(c, d.kind === 'cv' ? 72 : 84, 900); c.fillText(d.label, xr2 - (d.kind === 'cv' ? 290 : 250), 316);
    if (d.cat) { c.textBaseline = 'top'; font(c, 34, 500); c.fillStyle = MUTE; c.fillText(clip(c, d.cat, 520), xr2 - (d.kind === 'cv' ? 290 : 250), 338); }
    if (d.urgent) pill(c, xr2 - 250, 128 + 250 - 40, 'فوری', 34, '#C62828', '#ffffff', 28, 58, 800);
    if (d.kind === 'ad' && o.logo) logoTile(c, o.logo, pad, 232, 190, '#ffffff', '#DAD6CC');
    var y = titleBlock(c, d, xr2, 560, W - pad * 2 - 20, INK, MUTE, 86, 52, 2);
    y = Math.max(y + 20, 760);
    var cw = (W - pad * 2 - 20 - 30) / 2; // شبکه‌ی ۲×۲: برچسب بالا، مقدار پایین
    L.rows.forEach(function (r, i) {
      var cx = xr2 - (i % 2) * (cw + 30), cy = y + Math.floor(i / 2) * 150;
      c.fillStyle = '#ffffff'; rr(c, cx - cw, cy, cw, 126, 26); c.fill(); c.strokeStyle = '#E4E1DA'; c.lineWidth = 2; rr(c, cx - cw + 1, cy + 1, cw - 2, 124, 26); c.stroke();
      c.textAlign = 'right'; c.textBaseline = 'top'; font(c, 28, 500); c.fillStyle = MUTE; c.fillText(r[0], cx - 26, cy + 20);
      fit(c, r[1], cw - 52, 38, 26, 700); c.fillStyle = INK; c.fillText(clip(c, r[1], cw - 52), cx - 26, cy + 64);
    });
    var yb = y + Math.ceil(L.rows.length / 2) * 150 + 6;
    if (L.chips.length && yb < 1100) chips(c, L.chips, xr2, yb, W - pad * 2 - 20, rgba(col, .12), darken(col, .2), 30, 54);
    contactPill(c, xr2, H - 156, d, col, '#ffffff');
  }
  function styleD(c, d, o, col) { // شب: تیره با لهجه‌ی رنگی
    var L = lay(d), pad = 84, xr = W - pad, ac = lighten(col, .38), bg = '#131416';
    c.fillStyle = bg; c.fillRect(0, 0, W, H); c.fillStyle = col; c.fillRect(0, 0, W, 16);
    icon(c, d.deptKey, 800, 330, 640, ac, .5, .08);
    brand(c, xr, 100, '#F2F0EB', bg, pad);
    if (d.kind === 'ad' && o.logo) logoTile(c, o.logo, pad, 190, 150, '#ffffff');
    if (d.kind === 'cv') avatar(c, pad + 100, 290, 100, d, o, col, '#ffffff', ac);
    c.textBaseline = 'alphabetic'; c.textAlign = 'right'; c.fillStyle = ac; font(c, d.kind === 'cv' ? 108 : 136, 900); c.fillText(d.label, xr, 360);
    if (d.urgent) pill(c, xr - tw(c, d.label) - 28, 262, 'فوری', 38, '#FFC83D', INK, 30, 70, 800);
    if (d.cat) { c.textBaseline = 'top'; font(c, 36, 500); c.fillStyle = 'rgba(242,240,235,.62)'; c.fillText(clip(c, d.cat, 800), xr, 386); }
    var y = titleBlock(c, d, xr, 590, W - pad * 2, '#F2F0EB', 'rgba(242,240,235,.7)', 92, 54, 2);
    y = Math.max(y + 20, 790);
    var yy = rows(c, L.rows, xr, y, W - pad * 2, {dot: ac, lc: 'rgba(242,240,235,.58)', vc: '#F2F0EB'});
    if (L.chips.length && yy < 1100) chips(c, L.chips, xr, yy, W - pad * 2, 'rgba(255,255,255,.09)', '#F2F0EB', 30, 54);
    contactPill(c, xr, H - 156, d, ac, '#141517');
  }
  var DRAW = {a: styleA, b: styleB, c: styleC, d: styleD};

  function colorOf(d, cs) { return (cs && cs.pal && cs.pal !== 'auto' && PAL[cs.pal]) || PAL[d.deptKey] || PAL._; }
  /** رسم کارت روی canvas با هر اندازه‌ای (مقیاس خودکار). o: {style, pal, logo:Image, photo:Image, showPhoto} */
  function render(cv, d, o) {
    o = o || {}; var c = cv.getContext('2d'), s = cv.width / W;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); c.save(); c.scale(s, s);
    c.direction = 'rtl'; c.textAlign = 'right'; c.textBaseline = 'alphabetic';
    var col = colorOf(d, o); d = Object.assign({}, d, {deptKey: PAL[d.deptKey] ? d.deptKey : '_'});
    (DRAW[o.style] || styleA)(c, d, o, col); c.restore();
  }

  /* ---------- data ---------- */
  function deptByTag(text) { var t = String(text || ''), r = null; (D.depts || []).forEach(function (x) { if (!r && t.indexOf(x.tag) >= 0) r = x; }); return r; }
  /** از وضعیت فرم (form.js): h = {kind, st, title, salary, dept:{key,name}} */
  function fromForm(h) {
    var st = h.st || {}, dp = h.dept || {}, cv = h.kind === 'jobseeker', coop = (st.coop || []).join(' / '), r = [];
    var d = {kind: cv ? 'cv' : 'ad', label: cv ? 'جویای کار' : 'استخدام', deptKey: dp.key || '_', cat: cv ? (dp.name || st.industry || '') : (st.industry || dp.name || ''), urgent: !!st.urgent, contact: contactOut(st.contact)};
    if (!cv) {
      d.title = h.title || ''; d.sub = st.company || '';
      r = [['محل کار', [st.city, st.area].filter(Boolean).join('، ')], ['نوع همکاری', coop], ['حقوق', h.salary || ''], ['ساعت کاری', st.hours || '']];
      if (!d.sub) d.sub = '';
      d.rows = r.map(function (x) { return [x[0], fa(x[1])]; });
      d.chips = String(st.reqs || '').split(/\n/).map(function (x) { return x.replace(/^[\s\-–•*🔹▫️\d.)]+/, '').trim(); }).filter(function (x) { return x && x.length <= 26; }).slice(0, 4);
    } else {
      var ex = (st.exp || []).filter(function (j) { return j.role || j.company; })[0], edu = st.degree ? st.degree + (st.major ? ' ' + st.major : '') : (st.major || '');
      d.name = st.name || ''; d.title = st.name || ''; d.sub = h.title || '';
      r = [['شهر', st.city], ['آخرین سابقه', ex ? [ex.role, ex.company].filter(Boolean).join(' – ') : ''], ['تحصیلات', edu], ['حقوق درخواستی', h.salary || ''], ['همکاری', coop]];
      d.rows = r.map(function (x) { return [x[0], fa(x[1] || '')]; }); d.chips = (st.skills || []).filter(function (x) { return x.length <= 22; }).slice(0, 6);
    }
    return d;
  }
  function contactOut(s) { s = TY && TY.en ? TY.en(String(s || '').trim()) : String(s || '').trim(); var u = s.match(/^@?([A-Za-z][A-Za-z0-9_]{3,31})$/); return u ? '@' + u[1] : s; }
  /** از متن پست (پنل ادمین / آیتم‌های قدیمی): همان قالب خروجی فرم‌ها */
  function fromText(text, type, title) {
    var t = String(text || ''), cv = type === 'jobseeker', dp = deptByTag(t), d = {kind: cv ? 'cv' : 'ad', label: cv ? 'جویای کار' : 'استخدام', deptKey: dp ? dp.key : '_', cat: dp ? dp.name : '', contact: '', rows: [], chips: [], urgent: /#فوری/.test(t)};
    function g(re) { var m = t.match(re); return m ? m[1].trim() : ''; }
    var contact = g(/(?:📞|☎️)[^:\n]*:\s*([^\n]+)/); d.contact = contactOut(contact);
    var ind = g(/🏭[^:\n]*:\s*([^\n]+)/); if (ind) d.cat = ind;
    if (!cv) {
      d.title = g(/💼\s*عنوان شغل:\s*([^\n]+)/) || title || ''; d.sub = g(/🏪[^:\n]*:\s*([^\n]+)/);
      d.rows = [['محل کار', g(/📍[^:\n]*:\s*([^\n]+)/)], ['نوع همکاری', g(/⏰[^:\n]*:\s*([^\n]+)/)], ['حقوق', g(/💰[^:\n]*:\s*([^\n]+)/)], ['ساعت کاری', g(/🕘[^:\n]*:\s*([^\n]+)/)]];
      d.chips = (t.match(/🔹\s*([^\n]+)/g) || []).map(function (x) { return x.replace(/^🔹\s*/, '').trim(); }).filter(function (x) { return x.length <= 26; }).slice(0, 4);
    } else {
      var m = t.match(/👤\s*([^|\n]+?)(?:\s*\|\s*([^\n]+))?(?:\n|$)/); d.name = m ? m[1].trim() : ''; d.title = d.name; d.sub = m && m[2] ? m[2].trim() : '';
      d.rows = [['شهر', g(/📍\s*([^|\n]+)/)], ['تحصیلات', g(/🎓[^:\n]*:\s*([^\n]+)/)], ['حقوق درخواستی', g(/💰[^:\n]*:\s*([^\n]+)/)]];
      d.chips = g(/🧠[^:\n]*:\s*([^\n]+)/).split(/[،,]/).map(function (x) { return x.trim(); }).filter(function (x) { return x && x.length <= 22; }).slice(0, 6);
    }
    d.rows = d.rows.map(function (x) { return [x[0], fa(x[1])]; }); return d;
  }

  /* ---------- images ---------- */
  var imgCache = {};
  function loadImg(src) {
    if (!src) return Promise.resolve(null);
    if (imgCache[src]) return imgCache[src];
    return (imgCache[src] = new Promise(function (ok) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { ok(null); }; im.src = src; }));
  }
  var ERR = {type: 'فقط فایل عکس (jpg، png، webp) انتخاب کن.', size: 'حجم عکس بیشتر از ۸ مگابایت است؛ عکس کوچک‌تری انتخاب کن.', bad: 'این عکس خوانده نشد. عکس دیگری امتحان کن (فرمت HEIC پشتیبانی نمی‌شود).'};
  /** عکس را کوچک می‌کند: logo → حداکثر ۸۰۰ پیکسل (شفافیت حفظ)، photo → مربع ۶۰۰ از وسط برش خورده. خروجی dataURL. */
  function prepImage(file, kind) {
    return new Promise(function (ok, no) {
      if (!file || !/^image\/(jpeg|png|webp|gif)$/i.test(file.type || '') && !/\.(jpe?g|png|webp|gif)$/i.test(file.name || '')) return no({code: 'type', message: ERR.type});
      if (file.size > 8 * 1024 * 1024) return no({code: 'size', message: ERR.size});
      var url = URL.createObjectURL(file), im = new Image();
      im.onerror = function () { URL.revokeObjectURL(url); no({code: 'bad', message: ERR.bad}); };
      im.onload = function () {
        URL.revokeObjectURL(url);
        try {
          var w = im.naturalWidth, h = im.naturalHeight; if (!w || !h) throw 0;
          var cv = document.createElement('canvas'), c = cv.getContext('2d'), out;
          if (kind === 'photo') {
            var s = Math.min(w, h), S = Math.min(600, s); cv.width = cv.height = S; c.drawImage(im, (w - s) / 2, (h - s) / 2, s, s, 0, 0, S, S); out = cv.toDataURL('image/jpeg', .82);
          } else {
            var k = Math.min(1, 800 / Math.max(w, h)); cv.width = Math.round(w * k); cv.height = Math.round(h * k); c.drawImage(im, 0, 0, cv.width, cv.height);
            out = cv.toDataURL('image/png');
            if (out.length > 160000) { var c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; var x = c2.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c2.width, c2.height); x.drawImage(cv, 0, 0); out = c2.toDataURL('image/jpeg', .8); }
          }
          ok(out);
        } catch (e) { no({code: 'bad', message: ERR.bad}); }
      };
      im.src = url;
    });
  }
  /** کارت فشرده: JPEG ≤ MAXLEN؛ ابعاد و کیفیت تا جایی که جا شود پایین می‌آید. + بندانگشتی */
  function exportCanvas(cv) {
    var steps = [[1080, .86], [1080, .76], [960, .74], [840, .7], [720, .66], [720, .55]], out = '', i, t, tc;
    for (i = 0; i < steps.length; i++) {
      t = document.createElement('canvas'); t.width = steps[i][0]; t.height = Math.round(steps[i][0] * H / W); t.getContext('2d').drawImage(cv, 0, 0, t.width, t.height);
      out = t.toDataURL('image/jpeg', steps[i][1]); if (out.length <= MAXLEN) break;
    }
    var th = '', q = .72, wd = 240; for (i = 0; i < 6; i++) { tc = document.createElement('canvas'); tc.width = wd; tc.height = Math.round(wd * H / W); tc.getContext('2d').drawImage(cv, 0, 0, tc.width, tc.height); th = tc.toDataURL('image/jpeg', q); if (th.length <= 13000) break; q -= .1; wd -= 30; }
    return out.length <= MAXLEN ? {image: out, thumb: th} : null;
  }
  function ready() { return (document.fonts && document.fonts.load ? Promise.all([document.fonts.load('900 60px Vazirmatn'), document.fonts.load('500 30px Vazirmatn')]) : Promise.resolve()).catch(function () {}); }
  /** بدون رابط: d + تنظیمات → {image, thumb} */
  function exportCard(d, cs, imgs) {
    imgs = imgs || {};
    return Promise.all([ready(), loadImg(imgs.logo), loadImg(imgs.photo)]).then(function (r) {
      var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      render(cv, d, {style: (cs && cs.style) || 'a', pal: cs && cs.pal, logo: r[1], photo: r[2], showPhoto: !(cs && cs.showPhoto === false)}); return exportCanvas(cv);
    });
  }

  /* ---------- UI (مرحله‌ی کارت) ---------- */
  var CSS = '.cardui .cprev{display:block;width:100%;max-width:340px;margin:0 auto;aspect-ratio:4/5;border-radius:14px;border:1px solid var(--line);background:var(--surface-2)}' +
    '.cardui .cprev.off{opacity:.25}.cardui .cwrap{position:relative;max-width:340px;margin:0 auto}.cardui .coff{position:absolute;inset:0;display:none;place-items:center;text-align:center;font-weight:650;color:var(--text-2);padding:24px}.cardui .cwrap.off .coff{display:grid}' +
    '.cardui .cstyles{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.cardui .cs{border:2px solid var(--line);background:var(--surface);border-radius:12px;padding:4px;cursor:pointer;display:grid;gap:4px;justify-items:center;min-height:44px;font:inherit;color:var(--text-2);font-size:12px}' +
    '.cardui .cs[aria-pressed=true]{border-color:var(--brand);color:var(--text)}.cardui .cs canvas{width:100%;aspect-ratio:4/5;border-radius:8px;display:block}.cardui .cs .none{aspect-ratio:4/5;width:100%;display:grid;place-items:center;border-radius:8px;background:var(--surface-2);font-size:20px}' +
    '.cardui .sw{display:flex;flex-wrap:wrap;gap:8px}.cardui .sw button{width:44px;height:44px;border-radius:50%;border:3px solid var(--surface);box-shadow:0 0 0 1px var(--line-2);cursor:pointer;padding:0;font:inherit}.cardui .sw button[aria-pressed=true]{box-shadow:0 0 0 3px var(--text)}' +
    '.cardui .sw .auto{background:conic-gradient(#B8431B,#A4630A,#1F6B45,#0E7C86,#2A52A0,#7B3F6E,#B0305F,#B8431B);color:#fff;font-size:11px;font-weight:700}' +
    '.cardui .mrow{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.cardui .mpre{width:64px;height:64px;border-radius:14px;border:1px solid var(--line-2);background:var(--surface-2) center/contain no-repeat;flex:none}.cardui .mpre.ph{border-radius:50%;background-size:cover}' +
    '.cardui .mrow input[type=file]{position:absolute;opacity:0;width:1px;height:1px}';
  function mount(el, opt) {
    if (!document.getElementById('cardcss')) { var s = document.createElement('style'); s.id = 'cardcss'; s.textContent = CSS; document.head.appendChild(s); }
    var cv0 = opt.cs, cs = cv0, cvKind = opt.kind, isCV = cvKind === 'jobseeker', imgs = opt.getImgs() || {}, busy = 0, d = null, tim = 0, loaded = {logo: null, photo: null};
    function esc(x) { return TY.esc(x); }
    var html = '<div class="cardui">' +
      '<p class="muted small" style="margin:0 0 12px">' + (isCV ? 'یک فلایر با مشخصات رزومه‌ات ساخته می‌شود و همراه پست کانال منتشر می‌شود. هر چه در مراحل قبل نوشتی همین‌جا خودکار روی کارت می‌آید.' : 'یک فلایر با مشخصات آگهی ساخته می‌شود و همراه پست کانال منتشر می‌شود. طرح و رنگ دپارتمان خودکار انتخاب می‌شود؛ اگر خواستی عوضش کن یا لوگوی خودت را اضافه کن.') + '</p>' +
      '<div class="cwrap" id="cwrap"><canvas id="cardCv" class="cprev" width="1080" height="1350" role="img" aria-label="پیش‌نمایش کارت"></canvas><div class="coff">بدون تصویر<br><span class="small muted">فقط متن در کانال منتشر می‌شود</span></div></div>' +
      '<div class="field mt4"><span class="label">طرح کارت</span><div class="cstyles" id="cStyles" role="group" aria-label="طرح کارت"></div></div>' +
      '<div class="field" id="cPalF"><span class="label">رنگ <span class="opt">خودکار بر اساس دپارتمان</span></span><div class="sw" id="cPal" role="group" aria-label="رنگ کارت"></div></div>' +
      (isCV ? '<div class="field" id="cMedia"><span class="label">عکس شخصی <span class="opt">اختیاری</span></span><div class="mrow"><span class="mpre ph" id="cPre" aria-hidden="true"></span>' +
        '<label class="btn outline sm" for="cFile">انتخاب عکس</label><input type="file" id="cFile" accept="image/*" aria-label="انتخاب عکس شخصی"><button type="button" class="btn ghost sm" id="cDel" hidden>حذف عکس</button></div>' +
        '<div id="cShowL" hidden><label class="mt3" style="display:flex;gap:10px;align-items:flex-start;font-size:14px"><input type="checkbox" id="cShow" style="margin-top:4px;width:20px;height:20px;flex:none"><span>عکسم روی کارت و در کانال عمومی نمایش داده شود<br><span class="muted small">اگر تیک نزنی، به‌جای عکس حرف اول نامت می‌آید.</span></span></label></div></div>'
        : '<div class="field" id="cMedia"><span class="label">لوگوی فروشگاه / شرکت <span class="opt">اختیاری</span></span><div class="mrow"><span class="mpre" id="cPre" aria-hidden="true"></span>' +
        '<label class="btn outline sm" for="cFile">انتخاب لوگو</label><input type="file" id="cFile" accept="image/*" aria-label="انتخاب لوگو"><button type="button" class="btn ghost sm" id="cDel" hidden>حذف لوگو</button></div></div>') +
      '<div class="errmsg" id="cErr" hidden></div><div class="help" id="cInfo"></div></div>';
    el.innerHTML = html;
    var $ = function (id) { return el.querySelector('#' + id); }, cv = $('cardCv'), thumbsEls = {};
    var palKeys = ['auto'].concat(Object.keys(PAL).filter(function (k) { return k !== '_'; })).concat(['_']);
    $('cPal').innerHTML = palKeys.map(function (k) { return '<button type="button" data-pal="' + k + '" aria-label="' + (k === 'auto' ? 'خودکار' : PALNAME[k]) + '" title="' + (k === 'auto' ? 'خودکار' : PALNAME[k]) + '" class="' + (k === 'auto' ? 'auto' : '') + '"' + (k === 'auto' ? '' : ' style="background:' + PAL[k] + '"') + '>' + (k === 'auto' ? 'خودکار' : '') + '</button>'; }).join('');
    $('cStyles').innerHTML = STYLES.map(function (s) { return '<button type="button" class="cs" data-style="' + s[0] + '" aria-label="طرح ' + s[1] + '"><canvas width="160" height="200"></canvas><span>' + s[1] + '</span></button>'; }).join('') +
      '<button type="button" class="cs" data-style="none" aria-label="بدون تصویر"><span class="none">✕</span><span>بدون تصویر</span></button>';
    function info(msg, bad) { var e = $('cErr'); e.hidden = !msg; e.textContent = msg || ''; }
    function draw() {
      d = opt.getData(); var o = {style: cs.style || 'a', pal: cs.pal, logo: loaded.logo, photo: loaded.photo, showPhoto: cs.showPhoto !== false};
      render(cv, d, o);
      el.querySelectorAll('.cs[data-style]').forEach(function (b) {
        var k = b.getAttribute('data-style'); b.setAttribute('aria-pressed', cs.none ? k === 'none' : k === (cs.style || 'a'));
        var c2 = b.querySelector('canvas'); if (c2) render(c2, d, Object.assign({}, o, {style: k}));
      });
      el.querySelectorAll('[data-pal]').forEach(function (b) { b.setAttribute('aria-pressed', (cs.pal || 'auto') === b.getAttribute('data-pal')); });
      $('cwrap').classList.toggle('off', !!cs.none); cv.classList.toggle('off', !!cs.none);
      var pre = $('cPre'), src = isCV ? imgs.photo : imgs.logo; pre.style.backgroundImage = src ? 'url(' + src + ')' : ''; $('cDel').hidden = !src;
      if (isCV) { $('cShowL').hidden = !src; $('cShow').checked = cs.showPhoto !== false; }
      $('cInfo').textContent = cs.none ? '' : 'خروجی: تصویر ۱۰۸۰×۱۳۵۰ (فشرده برای ارسال سریع).';
    }
    function redraw(now) { clearTimeout(tim); if (now) draw(); else tim = setTimeout(draw, 40); }
    function setImg(kind, src) { imgs[kind] = src || ''; opt.setImgs(imgs); return loadImg(src).then(function (im) { loaded[kind] = im; }); }
    Promise.all([ready(), loadImg(imgs.logo), loadImg(imgs.photo)]).then(function (r) { loaded.logo = r[1]; loaded.photo = r[2]; draw(); });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-style]'); if (b) { var k = b.getAttribute('data-style'); if (k === 'none') cs.none = true; else { cs.none = false; cs.style = k; } opt.save(); draw(); return; }
      b = e.target.closest('[data-pal]'); if (b) { cs.pal = b.getAttribute('data-pal'); if (cs.none) cs.none = false; opt.save(); draw(); return; }
      if (e.target.closest('#cDel')) { setImg(isCV ? 'photo' : 'logo', '').then(function () { info(''); draw(); }); }
    });
    el.addEventListener('change', function (e) {
      if (e.target.id === 'cShow') { cs.showPhoto = e.target.checked; opt.save(); draw(); return; }
      if (e.target.id !== 'cFile') return; var f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return; info('');
      prepImage(f, isCV ? 'photo' : 'logo').then(function (src) { cs.none = false; if (isCV) cs.showPhoto = true; return setImg(isCV ? 'photo' : 'logo', src); }).then(function () { opt.save(); draw(); }, function (er) { info(er && er.message || ERR.bad); });
    });
    return {redraw: redraw};
  }

  window.TYCard = {W: W, H: H, PAL: PAL, STYLES: STYLES, render: render, fromForm: fromForm, fromText: fromText, exportCard: exportCard, exportCanvas: exportCanvas, prepImage: prepImage, loadImg: loadImg, ready: ready, mount: mount, colorOf: colorOf};
})();
