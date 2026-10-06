const CACHE='ty-v5';
self.addEventListener("install", function(e){ self.skipWaiting(); });
self.addEventListener("activate", function(e){ self.clients.claim(); });
