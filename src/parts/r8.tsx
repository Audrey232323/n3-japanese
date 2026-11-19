/* ===== Round 8：學習紀錄圖表、每日目標 ===== */
function bestStreak(): number {
  const keys = Object.keys(DB.hist).filter((k: string) => (DB.hist[k] ?? 0) > 0).sort();
  let best = 0;
  let cur = 0;
  let prev = 0;
  for (const k of keys) {
    const p = k.split("-").map(Number);
    const n = Math.round(new Date(p[0] ?? 0, (p[1] ?? 1) - 1, p[2] ?? 1).getTime() / 86400000);
    cur = n - prev === 1 ? cur + 1 : 1;
    prev = n;
    best = Math.max(best, cur);
  }
  return Math.max(best, streakDays());
}
function ActivityPanel() {
  const t = useGrokTheme();
  const db = useDB();
  const days: { k: string; v: number; d: Date }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = dkey(d);
    days.push({ k, v: db.hist[k] ?? 0, d });
  }
  const mx = Math.max(10, ...days.map((x) => x.v));
  const goal = db.goal ?? 30;
  const todayN = days[days.length - 1]?.v ?? 0;
  const active = days.filter((x) => x.v > 0).length;
  const week = days.slice(23).reduce((s: number, x) => s + x.v, 0);
  const kjDone = KANJI.filter((k: Kanji) => (db.kj[k.k]?.c ?? 0) >= 2).length;
  const vs = Object.values(db.vsrs);
  const kanaM = ALL_KANA.filter((k: Kana) => mastery(k.h) >= 0.8 && mastery(k.k) >= 0.8).length;
  return (
    <Card title="📊 學習紀錄">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6, textAlign: "center", fontSize: 12, color: t.text.secondary }}>
        {[["🔥 連續", `${streakDays()} 天`], ["🏆 最長", `${bestStreak()} 天`], ["📅 30天內", `${active} 天`], ["本週", `${week} 題`]].map(([a, b]: string[]) => (
          <div key={a} style={{ background: t.bg.subtle, borderRadius: 8, padding: "6px 2px" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: t.text.primary }}>{b}</div>
            {a}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 13 }}>
          <span>🎯 每日目標：今天 {todayN}／{goal} 題{todayN >= goal ? " ✅ 達成！" : ""}</span>
          <Chips small value={String(goal)} onChange={(v: string) => { DB.goal = Number(v); commit(); }} options={[["20", "20"], ["30", "30"], ["50", "50"], ["100", "100"]]} />
        </div>
        <Bar v={todayN / goal} color={todayN >= goal ? t.text.success : t.text.accent} label="今日目標進度" />
      </div>
      <div aria-label="最近 30 天每日答題數" style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 84, marginTop: 14, position: "relative" }}>
        <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 16 + (Math.min(goal, mx) / mx) * 60, borderTop: `1px dashed ${t.text.success}`, opacity: 0.7 }} />
        {days.map((x, i: number) => (
          <div key={x.k} title={`${x.k}：${x.v} 題`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", minWidth: 0 }}>
            <div style={{ width: "100%", height: `${(Math.min(x.v, mx) / mx) * 60}px`, minHeight: x.v ? 3 : 1, background: x.v >= goal ? t.text.success : x.v ? t.text.accent : t.border.subtle, borderRadius: 2 }} />
            <span style={{ fontSize: 9, color: t.text.secondary, height: 14, lineHeight: "14px" }}>{i % 7 === 1 || i === 29 ? (i === 29 ? "今" : `${x.d.getMonth() + 1}/${x.d.getDate()}`) : ""}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: t.text.secondary, marginTop: 4 }}>綠色＝達到每日目標；虛線＝目標線。</div>
      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>📈 掌握進度</div>
        {[
          ["假名（平＋片都 80%+）", kanaM, ALL_KANA.length],
          ["N3 漢字（答對 2 次以上）", kjDone, KANJI.length],
          ["單字記憶卡（已學）", vs.length, VOCAB.length],
          ["單字記憶卡（精熟 21 天+）", vs.filter((x) => x.iv >= 21).length, VOCAB.length],
        ].map(([l, v, n]: (string | number)[]) => (
          <div key={String(l)} style={{ display: "grid", gap: 3 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span>{l}</span><span>{v}／{n}</span></div>
            <Bar v={Number(v) / Number(n)} color={t.text.accent} label={String(l)} />
          </div>
        ))}
      </div>
    </Card>
  );
}
