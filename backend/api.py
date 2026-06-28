from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys, os

sys.path.insert(0, os.path.dirname(__file__))
from randomWalk import RandomWalkModel, State

app = FastAPI(title="Simulador de Pandemia API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

CITY_GRID = {
    "igarassu": 90, "goiana": 75, "itapissuma": 55, "itamaraca": 51, "aracoiaba": 46,
}

# ──────────────────────────────────────────────────────────────────────────────
# EFICÁCIA REAL DAS MEDIDAS DE PROTEÇÃO CONTRA INFLUENZA
# Valores fixos baseados em consenso epidemiológico geral (não ajustáveis pelo
# aluno) — refletem o quanto cada medida reduz a transmissão na prática.
# ──────────────────────────────────────────────────────────────────────────────
VACCINATION_COVERAGE = 0.70    # % da população alvo que a campanha pretende cobrir
VACCINATION_EFFICACY = 0.55    # eficácia da vacina da gripe em prevenir a doença
VACCINATION_CAMPAIGN_WEEKS = 4 # duração da campanha de vacinação, em semanas

MASKS_REDUCTION       = 0.50   # redução na transmissão por uso de máscara
DISTANCING_REDUCTION  = 0.40   # redução de contato por distanciamento social
LOCKDOWN_REDUCTION     = 0.75  # redução de contato por lockdown rígido

class SimulationRequest(BaseModel):
    city: str = "igarassu"
    weeks: int = 52
    contagion_factor: float = 0.5
    vaccination: bool = False
    vaccination_week: int = 1   # semana em que a campanha COMEÇA
    masks: bool = False
    masks_start: int = 1
    masks_end: int = 52
    distancing: bool = False
    distancing_start: int = 1
    distancing_end: int = 52
    lockdown: bool = False
    lockdown_start: int = 1
    lockdown_end: int = 52

class ScenarioResult(BaseModel):
    healthy: list[int]
    sick: list[int]
    dead: list[int]
    immune: list[int]
    final_deaths: int
    total_population: int

class SimulationResponse(BaseModel):
    scenario1: ScenarioResult
    scenario2: ScenarioResult


def run_scenario(grid_size: int, weeks: int, base_contagion: float, interventions: dict) -> ScenarioResult:
    model = RandomWalkModel(grid_size)
    healthy_hist, sick_hist, dead_hist, immune_hist = [], [], [], []

    # campanha de vacinação: aplica uma fração igual da cobertura-alvo a cada semana
    # da campanha, sobre quem estiver saudável NAQUELE momento (cobrindo também
    # quem ficou saudável depois de curar de uma infecção anterior)
    vaccination_start = interventions.get("vaccination_week", 1)
    vaccination_end = vaccination_start + VACCINATION_CAMPAIGN_WEEKS - 1
    # fração semanal calculada para que, aplicada repetidamente sobre os
    # saudáveis remanescentes, a cobertura acumulada se aproxime da meta
    weekly_target = 1 - (1 - VACCINATION_COVERAGE) ** (1 / VACCINATION_CAMPAIGN_WEEKS)
    weekly_dose = weekly_target * VACCINATION_EFFICACY

    for week in range(1, weeks + 1):
        contagion = base_contagion
        distance = 0.0

        if interventions.get("masks") and interventions["masks_start"] <= week <= interventions["masks_end"]:
            contagion = contagion * (1 - MASKS_REDUCTION)

        if interventions.get("distancing") and interventions["distancing_start"] <= week <= interventions["distancing_end"]:
            distance = max(distance, DISTANCING_REDUCTION)

        if interventions.get("lockdown") and interventions["lockdown_start"] <= week <= interventions["lockdown_end"]:
            distance = max(distance, LOCKDOWN_REDUCTION)

        model.update_parameters(contagion, distance)

        if interventions.get("vaccination") and vaccination_start <= week <= vaccination_end:
            model.apply_vaccination(weekly_dose)

        model.nextGeneration()
        report = model.report()
        healthy_hist.append(report[State.healthy.value])
        sick_hist.append(report[State.sick.value])
        dead_hist.append(report[State.dead.value])
        immune_hist.append(report[State.immune.value])

    total = grid_size * grid_size
    return ScenarioResult(
        healthy=healthy_hist, sick=sick_hist, dead=dead_hist, immune=immune_hist,
        final_deaths=model.numberOfDeaths(), total_population=total,
    )


@app.post("/simulate", response_model=SimulationResponse)
def simulate(req: SimulationRequest):
    grid_size = CITY_GRID.get(req.city, 70)
    s1 = run_scenario(grid_size, req.weeks, req.contagion_factor, {})
    s2 = run_scenario(grid_size, req.weeks, req.contagion_factor, {
        "vaccination": req.vaccination, "vaccination_week": req.vaccination_week,
        "masks": req.masks, "masks_start": req.masks_start, "masks_end": req.masks_end,
        "distancing": req.distancing, "distancing_start": req.distancing_start, "distancing_end": req.distancing_end,
        "lockdown": req.lockdown, "lockdown_start": req.lockdown_start, "lockdown_end": req.lockdown_end,
    })
    return SimulationResponse(scenario1=s1, scenario2=s2)

@app.get("/")
def root():
    return {"status": "ok", "message": "Simulador de Pandemia API"}