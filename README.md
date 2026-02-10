# 🏥 ElderSync - Monitoramento de Mobilidade Física para Prevenção de Quedas em Idosos

<div align="center">

![Status](https://img.shields.io/badge/status-em%20produ%C3%A7%C3%A3o-green)
![Hardware](https://img.shields.io/badge/hardware-ESP32-blue)
![Platform](https://img.shields.io/badge/platform-ElderSync-purple)
![CNPq](https://img.shields.io/badge/CNPq-PIBICT-red)

**Dispositivo wearable para monitoramento da mobilidade física de pacientes gerontológicos**

[🌐 Plataforma Web](https://eldersync.vercel.app) | [📖 Documentação](./docs) | [🔧 Setup ESP32](./docs/IOT_INTEGRATION.md)

</div>

---

## 📋 Sobre o Projeto

O **ElderSync** é uma **tecnologia automatizada para monitoramento da mobilidade física** de idosos, com foco na **prevenção de quedas**. O sistema coleta dados em tempo real sobre movimentos, passos e padrões de atividade, permitindo o acompanhamento contínuo e detecção precoce de riscos.

### 🎯 Contexto

O envelhecimento populacional é uma realidade crescente no Brasil (aproximadamente 32 milhões de idosos segundo o Censo 2022). O sedentarismo e a perda de mobilidade aumentam significativamente o risco de quedas, uma das principais causas de lesões e mortes em idosos. Este projeto visa mitigar esses riscos através de tecnologia acessível e não intrusiva.

### 💡 Solução Proposta

Um **ecossistema completo** composto por:

- ✅ **Dispositivo wearable** compacto, leve e portátil
- ✅ Monitora movimentos e atividade física em tempo real
- ✅ Detecta padrões de risco e quedas
- ✅ Transmite dados para a nuvem via WiFi
- ✅ **Dashboard web profissional** (ElderSync Platform)
- ✅ Visualização em tempo real e histórico completo
- ✅ Geração de relatórios para profissionais de saúde

> **🔮 Roadmap futuro:** Armazenamento local em SD Card para operação offline

---

## 🔧 Hardware

### Componentes Principais

| Componente | Função | Observações |
|------------|--------|-------------|
| **ESP32 com gerenciador 18650** | Microcontrolador + WiFi/BT | Gerenciamento de carga integrado |
| **MPU6050** | Acelerômetro + Giroscópio | Detecção de movimento, quedas e postura |
| **Bateria 18650** | Alimentação portátil | 3000-3500mAh, 1-4 dias de autonomia |


> **💡 Futuras Melhorias:** Módulo SD Card para backup local e operação offline (planejado para versões futuras)

### Pinout Simplificado

```
ESP32 Conexões:

I2C (GPIO21 SDA, GPIO22 SCL):
└─ MPU6050 (acelerômetro/giroscópio)

Alimentação:
├─ Bateria 18650 no slot
└─ Carregamento via Micro USB
```

> **📌 Nota:** A primeira versão não inclui módulo SD Card. O armazenamento é feito diretamente na nuvem via WiFi.

---

## 💻 Plataforma ElderSync

### 🌐 Acesso

A plataforma ElderSync está **deployada e disponível** em: **[https://eldersync.vercel.app](https://eldersync.vercel.app)**

### 🛠️ Desenvolvimento Local da Dashboard

Para rodar a dashboard localmente em sua máquina:

#### Pré-requisitos
- Node.js 18+ e pnpm
- Conta no Supabase (para banco de dados)

#### Setup

1. **Clone e entre no diretório da dashboard:**

```bash
git clone https://github.com/YasminSBarata/wearable-mobilidade-idosos.git
cd wearable-mobilidade-idosos/eldersync
```

2. **Instale as dependências:**

```bash

pnpm install

```

3. **Configure as variáveis de ambiente:**

Crie um arquivo `.env.local` na pasta `eldersync/`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui

# NextAuth (opcional, se usar)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=gere-um-secret-aleatorio
```

4. **Execute o servidor de desenvolvimento:**

```bash
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000) no navegador.

#### Deploy na Vercel

A dashboard já está configurada para deploy automático na Vercel:

1. Faça push para o repositório GitHub
2. Conecte o repositório na Vercel
3. Configure as variáveis de ambiente
4. Deploy automático! 🚀

### Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                          ELDERSYNC PLATFORM                          │
│                     (Deploy: Vercel + Supabase)                      │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  • Autenticação segura                                     │     │
│  │  • Banco de dados PostgreSQL                               │     │
│  │  • Dashboard em tempo real                                 │     │
│  │  • Edge Functions (API REST)                               │     │
│  │  • Armazenamento de métricas históricas                    │     │
│  └────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ HTTPS/WiFi
                                    │ (Envio a cada 1 minuto)
                                    │
┌───────────────────────────────────┴─────────────────────────────────┐
│                         ESP32 + MPU6050                              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  • Leitura de sensores (20Hz)                                │   │
│  │  • Algoritmos de detecção (passos, quedas, postura)          │   │
│  │  • Buffer em memória RAM                                     │   │
│  │  • Transmissão WiFi (métricas processadas)                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

> **⚠️ Importante:** Na v1.0, todos os dados são enviados diretamente para a nuvem. Não há armazenamento local em SD Card. O dispositivo mantém um buffer em memória RAM para evitar perda de dados em caso de falhas temporárias de conexão.

### 📊 Funcionalidades da Plataforma

#### Dashboard em Tempo Real
- **Visualização de métricas** agregadas por dia/semana/mês
- **Gráficos interativos** de atividade física
- **Alertas automáticos** de quedas e inatividade
- **Status do dispositivo** em tempo real
- **Histórico completo** armazenado na nuvem

#### Métricas Monitoradas (10 principais)

| Métrica | Tipo | Descrição |
|---------|------|-----------|
| 🚶 **Contagem de passos** | int (passos/dia) | Detecção por picos no acelerômetro |
| ⏱️ **Cadência média** | float (passos/min) | Ritmo de caminhada do paciente |
| 🪑 **Tempo sentado/em pé/caminhando** | float (horas) | Classificação automática de postura |
| 🏃 **Velocidade de marcha** | float (m/s) | Indicador de mobilidade funcional |
| ⚖️ **Estabilidade postural** | float (0-100) | Índice de equilíbrio e risco de queda |
| 🚨 **Quedas detectadas** | bool + timestamp | Sistema de detecção com 3 fases |
| 😴 **Inatividade prolongada** | int + duração | Períodos de sedentarismo |
| 🔄 **TUG estimado** | float (segundos) | Timed Up and Go automatizado |
| ⚡ **Transições bruscas** | int (qtd/dia) | Movimentos bruscos de risco |
| 🌙 **Padrão circadiano** | array[24] | Atividade por hora do dia |

#### Sistema de Autenticação e Segurança
- **Autenticação segura** via Supabase Auth
- **Credenciais por dispositivo** (Device ID + API Key)
- **Comunicação criptografada** (HTTPS)
- **Controle de acesso** por profissional/paciente

#### Relatórios e Análises
- 📈 **Gráficos de evolução** temporal
- 📄 **Exportação de dados** em formato PDF/CSV
- 🎯 **Indicadores de risco** personalizados
- 💡 **Insights automáticos** baseados em IA

---

## 🚀 Instalação e Configuração

> **📦 Estrutura Monorepo:** Este repositório contém tanto o firmware do ESP32 quanto a dashboard web ElderSync em um único lugar. Isso facilita o desenvolvimento, versionamento e colaboração entre as partes do sistema.

### 1️⃣ Clonar o Repositório

```bash
git clone https://github.com/YasminSBarata/wearable-mobilidade-idosos.git
cd wearable-mobilidade-idosos
```

### 2️⃣ Setup do ESP32

#### Requisitos
- **Arduino IDE 2.0+** ou PlatformIO
- Placa ESP32 Dev Module
- Cabo USB para programação

#### Bibliotecas Necessárias

Instale via Arduino IDE (Tools > Manage Libraries):

```
- ArduinoJson (by Benoit Blanchon) - v6.x
- Wire (built-in) - Comunicação I2C
- WiFi (built-in) - Conectividade
```

#### Configuração do Código

1. **Registre o dispositivo** no dashboard ElderSync
   - Acesse [https://eldersync.vercel.app](https://eldersync.vercel.app)
   - Faça login como profissional de saúde
   - Vá em "Dispositivos" > "Registrar Novo"
   - Anote o **Device ID** e **API Key** gerados

2. **Configure o arquivo ESP32**

```cpp
// No arquivo esp32/main/config.h

// WiFi
const char* WIFI_SSID = "SuaRedeWiFi";
const char* WIFI_PASSWORD = "SuaSenhaWiFi";

// ElderSync API
const char* SERVER_URL = "https://SEU_PROJETO.supabase.co/functions/v1/make-server-ba5f214e/iot/metrics";

// Credenciais do dispositivo
const char* DEVICE_ID = "xxxxx-xxxxx-xxxxx";
const char* API_KEY = "yyyyyyyyyyyyyyy";
```

3. **Upload do código**
   - Conecte o ESP32 via USB
   - Selecione: Tools > Board > ESP32 Dev Module
   - Selecione a porta COM correta
   - Clique em Upload

### 3️⃣ Montagem do Hardware

#### Conexões MPU6050 → ESP32

```
MPU6050    ESP32
-------    -----
VCC   →    3.3V
GND   →    GND
SCL   →    GPIO 22
SDA   →    GPIO 21
```

#### Bateria 18650

- Insira a bateria 18650 no slot do módulo gerenciador
- Conecte o carregador Micro USB para carregar
- LED indicador mostra status de carga

> **💡 Dica:** Use baterias 18650 de boa qualidade (Samsung, LG, Sony) para melhor autonomia e segurança.

---

## 📖 Documentação Completa

### 📁 Estrutura do Repositório (Monorepo)

```
wearable-mobilidade-idosos/
├── eldersync/                    # 🌐 Dashboard Web (ElderSync Platform)
│   ├── app/                      # Aplicação Next.js
│   │   ├── (auth)/               # Rotas de autenticação
│   │   ├── (dashboard)/          # Rotas do dashboard
│   │   ├── api/                  # API Routes
│   │   └── layout.tsx            # Layout principal
│   ├── components/               # Componentes React
│   │   ├── ui/                   # Componentes de UI (shadcn)
│   │   ├── charts/               # Gráficos e visualizações
│   │   └── forms/                # Formulários
│   ├── lib/                      # Utilitários e configs
│   │   ├── supabase/             # Cliente Supabase
│   │   └── utils.ts              # Funções auxiliares
│   ├── public/                   # Arquivos estáticos
│   ├── supabase/                 # Edge Functions e migrations
│   │   ├── functions/            # Supabase Edge Functions
│   │   │   └── make-server-ba5f214e/  # API para ESP32
│   │   └── migrations/           # Migrações SQL
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md                 # Instruções da dashboard
│
├── esp32/                        # 🔌 Firmware do ESP32
│   ├── main/
│   │   ├── main.ino              # Código principal
│   │   ├── config.h              # Configurações (WiFi, API)
│   │   ├── sensors.cpp           # Implementação dos sensores
│   │   └── sensors.h             # Headers dos sensores
│   ├── libraries/                # Bibliotecas Arduino extras
│   └── README.md                 # Instruções do ESP32
│
├── docs/                         # 📚 Documentação
│   ├── IOT_INTEGRATION.md        # Guia de integração ESP32
│   ├── HARDWARE_SETUP.md         # Montagem do hardware
│   ├── API_REFERENCE.md          # Referência da API
│   ├── DEPLOYMENT.md             # Deploy da dashboard
│   └── CALIBRATION.md            # Calibração dos sensores
│
├── research/                     # 🔬 Materiais de pesquisa
│   ├── metodologia.pdf
│   ├── resultados/
│   └── artigos/
│
├── .gitignore
├── LICENSE
└── README.md                     # Este arquivo (visão geral)
```

### 📚 Guias Disponíveis

- **[Integração IoT](./docs/IOT_INTEGRATION.md)** - Como conectar ESP32 à plataforma
- **[Setup de Hardware](./docs/HARDWARE_SETUP.md)** - Montagem física do dispositivo
- **[Referência da API](./docs/API_REFERENCE.md)** - Endpoints e formatos de dados
- **[Calibração](./docs/CALIBRATION.md)** - Ajustes finos para cada paciente

---

## 🔬 Pesquisa Acadêmica

### Programa PIBICT Cesupa/CNPq

Este projeto é desenvolvido no âmbito do **Programa Institucional de Bolsas de Iniciação Científica, Desenvolvimento Tecnológico e Inovação (PIBICT)**, financiado pelo CNPq.

### Objetivos

#### **Objetivo Geral:**
Desenvolver tecnologia automatizada para monitoramento de mobilidade física e prevenção de quedas em idosos.

#### **Objetivos Específicos:**

1. ✅ Monitorar parâmetros de mobilidade, passos e padrões de atividade
2. ✅ Criar protótipo funcional considerando segurança e acessibilidade
3. ✅ Desenvolver plataforma web profissional para visualização de dados
4. 🔄 Validar tecnologia com testes em idosos voluntários
5. 🔄 Avaliar eficácia na detecção de riscos de quedas

---

## 👥 Equipe

### Orientadoras

- **Prof.ª Alessandra Natasha Alcântara Barreiros Baganha**
- **Prof.ª Wiviane Maria Torres de Matos Freitas**

### Bolsistas

- **Rafaely Sarraf Rezegue** - Fisioterapia
- **Yasmin dos Santos Barata** - Engenharia de Computação

### Instituição

**Centro Universitário do Estado do Pará (CESUPA)**  

---

## 🛠️ Stack Tecnológica

### Hardware
- **ESP32** - Microcontrolador com WiFi/Bluetooth
- **MPU6050** - Sensor MEMS 6-DoF (acelerômetro + giroscópio)
- **SD Card Module** - Armazenamento local

### Firmware
- **Arduino Framework** - C++
- **ArduinoJson** - Serialização de dados
- **WiFi Library** - Conectividade

### Plataforma ElderSync
- **Frontend:** React + Next.js + TypeScript
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Hosting:** Vercel
- **Autenticação:** Supabase Auth
- **Real-time:** Supabase Realtime Subscriptions
- **UI Components:** shadcn/ui + Tailwind CSS
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod

---

## 🔧 Comandos Úteis

### Dashboard (ElderSync)

```bash
# Desenvolvimento
cd eldersync
pnpm run dev              # Inicia servidor de desenvolvimento
pnpm run build            # Build de produção
pnpm run start            # Inicia servidor de produção
pnpm run lint             # Verifica linting

# Supabase
npx supabase start       # Inicia Supabase local
npx supabase db push     # Aplica migrações
npx supabase gen types   # Gera tipos TypeScript
```

### ESP32

```bash
# Arduino CLI (opcional)
arduino-cli compile --fqbn esp32:esp32:esp32 esp32/main
arduino-cli upload --fqbn esp32:esp32:esp32 -p /dev/ttyUSB0 esp32/main
```

---

## 📄 Licença

Este projeto está sob a licença **MIT**. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 📞 Contato

### Repositório e Suporte Técnico
- **GitHub:** [@YasminSBarata](https://github.com/YasminSBarata)
- **Issues:** [GitHub Issues](https://github.com/YasminSBarata/wearable-mobilidade-idosos/issues)

### Contato Acadêmico
- **Email:** yasminsb.dev@gmail.com
- **Instituição:** Centro Universitário do Estado do Pará (CESUPA)

### Plataforma ElderSync
- **Web:** [https://eldersync.vercel.app](https://eldersync.vercel.app)
- **Suporte:** Através da plataforma

---

## 📚 Referências Principais

1. BEARD JR et al. **O relatório mundial sobre envelhecimento e saúde.** The Lancet, 2016.
2. IBGE. **Censo 2022: Projeção da População.** Rio de Janeiro, 2022.
3. OPAS. **Envelhecimento ativo: uma política de saúde.** Brasília, 2005.
4. ZAGO, A. S. **Exercício físico e o processo saúde-doença no envelhecimento.** Revista Brasileira de Geriatria e Gerontologia, 2010.
5. TINETTI, M. E. **Falls, injuries due to falls, and the risk of admission to a nursing home.** New England Journal of Medicine, 1997.

---

## 🌍 English Summary

**ElderSync - Automated Physical Mobility Monitoring Technology for Fall Prevention in Elderly Patients**

ElderSync is a complete wearable solution for real-time monitoring of physical mobility in elderly individuals to prevent falls. The system uses an ESP32 microcontroller with an MPU6050 sensor (accelerometer + gyroscope) to collect movement data, count steps, detect falls, and analyze activity patterns.

**Key Features:**
- Real-time data collection at 20Hz with cloud storage
- 10 advanced metrics including step count, gait speed, postural stability, TUG estimation
- Professional web platform deployed on Vercel: [eldersync.vercel.app](https://eldersync.vercel.app)
- Secure device-to-cloud communication via WiFi
- Interactive dashboards for healthcare professionals
- Automated fall detection with 3-phase algorithm
- 2-3 days battery autonomy with 18650 Li-ion

**Tech Stack:**
- Hardware: ESP32 + MPU6050 (~$25-40 USD)
- Frontend: React + Next.js + TypeScript
- Backend: Supabase (PostgreSQL + Edge Functions)
- Hosting: Vercel

This research is part of the CNPq PIBICT program at CESUPA (Centro Universitário do Estado do Pará) and aims to promote active aging and functional independence through accessible, non-intrusive technology. The validation phase includes physiotherapy assessments before and after a 20-30 day usage period with elderly volunteers.

> **Future improvements:** SD Card module for local backup and offline operation (planned for future versions)
