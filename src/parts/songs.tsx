/* ============ 歌曲庫 ============ */
type SongV = { w: string; r: string; m: string };
type Song2 = { id: string; t: string; a: string; y: number; g: string; tie: string; lv: string; yt: string; v: SongV[]; note: string; i: number };
const SONGS2: Song2[] = SONGS2_RAW.split("\n").map((l: string, i: number): Song2 => {
  const [id, t, a, y, g, tie, lv, yt, v, note] = l.split("|") as [string, string, string, string, string, string, string, string, string, string];
  return { id, t, a, y: Number(y), g, tie, lv, yt, note, i, v: v.split(";").filter(Boolean).map((e: string): SongV => { const [w, r, m] = e.split(":") as [string, string, string]; return { w, r, m }; }) };
});
const GENRES = ["J-POP", "アニメ", "ロック", "シティポップ", "昭和・平成名曲", "ボカロ"];
const ARTISTS = [...new Set(SONGS2.map((s: Song2) => s.a))].sort((a: string, b: string) => SONGS2.filter((x: Song2) => x.a === b).length - SONGS2.filter((x: Song2) => x.a === a).length || a.localeCompare(b, "ja"));
/* ---- 斷詞（kuromoji，第一次使用時載入，之後由 service worker 快取） ---- */
type Tok = { surface_form: string; pos: string; pos_detail_1: string; basic_form: string; reading?: string };
type Tokenizer = { tokenize: (s: string) => Tok[] };
let TK_PROMISE: Promise<Tokenizer> | null = null;
function loadTokenizer(): Promise<Tokenizer> {
  if (TK_PROMISE) return TK_PROMISE;
  TK_PROMISE = new Promise<Tokenizer>((resolve, reject) => {
    const w = window as unknown as { kuromoji?: { builder: (o: { dicPath: string }) => { build: (cb: (e: unknown, t: Tokenizer) => void) => void } } };
    const go = () => {
      if (!w.kuromoji) { reject(new Error("no kuromoji")); return; }
      w.kuromoji.builder({ dicPath: "dict/" }).build((e: unknown, t: Tokenizer) => (e ? reject(e) : resolve(t)));
    };
    if (w.kuromoji) { go(); return; }
    const s = document.createElement("script");
    s.src = "kuromoji.js";
    s.onload = go;
    s.onerror = () => reject(new Error("load fail"));
    document.head.appendChild(s);
  }).catch((e: unknown) => { TK_PROMISE = null; throw e; });
  return TK_PROMISE;
}
function useTokenizer(on: boolean): { tk: Tokenizer | null; st: "idle" | "load" | "ok" | "err" } {
  const [tk, setTk] = useState<Tokenizer | null>(null);
  const [st, setSt] = useState<"idle" | "load" | "ok" | "err">("idle");
  useEffect(() => {
    if (!on || tk) return;
    let alive = true;
    setSt("load");
    loadTokenizer().then((t: Tokenizer) => { if (alive) { setTk(t); setSt("ok"); } }).catch(() => { if (alive) setSt("err"); });
    return () => { alive = false; };
  }, [on]);
  return { tk, st };
}
const KJ = /[\u3400-\u9fff々〆ヶ]/;
function rubyParts(surface: string, readingKata: string | undefined): [string, string | null][] {
  if (!readingKata || readingKata === "*" || !KJ.test(surface)) return [[surface, null]];
  const r = toHiraS(readingKata);
  const parts = surface.match(/[\u3400-\u9fff々〆ヶ]+|[^\u3400-\u9fff々〆ヶ]+/g) ?? [surface];
  let re = "^";
  parts.forEach((p: string) => { re += KJ.test(p[0] ?? "") ? "(.+?)" : toHiraS(p).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); });
  re += "$";
  const m = r.match(new RegExp(re));
  if (!m) return [[surface, r]];
  let k = 1;
  return parts.map((p: string): [string, string | null] => (KJ.test(p[0] ?? "") ? [p, m[k++] ?? null] : [p, null]));
}
function FuriLine(props: { toks: Tok[] | null; text: string; furi: boolean; hl?: string }) {
  const t = useGrokTheme();
  if (!props.toks) return <span>{props.text}</span>;
  return (
    <span>
      {props.toks.map((tk: Tok, i: number) => {
        const mark = props.hl && tk.surface_form === props.hl;
        const inner = rubyParts(tk.surface_form, tk.reading).map(([s, r]: [string, string | null], j: number) =>
          r && props.furi ? (
            <ruby key={j}>
              {s}
              <rt style={{ fontSize: "0.5em", fontWeight: 400 }}>{r}</rt>
            </ruby>
          ) : (
            <span key={j}>{s}</span>
          )
        );
        return mark ? <mark key={i} style={{ background: t.fill.warningSubtle, color: t.text.primary }}>{inner}</mark> : <span key={i}>{inner}</span>;
      })}
    </span>
  );
}
const READ_FIX: Record<string, string> = { 一人: "ヒトリ", 二人: "フタリ", 一つ: "ヒトツ", 二つ: "フタツ", 三つ: "ミッツ", 四つ: "ヨッツ", 五つ: "イツツ", 一日: "イチニチ", 二日: "フツカ", 三日: "ミッカ", 大人: "オトナ", 一人きり: "ヒトリキリ", 一人ぼっち: "ヒトリボッチ", 何度: "ナンド", 永遠: "エイエン", 未来: "ミライ" };
function fixToks(ts: Tok[]): Tok[] {
  const out: Tok[] = [];
  for (let i = 0; i < ts.length; i++) {
    const a = ts[i]!;
    const n = ts[i + 1];
    if (a.pos_detail_1 === "数" && n && (n.pos_detail_1 === "接尾" || n.surface_form === "つ") && READ_FIX[a.surface_form + n.surface_form]) {
      const sf = a.surface_form + n.surface_form;
      out.push({ ...a, surface_form: sf, basic_form: sf, reading: READ_FIX[sf], pos_detail_1: "一般" });
      i++;
      continue;
    }
    const f = READ_FIX[a.surface_form];
    out.push(f ? { ...a, reading: f } : a);
  }
  return out;
}
function lyricLines(s: string): string[] {
  return s.split(/\r?\n/).map((l: string) => l.trim()).filter((l: string) => l.length > 0);
}
function isContent(tk: Tok): boolean {
  if (!["名詞", "動詞", "形容詞", "副詞"].includes(tk.pos)) return false;
  if (["非自立", "数", "代名詞", "接尾", "固有名詞"].includes(tk.pos_detail_1)) return false;
  if (!/[\u3040-\u30ff\u3400-\u9fff]/.test(tk.surface_form)) return false;
  return KJ.test(tk.surface_form) || tk.surface_form.length >= 2;
}
function lyricsSearchUrl(s: Song2, site: "g" | "u"): string {
  return site === "u" ? `https://www.uta-net.com/search/?Keyword=${encodeURIComponent(s.t)}&Aselect=2&Bselect=3` : `https://www.google.com/search?q=${encodeURIComponent(`${s.t} ${s.a} 歌詞`)}`;
}
function openExt(url: string): void {
  try { window.open(url, "_blank", "noopener"); } catch { /* 無法開啟 */ }
}
function lvColor(t: T, lv: string): string {
  return lv === "初級" ? t.text.success : lv === "中級" ? t.text.warning : t.text.danger;
}
function SongCard(props: { s: Song2; onOpen: () => void }) {
  const t = useGrokTheme();
  const db = useDB();
  const s = props.s;
  const [imgOk, setImgOk] = useState(true);
  const fav = !!db.fav[s.id];
  const hasLyr = !!db.lyr[s.id];
  return (
    <div style={{ position: "relative", borderRadius: 12, border: `1px solid ${t.border.subtle}`, background: t.bg.elevated, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <button type="button" onClick={props.onOpen} aria-label={`${s.t}／${s.a}`} style={{ font: "inherit", textAlign: "left", cursor: "pointer", border: "none", background: "transparent", color: t.text.primary, padding: 0, display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: `linear-gradient(135deg, ${t.fill.accentSubtle}, ${t.bg.subtle})`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          <span lang="ja" style={{ fontFamily: JA_FONT, fontSize: 28, fontWeight: 700, color: t.text.secondary }}>{[...s.t][0]}</span>
          {s.yt && imgOk ? <img src={`https://i.ytimg.com/vi/${s.yt}/mqdefault.jpg`} alt="" loading="lazy" onError={() => setImgOk(false)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : null}
          {hasLyr ? <span style={{ position: "absolute", left: 6, bottom: 6, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: t.fill.successSubtle, color: t.text.primary, border: `1px solid ${t.text.success}` }}>📄 已存歌詞</span> : null}
        </div>
        <div style={{ padding: "8px 10px 10px", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 4 }}>
          <div lang="ja" style={{ fontFamily: JA_FONT, fontWeight: 700, fontSize: 15, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.t}</div>
          <div lang="ja" style={{ fontFamily: JA_FONT, fontSize: 13, color: t.text.secondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.a}・{s.y}</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", fontSize: 11 }}>
            <span style={{ padding: "1px 7px", borderRadius: 999, background: t.bg.subtle, color: t.text.secondary }}>{s.g}</span>
            <span style={{ padding: "1px 7px", borderRadius: 999, border: `1px solid ${lvColor(t, s.lv)}`, color: t.text.primary }}>{s.lv}</span>
          </div>
        </div>
      </button>
      <button type="button" aria-label={fav ? `取消收藏 ${s.t}` : `收藏 ${s.t}`} aria-pressed={fav} onClick={() => { DB.fav = { ...DB.fav }; if (fav) delete DB.fav[s.id]; else DB.fav[s.id] = Date.now(); commit(); }} style={{ position: "absolute", top: 6, right: 6, width: 40, height: 40, borderRadius: 999, border: "none", cursor: "pointer", background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {fav ? "♥" : "♡"}
      </button>
    </div>
  );
}
function SongLibrary() {
  const t = useGrokTheme();
  const db = useDB();
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState("all");
  const [artist, setArtist] = useState("all");
  const [lv, setLv] = useState("all");
  const [only, setOnly] = useState("all");
  const [sort, setSort] = useState("pop");
  const [sel, setSel] = useState<string | null>(null);
  const [lim, setLim] = useState(40);
  const list = SONGS2.filter((s: Song2) => {
    if (genre !== "all" && s.g !== genre) return false;
    if (artist !== "all" && s.a !== artist) return false;
    if (lv !== "all" && s.lv !== lv) return false;
    if (only === "fav" && !db.fav[s.id]) return false;
    if (only === "lyr" && !db.lyr[s.id]) return false;
    if (q) { const k = q.toLowerCase(); if (![s.t, s.a, s.tie, s.note, ...s.v.map((v: SongV) => v.w + v.r + v.m)].some((x: string) => x.toLowerCase().includes(k))) return false; }
    return true;
  }).sort((a: Song2, b: Song2) => (sort === "new" ? b.y - a.y : sort === "old" ? a.y - b.y : a.i - b.i));
  const cur = sel ? SONGS2.find((s: Song2) => s.id === sel) : undefined;
  useEffect(() => { window.scrollTo(0, 0); }, [sel]);
  if (cur) return <SongDetail s={cur} onBack={() => setSel(null)} />;
  const selStyle: CSSProperties = { font: "inherit", fontSize: 15, minHeight: 44, padding: "0 10px", borderRadius: 10, border: `1px solid ${t.border.default}`, background: t.bg.base, color: t.text.primary, flex: 1, minWidth: 0 };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12 }}>
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 10 }}>
          <input type="search" value={q} onChange={(e: ChangeEvent<HTMLInputElement>) => { setQ(e.target.value); setLim(40); }} placeholder="搜尋歌名、歌手、動畫、單字…" aria-label="搜尋歌曲" style={{ width: "100%", boxSizing: "border-box", font: "inherit", fontSize: 16, minHeight: 44, padding: "8px 12px", borderRadius: 10, border: `1px solid ${t.border.default}`, background: t.bg.base, color: t.text.primary }} />
          <Chips small scroll value={genre} onChange={(v: string) => { setGenre(v); setLim(40); }} options={[["all", `全部 ${SONGS2.length}`], ...GENRES.map((g: string): [string, string] => [g, `${g} ${SONGS2.filter((s: Song2) => s.g === g).length}`])]} />
          <div style={{ display: "flex", gap: 8 }}>
            <select aria-label="依歌手篩選" value={artist} onChange={(e: ChangeEvent<HTMLSelectElement>) => { setArtist(e.target.value); setLim(40); }} style={selStyle}>
              <option value="all">全部歌手（{ARTISTS.length}）</option>
              {ARTISTS.map((a: string) => <option key={a} value={a}>{a}（{SONGS2.filter((s: Song2) => s.a === a).length}）</option>)}
            </select>
            <select aria-label="排序" value={sort} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSort(e.target.value)} style={{ ...selStyle, flex: "0 0 auto" }}>
              <option value="pop">推薦順序</option>
              <option value="new">最新</option>
              <option value="old">最早</option>
            </select>
          </div>
          <Chips small scroll value={lv} onChange={(v: string) => setLv(v)} options={[["all", "全部難度"], ["初級", "🟢 初級（慢歌）"], ["中級", "🟡 中級"], ["上級", "🔴 上級（快歌）"]]} />
          <Chips small scroll value={only} onChange={(v: string) => setOnly(v)} options={[["all", "全部"], ["fav", `♥ 收藏 ${Object.keys(db.fav).length}`], ["lyr", `📄 已存歌詞 ${Object.keys(db.lyr).length}`]]} />
        </div>
      </Card>
      <div style={{ fontSize: 13, color: t.text.secondary }}>共 {list.length} 首{list.length === 0 ? "，換個條件試試。" : ""}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(158px, 1fr))", gap: 10 }}>
        {list.slice(0, lim).map((s: Song2) => <SongCard key={s.id} s={s} onOpen={() => setSel(s.id)} />)}
      </div>
      {list.length > lim ? <Btn label={`顯示更多（還有 ${list.length - lim} 首）`} onClick={() => setLim(lim + 60)} /> : null}
      <Note>歌曲資訊（歌名、歌手、年份）已用 iTunes 資料核對；影片為 YouTube 官方或唱片公司頻道。歌詞受著作權保護，不收錄在 App 裡：請在歌曲頁按「搜尋歌詞」，複製後貼回 App，歌詞只會存在這台裝置。</Note>
    </div>
  );
}
function YTPlayer(props: { s: Song2 }) {
  const t = useGrokTheme();
  const [on, setOn] = useState(false);
  const s = props.s;
  const online = typeof navigator === "undefined" || navigator.onLine !== false;
  if (!s.yt) {
    return (
      <div style={{ borderRadius: 12, background: t.bg.subtle, padding: 16, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8, justifyItems: "center" }}>
        <Note>這首歌沒有找到可內嵌播放的官方影片。</Note>
        <Btn label="▶ 在 YouTube 搜尋" onClick={() => openExt(`https://www.youtube.com/results?search_query=${encodeURIComponent(`${s.a} ${s.t}`)}`)} />
      </div>
    );
  }
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: 12, overflow: "hidden", background: "#000" }}>
      {on ? (
        <iframe
          title={`${s.t} 影片`}
          src={`https://www.youtube-nocookie.com/embed/${s.yt}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
        />
      ) : (
        <button type="button" onClick={() => setOn(true)} aria-label={`播放 ${s.t}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", padding: 0, cursor: "pointer", background: "#000" }}>
          <img src={`https://i.ytimg.com/vi/${s.yt}/hqdefault.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} onError={(e: { currentTarget: HTMLImageElement }) => { e.currentTarget.style.display = "none"; }} />
          <span style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 72, height: 52, borderRadius: 14, background: "rgba(220,0,0,0.92)", color: "#fff", fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>▶</span>
          {!online ? <span style={{ position: "absolute", left: 8, bottom: 8, right: 8, color: "#fff", fontSize: 13, background: "rgba(0,0,0,0.6)", borderRadius: 8, padding: "4px 8px" }}>目前離線：影片需要網路，其餘功能可離線使用</span> : null}
        </button>
      )}
    </div>
  );
}
function SongThemeQuiz(props: { s: Song2 }) {
  const pool = SONGS2.flatMap((x: Song2) => x.v);
  const gen = useMemo(() => {
    const d = deck(props.s.v);
    return (): Q => {
      const v = d();
      const others = shuffle(pool.filter((x: SongV) => x.m !== v.m && x.w !== v.w)).slice(0, 3);
      return Math.random() < 0.5
        ? { id: `song:${props.s.id}:${v.w}:m`, sec: "song", tag: "歌曲主題單字：意思", prompt: `「${v.w}」（${v.r}）是什麼意思？`, ...mc(v.m, others.map((x: SongV) => x.m)), tts: v.r, ttsAfter: true, exp: `${v.w}（${v.r}）＝${v.m}` }
        : { id: `song:${props.s.id}:${v.w}:r`, sec: "song", tag: "歌曲主題單字：讀音", prompt: `「${v.w}」（${v.m}）怎麼念？`, optJa: true, ...mc(v.r, others.map((x: SongV) => x.r).filter((r: string) => r !== v.r)), tts: v.r, ttsAfter: true, exp: `${v.w}（${v.r}）＝${v.m}` };
    };
  }, [props.s.id]);
  const [on, setOn] = useState(false);
  if (!on) return <Btn kind="primary" label="✏️ 主題單字小測驗（6 題）" onClick={() => setOn(true)} />;
  return <QuizRunner key={props.s.id} gen={gen} total={6} />;
}
function LyricsEditor(props: { s: Song2; onDone: () => void }) {
  const t = useGrokTheme();
  const [v, setV] = useState(DB.lyr[props.s.id] ?? "");
  const [msg, setMsg] = useState("");
  const save = () => {
    const x = v.trim();
    DB.lyr = { ...DB.lyr };
    if (x) DB.lyr[props.s.id] = x; else delete DB.lyr[props.s.id];
    commit();
    setMsg(x ? `✅ 已儲存 ${lyricLines(x).length} 行（只存在這台裝置）` : "已清除歌詞");
    if (x) props.onDone();
  };
  const paste = () => {
    try {
      navigator.clipboard.readText().then((s: string) => { if (s) setV(s); else setMsg("剪貼簿是空的"); }).catch(() => setMsg("瀏覽器不允許直接讀剪貼簿，請長按下方輸入框選「貼上」。"));
    } catch { setMsg("請長按下方輸入框選「貼上」。"); }
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn label="🔍 搜尋歌詞（Google）" onClick={() => openExt(lyricsSearchUrl(props.s, "g"))} />
        <Btn label="🔍 歌ネット" onClick={() => openExt(lyricsSearchUrl(props.s, "u"))} />
        <Btn label="📋 從剪貼簿貼上" onClick={paste} />
      </div>
      <textarea value={v} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setV(e.target.value)} aria-label="貼上歌詞" placeholder={"1. 按上面「搜尋歌詞」，在歌詞網站全選複製\n2. 回到這裡貼上（長按 → 貼上）\n3. 按「儲存歌詞」"} rows={10} lang="ja" style={{ width: "100%", boxSizing: "border-box", font: "inherit", fontFamily: JA_FONT, fontSize: 16, lineHeight: 1.7, padding: 12, borderRadius: 10, border: `1px solid ${t.border.default}`, background: t.bg.base, color: t.text.primary }} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Btn kind="primary" label="💾 儲存歌詞" onClick={save} />
        {DB.lyr[props.s.id] ? <Btn label="取消" onClick={props.onDone} /> : null}
        {msg ? <span role="status" style={{ fontSize: 13 }}>{msg}</span> : null}
      </div>
      <Note>歌詞受著作權保護，所以不會內建在公開的 App 裡；你貼上的歌詞只存在這台裝置的瀏覽器（也會包含在「成績 → 備份與還原」的備份裡），不會上傳。</Note>
    </div>
  );
}
function LyricsView(props: { s: Song2; lines: string[]; toks: (Tok[] | null)[] }) {
  const t = useGrokTheme();
  const db = useDB();
  const [cur, setCur] = useState(-1);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 2 }}>
      {props.lines.map((l: string, i: number) => (
        <button key={i} type="button" onClick={() => { setCur(i); speak(l, 0.9); }} aria-label={`朗讀第 ${i + 1} 行`} style={{ font: "inherit", textAlign: "left", cursor: "pointer", border: "none", borderLeft: `3px solid ${cur === i ? t.fill.accent : "transparent"}`, background: cur === i ? t.fill.accentSubtle : "transparent", color: t.text.primary, padding: "6px 10px", borderRadius: 6, minHeight: 44, display: "flex", gap: 8, alignItems: "baseline" }}>
          <span aria-hidden="true" style={{ fontSize: 11, color: t.text.secondary, minWidth: 18 }}>{i + 1}</span>
          <span lang="ja" style={{ fontFamily: JA_FONT, fontSize: 17, lineHeight: 2.1 }}><FuriLine toks={props.toks[i] ?? null} text={l} furi={db.furi} /></span>
        </button>
      ))}
    </div>
  );
}
function spanEnd(ts: Tok[], i: number): number {
  const a = ts[i];
  if (!a || (a.pos !== "動詞" && a.pos !== "形容詞")) return i;
  let j = i;
  while (j + 1 < ts.length) {
    const n = ts[j + 1]!;
    const ok = n.pos === "助動詞" || (n.pos === "助詞" && n.pos_detail_1 === "接続助詞" && (n.surface_form === "て" || n.surface_form === "で")) || (n.pos === "動詞" && n.pos_detail_1 === "非自立") || (n.pos === "動詞" && n.pos_detail_1 === "接尾");
    if (!ok) break;
    j++;
  }
  return j;
}
type FillItem = { li: number; ti: number; tj: number; surf: string; rd: string; pos: string; base: string };
function LyricsFill(props: { s: Song2; lines: string[]; toks: (Tok[] | null)[] }) {
  const items = useMemo(() => {
    const out: FillItem[] = [];
    props.toks.forEach((ts: Tok[] | null, li: number) => {
      const t2 = ts ?? [];
      t2.forEach((tok: Tok, ti: number) => {
        if (!isContent(tok)) return;
        const tj = spanEnd(t2, ti);
        const seg = t2.slice(ti, tj + 1);
        out.push({ li, ti, tj, surf: seg.map((x: Tok) => x.surface_form).join(""), rd: seg.map((x: Tok) => (x.reading ? toHiraS(x.reading) : x.surface_form)).join(""), pos: tok.pos, base: tok.basic_form });
      });
    });
    return out;
  }, [props.toks]);
  const gen = useMemo(() => {
    const d = deck(items);
    return (): Q => {
      const it = d();
      const line = props.lines[it.li] ?? "";
      const ts = props.toks[it.li] ?? [];
      const blank = ts.map((x: Tok, j: number) => (j === it.ti ? "（　　）" : j > it.ti && j <= it.tj ? "" : x.surface_form)).join("");
      const same = shuffle([...new Set(items.filter((x: FillItem) => x.surf !== it.surf && x.pos === it.pos).map((x: FillItem) => x.surf))]);
      const other = shuffle([...new Set(items.map((x: FillItem) => x.surf).filter((x: string) => x !== it.surf && !same.includes(x)))]);
      const ds = [...same, ...other].slice(0, 3);
      return { id: `lyr:${props.s.id}:${it.li}:${it.ti}`, sec: "song", tag: `歌詞填空・第 ${it.li + 1} 行`, prompt: "（　　）中放入哪個詞？\n" + blank, ja: true, optJa: true, ...mc(it.surf, ds), tts: line, ttsAfter: true, exp: `${it.surf}（${it.rd}）　原形：${it.base}\n${line}`, review: blank };
    };
  }, [items]);
  if (new Set(items.map((x: FillItem) => x.surf)).size < 4) return <Note>這首歌詞可出題的單字太少（至少需要 4 個不同的詞）。</Note>;
  return <QuizRunner key={props.s.id} gen={gen} />;
}
function LyricsOrder(props: { s: Song2; lines: string[] }) {
  const t = useGrokTheme();
  const uniq = props.lines;
  const mk = (): { start: number; order: number[] } => {
    const n = Math.min(4, uniq.length);
    const start = Math.floor(Math.random() * Math.max(1, uniq.length - n + 1));
    let order = shuffle([...Array(n).keys()]);
    if (n > 1 && order.every((x: number, i: number) => x === i)) order = [...order.slice(1), order[0]!];
    return { start, order };
  };
  const [st, setSt] = useState(mk);
  const [picked, setPicked] = useState<number[]>([]);
  const [score, setScore] = useState({ c: 0, n: 0 });
  const n = st.order.length;
  const done = picked.length === n;
  const ok = done && picked.every((x: number, i: number) => x === i);
  useEffect(() => {
    if (done) { setScore((s: { c: number; n: number }) => ({ c: s.c + (ok ? 1 : 0), n: s.n + 1 })); recordStat("song", ok); commit(); }
  }, [done]);
  if (uniq.length < 3) return <Note>歌詞至少要 3 行才能排序。</Note>;
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
        <span style={{ color: t.text.accent, fontWeight: 600 }}>歌詞排序：依照歌曲順序點選</span>
        <span style={{ color: t.text.secondary }}>本輪 {score.c}/{score.n}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 6 }}>
        {st.order.map((k: number) => {
          const pos = picked.indexOf(k);
          return (
            <button key={k} type="button" disabled={pos >= 0 || done} onClick={() => setPicked([...picked, k])} style={{ font: "inherit", textAlign: "left", cursor: pos >= 0 ? "default" : "pointer", minHeight: 48, padding: "8px 12px", borderRadius: 10, border: `1px solid ${t.border.default}`, background: pos >= 0 ? t.bg.subtle : t.bg.base, color: t.text.primary, display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ minWidth: 24, height: 24, borderRadius: 999, background: pos >= 0 ? t.fill.accent : t.bg.subtle, color: pos >= 0 ? t.text.onColor : t.text.secondary, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{pos >= 0 ? pos + 1 : "?"}</span>
              <span lang="ja" style={{ fontFamily: JA_FONT, fontSize: 16 }}>{uniq[st.start + k]}</span>
            </button>
          );
        })}
      </div>
      {done ? (
        <div role="status" style={{ marginTop: 12, padding: 12, borderRadius: 10, background: ok ? t.fill.successSubtle : t.fill.dangerSubtle, borderLeft: `4px solid ${ok ? t.text.success : t.text.danger}` }}>
          <div style={{ fontWeight: 600 }}>{ok ? "✓ 順序正確！" : "✗ 正確順序："}</div>
          {!ok ? <ol lang="ja" style={{ margin: "6px 0 0 18px", padding: 0, fontFamily: JA_FONT }}>{st.order.map((_: number, i: number) => <li key={i}>{uniq[st.start + i]}</li>)}</ol> : null}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <Btn label="↺ 重選" onClick={() => setPicked([])} />
        <Btn label="🔊 聽這幾行" onClick={() => speak(uniq.slice(st.start, st.start + n).join("。"), 0.9)} />
        <Btn kind="primary" label="下一題 →" onClick={() => { setSt(mk()); setPicked([]); }} />
      </div>
    </Card>
  );
}
function LyricsVocab(props: { toks: (Tok[] | null)[]; tk: Tokenizer | null }) {
  const t = useGrokTheme();
  const rows = useMemo(() => {
    const m = new Map<string, { b: string; n: number; r: string; pos: string }>();
    props.toks.forEach((ts: Tok[] | null) => (ts ?? []).forEach((tok: Tok) => {
      if (!isContent(tok)) return;
      const b = tok.basic_form && tok.basic_form !== "*" ? tok.basic_form : tok.surface_form;
      const prev = m.get(b);
      if (prev) { prev.n++; return; }
      let r = "";
      if (b === tok.surface_form) r = tok.reading ? toHiraS(tok.reading) : "";
      else if (props.tk) r = props.tk.tokenize(b).map((x: Tok) => (x.reading ? toHiraS(x.reading) : x.surface_form)).join("");
      m.set(b, { b, n: 1, r, pos: tok.pos });
    }));
    return [...m.values()].sort((a: { n: number }, b: { n: number }) => b.n - a.n);
  }, [props.toks]);
  const vmap = useMemo(() => new Map<string, Vocab>(VOCAB.map((v: Vocab): [string, Vocab] => [v.w, v])), []);
  const known = rows.filter((x: { b: string }) => vmap.has(x.b)).length;
  return (
    <Card>
      <div style={{ fontSize: 13, color: t.text.secondary, marginBottom: 8 }}>從歌詞抽出 {rows.length} 個單字（依出現次數排序），其中 {known} 個在 N3 單字庫裡，有中文意思。</div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 6 }}>
        {rows.map((x: { b: string; n: number; r: string; pos: string }) => {
          const v = vmap.get(x.b);
          return (
            <div key={x.b} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", borderBottom: `1px solid ${t.border.subtle}`, paddingBottom: 6 }}>
              <Ruby w={x.b} r={x.r && x.r !== x.b ? x.r : x.b} size={18} />
              <span style={{ fontSize: 12, color: t.text.secondary }}>{x.pos}・×{x.n}</span>
              <span style={{ fontSize: 14, flex: 1, minWidth: 80 }}>{v ? v.m : "—"}</span>
              {v ? <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 999, border: `1px solid ${t.text.success}` }}>N3 單字庫</span> : null}
              <Speak text={x.r || x.b} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
function SongDetail(props: { s: Song2; onBack: () => void }) {
  const t = useGrokTheme();
  const db = useDB();
  const s = props.s;
  const lyr = db.lyr[s.id] ?? "";
  const [edit, setEdit] = useState(!lyr);
  const [mode, setMode] = useState("view");
  const lines = useMemo(() => lyricLines(lyr), [lyr]);
  const { tk, st } = useTokenizer(!!lyr && !edit);
  const toks = useMemo(() => lines.map((l: string) => (tk ? fixToks(tk.tokenize(l)) : null)), [lines, tk]);
  const fav = !!db.fav[s.id];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Btn label="← 歌曲庫" onClick={props.onBack} />
      </div>
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 6 }}>
          <div lang="ja" style={{ fontFamily: JA_FONT, fontSize: 22, fontWeight: 700, lineHeight: 1.3 }}>{s.t}</div>
          <div lang="ja" style={{ fontFamily: JA_FONT, color: t.text.secondary }}>{s.a}・{s.y} 年</div>
          {s.tie ? <div lang="ja" style={{ fontFamily: JA_FONT, fontSize: 13, color: t.text.secondary }}>{s.tie}</div> : null}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 12 }}>
            <span style={{ padding: "2px 8px", borderRadius: 999, background: t.bg.subtle }}>{s.g}</span>
            <span style={{ padding: "2px 8px", borderRadius: 999, border: `1px solid ${lvColor(t, s.lv)}` }}>{s.lv}</span>
            {lyr ? <span style={{ padding: "2px 8px", borderRadius: 999, border: `1px solid ${t.text.success}` }}>📄 已存歌詞 {lines.length} 行</span> : null}
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <YTPlayer s={s} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <Btn on={fav} label={fav ? "♥ 已收藏" : "♡ 收藏"} onClick={() => { DB.fav = { ...DB.fav }; if (fav) delete DB.fav[s.id]; else DB.fav[s.id] = Date.now(); commit(); }} />
          <Btn label="🔍 搜尋歌詞" onClick={() => openExt(lyricsSearchUrl(s, "g"))} />
        </div>
      </Card>
      <Card title="📝 主題單字與學習重點">
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8 }}>
          {s.v.map((v: SongV) => (
            <div key={v.w} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Ruby w={v.w} r={v.r} size={20} />
              <span>{v.m}</span>
              <Speak text={v.r} />
            </div>
          ))}
          <div style={{ fontSize: 14, lineHeight: 1.7, background: t.bg.subtle, borderRadius: 8, padding: "8px 12px" }}>{s.note}</div>
        </div>
      </Card>
      <SongThemeQuiz s={s} />
      <Card title="🎤 歌詞練習">
        {edit || !lyr ? (
          <LyricsEditor s={s} onDone={() => setEdit(false)} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 10 }}>
            <Chips small scroll value={mode} onChange={setMode} options={[["view", "📄 歌詞＋假名"], ["fill", "✏️ 填空"], ["order", "🔀 排序"], ["vocab", "📚 單字表"]]} />
            {st === "load" ? <div role="status" style={{ fontSize: 13, color: t.text.secondary }}>⏳ 正在載入斷詞字典（第一次約 18 MB，之後離線也能用）…</div> : null}
            {st === "err" ? <Note>斷詞字典載入失敗（可能沒有網路）。歌詞仍可顯示與朗讀，連上網路後重新開啟這頁即可加上假名。</Note> : null}
            {mode === "view" ? <LyricsView s={s} lines={lines} toks={toks} /> : null}
            {mode === "fill" ? (tk ? <LyricsFill s={s} lines={lines} toks={toks} /> : <Note>需要斷詞字典才能出填空題。</Note>) : null}
            {mode === "order" ? <LyricsOrder key={s.id} s={s} lines={lines} /> : null}
            {mode === "vocab" ? (tk ? <LyricsVocab toks={toks} tk={tk} /> : <Note>需要斷詞字典才能抽出單字。</Note>) : null}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn small label="✏️ 編輯歌詞" onClick={() => setEdit(true)} />
              <Btn small label="🗑 刪除歌詞" onClick={() => { if (window.confirm("確定刪除這首歌的歌詞？")) { DB.lyr = { ...DB.lyr }; delete DB.lyr[s.id]; commit(); setEdit(true); } }} />
            </div>
            <Note>點一行歌詞可以聽朗讀（裝置語音）。假名由斷詞程式自動標註，偶爾會有讀音誤差（特別是歌詞裡的特殊讀法）。</Note>
          </div>
        )}
      </Card>
    </div>
  );
}
function SongTab() {
  const [m, setM] = useState("lib");
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12 }}>
      <Chips value={m} onChange={setM} options={[["lib", `🎵 歌曲庫（${SONGS2.length}）`], ["old", "✏️ 自訂歌詞練習"]]} />
      {m === "lib" ? <SongLibrary /> : <SongTabOld />}
    </div>
  );
}
