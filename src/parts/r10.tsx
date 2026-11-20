/* ===== Round 10：12/6 N3 特訓、題型攻略、★ 練習、讀解逐句中譯 ===== */
type R10Star = { q: string; o: string[]; e: string; tag: string; fq: string; fo: string[] };
type R10Q = { cat: string; pid: string; q: string; o: string[]; e: string; fq: string; fo: string[] };
type R10Data = { star: R10Star[]; ps: Record<string, string>; zh: Record<string, string[]>; rq: R10Q[] };
const R10D = R10_JSON as R10Data;

/* ---- 深層連結：goDeep(分頁, 子模式, 捲到的元素 id) ---- */
const DEEP: Record<string, string> = {};
let DEEP_SCROLL = "";
function takeDeep(tab: string): string | null {
  const v = DEEP[tab];
  delete DEEP[tab];
  return v ?? null;
}
function goDeep(tab: string, sub?: string, scroll?: string): void {
  if (sub) DEEP[tab] = sub;
  DEEP_SCROLL = scroll ?? "";
  window.dispatchEvent(new CustomEvent("n3go", { detail: { tab, sub } }));
}

/* ---- 讀解：點句子看中文 ---- */
function splitSent(s: string): string[] {
  return (s.match(/[^。\n]+。?|\n/g) ?? []).filter((x: string) => x.trim() !== "");
}
const ZH_BY_TEXT: Map<string, string[]> = new Map();
function zhFor(text: string): string[] | undefined {
  if (!ZH_BY_TEXT.size) {
    Object.entries(R10D.zh).forEach(([k, v]: [string, string[]]) => {
      const src = PASSAGES[k] ?? R10D.ps[k];
      if (src) ZH_BY_TEXT.set(src, v);
    });
  }
  return ZH_BY_TEXT.get(text);
}
function TapPassage(props: { text: string }) {
  const t = useGrokTheme();
  const zh = zhFor(props.text);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [all, setAll] = useState(false);
  if (!zh) return <Rich text={props.text} />;
  const parts = props.text.match(/[^。\n]+。?|\n/g) ?? [];
  let si = -1;
  return (
    <span>
      <span style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6, fontFamily: t.font.family }}>
        <span style={{ fontSize: 12, color: t.text.secondary, alignSelf: "center" }}>👆 點任一句看中文翻譯</span>
        <Btn small on={all} label={all ? "隱藏全部中譯" : "顯示全部中譯"} onClick={() => { setAll(!all); setOpen({}); }} />
      </span>
      {parts.map((p: string, i: number) => {
        if (p === "\n") return <br key={i} />;
        if (!p.trim()) return <span key={i}>{p}</span>;
        si++;
        const k = si;
        const show = all || !!open[k];
        return (
          <span key={i}>
            <span
              role="button"
              tabIndex={0}
              aria-expanded={show}
              onClick={() => setOpen({ ...open, [k]: !open[k] })}
              onKeyDown={(e: { key: string }) => { if (e.key === "Enter" || e.key === " ") setOpen({ ...open, [k]: !open[k] }); }}
              style={{ cursor: "pointer", borderBottom: `1px dashed ${show ? t.fill.accent : t.border.default}`, background: show ? t.fill.accentSubtle : undefined, borderRadius: 3 }}
            >
              <RubyText text={p} />
            </span>
            {show ? (
              <span lang="zh-Hant" style={{ display: "block", fontFamily: t.font.family, fontSize: 13, lineHeight: 1.6, color: t.text.accent, margin: "2px 0 6px", whiteSpace: "normal" }}>
                {zh[k] ?? ""}
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}

/* ---- ★ 練習與書信讀解練習（QuizRunner 題目）---- */
function starQ(i: number): Q {
  const s = R10D.star[i] as R10Star;
  return {
    id: `r10s:${i}`,
    sec: "mock",
    cat: "文の組み立て",
    tags: s.tag ? s.tag.split(",").filter(Boolean) : [],
    tag: `★ 並べ替え練習 ${i + 1}/${R10D.star.length}`,
    prompt: `把四個選項排成正確的句子，★ 的位置應放入哪一個？\n${s.fq}`,
    ja: true,
    optJa: true,
    ...mc(s.fo[0] ?? "", s.fo.slice(1)),
    exp: s.e,
    review: s.q + "\n" + s.e,
  };
}
function readQ(i: number, pos: number, n: number): Q {
  const q = R10D.rq[i] as R10Q;
  return {
    id: `r10r:${i}`,
    sec: "mock",
    cat: q.cat,
    tag: `書信・通知讀解 ${pos + 1}/${n}`,
    prompt: `閱讀上面的文章，回答問題。\n${q.fq}`,
    passage: R10D.ps[q.pid],
    ja: true,
    optJa: true,
    ...mc(q.fo[0] ?? "", q.fo.slice(1)),
    exp: q.e,
    review: q.q + "\n" + q.e,
  };
}
function seqGen(n: number, f: (i: number) => Q, start = 0): () => Q {
  let i = start;
  return () => f(i++ % n);
}

/* ---- 書信・敬語小辭典 ---- */
const LETTER_WORDS: [string, string, string][] = [
  ["御中", "おんちゅう", "寫給公司、部門（不寫個人名字）時，接在名稱後：営業部 御中"],
  ["様", "さま", "寫給個人：木村様。「御中」和「様」不會一起用"],
  ["拝啓／敬具", "はいけい／けいぐ", "正式書信的開頭語／結尾語，成對出現（類似「敬啟者／敬上」）"],
  ["前略／草々", "ぜんりゃく／そうそう", "省略季節問候時的開頭／結尾（較不正式）"],
  ["いつもお世話になっております", "いつもおせわになっております", "商業信件固定開場白：一直以來承蒙照顧（不是主旨）"],
  ["と申します", "ともうします", "「と言います」的謙讓語：我叫…（用來找出寄信人是誰）"],
  ["拝見する", "はいけんする", "「見る」的謙讓語：（我）拜讀、看到"],
  ["〜ております", "〜ております", "「〜ています」的謙讓／鄭重說法：弊社は〜を紹介しております"],
  ["弊社／御社／貴社", "へいしゃ／おんしゃ／きしゃ", "弊社＝我方公司；御社＝貴公司（口語、郵件）；貴社＝貴公司（書面）。看懂誰是誰是解題關鍵"],
  ["つきましては", "つきましては", "因此、所以（後面通常就是「請求／主旨」）"],
  ["〜ていただけないでしょうか", "〜ていただけないでしょうか", "能否請您…？（非常客氣的請求；做動作的是「對方」）"],
  ["お〜いただけますと幸いです", "お〜いただけますとさいわいです", "如果您能…將不勝感激（請求）"],
  ["〜あてに", "〜あてに", "寄給…：弊社あてにお送りください＝請寄到我們公司"],
  ["恐れ入りますが", "おそれいりますが", "不好意思、麻煩您（請求前的緩衝語）"],
  ["誠に申し訳ございません", "まことにもうしわけございません", "非常抱歉（道歉）"],
  ["ご確認ください／ご連絡ください", "ごかくにんください／ごれんらくください", "請確認／請聯絡（題目常問「要做什麼」）"],
  ["よろしくお願いいたします", "よろしくおねがいいたします", "敬請關照（結尾客套，不是主旨）"],
];

/* ---- 題型攻略 ---- */
type GuideItem = { id: string; t: string; sec: string; n: string; what: string; how: string[]; trap: string; go: [string, string, string?, string?][] };
const GUIDE: GuideItem[] = [
  { id: "kanji", t: "漢字読み（漢字讀音）", sec: "文字・語彙", n: "8 題", what: "畫線的漢字詞怎麼讀。", how: ["先在心裡念一次，不看選項就決定讀音", "再比對：清音／濁音（は・ば）、長音（こう・こ）、促音（っ）、拗音（きょ・きよ）", "音讀詞（兩個漢字）多為音讀；送假名的動詞、形容詞多為訓讀"], trap: "選項通常只差一個假名：ゅ／ょ、う的有無、っ的有無。", go: [["📝 漢字読み 練習", "mock", "prac:漢字読み"], ["字 漢字讀音測驗", "kanji", "quiz:1-100"]] },
  { id: "hyoki", t: "表記（假名→漢字）", sec: "文字・語彙", n: "6 題", what: "畫線的平假名詞用哪個漢字寫。", how: ["先想意思，再找字", "注意形近字（間／問／聞）與同音字（会う／合う）", "動詞看送假名是否正確"], trap: "部件只差一點的形近字。", go: [["📝 表記 練習", "mock", "prac:表記"], ["字 讀音→寫法", "kanji", "quiz:1-100"]] },
  { id: "gokei", t: "語形成（N3 沒有）", sec: "文字・語彙", n: "0 題", what: "N3 不考「語形成」（那是 N2 以上的題型），可以略過。", how: ["把時間花在 文脈規定 和 言い換え類義"], trap: "—", go: [] },
  { id: "bunmyaku", t: "文脈規定（依前後文選詞）", sec: "文字・語彙", n: "11 題", what: "（　）裡放哪個詞最合適。", how: ["先讀整句，找出和空格搭配的詞（名詞＋動詞的固定搭配，例：ネクタイを しめる）", "副詞看語氣：わざわざ（特地）、ぜひ（務必）", "四個選項通常同詞性、意思相近，用「搭配」決定"], trap: "意思對但搭配錯（例：傘を「はく」）。", go: [["📝 文脈規定 練習", "mock", "prac:文脈規定"], ["📖 單字 SRS", "vocab", "srs"]] },
  { id: "iikae", t: "言い換え類義（換句話說）", sec: "文字・語彙", n: "5 題", what: "選意思最接近畫線部分的選項。", how: ["先把畫線詞翻成中文", "把每個選項代回句子，看意思是否不變", "常考：副詞（たびたび＝何度も）、慣用語（手間がかかる）"], trap: "相關但不同義的詞（くたびれた ≠ 眠くなった）。", go: [["📝 言い換え 練習", "mock", "prac:言い換え類義"]] },
  { id: "yoho", t: "用法（詞的正確用法）", sec: "文字・語彙", n: "5 題", what: "四個句子中，哪一句用法正確。", how: ["先確認詞的意思與詞性（自動詞／他動詞）", "錯的句子常是「意思像但用法不對」，代成中文就發現怪", "名詞題注意搭配的動詞（世話を する）"], trap: "把相似詞的用法套進來（止む vs 止まる）。", go: [["📝 用法 練習", "mock", "prac:用法"]] },
  { id: "bunpo", t: "文法形式の判断（文法填空）", sec: "文法", n: "13 題", what: "（　）中放入哪個文法最合適。", how: ["先看空格前面的接續形：辭書形／ます形／た形／名詞", "再看後文的語氣：推測、原因、逆接、願望", "易混文法用「比較」功能對照（ために／ように）"], trap: "接續不對（名詞＋ように ✗）。", go: [["📝 文法形式 練習", "mock", "prac:文法形式"], ["📐 文法填空", "grammar", "fill"], ["⚖️ 易混文法比較", "grammar", "cmp"]] },
  { id: "star", t: "文の組み立て（並べ替え・★）", sec: "文法", n: "5 題", what: "四個片段排成正確句子，回答 ★ 位置的片段。", how: ["見下方完整攻略與例題"], trap: "排好後要回答「★ 的那一格」，不是第一格。", go: [["★ 並べ替え練習（21 題）", "mock", "guide", "g-star"]] },
  { id: "bunsho", t: "文章の文法（文章中的文法）", sec: "文法", n: "5 題", what: "閱讀一篇短文，選出放進（1）～（5）的詞或文法。", how: ["看空格前後兩句的關係：順接（それで）、逆接（しかし）、補充（それに）", "注意文章的視角：寫作者自己 → くれる／もらう 的方向", "文體要一致（です・ます 體 或 だ 體）"], trap: "連接詞方向相反。", go: [["📚 第1–10回 模考", "mock", "sets"]] },
  { id: "tanbun", t: "内容理解（短文）", sec: "読解", n: "4 篇", what: "約 200 字的書信、通知、便條、短文，每篇 1 題。", how: ["見下方完整攻略（書信例題）"], trap: "主客顛倒、相反詞（輸入／輸出）。", go: [["✉️ 書信讀解攻略", "mock", "guide", "g-read"]] },
  { id: "chubun", t: "内容理解（中文）", sec: "読解", n: "2 篇×3 題", what: "約 350 字的隨筆或說明文，問畫線部分的理由、意思。", how: ["先看題目，標出畫線①②③", "答案通常就在畫線部分的前後一兩句", "「なぜか」找「から／ので／ため」"], trap: "選項內容在文中出現過，但不是畫線部分的答案。", go: [["📝 読解 練習", "mock", "prac:読解"]] },
  { id: "chobun", t: "内容理解（長文）", sec: "読解", n: "1 篇×4 題", what: "約 550 字，問筆者的想法、主張。", how: ["題目順序 ≈ 文章順序", "筆者主張多在最後一段（〜と思う／〜のではないだろうか）", "時間不夠時先讀每段第一句與最後一段"], trap: "一般論 vs 筆者自己的想法。", go: [["📚 第1–10回 模考", "mock", "sets"]] },
  { id: "joho", t: "情報検索（資訊檢索）", sec: "読解", n: "1 篇×2 題", what: "廣告、時刻表、報名表，找符合條件的資訊。", how: ["先讀題目的條件（星期、時間、人數、年齡）", "在表格中逐一刪去不符合的", "注意「※」「・」的附加條件（假日加價、需預約）"], trap: "漏看附註（土日料金、〜まで）。", go: [["📚 第1–10回 模考", "mock", "sets"]] },
  { id: "kadai", t: "聴解：課題理解", sec: "聴解", n: "6 題", what: "聽對話，判斷「接下來先做什麼」。", how: ["先看問題與選項（播放前有時間）", "注意「まず」「その前に」「〜てから」", "被否定的提議要刪掉（〜はいいよ、〜なくていい）"], trap: "對話中先提到的事 ≠ 先做的事。", go: [["🎧 課題理解", "listen", "k"]] },
  { id: "point", t: "聴解：ポイント理解", sec: "聴解", n: "6 題", what: "聽對話，抓理由或重點。", how: ["先看問題：問「どうして」就等「〜から／実は」", "前面說的多半是被否定的選項（でも、〜わけじゃない）", "「いちばん〜」後面才是答案"], trap: "對話中提到的四個選項都出現過。", go: [["🎧 ポイント理解", "listen", "p"]] },
  { id: "gaiyo", t: "聴解：概要理解", sec: "聴解", n: "3 題", what: "聽一段話（沒有先給題目），回答主旨或說話者的想法。", how: ["邊聽邊記關鍵字", "注意「でも」「ただ」之後的話", "主旨通常在開頭或結尾"], trap: "只聽到一個細節就選。", go: [["📚 模考聴解（概要理解）", "mock", "sets"]] },
  { id: "hatsuwa", t: "聴解：発話表現", sec: "聴解", n: "4 題", what: "看情境（正式考試有圖），選這時候該說的話。", how: ["判斷是「請求、道歉、道謝、提議、問候」哪一種", "對長輩、上司用敬語：お〜しましょうか（提議幫忙）", "〜てくれてありがとう（對方為我做）"], trap: "授受方向相反（〜てあげて ✗）。", go: [["📚 模考聴解（発話表現）", "mock", "sets"]] },
  { id: "sokuji", t: "聴解：即時応答", sec: "聴解", n: "9 題", what: "聽一句話，選最適當的回應（沒有文字）。", how: ["先判斷對方是在：請求／邀約／詢問／道歉／稱讚", "時態要對：問「何時來」→ 回答時間", "回應常用：いいですよ、おかげさまで、いえいえ"], trap: "選項重複對方的詞但答非所問。", go: [["🎧 即時応答", "listen", "r"]] },
];
function GuideLinks(props: { go: [string, string, string?, string?][] }) {
  if (!props.go.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
      {props.go.map(([l, tb, sub, sc]: [string, string, string?, string?]) => (
        <Btn key={l} small kind="primary" label={l} onClick={() => goDeep(tb, sub, sc)} />
      ))}
    </div>
  );
}
function Sum(props: { children: ReactNode }) {
  const t = useGrokTheme();
  return <summary style={{ cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center", fontWeight: 600, fontSize: 15, color: t.text.primary, listStylePosition: "inside" }}>{props.children}</summary>;
}
function ExamGuide() {
  const t = useGrokTheme();
  const [starOn, setStarOn] = useState(false);
  const [readOn, setReadOn] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const sStep: CSSProperties = { background: t.bg.subtle, borderRadius: 8, padding: "8px 10px", fontSize: 14, lineHeight: 1.8 };
  const ja: CSSProperties = { fontFamily: JA_FONT };
  const ex = R10D.rq.find((q: R10Q) => q.pid === "ex") as R10Q;
  const exOpts = ex.fo;
  const why = ex.e.split("\n");
  const others = R10D.rq.map((_: R10Q, i: number) => i).filter((i: number) => R10D.rq[i]?.pid !== "ex");
  const readGen = useMemo(() => seqGen(others.length, (i: number) => readQ(others[i] ?? 0, i, others.length)), []);
  const starGen = useMemo(() => seqGen(R10D.star.length, starQ), []);
  useEffect(() => {
    if (DEEP_SCROLL === "g-star") setStarOn(true);
  }, []);
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Card title="🧭 N3 題型攻略">
        <Note>N3 三科：言語知識（文字・語彙）30 分、言語知識（文法）・読解 70 分、聴解 40 分。點每個題型看「怎麼解、常見陷阱」，再用按鈕直接去練。</Note>
        <PassNote />
      </Card>
      {(["文字・語彙", "文法", "読解", "聴解"] as string[]).map((sec: string) => (
        <Card key={sec} title={`${sec === "文字・語彙" ? "🈶" : sec === "文法" ? "📐" : sec === "読解" ? "📖" : "🎧"} ${sec}`}>
          <div style={{ display: "grid", gap: 4 }}>
            {GUIDE.filter((g: GuideItem) => g.sec === sec).map((g: GuideItem) => (
              <details key={g.id} style={{ borderTop: `1px solid ${t.border.subtle}`, padding: "2px 0" }}>
                <Sum>{g.t}<span style={{ fontWeight: 400, fontSize: 12, color: t.text.secondary, marginLeft: 6 }}>{g.n}</span></Sum>
                <div style={{ fontSize: 14, lineHeight: 1.7, paddingBottom: 8 }}>
                  <div>{g.what}</div>
                  <ol style={{ margin: "6px 0", paddingLeft: 20 }}>{g.how.map((h: string) => <li key={h}>{h}</li>)}</ol>
                  <div style={{ color: t.text.danger, fontSize: 13 }}>⚠️ 常見陷阱：{g.trap}</div>
                  <GuideLinks go={g.go} />
                </div>
              </details>
            ))}
          </div>
        </Card>
      ))}
      <div id="g-star" />
      <Card title="★ 文の組み立て（並べ替え）完整攻略">
        <div style={{ display: "grid", gap: 8, fontSize: 14, lineHeight: 1.8 }}>
          <div>官網範例（jlpt.jp 公開的樣題）：</div>
          <div lang="ja" style={{ ...ja, fontSize: 17, background: t.bg.subtle, borderRadius: 8, padding: 10 }}>
            <RubyText text="先週[せんしゅう] ＿＿ ＿＿ ★ ＿＿ から、行[い]ってみませんか。" />
            <div style={{ fontSize: 15, marginTop: 4 }}>1 ばかりの　2 レストランが　3 オープンした　4 ある</div>
          </div>
          <div style={sStep}><b>步驟 1｜先看空格前後</b>：前面是「先週」（時間），後面是「から、行ってみませんか」（因為…要不要去看看）。所以四格要組成「理由」，最後接「から」。</div>
          <div style={sStep}><b>步驟 2｜找固定搭配</b>：<span style={ja}>「オープンした」＋「ばかりの」</span>＝<b>Vた＋ばかり</b>（剛…）。「ばかりの」後面一定接<b>名詞</b> → <span style={ja}>ばかりの レストラン</span>。</div>
          <div style={sStep}><b>步驟 3｜名詞修飾（關係子句）</b>：<span style={ja}>「先週オープンしたばかりの」</span>整段修飾<span style={ja}>「レストラン」</span>＝上週剛開幕的餐廳。</div>
          <div style={sStep}><b>步驟 4｜剩下的接在後面</b>：<span style={ja}>「レストランが」＋「ある」</span>＝<b>Nがある</b>（有…）；<span style={ja}>「ある」＋「から」</span>＝因為有…（から 表理由）。</div>
          <div style={{ ...sStep, background: t.fill.successSubtle }}>
            <b>完成</b>：<span lang="ja" style={ja}><RubyText text="先週[せんしゅう]オープンしたばかりのレストランがあるから、行[い]ってみませんか。" /></span>
            <br />順序 <b>3 → 1 → 2 → 4</b>；★ 在第 3 格 → <b>答案 2「レストランが」</b>
            <br />中譯：有一家上週剛開幕的餐廳，要不要去看看？
          </div>
          <div style={sStep}><b>★ 題萬用 5 步</b>：① 看空格前後決定句型 ② 先湊「固定搭配」（Vた＋ばかり、～ために、～ように） ③ 修飾語放名詞前（形容詞・連體修飾） ④ 助詞看接續（が／を／に 接名詞，から／ので 接句尾） ⑤ <b>寫下 1–4 的順序，再數到 ★ 那一格</b>（最常見的失分：答成第一格）。</div>
          <Btn kind="primary" label={starOn ? "收起 ★ 練習" : `▶ 開始 ★ 並べ替え練習（${R10D.star.length} 題原創）`} onClick={() => setStarOn(!starOn)} />
        </div>
      </Card>
      {starOn ? <QuizRunner key="r10star" gen={starGen} total={R10D.star.length} /> : null}
      <div id="g-read" />
      <Card title="✉️ 内容理解（短文）書信題完整攻略">
        <div style={{ display: "grid", gap: 8, fontSize: 14, lineHeight: 1.8 }}>
          <div style={sStep}><b>方法</b>：① <b>先看問題</b>（目的？要做什麼？）② 找出<b>誰寫給誰</b>：開頭的「〇〇 御中／様」是收件人，「と申します」和最後的署名是寄件人 ③ 標出<b>每一方做了什麼</b>（看到、想要、請求）④ 主旨多在「つきましては／〜ていただけないでしょうか」那一句 ⑤ 逐一刪去選項。</div>
          <div style={{ ...sStep, color: t.text.danger }}><b>常見陷阱</b>：主詞對調（誰寄給誰）、相反詞（輸入／輸出、借りる／貸す、送る／送ってもらう）、只出現在背景說明的內容。</div>
          <div>例題（原創，仿官方書信題形式）：</div>
          <div lang="ja" style={{ fontFamily: JA_FONT, background: t.bg.subtle, borderRadius: 8, padding: 12, lineHeight: 2, fontSize: 15, whiteSpace: "pre-line" }}>
            <TapPassage text={R10D.ps.ex ?? ""} />
          </div>
          <div lang="ja" style={{ ...ja, fontWeight: 600 }}><RubyText text={ex.fq} /></div>
          <div style={{ display: "grid", gap: 6 }}>
            {exOpts.map((o: string, i: number) => {
              const ok = i === 0;
              const sel = pick === i;
              return (
                <button key={i} type="button" onClick={() => setPick(i)} style={{ font: "inherit", textAlign: "left", cursor: "pointer", minHeight: 44, padding: "8px 12px", borderRadius: 10, border: `1.5px solid ${pick !== null && ok ? t.text.success : sel ? t.text.danger : t.border.default}`, background: pick !== null && ok ? t.fill.successSubtle : sel ? t.fill.dangerSubtle : t.bg.base, color: t.text.primary }}>
                  <span lang="ja" style={ja}>{i + 1}　<RubyText text={o} /></span>
                  {pick !== null ? <span style={{ display: "block", fontSize: 13, color: ok ? t.text.success : t.text.danger, marginTop: 2 }}>{why[i] ?? ""}</span> : null}
                </button>
              );
            })}
          </div>
          {pick === null ? <Note>先自己選一個，再看每個選項的刪去理由。（正式考試選項順序會打亂，這裡正解是 1）</Note> : null}
        </div>
      </Card>
      <Card title="📒 書信・敬語小辭典">
        <div style={{ display: "grid", gap: 6 }}>
          {LETTER_WORDS.map(([w, r, m]: [string, string, string]) => (
            <div key={w} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 6, alignItems: "center", borderTop: `1px solid ${t.border.subtle}`, paddingTop: 6 }}>
              <div style={{ minWidth: 0 }}>
                <div lang="ja" style={{ ...ja, fontSize: 16, fontWeight: 600, overflowWrap: "anywhere" }}>{w}<span style={{ fontSize: 12, fontWeight: 400, color: t.text.secondary, marginLeft: 6 }}>{r}</span></div>
                <div style={{ fontSize: 13, color: t.text.secondary, lineHeight: 1.6 }}>{m}</div>
              </div>
              <Speak text={w.split("／")[0] ?? w} />
            </div>
          ))}
        </div>
      </Card>
      <Btn kind="primary" label={readOn ? "收起書信讀解練習" : `▶ 書信・通知讀解練習（${others.length} 題原創，可點句看中文）`} onClick={() => setReadOn(!readOn)} />
      {readOn ? <QuizRunner key="r10read" gen={readGen} total={others.length} /> : null}
    </div>
  );
}

/* ---- 合格標準 ---- */
function PassNote() {
  const t = useGrokTheme();
  return (
    <div style={{ marginTop: 8, background: t.fill.warningSubtle, borderRadius: 8, padding: "8px 10px", fontSize: 13, lineHeight: 1.7 }}>
      <b>🎯 N3 合格標準</b>：總分 <b>≥ 95 / 180</b>，而且三個得分區<b>每一區都要 ≥ 19 / 60</b>：
      言語知識（文字・語彙・文法）／読解／聴解。任何一區未滿 19 分，總分再高也不合格。
    </div>
  );
}

/* ---- 12/6 N3 特訓：16 天計畫 ---- */
type BTask = { t: string; tab: string; sub?: string; sc?: string };
type BDay = { d: string; title: string; tasks: BTask[]; tip?: string };
const KANA10: BTask = { t: "🔤 假名 10 分：⏰ 複習佇列 → 🎯 最弱 5 字", tab: "kana", sub: "srs" };
const KANA10B: BTask = { t: "🔤 假名 10 分：片假名讀詞（每天保溫）", tab: "kana", sub: "kword" };
const GR = (a: number, b: number): BTask => ({ t: `📐 文法 第 ${a}–${b} 個：看意思、接續、例句（點 🔊 跟讀）`, tab: "grammar", sub: `list:${a}-${b}` });
const GFR = (a: number, b: number): BTask => ({ t: `✏️ 文法填空：只練第 ${a}–${b} 個，答對 8 成以上`, tab: "grammar", sub: `fill:${a}-${b}` });
const VS: BTask = { t: "📖 單字 SRS：新字 + 到期複習（約 20 分）", tab: "vocab", sub: "srs" };
const BKJ = (r: string, l: string): BTask => ({ t: `字 漢字 ${l}：看讀音 → 測驗`, tab: "kanji", sub: `quiz:${r}` });
const LS = (k: string, l: string): BTask => ({ t: `🎧 聽力 ${l} 15 題`, tab: "listen", sub: k });
const MK = (s: string): BTask => ({ t: `📝 ${s} 分項練習 15 題`, tab: "mock", sub: `prac:${s}` });
const MA: BTask = { t: "🔍 錯題分析：看最弱 10 題 → 一鍵針對練習", tab: "review", sc: "mistake-analysis" };
const BOOT: BDay[] = [
  { d: "2026-11-21", title: "片假名 ア～ナ行 100%", tasks: [{ t: "🔤 五十音表：片假名 ア～ナ行 點字聽發音", tab: "kana", sub: "table" }, { t: "🔤 片假名記憶法（形狀聯想）", tab: "kana", sub: "mnemo" }, { t: "🔤 認讀測驗：片假名 ア～ナ行 直到 100%", tab: "kana", sub: "quiz:kata:a,ka,sa,ta,na" }, { t: "🔤 易混淆字（シ／ツ、ソ／ン）", tab: "kana", sub: "conf" }, { t: "🧭 先讀題型攻略（知道考什麼）", tab: "mock", sub: "guide" }], tip: "片假名先求「看到就認得」，不用急著寫。" },
  { d: "2026-11-22", title: "片假名 ハ～ン行＋濁音・拗音", tasks: [{ t: "🔤 認讀測驗：片假名 ハ～ン行 直到 100%", tab: "kana", sub: "quiz:kata:ha,ma,ya,ra,wa,n" }, { t: "🔤 濁音・拗音（ガ・キャ…）", tab: "kana", sub: "voice" }, { t: "🔤 外來音 ファ・ティ", tab: "kana", sub: "ext" }, { t: "🔤 外來語片假名（コーヒー、レストラン…）", tab: "kana", sub: "loan" }, KANA10B] },
  { d: "2026-11-23", title: "平・片假名全部 100%", tasks: [{ t: "🔤 認讀測驗：混合（平＋片）全部行", tab: "kana", sub: "quiz:mix:a,ka,sa,ta,na,ha,ma,ya,ra,wa,n" }, { t: "🔤 促音・長音（おばさん／おばあさん）", tab: "kana", sub: "len" }, { t: "🔤 聽音選假名", tab: "kana", sub: "klisten" }, { t: "🔤 平↔片配對", tab: "kana", sub: "match" }, { t: "👾 魔王關（全部假名綜合）", tab: "kana", sub: "boss" }, { t: "📊 掌握度：每一行都要綠色", tab: "kana", sub: "dash" }] },
  { d: "2026-11-24", title: "文法 1–15＋★ 並べ替え技巧", tasks: [KANA10, GR(1, 15), GFR(1, 15), { t: "★ 並べ替え攻略＋21 題練習", tab: "mock", sub: "guide", sc: "g-star" }, VS, BKJ("1-100", "1–100"), LS("r", "即時応答")] },
  { d: "2026-11-25", title: "文法 16–30＋文脈規定", tasks: [KANA10B, GR(16, 30), GFR(16, 30), MK("文脈規定"), VS, BKJ("1-100", "1–100（複習）"), LS("k", "課題理解")] },
  { d: "2026-11-26", title: "文法 31–45＋讀解書信", tasks: [KANA10, GR(31, 45), GFR(31, 45), { t: "✉️ 書信讀解攻略＋敬語小辭典", tab: "mock", sub: "guide", sc: "g-read" }, MK("読解"), VS, BKJ("101-200", "101–200"), LS("p", "ポイント理解")] },
  { d: "2026-11-27", title: "文法 46–60＋言い換え・用法", tasks: [KANA10B, GR(46, 60), GFR(46, 60), MK("言い換え類義"), MK("用法"), VS, BKJ("201-300", "201–300"), LS("r", "即時応答")] },
  { d: "2026-11-28", title: "🏁 第1回 完整模考", tasks: [KANA10, { t: "📝 第1回 模考（3 節計時，照正式時間）", tab: "mock", sub: "sets" }, MA, { t: "📕 錯題本：翻卡複習今天的錯題", tab: "review" }], tip: "模考時不要查答案，照正式時間做完再看成績單。" },
  { d: "2026-11-29", title: "文法 61–75＋表記", tasks: [KANA10B, GR(61, 75), GFR(61, 75), MK("表記"), MK("文の組み立て"), VS, BKJ("301-367", "301–367"), LS("k", "課題理解")] },
  { d: "2026-11-30", title: "文法 76–90＋漢字読み", tasks: [KANA10, GR(76, 90), GFR(76, 90), MK("漢字読み"), VS, BKJ("weak", "答錯過的"), LS("p", "ポイント理解")] },
  { d: "2026-12-01", title: "文法 91–105＋易混文法", tasks: [KANA10B, GR(91, 105), GFR(91, 105), { t: "⚖️ 易混文法比較", tab: "grammar", sub: "cmp" }, MK("文法形式"), VS, BKJ("weak", "答錯過的"), LS("r", "即時応答")] },
  { d: "2026-12-02", title: "🏁 第2回 完整模考", tasks: [KANA10, { t: "📝 第2回 模考（3 節計時）", tab: "mock", sub: "sets" }, MA, { t: "📕 錯題本：翻卡複習", tab: "review" }] },
  { d: "2026-12-03", title: "文法 106–120＋弱點", tasks: [KANA10B, GR(106, 120), GFR(106, 120), MA, { t: "★ 並べ替え練習再做一輪", tab: "mock", sub: "guide", sc: "g-star" }, VS, LS("k", "課題理解")] },
  { d: "2026-12-04", title: "🏁 第3回 完整模考", tasks: [KANA10, { t: "📝 第3回 模考（3 節計時）", tab: "mock", sub: "sets" }, MA, { t: "📕 錯題本：翻卡複習", tab: "review" }] },
  { d: "2026-12-05", title: "只複習錯題＋早睡", tasks: [KANA10, { t: "📕 錯題本：翻卡把所有錯題看一遍", tab: "review" }, MA, { t: "📒 書信・敬語小辭典 看一遍", tab: "mock", sub: "guide", sc: "g-read" }, { t: "🧭 題型攻略 看一遍（記住每科時間）", tab: "mock", sub: "guide" }], tip: "不做新題目。準備准考證、身分證、鉛筆、橡皮擦、手錶（不能用手機看時間），早點睡。" },
  { d: "2026-12-06", title: "🎌 考試當天", tasks: [{ t: "🔤 出門前 5 分：片假名讀詞暖身", tab: "kana", sub: "kword" }], tip: "早點到考場。文字・語彙 30 分：不會的先猜、不要空白（答錯不扣分）。文法・読解 70 分：讀解約留 40 分，情報検索 先看題目。聴解 40 分：每題播放前先看選項；聽不懂就馬上選一個，專心聽下一題。三科每科都要 ≥19 分！" },
];
type BootSt = { done: Record<string, number>; open: boolean };
function bootLoad(): BootSt {
  try {
    const v = JSON.parse(localStorage.getItem("n3boot") ?? "null");
    if (v && typeof v === "object") return { done: v.done ?? {}, open: v.open !== false };
  } catch (_e) {
    /* 無法讀取 */
  }
  return { done: {}, open: true };
}
function bootSave(s: BootSt): void {
  try {
    localStorage.setItem("n3boot", JSON.stringify(s));
  } catch (_e) {
    /* 無法儲存 */
  }
}
function bootToday(): number {
  const td = today();
  const i = BOOT.findIndex((d: BDay) => d.d === td);
  if (i >= 0) return i;
  return td < (BOOT[0]?.d ?? "") ? -1 : BOOT.length;
}
function Bootcamp(props: { home: boolean }) {
  const t = useGrokTheme();
  const [st, setSt] = useState<BootSt>(bootLoad);
  const [all, setAll] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const [peek, setPeek] = useState(false);
  const ti = bootToday();
  const cur = sel ?? Math.max(0, Math.min(ti, BOOT.length - 1));
  const day = BOOT[cur] as BDay;
  const upd = (s: BootSt) => { setSt(s); bootSave(s); };
  const open = props.home ? st.open : peek;
  const toggle = (k: string) => { const d = { ...st.done }; if (d[k]) delete d[k]; else d[k] = Date.now(); upd({ ...st, done: d }); };
  const cnt = (i: number) => (BOOT[i]?.tasks ?? []).filter((_: BTask, j: number) => st.done[`${i}-${j}`]).length;
  const totalT = BOOT.reduce((a: number, d: BDay) => a + d.tasks.length, 0);
  const totalD = Object.keys(st.done).length;
  const daysLeft = Math.round((new Date(2026, 11, 6).getTime() - new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime()) / 86400000);
  const md = (s: string) => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`;
  const run = (k: string, x: BTask) => {
    if (!st.done[k]) toggle(k);
    if (x.tab === "review" && !x.sc) DEEP_SCROLL = "";
    goDeep(x.tab, x.sub, x.sc);
  };
  return (
    <div id="bootcamp" style={{ background: t.bg.elevated, border: `2px solid ${t.fill.accent}`, borderRadius: 12, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 700, fontSize: 17 }}>🔥 12/6 N3 特訓</div>
        <div style={{ fontSize: 13, color: t.text.secondary }}>{daysLeft > 0 ? `距離考試 ${daysLeft} 天` : daysLeft === 0 ? "今天考試，加油！" : "考試已結束"}・完成 {totalD}/{totalT}</div>
      </div>
      <div style={{ marginTop: 8 }}><Bar v={totalT ? totalD / totalT : 0} color={t.text.success} /></div>
      {ti < 0 ? <Note>特訓從 11/21 開始，可以先看第 1 天的任務。</Note> : null}
      <button type="button" aria-expanded={open} onClick={() => (props.home ? upd({ ...st, open: !st.open }) : setPeek(!peek))} style={{ ...btnStyle(t, "plain", false, true), width: "100%", justifyContent: "space-between", marginTop: 8, borderRadius: 10 }}>
        <span style={{ whiteSpace: "normal", textAlign: "left" }}><b>第 {cur + 1} 天（{md(day.d)}）{cur === ti ? "・今天" : ""}</b>　{day.title}</span>
        <span>{cnt(cur)}/{day.tasks.length} {open ? "▲" : "▼"}</span>
      </button>
      {open ? (
        <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
          {day.tasks.map((x: BTask, j: number) => {
            const k = `${cur}-${j}`;
            const done = !!st.done[k];
            return (
              <div key={k} style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr)", gap: 6, alignItems: "stretch" }}>
                <button type="button" role="checkbox" aria-checked={done} aria-label={`完成：${x.t}`} onClick={() => toggle(k)} style={{ font: "inherit", fontSize: 20, minHeight: 44, minWidth: 44, borderRadius: 10, cursor: "pointer", border: `1.5px solid ${done ? t.text.success : t.border.default}`, background: done ? t.fill.successSubtle : t.bg.base, color: t.text.success }}>{done ? "✓" : ""}</button>
                <button type="button" onClick={() => run(k, x)} style={{ font: "inherit", fontSize: 14, textAlign: "left", minHeight: 44, padding: "8px 12px", borderRadius: 10, cursor: "pointer", border: `1px solid ${t.border.subtle}`, background: t.bg.base, color: done ? t.text.secondary : t.text.primary, textDecoration: done ? "line-through" : undefined, lineHeight: 1.5 }}>{x.t} <span style={{ color: t.text.accent }}>›</span></button>
              </div>
            );
          })}
          {day.tip ? <div style={{ fontSize: 13, lineHeight: 1.7, background: t.bg.subtle, borderRadius: 8, padding: "8px 10px" }}>💡 {day.tip}</div> : null}
          <PassNote />
          <Btn small label={all ? "收起 16 天計畫" : "📅 看 16 天完整計畫"} onClick={() => setAll(!all)} />
          {all ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 6 }}>
              {BOOT.map((d: BDay, i: number) => {
                const c = cnt(i), n = d.tasks.length;
                return (
                  <button key={d.d} type="button" aria-pressed={i === cur} onClick={() => { setSel(i === ti ? null : i); window.document.getElementById("bootcamp")?.scrollIntoView({ block: "start" }); }} style={{ font: "inherit", fontSize: 13, textAlign: "left", minHeight: 52, padding: "6px 10px", borderRadius: 10, cursor: "pointer", border: `${i === ti ? 2 : 1}px solid ${i === ti ? t.fill.accent : t.border.subtle}`, background: i === cur ? t.fill.accentSubtle : c >= n ? t.fill.successSubtle : t.bg.base, color: t.text.primary, lineHeight: 1.4 }}>
                    <b>{md(d.d)} 第 {i + 1} 天{i === ti ? "・今天" : ""}</b>
                    <span style={{ display: "block", color: t.text.secondary }}>{d.title}</span>
                    <span style={{ display: "block", fontSize: 12, color: c >= n ? t.text.success : t.text.secondary }}>{c >= n ? "✅ 完成" : `${c}/${n}`}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
