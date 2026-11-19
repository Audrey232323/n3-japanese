/* ============ N3 漢字 ============ */
type KanjiEx = { w: string; r: string; m: string };
type Kanji = { k: string; m: string; on: string; kun: string; st: number; ex: KanjiEx[]; i: number };
const KANJI: Kanji[] = KANJI_RAW.split("\n").map((l: string, i: number): Kanji => {
  const [k, m, on, kun, st, ex] = l.split("|") as [string, string, string, string, string, string];
  return { k, m, on, kun, st: Number(st), i, ex: ex.split(";").map((e: string): KanjiEx => { const [w, r, mm] = e.split(":") as [string, string, string]; return { w, r, m: mm }; }) };
});
const KANJI_BY = new Map<string, Kanji>(KANJI.map((x: Kanji): [string, Kanji] => [x.k, x]));
const ON_MAP = new Map<string, string[]>();
KANJI.forEach((x: Kanji) => x.on.split("・").filter(Boolean).forEach((o: string) => { const h = toHiraS(o); ON_MAP.set(h, [...(ON_MAP.get(h) ?? []), x.k]); }));
function kanjiVocab(k: string): Vocab[] {
  return VOCAB.filter((v: Vocab) => v.w.includes(k)).slice(0, 4);
}
function readPerturb(r: string): string[] {
  const out = new Set<string>();
  const VO: Record<string, string> = { か: "が", き: "ぎ", く: "ぐ", け: "げ", こ: "ご", さ: "ざ", し: "じ", す: "ず", せ: "ぜ", そ: "ぞ", た: "だ", て: "で", と: "ど", は: "ば", ひ: "び", ふ: "ぶ", へ: "べ", ほ: "ぼ" };
  const UN: Record<string, string> = {};
  Object.entries(VO).forEach(([a, b]: [string, string]) => { UN[b] = a; });
  const c0 = r[0] ?? "";
  if (VO[c0]) out.add(VO[c0] + r.slice(1));
  if (UN[c0]) out.add(UN[c0] + r.slice(1));
  if (/[ょゅ]う/.test(r)) out.add(r.replace(/([ょゅ])う/, "$1"));
  else if (/[ょゅ](?!う)/.test(r)) out.add(r.replace(/([ょゅ])/, "$1う"));
  if (r.includes("っ")) out.add(r.replace("っ", ""));
  else if (/^(.)[くきつち]([かきくけこさしすせそたちつてとぱぴぷぺぽ])/.test(r)) out.add(r.replace(/^(.)[くきつち]/, "$1っ"));
  if (/おう|こう|そう|とう|のう|ほう|もう|よう|ろう|ごう|ぞう|どう|ぼう/.test(r)) out.add(r.replace(/([おこそとのほもよろごぞどぼ])う/, "$1"));
  if (/ん/.test(r)) out.add(r.replace("ん", ""));
  if (/い$/.test(r) && r.length > 2) out.add(r.slice(0, -1) + "え");
  out.delete(r);
  return [...out];
}
function kanjiPool(range: string): Kanji[] {
  if (range === "all") return KANJI;
  if (range === "weak") {
    const w = KANJI.filter((x: Kanji) => (DB.kj[x.k]?.w ?? 0) > (DB.kj[x.k]?.c ?? 0) - 1 && (DB.kj[x.k]?.w ?? 0) > 0);
    return w.length >= 4 ? w : KANJI;
  }
  const [a, b] = range.split("-").map(Number) as [number, number];
  return KANJI.slice(a - 1, b);
}
function kanjiQ(pool: Kanji[], kind: string): Q {
  const x = pick(pool);
  const kd = kind === "mix" ? pick(["read", "read", "mean", "write"]) : kind;
  const e = pick(x.ex);
  const base = { sec: "kanji" as Sec, kana: [] as string[] };
  const exp = `${x.k}：${x.m}\n音讀：${x.on || "—"}　訓讀：${x.kun || "—"}\n${x.ex.map((y: KanjiEx) => `${y.w}（${y.r}）＝${y.m}`).join("\n")}`;
  if (kd === "mean") {
    const han = (m: string): string[] => [...m].filter((c: string) => /[\u3400-\u9fff]/.test(c));
    const xs = new Set(han(x.m));
    const others = shuffle(KANJI.filter((y: Kanji) => y.k !== x.k && !han(y.m).some((c: string) => xs.has(c)))).slice(0, 3).map((y: Kanji) => y.m);
    return { ...base, id: `kanji:${x.k}:m`, tag: "漢字 → 意思", prompt: "這個漢字是什麼意思？", big: true, ja: true, reveal: x.k, ...mc(x.m, others), exp, tts: e.r, ttsAfter: true, review: x.k };
  }
  if (kd === "write") {
    const ds = new Set<string>();
    [...e.w].forEach((c: string) => {
      const kx = KANJI_BY.get(c);
      if (!kx) return;
      kx.on.split("・").filter(Boolean).forEach((o: string) => (ON_MAP.get(toHiraS(o)) ?? []).forEach((alt: string) => { if (alt !== c) ds.add(e.w.replace(c, alt)); }));
    });
    let d = shuffle([...ds]).slice(0, 3);
    if (d.length < 3) d = [...d, ...shuffle(KANJI.flatMap((y: Kanji) => y.ex.map((z: KanjiEx) => z.w)).filter((w: string) => w !== e.w && w.length === e.w.length && !d.includes(w))).slice(0, 3 - d.length)];
    return { ...base, id: `kanji:${e.w}:w`, tag: "讀音 → 漢字寫法", prompt: `「${e.r}」（${e.m}）的漢字寫法是？`, optJa: true, ...mc(e.w, d), exp, tts: e.r, ttsAfter: true, review: `${e.r}（${e.m}）` };
  }
  let d = readPerturb(e.r);
  const sim = shuffle(KANJI.flatMap((y: Kanji) => y.ex.map((z: KanjiEx) => z.r)).filter((r: string) => r !== e.r && Math.abs(r.length - e.r.length) <= 1 && (r[0] === e.r[0] || r.slice(-1) === e.r.slice(-1))));
  d = shuffle([...new Set([...d])]).slice(0, 2);
  d = [...new Set([...d, ...sim])].filter((r: string) => r !== e.r).slice(0, 3);
  if (d.length < 3) {
    const any = shuffle([...new Set(KANJI.flatMap((y: Kanji) => y.ex.map((z: KanjiEx) => z.r)))].filter((r: string) => r !== e.r && !d.includes(r) && Math.abs(r.length - e.r.length) <= 1));
    d = [...d, ...any].slice(0, 3);
  }
  if (d.length < 3) {
    const rest = shuffle([...new Set(KANJI.flatMap((y: Kanji) => y.ex.map((z: KanjiEx) => z.r)))].filter((r: string) => r !== e.r && !d.includes(r))).sort((a: string, b: string) => Math.abs(a.length - e.r.length) - Math.abs(b.length - e.r.length));
    d = [...d, ...rest].slice(0, 3);
  }
  return { ...base, id: `kanji:${e.w}:r`, tag: "漢字讀音", prompt: `「${e.w}」怎麼念？（${e.m}）`, big: false, ja: true, optJa: true, ...mc(e.r, d), exp, tts: e.r, ttsAfter: true, review: e.w };
}
function KanjiDetail(props: { x: Kanji; onClose: () => void }) {
  const t = useGrokTheme();
  const x = props.x;
  const rel = kanjiVocab(x.k).filter((v: Vocab) => !x.ex.some((e: KanjiEx) => e.w === v.w));
  const st = DB.kj[x.k];
  return (
    <Card>
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div lang="ja" style={{ fontFamily: JA_FONT, fontSize: 72, lineHeight: 1, minWidth: 80, textAlign: "center" }}>{x.k}</div>
        <div style={{ display: "grid", gap: 4, flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>{x.m}</div>
          <div lang="ja" style={{ fontFamily: JA_FONT }}><span style={{ fontSize: 12, color: t.text.secondary }}>音讀　</span>{x.on || "—"}</div>
          <div lang="ja" style={{ fontFamily: JA_FONT }}><span style={{ fontSize: 12, color: t.text.secondary }}>訓讀　</span>{x.kun || "—"}</div>
          <div style={{ fontSize: 12, color: t.text.secondary }}>{x.st} 畫{st ? `・答對 ${st.c}／答錯 ${st.w}` : ""}</div>
        </div>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        {x.ex.map((e: KanjiEx) => (
          <div key={e.w} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", borderTop: `1px solid ${t.border.subtle}`, paddingTop: 8 }}>
            <Ruby w={e.w} r={e.r} size={22} />
            <span>{e.m}</span>
            <Speak text={e.r} />
          </div>
        ))}
        {rel.map((v: Vocab) => (
          <div key={v.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", borderTop: `1px solid ${t.border.subtle}`, paddingTop: 8 }}>
            <Ruby w={v.w} r={v.r} size={18} />
            <span style={{ fontSize: 14 }}>{v.m}</span>
            <span style={{ fontSize: 12, color: t.text.secondary }}>（單字庫）</span>
            <Speak text={v.r} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        <Btn small label="← 回漢字表" onClick={props.onClose} />
      </div>
    </Card>
  );
}
function KanjiTab() {
  const t = useGrokTheme();
  const [sub, setSub] = useState<"list" | "quiz">("list");
  const [range, setRange] = useState("1-100");
  const [kind, setKind] = useState("mix");
  const [sel, setSel] = useState<Kanji | null>(null);
  const [qq, setQq] = useState("");
  const ranges: [string, string][] = [["1-100", "1–100"], ["101-200", "101–200"], ["201-300", "201–300"], ["301-367", `301–${KANJI.length}`], ["all", "全部"], ["weak", "答錯過的"]];
  const pool = useMemo(() => kanjiPool(range), [range]);
  const gen = useMemo(() => () => kanjiQ(pool, kind), [pool, kind]);
  const shown = qq ? KANJI.filter((x: Kanji) => x.k.includes(qq) || x.m.includes(qq) || x.on.includes(toKata(qq)) || x.kun.includes(toHiraS(qq)) || x.ex.some((e: KanjiEx) => e.w.includes(qq) || e.r.includes(qq))) : pool;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Chips value={sub} onChange={(v: "list" | "quiz") => { setSub(v); setSel(null); }} options={[["list", `漢字表（${KANJI.length}）`], ["quiz", "漢字測驗"]]} />
      <Chips small scroll={NARROW()} value={range} onChange={(v: string) => { setRange(v); setSel(null); }} options={ranges} />
      {sub === "list" ? (
        sel ? (
          <KanjiDetail x={sel} onClose={() => setSel(null)} />
        ) : (
          <Card>
            <input
              value={qq}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setQq(e.target.value)}
              placeholder="搜尋漢字、讀音或中文（例：会、かい、會）"
              aria-label="搜尋漢字"
              type="search"
              style={{ width: "100%", boxSizing: "border-box", font: "inherit", fontSize: 16, padding: "10px 12px", borderRadius: 8, border: `1px solid ${t.border.default}`, background: t.bg.base, color: t.text.primary, marginBottom: 12 }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: 8 }}>
              {shown.map((x: Kanji) => {
                const s = DB.kj[x.k];
                const col = s ? (s.w > s.c ? t.text.danger : s.c >= 2 ? t.text.success : t.text.secondary) : t.border.default;
                return (
                  <button key={x.k} type="button" onClick={() => setSel(x)} aria-label={`${x.k}：${x.m}`} style={{ font: "inherit", cursor: "pointer", minHeight: 64, borderRadius: 10, border: `1px solid ${t.border.default}`, borderBottom: `3px solid ${col}`, background: t.bg.base, color: t.text.primary, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 4 }}>
                    <span lang="ja" style={{ fontFamily: JA_FONT, fontSize: 28, lineHeight: 1.1 }}>{x.k}</span>
                    <span style={{ fontSize: 10, color: t.text.secondary, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.m.split(/[、；]/)[0]}</span>
                  </button>
                );
              })}
            </div>
            {shown.length === 0 ? <Note>找不到符合的漢字。</Note> : null}
            <div style={{ marginTop: 10 }}>
              <Note>N3 程度漢字 {KANJI.length} 字（依日本常用 N3 漢字表整理）。讀音取自 KANJIDIC，例詞讀音皆經 JMdict 辭典核對。下方色條：綠＝答對 2 次以上、紅＝答錯較多。</Note>
            </div>
          </Card>
        )
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <Chips small value={kind} onChange={setKind} options={[["mix", "混合"], ["read", "例詞讀音"], ["mean", "漢字意思"], ["write", "讀音→寫法"]]} />
          <QuizRunner key={`${range}|${kind}`} gen={gen} onResult={(q: Q, ok: boolean) => { const k = q.id.split(":")[1] ?? ""; [...k].forEach((c: string) => { if (KANJI_BY.has(c)) { const s = DB.kj[c] ?? { c: 0, w: 0 }; DB.kj[c] = { c: s.c + (ok ? 1 : 0), w: s.w + (ok ? 0 : 1) }; } }); commit(); }} />
        </div>
      )}
    </div>
  );
}

/* ============ 單字 SRS 卡片 ============ */
type VS = { due: number; iv: number; ef: number; n: number };
function dayNum(): number {
  const d = new Date();
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
}
function vsrsNext(s: VS | undefined, g: number): VS {
  const cur = s ?? { due: 0, iv: 0, ef: 2.5, n: 0 };
  const ef = Math.max(1.3, Math.min(2.8, cur.ef + [-0.3, -0.15, 0, 0.15][g]!));
  let iv: number;
  if (g === 0) iv = 0;
  else if (cur.n === 0 || cur.iv === 0) iv = [0, 1, 1, 3][g]!;
  else iv = Math.round(cur.iv * [0, 1.2, ef, ef * 1.3][g]!);
  iv = Math.min(iv, 365);
  return { due: dayNum() + iv, iv, ef, n: cur.n + 1 };
}
function ivLabel(iv: number): string {
  return iv === 0 ? "今天再看" : iv < 30 ? `${iv} 天後` : `${Math.round(iv / 30)} 個月後`;
}
function VocabSRS(props: { items: Vocab[] }) {
  const t = useGrokTheme();
  const db = useDB();
  const [per, setPer] = useState(String(db.vsrsPer || 10));
  const [show, setShow] = useState(false);
  const [again, setAgain] = useState<string[]>([]);
  const [done, setDone] = useState(0);
  const td = dayNum();
  const newToday = db.vsrsNew.d === td ? db.vsrsNew.n : 0;
  const due = props.items.filter((v: Vocab) => db.vsrs[v.id] && db.vsrs[v.id]!.due <= td).sort((a: Vocab, b: Vocab) => db.vsrs[a.id]!.due - db.vsrs[b.id]!.due);
  const fresh = props.items.filter((v: Vocab) => !db.vsrs[v.id]);
  const newLeft = Math.max(0, Number(per) - newToday);
  const queue: Vocab[] = [...due.filter((v: Vocab) => !again.includes(v.id)), ...fresh.slice(0, newLeft), ...again.map((id: string) => VOCAB.find((v: Vocab) => v.id === id)!).filter(Boolean)];
  const cur = queue[0];
  const learned = props.items.filter((v: Vocab) => db.vsrs[v.id]).length;
  const grade = (g: number) => {
    if (!cur) return;
    const wasNew = !DB.vsrs[cur.id];
    DB.vsrs = { ...DB.vsrs, [cur.id]: vsrsNext(DB.vsrs[cur.id], g) };
    if (wasNew) DB.vsrsNew = { d: td, n: newToday + 1 };
    setAgain((a: string[]) => { const r = a.filter((x: string) => x !== cur.id); return g === 0 ? [...r, cur.id] : r; });
    recordStat("vocab", g > 0);
    commit();
    setShow(false);
    setDone((n: number) => n + 1);
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement | null;
      if (tg && (tg.tagName === "INPUT" || tg.tagName === "TEXTAREA")) return;
      if (!show && (e.key === " " || e.key === "Enter")) { e.preventDefault(); setShow(true); }
      else if (show && ["1", "2", "3", "4"].includes(e.key)) grade(Number(e.key) - 1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });
  const btn = (g: number, label: string, col: string) => (
    <button type="button" onClick={() => grade(g)} style={{ font: "inherit", cursor: "pointer", flex: 1, minWidth: 0, minHeight: 56, borderRadius: 10, border: `1px solid ${t.border.default}`, borderTop: `3px solid ${col}`, background: t.bg.base, color: t.text.primary, padding: "6px 4px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 11, color: t.text.secondary }}>{cur ? ivLabel(vsrsNext(db.vsrs[cur.id], g).iv) : ""}</span>
    </button>
  );
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Card>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 14, alignItems: "center" }}>
          <span>⏰ 到期 <b>{due.length}</b></span>
          <span>🆕 今日新卡 <b>{Math.min(newLeft, fresh.length)}</b></span>
          <span>📚 已學 {learned}/{props.items.length}</span>
          <span>本次 {done} 張</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
          <span style={{ fontSize: 13, color: t.text.secondary }}>每天新卡</span>
          <Chips small value={per} onChange={(v: string) => { setPer(v); DB.vsrsPer = Number(v); commit(); }} options={[["5", "5"], ["10", "10"], ["20", "20"], ["30", "30"]]} />
        </div>
      </Card>
      {cur ? (
        <Card>
          <div style={{ fontSize: 12, color: t.text.accent, fontWeight: 600, marginBottom: 6 }}>{db.vsrs[cur.id] ? "複習" : "新卡"}・{cur.p}</div>
          <div lang="ja" style={{ fontFamily: JA_FONT, fontSize: 40, textAlign: "center", margin: "12px 0" }}>{show ? <Ruby w={cur.w} r={cur.r} /> : cur.w}</div>
          {show ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ textAlign: "center", fontSize: 18 }}>{cur.m}</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 8 }}><Speak text={cur.r} label="單字" /><Speak text={cur.ex} label="例句" /></div>
              <div lang="ja" style={{ fontFamily: JA_FONT, lineHeight: 2, fontSize: 15 }}><Rich text={cur.ex} /></div>
              <div style={{ fontSize: 13, color: t.text.secondary }}>{cur.tr}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                {btn(0, "忘了", t.text.danger)}
                {btn(1, "困難", t.text.warning)}
                {btn(2, "記得", t.text.success)}
                {btn(3, "簡單", t.text.accent)}
              </div>
              <Note>鍵盤：1 忘了、2 困難、3 記得、4 簡單。</Note>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              <button type="button" onClick={() => setShow(true)} style={{ font: "inherit", fontSize: 16, cursor: "pointer", minHeight: 52, borderRadius: 10, border: "none", background: t.fill.primary, color: t.text.onPrimary, fontWeight: 600 }}>
                想好讀音和意思了，看答案
              </button>
              <Note>先在心裡念出讀音、想出中文意思，再看答案並自評。空白鍵／Enter 看答案。</Note>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <div style={{ fontSize: 18, fontWeight: 600 }}>🎉 今天的單字卡完成了！</div>
          <div style={{ marginTop: 6 }}>
            <Note>{fresh.length ? `明天會再出新卡；想多學可以把「每天新卡」調高。` : "這個範圍的單字都學過了，之後只會出到期的複習卡。"}</Note>
          </div>
        </Card>
      )}
    </div>
  );
}
