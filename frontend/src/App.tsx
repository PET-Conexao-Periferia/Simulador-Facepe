import { useState, useRef, useEffect, useCallback } from "react";

const API_URL = "http://localhost:8000";

// ─── tokens ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#0D1117", surface: "#161B22", elevated: "#21262D", border: "#30363D",
  textPrimary: "#E6EDF3", textSecondary: "#B0BAC4", textMuted: "#7D8590",
  green: "#4ADE80", greenDark: "#238636", greenHover: "#2EA043",
  red: "#DA3633", blue: "#1F6FEB", skyBlue58: "#58A6FF",
  amber: "#E3B341", dead: "#3D444D", skyBlue: "#38BDF8",
};

// ─── interfaces ───────────────────────────────────────────────────────────────
interface ScenarioResult {
  healthy: number[]; sick: number[]; dead: number[]; immune: number[];
  grid_history: number[][];
  final_deaths: number; total_population: number;
}
interface SimResult { scenario1: ScenarioResult; scenario2: ScenarioResult; }

// ─── city data ────────────────────────────────────────────────────────────────
const CITIES = [
  { id: "igarassu",   name: "Igarassu",   pop: "115 mil hab." },
  { id: "goiana",     name: "Goiana",     pop: "81 mil hab."  },
  { id: "itapissuma", name: "Itapissuma", pop: "27 mil hab."  },
  { id: "itamaraca",  name: "Itamaracá",  pop: "24 mil hab."  },
  { id: "aracoiaba",  name: "Araçoiaba",  pop: "19 mil hab."  },
] as const;

const CITY_META: Record<string, { label: string; popFull: string }> = {
  igarassu:   { label: "Igarassu · PE",   popFull: "115.196 hab." },
  goiana:     { label: "Goiana · PE",     popFull: "81.055 hab."  },
  itapissuma: { label: "Itapissuma · PE", popFull: "27.749 hab."  },
  itamaraca:  { label: "Itamaracá · PE",  popFull: "24.540 hab."  },
  aracoiaba:  { label: "Araçoiaba · PE",  popFull: "19.243 hab."  },
};

// ─── hypothesis data ──────────────────────────────────────────────────────────
const HYPOTHESES = [
  {
    id: "vacina", badge: "MISSÃO 01", dot: C.green,
    title: "A vacina salva vidas?",
    desc: "Teste com e sem vacina e compare os resultados.",
    tag: "Ideal para começar", tagBg: "#0D2818", tagColor: C.green, tagBorder: "#166534",
    missionTitle: "Uma gripe chegou em Igarassu. O que você faz?",
    missionBody: "Um estudante da sua escola chegou gripado. Nos próximos dias, mais colegas começam a faltar. Você é o responsável pela saúde da cidade — decide: vacinar, exigir máscaras, pedir distanciamento... ou não fazer nada?",
    hypothesis: "💡 Cidades que vacinam a população têm menos mortes do que cidades que não vacinam, mesmo com o mesmo vírus.",
    defaultInterventions: { vaccination: true, vaccination_pct: 0.6, vaccination_week: 1, masks: false, masks_adherence: 0, masks_start: 1, masks_end: 52, distancing: false, distancing_intensity: 0, distancing_start: 1, distancing_end: 52, lockdown: false, lockdown_intensity: 0, lockdown_start: 1, lockdown_end: 52 },
  },
  {
    id: "mascara", badge: "MISSÃO 02", dot: C.amber,
    title: "Máscara ou distanciamento?",
    desc: "Qual medida evita mais mortes quando usada sozinha?",
    tag: "Nível intermediário", tagBg: "#1C1407", tagColor: C.amber, tagBorder: "#78350F",
    missionTitle: "O prefeito te ligou. Você tem verba para uma só medida.",
    missionBody: "Há casos confirmados na cidade. O orçamento é limitado — só dá para uma medida. O que salva mais vidas: obrigar máscara em lugares públicos ou pedir que as pessoas fiquem em casa?",
    hypothesis: "💡 O distanciamento social evita mais mortes do que o uso de máscara quando apenas uma dessas medidas é adotada.",
    defaultInterventions: { vaccination: false, vaccination_pct: 0, vaccination_week: 1, masks: true, masks_adherence: 0.8, masks_start: 1, masks_end: 52, distancing: false, distancing_intensity: 0, distancing_start: 1, distancing_end: 52, lockdown: false, lockdown_intensity: 0, lockdown_start: 1, lockdown_end: 52 },
  },
  {
    id: "sem-intervencao", badge: "MISSÃO 03", dot: C.red,
    title: "O que acontece sem nenhuma ação?",
    desc: "Veja o impacto real quando ninguém toma nenhuma medida.",
    tag: "Nível avançado", tagBg: "#1A0808", tagColor: C.red, tagBorder: "#7F1D1D",
    missionTitle: "O pior cenário. Sem vacina, sem máscara, sem nada.",
    missionBody: "Nenhuma vacina, máscara, distanciamento ou lockdown. O vírus se espalha livremente. Execute a simulação e veja os números reais.",
    hypothesis: "💡 Sem nenhuma medida de proteção, o número de mortes cresce tão rápido que ultrapassa a capacidade dos hospitais em menos de 8 semanas.",
    defaultInterventions: { vaccination: false, vaccination_pct: 0, vaccination_week: 1, masks: false, masks_adherence: 0, masks_start: 1, masks_end: 52, distancing: false, distancing_intensity: 0, distancing_start: 1, distancing_end: 52, lockdown: false, lockdown_intensity: 0, lockdown_start: 1, lockdown_end: 52 },
  },
  {
    id: "livre", badge: "MISSÃO 04", dot: C.skyBlue,
    title: "Criar minha própria hipótese",
    desc: "Você escolhe todas as variáveis e define o que quer testar.",
    tag: "Modo livre", tagBg: "#071626", tagColor: C.skyBlue, tagBorder: "#075985",
    missionTitle: "Agora você é o cientista. O que você quer descobrir?",
    missionBody: "Monte os dois cenários do zero. Escolha a taxa de transmissão, as medidas e a cidade. Antes de rodar, escreva o que você acha que vai acontecer — isso é uma hipótese científica.",
    hypothesis: "",
    defaultInterventions: { vaccination: true, vaccination_pct: 0.5, vaccination_week: 4, masks: true, masks_adherence: 0.5, masks_start: 1, masks_end: 52, distancing: false, distancing_intensity: 0, distancing_start: 1, distancing_end: 52, lockdown: false, lockdown_intensity: 0, lockdown_start: 1, lockdown_end: 52 },
  },
] as const;

type HypothesisId = (typeof HYPOTHESES)[number]["id"];
type CityId = (typeof CITIES)[number]["id"];
type InterventionKey = "vaccination" | "masks" | "distancing" | "lockdown";
interface InterventionSettings {
  vaccination: boolean;
  vaccination_pct: number;
  vaccination_week: number;
  masks: boolean;
  masks_adherence: number;
  masks_start: number;
  masks_end: number;
  distancing: boolean;
  distancing_intensity: number;
  distancing_start: number;
  distancing_end: number;
  lockdown: boolean;
  lockdown_intensity: number;
  lockdown_start: number;
  lockdown_end: number;
}
type AppScreen = "home" | "result" | "sobre";

// ─── AnimatedBackground ───────────────────────────────────────────────────────
const CELL_SIZE = 6; const CELL_GAP = 1; const STEP = CELL_SIZE + CELL_GAP;
const CELL_COLORS = ["#0d3318", "#0a1f45", "#4a1010", "#3d2a05", "#1a1d21"];

function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvasEl = canvasRef.current; if (!canvasEl) return;
    const ctx = canvasEl.getContext("2d"); if (!ctx) return;
    const drawingCanvas = canvasEl;
    const drawingCtx = ctx;
    let w = window.innerWidth; let h = window.innerHeight;
    drawingCanvas.width = w; drawingCanvas.height = h;
    let cols = Math.ceil(w / STEP); let rows = Math.ceil(h / STEP); let total = cols * rows;
    let states = new Uint8Array(total); let infectedAt = new Int32Array(total).fill(-1); let tick = 0;
    function init(c: number, r: number) {
      const t = c * r; const s = new Uint8Array(t); const ia = new Int32Array(t).fill(-1);
      for (let i = 0; i < t; i++) {
        const rand = Math.random();
        if (rand < 0.78) s[i] = 0; else if (rand < 0.92) s[i] = 1;
        else if (rand < 0.96) { s[i] = 2; ia[i] = 0; } else if (rand < 0.99) s[i] = 3; else s[i] = 4;
      }
      return { s, ia };
    }
    const initial = init(cols, rows); states = initial.s; infectedAt = initial.ia;
    function draw() {
      drawingCtx.clearRect(0, 0, w, h);
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        drawingCtx.fillStyle = CELL_COLORS[states[row * cols + col]];
        drawingCtx.fillRect(col * STEP, row * STEP, CELL_SIZE, CELL_SIZE);
      }
    }
    function update() {
      tick++;
      const n = Math.max(1, Math.floor(total * 0.005));
      for (let u = 0; u < n; u++) {
        const i = Math.floor(Math.random() * total); if (states[i] !== 0) continue;
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
      w = window.innerWidth; h = window.innerHeight; drawingCanvas.width = w; drawingCanvas.height = h;
      cols = Math.ceil(w / STEP); rows = Math.ceil(h / STEP); total = cols * rows;
      const re = init(cols, rows); states = re.s; infectedAt = re.ia; tick = 0; draw();
    }
    window.addEventListener("resize", onResize);
    return () => { clearInterval(interval); window.removeEventListener("resize", onResize); };
  }, []);
  return (
    <>
      <canvas ref={canvasRef} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: -1, display: "block" }} />
      <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "#0D1117", opacity: 0.35, zIndex: 0, pointerEvents: "none" }} />
    </>
  );
}

// ─── shared atoms ─────────────────────────────────────────────────────────────

function LogoPill({ hovered = false, active = false }: { hovered?: boolean; active?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: hovered ? C.elevated : C.surface, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: "6px 14px 6px 8px", transition: "all 0.15s ease" }}>
      <div style={{ width: 22, height: 22, background: C.greenDark, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>🦠</div>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: active ? C.green : hovered ? C.textPrimary : "#C9D1D9", fontWeight: 500, letterSpacing: "0.01em", transition: "color 0.15s ease" }}>
        PeriferiaLab
      </span>
    </div>
  );
}

function IfpeBadge() {
  return <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.textMuted, letterSpacing: "0.04em" }}>PET Conexão Periferia</span>;
}

function Footer() {
  return (
    <footer style={{ width: "100%", padding: "10px 20px", borderTop: `0.5px solid ${C.border}`, background: C.bg, display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" as const, flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 16, height: 16, borderRadius: "50%", background: C.greenDark, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, flexShrink: 0 }}>🦠</div>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, color: "#C9D1D9" }}>PET Conexão Periferia</span>
        <span style={{ color: C.dead, margin: "0 6px", lineHeight: 1 }}>·</span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.textMuted }}>IFPE Campus Igarassu</span>
      </div>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: C.textMuted, letterSpacing: "0.04em" }}>Periferia faz Ciência 🔬</span>
    </footer>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: C.textSecondary, marginBottom: 14 }}>{children}</div>;
}

function TagPill({ label, bg = C.elevated, color = C.textSecondary, border = C.border }: { label: string; bg?: string; color?: string; border?: string }) {
  return (
    <span style={{ display: "inline-block", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", color, background: bg, border: `0.5px solid ${border}`, borderRadius: 4, padding: "3px 8px" }}>
      {label}
    </span>
  );
}

// ─── MissionCard ──────────────────────────────────────────────────────────────

function MissionCard({ badge, title, body, hypothesis, isEditable, onHypothesisChange, visible }: {
  badge: string; title: string; body: string; hypothesis: string;
  isEditable: boolean; onHypothesisChange?: (v: string) => void; visible: boolean;
}) {
  return (
    <div style={{ background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: "20px 20px 18px", marginBottom: 24 }}>
      <div style={{ opacity: visible ? 1 : 0, transition: "opacity 0.15s ease-in-out" }}>
        <div style={{ marginBottom: 12 }}>
          <TagPill label={badge} bg="#0D2818" color={C.green} border={C.greenDark} />
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 500, color: C.textPrimary, lineHeight: 1.35, marginBottom: 12 }}>
          {title}
        </div>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: C.textSecondary, lineHeight: 1.65, margin: "0 0 14px" }}>
          {body}
        </p>
        {isEditable ? (
          <textarea
            value={hypothesis}
            onChange={(e) => onHypothesisChange?.(e.target.value)}
            placeholder="💡 Escreva aqui o que você acha que vai acontecer antes de simular..."
            rows={2}
            style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.skyBlue58, background: "rgba(31,111,235,0.08)", border: "0.5px solid rgba(31,111,235,0.30)", borderRadius: 6, padding: "8px 12px", lineHeight: 1.5, marginTop: 8, width: "100%", boxSizing: "border-box" as const, resize: "none", outline: "none", cursor: "text", display: "block" }}
          />
        ) : (
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.green, background: "rgba(74,222,128,0.07)", border: "0.5px solid rgba(74,222,128,0.25)", borderRadius: 6, padding: "8px 12px", lineHeight: 1.5, marginTop: 8 }}>
            {hypothesis}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HypothesisCard ───────────────────────────────────────────────────────────

function HypothesisCard({ hyp, isSelected, isHovered, onSelect, onHover }: {
  hyp: (typeof HYPOTHESES)[number]; isSelected: boolean; isHovered: boolean;
  onSelect: () => void; onHover: (v: boolean) => void;
}) {
  return (
    <button onClick={onSelect} onMouseEnter={() => onHover(true)} onMouseLeave={() => onHover(false)}
      style={{ all: "unset", cursor: "pointer", display: "block", background: isSelected ? "#0D2818" : C.surface, border: (isSelected || isHovered) ? `0.5px solid ${C.green}` : `0.5px solid ${C.border}`, borderRadius: 8, padding: 14, transition: "all 0.15s ease", textAlign: "left" as const }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <TagPill label={hyp.badge} />
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: hyp.dot, flexShrink: 0 }} />
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: C.textPrimary, lineHeight: 1.35, marginBottom: 6 }}>{hyp.title}</div>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.textSecondary, lineHeight: 1.5, margin: "0 0 10px" }}>{hyp.desc}</p>
      <TagPill label={hyp.tag} bg={hyp.tagBg} color={hyp.tagColor} border={hyp.tagBorder} />
    </button>
  );
}

// ─── CityPill ─────────────────────────────────────────────────────────────────

function CityPill({ city, isSelected, onClick }: { city: (typeof CITIES)[number]; isSelected: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, background: isSelected ? "#0D2818" : C.surface, border: (isSelected || hovered) ? `0.5px solid ${C.green}` : `0.5px solid ${C.border}`, borderRadius: 8, padding: "6px 14px", transition: "all 0.15s ease" }}>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: isSelected ? C.green : hovered ? "#C9D1D9" : C.textSecondary, transition: "color 0.15s ease" }}>{city.name}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#4D78AB" }}>{city.pop}</span>
    </button>
  );
}

// ─── Screen 1 ─────────────────────────────────────────────────────────────────

function Screen1({ onStart, onNavigate }: { onStart: (hId: string, cId: string, text: string) => void; onNavigate: (s: AppScreen) => void }) {
  const [selectedHyp, setSelectedHyp] = useState<HypothesisId>("vacina");
  const [displayedHypId, setDisplayedHypId] = useState<HypothesisId>("vacina");
  const [missionVisible, setMissionVisible] = useState(true);
  const [hoveredHyp, setHoveredHyp] = useState<HypothesisId | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityId>("igarassu");
  const [ctaHovered, setCtaHovered] = useState(false);
  const [logoHovered, setLogoHovered] = useState(false);
  const [sobreHovered, setSobreHovered] = useState(false);
  const [customHypothesis, setCustomHypothesis] = useState("");

  const selectHyp = (id: HypothesisId) => {
    if (id === selectedHyp) return;
    setSelectedHyp(id); setMissionVisible(false);
    setTimeout(() => { setDisplayedHypId(id); setMissionVisible(true); }, 150);
  };

  const displayedHyp = HYPOTHESES.find((h) => h.id === displayedHypId)!;
  const activeHyp = HYPOTHESES.find((h) => h.id === selectedHyp)!;
  const isEditable = displayedHypId === "livre";
  const hypothesisText = isEditable ? customHypothesis : displayedHyp.hypothesis;

  return (
    <div style={{ minHeight: "100vh", background: "transparent", display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
      <AnimatedBackground />
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 24px", borderBottom: `0.5px solid ${C.border}`, position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button onClick={() => {}} onMouseEnter={() => setLogoHovered(true)} onMouseLeave={() => setLogoHovered(false)} style={{ all: "unset", cursor: "pointer" }}>
            <LogoPill hovered={logoHovered} active={true} />
          </button>
          <button onClick={() => onNavigate("sobre")} onMouseEnter={() => setSobreHovered(true)} onMouseLeave={() => setSobreHovered(false)}
            style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: sobreHovered ? C.textPrimary : "#C9D1D9", padding: "9px 14px", borderRadius: 8, background: sobreHovered ? C.elevated : C.surface, border: `0.5px solid ${C.border}`, transition: "all 0.15s ease" }}>
            Sobre
          </button>
        </div>
        <IfpeBadge />
      </header>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "36px 24px 56px", overflowY: "auto", position: "relative", zIndex: 2 }}>
        <div style={{ width: "100%", maxWidth: 560 }}>
          <MissionCard
            badge={displayedHyp.badge} title={displayedHyp.missionTitle}
            body={displayedHyp.missionBody} hypothesis={hypothesisText}
            isEditable={isEditable} onHypothesisChange={setCustomHypothesis} visible={missionVisible}
          />

          <div style={{ marginBottom: 24 }}>
            <SectionLabel>① Escolha a missão</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {HYPOTHESES.map((hyp) => (
                <HypothesisCard key={hyp.id} hyp={hyp} isSelected={selectedHyp === hyp.id} isHovered={hoveredHyp === hyp.id}
                  onSelect={() => selectHyp(hyp.id)} onHover={(v) => setHoveredHyp(v ? hyp.id : null)} />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <SectionLabel>② Escolha a cidade</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 7 }}>
              {CITIES.map((city) => <CityPill key={city.id} city={city} isSelected={selectedCity === city.id} onClick={() => setSelectedCity(city.id)} />)}
            </div>
          </div>

          <button onClick={() => onStart(selectedHyp, selectedCity, hypothesisText)} onMouseEnter={() => setCtaHovered(true)} onMouseLeave={() => setCtaHovered(false)}
            style={{ all: "unset", cursor: "pointer", width: "100%", boxSizing: "border-box" as const, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: ctaHovered ? C.greenHover : C.greenDark, borderRadius: 8, padding: "13px 20px", transition: "background 0.15s ease" }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500, color: "#fff" }}>▶ Começar simulação — {activeHyp.badge}</span>
          </button>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.textMuted, textAlign: "center" as const, marginTop: 10, marginBottom: 0, lineHeight: 1.5 }}>
            A simulação usa um modelo matemático real chamado Random Walk — cada quadradinho representa uma pessoa da cidade.
          </p>
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
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.textMuted }}>{label}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.green, fontWeight: 500 }}>{displayValue}</span>
      </div>
      <div style={{ padding: "6px 0", cursor: "pointer" }}>
        <div ref={trackRef}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); compute(e.clientX); }}
          onPointerMove={(e) => { if (e.buttons === 0) return; compute(e.clientX); }}
          style={{ position: "relative", height: 4, background: C.elevated, borderRadius: 2, userSelect: "none" as const }}>
          <div style={{ width: `${pct * 100}%`, height: "100%", background: C.green, borderRadius: 2, pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: -5, left: `calc(${pct * 100}% - 7px)`, width: 14, height: 14, borderRadius: "50%", background: C.green, border: `2px solid ${C.bg}`, boxShadow: "0 0 0 2px rgba(74,222,128,0.2)", pointerEvents: "none" }} />
        </div>
      </div>
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

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

function MeasurePanel({
  title,
  dot,
  desc,
  enabled,
  expanded,
  onToggle,
  onExpand,
  children,
}: {
  title: string;
  dot: string;
  desc: string;
  enabled: boolean;
  expanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onExpand}
      style={{
        marginBottom: 10,
        background: enabled ? "rgba(74,222,128,0.04)" : C.elevated,
        border: `0.5px solid ${enabled ? C.green : C.border}`,
        borderRadius: 8,
        padding: 10,
        transition: "all 0.15s ease",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0 }} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: enabled ? C.textPrimary : "#C9D1D9" }}>{title}</span>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <Toggle on={enabled} onChange={onToggle} />
        </div>
      </div>

      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.textMuted, margin: "6px 0 0", lineHeight: 1.4, paddingLeft: 14 }}>
        {desc}
      </p>

      {enabled && expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `0.5px solid ${C.border}` }}>
          {children}
        </div>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "22px 20px", background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 8 }}>
      <style>{`
        @keyframes sim-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      <div style={{ position: "relative", width: 44, height: 44 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `3px solid rgba(74, 222, 128, 0.14)`, borderTopColor: C.green, borderRightColor: C.blue, animation: "sim-spin 0.9s linear infinite" }} />
        <div style={{ position: "absolute", inset: 12, borderRadius: "50%", background: C.bg, border: `1px solid ${C.border}` }} />
      </div>
      <div style={{ textAlign: "center" as const }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.green, letterSpacing: "0.05em", textTransform: "uppercase" as const, marginBottom: 4 }}>Processando simulação</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>Aguarde o grid terminar de avançar para liberar os resultados.</div>
      </div>
    </div>
  );
}

// ─── PopulationGrid ───────────────────────────────────────────────────────────

function PopulationGrid({ data, week, label, population }: { data: ScenarioResult | null; week: number; label: string; population: string }) {
  const gridSize = data ? Math.round(Math.sqrt(data.total_population)) : 0;
  const snapshot = data && week > 0 ? data.grid_history[Math.min(week - 1, data.grid_history.length - 1)] : null;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const colorForState = (state: number) => {
    if (state === 0) return C.greenDark;
    if (state === 1) return C.red;
    if (state === 2) return C.dead;
    return C.blue;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, width, height);

      if (!snapshot || !gridSize) return;

      const cellWidth = width / gridSize;
      const cellHeight = height / gridSize;

      for (let index = 0; index < snapshot.length; index++) {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        ctx.fillStyle = colorForState(snapshot[index]);
        ctx.fillRect(Math.floor(col * cellWidth), Math.floor(row * cellHeight), Math.ceil(cellWidth), Math.ceil(cellHeight));
      }
    };

    draw();

    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(container);
    window.addEventListener("resize", draw);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", draw);
    };
  }, [snapshot, gridSize]);

  return (
    <div ref={containerRef} aria-label={label} style={{ borderRadius: 8, border: `0.5px solid ${C.border}`, aspectRatio: "1 / 1", background: C.bg, position: "relative", overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(13,17,23,0.8)", borderRadius: 4, padding: "3px 8px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.textMuted }}>
        {data ? population : "aguardando..."}
      </div>
    </div>
  );
}

// ─── Grid legend ──────────────────────────────────────────────────────────────

function GridLegend() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 18, flexWrap: "wrap" as const, padding: "8px 20px 4px" }}>
      {[
        { color: C.greenDark, label: "Saudável"       },
        { color: C.red,       label: "Infectado"       },
        { color: C.blue,      label: "Imune"           },
        { color: C.dead,      label: "Óbito"           },
      ].map(({ color, label }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.textMuted }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── LineChart ────────────────────────────────────────────────────────────────

function LineChart({ s1, s2, currentWeek }: { s1: ScenarioResult; s2: ScenarioResult; currentWeek: number }) {
  const maxDead = Math.max(...s1.dead, ...s2.dead, 1);
  const weeks = s1.dead.length;
  const W = 620; const H = 80;
  const toPath = (data: number[]) =>
    data.slice(0, currentWeek).map((v, i) => `${i === 0 ? "M" : "L"} ${(i / (weeks - 1)) * W} ${H - (v / maxDead) * (H - 4)}`).join(" ");
  const p1 = toPath(s1.dead); const p2 = toPath(s2.dead);
  const endX1 = p1 ? ((currentWeek - 1) / (weeks - 1)) * W : 0;
  const endX2 = p2 ? ((currentWeek - 1) / (weeks - 1)) * W : 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
      {p1 && <><path d={`${p1} L ${endX1} ${H} L 0 ${H} Z`} fill="rgba(218,54,51,0.15)" /><path d={p1} fill="none" stroke={C.red} strokeWidth="1.5" /></>}
      {p2 && <><path d={`${p2} L ${endX2} ${H} L 0 ${H} Z`} fill="rgba(74,222,128,0.1)" /><path d={p2} fill="none" stroke={C.green} strokeWidth="1.5" /></>}
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
  const [toggles, setToggles] = useState<InterventionSettings>(() => ({ ...hyp.defaultInterventions } as InterventionSettings));
  const [expandedMeasure, setExpandedMeasure] = useState<InterventionKey>(
    hyp.defaultInterventions.vaccination
      ? "vaccination"
      : hyp.defaultInterventions.masks
        ? "masks"
        : hyp.defaultInterventions.distancing
          ? "distancing"
          : "lockdown",
  );
  const [simHover, setSimHover] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SimResult | null>(null);
  const [animationResult, setAnimationResult] = useState<SimResult | null>(null);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const weeks = Math.round(1 + semPct * 99);
  const contagion = r0Pct;

  const runSimulation = useCallback(async () => {
    setLoading(true); setError(null); setResult(null); setAnimationResult(null); setCurrentWeek(0); setIsAnimating(false);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
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
      setAnimationResult(data); setIsAnimating(true);
      let w = 1;
      const animate = () => {
        setCurrentWeek(w);
        if (w < weeks) { w++; timeoutRef.current = window.setTimeout(animate, 80); }
        else {
          setResult(data);
          setAnimationResult(null);
          setIsAnimating(false);
        }
      };
      timeoutRef.current = window.setTimeout(animate, 80);
    } catch {
      setError("Não foi possível conectar ao servidor. Verifique se o backend está rodando em localhost:8000");
    } finally {
      setLoading(false);
    }
  }, [cidade, weeks, contagion, toggles]);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const savedLives = result ? Math.max(0, result.scenario1.final_deaths - result.scenario2.final_deaths) : 0;
  const savedPct = result && result.scenario1.final_deaths > 0 ? ((savedLives / result.scenario1.final_deaths) * 100).toFixed(1) : "0";
  const cityMeta = CITY_META[cidade] ?? { label: cidade, popFull: "—" };
  const activeResult = animationResult ?? result;

  const weekInputStyle: React.CSSProperties = {
    width: "100%",
    background: C.bg,
    border: `0.5px solid ${C.border}`,
    borderRadius: 6,
    color: C.textPrimary,
    fontSize: 13,
    padding: "8px 10px",
    fontFamily: "'Inter', sans-serif",
    outline: "none",
    boxSizing: "border-box",
  };

  const helperTextStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: 11,
    color: C.textMuted,
    lineHeight: 1.45,
    margin: 0,
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, overflow: "hidden" }}>
      <style>{`@keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside style={{ width: 270, flexShrink: 0, background: C.surface, borderRight: `0.5px solid ${C.border}`, display: "flex", flexDirection: "column", overflowY: "auto" }}>

        <div style={{ padding: "14px 16px", borderBottom: `0.5px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={onBack} style={{ all: "unset", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.textMuted, background: C.elevated, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: "4px 10px", marginRight: 4 }}>←</button>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: C.greenDark, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🦠</div>
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: C.textPrimary, lineHeight: 1.2 }}>PeriferiaLab</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: C.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginTop: 1 }}>Simulador de Pandemias</div>
            </div>
          </div>
        </div>

        <SidebarSection>
          <SectionLabel>Cidade simulada</SectionLabel>
          <div style={{ position: "relative" }}>
            <select value={cidade} onChange={(e) => setCidade(e.target.value)}
              style={{ width: "100%", background: C.elevated, border: `0.5px solid ${C.border}`, borderRadius: 6, color: C.textPrimary, fontSize: 13, padding: "7px 28px 7px 10px", appearance: "none" as const, cursor: "pointer", fontFamily: "'Inter', sans-serif", outline: "none", boxSizing: "border-box" as const }}>
              <option value="igarassu">Igarassu (115.196 hab.)</option>
              <option value="goiana">Goiana (81.055 hab.)</option>
              <option value="itapissuma">Itapissuma (27.749 hab.)</option>
              <option value="itamaraca">Itamaracá (24.540 hab.)</option>
              <option value="aracoiaba">Araçoiaba (19.243 hab.)</option>
            </select>
            <div style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.textMuted, fontSize: 10 }}>▾</div>
          </div>
        </SidebarSection>

        <SidebarSection>
          <SectionLabel>Parâmetros do vírus</SectionLabel>
          <Slider label="Velocidade de contágio" displayValue={`R₀ = ${(r0Pct * 4).toFixed(1)}`} pct={r0Pct} onPctChange={setR0Pct} />
          <Slider label="Duração da simulação" displayValue={`${weeks} semanas`} pct={semPct} onPctChange={setSemPct} />
        </SidebarSection>

        <SidebarSection style={{ flex: 1 }}>
          <SectionLabel>Medidas de proteção — Cenário 2</SectionLabel>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.textMuted, marginBottom: 14, lineHeight: 1.5 }}>
            Clique em uma medida para abrir os campos de semana de início e adesão. O Cenário 1 fica sempre sem proteção para comparar.
          </p>
          <MeasurePanel
            title="Vacinação"
            dot={C.green}
            desc="Imuniza parte da população antes do surto"
            enabled={toggles.vaccination}
            expanded={expandedMeasure === "vaccination"}
            onToggle={() => setToggles((t) => {
              const nextEnabled = !t.vaccination;
              if (nextEnabled) setExpandedMeasure("vaccination");
              return { ...t, vaccination: nextEnabled };
            })}
            onExpand={() => setExpandedMeasure("vaccination")}
          >
            <Slider
              label="Cobertura da vacinação"
              displayValue={`${Math.round(toggles.vaccination_pct * 100)}% da população`}
              pct={toggles.vaccination_pct}
              onPctChange={(value) => setToggles((t) => ({ ...t, vaccination_pct: value }))}
            />
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={helperTextStyle}>Semana de início</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.green }}>Semana {toggles.vaccination_week}</span>
              </div>
              <input
                type="number"
                min={1}
                max={weeks}
                value={toggles.vaccination_week}
                onChange={(e) => setToggles((t) => ({ ...t, vaccination_week: Math.max(1, Math.min(weeks, Number(e.target.value) || 1)) }))}
                style={weekInputStyle}
              />
            </div>
          </MeasurePanel>

          <MeasurePanel
            title="Uso de Máscaras"
            dot={C.amber}
            desc="Reduz a chance de transmissão no contato"
            enabled={toggles.masks}
            expanded={expandedMeasure === "masks"}
            onToggle={() => setToggles((t) => {
              const nextEnabled = !t.masks;
              if (nextEnabled) setExpandedMeasure("masks");
              return { ...t, masks: nextEnabled };
            })}
            onExpand={() => setExpandedMeasure("masks")}
          >
            <Slider
              label="Aderência ao uso de máscaras"
              displayValue={`${Math.round(toggles.masks_adherence * 100)}% da população`}
              pct={toggles.masks_adherence}
              onPctChange={(value) => setToggles((t) => ({ ...t, masks_adherence: value }))}
            />
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={helperTextStyle}>Semana de início</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.amber }}>Semana {toggles.masks_start}</span>
              </div>
              <input
                type="number"
                min={1}
                max={weeks}
                value={toggles.masks_start}
                onChange={(e) => setToggles((t) => {
                  const nextStart = Math.max(1, Math.min(weeks, Number(e.target.value) || 1));
                  return { ...t, masks_start: nextStart, masks_end: Math.max(nextStart, t.masks_end) };
                })}
                style={weekInputStyle}
              />
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={helperTextStyle}>Semana de término</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.amber }}>Semana {toggles.masks_end}</span>
              </div>
              <input
                type="number"
                min={toggles.masks_start}
                max={weeks}
                value={toggles.masks_end}
                onChange={(e) => setToggles((t) => ({ ...t, masks_end: Math.max(t.masks_start, Math.min(weeks, Number(e.target.value) || t.masks_start)) }))}
                style={weekInputStyle}
              />
              <p style={{ ...helperTextStyle, marginTop: 8 }}>A medida fica ativa apenas no período configurado.</p>
            </div>
          </MeasurePanel>

          <MeasurePanel
            title="Distanciamento Social"
            dot={C.skyBlue}
            desc="Pessoas evitam aglomerações e contato próximo"
            enabled={toggles.distancing}
            expanded={expandedMeasure === "distancing"}
            onToggle={() => setToggles((t) => {
              const nextEnabled = !t.distancing;
              if (nextEnabled) setExpandedMeasure("distancing");
              return { ...t, distancing: nextEnabled };
            })}
            onExpand={() => setExpandedMeasure("distancing")}
          >
            <Slider
              label="Aderência ao distanciamento"
              displayValue={`${Math.round(toggles.distancing_intensity * 100)}% da população`}
              pct={toggles.distancing_intensity}
              onPctChange={(value) => setToggles((t) => ({ ...t, distancing_intensity: value }))}
            />
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={helperTextStyle}>Semana de início</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.skyBlue }}>Semana {toggles.distancing_start}</span>
              </div>
              <input
                type="number"
                min={1}
                max={weeks}
                value={toggles.distancing_start}
                onChange={(e) => setToggles((t) => {
                  const nextStart = Math.max(1, Math.min(weeks, Number(e.target.value) || 1));
                  return { ...t, distancing_start: nextStart, distancing_end: Math.max(nextStart, t.distancing_end) };
                })}
                style={weekInputStyle}
              />
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={helperTextStyle}>Semana de término</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.skyBlue }}>Semana {toggles.distancing_end}</span>
              </div>
              <input
                type="number"
                min={toggles.distancing_start}
                max={weeks}
                value={toggles.distancing_end}
                onChange={(e) => setToggles((t) => ({ ...t, distancing_end: Math.max(t.distancing_start, Math.min(weeks, Number(e.target.value) || t.distancing_start)) }))}
                style={weekInputStyle}
              />
              <p style={{ ...helperTextStyle, marginTop: 8 }}>A medida fica ativa apenas no período configurado.</p>
            </div>
          </MeasurePanel>

          <MeasurePanel
            title="Lockdown"
            dot={C.red}
            desc="Fechamento total — máximo isolamento possível"
            enabled={toggles.lockdown}
            expanded={expandedMeasure === "lockdown"}
            onToggle={() => setToggles((t) => {
              const nextEnabled = !t.lockdown;
              if (nextEnabled) setExpandedMeasure("lockdown");
              return { ...t, lockdown: nextEnabled };
            })}
            onExpand={() => setExpandedMeasure("lockdown")}
          >
            <Slider
              label="Aderência ao lockdown"
              displayValue={`${Math.round(toggles.lockdown_intensity * 100)}% da população`}
              pct={toggles.lockdown_intensity}
              onPctChange={(value) => setToggles((t) => ({ ...t, lockdown_intensity: value }))}
            />
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={helperTextStyle}>Semana de início</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.red }}>Semana {toggles.lockdown_start}</span>
              </div>
              <input
                type="number"
                min={1}
                max={weeks}
                value={toggles.lockdown_start}
                onChange={(e) => setToggles((t) => {
                  const nextStart = Math.max(1, Math.min(weeks, Number(e.target.value) || 1));
                  return { ...t, lockdown_start: nextStart, lockdown_end: Math.max(nextStart, t.lockdown_end) };
                })}
                style={weekInputStyle}
              />
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={helperTextStyle}>Semana de término</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.red }}>Semana {toggles.lockdown_end}</span>
              </div>
              <input
                type="number"
                min={toggles.lockdown_start}
                max={weeks}
                value={toggles.lockdown_end}
                onChange={(e) => setToggles((t) => ({ ...t, lockdown_end: Math.max(t.lockdown_start, Math.min(weeks, Number(e.target.value) || t.lockdown_start)) }))}
                style={weekInputStyle}
              />
              <p style={{ ...helperTextStyle, marginTop: 8 }}>A medida fica ativa apenas no período configurado.</p>
            </div>
          </MeasurePanel>
        </SidebarSection>

        <div style={{ margin: "14px 16px" }}>
          <button onClick={runSimulation} disabled={loading || isAnimating}
            onMouseEnter={() => setSimHover(true)} onMouseLeave={() => setSimHover(false)}
            style={{ all: "unset", cursor: loading || isAnimating ? "default" : "pointer", width: "100%", boxSizing: "border-box" as const, padding: "11px 0", background: loading || isAnimating ? C.elevated : simHover ? C.greenHover : C.greenDark, borderRadius: 8, color: loading || isAnimating ? C.textMuted : "#fff", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background 0.15s ease" }}>
            {loading ? "⏳ Calculando..." : isAnimating ? `▶ Semana ${currentWeek} de ${weeks}` : "▶ Rodar Simulação"}
          </button>
        </div>
      </aside>

      {/* ── MAIN PANEL ───────────────────────────────────────────────────── */}
      <main style={{ flex: 1, background: C.bg, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* TOP BAR */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `0.5px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <TagPill label={hyp.badge} bg="#0D2818" color={C.green} border={C.greenDark} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 500, color: C.textPrimary }}>{hyp.title}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {result && !isAnimating && (
              <TagPill label="✓ CONCLUÍDA" bg="rgba(74,222,128,0.07)" color={C.green} border={C.green} />
            )}
            <TagPill label={cityMeta.label} bg="rgba(31,111,235,0.1)" color={C.skyBlue58} border={C.blue} />
          </div>
        </div>

        {/* HYPOTHESIS BANNER */}
        {hypothesisText && (
          <div style={{ margin: "12px 20px 0", background: "rgba(31,111,235,0.07)", border: "0.5px solid rgba(31,111,235,0.25)", borderRadius: 8, padding: "10px 14px", flexShrink: 0 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: C.skyBlue58, letterSpacing: "0.05em", textTransform: "uppercase" as const, display: "block", marginBottom: 4 }}>Hipótese testada</span>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.skyBlue58, lineHeight: 1.55, margin: 0 }}>{hypothesisText}</p>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div style={{ margin: "12px 20px 0", padding: "12px 16px", background: "rgba(218,54,51,0.1)", border: `0.5px solid ${C.red}`, borderRadius: 8, flexShrink: 0 }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.red, margin: 0 }}>⚠ {error}</p>
          </div>
        )}

        {/* SCROLLABLE CONTENT */}
        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* GRIDS */}
          <div style={{ display: "flex", justifyContent: "center", gap: 32, padding: "16px 20px 0" }}>
            <div style={{ width: 280, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <SectionLabel>Cenário 1 — Sem proteção</SectionLabel>
                <span style={{ marginTop: -10, flexShrink: 0 }}><TagPill label="CONTROLE" /></span>
              </div>
              <PopulationGrid data={activeResult?.scenario1 ?? null} week={currentWeek} label="s1" population={cityMeta.popFull} />
            </div>
            <div style={{ width: 280, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <SectionLabel>Cenário 2 — Com medidas</SectionLabel>
                <span style={{ marginTop: -10, flexShrink: 0 }}><TagPill label="INTERVENÇÃO" /></span>
              </div>
              <PopulationGrid data={activeResult?.scenario2 ?? null} week={currentWeek} label="s2" population={cityMeta.popFull} />
            </div>
          </div>

          {/* GRID LEGEND */}
          <GridLegend />

          {/* LOADING STATE */}
          {isAnimating && !result && (
            <div style={{ padding: "8px 20px 0" }}>
              <LoadingSpinner />
            </div>
          )}

          {/* EMPTY STATE */}
          {!result && !loading && !error && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px", gap: 12 }}>
              <div style={{ fontSize: 32 }}>🔬</div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: C.textMuted, textAlign: "center" as const, lineHeight: 1.6, margin: 0 }}>
                Configure as medidas na barra lateral e clique em<br />
                <strong style={{ color: C.green }}>▶ Rodar Simulação</strong> para ver os resultados.
              </p>
            </div>
          )}

          {/* STATS */}
          {result && !isAnimating && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, padding: "12px 20px 14px" }}>
                {[
                  { value: result.scenario1.final_deaths.toLocaleString("pt-BR"), valueColor: C.red,     label: "mortes no cenário sem intervenção",      delta: `${((result.scenario1.final_deaths / result.scenario1.total_population) * 100).toFixed(1)}% da população simulada`, deltaColor: C.red     },
                  { value: result.scenario2.final_deaths.toLocaleString("pt-BR"), valueColor: C.green,   label: "mortes no cenário com intervenção",      delta: savedLives > 0 ? `${savedPct}% menos na população simulada` : "mesmo resultado",                                                       deltaColor: C.green   },
                  { value: savedLives.toLocaleString("pt-BR"),                    valueColor: C.skyBlue, label: "vidas salvas",              delta: `${savedPct}% a menos`,                                                                                           deltaColor: C.skyBlue },
                ].map(({ value, valueColor, label, delta, deltaColor }) => (
                  <div key={label} style={{ background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 500, color: valueColor, lineHeight: 1.2, marginBottom: 4 }}>{value}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.textMuted, marginBottom: 4, lineHeight: 1.4 }}>{label}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: deltaColor }}>{delta}</div>
                  </div>
                ))}
              </div>

              {/* CHART */}
              <div style={{ padding: "0 20px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: "#C9D1D9" }}>Número de mortes por semana</span>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.textMuted, marginLeft: 8 }}>— quanto mais baixa a linha verde, melhor funcionou</span>
                  </div>
                  <div style={{ display: "flex", gap: 14 }}>
                    {[{ dot: C.red, text: "Sem proteção" }, { dot: C.green, text: "Com proteção" }].map(({ dot, text }) => (
                      <div key={text} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: dot }} />
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.textMuted }}>{text}</span>
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
        </div>
        <Footer />
      </main>
    </div>
  );
}

// ─── Screen About ─────────────────────────────────────────────────────────────

function ScreenAbout({ onNavigate }: { onNavigate: (s: AppScreen) => void }) {
  const [homeHovered, setHomeHovered] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);

  const Card = ({ children }: { children: React.ReactNode }) => (
    <div style={{ background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: 24, marginBottom: 16 }}>{children}</div>
  );
  const H2 = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 500, color: C.textPrimary, margin: "0 0 14px", lineHeight: 1.3 }}>{children}</h2>
  );
  const Body = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: C.textSecondary, lineHeight: 1.7, margin: 0, ...style }}>{children}</p>
  );

  const steps = [
    "Escolha uma missão (pergunta) e a cidade que deseja simular.",
    'Clique em "Começar simulação" para abrir a tela de configuração.',
    "Ative as medidas de proteção que quiser testar: Vacinação, Máscaras, Distanciamento, Lockdown.",
    "Ajuste a velocidade do vírus e a duração da simulação.",
    'Clique em "Rodar Simulação" e analise os resultados.',
  ];
  const outcomes = ["Número de mortes", "Vidas salvas", "Evolução do contágio", "Impacto de cada medida"];

  return (
    <div style={{ minHeight: "100vh", background: "transparent", display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
      <AnimatedBackground />
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 24px", borderBottom: `0.5px solid ${C.border}`, position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button onClick={() => onNavigate("home")} onMouseEnter={() => setHomeHovered(true)} onMouseLeave={() => setHomeHovered(false)} style={{ all: "unset", cursor: "pointer" }}>
            <LogoPill hovered={homeHovered} active={false} />
          </button>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: C.green, background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: "6px 14px" }}>Sobre</span>
        </div>
        <IfpeBadge />
      </header>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "36px 24px 56px", overflowY: "auto", position: "relative", zIndex: 2 }}>
        <div style={{ width: "100%", maxWidth: 600 }}>
          <Card>
            <H2>🏫 Quem somos?</H2>
            <Body style={{ marginBottom: 12 }}>Somos o <strong style={{ color: C.textPrimary, fontWeight: 500 }}>PET Conexão Periferia</strong>, o primeiro grupo do Programa de Educação Tutorial (PET) do IFPE, vinculado ao curso de Sistemas para Internet do Campus Igarassu.</Body>
            <Body>Reconhecido com nota máxima nacional na Rede de Integridade da Informação do MEC, nosso grupo desenvolve projetos que unem tecnologia, ciência e educação para combater a desinformação e aproximar o conhecimento da sociedade.</Body>
          </Card>

          <Card>
            <H2>🦠 Sobre o Simulador</H2>
            <Body>Aqui, você assume o papel de quem precisa tomar decisões durante uma pandemia. Seu desafio é entender como diferentes medidas — vacina, máscara, distanciamento, lockdown — podem mudar quantas pessoas sobrevivem.</Body>
          </Card>

          <Card>
            <H2>⚙️ Como funciona?</H2>
            <div>
              {steps.map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < steps.length - 1 ? 12 : 0, alignItems: "flex-start" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.elevated, border: `0.5px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.green, flexShrink: 0 }}>{i + 1}</div>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: C.textSecondary, lineHeight: 1.6, paddingTop: 3 }}>{step}</span>
                </div>
              ))}
            </div>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {[
              { dot: C.dead,  label: "CENÁRIO 1", body: "Mostra como a doença evolui", bold: "sem nenhuma proteção" },
              { dot: C.green, label: "CENÁRIO 2", body: "Mostra como suas escolhas podem", bold: "reduzir o contágio e salvar vidas" },
            ].map(({ dot, label, body, bold }) => (
              <div key={label} style={{ background: C.surface, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: dot }} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.textMuted, letterSpacing: "0.05em" }}>{label}</span>
                </div>
                <Body>{body} <strong style={{ color: C.textPrimary, fontWeight: 500 }}>{bold}</strong>.</Body>
              </div>
            ))}
          </div>

          <Card>
            <H2>📊 O que você vai ver no resultado</H2>
            <Body style={{ marginBottom: 16 }}>Ao final da simulação, você acompanha:</Body>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
              {outcomes.map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.green, flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.textSecondary }}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{ background: C.bg, border: "0.5px solid rgba(74,222,128,0.2)", borderRadius: 6, padding: "12px 16px" }}>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: C.green, margin: 0, lineHeight: 1.6, fontWeight: 500 }}>Cada decisão gera um resultado diferente. Qual será o impacto das suas escolhas?</p>
            </div>
          </Card>

          <button onClick={() => onNavigate("home")} onMouseEnter={() => setCtaHovered(true)} onMouseLeave={() => setCtaHovered(false)}
            style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", boxSizing: "border-box" as const, background: ctaHovered ? C.greenHover : C.greenDark, borderRadius: 8, padding: "13px 20px", transition: "background 0.15s ease" }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500, color: "#fff" }}>▶ Começar simulação</span>
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ─── root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<AppScreen>("home");
  const [hypothesisId, setHypothesisId] = useState("vacina");
  const [cityId, setCityId] = useState("igarassu");
  const [hypText, setHypText] = useState("");

  const handleStart = (hId: string, cId: string, text: string) => {
    setHypothesisId(hId); setCityId(cId); setHypText(text); setScreen("result");
  };
  const navigate = (s: AppScreen) => setScreen(s);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {screen === "home"   && <Screen1 onStart={handleStart} onNavigate={navigate} />}
      {screen === "result" && <Screen2 hypothesisId={hypothesisId} cityId={cityId} hypothesisText={hypText} onBack={() => setScreen("home")} />}
      {screen === "sobre"  && <ScreenAbout onNavigate={navigate} />}
    </div>
  );
}