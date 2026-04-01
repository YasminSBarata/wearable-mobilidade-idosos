# 🏥 ElderSync v2.0 - Avaliação Funcional da Mobilidade Física em Idosos

<div align="center">

![Status](https://img.shields.io/badge/status-v2.0%20em%20produ%C3%A7%C3%A3o-green)
![Hardware](https://img.shields.io/badge/hardware-ESP32%20+%20MPU6050-blue)
![Platform](https://img.shields.io/badge/platform-ElderSync-purple)
![CNPq](https://img.shields.io/badge/CNPq-PIBICT-red)

**Sistema wearable + plataforma web para avaliação funcional da mobilidade física de pacientes gerontológicos**

[🌐 Plataforma Web](https://eldersync.vercel.app) | [📖 Documentação](./docs) | [🔧 Setup ESP32](./docs/IOT_INTEGRATION.md) | [🩺 Guia do Fisioterapeuta](./GUIA_FISIOTERAPEUTA.md)

</div>

---

## 📋 Sobre o Projeto

O **ElderSync** é uma **tecnologia automatizada para avaliação funcional da mobilidade física** de idosos, com foco na **prevenção de quedas**. O sistema utiliza um dispositivo wearable com sensores inerciais (acelerômetro + giroscópio) integrado a uma plataforma web profissional, permitindo que fisioterapeutas conduzam testes padronizados de mobilidade com coleta de dados automatizada.

### 🔄 Refatoração v1.0 → v2.0

O projeto passou por uma **refatoração significativa** na sua arquitetura e abordagem:

| Aspecto            | v1.0 (anterior)                         | v2.0 (atual)                            |
| ------------------ | --------------------------------------- | --------------------------------------- |
| **Modelo**         | Monitoramento contínuo 24/7             | Avaliação sob demanda (testes clínicos) |
| **Comunicação**    | HTTP polling a cada 5s                  | SSE (Server-Sent Events) em tempo real  |
| **Testes**         | Métricas genéricas (passos, quedas)     | Protocolos padronizados (SPPB + TUG)    |
| **Firmware**       | `espMPU.ino`                            | `espMPU_v2.ino` com calibração e LED    |
| **Banco de dados** | KV store                                | PostgreSQL relacional (Supabase)        |
| **Credenciais**    | Hardcoded no código-fonte               | Extraídas para `secrets.h` (.gitignore) |
| **Foco**           | Detecção de quedas e contagem de passos | Avaliação funcional clínica completa    |

A mudança de paradigma foi motivada pela necessidade de alinhar o sistema com **protocolos clínicos validados** (SPPB e TUG), tornando os dados coletados mais relevantes para a prática fisioterapêutica e a pesquisa acadêmica.

### 🎯 Contexto

O envelhecimento populacional é uma realidade crescente no Brasil (aproximadamente 32 milhões de idosos segundo o Censo 2022). O sedentarismo e a perda de mobilidade aumentam significativamente o risco de quedas, uma das principais causas de lesões e mortes em idosos. Este projeto visa mitigar esses riscos através de tecnologia acessível e não intrusiva.

### 💡 Solução Proposta

Um **ecossistema completo** composto por:

- ✅ **Dispositivo wearable** compacto, leve e portátil (ESP32 + MPU6050)
- ✅ **Testes padronizados** de mobilidade funcional (SPPB + TUG)
- ✅ **Comunicação em tempo real** via SSE (Server-Sent Events)
- ✅ **Calibração automática** do sensor antes de cada sessão
- ✅ **Dashboard web profissional** para fisioterapeutas
- ✅ **Histórico completo** de sessões e evolução do paciente
- ✅ **Scoring automático** baseado nos protocolos SPPB e TUG

---

## 📊 Protocolos de Avaliação

### SPPB (Short Physical Performance Battery)

Bateria de testes padronizada composta por 3 módulos:

| Módulo                   | Teste                           | O que mede                                        |
| ------------------------ | ------------------------------- | ------------------------------------------------- |
| **Equilíbrio**           | Pés juntos, Semi-tandem, Tandem | Estabilidade postural (oscilação AP/ML)           |
| **Velocidade de Marcha** | 2 tentativas de caminhada       | Velocidade, índice de oscilação, aceleração média |
| **Levantar da Cadeira**  | Pré-teste + 5 repetições        | Força de MMII, inclinação por repetição           |

### TUG (Timed Up and Go)

Teste funcional que avalia mobilidade, equilíbrio e risco de quedas em uma única ação: levantar, caminhar, girar e sentar.

### Métricas Coletadas pelo Dispositivo

| Métrica                      | Descrição                                             |
| ---------------------------- | ----------------------------------------------------- |
| **Oscilação AP/ML**          | Amplitude de oscilação anteroposterior e mediolateral |
| **Ângulo de inclinação**     | Tilt calculado com filtro complementar                |
| **Índice de oscilação**      | Índice geral de estabilidade durante marcha           |
| **Aceleração média**         | Magnitude média da aceleração durante o teste         |
| **Inclinação por repetição** | Ângulo de inclinação em cada levantar da cadeira      |
| **Dados brutos (50Hz)**      | Frames completos de acelerômetro + giroscópio         |

---

## 🔧 Hardware

### Componentes

| Componente                      | Função                    | Observações                      |
| ------------------------------- | ------------------------- | -------------------------------- |
| **ESP32 com gerenciador 18650** | Microcontrolador + WiFi   | Gerenciamento de carga integrado |
| **MPU6050**                     | Acelerômetro + Giroscópio | 6-DoF, leitura a 50Hz            |
| **Bateria 18650**               | Alimentação portátil      | 3000-3500mAh                     |

### Conexões

```
ESP32 Conexões:

I2C (GPIO21 SDA, GPIO22 SCL):
└─ MPU6050 (acelerômetro/giroscópio)

LED de Status (GPIO2):
├─ Apagado → desconectado
├─ Piscando lento → conectado, aguardando comando
├─ Piscando rápido → calibrando
└─ Aceso fixo → coletando dados

Alimentação:
├─ Bateria 18650 no slot
└─ Carregamento via Micro USB
```

### Funcionalidades do Firmware v2.0

- **Calibração automática** (5 segundos de aprendizado de bias e ângulo zero)
- **Coleta sob demanda** — o ESP32 fica em espera via SSE até receber um comando
- **Filtro complementar** para cálculo preciso do ângulo de inclinação
- **LED indicador** de status em tempo real
- **Reconexão automática** de WiFi e SSE

---

## 💻 Plataforma ElderSync

### 🌐 Acesso

A plataforma está **deployada e disponível** em: **[https://eldersync.vercel.app](https://eldersync.vercel.app)**

### Funcionalidades

- **Cadastro de pacientes** com dados clínicos
- **Sessões de avaliação** com protocolos SPPB e TUG
- **Controle do dispositivo** em tempo real (iniciar/parar testes, calibrar)
- **Scoring automático** baseado nos protocolos padronizados
- **Dashboard de evolução** com gráficos comparativos entre sessões
- **Histórico completo** de sessões e tentativas
- **Autenticação segura** via Supabase Auth

### Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ELDERSYNC PLATFORM v2.0                         │
│                     (Deploy: Vercel + Supabase)                      │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  • Dashboard React 19 + TypeScript                         │     │
│  │  • Módulos SPPB (Equilíbrio, Marcha, Cadeira) + TUG       │     │
│  │  • Scoring automático dos protocolos                       │     │
│  │  • Edge Functions (auth, patients, sessions, iot)          │     │
│  │  • PostgreSQL (Supabase) com RLS                           │     │
│  └────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ SSE (Server-Sent Events)
                                    │ Comunicação bidirecional
                                    │
┌───────────────────────────────────┴─────────────────────────────────┐
│                       ESP32 + MPU6050 (v2.0)                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  • Escuta SSE aguardando comandos do dashboard               │   │
│  │  • Calibração automática (bias + ângulo zero)                │   │
│  │  • Coleta a 50Hz durante testes                              │   │
│  │  • Filtro complementar para ângulo de inclinação             │   │
│  │  • Envio de métricas processadas + dados brutos              │   │
│  │  • LED indicador de status                                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 🛠️ Desenvolvimento Local

#### Pré-requisitos

- Node.js 18+ e pnpm
- Conta no Supabase

#### Setup

```bash
git clone https://github.com/YasminSBarata/wearable-mobilidade-idosos.git
cd wearable-mobilidade-idosos/ElderSync
pnpm install
```

Crie um arquivo `.env.local` na pasta `ElderSync/`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

```bash
pnpm dev
```

Acesse [http://localhost:5173](http://localhost:5173).

---

## 🚀 Instalação e Configuração do ESP32

### Requisitos

- **Arduino IDE 2.0+**
- Placa ESP32 Dev Module
- Cabo USB para programação

### Bibliotecas Necessárias

```
- ArduinoJson (by Benoit Blanchon) - v6.x
- Wire (built-in) - Comunicação I2C
- WiFi (built-in) - Conectividade
```

### Configuração de Credenciais (`secrets.h`)

As credenciais (WiFi, URL do servidor) foram **extraídas do código principal** para um arquivo separado `secrets.h`, que é ignorado pelo Git por segurança.

1. **Copie o template:**

```bash
cp esp32/secrets.example.h esp32/secrets.h
```

2. **Edite `esp32/secrets.h` com seus dados:**

```cpp
const char* WIFI_SSID     = "SuaRedeWiFi";
const char* WIFI_PASSWORD = "SuaSenhaWiFi";

// URL base do servidor (Supabase Edge Functions)
const char* SERVER_BASE_URL = "https://SEU_PROJETO.supabase.co/functions/v1";
```

> **⚠️ Importante:** O arquivo `secrets.h` está no `.gitignore` e **não deve ser commitado**. Apenas o `secrets.example.h` (template) é versionado.

3. **Upload:** Tools > Board > ESP32 Dev Module > Upload

### Montagem

```
MPU6050    ESP32
-------    -----
VCC   →    3.3V
GND   →    GND
SCL   →    GPIO 22
SDA   →    GPIO 21
```

---

## 📁 Estrutura do Repositório

```
wearable-mobilidade-idosos/
├── ElderSync/                    # 🌐 Dashboard Web (React + Supabase)
│   ├── src/
│   │   ├── components/           # Componentes React
│   │   │   ├── BalanceTestModule.tsx    # Módulo equilíbrio (SPPB)
│   │   │   ├── GaitSpeedModule.tsx      # Módulo marcha (SPPB)
│   │   │   ├── ChairStandModule.tsx     # Módulo cadeira (SPPB)
│   │   │   ├── TUGModule.tsx            # Timed Up and Go
│   │   │   ├── EvolutionDashboard.tsx   # Evolução do paciente
│   │   │   ├── SessionHistoryPage.tsx   # Histórico de sessões
│   │   │   ├── PatientProfilePage.tsx   # Perfil do paciente
│   │   │   ├── Login.tsx / Signup.tsx   # Autenticação
│   │   │   └── ui/                      # Componentes shadcn/ui
│   │   ├── lib/scoring/          # Algoritmos de scoring SPPB/TUG
│   │   ├── hooks/                # useDeviceSession (comunicação IoT)
│   │   └── utils/                # Supabase client, API helpers
│   ├── supabase/
│   │   ├── functions/            # Edge Functions (Deno)
│   │   │   ├── auth/             # Signup
│   │   │   ├── patients/         # CRUD pacientes
│   │   │   ├── sessions/         # CRUD sessões de teste
│   │   │   ├── iot/              # SSE + comandos + leituras
│   │   │   └── health/           # Health check
│   │   └── migrations/           # Schema PostgreSQL
│   └── package.json
│
├── esp32/
│   ├── espMPU_v2.ino             # Firmware v2.0 (produção)
│   ├── secrets.example.h         # Template de credenciais (versionado)
│   ├── secrets.h                 # Credenciais reais (.gitignore)
│   └── Testes/                   # Sketches de teste
│
├── docs/                         # Documentação técnica
│   └── IOT_INTEGRATION.md        # Arquitetura IoT e endpoints
├   └── GUIA_FISIOTERAPEUTA.md    # Guia rápido para fisioterapeutas
│
└── README.md
```

---

## 🛠️ Stack Tecnológica

### Hardware

- **ESP32** — Microcontrolador com WiFi integrado
- **MPU6050** — Sensor MEMS 6-DoF (acelerômetro + giroscópio)
- **Bateria 18650** — Alimentação portátil com gerenciador de carga

### Firmware

- **Arduino Framework** (C++)
- **ArduinoJson** — Serialização de dados
- **SSE Client** — Comunicação em tempo real com o backend

### Plataforma Web

- **Frontend:** React 19 + Vite + TypeScript
- **Roteamento:** React Router v7
- **Backend:** Supabase (PostgreSQL + Edge Functions em Deno)
- **Hosting:** Vercel
- **Autenticação:** Supabase Auth
- **UI:** shadcn/ui + Tailwind CSS v4 + Radix UI
- **Charts:** Recharts
- **Forms:** React Hook Form

---

## 🔧 Comandos Úteis

### Dashboard

```bash
cd ElderSync
pnpm dev                  # Servidor de desenvolvimento
pnpm build                # Build de produção
pnpm lint                 # Linting
```

### Deploy de Edge Functions

```bash
npx supabase functions deploy auth --no-verify-jwt
npx supabase functions deploy iot --no-verify-jwt
npx supabase functions deploy patients
npx supabase functions deploy sessions
npx supabase functions deploy health
```

---

## 🔬 Pesquisa Acadêmica

### Programa PIBICT Cesupa/CNPq

Este projeto é desenvolvido no âmbito do **Programa Institucional de Bolsas de Iniciação Científica, Desenvolvimento Tecnológico e Inovação (PIBICT)**, financiado pelo CNPq.

### Objetivos

**Objetivo Geral:** Desenvolver tecnologia automatizada para avaliação funcional da mobilidade física e prevenção de quedas em idosos.

**Objetivos Específicos:**

1. ✅ Desenvolver dispositivo wearable com sensores inerciais para coleta de dados biomecânicos
2. ✅ Implementar protocolos padronizados de avaliação (SPPB e TUG) no sistema
3. ✅ Criar plataforma web profissional para fisioterapeutas
4. 🔄 Validar tecnologia com testes em idosos voluntários
5. 🔄 Avaliar eficácia na detecção de riscos de quedas através dos protocolos

---

## 👥 Equipe

### Orientadoras

- **Prof.ª Alessandra Natasha Alcântara Barreiros Baganha**
- **Prof.ª Wiviane Maria Torres de Matos Freitas**

### Bolsistas

- **Laila Correa** — Fisioterapia
- **Yasmin dos Santos Barata** — Engenharia de Computação

### Instituição

**Centro Universitário do Estado do Pará (CESUPA)**

---

## 📄 Licença

Este projeto está sob a licença **MIT**. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 📞 Contato

- **GitHub:** [@YasminSBarata](https://github.com/YasminSBarata)
- **Issues:** [GitHub Issues](https://github.com/YasminSBarata/wearable-mobilidade-idosos/issues)
- **Email:** yasminsb.dev@gmail.com
- **Instituição:** Centro Universitário do Estado do Pará (CESUPA)
- **Plataforma:** [https://eldersync.vercel.app](https://eldersync.vercel.app)

---

## 📚 Referências

1. BEARD JR et al. **O relatório mundial sobre envelhecimento e saúde.** The Lancet, 2016.
2. IBGE. **Censo 2022: Projeção da População.** Rio de Janeiro, 2022.
3. OPAS. **Envelhecimento ativo: uma política de saúde.** Brasília, 2005.
4. ZAGO, A. S. **Exercício físico e o processo saúde-doença no envelhecimento.** Revista Brasileira de Geriatria e Gerontologia, 2010.
5. TINETTI, M. E. **Falls, injuries due to falls, and the risk of admission to a nursing home.** New England Journal of Medicine, 1997.

---

## 🌍 English Summary

**ElderSync v2.0 — Automated Functional Mobility Assessment for Fall Prevention in Elderly Patients**

ElderSync is a wearable + web platform system for standardized functional mobility assessment in elderly individuals. The system uses an ESP32 microcontroller with an MPU6050 sensor to collect biomechanical data during clinically validated tests (SPPB and TUG), enabling physiotherapists to objectively evaluate balance, gait speed, lower limb strength, and fall risk.

**v2.0 Major Changes (refactored from v1.0):**

- Shifted from continuous 24/7 monitoring to on-demand clinical test protocols
- Replaced HTTP polling with SSE (Server-Sent Events) for real-time bidirectional communication
- Implemented SPPB (Short Physical Performance Battery) + TUG (Timed Up and Go) protocols
- Added automatic sensor calibration and complementary filter for tilt angle
- Restructured database from KV store to relational PostgreSQL with RLS policies

**Key Features:**

- Real-time sensor data collection at 50Hz during standardized tests
- Automated SPPB + TUG scoring algorithms
- Professional web dashboard for physiotherapists
- SSE-based device communication (calibrate, collect, stop)
- Patient progress tracking with session history and evolution charts
- Secure authentication via Supabase Auth

**Tech Stack:**

- Hardware: ESP32 + MPU6050
- Frontend: React 19 + Vite + TypeScript
- Backend: Supabase (PostgreSQL + Deno Edge Functions)
- Hosting: Vercel

This research is part of the CNPq PIBICT program at CESUPA (Centro Universitário do Estado do Pará), aiming to provide accessible, non-intrusive technology for functional mobility assessment and fall prevention in elderly populations.
