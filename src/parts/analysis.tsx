/* ===== Round 9：錯題分析（每次作答記錄、分類、趨勢、弱點、建議） ===== */
type LogE = { t: number; i: string; s: string; c: string; k: string[]; ok: 0 | 1; p?: string; a?: string };
type ExamRes = { n: number; t: number; p: number[]; tot: number };
const KANA_ROW: Record<string, string> = {};
ROWS.forEach((r: Row) => r.cells.forEach((c: Kana | null) => { if (c) { KANA_ROW[c.h] = r.name; KANA_ROW[c.k] = r.name; } }));
const GRAM_BY_ID: Record<string, string> = {};
GRAMMAR.forEach((g: Gram) => { GRAM_BY_ID[g.id] = g.pat; });
const VOCAB_BY_ID: Record<string, Vocab> = {};
VOCAB.forEach((v: Vocab) => { VOCAB_BY_ID[v.id] = v; });
const TOPIC_NAME: Record<string, string> = Object.fromEntries(TOPICS);
const SEC_ALL: [string, string][] = [["kana", "50音"], ["kanji", "漢字"], ["vocab", "單字"], ["grammar", "文法"], ["mock", "模擬題"], ["exam", "歷屆風格模考"], ["listen", "聽力"], ["song", "歌曲"]];
function qMeta(q: Q): { c: string; k: string[] } {
  const k: string[] = [...(q.tags ?? [])];
  let c = q.cat ?? "";
  const id = q.id;
  const parts = id.split(":");
  if (id.startsWith("kana:")) {
    (q.kana ?? []).forEach((ch: string) => { const r = KANA_ROW[ch]; if (r) k.push("row:" + r); });
    if (!c) c = "假名・" + (q.tag ?? "認讀").split(/[：:（]/)[0];
  } else if (id.startsWith("kanji:")) {
    const kk = parts[1] ?? "";
    [...kk].filter((ch: string) => KANJI_BY.has(ch)).forEach((ch: string) => k.push("kj:" + ch));
    if (!c) c = parts[2] === "m" ? "漢字・意思" : parts[2] === "w" ? "漢字・寫法" : "漢字・讀音";
  } else if (id.startsWith("vocab:")) {
    const v = VOCAB_BY_ID[parts[1] ?? ""];
    if (v) { k.push("v:" + v.w, "vt:" + (TOPIC_OF[v.w] ?? "other")); [...v.w].filter((ch: string) => KANJI_BY.has(ch)).forEach((ch: string) => k.push("kj:" + ch)); }
    if (!c) c = parts[2] === "w2r" ? "單字・讀音" : parts[2] === "m2w" ? "單字・中→日" : parts[2] === "card" ? "單字・翻卡" : "單字・意思";
  } else if (id.startsWith("grammar:")) {
    const g = GRAM_BY_ID[parts[1] ?? ""];
    if (g) k.push("g:" + g);
    if (!c) c = (parts[1] ?? "").startsWith("cmp") ? "文法・易混比較" : (parts[1] ?? "").startsWith("o") ? "文法・句子排序" : "文法・填空";
  } else if (id.startsWith("mock:")) {
    if (!c) c = (q.tag ?? "").replace(/^模擬題・/, "");
  } else if (id.startsWith("listen:")) {
    if (!c) c = "聴解・" + (q.tag ?? "").split(/[：:]/)[0];
  } else if (id.startsWith("song") || id.startsWith("lyr")) {
    if (!c) c = "歌曲";
  }
  if (!c) c = q.tag ?? SEC_NAME[q.sec] ?? q.sec;
  return { c, k: [...new Set(k)] };
}
function logAttempt(q: Q, ok: boolean, pick?: string): void {
  const m = qMeta(q);
  const e: LogE = { t: Date.now(), i: q.id, s: q.sec, c: m.c, k: m.k, ok: ok ? 1 : 0 };
  if (!ok) { e.p = (pick ?? "").slice(0, 60); e.a = (q.options[q.answer] ?? "").slice(0, 60); }
  const log = DB.log ?? [];
  log.push(e);
  if (log.length > 5000) log.splice(0, log.length - 5000);
  DB.log = log;
  const wq = { ...(DB.wq ?? {}) };
  if (!ok && !q.noReview) {
    const { passage, ...rest } = q;
    wq[q.id] = passage && passage.length > 1500 ? rest : q;
    const ks = Object.keys(wq);
    if (ks.length > 150) delete wq[ks[0] ?? ""];
  } else if (ok && wq[q.id] && !(DB.wrong ?? []).some((w: WrongItem) => w.id === q.id)) delete wq[q.id];
  DB.wq = wq;
}
const SMALL_K: Record<string, string> = { ゃ: "や", ゅ: "ゆ", ょ: "よ", っ: "つ", ぁ: "あ", ぃ: "い", ぅ: "う", ぇ: "え", ぉ: "お" };
function deDaku(s: string): string {
  return s.normalize("NFD").replace(/[\u3099\u309a]/g, "").normalize("NFC");
}
function whyWrong(p: string, a: string): string {
  if (!p || !a || p === a) return "";
  const kanaOnly = (s: string) => /^[\u3041-\u309f\u30a0-\u30ffー]+$/.test(s);
  if (kanaOnly(p) && kanaOnly(a)) {
    if (deDaku(p) === deDaku(a)) return "濁音／半濁音混淆（゛゜）";
    if (p.replace(/っ/g, "") === a.replace(/っ/g, "")) return "促音「っ」有無";
    if (p.replace(/[うーい]/g, "") === a.replace(/[うーい]/g, "")) return "長音（う・い・ー）有無";
    const big = (s: string) => [...s].map((c: string) => SMALL_K[c] ?? c).join("");
    if (big(p) === big(a)) return "拗音大小字（ゃゅょ）";
    if (p.length === a.length && [...p].filter((c: string, i: number) => c !== a[i]).length === 1) return "讀音只差一個假名";
    return "讀音不熟";
  }
  if (p.length === a.length && p.length <= 6) {
    const d = [...p].map((c: string, i: number): [string, string] => [c, a[i] ?? ""]).filter((x: [string, string]) => x[0] !== x[1]);
    if (d.length === 1 && /[\u4e00-\u9fff]/.test(d[0]?.[0] ?? "")) return `漢字混淆：${d[0]?.[1]} ↔ ${d[0]?.[0]}（同音或形近）`;
  }
  const end = (s: string) => s.replace(/[。．、]/g, "").slice(-3);
  if (p.length < 16 && a.length < 16 && end(p) !== end(a) && /[\u3041-\u309f]/.test(p)) return "文法形式／接續不熟";
  return "意思或用法混淆";
}
function tagLabel(t: string): string {
  const [ty, ...r] = t.split(":");
  const v = r.join(":");
  return ty === "row" ? `假名 ${v}` : ty === "kj" ? `漢字 ${v}` : ty === "v" ? `單字 ${v}` : ty === "vt" ? `主題 ${TOPIC_NAME[v] ?? "其他"}` : ty === "g" ? `文法 ${v}` : v;
}
function agg<T extends string>(log: LogE[], key: (e: LogE) => T[]): { k: T; n: number; w: number }[] {
  const m = new Map<T, { n: number; w: number }>();
  log.forEach((e: LogE) => key(e).forEach((k: T) => { const x = m.get(k) ?? { n: 0, w: 0 }; x.n++; if (!e.ok) x.w++; m.set(k, x); }));
  return [...m.entries()].map(([k, x]: [T, { n: number; w: number }]) => ({ k, ...x }));
}
function AccRow(props: { label: string; n: number; w: number; onGo?: () => void; goLabel?: string }) {
  const t = useGrokTheme();
  const acc = props.n ? (props.n - props.w) / props.n : 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 6, alignItems: "center", fontSize: 13 }}>
      <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{props.label}</span>
          <span style={{ color: t.text.secondary, whiteSpace: "nowrap" }}>錯 {props.w}／{props.n}・{Math.round(acc * 100)}%</span>
        </div>
        <Bar v={acc} color={acc >= 0.8 ? t.text.success : acc >= 0.6 ? t.text.warning : t.text.danger} label={props.label} />
      </div>
      {props.onGo ? <Btn small label={props.goLabel ?? "練習"} onClick={props.onGo} /> : <span />}
    </div>
  );
}
function navTo(tab: string): void {
  window.dispatchEvent(new CustomEvent("n3nav", { detail: tab }));
}
function tagAction(tag: string): (() => void) | undefined {
  const [ty, ...r] = tag.split(":");
  const v = r.join(":");
  if (ty === "kj") return () => openKanji(v);
  if (ty === "g") { const i = GRAMMAR.findIndex((g: Gram) => g.pat === v); if (i >= 0) return () => { PENDING_GRAM = i; navTo("grammar"); }; }
  if (ty === "row") return () => { KANA_START = "weak5"; navTo("kana"); };
  if (ty === "v" || ty === "vt") return () => navTo("vocab");
  return undefined;
}
function MistakeAnalysis() {
  const t = useGrokTheme();
  const db = useDB();
  const [view, setView] = useState("sum");
  const [drill, setDrill] = useState<string[] | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { if (drill && topRef.current) topRef.current.scrollIntoView({ block: "start" }); }, [drill]);
  const log = db.log ?? [];
  const wrong = log.filter((e: LogE) => !e.ok);
  const bySec = agg(log, (e: LogE) => [e.s]).sort((a, b) => b.w / Math.max(1, b.n) - a.w / Math.max(1, a.n));
  const byCat = agg(log, (e: LogE) => [e.c]).filter((x) => x.w > 0).sort((a, b) => b.w - a.w || b.n - a.n);
  const byTag = agg(log, (e: LogE) => e.k).filter((x) => x.w > 0);
  const tagOf = (p: string) => byTag.filter((x) => x.k.startsWith(p)).sort((a, b) => (b.w - (b.n - b.w) * 0.5) - (a.w - (a.n - a.w) * 0.5)).slice(0, 8);
  const why = agg(wrong, (e: LogE) => { const w = whyWrong(plain(e.p ?? ""), plain(e.a ?? "")); return w ? [w.replace(/：.*/, "")] : []; }).sort((a, b) => b.n - a.n);
  // 最弱 10 題：錯的次數多、最近錯、之後沒答對
  const items = new Map<string, { w: number; r: number; last: number; e: LogE }>();
  log.forEach((e: LogE) => { const x = items.get(e.i) ?? { w: 0, r: 0, last: 0, e }; if (e.ok) x.r++; else { x.w++; x.e = e; x.last = e.t; } items.set(e.i, x); });
  const weakest = [...items.entries()].filter(([, x]) => x.w > 0 && x.w > x.r - 1).map(([i, x]) => ({ i, ...x, sc: x.w * 2 - x.r + (Date.now() - x.last < 7 * 864e5 ? 1 : 0) })).sort((a, b) => b.sc - a.sc).slice(0, 10);
  // 趨勢：最近 6 週各區正確率
  const wk = (ts: number) => Math.floor((Date.now() - ts) / (7 * 864e5));
  const weeks = [5, 4, 3, 2, 1, 0];
  const trend = SEC_ALL.map(([s, nm]: [string, string]) => ({ s, nm, v: weeks.map((w: number) => { const xs = log.filter((e: LogE) => e.s === s && wk(e.t) === w); return xs.length ? { n: xs.length, a: xs.filter((e: LogE) => e.ok).length / xs.length } : null; }) })).filter((x) => x.v.some(Boolean));
  const exams = (db.exams ?? []).slice(-8);
  // 建議
  const rec: { txt: string; go?: () => void; gl?: string }[] = [];
  if (log.length < 30) rec.push({ txt: `目前只有 ${log.length} 筆作答紀錄，多做一些題目（30 題以上）分析才會準。` });
  const worstSec = bySec.find((x) => x.n >= 10 && x.w / x.n > 0.3);
  if (worstSec) rec.push({ txt: `「${SEC_NAME[worstSec.k as Sec] ?? worstSec.k}」正確率 ${Math.round((1 - worstSec.w / worstSec.n) * 100)}%，是目前最弱的區塊，建議每天先做 10 題。`, go: () => navTo(worstSec.k === "exam" ? "mock" : worstSec.k), gl: "去練習" });
  const w0 = why[0];
  if (w0 && w0.n >= 3) {
    const tip: Record<string, string> = { "濁音／半濁音混淆（゛゜）": "讀音時特別注意 か／が、た／だ、は／ば／ぱ；用「50音 › 濁音・拗音」練習。", "促音「っ」有無": "小「っ」要停頓一拍（がっこう、きって）；用「50音 › 促音・長音」練習。", "長音（う・い・ー）有無": "長音要拉長一拍（こうこう、えいが）；音讀「〜う」「〜い」常是長音。", "拗音大小字（ゃゅょ）": "きゃ／きや 意思完全不同；拗音是一拍。", "漢字混淆": "同音或形近漢字多，記「詞」不要只記「字」：到漢字頁看例詞與同音讀漢字。", "文法形式／接續不熟": "注意接續（辭書形／た形／ない形／名詞＋の），到「文法一覽」看接續說明。", "意思或用法混淆": "看解說中的對比，並把錯題加到翻卡複習。", "讀音不熟": "漢字讀音不熟：用「漢字 › 漢字測驗 › 例詞讀音」與單字記憶卡。", "讀音只差一個假名": "讀音只差一個假名：唸出聲來比較，注意清濁與長短。" };
    rec.push({ txt: `最常見的錯誤類型是「${w0.k}」（${w0.n} 次）。${tip[w0.k] ?? ""}` });
  }
  const wr = tagOf("row:")[0];
  if (wr && wr.w >= 3) rec.push({ txt: `假名「${wr.k.slice(4)}」錯了 ${wr.w} 次，先用「🎯 最弱 5 字」集中練。`, go: tagAction(wr.k), gl: "練最弱 5 字" });
  const wg = tagOf("g:")[0];
  if (wg && wg.w >= 2) rec.push({ txt: `文法「${wg.k.slice(2)}」錯了 ${wg.w} 次，建議重看接續和例句，再做填空。`, go: tagAction(wg.k), gl: "練這個文法" });
  const wkj = tagOf("kj:")[0];
  if (wkj && wkj.w >= 2) rec.push({ txt: `漢字「${wkj.k.slice(3)}」錯了 ${wkj.w} 次，看筆順、部件與例詞。`, go: tagAction(wkj.k), gl: "看這個漢字" });
  const le = exams[exams.length - 1];
  if (le) {
    const nm = ["言語知識", "読解", "聴解"];
    const lo = le.p.map((v: number, i: number): [number, number] => [v, i]).filter((x) => x[0] < 19);
    rec.push({ txt: lo.length ? `最近一次模考：${lo.map((x) => `${nm[x[1]]} ${x[0]} 分`).join("、")}，低於單科合格線 19 分，要優先加強。` : le.tot >= 95 ? `最近一次模考 ${le.tot}/180，已達合格標準 95 分，試試下一回並縮短時間。` : `最近一次模考 ${le.tot}/180，距合格 95 分還差 ${95 - le.tot} 分。` });
  }
  const due = VOCAB.filter((v: Vocab) => { const s = db.vsrs[v.id]; return s && s.due <= dayNum(); }).length;
  if (due >= 20) rec.push({ txt: `單字記憶卡有 ${due} 張到期，先清掉到期卡，記憶效果最好。`, go: () => navTo("vocab"), gl: "去複習" });
  if (!rec.length) rec.push({ txt: "目前沒有明顯弱點，繼續保持！可以挑戰一回完整模考。" });
  const drillGen = useMemo(() => {
    if (!drill) return null;
    const qs = drill.map((i: string) => (DB.wq ?? {})[i]).filter(Boolean) as Q[];
    let n = 0;
    return (): Q => { const q = qs[n++ % Math.max(1, qs.length)] as Q; const opts = shuffle(q.options.map((o: string, j: number): [string, boolean] => [o, j === q.answer])); return { ...q, options: opts.map((x) => x[0]), answer: opts.findIndex((x) => x[1]) }; };
  }, [drill]);
  if (drill && drillGen) {
    return (
      <div ref={topRef} style={{ scrollMarginTop: 8 }}><Card title={`🎯 針對練習（${drill.length} 題）`}>
        <div style={{ marginBottom: 8 }}><Btn small label="← 回錯題分析" onClick={() => setDrill(null)} /></div>
        <QuizRunner gen={drillGen} total={drill.length * 2} />
      </Card></div>
    );
  }
  const canDrill = (ids: string[]) => ids.filter((i: string) => (db.wq ?? {})[i]);
  const allWeakIds = canDrill(weakest.map((x) => x.i));
  return (
    <Card title="🔍 錯題分析">
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ fontSize: 13, color: t.text.secondary }}>共 {log.length} 筆作答、答錯 {wrong.length} 次（從這個版本開始記錄；最多保留最近 5000 筆）</div>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>💡 學習建議</div>
          {rec.slice(0, 5).map((r, i: number) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", background: t.bg.subtle, borderRadius: 8, padding: "8px 10px", fontSize: 13, lineHeight: 1.6 }}>
              <span style={{ flex: 1, minWidth: 180 }}>{r.txt}</span>
              {r.go ? <Btn small label={r.gl ?? "練習"} onClick={r.go} /> : null}
            </div>
          ))}
        </div>
        <Chips small value={view} onChange={setView} options={[["sum", "最弱 10 題"], ["sec", "依區塊／題型"], ["tag", "依知識點"], ["why", "為什麼錯"], ["trend", "趨勢・模考"]]} />
        {view === "sum" ? (
          <div style={{ display: "grid", gap: 8 }}>
            {weakest.length ? (allWeakIds.length ? <div><Btn kind="primary" label={`🎯 一鍵練這 ${allWeakIds.length} 題`} onClick={() => setDrill(allWeakIds)} /></div> : null) : <Note>還沒有答錯的題目。</Note>}
            {weakest.map((x, n: number) => (
              <div key={x.i} style={{ border: `1px solid ${t.border.subtle}`, borderRadius: 10, padding: "8px 10px", display: "grid", gap: 4, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center" }}>
                  <span style={{ color: t.text.accent, fontSize: 12 }}>{n + 1}. {x.e.c}・錯 {x.w} 次／對 {x.r} 次</span>
                  {(db.wq ?? {})[x.i] ? <Btn small label="練這題" onClick={() => setDrill([x.i])} /> : null}
                </div>
                <div lang="ja" style={{ fontFamily: JA_FONT, whiteSpace: "pre-wrap", maxHeight: 66, overflow: "hidden" }}>{plain((db.wq ?? {})[x.i]?.review ?? (db.wq ?? {})[x.i]?.prompt ?? x.i)}</div>
                {x.e.p ? <div><span style={{ color: t.text.danger }}>你選：{plain(x.e.p)}</span>　<span style={{ color: t.text.success }}>正確：{plain(x.e.a ?? "")}</span></div> : null}
                {x.e.p ? <div style={{ color: t.text.secondary }}>可能原因：{whyWrong(plain(x.e.p), plain(x.e.a ?? ""))}</div> : null}
              </div>
            ))}
          </div>
        ) : null}
        {view === "sec" ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>各區塊</div>
            {bySec.map((x) => <AccRow key={x.k} label={SEC_ALL.find((y) => y[0] === x.k)?.[1] ?? x.k} n={x.n} w={x.w} onGo={x.k === "exam" ? () => navTo("mock") : () => navTo(x.k)} goLabel="前往" />)}
            <div style={{ fontWeight: 600, fontSize: 13, marginTop: 6 }}>各題型（錯最多的在前）</div>
            {byCat.slice(0, 20).map((x) => {
              const ids = canDrill([...new Set(wrong.filter((e: LogE) => e.c === x.k).map((e: LogE) => e.i))]).slice(0, 15);
              return <AccRow key={x.k} label={x.k} n={x.n} w={x.w} onGo={ids.length ? () => setDrill(ids) : undefined} goLabel={`練錯題 ${ids.length}`} />;
            })}
          </div>
        ) : null}
        {view === "tag" ? (
          <div style={{ display: "grid", gap: 10 }}>
            {[["g:", "文法點"], ["kj:", "漢字"], ["vt:", "單字主題"], ["v:", "單字"], ["row:", "假名行"]].map(([p, nm]: string[]) => {
              const xs = tagOf(p ?? "");
              return xs.length ? (
                <div key={p} style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{nm}</div>
                  {xs.map((x) => <AccRow key={x.k} label={tagLabel(x.k)} n={x.n} w={x.w} onGo={tagAction(x.k)} goLabel={p === "kj:" ? "看漢字" : "練習"} />)}
                </div>
              ) : null;
            })}
            {!byTag.length ? <Note>還沒有可以分類的錯題。</Note> : null}
          </div>
        ) : null}
        {view === "why" ? (
          <div style={{ display: "grid", gap: 10 }}>
            <Note>依你選的錯誤選項和正確答案比較，自動判斷錯誤類型。</Note>
            {why.map((x) => <AccRow key={x.k} label={x.k} n={x.n} w={x.n} />)}
            {wrong.slice(-12).reverse().map((e: LogE, i: number) => (
              <div key={i} style={{ fontSize: 13, borderTop: `1px solid ${t.border.subtle}`, paddingTop: 6 }}>
                <span style={{ color: t.text.secondary }}>{e.c}：</span>
                <span lang="ja" style={{ color: t.text.danger }}>{plain(e.p ?? "")}</span> → <span lang="ja" style={{ color: t.text.success }}>{plain(e.a ?? "")}</span>
                <span style={{ color: t.text.secondary }}>（{whyWrong(plain(e.p ?? ""), plain(e.a ?? ""))}）</span>
              </div>
            ))}
            {!why.length ? <Note>還沒有錯題。</Note> : null}
          </div>
        ) : null}
        {view === "trend" ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>最近 6 週正確率</div>
            <div style={{ display: "grid", gridTemplateColumns: "72px repeat(6, minmax(0, 1fr))", gap: 3, fontSize: 11, textAlign: "center" }}>
              <span />
              {weeks.map((w: number) => <span key={w} style={{ color: t.text.secondary }}>{w === 0 ? "本週" : `${w}週前`}</span>)}
              {trend.map((r) => [
                <span key={r.s} style={{ textAlign: "left", fontSize: 12 }}>{r.nm}</span>,
                ...r.v.map((c, j: number) => (
                  <span key={r.s + j} title={c ? `${c.n} 題` : ""} style={{ borderRadius: 4, padding: "5px 0", background: c ? (c.a >= 0.8 ? t.fill.successSubtle : c.a >= 0.6 ? t.fill.warningSubtle : t.fill.dangerSubtle) : "transparent", color: t.text.primary }}>{c ? Math.round(c.a * 100) : "·"}</span>
                )),
              ])}
            </div>
            {!trend.length ? <Note>還沒有資料。</Note> : null}
            <div style={{ fontWeight: 600, fontSize: 13, marginTop: 6 }}>模考成績紀錄（合格：總分 95、各科 19）</div>
            {exams.length ? exams.slice().reverse().map((x: ExamRes, i: number) => (
              <div key={i} style={{ fontSize: 13, display: "flex", gap: 8, flexWrap: "wrap", borderTop: `1px solid ${t.border.subtle}`, paddingTop: 6 }}>
                <span>{x.n ? `第${x.n}回` : "隨機模考"}</span>
                <span style={{ color: t.text.secondary }}>{new Date(x.t).toLocaleDateString("zh-TW")}</span>
                <b style={{ color: x.tot >= 95 && x.p.every((v: number) => v >= 19) ? t.text.success : t.text.danger }}>{x.tot}/180</b>
                <span>言語 {x.p[0]}・読解 {x.p[1]}・聴解 {x.p[2]}</span>
              </div>
            )) : <Note>還沒有完成的模考。</Note>}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
