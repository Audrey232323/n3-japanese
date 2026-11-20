import re,sys
s=open('/workspace/n3-app/build/app.tsx',encoding='utf-8').read()
def rep(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: sys.exit(f'COUNT {n} for: {a[:80]}')
    s=s.replace(a,b)
rep('type Sec = "kana" | "vocab" | "grammar" | "mock" | "listen" | "song";','type Sec = "kana" | "kanji" | "vocab" | "grammar" | "mock" | "listen" | "song";')
rep('{ kana: "50音", vocab:','{ kana: "50音", kanji: "漢字", vocab:')
rep('const SEC_LIST: Sec[] = ["kana", "vocab",','const SEC_LIST: Sec[] = ["kana", "kanji", "vocab",')
rep('  onb: number;\n};','  onb: number;\n  kj: Record<string, { c: number; w: number }>;\n  vsrs: Record<string, { due: number; iv: number; ef: number; n: number }>;\n  vsrsNew: { d: number; n: number };\n  vsrsPer: number;\n};')
rep('hist: {}, onb: 0 };','hist: {}, onb: 0, kj: {}, vsrs: {}, vsrsNew: { d: 0, n: 0 }, vsrsPer: 10 };')
# vocab
NV=[l.split('|') for l in open('/workspace/n3-pwa/data/newv_all.txt',encoding='utf-8').read().strip().split('\n')]
i=s.index('const VOCAB_RAW = `'); j=s.index('`',i+20)
s=s[:j]+'\n'+'\n'.join('|'.join(f[1:]) for f in NV)+s[j:]
i=s.index('const TOPIC_RAW = `'); j=s.index('`',i+20)
lines=s[i+19:j].split('\n'); add={}
for f in NV: add.setdefault(f[0],[]).append(f[1])
out=[]
for l in lines:
    k=l.split('|')[0]
    if k in add: l=l+' '+' '.join(add.pop(k))
    out.append(l)
assert not add, add
s=s[:i+19]+'\n'.join(out)+s[j:]
# kanji + srs code
KR=open('/workspace/n3-pwa/data/kanji_raw.txt',encoding='utf-8').read().strip()
part=open('parts/kanji.tsx',encoding='utf-8').read()
rep('const TABS: [string, string][] = [\n  ["kana", "50音"],\n  ["vocab", "單字"],\n  ["grammar", "文法"],\n  ["mock", "模擬考"],\n  ["listen", "聽力"],\n  ["song", "歌曲"],\n  ["review", "錯題・成績"],\n];',
 'const KANJI_RAW = `'+KR+'`;\n'+part+'\nconst TABS: [string, string, string, string][] = [\n  ["kana", "50音", "假名", "あ"],\n  ["kanji", "漢字", "漢字", "字"],\n  ["vocab", "單字", "單字", "📖"],\n  ["grammar", "文法", "文法", "📐"],\n  ["mock", "模擬考", "模考", "📝"],\n  ["listen", "聽力", "聽力", "🎧"],\n  ["song", "歌曲", "歌曲", "🎵"],\n  ["review", "錯題・成績", "成績", "📊"],\n];')
rep('  ["kana", 20, "假名"],\n  ["vocab", 10, "單字"],','  ["kana", 20, "假名"],\n  ["kanji", 5, "漢字"],\n  ["vocab", 10, "單字"],')
# bottom nav
i=s.index('        <div role="tablist" aria-label="練習區"'); j=s.index('        {!STORAGE_OK ?',i)
nav='''        <nav aria-label="主選單" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50, background: t.bg.elevated, borderTop: `1px solid ${t.border.default}`, paddingBottom: "env(safe-area-inset-bottom)", paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}>
          <div role="tablist" aria-label="練習區" style={{ display: "flex", maxWidth: 940, margin: "0 auto" }}>
            {TABS.map(([id, label, short, icon]: [string, string, string, string]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                aria-label={label}
                onClick={() => goTab(id)}
                style={{
                  font: "inherit",
                  flex: 1,
                  minWidth: 0,
                  minHeight: 58,
                  cursor: "pointer",
                  padding: "6px 0 4px",
                  border: "none",
                  borderTop: `3px solid ${tab === id ? t.fill.accent : "transparent"}`,
                  background: "transparent",
                  color: tab === id ? t.text.primary : t.text.secondary,
                  fontWeight: tab === id ? 700 : 400,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                }}
              >
                <span aria-hidden="true" lang="ja" style={{ fontSize: 20, lineHeight: 1, fontFamily: JA_FONT }}>{icon}</span>
                <span style={{ fontSize: 11, whiteSpace: "nowrap" }}>{short}</span>
              </button>
            ))}
          </div>
        </nav>
'''
s=s[:i]+nav+s[j:]
rep('''  const go = (tb: string, km?: KMode): void => {
    if (km) KANA_START = km;
    setTab(tb);
    setKk((n: number) => n + 1);
  };''','''  const go = (tb: string, km?: KMode): void => {
    if (km) KANA_START = km;
    setTab(tb);
    setKk((n: number) => n + 1);
    window.scrollTo(0, 0);
  };
  const goTab = (tb: string): void => {
    setTab(tb);
    window.scrollTo(0, 0);
  };''')
rep('minHeight: "100vh", padding: "16px 12px 48px", boxSizing: "border-box" }}>','minHeight: "100vh", padding: "max(14px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) calc(84px + env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))", boxSizing: "border-box", overflowX: "hidden" }}>')
rep('        {tab === "kana" ? <KanaTab key={kk} /> : null}','        {tab === "kana" ? <KanaTab key={kk} /> : null}\n        {tab === "kanji" ? <KanjiTab /> : null}')
rep('<div style={{ fontSize: 24, fontWeight: 600 }}>日文 N3 互動練習</div>','<div style={{ fontSize: 22, fontWeight: 700 }}>日文 N3 練習</div>')
# vocab tab
rep('const [sub, setSub] = useState<"card" | "quiz" | "list">("card");','const [sub, setSub] = useState<"srs" | "card" | "quiz" | "list">("srs");\n  const [lim, setLim] = useState(120);')
rep('options={[["card", "單字卡"], ["quiz", "選擇測驗"], ["list", `單字表（${VOCAB.length}）`]]} />','options={[["srs", "🗂 SRS 記憶卡"], ["card", "翻卡瀏覽"], ["quiz", "選擇測驗"], ["list", `單字表（${VOCAB.length}）`]]} />')
rep('      {sub === "card" && items.length ? <Flashcards','      {sub === "srs" && items.length ? <VocabSRS key={`${pos}|${topic}`} items={items} /> : null}\n      {sub === "card" && items.length ? <Flashcards')
rep('            {shown.map((v: Vocab) => (\n              <div key={v.id} style={{ borderBottom:','            {shown.slice(0, lim).map((v: Vocab) => (\n              <div key={v.id} style={{ borderBottom:')
rep('''                <div style={{ fontSize: 13, color: t.text.secondary }}>{v.tr}</div>
              </div>
            ))}
          </div>''','''                <div style={{ fontSize: 13, color: t.text.secondary }}>{v.tr}</div>
              </div>
            ))}
            {shown.length > lim ? <Btn label={`顯示更多（還有 ${shown.length - lim} 個）`} onClick={() => setLim(lim + 200)} /> : null}
          </div>''')
open('app.tsx','w',encoding='utf-8').write(s)
print('ok',len(s))
s=open('app.tsx',encoding='utf-8').read()
FA=open('furi_add_pwa.txt',encoding='utf-8').read().strip()
i=s.index('const FURI_RAW = `'); j=s.index('`',i+19)
s=s[:j]+'\n'+FA+s[j:]
open('app.tsx','w',encoding='utf-8').write(s)
print('furi appended', FA.count('\n')+1)

# ===== Round 7：點擊/語音修正 + 新歌曲庫 =====
def rep2(a,b,cnt=1):
    global s
    n=s.count(a)
    if n!=cnt: sys.exit(f'COUNT2 {n} for: {a[:80]}')
    s=s.replace(a,b)
s=open('app.tsx',encoding='utf-8').read()
rep2('    padding: small ? "4px 10px" : "7px 14px",','    padding: small ? "6px 12px" : "9px 16px",\n    minHeight: small ? 40 : 44,\n    display: "inline-flex",\n    alignItems: "center",\n    justifyContent: "center",\n    gap: 4,')
rep2('style={{ ...btnStyle(t, "plain", false, true), padding: "3px 9px" }}','style={{ ...btnStyle(t, "plain", false, true), padding: "4px 10px", minHeight: 40, minWidth: 44 }}')
rep2('borderRadius: 999, padding: "0 10px", color: t.text.primary }}','borderRadius: 999, padding: "6px 12px", minHeight: 36, color: t.text.primary }}',3)
rep2(open('r7_speak_old.txt',encoding='utf-8').read(),open('r7_speak_new.txt',encoding='utf-8').read())
rep2('let RATE = 0.9;\n','let RATE = 0.9;\n'+open('r7_unlock.txt',encoding='utf-8').read())
rep2('  vsrsPer: number;\n};','  vsrsPer: number;\n  lyr: Record<string, string>;\n  fav: Record<string, number>;\n};')
rep2('vsrsNew: { d: 0, n: 0 }, vsrsPer: 10 };','vsrsNew: { d: 0, n: 0 }, vsrsPer: 10, lyr: {}, fav: {} };')
rep2('function SongTab() {\n  const t = useGrokTheme();','function SongTabOld() {\n  const t = useGrokTheme();')
SR=open('/workspace/n3-pwa/songs/songs2_raw.txt',encoding='utf-8').read().strip()
assert '`' not in SR and '${' not in SR and '\\' not in SR
s=s+'\nconst SONGS2_RAW = `'+SR+'`;\n'+open('parts/songs.tsx',encoding='utf-8').read()
open('app.tsx','w',encoding='utf-8').write(s)
print('round7 ok')
# 測驗出現時，若是使用者剛點按鈕開啟、且題目在畫面下半部，就自動捲到題目
s=open('app.tsx',encoding='utf-8').read()
rep2('''  const [done, setDone] = useState(false);

  useEffect(() => {
    if (q.autoPlay''','''  const [done, setDone] = useState(false);
  const topRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = topRef.current;
    if (!el || Date.now() - LAST_TAP > 900) return;
    const r = el.getBoundingClientRect();
    if (r.top > window.innerHeight * 0.5) el.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (q.autoPlay''')
rep2('''  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: t.text.accent, fontWeight: 600 }}>{q.tag ?? SEC_NAME[q.sec]}</span>''','''  return (
    <Card>
      <div ref={topRef} aria-hidden="true" style={{ height: 0, scrollMarginTop: 12 }} />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: t.text.accent, fontWeight: 600 }}>{q.tag ?? SEC_NAME[q.sec]}</span>''')
rep2('let RATE = 0.9;\n','let RATE = 0.9;\nlet LAST_TAP = 0;\nif (typeof window !== "undefined") window.addEventListener("pointerdown", () => { LAST_TAP = Date.now(); }, { capture: true, passive: true });\n')
open('app.tsx','w',encoding='utf-8').write(s)
print('round7b ok')
s=open('app.tsx',encoding='utf-8').read()
rep2('''          <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 13, color: t.text.secondary, flexWrap: "wrap" }}>
            <span>總答題 {n}</span>
            <span>正確率 {n ? Math.round((tot.c / n) * 100) : 0}%</span>
            <span>錯題 {db.wrong.length}</span>
            <span>弱點假名 {Object.keys(db.weak).filter((c: string) => weakScore(c) > 0).length}</span>
            <button''','''          <div style={{ display: "flex", gap: 8, marginTop: 8, fontSize: 13, color: t.text.secondary, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            <span>答題 {n}・正確 {n ? Math.round((tot.c / n) * 100) : 0}%・錯題 {db.wrong.length}・弱點 {Object.keys(db.weak).filter((c: string) => weakScore(c) > 0).length}</span>
            <button''')
open('app.tsx','w',encoding='utf-8').write(s)
print('round7c ok')
s=open('app.tsx',encoding='utf-8').read()
rep2('''              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                <Chips value={script} onChange={(v: Script) => { setScript(v); setWeakOnly(false); }} options={[["hira", "平假名"], ["kata", "片假名"], ["mix", "混合"]]} />
                <span aria-hidden="true" style={{ color: t.text.secondary }}>|</span>
                <Chips value={dir} onChange={setDir} options={[["k2r", "看假名選讀音"], ["r2k", "看讀音選假名"]]} />
                <span aria-hidden="true" style={{ color: t.text.secondary }}>|</span>
                <Btn on={weakOnly} label={weakOnly ? "✓ 只練弱點" : "只練弱點"} onClick={() => setWeakOnly(!weakOnly)} />
              </div>''','''              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <Chips small value={script} onChange={(v: Script) => { setScript(v); setWeakOnly(false); }} options={[["hira", "平假名"], ["kata", "片假名"], ["mix", "混合"]]} />
                <Btn small on={weakOnly} label={weakOnly ? "✓ 只練弱點" : "只練弱點"} onClick={() => setWeakOnly(!weakOnly)} />
                <Chips small value={dir} onChange={setDir} options={[["k2r", "看假名選讀音"], ["r2k", "看讀音選假名"]]} />
              </div>''')
open('app.tsx','w',encoding='utf-8').write(s)
print('round7d ok')

# ===== Round 8：筆順/統計/聽力擴充/版面 =====
s=open('app.tsx',encoding='utf-8').read()
s=s+'\n'+open('parts/r8.tsx',encoding='utf-8').read()
rep2('  fav: Record<string, number>;\n};','  fav: Record<string, number>;\n  goal?: number;\n};')
# 聽力擴充
for name,fn in (('LISTEN_RAW','listen_add1.txt'),('LISTEN2_RAW','listen_add2.txt')):
    add=open(fn,encoding='utf-8').read().strip()
    i=s.index('const '+name+' = `'); j=s.index('`;',i+len(name)+10)
    s=s[:j]+'\n'+add+s[j:]
import os
if os.path.exists('furi_add_r8.txt'):
    FA=open('furi_add_r8.txt',encoding='utf-8').read().strip()
    i=s.index('const FURI_RAW = `'); j=s.index('`',i+19)
    s=s[:j]+'\n'+FA+s[j:]
# 對話分角色：男低女高
rep2('      tts: turns.map((x: string) => x.replace(/^[^：]{1,12}：/, "")).join(" "),','      tts: turns.join("＃"),')
rep2('''function speak(text: string, rate?: number): void {
  try {
    const ss = window.speechSynthesis;
    if (!ss) return;
    const u = new SpeechSynthesisUtterance(kanaOf(text));
    u.lang = "ja-JP";
    u.rate = rate ?? RATE;
    const v = jaVoice();
    if (v) u.voice = v;
    if (ss.paused) ss.resume();
    // iOS Safari：cancel 後立刻 speak 常被吃掉，所以只在正在播放時才 cancel，並稍等一下再播
    if (ss.speaking || ss.pending) {
      ss.cancel();
      window.setTimeout(() => ss.speak(u), 60);
    } else ss.speak(u);''','''function speakerPitch(who: string): number {
  return /男|先生|店員|部長|父|兄|弟|夫/.test(who) && !/女/.test(who) ? 0.72 : /女|母|姉|妹|妻/.test(who) ? 1.32 : 1;
}
function speak(text: string, rate?: number): void {
  try {
    const ss = window.speechSynthesis;
    if (!ss) return;
    const v = jaVoice();
    const us = text.split("＃").map((part: string) => {
      const m = /^([^：]{1,12})：/.exec(part);
      const u = new SpeechSynthesisUtterance(kanaOf(m ? part.slice(m[0].length) : part));
      u.lang = "ja-JP";
      u.rate = rate ?? RATE;
      if (m) u.pitch = speakerPitch(m[1] ?? "");
      if (v) u.voice = v;
      return u;
    });
    const go = () => us.forEach((u: SpeechSynthesisUtterance) => ss.speak(u));
    if (ss.paused) ss.resume();
    // iOS Safari：cancel 後立刻 speak 常被吃掉，所以只在正在播放時才 cancel，並稍等一下再播
    if (ss.speaking || ss.pending) {
      ss.cancel();
      window.setTimeout(go, 60);
    } else go();''')
rep2('"🎧 先看問題，再聽對話：\\n"','"🎧 先看問題，再聽對話（男聲低、女聲高）：\\n"')
# 版面：ふりがな移到標題列，說明文字只在還沒答題時顯示
rep2('''        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>日文 N3 練習</div>''','''        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 21, fontWeight: 700 }}>日文 N3 練習</div>
            <button
              type="button"
              onClick={() => {
                DB.furi = !DB.furi;
                commit();
              }}
              style={{ font: "inherit", fontSize: 13, cursor: "pointer", background: "transparent", border: `1px solid ${t.border.default}`, borderRadius: 999, padding: "6px 12px", minHeight: 36, color: t.text.primary, flex: "0 0 auto" }}
            >
              ふりがな：{db.furi ? "顯示" : "隱藏"}
            </button>
          </div>''')
rep2('display: n > 0 && NARROW() ? "none" : undefined }}>50音','display: n > 0 ? "none" : undefined }}>50音')
rep2('''            <span>答題 {n}・正確 {n ? Math.round((tot.c / n) * 100) : 0}%・錯題 {db.wrong.length}・弱點 {Object.keys(db.weak).filter((c: string) => weakScore(c) > 0).length}</span>
            <button
              type="button"
              onClick={() => {
                DB.furi = !DB.furi;
                commit();
              }}
              style={{ font: "inherit", fontSize: 13, cursor: "pointer", background: "transparent", border: `1px solid ${t.border.default}`, borderRadius: 999, padding: "6px 12px", minHeight: 36, color: t.text.primary }}
            >
              ふりがな：{db.furi ? "顯示" : "隱藏"}
            </button>''','''            <span>答題 {n}・正確 {n ? Math.round((tot.c / n) * 100) : 0}%・錯題 {db.wrong.length}・弱點 {Object.keys(db.weak).filter((c: string) => weakScore(c) > 0).length}</span>''')
rep2('''display: "flex", gap: 8, marginTop: 8, fontSize: 13, color: t.text.secondary, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>''','''display: "flex", gap: 8, marginTop: 2, fontSize: 13, color: t.text.secondary, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>''')
# 跨頁跳到漢字
rep2('''  const goTab = (tb: string): void => {
    setTab(tb);
    window.scrollTo(0, 0);
  };''','''  const goTab = (tb: string): void => {
    setTab(tb);
    window.scrollTo(0, 0);
  };
  useEffect(() => {
    const h = (e: Event) => { const d = (e as CustomEvent).detail; if (typeof d === "string") goTab(d); };
    window.addEventListener("n3nav", h);
    return () => window.removeEventListener("n3nav", h);
  }, []);''')
# 錯題・成績頁加學習紀錄
rep2('''  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
        {SEC_LIST.map((s: Sec) => {''','''  return (
    <div style={{ display: "grid", gap: 12 }}>
      <ActivityPanel />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
        {SEC_LIST.map((s: Sec) => {''')
open('app.tsx','w',encoding='utf-8').write(s)
print('round8 ok')

# ===== Round 8b：文法↔比較↔練習、單字表→漢字 =====
s=open('app.tsx',encoding='utf-8').read()
rep2('''function CmpPanel() {
  const t = useGrokTheme();
  const [g, setG] = useState("all");''','''let PENDING_CMP: string | null = null;
let PENDING_GRAM = -1;
const CMP_LINK: Record<string, string[]> = {
  "ようにする／ことにする": ["～ようにする", "～ことにする", "～ようになる", "～ことになる"],
  "ばかり": ["～ばかり（している）", "～たばかり"],
  "わけ": ["～わけではない", "～わけがない", "～わけだ", "～わけにはいかない"],
  "そうだ": ["～そうだ（傳聞）", "～そうだ（樣態）"],
  "ために／ように": ["～ために", "～ように（目的）"],
  "うちに／間": ["～うちに", "～ないうちに", "～間に"],
  "ところだ": ["～ところだ", "～たところ", "～ところに"],
  "ても／のに": ["～ても", "～のに", "たとえ～ても"],
  "尊敬語／謙譲語": ["尊敬語・特別動詞", "謙譲語・特別動詞"],
};
function cmpFor(pat: string): number[] {
  return CMP.map((c: Cmp, i: number): [Cmp, number] => [c, i]).filter((x: [Cmp, number]) => (CMP_LINK[x[0].short] ?? []).includes(pat)).map((x: [Cmp, number]) => x[1]);
}
function CmpPanel() {
  const t = useGrokTheme();
  const [g, setG] = useState(() => { const v = PENDING_CMP ?? "all"; PENDING_CMP = null; return v; });''')
rep2('''  const genFill = useMemo(() => {
    const d = deck(GRAMMAR);
    return () => gramQ(d());
  }, []);''','''  const genFill = useMemo(() => {
    const d = deck(GRAMMAR);
    return () => {
      const pg = GRAMMAR[PENDING_GRAM];
      PENDING_GRAM = -1;
      return gramQ(pg ?? d());
    };
  }, [sub]);''')
rep2('''                <div style={{ fontSize: 13, color: t.text.secondary }}>{g.tr}</div>
              </div>
            ))}
          </div>
        </Card>''','''                <div style={{ fontSize: 13, color: t.text.secondary }}>{g.tr}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  <Btn small label="✏️ 練這個文法" onClick={() => { PENDING_GRAM = GRAMMAR.indexOf(g); setSub("fill"); window.scrollTo(0, 0); }} />
                  {cmpFor(g.pat).map((ci: number) => (
                    <Btn key={ci} small label={`⚖️ 比較：${CMP[ci]?.short ?? ""}`} onClick={() => { PENDING_CMP = String(ci); setSub("cmp"); window.scrollTo(0, 0); }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>''')
rep2('''                <div style={{ fontSize: 13, color: t.text.secondary }}>{v.tr}</div>
              </div>
            ))}
            {shown.length > lim ?''','''                <div style={{ fontSize: 13, color: t.text.secondary }}>{v.tr}</div>
                <KanjiLinks w={v.w} />
              </div>
            ))}
            {shown.length > lim ?''')
open('app.tsx','w',encoding='utf-8').write(s)
print('round8b ok')

# ===== Round 8c：今日任務顯示每日目標 =====
s=open('app.tsx',encoding='utf-8').read()
rep2('''          <span title="連續練習天數">🔥 {streakDays()} 天</span>''','''          <span title="連續練習天數">🔥 {streakDays()} 天</span>
          <span title="每日目標（到「成績」頁可調整）" style={{ color: (db.hist[dkey(new Date())] ?? 0) >= (db.goal ?? 30) ? t.text.success : undefined }}>🎯 {db.hist[dkey(new Date())] ?? 0}/{db.goal ?? 30}</span>''')
open('app.tsx','w',encoding='utf-8').write(s)
print('round8c ok')
s=open('app.tsx',encoding='utf-8').read()
rep2('''        <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: t.text.secondary }}>
          <button type="button" onClick={() => props.go("kana", "weak5")}''','''        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: t.text.secondary, whiteSpace: "nowrap", flexWrap: "wrap" }}>
          <button type="button" onClick={() => props.go("kana", "weak5")}''')
rep2('{open ? "▲ 收合任務" : "▼ 查看任務"}','{open ? "▲ 收合" : "▼ 任務"}')
open('app.tsx','w',encoding='utf-8').write(s)
print('round8c2 ok')
s=open('app.tsx',encoding='utf-8').read()
rep2('    minHeight: small ? 40 : 44,\n','    minHeight: small ? 40 : 44,\n    minWidth: small ? 40 : 44,\n')
open('app.tsx','w',encoding='utf-8').write(s)
print('round8d ok')
s=open('app.tsx',encoding='utf-8').read()
rep2('''                    style={{ font: "inherit", fontSize: 12, cursor: "pointer", background: "transparent", border: "none", color: t.text.secondary }}
                  >
                    移除''','''                    aria-label="從錯題本移除"
                    style={{ font: "inherit", fontSize: 12, cursor: "pointer", background: "transparent", border: `1px solid ${t.border.subtle}`, borderRadius: 999, padding: "4px 12px", minHeight: 36, minWidth: 44, color: t.text.secondary }}
                  >
                    ✕ 移除''')
open('app.tsx','w',encoding='utf-8').write(s)
print('round8e ok')

# ===== Round 9：錯題分析 =====
s=open('app.tsx',encoding='utf-8').read()
s=s+'\n'+open('parts/analysis.tsx',encoding='utf-8').read()
rep2('  goal?: number;\n};','  goal?: number;\n  log?: LogE[];\n  wq?: Record<string, Q>;\n  exams?: ExamRes[];\n};')
rep2('  kana?: string[];\n};','  kana?: string[];\n  cat?: string;\n  tags?: string[];\n};')
rep2('function record(q: Q, ok: boolean): void {\n  recordStat(q.sec, ok);','function record(q: Q, ok: boolean, pick?: string): void {\n  logAttempt(q, ok, pick);\n  recordStat(q.sec, ok);')
rep2('    const ok = i === q.answer;\n    record(q, ok);','    const ok = i === q.answer;\n    record(q, ok, q.options[i]);')
rep2('const [sub, setSub] = useState<"list" | "fill" | "order" | "cmp">("list");','const [sub, setSub] = useState<"list" | "fill" | "order" | "cmp">(() => (PENDING_GRAM >= 0 ? "fill" : "list"));')
rep2('''      <ActivityPanel />
''','''      <ActivityPanel />
      <MistakeAnalysis />
''')
open('app.tsx','w',encoding='utf-8').write(s)
print('round9 ok')

# ===== Round 9b：第1回～第10回 模考 =====
s=open('app.tsx',encoding='utf-8').read()
ER=open('exams/EXAMS_RAW.txt',encoding='utf-8').read()
assert '`' not in ER and '${' not in ER
s=s+'\nconst EXAMS_RAW = `'+ER+'`;\n'+open('parts/exams.tsx',encoding='utf-8').read()
rep2('''  const [mode, setMode] = useState("prac");''','''  const [mode, setMode] = useState("sets");''')
rep2('''<Chips value={mode} onChange={setMode} options={[["prac", "分項練習（隨機）"],''','''<Chips value={mode} onChange={setMode} options={[["sets", `📚 第1–${EXAMS.length}回 模考`], ["prac", "分項練習（隨機）"],''')
rep2('''      {mode === "exam" ? <FullExam /> : <QuizRunner key={`${sec}|${full}`} gen={gen} total={full ? MOCK.length : undefined} />}''','''      {mode === "sets" ? <ExamSets /> : mode === "exam" ? <FullExam /> : <QuizRunner key={`${sec}|${full}`} gen={gen} total={full ? MOCK.length : undefined} />}''')
rep2('''    const total = parts.reduce((a: number, x: [string, { n: number; c: number; p: number }]) => a + x[1].p, 0);
    const pass = total >= 95''','''    const total = parts.reduce((a: number, x: [string, { n: number; c: number; p: number }]) => a + x[1].p, 0);
    if (!savedRnd.current) { savedRnd.current = true; window.setTimeout(() => { DB.exams = [...(DB.exams ?? []), { n: 0, t: Date.now(), p: parts.map((x) => x[1].p), tot: total }].slice(-50); commit(); }, 0); }
    const pass = total >= 95''')
rep2('''  const [scale, setScale] = useState("1");
  const idx = useRef(0);''','''  const [scale, setScale] = useState("1");
  const idx = useRef(0);
  const savedRnd = useRef(false);''')
open('app.tsx','w',encoding='utf-8').write(s)
print('round9b ok')
s=open('app.tsx',encoding='utf-8').read()
rep2('''                setRes({});
                begin(0, ex);''','''                setRes({});
                savedRnd.current = false;
                begin(0, ex);''')
open('app.tsx','w',encoding='utf-8').write(s)

# ===== Round 10a：手機排版修正（chip 列被壓成圓圈、文字重疊）=====
s=open('app.tsx',encoding='utf-8').read()
# 根因：按鈕 minWidth:40 覆蓋了 flex 項目的 min-width:auto，nowrap 列裡 flex-shrink:1 把按鈕壓到 40px，文字溢出互相重疊（iOS Safari 尤其明顯）
rep2('''    minHeight: small ? 40 : 44,
    minWidth: small ? 40 : 44,''','''    minHeight: 44,
    minWidth: 44,
    flexShrink: 0,
    maxWidth: "100%",''')
rep2('''    <div style={{ display: "flex", flexWrap: props.scroll ? "nowrap" : "wrap", gap: 6, overflowX: props.scroll ? "auto" : undefined, paddingBottom: props.scroll ? 4 : undefined }}>''','''    <div role="group" className={props.scroll ? "chiprow" : undefined} style={{ display: "flex", flexWrap: props.scroll ? "nowrap" : "wrap", gap: 6, overflowX: props.scroll ? "auto" : undefined, overflowY: props.scroll ? "hidden" : undefined, paddingBottom: props.scroll ? 6 : undefined, scrollSnapType: props.scroll ? "x proximity" : undefined, WebkitOverflowScrolling: "touch", minWidth: 0, maxWidth: "100%" } as CSSProperties}>''')
rep2('''style={{ ...btnStyle(t, "plain", false, true), padding: "4px 10px", minHeight: 40, minWidth: 44 }}''','''style={{ ...btnStyle(t, "plain", false, true), padding: "4px 10px", minHeight: 44, minWidth: 44 }}''')
open('app.tsx','w',encoding='utf-8').write(s)
print('round10a ok')
s=open('app.tsx',encoding='utf-8').read()
rep2('''const lb = { font: "inherit", cursor: "pointer", background: "transparent", border: "none", color: t.text.primary, padding: 0, fontFamily: JA_FONT } as const;''','''const lb = { font: "inherit", cursor: "pointer", background: "transparent", border: "none", color: t.text.primary, padding: "0 4px", minHeight: 44, minWidth: 36, fontFamily: JA_FONT } as const;''')
rep2('''gridTemplateColumns: "84px 1fr 42px", gap: 8, alignItems: "center", background: "transparent", border: "none", color: t.text.primary, padding: "2px 0", textAlign: "left" }}>''','''gridTemplateColumns: "84px 1fr 42px", gap: 8, alignItems: "center", background: "transparent", border: "none", color: t.text.primary, padding: "2px 0", minHeight: 44, textAlign: "left" }}>''')
open('app.tsx','w',encoding='utf-8').write(s)

# ===== Round 10b：12/6 特訓、題型攻略、★ 練習、讀解逐句中譯、深層連結 =====
import subprocess
subprocess.run(['python3','build_r10.py'],check=True)
s=open('app.tsx',encoding='utf-8').read()
RJ=open('r10/R10.json',encoding='utf-8').read()
s=s+'\nconst R10_JSON: unknown = '+RJ+';\n'+open('parts/r10.tsx',encoding='utf-8').read()
# App：深層連結事件、所有分頁可重新掛載、特訓卡片放最上方
rep2('''    const h = (e: Event) => { const d = (e as CustomEvent).detail; if (typeof d === "string") goTab(d); };
    window.addEventListener("n3nav", h);
    return () => window.removeEventListener("n3nav", h);''','''    const h = (e: Event) => { const d = (e as CustomEvent).detail; if (typeof d === "string") goTab(d); };
    window.addEventListener("n3nav", h);
    const h2 = (e: Event) => {
      const d = (e as CustomEvent).detail as { tab: string; sub?: string };
      let km: KMode | undefined;
      if (d.tab === "kana" && d.sub) {
        const [m, sc, rw] = d.sub.split(":");
        km = m as KMode;
        if (sc) DEEP.kana_script = sc;
        if (rw) DEEP.kana_rows = rw;
        delete DEEP.kana;
      }
      go(d.tab, km);
      const sc2 = DEEP_SCROLL;
      if (sc2) window.setTimeout(() => { document.getElementById(sc2)?.scrollIntoView({ block: "start" }); DEEP_SCROLL = ""; }, 400);
    };
    window.addEventListener("n3go", h2);
    return () => { window.removeEventListener("n3nav", h); window.removeEventListener("n3go", h2); };''')
rep2('''        <GlobalSearch />''','''        <Bootcamp home={tab === "kana"} />
        <GlobalSearch />''')
for a in ['KanjiTab','VocabTab','GrammarTab','MockTab','ListenTab','SongTab']:
    rep2(f'<{a} />',f'<{a} key={{kk}} />')
rep2('<ReviewTab go={go} />','<ReviewTab key={kk} go={go} />')
# 假名
rep2('''  const [script, setScript] = useState<Script>("kata");''','''  const [script, setScript] = useState<Script>(() => (takeDeep("kana_script") as Script | null) ?? "kata");''')
rep2('''  const [rows, setRows] = useState<string[]>(["a", "ka", "sa", "ta", "na"]);''','''  const [rows, setRows] = useState<string[]>(() => { const r = takeDeep("kana_rows"); return r ? r.split(",") : ["a", "ka", "sa", "ta", "na"]; });''')
# 單字
rep2('''  const [sub, setSub] = useState<"srs" | "card" | "quiz" | "list">("srs");''','''  const [sub, setSub] = useState<"srs" | "card" | "quiz" | "list">(() => (takeDeep("vocab") as "srs" | "card" | "quiz" | "list" | null) ?? "srs");''')
# 漢字
rep2('''  const [sub, setSub] = useState<"list" | "quiz">("list");
  const [range, setRange] = useState("1-100");''','''  const [dk0] = useState(() => (takeDeep("kanji") ?? "").split(":"));
  const [sub, setSub] = useState<"list" | "quiz">(() => ((dk0[0] as "list" | "quiz") || "list"));
  const [range, setRange] = useState(dk0[1] || "1-100");''')
# 文法（可限定第 a–b 個）
rep2('''  const [sub, setSub] = useState<"list" | "fill" | "order" | "cmp">(() => (PENDING_GRAM >= 0 ? "fill" : "list"));''','''  const [dg] = useState(() => (takeDeep("grammar") ?? "").split(":"));
  const [rng, setRng] = useState<[number, number] | null>(() => { const m = (dg[1] ?? "").match(/^(\\d+)-(\\d+)$/); return m ? [Number(m[1]), Number(m[2])] : null; });
  const [sub, setSub] = useState<"list" | "fill" | "order" | "cmp">(() => (PENDING_GRAM >= 0 ? "fill" : ((dg[0] as "list" | "fill" | "order" | "cmp") || "list")));''')
rep2('''  const genFill = useMemo(() => {
    const d = deck(GRAMMAR);''','''  const genFill = useMemo(() => {
    const d = deck(rng ? GRAMMAR.slice(rng[0] - 1, rng[1]) : GRAMMAR);''')
rep2('''      return gramQ(pg ?? d());
    };
  }, [sub]);''','''      return gramQ(pg ?? d());
    };
  }, [sub, rng]);''')
rep2('''  const shown = GRAMMAR.filter((g: Gram) => !qq || g.pat.includes(qq)''','''  const shown = GRAMMAR.filter((g: Gram) => !rng || (GRAMMAR.indexOf(g) >= rng[0] - 1 && GRAMMAR.indexOf(g) < rng[1])).filter((g: Gram) => !qq || g.pat.includes(qq)''')
rep2('''["cmp", `易混文法比較（${CMP.length} 組）`]]} />''','''["cmp", `易混文法比較（${CMP.length} 組）`]]} />
      {rng && (sub === "list" || sub === "fill") ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 14 }}>
          <span>🔥 特訓範圍：只看第 {rng[0]}–{rng[1]} 個文法</span>
          <Btn small label="顯示全部" onClick={() => setRng(null)} />
        </div>
      ) : null}''')
# 模考：題型攻略
rep2('''  const [sec, setSec] = useState("all");
  const [mode, setMode] = useState("sets");''','''  const [dm] = useState(() => (takeDeep("mock") ?? "").split(":"));
  const [sec, setSec] = useState(dm[1] || "all");
  const [mode, setMode] = useState(dm[0] || "sets");''')
rep2('''options={[["sets", `📚 第1–${EXAMS.length}回 模考`], ["prac", "分項練習（隨機）"],''','''scroll={NARROW()} options={[["sets", `📚 第1–${EXAMS.length}回 模考`], ["guide", "🧭 題型攻略・★ 練習"], ["prac", "分項練習（隨機）"],''')
rep2('''      {mode === "sets" ? <ExamSets /> : mode === "exam"''','''      {mode === "guide" ? <ExamGuide /> : mode === "sets" ? <ExamSets /> : mode === "exam"''')
# 聽力
rep2('''  const [lt, setLt] = useState("all");''','''  const [lt, setLt] = useState(() => takeDeep("listen") ?? "all");''')
# 錯題分析錨點
rep2('''      <ActivityPanel />
      <MistakeAnalysis />''','''      <ActivityPanel />
      <div id="mistake-analysis" style={{ scrollMarginTop: 8 }}><MistakeAnalysis /></div>''')
# 讀解：點句子看中文
rep2('''          <Rich text={q.passage} />
          <div style={{ marginTop: 6 }}>''','''          <TapPassage key={q.id} text={q.passage} />
          <div style={{ marginTop: 6 }}>''')
open('app.tsx','w',encoding='utf-8').write(s)
print('round10b ok')
