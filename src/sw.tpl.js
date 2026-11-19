/* 日文N3練習 service worker：網頁優先抓最新版（3 秒內沒回應就用快取），其餘檔案快取優先，離線可用 */
const CACHE = "n3-__VER__";
const DICT = "n3-dict-v1";
const ASSETS = ["./", "./index.html", "./manifest.json", "./kuromoji.js", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/maskable-192.png", "./icons/maskable-512.png", "./icons/apple-touch-icon.png", "./icons/favicon-32.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== DICT).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)); }
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const url = new URL(req.url);
  if (req.mode === "navigate") {
    const net = fetch(req, { cache: "no-store" }).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put("./index.html", cp)); } return res; });
    e.respondWith(Promise.race([net, timeout(3000)]).catch(() => caches.match("./index.html").then((hit) => hit || net)));
    return;
  }
  // 斷詞字典：另外一個長期快取（約 18 MB，不隨版本更新重抓）
  const bucket = url.pathname.includes("/dict/") ? DICT : CACHE;
  e.respondWith(
    caches.open(bucket).then((c) => c.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; })))
  );
});
