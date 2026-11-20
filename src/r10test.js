const puppeteer = require('puppeteer-core');
const URL = process.env.URL || 'http://127.0.0.1:18931/';
const FAKE = process.env.FAKE || '2026-11-24T09:00:00+08:00';
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: +(process.env.W || 390), height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.evaluateOnNewDocument((f) => {
    if (window.speechSynthesis) speechSynthesis.speak = () => {};
    const T = new Date(f).getTime(), D = Date, off = T - D.now();
    class FD extends D { constructor(...a) { if (a.length) super(...a); else super(D.now() + off); } static now() { return D.now() + off; } }
    window.Date = FD;
  }, FAKE);
  await p.goto(URL, { waitUntil: 'networkidle0' });
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const txt = () => p.evaluate(() => document.body.innerText);
  const clickBtn = (re) => p.evaluate((src) => { const el = [...document.querySelectorAll('button')].find(b => new RegExp(src).test(b.textContent)); if (el) { el.click(); return el.textContent.trim().slice(0, 40); } return null; }, re);
  const sel = () => p.evaluate(() => ({ tab: document.querySelector('[role=tab][aria-selected=true]')?.getAttribute('aria-label'), pressed: [...document.querySelectorAll('button[aria-pressed=true]')].map(b => b.textContent.trim().slice(0, 14)).slice(0, 6) }));
  const out = [];
  let t = await txt();
  out.push('boot ' + /12\/6 N3 特訓/.test(t) + ' ' + (t.match(/第 \d+ 天（[^）]+）[^\n]*/) || [''])[0] + ' | ' + (t.match(/距離考試 \d+ 天/) || [''])[0]);
  await p.screenshot({ path: '/workspace/n3-pwa/shots/after/r10_boot_home.png' });
  // 每個今天任務都點一次，檢查跳到的分頁
  const n = await p.evaluate(() => [...document.querySelectorAll('#bootcamp [role=checkbox]')].length);
  for (let i = 0; i < n; i++) {
    await p.evaluate(() => [...document.querySelectorAll('[role=tab]')].find(b => b.getAttribute('aria-label') === '50音').click()); await sl(250);
    const lab = await p.evaluate((i) => { const rows = [...document.querySelectorAll('#bootcamp [role=checkbox]')]; const bt = rows[i].nextElementSibling; bt.click(); return bt.textContent.trim(); }, i);
    await sl(700);
    const s = await sel(); const y = await p.evaluate(() => Math.round(scrollY));
    out.push(`task ${i} ${lab.slice(0, 26)} → ${s.tab} [${s.pressed.join(',')}] y=${y}`);
    await p.evaluate(() => scrollTo(0, 0));
  }
  await p.evaluate(() => [...document.querySelectorAll('[role=tab]')].find(b => b.getAttribute('aria-label') === '50音').click()); await sl(250);
  t = await txt(); out.push('progress ' + (t.match(/完成 \d+\/\d+/) || [''])[0]);
  // 16 天計畫
  await clickBtn('看 16 天完整計畫'); await sl(200);
  out.push('days ' + await p.evaluate(() => [...document.querySelectorAll('#bootcamp button[aria-pressed]')].length) + ' today-marked ' + await p.evaluate(() => [...document.querySelectorAll('#bootcamp button[aria-pressed]')].filter(b => /今天/.test(b.textContent)).map(b => b.textContent.slice(0, 12)).join(',')));
  await p.screenshot({ path: '/workspace/n3-pwa/shots/after/r10_boot_plan.png', fullPage: false });
  await p.evaluate(() => document.getElementById('bootcamp').scrollIntoView());
  await p.screenshot({ path: '/workspace/n3-pwa/shots/after/r10_boot_plan2.png' });
  // 題型攻略
  await p.evaluate(() => [...document.querySelectorAll('[role=tab]')].find(b => b.getAttribute('aria-label') === '模擬考').click()); await sl(300);
  await clickBtn('題型攻略'); await sl(300);
  t = await txt(); out.push('guide ' + /官網範例/.test(t) + ' types ' + await p.evaluate(() => document.querySelectorAll('details').length));
  await p.evaluate(() => document.querySelector('details').open = true); await sl(100);
  await p.evaluate(() => document.getElementById('g-star').scrollIntoView()); await sl(100);
  await p.screenshot({ path: '/workspace/n3-pwa/shots/after/r10_guide_star.png' });
  await clickBtn('開始 ★ 並べ替え練習'); await sl(300);
  let okc = 0, right = 0;
  for (let i = 0; i < 21; i++) {
    // 找正解：解說裡的「★=X」要等作答後才看得到 → 先按 1，再檢查結果
    await p.keyboard.press('1'); await sl(120);
    const tx = await txt(); if (/★=/.test(tx)) okc++;
    const nx = await clickBtn('^(下一題|看結果)'); await sl(120);
    if (!nx) break;
  }
  out.push('star answered ' + okc);
  await p.evaluate(() => document.getElementById('g-read').scrollIntoView()); await sl(100);
  // 點一句看中文
  const zh1 = await p.evaluate(() => { const s = document.querySelector('#g-read ~ div [role=button]') || [...document.querySelectorAll('[role=button][aria-expanded]')][0]; if (!s) return 'none'; s.click(); return 'clicked'; }); await sl(150);
  t = await txt(); out.push('tap-zh ' + zh1 + ' ' + /南家具股份有限公司/.test(t));
  await clickBtn('^2\\s'); await sl(150);
  t = await txt(); out.push('elim ' + /主客顛倒/.test(t) + ' ' + /輸入／輸出 陷阱/.test(t));
  await p.screenshot({ path: '/workspace/n3-pwa/shots/after/r10_guide_read.png' });
  await clickBtn('書信・通知讀解練習'); await sl(300);
  t = await txt(); out.push('readquiz ' + /書信・通知讀解 \d\/4/.test(t) + ' ' + (t.match(/.{0,30}讀解.{0,40}/g) || []).slice(-3).join(' ~ '));
  // 題庫讀解：分項練習 読解
  await clickBtn('^分項練習'); await sl(200); await clickBtn('^読解（'); await sl(300);
  const z = await p.evaluate(() => { const s = [...document.querySelectorAll('[role=button][aria-expanded]')]; if (!s.length) return 0; s[0].click(); return s.length; }); await sl(150);
  t = await txt(); out.push('bank-tap sentences=' + z + ' zhShown=' + await p.evaluate(() => !!document.querySelector('[aria-expanded=true] + span')));
  await p.screenshot({ path: '/workspace/n3-pwa/shots/after/r10_bank_tapzh.png' });
  console.log(out.join('\n')); console.log('ERRS', errs);
  await b.close();
})();
