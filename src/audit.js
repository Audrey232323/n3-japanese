// 手機排版稽核：每個分頁＋子模式（第一列 Chips）在 360/390 截圖並檢查溢出/重疊/遮擋
const puppeteer = require('puppeteer-core');
const URL = process.env.URL || 'http://127.0.0.1:18931/';
const OUT = process.env.OUT || '/workspace/n3-pwa/shots/after';
const WS = (process.env.WS || '360,390').split(',').map(Number);
const SHOT = !process.env.NOSHOT;
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  let total = 0;
  for (const W of WS) {
    const p = await b.newPage();
    await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
    await p.setViewport({ width: W, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.evaluateOnNewDocument(() => { if (window.speechSynthesis) speechSynthesis.speak = () => {}; localStorage.setItem('__audit', '1'); });
    await p.goto(URL, { waitUntil: 'networkidle0' });
    const sl = ms => new Promise(r => setTimeout(r, ms));
    await p.evaluate(() => [...document.querySelectorAll('button')].find(b => /略過導覽|先逛逛|關閉/.test(b.textContent.trim()))?.click()); await sl(200);
    const tabs = await p.evaluate(() => [...document.querySelectorAll('[role=tab]')].map(b => b.getAttribute('aria-label')));
    const check = (label) => p.evaluate((label) => {
      const iw = innerWidth, out = [];
      if (document.documentElement.scrollWidth > iw + 1) out.push('PAGE-HSCROLL ' + document.documentElement.scrollWidth);
      const vis = e => { const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none' && e.getClientRects().length; };
      const inScroller = e => { let a = e.parentElement; while (a && a !== document.body) { const cs = getComputedStyle(a); if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') return a; a = a.parentElement; } return null; };
      // 1) 文字溢出自己的框（按鈕／chip）
      for (const e of document.querySelectorAll('button, [role=tab], a')) {
        if (!vis(e)) continue;
        const r = e.getBoundingClientRect(); if (!r.width) continue;
        if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow === 'visible') out.push('TEXT-OVERFLOW ' + Math.round(r.width) + '<' + e.scrollWidth + ' ' + e.textContent.trim().slice(0, 24));
        const sc = inScroller(e);
        if (!sc && (r.right > iw + 1 || r.left < -1)) out.push('OFFSCREEN ' + Math.round(r.left) + '..' + Math.round(r.right) + ' ' + e.textContent.trim().slice(0, 24));
        if (r.height < 36 && e.tagName === 'BUTTON' && !e.closest('ruby')) out.push('SMALL ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' ' + e.textContent.trim().slice(0, 16));
      }
      // 2) 兄弟按鈕重疊
      const btns = [...document.querySelectorAll('button')].filter(vis);
      const byParent = new Map(); for (const e of btns) { const k = e.parentElement; if (!byParent.has(k)) byParent.set(k, []); byParent.get(k).push(e); }
      for (const [, arr] of byParent) for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i].getBoundingClientRect(), c = arr[j].getBoundingClientRect();
        const ox = Math.min(a.right, c.right) - Math.max(a.left, c.left), oy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
        if (ox > 2 && oy > 2 && getComputedStyle(arr[i]).position !== 'absolute' && getComputedStyle(arr[j]).position !== 'absolute') out.push('OVERLAP ' + arr[i].textContent.trim().slice(0, 12) + ' × ' + arr[j].textContent.trim().slice(0, 12));
      }
      // 3) 其他元素超出畫面（非捲動容器內）
      for (const e of document.querySelectorAll('#root *')) {
        if (e.closest('button') || !vis(e)) continue;
        const r = e.getBoundingClientRect(); if (!r.width || r.width < 4) continue;
        if ((r.right > iw + 1 || r.left < -1) && !inScroller(e)) { let clip = false, a = e.parentElement; while (a) { const cs = getComputedStyle(a); if (cs.overflowX === 'hidden' || cs.overflow === 'hidden') { const ar = a.getBoundingClientRect(); if (ar.right <= iw + 1 && ar.left >= -1) { clip = true; break; } } a = a.parentElement; } if (!clip) out.push('WIDE ' + e.tagName + ' ' + Math.round(r.right) + ' ' + (e.textContent || '').trim().slice(0, 20)); }
      }
      // 4) 底部導覽遮擋：捲到最底，最後一個內容元素須在 nav 上方
      const nav = [...document.querySelectorAll('nav, [role=tablist]')].find(n => { const cs = getComputedStyle(n); return cs.position === 'fixed' && n.getBoundingClientRect().bottom >= innerHeight - 2; });
      if (!nav) out.push('NO-NAV-FOUND'); if (nav) {
        scrollTo(0, document.documentElement.scrollHeight);
        const nt = nav.getBoundingClientRect().top;
        const items = [...document.querySelectorAll('#root button, #root p, #root div')].filter(e => !nav.contains(e) && vis(e) && e.children.length === 0 && e.textContent.trim());
        const last = items.map(e => e.getBoundingClientRect()).reduce((m, r) => Math.max(m, r.bottom), 0);
        if (last > nt + 1) out.push('BEHIND-NAV last=' + Math.round(last) + ' navTop=' + Math.round(nt));
        scrollTo(0, 0);
      }
      return [...new Set(out)].slice(0, 12).map(x => label + ': ' + x);
    }, label);
    const firstChips = () => p.evaluate(() => {
      const main = document.querySelector('main') || document.getElementById('root');
      // 主要子模式列：第一個含 ≥3 個 aria-pressed 按鈕的容器
      const groups = [...main.querySelectorAll('div')].filter(d => [...d.children].filter(c => c.tagName === 'BUTTON' && c.hasAttribute('aria-pressed')).length >= 3);
      const g = groups[0]; if (!g) return [];
      return [...g.children].filter(c => c.tagName === 'BUTTON').map(c => c.textContent.trim());
    });
    const clickIn = (lbl) => p.evaluate((lbl) => {
      const main = document.querySelector('main') || document.getElementById('root');
      const g = [...main.querySelectorAll('div')].filter(d => [...d.children].filter(c => c.tagName === 'BUTTON' && c.hasAttribute('aria-pressed')).length >= 3)[0];
      const b = [...g.children].find(c => c.tagName === 'BUTTON' && c.textContent.trim() === lbl); b && b.click(); return !!b;
    }, lbl);
    const issues = [];
    let k = 0;
    const snap = async (name) => { if (SHOT) await p.screenshot({ path: `${OUT}/${W}_${String(k++).padStart(2, '0')}_${name.replace(/[\/\s：:（）()]/g, '_').slice(0, 40)}.png`, fullPage: false }); };
    for (const tb of tabs) {
      await p.evaluate((l) => [...document.querySelectorAll('[role=tab]')].find(b => b.getAttribute('aria-label') === l).click(), tb); await sl(400);
      await p.evaluate(() => scrollTo(0, 0));
      issues.push(...await check(tb)); await snap(tb);
      const modes = await firstChips();
      for (const m of modes.slice(1)) {
        if (!(await clickIn(m))) continue; await sl(350);
        issues.push(...await check(tb + '›' + m)); await snap(tb + '_' + m);
      }
      if (modes.length) await clickIn(modes[0]);
    }
    console.log(`== W=${W} tabs=${tabs.length} errs=${errs.length}`);
    for (const x of issues) console.log(x);
    total += issues.length + errs.length;
    if (errs.length) console.log('JSERR', errs.slice(0, 3));
    await p.close();
  }
  console.log('TOTAL', total);
  await b.close();
})();
