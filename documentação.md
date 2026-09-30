## 1. O que é este projeto?

O **Simulador de Pandemia - Random Walk** é uma aplicação web interativa que simula a propagação de uma doença em diferentes cidades de Pernambuco (Igarassu, Goiana, Itapissuma, Itamaracá, Araçoiaba, etc.).

A simulação é baseada no modelo matemático conhecido como **Random Walk (Passeio Aleatório)**, adaptado de um modelo acadêmico (IFPE). Nele, cada indivíduo (agente) se move aleatoriamente em um espaço e pode interagir com outras pessoas. Dependendo do contato, o estado de saúde do indivíduo pode mudar.

**Os estados possíveis de um indivíduo são:**

- **Saudável (Healthy):** Nunca pegou a doença.
- **Infectado (Sick):** Está infectado e pode transmitir a doença.
- **Morto (Dead):** Não resistiu à doença (removido do grid de interação).
- **Imune (Immune):** Se recuperou ou foi vacinado, não transmite nem pega novamente.

O sistema permite configurar medidas de contenção como **Vacinação, Máscaras, Distanciamento Social e Lockdown** para observar como isso afeta a curva de contágio ao longo das semanas.

---

## 2. Arquitetura do Sistema

O projeto adota uma arquitetura clássica e desacoplada em duas partes principais: **Frontend** (Interface do Usuário) e **Backend** (Lógica e Processamento).

- **O Frontend** serve para o usuário interagir, escolher a cidade, definir os parâmetros das políticas de contenção e ver os resultados (gráficos/tabelas).
- **O Backend** recebe esses parâmetros e executa os cálculos matemáticos pesados da simulação iterando semana a semana. Depois, ele devolve os dados processados para o Frontend exibir.

### 🛠️ Tecnologias Utilizadas e Seus Papéis

#### No Frontend:

- **[React (v18)](https://react.dev/):** Biblioteca JavaScript/TypeScript para construir a interface de usuário de forma componentizada. O estado da simulação é controlado via React.
- **[TypeScript](https://www.typescriptlang.org/):** Um superset do JavaScript que adiciona tipagem estática, garantindo que o código fique mais seguro (evitando erros bobos de variável).
- **[Vite](https://vitejs.dev/):** A ferramenta de _build_ (construção). Substitui o Webpack/Create React App. Ele serve a aplicação localmente de forma ultra-rápida.
- **[Lucide-React](https://lucide.dev/):** Biblioteca de ícones moderna utilizada na interface.

#### No Backend:

- **[Python (v3+)](https://www.python.org/):** A linguagem base. Escolhida provavelmente pela sua excelência matemática e facilidade na construção de algoritmos como o _Random Walk_.
- **[FastAPI](https://fastapi.tiangolo.com/):** O framework web para criar a nossa API (Application Programming Interface). Ele é o responsável por receber as requisições HTTP do Frontend e acionar os scripts de simulação.
- **[Uvicorn](https://www.uvicorn.org/):** É o servidor ASGI (Asynchronous Server Gateway Interface) que efetivamente roda a aplicação FastAPI.
- **[Pillow](https://python-pillow.org/):** Biblioteca de processamento de imagem do Python, utilizada caso a simulação gere representações visuais em imagem.

---

## 3. Como rodar o projeto na sua máquina

Para executar o projeto do zero, você precisará ter o **Node.js** (para o Frontend) e o **Python 3** (para o Backend) instalados na sua máquina.

### Passo 1: Iniciar o Backend (Servidor)

Abra o terminal, navegue até a pasta do projeto e faça:

```bash
# 1. Entre na pasta do backend
cd backend

# (Opcional, mas muito recomendado): Crie um ambiente virtual para não misturar dependências
python -m venv venv
# Ative o ambiente virtual (No Windows):
venv\Scripts\activate
# Ative o ambiente virtual (No Mac/Linux):
# source venv/bin/activate

# 2. Instale as dependências listadas no arquivo requirements.txt
pip install -r requirements.txt

# 3. Rode o servidor usando o Uvicorn
uvicorn api:app --reload
```

> 💡 **O que isso faz?** O `uvicorn` procura no arquivo `api.py` pela variável `app` e inicia o servidor. O `--reload` faz com que o servidor reinicie automaticamente sempre que você alterar e salvar um arquivo Python.
> O backend rodará, por padrão, em `http://localhost:8000`.

### Passo 2: Iniciar o Frontend (Interface)

Abra **outra janela de terminal** (mantenha o backend rodando na anterior), navegue até a pasta do projeto e faça:

```bash
# 1. Entre na pasta do frontend
cd frontend

# 2. Instale as dependências (lê o arquivo package.json e baixa tudo na pasta node_modules)
npm install

# 3. Inicie o servidor de desenvolvimento
npm run dev
```

> 💡 **O que isso faz?** O `npm run dev` aciona o Vite, que processa seu código React/TS e o disponibiliza no navegador, com _Hot Module Replacement_ (HMR), ou seja, alterações no código aparecem na tela instantaneamente.
> O terminal exibirá a URL de acesso, geralmente `http://localhost:5173`.

---

## 5. Entendendo a Regra de Negócio

Para atuar neste projeto, é crucial entender os parâmetros enviados na requisição da simulação, localizados em `backend/api.py`.

Quando o Frontend faz um `POST` para simular os dados, ele envia regras como:

- **`city`**: Qual a cidade sendo simulada (define o tamanho do grid pela raiz quadrada da população).
- **`weeks`**: Duração da simulação em semanas (padrão: 52 semanas = 1 ano).
- **`contagion_factor`**: A chance base de uma pessoa saudável pegar a doença ao cruzar com um doente (0 a 1).
- **Medidas Protetivas (`vaccination`, `masks`, `distancing`, `lockdown`)**:
  - Cada medida possui uma _taxa de redução_ configurada. Por exemplo: Lockdown reduz o contato em 60%, Máscara reduz a transmissão em 18%.
  - Há períodos configuráveis para cada medida (ex: `masks_start` a `masks_end`), permitindo simular a decretação e fim do uso obrigatório de máscaras em determinadas semanas do ano.

Essas informações são processadas iterativamente pelo modelo `RandomWalkModel` no arquivo `randomWalk.py`, que movimenta as matrizes, cálcula contágio e mortes, e empacota os dados para serem devolvidos e renderizados nos gráficos pelo Frontend.
