import { useState, useRef, useEffect, useCallback } from "react";

const API_URL = "http://localhost:8000";

const C = {
  bg: "#0D1117", surface: "#161B22", elevated: "#21262D", border: "#30363D",
  textPrimary: "#E6EDF3", textSecondary: "#B0BAC4", textMuted: "#7D8590",
  green: "#4ADE80", greenDark: "#238636", greenHover: "#2EA043",
  red: "#DA3633", blue: "#1F6FEB", skyBlue58: "#58A6FF",
  amber: "#E3B341", dead: "#3D444D", skyBlue: "#38BDF8",
};

interface ScenarioResult {
  healthy: number[]; sick: number[]; dead: number[]; immune: number[];
  final_deaths: number; total_population: number;
}
interface SimResult { scenario1: ScenarioResult; scenario2: ScenarioResult; }

const CITIES = [
  { id: "igarassu", name: "Igarassu", pop: "115 mil hab." },
  { id: "goiana", name: "Goiana", pop: "81 mil hab." },
  { id: "itapissuma", name: "Itapissuma", pop: "27 mil hab." },
  { id: "itamaraca", name: "Itamaracá", pop: "24 mil hab." },
  { id: "aracoiaba", name: "Araçoiaba", pop: "19 mil hab." },
] as const;

const HYPOTHESES = [
  {
    id: "vacina", badge: "MISSÃO 01", dot: C.green,
    title: "A vacina salva vidas?",
    desc: "Compare o que acontece com e sem vacinação para o mesmo vírus.",
    tag: "Ideal para começar", tagBg: "#0D2818", tagColor: C.green, tagBorder: "#166534",
    missionTitle: "Uma gripe chegou em Igarassu. O que você faz?",
    missionBody: "É segunda-feira. Um estudante da sua escola chegou gripado. Nos próximos dias, mais colegas começam a faltar. Você é o responsável pela saúde da cidade — precisa decidir: vacinar a população, exigir máscaras, pedir distanciamento... ou não fazer nada? Cada escolha vai mudar quantas pessoas sobrevivem.",
    hypothesis: "💡 Hipótese: cidades que vacinam a população têm menos mortes do que cidades que não vacinam, mesmo com o mesmo vírus.",
    defaultInterventions: { vaccination: true, vaccination_pct: 0.6, vaccination_week: 1, masks: false, masks_adherence: 0, masks_start: 1, masks_end: 52, distancing: false, distancing_intensity: 0, distancing_start: 1, distancing_end: 52, lockdown: false, lockdown_intensity: 0, lockdown_start: 1, lockdown_end: 52 },
  },
  {
    id: "mascara", badge: "MISSÃO 02", dot: C.amber,
    title: "Máscara ou distanciamento?",
    desc: "Qual medida evita mais mortes quando usada sozinha?",
    tag: "Nível intermediário", tagBg: "#1C1407", tagColor: C.amber, tagBorder: "#78350F",
    missionTitle: "O prefeito te ligou. Você tem verba para uma só medida.",
    missionBody: "Há casos confirmados na cidade. O orçamento da saúde é limitado — você só consegue aplicar uma medida de proteção. O que salva mais vidas: obrigar o uso de máscara em todos os lugares públicos ou pedir que as pessoas fiquem em casa e evitem contato?",
    hypothesis: "💡 Hipótese: o distanciamento social evita mais mortes do que o uso de máscara quando apenas uma dessas medidas é adotada.",
    defaultInterventions: { vaccination: false, vaccination_pct: 0, vaccination_week: 1, masks: true, masks_adherence: 0.8, masks_start: 1, masks_end: 52, distancing: false, distancing_intensity: 0, distancing_start: 1, distancing_end: 52, lockdown: false, lockdown_intensity: 0, lockdown_start: 1, lockdown_end: 52 },
  },
  {
    id: "sem-intervencao", badge: "MISSÃO 03", dot: C.red,
    title: "O que acontece sem nenhuma ação?",
    desc: "Veja o impacto real quando ninguém toma nenhuma medida de proteção.",
    tag: "Nível avançado", tagBg: "#1A0808", tagColor: C.red, tagBorder: "#7F1D1D",
    missionTitle: "O pior cenário possível. Sem vacina, sem máscara, sem nada.",
    missionBody: "Nenhuma vacina, nenhuma máscara, nenhum distanciamento, nenhum lockdown. O vírus se espalha livremente pela cidade. O hospital tem capacidade limitada de atendimento. Quando o sistema de saúde não aguenta mais, as mortes aumentam muito rápido. Execute a simulação e veja os números reais.",
    hypothesis: "💡 Hipótese: sem nenhuma medida de proteção, o número de mortes cresce tão rápido que ultrapassa a capacidade dos hospitais em menos de 8 semanas.",
    defaultInterventions: { vaccination: false, vaccination_pct: 0, vaccination_week: 1, masks: false, masks_adherence: 0, masks_start: 1, masks_end: 52, distancing: false, distancing_intensity: 0, distancing_start: 1, distancing_end: 52, lockdown: false, lockdown_intensity: 0, lockdown_start: 1, lockdown_end: 52 },
  },
  {
    id: "livre", badge: "MISSÃO 04", dot: C.skyBlue,
    title: "Criar minha própria hipótese",
    desc: "Você escolhe todas as variáveis e define o que quer testar.",
    tag: "Modo livre", tagBg: "#071626", tagColor: C.skyBlue, tagBorder: "#075985",
    missionTitle: "Agora você é o cientista. O que você quer descobrir?",
    missionBody: "Monte os dois cenários do zero. Escolha a taxa de transmissão do vírus, as medidas de proteção e a cidade. Antes de rodar, escreva o que você acha que vai acontecer — isso é uma hipótese científica. Depois compare o resultado com o que você esperava.",
    hypothesis: "",
    defaultInterventions: { vaccination: true, vaccination_pct: 0.5, vaccination_week: 4, masks: true, masks_adherence: 0.5, masks_start: 1, masks_end: 52, distancing: false, distancing_intensity: 0, distancing_start: 1, distancing_end: 52, lockdown: false, lockdown_intensity: 0, lockdown_start: 1, lockdown_end: 52 },
  },
] as const;

type HypothesisId = (typeof HYPOTHESES)[number]["id"];
type CityId = (typeof CITIES)[number]["id"];

// ─── Background animado ───────────────────────────────────────────────────────
const CELL_SIZE = 6; const CELL_GAP = 1; const STEP = CELL_SIZE + CELL_GAP;
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
        if (rand < 0.78) s[i] = 0;
        else if (rand < 0.92) s[i] = 1;
        else if (rand < 0.96) { s[i] = 2; ia[i] = 0; }
        else if (rand < 0.99) s[i] = 3;
        else s[i] = 4;
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
        if (states[i] !== 0) continue;
        const col = i % cols; const row = Math.floor(i / cols);
        const ns = [col > 0 ? i - 1 : -1, col < cols - 1 ? i + 1 : -1, row > 0 ? i - cols : -1, row < rows - 1 ? i + cols : -1];
        if (ns.some((n) => n >= 0 && states[n] === 2) && Math.random() < 0.08) { states[i] = 2; infectedAt[i] = tick; }
      }
      for (let i = 0; i < total; i++) {
        if (states[i] === 2 && tick - infectedAt[i] >= 10) states[i] = 3;
        else if (states[i] === 3 && Math.random() < 0.25) states[i] = 1;
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

// ─── Componentes base ─────────────────────────────────────────────────────────
function LogoPill() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 20, padding: "6px 14px 6px 8px" }}>
      <div style={{ width: 22, height: 22, background: C.greenDark, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🦠</div>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#C9D1D9", fontWeight: 500 }}>PET - Conexão Periferia</span>
    </div>
  );
}
function IfpeBadge() {
  return <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: C.textMuted, background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 6, padding: "4px 10px" }}>PET Conexão Periferia</div>;
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
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: C.textMuted }}>Periferia faz Ciência 🔬</span>
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
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: C.textMuted, background: C.elevated, borderRadius: 4, padding: "2px 7px" }}>{hyp.badge}</span>
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
          <div style={{ background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 28, opacity: missionVisible ? 1 : 0, transition: "opacity 0.15s ease" }}>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, background: C.elevated, color: C.skyBlue58, border: `0.5px solid ${C.blue}`, borderRadius: 4, padding: "3px 8px" }}>{displayedHyp.badge}</span>
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 17, fontWeight: 500, color: C.textPrimary, lineHeight: 1.35, marginBottom: 14 }}>{displayedHyp.missionTitle}</div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.textSecondary, lineHeight: 1.7, margin: "0 0 16px" }}>{displayedHyp.missionBody}</p>
            {isEditable
              ? <textarea value={customHypothesis} onChange={(e) => setCustomHypothesis(e.target.value)} placeholder="💡 Escreva aqui o que você acha que vai acontecer antes de simular..." rows={2} style={{ ...hypBoxStyle, resize: "none", outline: "none", display: "block", cursor: "text" }} />
              : <div style={hypBoxStyle}>{displayedHyp.hypothesis}</div>
            }
            <div style={{ background: C.bg, border: `0.5px solid rgba(74,222,128,0.2)`, borderRadius: 8, padding: "10px 14px", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: "#166534", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>⚗️</div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#7EE8A2", lineHeight: 1.5, margin: 0 }}>Você vai testar uma hipótese científica de verdade: monta dois cenários, roda a simulação e analisa se o resultado confirmou ou derrubou o que você esperava — igual a um pesquisador real.</p>
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <SectionLabel>qual pergunta você quer responder?</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {HYPOTHESES.map((hyp) => (
                <HypothesisCard key={hyp.id} hyp={hyp} isSelected={selectedHyp === hyp.id} isHovered={hoveredHyp === hyp.id}
                  onSelect={() => selectHyp(hyp.id)} onHover={(v) => setHoveredHyp(v ? hyp.id : null)} />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <SectionLabel>simular em qual cidade?</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {CITIES.map((city) => <CityPill key={city.id} city={city} isSelected={selectedCity === city.id} onClick={() => setSelectedCity(city.id)} />)}
            </div>
          </div>

          <button onClick={() => onStart(selectedHyp, selectedCity, hypothesisText)} onMouseEnter={() => setCtaHovered(true)} onMouseLeave={() => setCtaHovered(false)}
            style={{ all: "unset", cursor: "pointer", width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: ctaHovered ? C.greenHover : C.greenDark, borderRadius: 10, padding: "14px 20px", transition: "background 0.15s ease" }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500, color: "#fff" }}>▶ Começar simulação — {activeHyp.badge}</span>
          </button>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>A simulação usa um modelo matemático real chamado Random Walk — cada quadradinho na tela representa uma pessoa da cidade.</p>
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

// ─── Grade da população ───────────────────────────────────────────────────────
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

    let healthyPct = 1, sickPct = 0, deadPct = 0, immunePct = 0;
    if (data && week > 0) {
      const idx = Math.min(week - 1, data.healthy.length - 1);
      const pop = data.total_population;
      healthyPct = data.healthy[idx] / pop;
      sickPct = data.sick[idx] / pop;
      deadPct = data.dead[idx] / pop;
      immunePct = data.immune[idx] / pop;
    }

    const cdf = [
      { color: C.greenDark, threshold: healthyPct },
      { color: C.red, threshold: healthyPct + sickPct },
      { color: C.dead, threshold: healthyPct + sickPct + deadPct },
      { color: C.blue, threshold: 1 },
    ];
    const pickColor = () => {
      const r = Math.random();
      for (const { color, threshold } of cdf) if (r <= threshold) return color;
      return C.dead;
    };

    ctx.clearRect(0, 0, w, h);
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const dx = (col - cx) / rx; const dy = (row - cy) / ry;
      if (dx * dx + dy * dy > 1 + Math.random() * 0.06) continue;
      ctx.fillStyle = pickColor();
      ctx.fillRect(col * S, row * S, CELL, CELL);
    }
  }, [data, week, label]);

  return (
    <div ref={containerRef} style={{ borderRadius: 10, border: `0.5px solid ${C.border}`, height: 200, background: C.bg, position: "relative", overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
      <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(13,17,23,0.8)", borderRadius: 6, padding: "4px 8px", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: C.textMuted }}>
        {data ? `${data.total_population.toLocaleString()} pessoas` : "aguardando simulação..."}
      </div>
    </div>
  );
}

// ─── Gráfico de mortes ────────────────────────────────────────────────────────
function LineChart({ s1, s2, currentWeek }: { s1: ScenarioResult; s2: ScenarioResult; currentWeek: number }) {
  const maxDead = Math.max(...s1.dead, ...s2.dead, 1);
  const weeks = s1.dead.length;
  const W = 620; const H = 80;
  const toPath = (data: number[]) =>
    data.slice(0, currentWeek).map((v, i) => `${i === 0 ? "M" : "L"} ${(i / (weeks - 1)) * W} ${H - (v / maxDead) * (H - 4)}`).join(" ");
  const p1 = toPath(s1.dead); const p2 = toPath(s2.dead);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
      {p1 && <><path d={`${p1} L ${((currentWeek - 1) / (weeks - 1)) * W} ${H} L 0 ${H} Z`} fill="rgba(218,54,51,0.15)" /><path d={p1} fill="none" stroke={C.red} strokeWidth="1.5" /></>}
      {p2 && <><path d={`${p2} L ${((currentWeek - 1) / (weeks - 1)) * W} ${H} L 0 ${H} Z`} fill="rgba(74,222,128,0.1)" /><path d={p2} fill="none" stroke={C.green} strokeWidth="1.5" /></>}
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
        vaccination: toggles.vaccination, vaccination_pct: toggles.vaccination_pct, vaccination_week: toggles.vaccination_week,
        masks: toggles.masks, masks_adherence: toggles.masks_adherence, masks_start: toggles.masks_start, masks_end: toggles.masks_end,
        distancing: toggles.distancing, distancing_intensity: toggles.distancing_intensity, distancing_start: toggles.distancing_start, distancing_end: toggles.distancing_end,
        lockdown: toggles.lockdown, lockdown_intensity: toggles.lockdown_intensity, lockdown_start: toggles.lockdown_start, lockdown_end: toggles.lockdown_end,
      };
      const res = await fetch(`${API_URL}/simulate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`Erro na API: ${res.status}`);
      const data: SimResult = await res.json();
      setResult(data);
      setIsAnimating(true);
      let w = 1;
      const animate = () => {
        setCurrentWeek(w);
        if (w < weeks) { w++; animRef.current = requestAnimationFrame(animate); }
        else setIsAnimating(false);
      };
      animRef.current = requestAnimationFrame(animate);
    } catch (e: any) {
      setError("Não foi possível conectar ao servidor Python. Verifique se o backend está rodando em localhost:8000");
    } finally {
      setLoading(false);
    }
  }, [cidade, weeks, contagion, toggles]);

  useEffect(() => { return () => { if (animRef.current) cancelAnimationFrame(animRef.current); }; }, []);

  const savedLives = result ? Math.max(0, result.scenario1.final_deaths - result.scenario2.final_deaths) : 0;
  const savedPct = result && result.scenario1.final_deaths > 0 ? ((savedLives / result.scenario1.final_deaths) * 100).toFixed(1) : "0";

  const interventionToggles = [
    { key: "vaccination" as const, dot: C.green, label: "Vacinação", desc: "Imuniza parte da população antes do surto" },
    { key: "masks" as const, dot: C.amber, label: "Uso de Máscaras", desc: "Reduz a chance de transmissão no contato" },
    { key: "distancing" as const, dot: C.skyBlue, label: "Distanciamento Social", desc: "Pessoas evitam aglomerações e contato próximo" },
    { key: "lockdown" as const, dot: C.red, label: "Lockdown", desc: "Fechamento total — máximo isolamento possível" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, overflow: "hidden" }}>
      {/* SIDEBAR */}
      <aside style={{ width: 270, flexShrink: 0, background: C.surface, borderRight: `0.5px solid ${C.border}`, display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <div style={{ padding: "18px 16px 12px", borderBottom: `0.5px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={onBack} style={{ all: "unset", cursor: "pointer", color: C.textMuted, fontSize: 18, lineHeight: 1, marginRight: 4 }} title="Voltar">←</button>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg, #4ADE80, #22D3EE)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🦠</div>
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: C.textPrimary }}>PET - Conexão Periferia</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: C.textMuted, textTransform: "uppercase", marginTop: 1 }}>Simulador de Pandemias</div>
            </div>
          </div>
        </div>

        {/* Cidade */}
        <SidebarSection>
          <SectionLabel>Cidade simulada</SectionLabel>
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
          <SectionLabel>Parâmetros do vírus</SectionLabel>
          <Slider
            label="Velocidade de contágio — quanto mais alto, mais rápido o vírus se espalha"
            displayValue={`R₀ = ${(r0Pct * 4).toFixed(1)}`}
            pct={r0Pct} onPctChange={setR0Pct}
          />
          <Slider
            label="Duração da simulação em semanas"
            displayValue={`${weeks} semanas`}
            pct={semPct} onPctChange={setSemPct}
          />
        </SidebarSection>

        {/* Intervenções */}
        <SidebarSection style={{ flex: 1 }}>
          <SectionLabel>Medidas de proteção — Cenário 2</SectionLabel>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.textMuted, marginBottom: 14, lineHeight: 1.5 }}>Ative as medidas que serão aplicadas no Cenário 2. O Cenário 1 sempre fica sem nenhuma proteção para comparar.</p>
          {interventionToggles.map(({ key, dot, label, desc }) => (
            <div key={key} style={{ marginBottom: 12, background: toggles[key] ? "rgba(74,222,128,0.04)" : "transparent", border: `0.5px solid ${toggles[key] ? C.green : "transparent"}`, borderRadius: 8, padding: "8px 10px", transition: "all 0.15s ease" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: dot, flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: toggles[key] ? C.textPrimary : "#C9D1D9", fontWeight: 500 }}>{label}</span>
                </div>
                <Toggle on={toggles[key]} onChange={() => setToggles((t) => ({ ...t, [key]: !t[key] }))} />
              </div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.textMuted, margin: 0, lineHeight: 1.4, paddingLeft: 12 }}>{desc}</p>
            </div>
          ))}
        </SidebarSection>

        {/* Legenda */}
        <SidebarSection>
          <SectionLabel>O que cada cor significa</SectionLabel>
          {[
            { color: C.greenDark, label: "Saudável", desc: "Ainda não pegou o vírus" },
            { color: C.red, label: "Infectado", desc: "Está doente e pode transmitir" },
            { color: C.blue, label: "Imune", desc: "Vacinado ou já se curou" },
            { color: C.dead, label: "Óbito", desc: "Não resistiu à doença" },
          ].map(({ color, label, desc }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
              <div>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.textSecondary, fontWeight: 500 }}>{label}</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: C.textMuted }}> — {desc}</span>
              </div>
            </div>
          ))}
        </SidebarSection>

        {/* Botão */}
        <div style={{ margin: "14px 16px" }}>
          <button onClick={runSimulation} disabled={loading || isAnimating} onMouseEnter={() => setSimHover(true)} onMouseLeave={() => setSimHover(false)}
            style={{ all: "unset", cursor: loading || isAnimating ? "default" : "pointer", width: "100%", boxSizing: "border-box", padding: "10px 0", background: loading || isAnimating ? C.elevated : simHover ? "#6EF09A" : C.green, borderRadius: 8, color: loading || isAnimating ? C.textMuted : C.bg, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background 0.15s ease" }}>
            {loading ? "⏳ Calculando..." : isAnimating ? `▶ Semana ${currentWeek} de ${weeks}` : "▶ Rodar Simulação"}
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", borderBottom: `0.5px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, background: C.elevated, color: C.skyBlue58, border: `0.5px solid ${C.blue}`, borderRadius: 4, padding: "3px 8px", marginRight: 10 }}>{hyp.badge}</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500, color: C.textPrimary }}>{hyp.title}</span>
          </div>
          {result && !isAnimating && (
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: C.green, background: "rgba(74,222,128,0.07)", border: `0.5px solid ${C.green}`, borderRadius: 4, padding: "3px 8px" }}>✓ SIMULAÇÃO CONCLUÍDA</span>
          )}
        </div>

        {hypothesisText && (
          <div style={{ padding: "10px 20px", borderBottom: `0.5px solid ${C.border}`, background: "rgba(31,111,235,0.05)", flexShrink: 0 }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.skyBlue58 }}>{hypothesisText}</span>
          </div>
        )}

        {error && (
          <div style={{ margin: "20px", padding: "14px 16px", background: "rgba(218,54,51,0.1)", border: `0.5px solid ${C.red}`, borderRadius: 8 }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.red, margin: 0 }}>⚠ {error}</p>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 20px" }}>
          {/* Grids lado a lado */}
          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <SectionLabel>Cenário 1 — Sem nenhuma proteção</SectionLabel>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, background: "rgba(218,54,51,0.07)", color: C.red, border: `0.5px solid ${C.red}`, borderRadius: 4, padding: "2px 8px", marginTop: -10, flexShrink: 0 }}>CONTROLE</span>
              </div>
              <PopulationGrid data={result?.scenario1 ?? null} week={currentWeek} label="s1" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <SectionLabel>Cenário 2 — Com as medidas ativadas</SectionLabel>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, background: "rgba(74,222,128,0.07)", color: C.green, border: `0.5px solid ${C.green}`, borderRadius: 4, padding: "2px 8px", marginTop: -10, flexShrink: 0 }}>INTERVENÇÃO</span>
              </div>
              <PopulationGrid data={result?.scenario2 ?? null} week={currentWeek} label="s2" />
            </div>
          </div>

          {result && (
            <>
              {/* Estatísticas */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
                {[
                  { value: result.scenario1.final_deaths.toLocaleString("pt-BR"), valueColor: C.red, label: "Mortes sem proteção", delta: `${((result.scenario1.final_deaths / result.scenario1.total_population) * 100).toFixed(1)}% da população`, deltaColor: C.red },
                  { value: result.scenario2.final_deaths.toLocaleString("pt-BR"), valueColor: C.green, label: "Mortes com proteção", delta: savedLives > 0 ? `${savedPct}% menos que sem proteção` : "mesmo resultado", deltaColor: C.green },
                  { value: `${savedPct}%`, valueColor: C.skyBlue, label: "Vidas salvas pelas medidas", delta: `${savedLives.toLocaleString("pt-BR")} pessoas sobreviveram`, deltaColor: C.skyBlue },
                ].map(({ value, valueColor, label, delta, deltaColor }) => (
                  <div key={label} style={{ background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 500, color: valueColor, lineHeight: 1.2, marginBottom: 4 }}>{value}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: C.textMuted, marginBottom: 4, lineHeight: 1.4 }}>{label}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: deltaColor }}>{delta}</div>
                  </div>
                ))}
              </div>

              {/* Gráfico */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500, color: "#C9D1D9" }}>Número de mortes por semana</span>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.textMuted, marginLeft: 8 }}>— quanto mais baixa a linha verde, melhor a intervenção funcionou</span>
                  </div>
                  <div style={{ display: "flex", gap: 14 }}>
                    {[{ dot: C.red, text: "Sem proteção" }, { dot: C.green, text: "Com proteção" }].map(({ dot, text }) => (
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
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.textMuted, textAlign: "center", lineHeight: 1.6 }}>
                Configure as medidas de proteção na barra lateral e clique em<br />
                <strong style={{ color: C.green }}>▶ Rodar Simulação</strong> para ver os resultados.
              </p>
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
