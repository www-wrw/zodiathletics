import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, Minus, Check, Trash2, RotateCcw, Flame, Shuffle,
  Trophy, X, Compass, Sparkles, PenLine, Gift, Dices, BookOpen, ScrollText,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Persistence — localStorage shim replacing the Claude artifact API  */
/*  (same get/set shape, so the rest of the app is untouched)          */
/* ------------------------------------------------------------------ */
const storage = {
  async get(key) {
    const v = localStorage.getItem(key);
    return v == null ? null : { key, value: v };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
    return { key, value };
  },
  async delete(key) {
    localStorage.removeItem(key);
    return { key, deleted: true };
  },
};

/* ------------------------------------------------------------------ */
/*  Visual tokens — antique celestial atlas: midnight indigo + brass   */
/* ------------------------------------------------------------------ */
const C = {
  ink:"#0A0F28", ink2:"#0E1433", card:"#171F47", cardHi:"#202A5C",
  line:"#33407C", gold:"#E4C572", goldDim:"#A78B45", rose:"#D79CB2",
  aqua:"#7FB7C4", bone:"#ECE5D2", muted:"#8E96C2",
};
const FONT_DISPLAY = "'Cormorant Garamond', Georgia, serif";
const FONT_UI = "'Inter', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace";

const PLACEMENTS = [
  { g:"☉", s:"♊", role:"Sun" }, { g:"♀", s:"♊", role:"Venus" },
  { g:"Asc", s:"♈", role:"Rising" }, { g:"☽", s:"♎", role:"Moon" },
  { g:"♂", s:"♉", role:"Mars" },
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DIFF = {
  easy:   { label: "Easy",   pts: 10, color: C.aqua },
  medium: { label: "Medium", pts: 25, color: C.gold },
  hard:   { label: "Hard",   pts: 50, color: C.rose },
};

/* Quests themed to the chart, each with lore + plain instructions */
const LIBRARY = [
  { title: "Venus Refresh", target: 4, unit: "sessions", difficulty: "easy",
    lore: "Venus, planet of pleasure and beauty, sits in restless Gemini in your chart — she falls for whatever is new and can't bear the same song twice. Honour her by letting every workout sound different.",
    how: "Start each session with a brand-new playlist, podcast, or show. Log one each time the soundtrack is fresh — four to complete.",
    why: "Pairing each workout with new media you actually want — temptation bundling — makes you far more likely to start and keep going." },
  { title: "Libra's Balance", target: 3, unit: "sessions", difficulty: "easy",
    lore: "Your Moon lives in Libra, the Scales — it only feels at peace when both sides are even. A body trained lopsided is a Libra Moon's quiet ache.",
    how: "Do a session built on both-sides work: single-arm rows, split lunges, anything left-then-right. Log one per balanced session — three to complete.",
    why: "Training each side on its own evens out strength imbalances and improves stability, which lowers injury risk." },
  { title: "Mercury on Foot", target: 3, unit: "errands", difficulty: "easy",
    lore: "Mercury is the winged messenger, but in your chart he's grounded in Taurus — he'd rather walk the message over than rush it. Errands become his slow, deliberate flights.",
    how: "Pick an errand you'd normally drive and travel it on foot instead. Log one per errand — three to complete.",
    why: "Attaching movement to errands you already run — habit stacking — turns activity into a default instead of one more task." },
  { title: "Sun Salute", target: 6, unit: "AM sessions", difficulty: "medium",
    lore: "The Sun is your core fire, and yours burns in curious Gemini. Catching early light feeds it before the day pulls your attention a hundred directions.",
    how: "Log any session you start before 10am. Six mornings to complete.",
    why: "Moving earlier protects the session from the day's interruptions, and a fixed time is what cements a habit." },
  { title: "Aries First Strike", target: 8, unit: "sprints", difficulty: "medium",
    lore: "Aries rises on your horizon — ruled by Mars, it's the warrior who moves first and asks later. Your opening move is always a charge.",
    how: "Finish a workout with one short, all-out sprint or interval burst. Log one per finisher — eight to complete.",
    why: "Short all-out bursts build cardio fitness efficiently and give the workout a clear, satisfying finish line." },
  { title: "Gemini Variety Pack", target: 5, unit: "types", difficulty: "medium",
    lore: "Gemini the Twins, your Sun sign, is famously two-minded and easily bored — sameness is the one true enemy. Keep the body guessing and the mind stays in the game.",
    how: "Across the week, do as many different kinds of movement as you can — row, walk, lift, stretch, cycle. Log each distinct type — five to complete.",
    why: "Mixing movement types spreads load across muscles and joints and keeps boredom — a top reason people quit — at bay." },
  { title: "Taurus Steady Burn", target: 120, unit: "min", difficulty: "medium",
    lore: "Mars in Taurus is the bull: never the fastest out of the gate, but impossible to stop once moving. This is your engine — slow, patient, relentless.",
    how: "Bank easy, conversational-pace cardio minutes (zone 2). Log minutes as you go — 120 to complete.",
    why: "Easy aerobic minutes build your endurance base with little fatigue, so the work stays sustainable week after week." },
  { title: "The Capricorn Climb", target: 100, unit: "floors", difficulty: "hard",
    lore: "Capricorn, where your Jupiter and Neptune sit, is the Sea-Goat who climbs the mountain no matter how long it takes. Jupiter only makes the summit bigger.",
    how: "Log flights of stairs or minutes on an incline. A hundred floors' worth to complete.",
    why: "Incline work taxes the legs and heart hard while staying low-impact — big effort, easy on the joints." },
  { title: "Saturn's Streak", target: 10, unit: "days", difficulty: "hard",
    lore: "Saturn is the lord of time and discipline, and in Aries he has one lesson for you: it's easy to start fiery, hard to keep going. Master that and the chain becomes unbreakable.",
    how: "Show up to move on consecutive days without missing one. Log a day at a time — ten in a row to complete.",
    why: "Consistency, not intensity, is the strongest predictor of long-term results, so the streak makes simply showing up the win." },
  { title: "Pluto's Odyssey", target: 42, unit: "km", difficulty: "hard",
    lore: "Pluto rules transformation through the depths, and in Sagittarius he changes you by sending you far. Distance is the crucible; you arrive a little remade.",
    how: "Rack up total distance any way you move — walking, rowing, cycling all count. Log distance as you go — 42 km to complete.",
    why: "A cumulative target lets any movement count, so even an off day still nudges you forward — progress over perfection." },
  { title: "Uranus Wildcard", target: 5, unit: "firsts", difficulty: "hard",
    lore: "Uranus is the lightning bolt, the great disruptor, and in Aquarius he adores the unconventional. He has no patience for the expected.",
    how: "Try a workout you have genuinely never done before. Log each true first — five to complete.",
    why: "Novel workouts boost motivation and expose you to new movement patterns, building more well-rounded fitness." },
];
const loreFor = (title) => LIBRARY.find((l) => l.title === title);

/* ------------------------------------------------------------------ */
/*  Seed                                                               */
/* ------------------------------------------------------------------ */
const seedQuest = (id, title, current) => {
  const l = loreFor(title);
  return { id, title, target: l.target, current, unit: l.unit, difficulty: l.difficulty, awarded: false, lore: l.lore, how: l.how, why: l.why };
};
const SEED = {
  quests: [
    seedQuest("q1", "Pluto's Odyssey", 12),
    seedQuest("q2", "Taurus Steady Burn", 35),
    seedQuest("q3", "Gemini Variety Pack", 2),
  ],
  jar: {
    points: 0,
    rewards: [
      { id: "rw1", label: "A fancy coffee or pastry", cost: 75 },
      { id: "rw2", label: "A new candle or playlist splurge", cost: 150 },
      { id: "rw3", label: "New workout fit or water bottle", cost: 300 },
      { id: "rw4", label: "A massage", cost: 500 },
      { id: "rw5", label: "A day-trip somewhere new", cost: 800 },
    ],
  },
  records: [
    { id: "r1", name: "Row distance", unit: "m", best: 1500, history: [{ v: 1500, d: "2026-06-02" }] },
    { id: "r2", name: "Goblet squat", unit: "lb", best: 45, history: [{ v: 45, d: "2026-06-04" }] },
  ],
  experiences: [
    "90s R&B playlist", "Fantasy audiobook", "True crime podcast",
    "A show you save just for rowing", "A language lesson",
  ],
  schedule: { Mon: "Strength", Tue: "Row", Wed: "Strength", Thu: "Easy row + a show", Fri: "Strength · chase a PR", Sat: "Long walk outside", Sun: "Rest" },
  logDays: [],
  expIndex: 0,
};

const migrate = (raw) => {
  const d = { ...SEED, ...raw };
  d.quests = (raw.quests || SEED.quests)
    .filter((q) => !/middle earth/i.test(q.title))
    .map((q) => {
      const l = loreFor(q.title);
      return { difficulty: "medium", awarded: false, lore: l && l.lore, how: l && l.how, why: l && l.why, ...q };
    });
  if (raw.jar && Array.isArray(raw.jar.rewards)) d.jar = raw.jar;
  else d.jar = { points: (raw.jar && raw.jar.points) || 0, rewards: SEED.jar.rewards };
  d.records = raw.records || SEED.records;
  d.experiences = raw.experiences || SEED.experiences;
  d.schedule = raw.schedule || SEED.schedule;
  d.logDays = raw.logDays || [];
  d.expIndex = raw.expIndex || 0;
  return d;
};

/* ------------------------------------------------------------------ */
/*  Date helpers                                                       */
/* ------------------------------------------------------------------ */
const dayKey = (dt = new Date()) => {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const calcStreak = (logDays) => {
  if (!logDays || !logDays.length) return 0;
  const set = new Set(logDays);
  let streak = 0;
  const d = new Date();
  if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (set.has(dayKey(d))) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
};
const prettyDate = (k) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

/* ------------------------------------------------------------------ */
/*  Orbit dial + jar visual                                            */
/* ------------------------------------------------------------------ */
function OrbitDial({ progress, complete, label, size = 78 }) {
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  const ticks = Array.from({ length: 36 });
  const stroke = complete ? C.rose : C.gold;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      {ticks.map((_, i) => {
        const a = (i / 36) * 2 * Math.PI - Math.PI / 2;
        const rin = r + 4.5, rout = i % 3 === 0 ? r + 8 : r + 6.5;
        return (<line key={i}
          x1={size / 2 + rin * Math.cos(a)} y1={size / 2 + rin * Math.sin(a)}
          x2={size / 2 + rout * Math.cos(a)} y2={size / 2 + rout * Math.sin(a)}
          stroke={C.line} strokeWidth={i % 3 === 0 ? 1.1 : 0.6} />);
      })}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.line} strokeWidth="3" opacity="0.55" />
      <circle className="ca-arc" cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={stroke} strokeWidth="3" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - p)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ filter: `drop-shadow(0 0 4px ${stroke}55)` }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fontFamily={FONT_MONO} fontSize="13" fill={complete ? C.rose : C.bone} fontWeight="600">
        {complete ? "✦" : label}
      </text>
    </svg>
  );
}
function JarVisual({ pct, full }) {
  const top = 26, bot = 84, left = 14, right = 56;
  const h = bot - top;
  const fillY = bot - h * Math.max(0, Math.min(1, pct));
  const liquid = full ? C.rose : C.gold;
  return (
    <svg width={62} height={94} viewBox="0 0 70 96" style={{ display: "block" }}>
      <defs><clipPath id="jarclip"><rect x={left} y={top} width={right - left} height={h} rx="9" /></clipPath></defs>
      <g clipPath="url(#jarclip)">
        <rect className="ca-fill" x={left} y={fillY} width={right - left} height={bot - fillY} fill={liquid} opacity="0.34" />
        <rect className="ca-fill" x={left} y={fillY} width={right - left} height="3" fill={liquid} opacity="0.75" />
      </g>
      <rect x={left} y={top} width={right - left} height={h} rx="9" fill="none" stroke={C.gold} strokeWidth="2" />
      <rect x={left + 3} y={top - 9} width={right - left - 6} height="9" rx="3" fill="none" stroke={C.gold} strokeWidth="2" />
      <text x="35" y={top + 13} textAnchor="middle" fontSize="11" fill={full ? C.bone : C.gold} opacity="0.85">✦</text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  UI atoms                                                           */
/* ------------------------------------------------------------------ */
const IconBtn = ({ onClick, children, title, tone = "line" }) => (
  <button onClick={onClick} title={title} aria-label={title} className="ca-iconbtn"
    style={{ border: `1px solid ${tone === "gold" ? C.goldDim : C.line}`, color: tone === "gold" ? C.gold : C.muted, background: "transparent" }}>
    {children}
  </button>
);
const Field = ({ value, onChange, onEnter, placeholder, type = "text", width }) => (
  <input value={value} type={type} inputMode={type === "number" ? "decimal" : undefined}
    placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
    onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(); }}
    className="ca-input" style={{ width: width || "100%" }} />
);
const Badge = ({ diff }) => {
  const m = DIFF[diff] || DIFF.medium;
  return (
    <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: 0.3, color: m.color,
      border: `1px solid ${m.color}66`, borderRadius: 999, padding: "2px 8px" }}>
      {m.label} · {m.pts}pt
    </span>
  );
};

/* ------------------------------------------------------------------ */
/*  Quest detail (lore + instructions)                                 */
/* ------------------------------------------------------------------ */
function QuestDetail({ quest, onClose }) {
  const m = DIFF[quest.difficulty] || DIFF.medium;
  return (
    <div className="ca-overlay" style={{ zIndex: 30, alignItems: "center" }} onClick={onClose}>
      <div className="ca-sheet" style={{ borderRadius: 20, maxHeight: "82vh", margin: "0 12px" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <Badge diff={quest.difficulty} />
          <IconBtn onClick={onClose} title="Close"><X size={16} /></IconBtn>
        </div>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 34, color: C.bone, margin: "4px 0 2px", fontWeight: 500, lineHeight: 1.02 }}>{quest.title}</h2>
        <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.5, color: C.gold, textTransform: "uppercase", margin: "14px 0 6px" }}>
          <ScrollText size={11} style={{ display: "inline", marginRight: 5, verticalAlign: -1 }} />The lore
        </div>
        <p style={{ fontFamily: FONT_DISPLAY, fontSize: 19, lineHeight: 1.42, color: C.bone, margin: 0 }}>
          {quest.lore || "A quest of your own making — write your own legend into the sky."}
        </p>
        {quest.why && (
          <div style={{ display: "flex", gap: 9, marginTop: 14, padding: "11px 13px", background: C.ink2, border: `1px solid ${C.line}`, borderRadius: 12 }}>
            <Sparkles size={15} color={C.aqua} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1.2, color: C.aqua, textTransform: "uppercase", marginBottom: 3 }}>Why it works for you</div>
              <div style={{ fontFamily: FONT_UI, fontSize: 13.5, lineHeight: 1.45, color: C.bone }}>{quest.why}</div>
            </div>
          </div>
        )}
        <div style={{ height: 1, background: C.line, margin: "18px 0", opacity: 0.55 }} />
        <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.5, color: C.rose, textTransform: "uppercase", marginBottom: 6 }}>What to do</div>
        <p style={{ fontFamily: FONT_UI, fontSize: 14, lineHeight: 1.5, color: C.bone, margin: 0 }}>
          {quest.how || `Log your progress toward ${quest.target} ${quest.unit}.`}
        </p>
        <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.muted, marginTop: 14 }}>
          Goal: {quest.target} {quest.unit} · worth {m.pts} pts
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Library sheet                                                      */
/* ------------------------------------------------------------------ */
function LibrarySheet({ onClose, addQuest, surprise, isActive, onInfo }) {
  const [filter, setFilter] = useState("all");
  const [t, setT] = useState(""); const [tg, setTg] = useState(""); const [u, setU] = useState("");
  const [diff, setDiff] = useState("medium");
  const list = LIBRARY.filter((l) => filter === "all" || l.difficulty === filter);
  const submit = () => {
    if (!t.trim() || !(+tg > 0)) return;
    addQuest({ title: t.trim(), target: +tg, unit: u.trim(), difficulty: diff });
    setT(""); setTg(""); setU("");
  };
  return (
    <div className="ca-overlay" onClick={onClose}>
      <div className="ca-sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: C.bone }}>Quest library</span>
          <IconBtn onClick={onClose} title="Close"><X size={16} /></IconBtn>
        </div>
        <button onClick={surprise} className="ca-primary" style={{ width: "100%", marginBottom: 14 }}>
          <Dices size={16} /> Surprise me with one
        </button>
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {["all", "easy", "medium", "hard"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className="ca-chip"
              style={{ cursor: "pointer", textTransform: "capitalize", color: filter === f ? C.bone : C.muted, borderColor: filter === f ? C.gold : C.line }}>
              {f}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map((q) => {
            const active = isActive(q.title);
            return (
              <div key={q.title} style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 12px", background: C.ink2 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT_UI, fontSize: 14, color: C.bone }}>{q.title}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                    <Badge diff={q.difficulty} />
                    <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.muted }}>{q.target} {q.unit}</span>
                  </div>
                </div>
                <IconBtn onClick={() => onInfo(q)} title="Read the lore"><ScrollText size={15} /></IconBtn>
                <button disabled={active} onClick={() => addQuest(q)} className={active ? "ca-ghost" : "ca-primary"}
                  style={{ flexShrink: 0, opacity: active ? 0.55 : 1, padding: "8px 12px" }}>
                  {active ? "Added" : <><Plus size={14} /> Add</>}
                </button>
              </div>
            );
          })}
        </div>
        <div style={{ height: 1, background: C.line, margin: "18px 0", opacity: 0.6 }} />
        <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.5, color: C.gold, textTransform: "uppercase", marginBottom: 10 }}>Build your own</div>
        <Field value={t} onChange={setT} placeholder="Name the quest" />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <Field value={tg} onChange={setTg} placeholder="Target" type="number" width={100} />
          <Field value={u} onChange={setU} placeholder="Unit (mi, lb…)" />
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {Object.keys(DIFF).map((k) => (
            <button key={k} onClick={() => setDiff(k)} className="ca-chip"
              style={{ flex: 1, justifyContent: "center", cursor: "pointer", color: diff === k ? DIFF[k].color : C.muted, borderColor: diff === k ? DIFF[k].color : C.line }}>
              {DIFF[k].label} · {DIFF[k].pts}
            </button>
          ))}
        </div>
        <button onClick={submit} className="ca-primary" style={{ width: "100%", marginTop: 12 }}>
          <Plus size={16} /> Add to my board
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quests screen                                                      */
/* ------------------------------------------------------------------ */
function QuestsScreen({ data, set }) {
  const [sheet, setSheet] = useState(false);
  const [detail, setDetail] = useState(null);
  const [step, setStep] = useState({});
  const [editJar, setEditJar] = useState(false);
  const [claimFlash, setClaimFlash] = useState(null);
  const [rwLabel, setRwLabel] = useState(""); const [rwCost, setRwCost] = useState("");

  const update = (id, delta) => set((d) => {
    let add = 0;
    const quests = d.quests.map((q) => {
      if (q.id !== id) return q;
      const current = Math.max(0, +(q.current + delta).toFixed(2));
      let awarded = q.awarded;
      if (current >= q.target && !awarded) { add += (DIFF[q.difficulty] || DIFF.medium).pts; awarded = true; }
      return { ...q, current, awarded };
    });
    const jar = add ? { ...d.jar, points: d.jar.points + add } : d.jar;
    return { ...d, quests, jar };
  });
  const remove = (id) => set((d) => ({ ...d, quests: d.quests.filter((q) => q.id !== id) }));
  const reset = (id) => set((d) => ({ ...d, quests: d.quests.map((q) => (q.id === id ? { ...q, current: 0, awarded: false } : q)) }));

  const addQuest = (q) => set((d) => ({ ...d, quests: [...d.quests, { id: "q" + Date.now() + Math.floor(Math.random() * 999), current: 0, awarded: false, ...q }] }));
  const isActive = (title) => data.quests.some((q) => q.title === title);
  const surprise = () => {
    const pool = LIBRARY.filter((l) => !isActive(l.title));
    if (!pool.length) return;
    addQuest(pool[Math.floor(Math.random() * pool.length)]);
  };

  const jar = data.jar;
  const rewards = [...jar.rewards].sort((a, b) => a.cost - b.cost);
  const next = rewards.find((r) => jar.points < r.cost);
  const pct = next ? jar.points / next.cost : 1;
  const claim = (r) => {
    if (jar.points < r.cost) return;
    setClaimFlash(r.label); setTimeout(() => setClaimFlash(null), 2600);
    set((d) => ({ ...d, jar: { ...d.jar, points: Math.max(0, d.jar.points - r.cost) } }));
  };
  const addReward = () => {
    if (!rwLabel.trim() || !(+rwCost > 0)) return;
    set((d) => ({ ...d, jar: { ...d.jar, rewards: [...d.jar.rewards, { id: "rw" + Date.now(), label: rwLabel.trim(), cost: +rwCost }] } }));
    setRwLabel(""); setRwCost("");
  };
  const removeReward = (id) => set((d) => ({ ...d, jar: { ...d.jar, rewards: d.jar.rewards.filter((r) => r.id !== id) } }));

  return (
    <div>
      <ScreenHead eyebrow="The board" title="Quests" sub="Missions, not chores. Tap the scroll to read each one's lore." />

      {/* Reward jar */}
      <div className="ca-card" style={{ marginBottom: 16, background: `linear-gradient(135deg, ${C.cardHi}, ${C.card})`, borderColor: !next ? C.rose : C.line }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <JarVisual pct={pct} full={!next} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1.5, color: C.gold, textTransform: "uppercase" }}>
                <Gift size={11} style={{ display: "inline", marginRight: 5, verticalAlign: -1 }} />Reward jar
              </span>
              <button onClick={() => setEditJar((s) => !s)} className="ca-ghost" style={{ padding: "5px 9px" }}>
                <PenLine size={12} /> {editJar ? "Done" : "Edit"}
              </button>
            </div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 22, color: C.bone, marginTop: 6 }}>
              {jar.points}<span style={{ color: C.muted, fontSize: 14 }}> pts banked</span>
            </div>
            <div style={{ fontFamily: FONT_UI, fontSize: 13, color: next ? C.muted : C.rose, marginTop: 3 }}>
              {next ? `Saving for ${next.label} — ${jar.points}/${next.cost}` : "Every treat is within reach ✦"}
            </div>
          </div>
        </div>
        {claimFlash && (
          <div className="ca-pr" style={{ marginTop: 12, color: C.rose }}>
            <Sparkles size={14} /> {claimFlash} — claimed. Go enjoy it.
          </div>
        )}
        <div style={{ height: 1, background: C.line, margin: "14px 0", opacity: 0.55 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rewards.map((r) => {
            const can = jar.points >= r.cost;
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0, fontFamily: FONT_UI, fontSize: 14, color: can ? C.bone : C.muted }}>{r.label}</div>
                <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: can ? C.gold : C.muted }}>{r.cost}</span>
                {editJar ? (
                  <IconBtn onClick={() => removeReward(r.id)} title="Remove reward"><X size={14} /></IconBtn>
                ) : (
                  <button onClick={() => claim(r)} disabled={!can} className={can ? "ca-primary" : "ca-ghost"}
                    style={{ padding: "7px 12px", opacity: can ? 1 : 0.5, background: can ? C.rose : undefined, color: can ? "#1a0d12" : undefined }}>
                    <Gift size={13} /> Claim
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {editJar && (
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Field value={rwLabel} onChange={setRwLabel} placeholder="New treat" />
            <Field value={rwCost} onChange={setRwCost} onEnter={addReward} placeholder="Cost" type="number" width={84} />
            <button onClick={addReward} className="ca-primary">Add</button>
          </div>
        )}
      </div>

      {/* Quests */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {data.quests.map((q) => {
          const done = q.current >= q.target;
          const s = step[q.id] ?? 1;
          return (
            <div key={q.id} className="ca-card" style={{ borderColor: done ? C.goldDim : C.line }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <OrbitDial progress={q.current / q.target} complete={done} label={`${Math.round((q.current / q.target) * 100)}`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: C.bone, lineHeight: 1.1 }}>{q.title}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    <Badge diff={q.difficulty} />
                    <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: done ? C.rose : C.muted }}>
                      {q.current} / {q.target} {q.unit}{done ? " ✦" : ""}
                    </span>
                  </div>
                </div>
                <IconBtn onClick={() => setDetail(q)} title="Read the lore"><ScrollText size={15} /></IconBtn>
              </div>
              {!done ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
                  <IconBtn onClick={() => update(q.id, -s)} title="Subtract"><Minus size={15} /></IconBtn>
                  <input value={s} type="number" inputMode="decimal"
                    onChange={(e) => setStep((p) => ({ ...p, [q.id]: e.target.value === "" ? "" : +e.target.value }))}
                    className="ca-input" style={{ width: 64, textAlign: "center" }} />
                  <button onClick={() => update(q.id, +s || 0)} className="ca-primary" style={{ flex: 1 }}>
                    <Plus size={15} /> Log {q.unit || "progress"}
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={() => reset(q.id)} className="ca-ghost" style={{ flex: 1 }}>
                    <RotateCcw size={14} /> Start fresh
                  </button>
                  <IconBtn onClick={() => remove(q.id)} title="Retire quest"><Trash2 size={15} /></IconBtn>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={() => setSheet(true)} className="ca-dashed" style={{ flex: 1 }}><BookOpen size={16} /> Quest library</button>
        <button onClick={surprise} className="ca-dashed" style={{ flex: 1 }}><Dices size={16} /> Surprise me</button>
      </div>

      {sheet && <LibrarySheet onClose={() => setSheet(false)} addQuest={addQuest} surprise={() => { surprise(); setSheet(false); }} isActive={isActive} onInfo={setDetail} />}
      {detail && <QuestDetail quest={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Records screen                                                     */
/* ------------------------------------------------------------------ */
function RecordsScreen({ data, set }) {
  const [adding, setAdding] = useState(false);
  const [n, setN] = useState(""); const [u, setU] = useState("");
  const [attempt, setAttempt] = useState({});
  const [flash, setFlash] = useState(null);

  const logAttempt = (id) => {
    const val = +attempt[id];
    if (!(val > 0)) return;
    set((d) => ({
      ...d,
      records: d.records.map((r) => {
        if (r.id !== id) return r;
        if (val > r.best) { setFlash(id); setTimeout(() => setFlash(null), 1600); }
        return { ...r, best: Math.max(r.best, val), history: [{ v: val, d: dayKey() }, ...r.history].slice(0, 8) };
      }),
    }));
    setAttempt((p) => ({ ...p, [id]: "" }));
  };
  const addRecord = () => {
    if (!n.trim()) return;
    set((d) => ({ ...d, records: [...d.records, { id: "r" + Date.now(), name: n.trim(), unit: u.trim(), best: 0, history: [] }] }));
    setN(""); setU(""); setAdding(false);
  };
  const remove = (id) => set((d) => ({ ...d, records: d.records.filter((r) => r.id !== id) }));

  return (
    <div>
      <ScreenHead eyebrow="You vs. you" title="Records" sub="No opponent but last week. Beat it by a hair." />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {data.records.map((r) => {
          const last = r.history[1]?.v;
          return (
            <div key={r.id} className="ca-card" style={{ borderColor: flash === r.id ? C.gold : C.line, transition: "border-color .4s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: C.bone, lineHeight: 1.1 }}>{r.name}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                    <Trophy size={13} color={C.gold} />
                    <span style={{ fontFamily: FONT_MONO, fontSize: 20, color: C.gold }}>{r.best || "—"}</span>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.muted }}>{r.unit} best</span>
                  </div>
                </div>
                <IconBtn onClick={() => remove(r.id)} title="Remove"><Trash2 size={14} /></IconBtn>
              </div>
              {flash === r.id && (<div className="ca-pr" style={{ marginTop: 10 }}><Sparkles size={14} /> New record. That counts.</div>)}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <Field value={attempt[r.id] ?? ""} onChange={(v) => setAttempt((p) => ({ ...p, [r.id]: v }))}
                  onEnter={() => logAttempt(r.id)} placeholder={`Today's ${r.unit || "number"}`} type="number" />
                <button onClick={() => logAttempt(r.id)} className="ca-primary">Log</button>
              </div>
              {r.history.length > 0 && (
                <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                  {r.history.map((h, i) => (
                    <span key={i} className="ca-chip" style={{ color: h.v >= r.best ? C.gold : C.muted, borderColor: h.v >= r.best ? C.goldDim : C.line }}>
                      {h.v}{r.unit} · {prettyDate(h.d)}
                    </span>
                  ))}
                </div>
              )}
              {last != null && (
                <div style={{ fontFamily: FONT_UI, fontSize: 12, color: C.muted, marginTop: 8 }}>Last time: {last}{r.unit}. Beat it by a hair.</div>
              )}
            </div>
          );
        })}
      </div>
      {adding ? (
        <div className="ca-card" style={{ marginTop: 14 }}>
          <Field value={n} onChange={setN} placeholder="Exercise (e.g. Deadlift)" />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Field value={u} onChange={setU} onEnter={addRecord} placeholder="Unit (lb, m, reps…)" />
            <button onClick={addRecord} className="ca-primary">Add</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="ca-dashed" style={{ marginTop: 14 }}><Plus size={16} /> Track a new lift</button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Today screen                                                       */
/* ------------------------------------------------------------------ */
function TodayScreen({ data, set }) {
  const todayName = DAYS[(new Date().getDay() + 6) % 7];
  const anchor = data.schedule[todayName];
  const streak = calcStreak(data.logDays);
  const loggedToday = data.logDays.includes(dayKey());
  const exp = data.experiences[data.expIndex % Math.max(1, data.experiences.length)] || "—";
  const [newExp, setNewExp] = useState("");
  const [editSched, setEditSched] = useState(false);

  const log = () => { if (!loggedToday) set((d) => ({ ...d, logDays: [...d.logDays, dayKey()] })); };
  const undo = () => set((d) => ({ ...d, logDays: d.logDays.filter((k) => k !== dayKey()) }));
  const shuffle = () => set((d) => {
    if (d.experiences.length < 2) return d;
    let i = d.expIndex;
    while (i === d.expIndex) i = Math.floor(Math.random() * d.experiences.length);
    return { ...d, expIndex: i };
  });
  const addExp = () => { if (newExp.trim()) { set((d) => ({ ...d, experiences: [...d.experiences, newExp.trim()] })); setNewExp(""); } };
  const removeExp = (idx) => set((d) => ({ ...d, experiences: d.experiences.filter((_, i) => i !== idx), expIndex: 0 }));
  const setSched = (day, val) => set((d) => ({ ...d, schedule: { ...d.schedule, [day]: val } }));

  return (
    <div>
      <ScreenHead eyebrow={new Date().toLocaleDateString(undefined, { weekday: "long" })} title="Today" sub="It's a day that ends in -day. So you move." />
      <div className="ca-card" style={{ background: `linear-gradient(135deg, ${C.cardHi}, ${C.card})` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: FONT_UI, fontSize: 12, letterSpacing: 1, color: C.muted, textTransform: "uppercase" }}>On {todayName}, you</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 30, color: C.bone, lineHeight: 1.05, marginTop: 2 }}>{anchor || "move how you like"}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
              <Flame size={18} color={C.gold} /><span style={{ fontFamily: FONT_MONO, fontSize: 26, color: C.gold }}>{streak}</span>
            </div>
            <div style={{ fontFamily: FONT_UI, fontSize: 11, color: C.muted }}>day streak</div>
          </div>
        </div>
        {loggedToday ? (
          <button onClick={undo} className="ca-ghost" style={{ width: "100%", marginTop: 14 }}><Check size={15} color={C.rose} /> Logged today — undo</button>
        ) : (
          <button onClick={log} className="ca-primary" style={{ width: "100%", marginTop: 14 }}><Check size={16} /> I showed up today</button>
        )}
      </div>

      <div className="ca-card" style={{ marginTop: 14 }}>
        <div style={{ fontFamily: FONT_UI, fontSize: 12, letterSpacing: 1, color: C.muted, textTransform: "uppercase" }}>Today's experience</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 6 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: C.rose, lineHeight: 1.1 }}>{exp}</div>
          <button onClick={shuffle} className="ca-ghost" style={{ flexShrink: 0 }}><Shuffle size={15} /> Spin</button>
        </div>
        <div style={{ height: 1, background: C.line, margin: "14px 0", opacity: 0.6 }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {data.experiences.map((e, i) => (
            <span key={i} className="ca-chip" style={{ color: i === data.expIndex ? C.rose : C.muted }}>
              {e}<button onClick={() => removeExp(i)} className="ca-chipx" aria-label="remove"><X size={11} /></button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <Field value={newExp} onChange={setNewExp} onEnter={addExp} placeholder="Add an experience to the pool" />
          <button onClick={addExp} className="ca-primary">Add</button>
        </div>
      </div>

      <div className="ca-card" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: FONT_UI, fontSize: 12, letterSpacing: 1, color: C.muted, textTransform: "uppercase" }}>The weekly rhythm</div>
          <button onClick={() => setEditSched((s) => !s)} className="ca-ghost"><PenLine size={13} /> {editSched ? "Done" : "Edit"}</button>
        </div>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {DAYS.map((day) => (
            <div key={day} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 12, width: 34, color: day === todayName ? C.gold : C.muted }}>{day}</span>
              {editSched ? (
                <Field value={data.schedule[day] || ""} onChange={(v) => setSched(day, v)} placeholder="—" />
              ) : (
                <span style={{ fontFamily: FONT_UI, fontSize: 14, color: day === todayName ? C.bone : C.muted }}>{data.schedule[day] || "—"}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared bits                                                        */
/* ------------------------------------------------------------------ */
function ScreenHead({ eyebrow, title, sub }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 2, color: C.gold, textTransform: "uppercase" }}>{eyebrow}</div>
      <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 38, color: C.bone, margin: "2px 0 4px", fontWeight: 500, lineHeight: 1 }}>{title}</h2>
      <div style={{ fontFamily: FONT_UI, fontSize: 13, color: C.muted }}>{sub}</div>
    </div>
  );
}
function NatalBand() {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Compass size={16} color={C.gold} />
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: C.bone, letterSpacing: 0.3 }}>The Curious Athlete</span>
      </div>
      <div style={{ display: "flex", gap: 7, marginTop: 12, flexWrap: "wrap" }}>
        {PLACEMENTS.map((p) => (
          <div key={p.role} className="ca-natal">
            <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.gold }}>{p.g}</span>
            <span style={{ fontSize: 14, color: C.rose }}>{p.s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  App shell                                                          */
/* ------------------------------------------------------------------ */
const TABS = [
  { id: "quests", label: "Quests", icon: Sparkles },
  { id: "today", label: "Today", icon: Flame },
  { id: "records", label: "Records", icon: Trophy },
];

export default function App() {
  const [data, setData] = useState(SEED);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("today");
  const saveTimer = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (storage) {
          const r = await storage.get("curious-athlete-v1");
          if (alive && r && r.value) setData(migrate(JSON.parse(r.value)));
        }
      } catch (e) { /* first run */ }
      finally { if (alive) setLoaded(true); }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!loaded || !storage) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { await storage.set("curious-athlete-v1", JSON.stringify(data), false); } catch (e) {}
    }, 450);
  }, [data, loaded]);

  const set = useCallback((updater) => setData((d) => (typeof updater === "function" ? updater(d) : updater)), []);

  return (
    <div style={{ minHeight: "100vh", background: C.ink, position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        .ca-card { background:${C.card}; border:1px solid ${C.line}; border-radius:16px; padding:16px; }
        .ca-input { background:${C.ink2}; border:1px solid ${C.line}; border-radius:10px; color:${C.bone}; font-family:${FONT_UI}; font-size:14px; padding:11px 12px; outline:none; }
        .ca-input:focus { border-color:${C.gold}; }
        .ca-input::placeholder { color:${C.muted}; opacity:.7; }
        .ca-primary { display:inline-flex; align-items:center; justify-content:center; gap:6px; background:${C.gold}; color:#1a1402; border:none; border-radius:10px; padding:11px 14px; font-family:${FONT_UI}; font-weight:600; font-size:14px; cursor:pointer; }
        .ca-primary:hover { filter:brightness(1.06); }
        .ca-primary:disabled { cursor:default; }
        .ca-ghost { display:inline-flex; align-items:center; justify-content:center; gap:6px; background:transparent; color:${C.muted}; border:1px solid ${C.line}; border-radius:10px; padding:10px 14px; font-family:${FONT_UI}; font-weight:500; font-size:13px; cursor:pointer; }
        .ca-ghost:hover { border-color:${C.gold}; color:${C.bone}; }
        .ca-ghost:disabled { cursor:default; }
        .ca-dashed { display:flex; align-items:center; justify-content:center; gap:8px; background:transparent; color:${C.muted}; border:1px dashed ${C.line}; border-radius:14px; padding:14px; font-family:${FONT_UI}; font-size:14px; cursor:pointer; }
        .ca-dashed:hover { border-color:${C.gold}; color:${C.gold}; }
        .ca-iconbtn { width:40px; height:40px; border-radius:10px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; }
        .ca-iconbtn:hover { border-color:${C.gold} !important; color:${C.gold} !important; }
        .ca-chip { display:inline-flex; align-items:center; gap:5px; border:1px solid ${C.line}; border-radius:999px; padding:5px 11px; font-family:${FONT_MONO}; font-size:11px; color:${C.muted}; background:transparent; }
        .ca-chipx { background:none; border:none; color:inherit; opacity:.55; cursor:pointer; display:inline-flex; padding:0; }
        .ca-chipx:hover { opacity:1; color:${C.rose}; }
        .ca-natal { display:flex; align-items:center; gap:4px; background:${C.ink2}; border:1px solid ${C.line}; border-radius:999px; padding:5px 11px; }
        .ca-pr { display:inline-flex; align-items:center; gap:7px; color:${C.gold}; font-family:${FONT_UI}; font-size:13px; font-weight:600; }
        .ca-tab { flex:1; display:flex; flex-direction:column; align-items:center; gap:3px; background:none; border:none; cursor:pointer; padding:9px 0; font-family:${FONT_UI}; font-size:11px; }
        .ca-overlay { position:fixed; inset:0; z-index:20; background:rgba(4,7,20,.72); backdrop-filter:blur(4px); display:flex; align-items:flex-end; justify-content:center; }
        .ca-sheet { background:${C.ink2}; border:1px solid ${C.line}; border-radius:20px 20px 0 0; width:100%; max-width:480px; max-height:88vh; overflow-y:auto; padding:20px 18px 30px; }
        .ca-arc { transition: stroke-dashoffset .7s cubic-bezier(.4,0,.2,1); }
        .ca-fill { transition: y .6s ease, height .6s ease; }
        @media (prefers-reduced-motion: reduce) { .ca-arc, .ca-fill { transition:none; } }
        button:focus-visible, input:focus-visible { outline:2px solid ${C.gold}; outline-offset:2px; }
      `}</style>

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: `radial-gradient(circle at 18% 12%, ${C.line}33 0, transparent 38%),
          radial-gradient(circle at 82% 8%, ${C.cardHi}55 0, transparent 32%),
          radial-gradient(1px 1px at 20% 30%, ${C.bone}55, transparent),
          radial-gradient(1px 1px at 70% 20%, ${C.bone}44, transparent),
          radial-gradient(1px 1px at 45% 60%, ${C.bone}33, transparent),
          radial-gradient(1px 1px at 85% 70%, ${C.bone}44, transparent),
          radial-gradient(1px 1px at 10% 80%, ${C.bone}33, transparent)` }} />

      <div style={{ position: "relative", maxWidth: 480, margin: "0 auto", padding: "26px 18px 110px" }}>
        <NatalBand />
        <div style={{ height: 24 }} />
        {!loaded ? (
          <div style={{ fontFamily: FONT_MONO, color: C.muted, fontSize: 13, padding: "40px 0", textAlign: "center" }}>charting the sky…</div>
        ) : tab === "quests" ? (
          <QuestsScreen data={data} set={set} />
        ) : tab === "records" ? (
          <RecordsScreen data={data} set={set} />
        ) : (
          <TodayScreen data={data} set={set} />
        )}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 5, background: `${C.ink2}f2`, borderTop: `1px solid ${C.line}`, backdropFilter: "blur(8px)" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", padding: "0 8px" }}>
          {TABS.map((t) => {
            const Icon = t.icon; const active = tab === t.id;
            return (
              <button key={t.id} className="ca-tab" onClick={() => setTab(t.id)} style={{ color: active ? C.gold : C.muted }}>
                <Icon size={20} />{t.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
