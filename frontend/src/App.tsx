import { useState, useRef, useEffect, useCallback } from "react";

// ─── API ──────────────────────────────────────────────────────────────────────
const API_URL = "http://localhost:8000";

// ─── tokens ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#0D1117",
  surface: "#161B22",
  elevated: "#21262D",
  border: "#30363D",
  textPrimary: "#E6EDF3",
  textSecondary: "#B0BAC4",
  textMuted: "#7D8590",
  green: "#4ADE80",
  greenDark: "#238636",
  greenHover: "#2EA043",
  red: "#DA3633",
  blue: "#1F6FEB",
  skyBlue58: "#58A6FF",
  amber: "#E3B341",
  dead: "#3D444D",
  skyBlue: "#38BDF8",
};

// ─── tipos ────────────────────────────────────────────────────────────────────
interface ScenarioResult {
  healthy: number[];
  sick: number[];
  dead: number[];
  immune: number[];
  final_deaths: number;
  total_population: number;
}

interface SimResult {
  scenario1: ScenarioResult;
  scenario2: ScenarioResult;
}

// ─── dados ────────────────────────────────────────────────────────────────────
const CITIES = [
  { id: "igarassu", name: "Igarassu", pop: "115 mil hab." },
  { id: "goiana", name: "Goiana", pop: "81 mil hab." },
  { id: "itapissuma", name: "Itapissuma", pop: "27 mil hab." },
  { id: "itamaraca", name: "Itamaracá", pop: "24 mil hab." },
  { id: "aracoiaba", name: "Araçoiaba", pop: "19 mil hab." },
] as const;

const HYPOTHESES = [
  {
    id: "vacina",
    badge: "MISSÃO 01",
    dot: C.green,
    title: "Vacina faz diferença?",
    desc: "Compare população vacinada vs não vacinada com o mesmo vírus.",
    tag: "Recomendado para iniciantes",
    tagBg: "#0D2818", tagColor: C.green, tagBorder: "#166534",
    missionTitle: "Uma gripe chegou em Igarassu. E agora, o que acontece?",
    missionBody: "É segunda-feira. Um estudante da sua escola chegou gripado. Nos próximos dias, mais colegas começam a faltar. Você é o epidemiologista responsável pela cidade — precisa decidir: vacinação, máscaras, lockdown... ou nada? Suas escolhas vão determinar quantas pessoas sobrevivem.",
    hypothesis: "💡 Hipótese: populações vacinadas apresentam menor taxa de mortalidade do que populações não vacinadas para o mesmo vírus.",
    defaultInterventions: { vaccination: true, vaccination_pct: 0.6, vaccination_week: 1, masks: false, masks_adherence: 0, masks_start: 1, masks_end: 52, lockdown: false, lockdown_intensity: 0, lockdown_start: 1, lockdown_end: 52 },
  },
  {
    id: "mascara",
    badge: "MISSÃO 02",
    dot: C.amber,
    title: "Máscara vs distanciamento",
    desc: "Qual intervenção reduz mais mortes: máscaras ou isolamento social?",
    tag: "Nível intermediário",
    tagBg: "#1C1407", tagColor: C.amber, tagBorder: "#78350F",
    missionTitle: "Máscara ou distanciamento? Você decide a política pública.",
    missionBody: "O prefeito te ligou. Há casos confirmados na cidade. Você tem recursos para uma intervenção — mas não para as duas ao mesmo tempo. O que salva mais vidas: obrigar o uso de máscara ou fechar as escolas e comércio?",
    hypothesis: "💡 Hipótese: o distanciamento social reduz mais mortes do que o uso obrigatório de máscaras em uma população não vacinada.",
    defaultInterventions: { vaccination: false, vaccination_pct: 0, vaccination_week: 1, masks: true, masks_adherence: 0.8, masks_start: 1, masks_end: 52, lockdown: false, lockdown_intensity: 0, lockdown_start: 1, lockdown_end: 52 },
  },
  {
    id: "sem-intervencao",
    badge: "MISSÃO 03",
    dot: C.red,
    title: "Sem intervenção: o colapso",
    desc: "O que acontece com o SUS de Igarassu se ninguém agir?",
    tag: "Nível avançado",
    tagBg: "#1A0808", tagColor: C.red, tagBorder: "#7F1D1D",
    missionTitle: "O pior cenário. O que acontece se ninguém agir?",
    missionBody: "Nenhuma vacina, nenhuma máscara, nenhum lockdown. O vírus se espalha livremente. O hospital de Igarassu tem capacidade limitada. Quando o sistema de saúde colapsa, as mortes se multiplicam — execute a simulação e veja os números reais.",
    hypothesis: "💡 Hipótese: sem intervenções, o número de mortes supera a capacidade de atendimento do SUS local em menos de 8 semanas.",
    defaultInterventions: { vaccination: false, vaccination_pct: 0, vaccination_week: 1, masks: false, masks_adherence: 0, masks_start: 1, masks_end: 52, lockdown: false, lockdown_intensity: 0, lockdown_start: 1, lockdown_end: 52 },
  },
  {
    id: "livre",
    badge: "MISSÃO 04",
    dot: C.skyBlue,
    title: "Criar minha hipótese",
    desc: "Monte os dois cenários do zero e escolha todas as variáveis.",
    tag: "Modo livre",
    tagBg: "#071626", tagColor: C.skyBlue, tagBorder: "#075985",
    missionTitle: "Você é o cientista. Formule sua própria hipótese.",
    missionBody: "Monte os dois cenários do zero. Escolha o vírus, a taxa de transmissão, as intervenções, a cidade. Defina sua hipótese antes de rodar — depois analise se os dados confirmaram ou refutaram o que você esperava.",
    hypothesis: "",
    defaultInterventions: { vaccination: true, vaccination_pct: 0.5, vaccination_week: 4, masks: true, masks_adherence: 0.5, masks_start: 1, masks_end: 52, lockdown: false, lockdown_intensity: 0, lockdown_start: 1, lockdown_end: 52 },
  },
] as const;

type HypothesisId = (typeof HYPOTHESES)[number]["id"];
type CityId = (typeof CITIES)[number]["id"];

// ─── AnimatedBackground ───────────────────────────────────────────────────────
const CELL_SIZE = 6; const CELL_GAP = 1; const STEP = CELL_SIZE + CELL_GAP;
const S_HEALTHY = 0; const S_IMMUNE = 1; const S_INFECTED = 2; const S_RECOVERING = 3; const S_DEAD = 4;
const CELL_COLORS = ["#0d3318", "#0a1f45", "#4a1010", "#3d2a05", "#1a1d21"];

function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let w = window.innerWidth; let h = window.innerHeight;
    canvas.width = w; canvas.height = h;
    let cols = Math.ceil(w / STEP); let rows = Math.ceil(h / STEP); let total = cols * rows;
    let states = new Uint8Array(total); let infectedAt = new Int32Array(total).fill(-1); let tick = 0;
    function init(c: number, r: number) {
      const t = c * r; const s = new Uint8Array(t); const ia = new Int32Array(t).fill(-1);
      for (let i = 0; i < t; i++) {
        const rand = Math.random();
        if (rand < 0.78) s[i] = S_HEALTHY;
        else if (rand < 0.92) s[i] = S_IMMUNE;
        else if (rand < 0.96) { s[i] = S_INFECTED; ia[i] = 0; }
        else if (rand < 0.99) s[i] = S_RECOVERING;
        else s[i] = S_DEAD;
      }
      return { s, ia };
    }
    const initial = init(cols, rows); states = initial.s; infectedAt = initial.ia;
    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        ctx.fillStyle = CELL_COLORS[states[row * cols + col]];
        ctx.fillRect(col * STEP, row * STEP, CELL_SIZE, CELL_SIZE);
      }
    }
    function update() {
      tick++;
      const updateCount = Math.max(1, Math.floor(total * 0.005));
      for (let u = 0; u < updateCount; u++) {
        const i = Math.floor(Math.random() * total);
        if (states[i] !== S_HEALTHY) continue;
        const col = i % cols; const row = Math.floor(i / cols);
        const ns = [col > 0 ? i - 1 : -1, col < cols - 1 ? i + 1 : -1, row > 0 ? i - cols : -1, row < rows - 1 ? i + cols : -1];
        if (ns.some((n) => n >= 0 && states[n] === S_INFECTED) && Math.random() < 0.08) { states[i] = S_INFECTED; infectedAt[i] = tick; }
      }
      for (let i = 0; i < total; i++) {
        if (states[i] === S_INFECTED && tick - infectedAt[i] >= 10) states[i] = S_RECOVERING;
        else if (states[i] === S_RECOVERING && Math.random() < 0.25) states[i] = S_IMMUNE;
      }
    }
    draw();
    const interval = setInterval(() => { update(); draw(); }, 400);
    function onResize() {
      w = window.innerWidth; h = window.innerHeight; canvas.width = w; canvas.height = h;
      cols = Math.ceil(w / STEP); rows = Math.ceil(h / STEP); total = cols * rows;
      const re = init(cols, rows); states = re.s; infectedAt = re.ia; tick = 0; draw();
    }
    window.addEventListener("resize", onResize);
    return () => { clearInterval(interval); window.removeEventListener("resize", onResize); };
  }, []);
  return (
    <>
      <canvas ref={canvasRef} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: -1 }} />
      <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "#0D1117", opacity: 0.35, zIndex: 0, pointerEvents: "none" }} />
    </>
  );
}

// ─── shared atoms ─────────────────────────────────────────────────────────────
function LogoPill() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 20, padding: "6px 14px 6px 8px" }}>
      <div style={{ width: 22, height: 22, background: C.greenDark, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🦠</div>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#C9D1D9", fontWeight: 500 }}>PeriferiaLab</span>
    </div>
  );
}

function IfpeBadge() {
  return <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: C.textMuted, background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 6, padding: "4px 10px", letterSpacing: "0.04em" }}>PET Conexão Periferia</div>;
}

function Footer() {
  return (
    <footer style={{ width: "100%", padding: "10px 20px", borderTop: `0.5px solid ${C.border}`, background: C.bg, display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 16, height: 16, borderRadius: "50%", background: C.greenDark, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>🦠</div>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, color: "#C9D1D9" }}>PET Conexão Periferia</span>
        <span style={{ color: C.dead, margin: "0 6px" }}>·</span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.textMuted }}>IFPE Campus Igarassu</span>
      </div>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: C.textMuted, letterSpacing: "0.04em" }}>Periferia faz Ciência 🔬</span>
    </footer>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textMuted, marginBottom: 14 }}>{children}</div>;
}

function ProgressDots({ active }: { active: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 36 }}>
      {[0, 1, 2, 3].map((i) => i === active
        ? <div key={i} style={{ width: 18, height: 6, borderRadius: 3, background: C.green }} />
        : <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.elevated }} />
      )}
    </div>
  );
}

function HypothesisCard({ hyp, isSelected, isHovered, onSelect, onHover }: {
  hyp: (typeof HYPOTHESES)[number]; isSelected: boolean; isHovered: boolean;
  onSelect: () => void; onHover: (v: boolean) => void;
}) {
  return (
    <button onClick={onSelect} onMouseEnter={() => onHover(true)} onMouseLeave={() => onHover(false)}
      style={{ all: "unset", cursor: "pointer", display: "block", background: isSelected ? "#0D2818" : C.surface, border: (isSelected || isHovered) ? `0.5px solid ${C.green}` : `0.5px solid ${C.border}`, borderRadius: 10, padding: 14, transition: "all 0.15s ease", textAlign: "left" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: C.textMuted, background: C.elevated, borderRadius: 4, padding: "2px 7px" }}>cenário A vs B</span>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: hyp.dot }} />
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: C.textPrimary, marginBottom: 6 }}>{hyp.title}</div>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.textSecondary, lineHeight: 1.5, margin: "0 0 10px" }}>{hyp.desc}</p>
      <span style={{ display: "inline-block", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: hyp.tagColor, background: hyp.tagBg, border: `0.5px solid ${hyp.tagBorder}`, borderRadius: 4, padding: "2px 8px" }}>{hyp.tag}</span>
    </button>
  );
}

function CityPill({ city, isSelected, onClick }: { city: (typeof CITIES)[number]; isSelected: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, background: isSelected ? "#0C1B2E" : C.surface, border: (isSelected || hovered) ? `0.5px solid ${C.skyBlue58}` : `0.5px solid ${C.border}`, borderRadius: 20, padding: "6px 14px", transition: "all 0.15s ease" }}>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: isSelected ? C.skyBlue58 : hovered ? "#C9D1D9" : C.textSecondary }}>{city.name}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#4D78AB" }}>{city.pop}</span>
    </button>
  );
}

// ─── Screen 1 ─────────────────────────────────────────────────────────────────
function Screen1({ onStart }: { onStart: (hId: string, cId: string, text: string) => void }) {
  const [selectedHyp, setSelectedHyp] = useState<HypothesisId>("vacina");
  const [displayedHypId, setDisplayedHypId] = useState<HypothesisId>("vacina");
  const [missionVisible, setMissionVisible] = useState(true);
  const [hoveredHyp, setHoveredHyp] = useState<HypothesisId | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityId>("igarassu");
  const [ctaHovered, setCtaHovered] = useState(false);
  const [customHypothesis, setCustomHypothesis] = useState("");

  const selectHyp = (id: HypothesisId) => {
    if (id === selectedHyp) return;
    setSelectedHyp(id); setMissionVisible(false);
    setTimeout(() => { setDisplayedHypId(id); setMissionVisible(true); }, 150);
  };

  const displayedHyp = HYPOTHESES.find((h) => h.id === displayedHypId)!;
  const activeHyp = HYPOTHESES.find((h) => h.id === selectedHyp)!;
  const activeIndex = HYPOTHESES.findIndex((h) => h.id === selectedHyp);
  const isEditable = displayedHypId === "livre";
  const hypothesisText = isEditable ? customHypothesis : displayedHyp.hypothesis;

  const hypBoxStyle: React.CSSProperties = { fontSize: 12, color: C.skyBlue58, background: "rgba(31,111,235,0.08)", border: `0.5px solid rgba(31,111,235,0.3)`, borderRadius: 6, padding: "8px 12px", marginBottom: 12, lineHeight: 1.5, width: "100%", boxSizing: "border-box", fontFamily: "'Inter', sans-serif" };

  return (
    <div style={{ minHeight: "100vh", background: "transparent", display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
      <AnimatedBackground />
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: `0.5px solid ${C.border}`, position: "relative", zIndex: 2 }}>
        <LogoPill /><IfpeBadge />
      </header>
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px 64px", overflowY: "auto", position: "relative", zIndex: 2 }}>
        <div style={{ width: "100%", maxWidth: 560 }}>
          <ProgressDots active={activeIndex} />

          {/* Mission card */}
          <div style={{ background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 28, opacity: missionVisible ? 1 : 0, transition: "opacity 0.15s ease" }}>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, background: C.elevated, color: C.skyBlue58, border: `0.5px solid ${C.blue}`, borderRadius: 4, padding: "3px 8px", letterSpacing: "0.06em" }}>{displayedHyp.badge}</span>
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 17, fontWeight: 500, color: C.textPrimary, lineHeight: 1.35, marginBottom: 14 }}>{displayedHyp.missionTitle}</div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.textSecondary, lineHeight: 1.7, margin: "0 0 16px" }}>{displayedHyp.missionBody}</p>
            {isEditable
              ? <textarea value={customHypothesis} onChange={(e) => setCustomHypothesis(e.target.value)} placeholder="💡 Hipótese: escreva aqui sua hipótese antes de simular..." rows={2} style={{ ...hypBoxStyle, resize: "none", outline: "none", display: "block", cursor: "text" }} />
              : <div style={hypBoxStyle}>{displayedHyp.hypothesis}</div>
            }
            <div style={{ background: C.bg, border: `0.5px solid rgba(74,222,128,0.2)`, borderRadius: 8, padding: "10px 14px", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: "#166534", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>⚗️</div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#7EE8A2", lineHeight: 1.5, margin: 0 }}>Você vai formular uma hipótese científica, montar dois cenários e comparar os resultados — exatamente como um pesquisador real faria.</p>
            </div>
          </div>

          {/* Hypothesis grid */}
          <div style={{ marginBottom: 28 }}>
            <SectionLabel>escolha sua hipótese de comparação</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {HYPOTHESES.map((hyp) => (
                <HypothesisCard key={hyp.id} hyp={hyp} isSelected={selectedHyp === hyp.id} isHovered={hoveredHyp === hyp.id}
                  onSelect={() => selectHyp(hyp.id)} onHover={(v) => setHoveredHyp(v ? hyp.id : null)} />
              ))}
            </div>
          </div>

          {/* City selection */}
          <div style={{ marginBottom: 28 }}>
            <SectionLabel>simular em qual cidade?</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {CITIES.map((city) => <CityPill key={city.id} city={city} isSelected={selectedCity === city.id} onClick={() => setSelectedCity(city.id)} />)}
            </div>
          </div>

          {/* CTA */}
          <button onClick={() => onStart(selectedHyp, selectedCity, hypothesisText)} onMouseEnter={() => setCtaHovered(true)} onMouseLeave={() => setCtaHovered(false)}
            style={{ all: "unset", cursor: "pointer", width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: ctaHovered ? C.greenHover : C.greenDark, borderRadius: 10, padding: "14px 20px", transition: "background 0.15s ease" }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500, color: "#fff" }}>▶ Começar — {activeHyp.badge}</span>
          </button>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>A simulação roda via API Python — cada célula é uma pessoa real da cidade.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ─── Slider ───────────────────────────────────────────────────────────────────
function Slider({ label, displayValue, pct, onPctChange }: { label: string; displayValue: string; pct: number; onPctChange: (p: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const compute = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    onPctChange(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)));
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.textMuted }}>{label}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.green, fontWeight: 500 }}>{displayValue}</span>
      </div>
      <div style={{ padding: "6px 0", cursor: "pointer" }}>
        <div ref={trackRef} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); compute(e.clientX); }} onPointerMove={(e) => { if (e.buttons === 0) return; compute(e.clientX); }}
          style={{ position: "relative", height: 4, background: C.elevated, borderRadius: 2, userSelect: "none" }}>
          <div style={{ width: `${pct * 100}%`, height: "100%", background: C.green, borderRadius: 2, pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: -5, left: `calc(${pct * 100}% - 7px)`, width: 14, height: 14, borderRadius: "50%", background: C.green, border: `2px solid ${C.bg}`, boxShadow: "0 0 0 2px rgba(74,222,128,0.2)", pointerEvents: "none" }} />
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} style={{ position: "relative", width: 32, height: 18, borderRadius: 9, background: on ? "#166534" : C.elevated, border: on ? `0.5px solid ${C.green}` : `0.5px solid ${C.border}`, cursor: "pointer", flexShrink: 0, transition: "background 0.15s ease" }}>
      <div style={{ position: "absolute", top: 2, left: on ? 17 : 2, width: 12, height: 12, borderRadius: "50%", background: on ? C.green : C.textMuted, transition: "left 0.15s ease" }} />
    </div>
  );
}

function SidebarSection({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ padding: "14px 16px", borderBottom: `0.5px solid ${C.border}`, ...style }}>{children}</div>;
}

// ─── PopulationGrid animado com dados reais ───────────────────────────────────
function PopulationGrid({ data, week, label }: { data: ScenarioResult | null; week: number; label: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current; const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const w = container.offsetWidth; const h = container.offsetHeight;
    canvas.width = w; canvas.height = h;
    const CELL = 5; const GAP = 1; const S = CELL + GAP;
    const cols = Math.floor(w / S); const rows = Math.floor(h / S);
    const cx = cols / 2; const cy = rows / 2; const rx = cx * 0.82; const ry = cy * 0.82;
    const total = cols * rows;

    let healthyPct = 1, sickPct = 0, deadPct = 0, immunePct = 0;
    if (data && week > 0) {
      const idx = Math.min(week - 1, data.healthy.length - 1);
      const pop = data.total_population;
      healthyPct = data.healthy[idx] / pop;
      sickPct = data.sick[idx] / pop;
      deadPct = data.dead[idx] / pop;
      immunePct = data.immune[idx] / pop;
    }

    const weights = [
      { color: C.greenDark, w: healthyPct },
      { color: C.red, w: sickPct },
      { color: C.dead, w: deadPct },
      { color: C.blue, w: immunePct },
    ];
    const cdf: { color: string; threshold: number }[] = [];
    let cum = 0;
    for (const { color, w } of weights) { cum += w; cdf.push({ color, threshold: cum }); }
    const pickColor = () => {
      const r = Math.random();
      for (const { color, threshold } of cdf) if (r <= threshold) return color;
      return C.dead;
    };

    ctx.clearRect(0, 0, w, h);
    let drawn = 0;
    for (let row = 0; row < rows && drawn < total; row++) {
      for (let col = 0; col < cols; col++) {
        const dx = (col - cx) / rx; const dy = (row - cy) / ry;
        if (dx * dx + dy * dy > 1 + Math.random() * 0.06) continue;
        ctx.fillStyle = pickColor();
        ctx.fillRect(col * S, row * S, CELL, CELL);
        drawn++;
      }
    }
  }, [data, week, label]);

  return (
    <div ref={containerRef} style={{ borderRadius: 10, border: `0.5px solid ${C.border}`, height: 200, background: C.bg, position: "relative", overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
      <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(13,17,23,0.8)", borderRadius: 6, padding: "4px 8px", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: C.textMuted }}>
        {data ? `${data.total_population.toLocaleString()} indivíduos` : "aguardando..."}
      </div>
    </div>
  );
}

// ─── LineChart ────────────────────────────────────────────────────────────────
function LineChart({ s1, s2, currentWeek }: { s1: ScenarioResult; s2: ScenarioResult; currentWeek: number }) {
  const maxDead = Math.max(...s1.dead, ...s2.dead, 1);
  const weeks = s1.dead.length;
  const W = 620; const H = 80;

  const toPath = (data: number[], color: string) => {
    const points = data.slice(0, currentWeek).map((v, i) => {
      const x = (i / (weeks - 1)) * W;
      const y = H - (v / maxDead) * (H - 4);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    }).join(" ");
    return { points, color };
  };

  const p1 = toPath(s1.dead, C.red);
  const p2 = toPath(s2.dead, C.green);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
      {p1.points && <>
        <path d={`${p1.points} L ${((currentWeek - 1) / (weeks - 1)) * W} ${H} L 0 ${H} Z`} fill="rgba(218,54,51,0.15)" />
        <path d={p1.points} fill="none" stroke={C.red} strokeWidth="1.5" />
      </>}
      {p2.points && <>
        <path d={`${p2.points} L ${((currentWeek - 1) / (weeks - 1)) * W} ${H} L 0 ${H} Z`} fill="rgba(74,222,128,0.1)" />
        <path d={p2.points} fill="none" stroke={C.green} strokeWidth="1.5" />
      </>}
    </svg>
  );
}

// ─── Screen 2 ─────────────────────────────────────────────────────────────────
function Screen2({ hypothesisId, cityId, hypothesisText, onBack }: {
  hypothesisId: string; cityId: string; hypothesisText: string; onBack: () => void;
}) {
  const hyp = HYPOTHESES.find((h) => h.id === hypothesisId)!;
  const [cidade, setCidade] = useState(cityId);
  const [r0Pct, setR0Pct] = useState(0.5);
  const [semPct, setSemPct] = useState(0.515);
  const [toggles, setToggles] = useState({ ...hyp.defaultInterventions });
  const [simHover, setSimHover] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SimResult | null>(null);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animRef = useRef<number | null>(null);

  const weeks = Math.round(1 + semPct * 99);
  const contagion = r0Pct;

  const runSimulation = useCallback(async () => {
    setLoading(true); setError(null); setResult(null); setCurrentWeek(0); setIsAnimating(false);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    try {
      const body = {
        city: cidade, weeks, contagion_factor: contagion,
        vaccination: (toggles as any).vaccination ?? false,
        vaccination_pct: (toggles as any).vaccination_pct ?? 0.5,
        vaccination_week: (toggles as any).vaccination_week ?? 1,
        masks: (toggles as any).masks ?? false,
        masks_adherence: (toggles as any).masks_adherence ?? 0.5,
        masks_start: (toggles as any).masks_start ?? 1,
        masks_end: (toggles as any).masks_end ?? weeks,
        lockdown: (toggles as any).lockdown ?? false,
        lockdown_intensity: (toggles as any).lockdown_intensity ?? 0.5,
        lockdown_start: (toggles as any).lockdown_start ?? 1,
        lockdown_end: (toggles as any).lockdown_end ?? weeks,
      };
      const res = await fetch(`${API_URL}/simulate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`Erro na API: ${res.status}`);
      const data: SimResult = await res.json();
      setResult(data);
      // Animate week by week
      setIsAnimating(true);
      let w = 1;
      const animate = () => {
        setCurrentWeek(w);
        if (w < weeks) { w++; animRef.current = requestAnimationFrame(animate); }
        else setIsAnimating(false);
      };
      animRef.current = requestAnimationFrame(animate);
    } catch (e: any) {
      setError(e.message || "Erro ao conectar com a API Python. Certifique-se que o backend está rodando em localhost:8000");
    } finally {
      setLoading(false);
    }
  }, [cidade, weeks, contagion, toggles]);

  useEffect(() => { return () => { if (animRef.current) cancelAnimationFrame(animRef.current); }; }, []);

  const savedLives = result ? result.scenario1.final_deaths - result.scenario2.final_deaths : 0;
  const savedPct = result && result.scenario1.final_deaths > 0 ? ((savedLives / result.scenario1.final_deaths) * 100).toFixed(1) : "0";

  const interventionToggles = [
    { key: "vaccination", dot: C.green, label: "Vacinação" },
    { key: "masks", dot: C.amber, label: "Uso de Máscaras" },
    { key: "lockdown", dot: C.red, label: "Lockdown" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, overflow: "hidden" }}>
      {/* SIDEBAR */}
      <aside style={{ width: 260, flexShrink: 0, background: C.surface, borderRight: `0.5px solid ${C.border}`, display: "flex", flexDirection: "column", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ padding: "18px 16px 12px", borderBottom: `0.5px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={onBack} style={{ all: "unset", cursor: "pointer", color: C.textMuted, fontSize: 18, lineHeight: 1, marginRight: 4 }}>←</button>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg, #4ADE80, #22D3EE)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🦠</div>
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: C.textPrimary }}>PeriferiaLab</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: C.textMuted, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 1 }}>Simulador de Pandemias</div>
            </div>
          </div>
        </div>

        {/* Cidade */}
        <SidebarSection>
          <SectionLabel>Cidade</SectionLabel>
          <div style={{ position: "relative" }}>
            <select value={cidade} onChange={(e) => setCidade(e.target.value)}
              style={{ width: "100%", background: C.elevated, border: `0.5px solid ${C.border}`, borderRadius: 6, color: C.textPrimary, fontSize: 12, padding: "7px 28px 7px 10px", appearance: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", outline: "none", boxSizing: "border-box" }}>
              <option value="igarassu">Igarassu (115.196 hab.)</option>
              <option value="goiana">Goiana (81.055 hab.)</option>
              <option value="itapissuma">Itapissuma (27.749 hab.)</option>
              <option value="itamaraca">Itamaracá (24.540 hab.)</option>
              <option value="aracoiaba">Araçoiaba (19.243 hab.)</option>
            </select>
            <div style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.textMuted, fontSize: 10 }}>▾</div>
          </div>
        </SidebarSection>

        {/* Parâmetros */}
        <SidebarSection>
          <SectionLabel>Parâmetros</SectionLabel>
          <Slider label="Taxa de contágio" displayValue={`R₀ = ${(r0Pct * 4).toFixed(1)}`} pct={r0Pct} onPctChange={setR0Pct} />
          <Slider label="Semanas de simulação" displayValue={`${weeks}`} pct={semPct} onPctChange={setSemPct} />
        </SidebarSection>

        {/* Intervenções */}
        <SidebarSection style={{ flex: 1 }}>
          <SectionLabel>Intervenções — Cenário 2</SectionLabel>
          {interventionToggles.map(({ key, dot, label }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: dot }} />
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#C9D1D9" }}>{label}</span>
              </div>
              <Toggle on={!!(toggles as any)[key]} onChange={() => setToggles((t) => ({ ...t, [key]: !(t as any)[key] }))} />
            </div>
          ))}
        </SidebarSection>

        {/* Legenda */}
        <SidebarSection>
          <SectionLabel>Legenda</SectionLabel>
          {[{ color: C.greenDark, label: "Saudável" }, { color: C.red, label: "Infectado" }, { color: C.blue, label: "Imune / vacinado" }, { color: C.dead, label: "Óbito" }].map(({ color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.textSecondary }}>{label}</span>
            </div>
          ))}
        </SidebarSection>

        {/* Botão simular */}
        <div style={{ margin: "14px 16px" }}>
          <button onClick={runSimulation} disabled={loading || isAnimating} onMouseEnter={() => setSimHover(true)} onMouseLeave={() => setSimHover(false)}
            style={{ all: "unset", cursor: loading || isAnimating ? "default" : "pointer", width: "100%", boxSizing: "border-box", padding: "10px 0", background: loading || isAnimating ? C.elevated : simHover ? "#6EF09A" : C.green, borderRadius: 8, color: loading || isAnimating ? C.textMuted : C.bg, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background 0.15s ease" }}>
            {loading ? "⏳ Calculando..." : isAnimating ? `▶ Semana ${currentWeek}/${weeks}` : "▶ Simular"}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{ padding: "12px 20px", borderBottom: `0.5px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, background: C.elevated, color: C.skyBlue58, border: `0.5px solid ${C.blue}`, borderRadius: 4, padding: "3px 8px", marginRight: 10 }}>{hyp.badge}</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500, color: C.textPrimary }}>{hyp.title}</span>
          </div>
          {result && !isAnimating && (
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: C.green, background: "rgba(74,222,128,0.07)", border: `0.5px solid ${C.green}`, borderRadius: 4, padding: "3px 8px" }}>✓ SIMULAÇÃO CONCLUÍDA</span>
          )}
        </div>

        {/* Hypothesis */}
        {hypothesisText && (
          <div style={{ padding: "10px 20px", borderBottom: `0.5px solid ${C.border}`, background: "rgba(31,111,235,0.05)", flexShrink: 0 }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.skyBlue58 }}>{hypothesisText}</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ margin: "20px", padding: "14px 16px", background: "rgba(218,54,51,0.1)", border: `0.5px solid ${C.red}`, borderRadius: 8 }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.red }}>⚠ {error}</span>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 20px" }}>
          {/* Grids */}
          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <SectionLabel>Cenário 1 — Sem Intervenção</SectionLabel>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, background: "rgba(218,54,51,0.07)", color: C.red, border: `0.5px solid ${C.red}`, borderRadius: 4, padding: "2px 8px", marginTop: -10, flexShrink: 0 }}>CONTROLE</span>
              </div>
              <PopulationGrid data={result?.scenario1 ?? null} week={currentWeek} label="s1" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <SectionLabel>Cenário 2 — Com Intervenção</SectionLabel>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, background: "rgba(74,222,128,0.07)", color: C.green, border: `0.5px solid ${C.green}`, borderRadius: 4, padding: "2px 8px", marginTop: -10, flexShrink: 0 }}>INTERVENÇÃO</span>
              </div>
              <PopulationGrid data={result?.scenario2 ?? null} week={currentWeek} label="s2" />
            </div>
          </div>

          {/* Stats strip */}
          {result && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
                {[
                  { value: result.scenario1.final_deaths.toLocaleString("pt-BR"), valueColor: C.red, label: "Mortes — sem intervenção", delta: `▲ ${((result.scenario1.final_deaths / result.scenario1.total_population) * 100).toFixed(1)}% da população`, deltaColor: C.red },
                  { value: result.scenario2.final_deaths.toLocaleString("pt-BR"), valueColor: C.green, label: "Mortes — com intervenção", delta: savedLives > 0 ? `▼ ${savedPct}% a menos` : "= mesmo resultado", deltaColor: C.green },
                  { value: `${savedPct}%`, valueColor: C.skyBlue, label: "Vidas salvas pela intervenção", delta: `${Math.max(0, savedLives).toLocaleString("pt-BR")} pessoas`, deltaColor: C.skyBlue },
                ].map(({ value, valueColor, label, delta, deltaColor }) => (
                  <div key={label} style={{ background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 500, color: valueColor, lineHeight: 1.2, marginBottom: 4 }}>{value}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: C.textMuted, marginBottom: 4, lineHeight: 1.4 }}>{label}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: deltaColor }}>{delta}</div>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500, color: "#C9D1D9" }}>Mortes por semana — comparativo de cenários</span>
                  <div style={{ display: "flex", gap: 14 }}>
                    {[{ dot: C.red, text: "Sem intervenção" }, { dot: C.green, text: "Com intervenção" }].map(({ dot, text }) => (
                      <div key={text} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: dot }} />
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: C.textMuted }}>{text}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ height: 80, background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
                  <LineChart s1={result.scenario1} s2={result.scenario2} currentWeek={currentWeek} />
                </div>
              </div>
            </>
          )}

          {!result && !loading && !error && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 12 }}>
              <div style={{ fontSize: 32 }}>🔬</div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.textMuted, textAlign: "center" }}>Configure os parâmetros na sidebar e clique em <strong style={{ color: C.green }}>Simular</strong> para rodar via API Python.</p>
            </div>
          )}
        </div>
        <Footer />
      </main>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<"home" | "result">("home");
  const [hypothesisId, setHypothesisId] = useState("vacina");
  const [cityId, setCityId] = useState("igarassu");
  const [hypText, setHypText] = useState("");

  const handleStart = (hId: string, cId: string, text: string) => {
    setHypothesisId(hId); setCityId(cId); setHypText(text); setScreen("result");
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {screen === "home"
        ? <Screen1 onStart={handleStart} />
        : <Screen2 hypothesisId={hypothesisId} cityId={cityId} hypothesisText={hypText} onBack={() => setScreen("home")} />
      }
    </div>
  );
}
