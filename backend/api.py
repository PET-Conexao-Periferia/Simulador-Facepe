from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from randomWalk import RandomWalkModel, State

app = FastAPI(title="Simulador de Pandemia API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tamanhos de grid por cidade (proporcional à população)
CITY_GRID = {
    "igarassu":   90,
    "goiana":     75,
    "itapissuma": 55,
    "itamaraca":  51,
    "aracoiaba":  46,
}

class SimulationRequest(BaseModel):
    city: str = "igarassu"
    weeks: int = 52
    contagion_factor: float = 0.5
    # Cenário 2 — intervenções
    vaccination: bool = False
    vaccination_pct: float = 0.5
    vaccination_week: int = 1
    masks: bool = False
    masks_adherence: float = 0.5
    masks_start: int = 1
    masks_end: int = 52
    lockdown: bool = False
    lockdown_intensity: float = 0.5
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
    scenario1: ScenarioResult  # sem intervenção
    scenario2: ScenarioResult  # com intervenção


def run_scenario(grid_size: int, weeks: int, base_contagion: float, interventions: dict) -> ScenarioResult:
    model = RandomWalkModel(grid_size)
    healthy_hist, sick_hist, dead_hist, immune_hist = [], [], [], []

    for week in range(1, weeks + 1):
        contagion = base_contagion
        distance = 0.0

        if interventions.get("masks") and interventions["masks_start"] <= week <= interventions["masks_end"]:
            reduction = interventions["masks_adherence"] * 0.7
            contagion = contagion * (1 - reduction)

        if interventions.get("lockdown") and interventions["lockdown_start"] <= week <= interventions["lockdown_end"]:
            distance = max(distance, interventions["lockdown_intensity"])

        model.update_parameters(contagion, distance)

        if interventions.get("vaccination") and week == interventions["vaccination_week"]:
            model.apply_vaccination(interventions["vaccination_pct"])

        model.nextGeneration()
        report = model.report()
        healthy_hist.append(report[State.healthy.value])
        sick_hist.append(report[State.sick.value])
        dead_hist.append(report[State.dead.value])
        immune_hist.append(report[State.immune.value])

    total = grid_size * grid_size
    return ScenarioResult(
        healthy=healthy_hist,
        sick=sick_hist,
        dead=dead_hist,
        immune=immune_hist,
        final_deaths=model.numberOfDeaths(),
        total_population=total,
    )


@app.post("/simulate", response_model=SimulationResponse)
def simulate(req: SimulationRequest):
    grid_size = CITY_GRID.get(req.city, 70)

    # Cenário 1 — sem nenhuma intervenção
    s1 = run_scenario(grid_size, req.weeks, req.contagion_factor, {})

    # Cenário 2 — com intervenções configuradas
    s2 = run_scenario(grid_size, req.weeks, req.contagion_factor, {
        "vaccination": req.vaccination,
        "vaccination_pct": req.vaccination_pct,
        "vaccination_week": req.vaccination_week,
        "masks": req.masks,
        "masks_adherence": req.masks_adherence,
        "masks_start": req.masks_start,
        "masks_end": req.masks_end,
        "lockdown": req.lockdown,
        "lockdown_intensity": req.lockdown_intensity,
        "lockdown_start": req.lockdown_start,
        "lockdown_end": req.lockdown_end,
    })

    return SimulationResponse(scenario1=s1, scenario2=s2)


@app.get("/")
def root():
    return {"status": "ok", "message": "Simulador de Pandemia API"}
