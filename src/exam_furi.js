// 為模考題目文字加上假名（kuromoji），輸出 exams/furi_raw.json：{ key: 註音後文字 }
const kuromoji = require('kuromoji');
const fs = require('fs');
const items = JSON.parse(fs.readFileSync('exams/furi_in.json', 'utf8')); // [[key, text, mode]]
const KRs = '[\\u3400-\\u9fff々〆ヶ]+';
const isK = c => /[\u3400-\u9fff々〆ヶ]/.test(c);
const hira = s => s.replace(/[\u30a1-\u30f6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
const OVR = { '日本': 'にほん', '日本人': 'にほんじん', '二人': 'ふたり', '一人': 'ひとり', '大勢': 'おおぜい', '他': 'ほか', '洗濯物': 'せんたくもの', '一人一人': 'ひとりひとり', '一日': 'いちにち', '今日': 'きょう', '明日': 'あした', '昨日': 'きのう', '今朝': 'けさ', '今年': 'ことし', '大人': 'おとな', '上手': 'じょうず', '下手': 'へた', '時計': 'とけい', '眼鏡': 'めがね', '部屋': 'へや', '果物': 'くだもの', '一つ': 'ひとつ' };
kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((e, tk) => {
  if (e) throw e;
  const out = {};
  for (const [key, s, mode] of items) {
    if (!s || !new RegExp(KRs).test(s)) { out[key] = s; continue; }
    const chunkR = {};
    let pos = 0;
    for (const t of tk.tokenize(s)) {
      const sf = t.surface_form; const rd = t.reading ? hira(t.reading) : null;
      if ([...sf].some(isK)) {
        const parts = sf.match(/[\u3400-\u9fff々〆ヶ]+|[^\u3400-\u9fff々〆ヶ]+/g);
        let re = '^'; parts.forEach(p => { re += isK(p[0]) ? '(.+?)' : hira(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }); re += '$';
        const m = rd ? rd.match(new RegExp(re)) : null;
        let off = 0, g = 1;
        for (const p of parts) { if (isK(p[0])) { chunkR[pos + off] = { len: p.length, r: m ? m[g] : '?' }; g++; } off += p.length; }
      }
      pos += sf.length;
    }
    const KR = new RegExp(KRs, 'g');
    let res = '', last = 0, m2;
    while ((m2 = KR.exec(s))) {
      const st = m2.index, run = m2[0];
      res += s.slice(last, st); last = st + run.length;
      let skip = false;
      if (mode === 'lent') { const b = s.lastIndexOf('【', st), c = s.lastIndexOf('】', st); if (b > c) skip = true; }
      if (mode === 'none0') skip = true;
      if (skip) { res += run; continue; }
      if (OVR[run]) { res += `${run}[${OVR[run]}]`; continue; }
      let i = st;
      while (i < st + run.length) {
        const c = chunkR[i];
        if (!c) { res += s[i] + '[?]'; i++; continue; }
        let r = c.r; const b = s.substr(i, c.len);
        if (b === '分' && /[0-9０-９]/.test(s[i - 1] || '')) r = 'ふん';
        res += `${b}[${r}]`; i += c.len;
      }
    }
    res += s.slice(last);
    out[key] = res;
  }
  fs.writeFileSync('exams/furi_raw.json', JSON.stringify(out, null, 0));
  console.log('annotated', Object.keys(out).length, 'unknown', Object.values(out).filter(x => x.includes('[?]')).length);
});
