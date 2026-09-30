# Simulador de Pandemia

Um simulador interativo web baseado no modelo matemático **Random Walk** (Passeio Aleatório), focado em demonstrar a propagação de epidemias em cidades do Litoral Norte de Pernambuco.

O sistema permite configurar medidas protetivas — como **vacinação, lockdown, distanciamento social e uso de máscaras** — e exibe graficamente os impactos dessas decisões na curva de contágio ao longo de semanas.

## 🚀 Tecnologias

- **Frontend:** React (v18), TypeScript, Vite, Tailwind/CSS.
- **Backend:** Python (v3+), FastAPI, Uvicorn.

## 📋 Pré-requisitos

Para rodar este projeto, você precisará ter instalado na sua máquina:

- [Node.js](https://nodejs.org/) (para o frontend)
- [Python 3](https://www.python.org/) (para o backend)

## 🔧 Instalação e Execução

Você precisará rodar o Backend e o Frontend simultaneamente em terminais separados.

### 1. Rodando o Backend (API)

Abra um terminal, acesse a pasta raiz do projeto e rode:

```bash
cd backend

# É recomendado criar e ativar um ambiente virtual
python -m venv venv
# No Windows:
venv\Scripts\activate
# No Mac/Linux:
# source venv/bin/activate

# Instale as dependências
pip install -r requirements.txt

# Inicie o servidor
uvicorn api:app --reload
```

A API ficará disponível em `http://localhost:8000`.

### 2. Rodando o Frontend (Interface)

Abra um **novo** terminal, acesse a pasta raiz do projeto e rode:

```bash
cd frontend

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

A aplicação estará disponível na URL indicada no terminal (geralmente `http://localhost:5173`).
