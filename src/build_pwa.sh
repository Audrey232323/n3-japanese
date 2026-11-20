set -e
cd /workspace/n3-pwa/build
python3 ../songs/build_songs.py && python3 build_exams.py >/dev/null && python3 patch.py >/dev/null && cp /workspace/n3-app/build/node_modules/kuromoji/build/kuromoji.js ../site/kuromoji.js && mkdir -p ../site/dict && cp /workspace/n3-app/build/node_modules/kuromoji/dict/*.dat.gz ../site/dict/
npx tsc -p .
npx esbuild main.tsx --bundle --minify --format=iife --alias:grok/canvas=./shim.ts --jsx=automatic --define:process.env.NODE_ENV='"production"' --outfile=bundle.js --log-level=warning
VER=$(sha1sum bundle.js | cut -c1-10)
python3 - "$VER" <<'PY'
import sys
ver=sys.argv[1]
b=open('bundle.js',encoding='utf-8').read().replace('</script','<\\/script')
head='''<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>日文N3練習</title>
<meta name="description" content="日文 N3 互動練習：50音、N3 漢字、單字 SRS 記憶卡、文法、原創模擬題、聽力。可離線使用。">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1a1c21" media="(prefers-color-scheme: dark)">
<meta name="color-scheme" content="light dark">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="日文N3">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="format-detection" content="telephone=no">
<link rel="manifest" href="manifest.json">
<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="icons/apple-touch-icon.png">
<style>html,body{margin:0;padding:0;-webkit-text-size-adjust:100%;overflow-x:hidden}body{background:#fff;overscroll-behavior-y:none}@media (prefers-color-scheme: dark){body{background:#141519}}button:focus-visible{outline:2px solid #2f6fe0;outline-offset:2px}rt{user-select:none}button{-webkit-tap-highlight-color:transparent;touch-action:manipulation}input,textarea,select{font-size:16px}*{box-sizing:border-box}.chiprow{scrollbar-width:none;-webkit-mask-image:linear-gradient(90deg,#000 88%,transparent);mask-image:linear-gradient(90deg,#000 88%,transparent);padding-right:28px}.chiprow::-webkit-scrollbar{display:none}.chiprow>button{scroll-snap-align:start}</style>
</head><body><div id="root"></div><script>'''
tail='''</script><script>
if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
  window.addEventListener("load", function () {
    var had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register("./sw.js").then(function (r) { window.__swReg = r; document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") r.update().catch(function () {}); }); }).catch(function (e) { console.warn("SW 註冊失敗", e); });
    navigator.serviceWorker.addEventListener("controllerchange", function () { if (had && !window.__reloaded) { window.__reloaded = 1; location.reload(); } });
  });
}
</script></body></html>'''
html=head+b+tail
open('/workspace/n3-pwa/site/index.html','w',encoding='utf-8').write(html)
open('/workspace/n3-app/index.html','w',encoding='utf-8').write(html)
sw=open('sw.tpl.js',encoding='utf-8').read().replace('__VER__',ver)
open('/workspace/n3-pwa/site/sw.js','w',encoding='utf-8').write(sw)
print('built',ver,len(html))
PY
