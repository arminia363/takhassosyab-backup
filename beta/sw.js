/* تخصص‌یاب service worker: offline shell + notification clicks. API calls (script.google.com) are never cached. */
var V = 'ty2-2610092351';
var CORE = ['assets/app.css', 'assets/core.js', 'assets/data.js', 'assets/vazirmatn.woff2', 'icon.svg', 'icon-192.png', 'enter.html', 'jobs.html'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); })); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || /\.apk$/.test(u.pathname)) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(function (res) { var cp = res.clone(); caches.open(V).then(function (c) { c.put(r, cp); }); return res; })
      .catch(function () { return caches.match(r, {ignoreSearch: true}).then(function (m) { return m || caches.match('enter.html'); }); }));
    return;
  }
  if (/\/assets\/|\.(png|svg|jpg|woff2)$/.test(u.pathname)) {
    e.respondWith(caches.match(r).then(function (m) {
      return m || fetch(r).then(function (res) { if (res.ok) { var cp = res.clone(); caches.open(V).then(function (c) { c.put(r, cp); }); } return res; });
    }));
  }
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || 'enter.html';
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(function (cs) {
    for (var i = 0; i < cs.length; i++) { if ('focus' in cs[i]) { cs[i].navigate(url); return cs[i].focus(); } }
    return self.clients.openWindow(url);
  }));
});
