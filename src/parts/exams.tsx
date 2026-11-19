/* ===== Round 9：第1回～第10回 完整模考（原創，依 N3 正式題型、題數與時間） ===== */
type EQ = { cat: string; pid: string; q: string; o: string[]; e: string; tag: string; s?: string };
type ExamSet = { n: number; ready: boolean; ps: Record<string, string>; qs: EQ[] };
const EX_SPEC: [string, number, number][] = [
  ["漢字読み", 8, 0], ["表記", 6, 0], ["文脈規定", 11, 0], ["言い換え類義", 5, 0], ["用法", 5, 0],
  ["文法形式", 13, 1], ["文の組み立て", 5, 1], ["文章の文法", 5, 1], ["内容理解（短文）", 4, 1], ["内容理解（中文）", 6, 1], ["内容理解（長文）", 4, 1], ["情報検索", 2, 1],
  ["課題理解", 6, 2], ["ポイント理解", 6, 2], ["概要理解", 3, 2], ["発話表現", 4, 2], ["即時応答", 9, 2],
];
const EX_SEC: [string, number][] = [["言語知識（文字・語彙）", 30], ["言語知識（文法）・読解", 70], ["聴解", 40]];
const READ_CATS = ["内容理解（短文）", "内容理解（中文）", "内容理解（長文）", "情報検索"];
const EX_INSTR: Record<string, string> = {
  漢字読み: "【　】的詞怎麼讀？",
  表記: "【　】的詞用漢字怎麼寫？",
  文脈規定: "（　　）中放入哪個最合適？",
  言い換え類義: "選出意思和【　】最接近的選項。",
  文法形式: "（　　）中放入哪個最合適？",
  文の組み立て: "把四個選項排成正確的句子，★ 的位置應放入哪一個？",
  文章の文法: "閱讀上面的文章，選出放進空格最合適的選項。",
  "内容理解（短文）": "閱讀上面的文章，回答問題。",
  "内容理解（中文）": "閱讀上面的文章，回答問題。",
  "内容理解（長文）": "閱讀上面的文章，回答問題。",
  情報検索: "閱讀上面的資訊，回答問題。",
  課題理解: "🎧 先看問題，再聽對話。",
  ポイント理解: "🎧 先看問題，再聽對話，抓住理由或重點。",
  概要理解: "🎧 聽完整段話，回答問題（掌握說話者的主旨或想法）。",
  発話表現: "🎧 看情境，選出這時候應該說的話。",
  即時応答: "🎧 聽對方說的話，選出最適當的回應。（題目文字答完才顯示）",
};
const EXAMS: ExamSet[] = [];
EXAMS_RAW.split("\n").forEach((l: string) => {
  const f = l.split("|");
  if (f[0] === "E") EXAMS.push({ n: Number(f[1]), ready: f[2] === "1", ps: {}, qs: [] });
  const ex = EXAMS[EXAMS.length - 1];
  if (!ex) return;
  if (f[0] === "P") ex.ps[f[1] ?? ""] = (f[2] ?? "").replace(/⏎/g, "\n");
  else if (f[0] === "Q") ex.qs.push({ cat: f[1] ?? "", pid: f[2] === "-" ? "" : f[2] ?? "", q: (f[3] ?? "").replace(/⏎/g, "\n"), o: (f[4] ?? "").split("／"), e: (f[5] ?? "").replace(/⏎/g, "\n"), tag: f[6] ?? "" });
  else if (f[0] === "L") ex.qs.push({ cat: f[1] ?? "", pid: "", q: (f[2] ?? "").replace(/⏎/g, "\n"), s: f[3] ?? "", o: (f[4] ?? "").split("／"), e: (f[5] ?? "").replace(/⏎/g, "\n"), tag: f[6] ?? "" });
});
EXAMS.forEach((x: ExamSet) => {
  const ord = (c: string) => EX_SPEC.findIndex((s: [string, number, number]) => s[0] === c);
  x.qs = x.qs.map((q: EQ, i: number): [EQ, number] => [q, i]).sort((a, b) => ord(a[0].cat) - ord(b[0].cat) || a[1] - b[1]).map((x2) => x2[0]);
});
function exQ(x: ExamSet, k: number): Q {
  const q = x.qs[k] as EQ;
  const listen = q.s !== undefined;
  const isR = q.cat === "即時応答";
  const head = q.cat === "用法" ? `下列哪一句「${q.q}」的用法最正確？` : `${EX_INSTR[q.cat] ?? ""}\n${q.q}`;
  const turns = (q.s ?? "").split("＃");
  return {
    id: `exam:${x.n}:${k}`,
    sec: "mock",
    cat: q.cat,
    tags: q.tag ? q.tag.split(",").filter(Boolean) : [],
    tag: `第${x.n}回・${q.cat}`,
    prompt: listen ? (isR ? EX_INSTR[q.cat] ?? "" : `${EX_INSTR[q.cat] ?? ""}\n${q.q}`) : head,
    passage: q.pid ? x.ps[q.pid] : undefined,
    ja: true,
    optJa: true,
    ...mc(q.o[0] ?? "", q.o.slice(1)),
    exp: q.e,
    tts: listen ? q.s : undefined,
    autoPlay: listen,
    reveal: listen ? turns.join("\n") : undefined,
    review: listen ? `${q.q}\n${turns.join("\n")}` : q.cat === "用法" ? head : q.pid ? `${q.q}` : q.q,
  };
}
function examSecs(x: ExamSet): ExSec[] {
  return EX_SEC.map(([name, min]: [string, number], si: number) => ({
    name,
    min,
    items: x.qs.map((q: EQ, k: number): [EQ, number] => [q, k]).filter(([q]) => (EX_SPEC.find((s) => s[0] === q.cat) ?? ["", 0, -1])[2] === si).map(([q, k]) => ({ cat: READ_CATS.includes(q.cat) ? "読解" : q.cat, id: `exam:${x.n}:${k}`, mk: () => exQ(x, k) })),
  }));
}
function ExamRun(props: { secs: ExSec[]; n: number; only: number; onExit: () => void }) {
  const t = useGrokTheme();
  const first = props.only >= 0 ? props.only : 0;
  const last = props.only >= 0 ? props.only : 2;
  const [si, setSi] = useState(first);
  const [phase, setPhase] = useState<"run" | "brk" | "done">("run");
  const [res, setRes] = useState<Record<string, boolean>>({});
  const [scale, setScale] = useState(1);
  const [end, setEnd] = useState(() => Date.now() + (props.secs[first]?.min ?? 30) * 60e3);
  const [now, setNow] = useState(() => Date.now());
  const idx = useRef(0);
  const saved = useRef(false);
  const begin = (i: number) => { idx.current = 0; setSi(i); setEnd(Date.now() + (props.secs[i]?.min ?? 30) * 60e3 * scale); setNow(Date.now()); setPhase("run"); };
  const finish = () => setPhase(si >= last ? "done" : "brk");
  useEffect(() => {
    if (phase !== "run") return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [phase]);
  useEffect(() => { if (phase === "run" && now >= end) setPhase(si >= last ? "done" : "brk"); }, [now, phase, end, si]);
  const gen = useMemo(() => {
    const items = props.secs[si]?.items ?? [];
    return (): Q => (items[Math.min(idx.current, Math.max(0, items.length - 1))] as ExItem).mk();
  }, [si]);
  const sec = props.secs[si] as ExSec;
  const grp = (f: (s: number, it: ExItem) => boolean) => {
    let n = 0;
    let c = 0;
    props.secs.forEach((x: ExSec, s: number) => x.items.forEach((it: ExItem) => { if (f(s, it)) { n++; if (res[`${s}|${it.id}`]) c++; } }));
    return { n, c, p: n ? Math.round((c / n) * 60) : 0 };
  };
  const parts: [string, { n: number; c: number; p: number }][] = [
    ["言語知識（文字・語彙・文法）", grp((s: number, it: ExItem) => s === 0 || (s === 1 && it.cat !== "読解"))],
    ["読解", grp((s: number, it: ExItem) => s === 1 && it.cat === "読解")],
    ["聴解", grp((s: number) => s === 2)],
  ];
  const full = props.only < 0;
  const total = parts.reduce((a: number, x) => a + x[1].p, 0);
  const pass = total >= 95 && parts.every((x) => x[1].p >= 19);
  useEffect(() => {
    if (phase === "done" && full && !saved.current) {
      saved.current = true;
      DB.exams = [...(DB.exams ?? []), { n: props.n, t: Date.now(), p: parts.map((x) => x[1].p), tot: total }].slice(-50);
      commit();
    }
  }, [phase]);
  if (phase === "brk") {
    const nx = props.secs[si + 1];
    return (
      <Card title={`第 ${si + 1} 節結束：${sec.name}`}>
        <div style={{ display: "grid", gap: 10 }}>
          <div>作答 {Object.keys(res).filter((k: string) => k.startsWith(`${si}|`)).length}/{sec.items.length} 題、答對 {Object.keys(res).filter((k: string) => k.startsWith(`${si}|`) && res[k]).length} 題</div>
          <Note>{si === 0 ? "正式考試「文字・語彙」結束後直接進入「文法・読解」。" : "正式考試聴解前有休息時間。"}</Note>
          {nx ? <div><Btn kind="primary" label={`開始第 ${si + 2} 節：${nx.name}（${Math.round(nx.min * scale)} 分）`} onClick={() => begin(si + 1)} /></div> : null}
        </div>
      </Card>
    );
  }
  if (phase === "done") {
    const cats: { cat: string; n: number; c: number }[] = [];
    props.secs.forEach((x: ExSec, s: number) => x.items.forEach((it: ExItem) => {
      const cat = (it.mk().cat ?? it.cat);
      let e = cats.find((y) => y.cat === cat);
      if (!e) { e = { cat, n: 0, c: 0 }; cats.push(e); }
      e.n++;
      if (res[`${s}|${it.id}`]) e.c++;
    }));
    const shown = full ? parts : parts.filter((x) => x[1].n > 0);
    return (
      <Card title={`📊 第${props.n}回 成績單${full ? "" : "（單節）"}`}>
        <div style={{ display: "grid", gap: 10 }}>
          {shown.map(([nm, x]) => (
            <div key={nm} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 1fr 80px", gap: 8, alignItems: "center", fontSize: 14 }}>
              <span>{nm}</span>
              <Bar v={x.p / 60} color={x.p >= 19 ? t.text.success : t.text.danger} label={`${nm} ${x.p} 分`} />
              <span style={{ textAlign: "right" }}><b>{x.p}</b>/60（{x.c}/{x.n}）</span>
            </div>
          ))}
          {full ? <div style={{ fontSize: 20, fontWeight: 600, color: pass ? t.text.success : t.text.danger }}>總分 {total}/180　{pass ? "✅ 推估合格" : "❌ 未達合格標準"}</div> : null}
          <Note>合格標準：總分 95/180 以上，且三個得分區分各 19/60 以上。這裡用「答對率 × 60」粗估（正式考試是尺度得分）。</Note>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 6 }}>
            {cats.map((x) => (
              <div key={x.cat} style={{ border: `1px solid ${t.border.subtle}`, borderRadius: 8, padding: "6px 8px", fontSize: 13, borderLeft: `3px solid ${x.c / Math.max(1, x.n) >= 0.6 ? t.text.success : t.text.danger}` }}>
                <div style={{ color: t.text.secondary }}>{x.cat}</div>
                <div>{x.c}/{x.n}（{x.n ? Math.round((x.c / x.n) * 100) : 0}%）</div>
              </div>
            ))}
          </div>
          <Note>答錯的題已記入「成績 › 🔍 錯題分析」，可以一鍵針對練習。</Note>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn kind="primary" label="🔍 看錯題分析" onClick={() => navTo("review")} />
            <Btn label="← 回模考列表" onClick={props.onExit} />
          </div>
        </div>
      </Card>
    );
  }
  const rem = end - now;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ position: "sticky", top: 0, zIndex: 2, background: t.bg.base, paddingBottom: 4 }}>
        <Card style={{ padding: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>第{props.n}回・{sec.name}</span>
            <span role="timer" aria-label={`剩餘時間 ${mmss(rem)}`} style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: rem < 5 * 60e3 ? t.text.danger : t.text.primary }}>⏱ {mmss(rem)}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn small label={scale === 1 ? "時間：正式" : "時間：減半"} onClick={() => { const ns = scale === 1 ? 0.5 : 1; setScale(ns); setEnd(Date.now() + rem * (ns / scale)); }} />
              <Btn small label="交卷" onClick={finish} />
            </div>
          </div>
          <div style={{ marginTop: 6 }}><Bar v={rem / ((sec.min || 1) * 60e3 * scale)} color={rem < 5 * 60e3 ? t.text.danger : t.text.accent} label="剩餘時間" /></div>
        </Card>
      </div>
      <QuizRunner key={`x${props.n}s${si}`} gen={gen} total={sec.items.length} onResult={(q: Q, ok: boolean) => { idx.current++; setRes((r: Record<string, boolean>) => ({ ...r, [`${si}|${q.id}`]: ok })); }} onDone={finish} />
    </div>
  );
}
function ExamSets() {
  const t = useGrokTheme();
  const db = useDB();
  const [run, setRun] = useState<{ n: number; only: number } | null>(null);
  const ready = EXAMS.filter((x: ExamSet) => x.ready);
  if (run) {
    const x = EXAMS.find((y: ExamSet) => y.n === run.n) as ExamSet;
    return <ExamRun key={`${run.n}-${run.only}`} secs={examSecs(x)} n={x.n} only={run.only} onExit={() => setRun(null)} />;
  }
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <Card>
        <div style={{ fontSize: 14, lineHeight: 1.7 }}>
          📚 第1回～第{EXAMS.length}回 完整模考：每回 102 題，依 JLPT N3 正式題型與題數：
          <br />① 文字・語彙 35 題／30 分　② 文法・読解 39 題／70 分　③ 聴解 28 題／40 分（語音朗讀，男聲低、女聲高）
        </div>
        <Note>全部為原創模擬題（非官方考古題，官方試題有著作權）。每題附中文解說；成績以 180 分制估算並記入錯題分析。</Note>
      </Card>
      {EXAMS.map((x: ExamSet) => {
        const hist = (db.exams ?? []).filter((r: ExamRes) => r.n === x.n);
        const best = hist.reduce((a: number, r: ExamRes) => Math.max(a, r.tot), -1);
        return (
          <Card key={x.n} style={{ padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>第{x.n}回 模擬試験</div>
                <div style={{ fontSize: 12, color: t.text.secondary }}>{x.ready ? `${x.qs.length} 題` : `準備中（${x.qs.length}/102 題）`}{best >= 0 ? `・最高 ${best}/180${best >= 95 ? " ✅" : ""}・考過 ${hist.length} 次` : ""}</div>
              </div>
              {x.ready ? <Btn kind="primary" label="▶ 開始（3 節計時）" onClick={() => setRun({ n: x.n, only: -1 })} /> : null}
            </div>
            {x.ready ? (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {EX_SEC.map(([nm, min]: [string, number], i: number) => <Btn key={i} small label={`只考 ${nm.replace("言語知識", "").replace(/[（）]/g, "") || nm}（${min} 分）`} onClick={() => setRun({ n: x.n, only: i })} />)}
              </div>
            ) : null}
          </Card>
        );
      })}
      {!ready.length ? <Note>模考題目製作中。</Note> : null}
    </div>
  );
}
