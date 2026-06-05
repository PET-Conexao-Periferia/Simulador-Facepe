import streamlit as st
import pandas as pd
import time
from PIL import Image
from backend.randomWalk import RandomWalkModel, State

st.set_page_config(page_title="Simulador de Pandemia", layout="wide")

st.title("🦠 Simulador de Pandemia - Random Walk")
st.markdown(
    """
Esta aplicação simula a propagação de um vírus em uma população usando um modelo de Passeio Aleatório (Random Walk).
Configure os parâmetros abaixo e execute a simulação para visualizar os resultados.
"""
)


def intervention_controls(prefix, title):
    st.subheader(title)

    with st.expander("💉 Vacinação"):
        vaccination_enabled = st.checkbox("Habilitar Vacinação", key=f"{prefix}_vaccination_enabled")
        vaccination_percent = st.slider(
            "Porcentagem da População a Vacinar",
            min_value=0,
            max_value=100,
            value=0,
            step=5,
            key=f"{prefix}_vaccination_percent",
            help="Porcentagem de indivíduos SAUDÁVEIS que serão vacinados.",
        ) / 100.0
        vaccination_start = st.number_input(
            "Semana de Início da Vacinação",
            min_value=1,
            max_value=1000,
            value=1,
            key=f"{prefix}_vaccination_start",
        )

    with st.expander("😷 Uso de Máscaras"):
        masks_enabled = st.checkbox("Habilitar Uso de Máscaras", key=f"{prefix}_masks_enabled")
        masks_adherence = st.slider(
            "Adesão ao Uso de Máscaras (%)",
            min_value=0,
            max_value=100,
            value=0,
            step=5,
            key=f"{prefix}_masks_adherence",
            help="Reduz a chance de contágio.",
        ) / 100.0
        masks_start = st.number_input(
            "Início do Uso de Máscaras (Semana)",
            min_value=1,
            max_value=1000,
            value=1,
            key=f"{prefix}_masks_start",
        )
        masks_end = st.number_input(
            "Fim do Uso de Máscaras (Semana)",
            min_value=1,
            max_value=1000,
            value=52,
            key=f"{prefix}_masks_end",
        )

    with st.expander("🏠 Lockdown / Distanciamento"):
        lockdown_enabled = st.checkbox("Habilitar Lockdown / Distanciamento", key=f"{prefix}_lockdown_enabled")
        lockdown_adherence = st.slider(
            "Intensidade do Lockdown (%)",
            min_value=0,
            max_value=100,
            value=0,
            step=5,
            key=f"{prefix}_lockdown_adherence",
            help="Determina a chance de um indivíduo evitar contato (ficar em casa).",
        ) / 100.0
        lockdown_start = st.number_input(
            "Início do Lockdown (Semana)",
            min_value=1,
            max_value=1000,
            value=1,
            key=f"{prefix}_lockdown_start",
        )
        lockdown_end = st.number_input(
            "Fim do Lockdown (Semana)",
            min_value=1,
            max_value=1000,
            value=52,
            key=f"{prefix}_lockdown_end",
        )

    return {
        "vaccination_enabled": vaccination_enabled,
        "vaccination_percent": vaccination_percent,
        "vaccination_start": int(vaccination_start),
        "masks_enabled": masks_enabled,
        "masks_adherence": masks_adherence,
        "masks_start": int(masks_start),
        "masks_end": int(masks_end),
        "lockdown_enabled": lockdown_enabled,
        "lockdown_adherence": lockdown_adherence,
        "lockdown_start": int(lockdown_start),
        "lockdown_end": int(lockdown_end),
    }


def get_default_interventions():
    return {
        "vaccination_enabled": False,
        "vaccination_percent": 0.0,
        "vaccination_start": 1,
        "masks_enabled": False,
        "masks_adherence": 0.0,
        "masks_start": 1,
        "masks_end": 1,
        "lockdown_enabled": False,
        "lockdown_adherence": 0.0,
        "lockdown_start": 1,
        "lockdown_end": 1,
    }


def get_grid_render_size(grid_size, max_pixels=560):
    cell_size = max(1, min(8, max_pixels // grid_size))
    return cell_size, grid_size * cell_size


def get_population_image(model, cell_size):
    state_colors = {
        State.healthy.value: (34, 139, 34),
        State.sick.value: (255, 215, 0),
        State.dead.value: (220, 20, 60),
        State.immune.value: (30, 144, 255),
    }

    grid_size = len(model.population)
    image = Image.new("RGB", (grid_size, grid_size))
    pixels = []

    for row in model.population:
        for individual in row:
            pixels.append(state_colors[individual.state.value])

    image.putdata(pixels)
    return image.resize((grid_size * cell_size, grid_size * cell_size), Image.Resampling.NEAREST)


def run_scenario(
    scenario_name,
    interventions,
    number_of_runs,
    grid_size,
    number_of_generations,
    simulation_speed,
    visualize_all,
    show_animation,
    grid_placeholder,
    status_text,
    cell_size,
    render_size,
):
    deaths_list = []
    histories = []

    for run in range(number_of_runs):
        is_visualizing = show_animation and ((run == 0) or visualize_all)

        if is_visualizing:
            status_text.text(f"[{scenario_name}] Execução {run + 1}/{number_of_runs} | Iniciando...")
        else:
            status_text.text(f"[{scenario_name}] Execução {run + 1}/{number_of_runs} em background...")

        model = RandomWalkModel(grid_size)
        history = [model.report()]

        if is_visualizing:
            grid_placeholder.image(get_population_image(model, cell_size), width=render_size)

        for gen in range(number_of_generations):
            current_contagion = 0.5
            current_distance = 0.0

            if interventions["masks_enabled"] and interventions["masks_start"] <= (gen + 1) <= interventions["masks_end"]:
                mask_effectiveness = 0.7
                reduction = interventions["masks_adherence"] * mask_effectiveness
                current_contagion = current_contagion * (1 - reduction)

            if interventions["lockdown_enabled"] and interventions["lockdown_start"] <= (gen + 1) <= interventions["lockdown_end"]:
                current_distance = max(current_distance, interventions["lockdown_adherence"])

            model.update_parameters(current_contagion, current_distance)

            if interventions["vaccination_enabled"] and (gen + 1) == interventions["vaccination_start"]:
                model.apply_vaccination(interventions["vaccination_percent"])

            model.nextGeneration()
            history.append(model.report())

            if is_visualizing:
                active_interventions = []
                if interventions["lockdown_enabled"] and interventions["lockdown_start"] <= (gen + 1) <= interventions["lockdown_end"]:
                    active_interventions.append("🏠 Lockdown")
                if interventions["masks_enabled"] and interventions["masks_start"] <= (gen + 1) <= interventions["masks_end"]:
                    active_interventions.append("😷 Máscaras")
                if interventions["vaccination_enabled"] and (gen + 1) == interventions["vaccination_start"]:
                    active_interventions.append("💉 Campanha de Vacinação")

                status_msg = f"[{scenario_name}] Execução {run + 1}/{number_of_runs} | Semana {gen + 1}/{number_of_generations}"
                if active_interventions:
                    status_msg += " | Ativo: " + ", ".join(active_interventions)

                status_text.text(status_msg)
                grid_placeholder.image(get_population_image(model, cell_size), width=render_size)
                time.sleep(simulation_speed)

        if not is_visualizing:
            grid_placeholder.image(get_population_image(model, cell_size), width=render_size)

        deaths_list.append(model.numberOfDeaths())
        histories.append(pd.DataFrame(history, columns=["Saudáveis", "Doentes", "Mortos", "Imunes"]))

    mean_history = sum(histories) / len(histories)

    return {
        "name": scenario_name,
        "deaths": deaths_list,
        "mean_deaths": sum(deaths_list) / len(deaths_list),
        "min_deaths": min(deaths_list),
        "max_deaths": max(deaths_list),
        "last_history": histories[-1],
        "mean_history": mean_history,
    }


def apply_interventions_for_generation(model, interventions, generation_number):
    current_contagion = 0.5
    current_distance = 0.0

    if interventions["masks_enabled"] and interventions["masks_start"] <= generation_number <= interventions["masks_end"]:
        mask_effectiveness = 0.7
        reduction = interventions["masks_adherence"] * mask_effectiveness
        current_contagion = current_contagion * (1 - reduction)

    if interventions["lockdown_enabled"] and interventions["lockdown_start"] <= generation_number <= interventions["lockdown_end"]:
        current_distance = max(current_distance, interventions["lockdown_adherence"])

    model.update_parameters(current_contagion, current_distance)

    if interventions["vaccination_enabled"] and generation_number == interventions["vaccination_start"]:
        model.apply_vaccination(interventions["vaccination_percent"])


def get_active_interventions(interventions, generation_number):
    active = []
    if interventions["lockdown_enabled"] and interventions["lockdown_start"] <= generation_number <= interventions["lockdown_end"]:
        active.append("🏠 Lockdown")
    if interventions["masks_enabled"] and interventions["masks_start"] <= generation_number <= interventions["masks_end"]:
        active.append("😷 Máscaras")
    if interventions["vaccination_enabled"] and generation_number == interventions["vaccination_start"]:
        active.append("💉 Campanha de Vacinação")
    return active


with st.sidebar:
    st.header("⚙️ Configurações da Simulação")

    execution_mode = st.radio(
        "Modo de execução",
        ["Simulação única", "Comparar cenários"],
        help="No modo de comparação, você configura múltiplos cenários (com e sem intervenção) e compara os resultados.",
    )

    numberOfRuns = st.number_input(
        "Número de Execuções",
        min_value=1,
        max_value=100,
        value=1,
        help="Quantas vezes cada cenário será rodado para calcular estatísticas.",
    )

    gridSize = st.number_input(
        "Tamanho do Grid",
        min_value=10,
        max_value=500,
        value=100,
        help="O tamanho da matriz quadrada que representa a população.",
    )

    numberOfGenerations = st.number_input(
        "Número de Gerações (Semanas)",
        min_value=1,
        max_value=1000,
        value=52,
        help="Duração da simulação em gerações.",
    )

    simulation_speed = st.slider(
        "Velocidade da Animação (segundos)",
        min_value=0.01,
        max_value=1.0,
        value=0.1,
        help="Tempo de espera entre cada semana para visualização.",
    )

    visualize_all = st.checkbox(
        "Animar todas as execuções (Lento)",
        value=False,
        help="Se marcado, mostra a animação semana a semana para TODAS as execuções do cenário animado.",
    )

    st.markdown("---")

    scenario_configs = []
    scenario_to_animate = ""

    if execution_mode == "Simulação única":
        interventions = intervention_controls("single", "🛡️ Medidas de Intervenção")
        scenario_configs = [{"name": "Cenário único", "interventions": interventions}]
        scenario_to_animate = "Cenário único"
    else:
        st.subheader("⚖️ Configuração de Cenários")

        compare_realtime = st.checkbox(
            "Mostrar os dois cenários em tempo real",
            value=True,
            help="Exibe lado a lado os dois grids com a propagação por semana.",
        )

        for idx in range(2):
            st.markdown(f"#### Cenário {idx + 1}")
            name = st.text_input(
                f"Nome do cenário {idx + 1}",
                value=f"Cenário {idx + 1}",
                key=f"scenario_name_{idx}",
            )

            no_intervention = st.checkbox(
                "Sem intervenção (desativa todas as medidas)",
                value=(idx == 0),
                key=f"scenario_no_intervention_{idx}",
            )

            if no_intervention:
                interventions = get_default_interventions()
            else:
                interventions = intervention_controls(f"scenario_{idx}", "Medidas deste cenário")

            scenario_configs.append({"name": name, "interventions": interventions})
            st.markdown("---")

        scenario_to_animate = "__COMPARE_SIDE_BY_SIDE__" if compare_realtime else ""

    run_button = st.button("🚀 Executar Simulação", type="primary")


if run_button:
    simulation_container = st.container()
    stats_container = st.container()

    with simulation_container:
        st.subheader("Simulação em Tempo Real")
        if execution_mode == "Comparar cenários":
            left_col, right_col = st.columns(2)
            with left_col:
                st.markdown(f"**{scenario_configs[0]['name']}**")
                grid_placeholder_left = st.empty()
            with right_col:
                st.markdown(f"**{scenario_configs[1]['name']}**")
                grid_placeholder_right = st.empty()
            grid_placeholder = None
        else:
            _, grid_column, _ = st.columns([1, 2, 1])
            with grid_column:
                grid_placeholder = st.empty()
            grid_placeholder_left = None
            grid_placeholder_right = None
        status_text = st.empty()

    scenario_results = []
    start_time = time.time()
    cell_size, render_size = get_grid_render_size(int(gridSize))

    if execution_mode == "Simulação única":
        for scenario in scenario_configs:
            result = run_scenario(
                scenario_name=scenario["name"],
                interventions=scenario["interventions"],
                number_of_runs=int(numberOfRuns),
                grid_size=int(gridSize),
                number_of_generations=int(numberOfGenerations),
                simulation_speed=simulation_speed,
                visualize_all=visualize_all,
                show_animation=(scenario["name"] == scenario_to_animate),
                grid_placeholder=grid_placeholder,
                status_text=status_text,
                cell_size=cell_size,
                render_size=render_size,
            )
            scenario_results.append(result)
    else:
        comparison_data = []
        for scenario in scenario_configs:
            comparison_data.append({"name": scenario["name"], "deaths": [], "histories": []})

        for run in range(int(numberOfRuns)):
            is_visualizing = scenario_to_animate == "__COMPARE_SIDE_BY_SIDE__" and ((run == 0) or visualize_all)

            models = [RandomWalkModel(int(gridSize)), RandomWalkModel(int(gridSize))]
            run_histories = [[models[0].report()], [models[1].report()]]

            if is_visualizing:
                grid_placeholder_left.image(get_population_image(models[0], cell_size), width=render_size)
                grid_placeholder_right.image(get_population_image(models[1], cell_size), width=render_size)

            for gen in range(int(numberOfGenerations)):
                generation_number = gen + 1

                for idx in range(2):
                    interventions = scenario_configs[idx]["interventions"]
                    apply_interventions_for_generation(models[idx], interventions, generation_number)
                    models[idx].nextGeneration()
                    run_histories[idx].append(models[idx].report())

                if is_visualizing:
                    left_active = get_active_interventions(scenario_configs[0]["interventions"], generation_number)
                    right_active = get_active_interventions(scenario_configs[1]["interventions"], generation_number)

                    status_msg = (
                        f"Execução {run + 1}/{int(numberOfRuns)} | Semana {generation_number}/{int(numberOfGenerations)}"
                    )
                    if left_active:
                        status_msg += f" | {scenario_configs[0]['name']}: " + ", ".join(left_active)
                    if right_active:
                        status_msg += f" | {scenario_configs[1]['name']}: " + ", ".join(right_active)

                    status_text.text(status_msg)
                    grid_placeholder_left.image(get_population_image(models[0], cell_size), width=render_size)
                    grid_placeholder_right.image(get_population_image(models[1], cell_size), width=render_size)
                    time.sleep(simulation_speed)

            if not is_visualizing:
                status_text.text(f"Execução {run + 1}/{int(numberOfRuns)} concluída em background...")
                grid_placeholder_left.image(get_population_image(models[0], cell_size), width=render_size)
                grid_placeholder_right.image(get_population_image(models[1], cell_size), width=render_size)

            for idx in range(2):
                comparison_data[idx]["deaths"].append(models[idx].numberOfDeaths())
                comparison_data[idx]["histories"].append(
                    pd.DataFrame(run_histories[idx], columns=["Saudáveis", "Doentes", "Mortos", "Imunes"])
                )

        for item in comparison_data:
            mean_history = sum(item["histories"]) / len(item["histories"])
            scenario_results.append(
                {
                    "name": item["name"],
                    "deaths": item["deaths"],
                    "mean_deaths": sum(item["deaths"]) / len(item["deaths"]),
                    "min_deaths": min(item["deaths"]),
                    "max_deaths": max(item["deaths"]),
                    "last_history": item["histories"][-1],
                    "mean_history": mean_history,
                }
            )

    end_time = time.time()
    status_text.success(f"Simulação concluída em {end_time - start_time:.2f} segundos!")

    with stats_container:
        st.header("📊 Resultados Gerais")

        if execution_mode == "Simulação única":
            result = scenario_results[0]
            col1, col2, col3 = st.columns(3)
            col1.metric("Média de Mortes", f"{result['mean_deaths']:.2f}")
            col2.metric("Mínimo de Mortes", int(result["min_deaths"]))
            col3.metric("Máximo de Mortes", int(result["max_deaths"]))

            st.markdown("---")
            st.subheader("Evolução Temporal")
            st.line_chart(result["last_history"], color=["#00A651", "#F9C80E", "#D7263D", "#3A86FF"])

            with st.expander("Ver dados brutos"):
                st.dataframe(result["last_history"])

            if int(numberOfRuns) > 1:
                st.markdown("---")
                st.subheader("Dispersão de Mortes por Execução")
                chart_data = pd.DataFrame({"Execução": range(1, int(numberOfRuns) + 1), "Mortes": result["deaths"]})
                st.bar_chart(chart_data.set_index("Execução"))
        else:
            summary_df = pd.DataFrame(
                [
                    {
                        "Cenário": item["name"],
                        "Média de Mortes": round(item["mean_deaths"], 2),
                        "Mínimo": int(item["min_deaths"]),
                        "Máximo": int(item["max_deaths"]),
                    }
                    for item in scenario_results
                ]
            )

            st.subheader("Resumo por Cenário")
            st.dataframe(summary_df, use_container_width=True)

            st.subheader("Comparação de Média de Mortes")
            st.bar_chart(summary_df.set_index("Cenário")[["Média de Mortes"]])

            st.subheader("Evolução Temporal Comparativa")
            metric = st.selectbox(
                "Indicador para comparar entre cenários",
                options=["Saudáveis", "Doentes", "Mortos", "Imunes"],
                index=2,
            )

            comparative_history = pd.DataFrame({item["name"]: item["mean_history"][metric] for item in scenario_results})
            st.line_chart(comparative_history)

            with st.expander("Ver séries médias por cenário"):
                for item in scenario_results:
                    st.markdown(f"**{item['name']}**")
                    st.dataframe(item["mean_history"], use_container_width=True)
