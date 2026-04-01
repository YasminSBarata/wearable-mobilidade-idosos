# Contexto do Projeto ElderSync — Artigo para Continuidade de Sessão

Este documento descreve tudo que foi desenvolvido no projeto **ElderSync**, um sistema wearable de monitoramento de mobilidade para idosos. Use este contexto para continuar o trabalho em uma nova sessão.

---

## 1. Visão Geral do Projeto

**Nome:** ElderSync
**Tipo:** Sistema wearable de monitoramento de mobilidade e prevenção de quedas em idosos
**Natureza:** Projeto de pesquisa científica — CNPq PIBICT, CESUPA (Centro Universitário do Estado do Pará)
**Status:** Em produção (frontend no Vercel, backend no Supabase)
**URL em produção:** https://eldersync.vercel.app
**Repositório:** https://github.com/YasminSBarata/wearable-mobilidade-idosos
**Branch principal:** `main` | Branch de desenvolvimento: `develop`

### Equipe
- **Orientadoras:** Prof. Alessandra Baganha, Prof. Wiviane Freitas
- **Pesquisadoras:** Rafaely Rezegue (Fisioterapia), Yasmin Barata (Engenharia da Computação)

### Objetivos Científicos
1. Monitorar parâmetros de mobilidade (passos, cadência, velocidade de marcha, padrão circadiano)
2. Detectar quedas e episódios de inatividade em tempo real
3. Fornecer plataforma web profissional para fisioterapeutas acompanharem seus pacientes
4. Validar com voluntários idosos (período de uso de 20–30 dias)
5. Avaliar a eficácia do algoritmo de detecção de quedas

---

## 2. Estrutura do Repositório

```
wearable-mobilidade-idosos/
├── ElderSync/                    # Frontend React + Backend Supabase (monorepo)
│   ├── src/                      # Código React (TypeScript)
│   │   ├── components/           # Componentes da interface
│   │   ├── utils/supabase/       # Cliente Supabase
│   │   ├── App.tsx               # Componente raiz com RouterProvider
│   │   ├── routes.tsx            # Definição de rotas
│   │   └── main.tsx              # Entry point
│   ├── supabase/
│   │   └── functions/            # Edge Functions (Deno + Hono)
│   │       ├── auth/             # POST /auth/signup
│   │       ├── iot/              # Endpoints IoT (métricas, dispositivos)
│   │       ├── patients/         # CRUD de pacientes
│   │       ├── health/           # Health check
│   │       └── _shared/          # Código compartilhado (types, kv_store, middleware, logger)
│   ├── docs/                     # Documentação técnica
│   ├── package.json              # Dependências do frontend
│   └── vite.config.ts
├── esp32/
│   ├── Implementados/
│   │   └── espMPU.ino            # Firmware em produção (C++ Arduino)
│   └── Testes/                   # Sketches de teste
├── docs/
│   └── IOT_INTEGRATION.md        # Guia de integração IoT
├── research/                     # Materiais acadêmicos
└── README.md
```

---

## 3. Stack Tecnológica

### Hardware (Dispositivo Wearable)
| Componente | Especificação |
|---|---|
| Microcontrolador | ESP32 (WiFi integrado) |
| Sensor inercial | MPU6050 — 3 eixos acelerômetro + 3 eixos giroscópio (I2C) |
| Pinos I2C | SDA → GPIO21, SCL → GPIO22 |
| Endereço I2C | 0x68 |
| Bateria | Li-ion 18650, 3000–3500mAh |
| Faixas do sensor | Acelerômetro ±2g (LSB 16384), Giroscópio ±250°/s (LSB 131) |

### Firmware ESP32
- **Linguagem:** C++ (Arduino Framework)
- **Bibliotecas:** `Wire.h`, `WiFi.h`, `HTTPClient.h`, `ArduinoJson.h` (v6.x)
- **Frequência de amostragem:** 20 Hz
- **Intervalo de envio:** 5 segundos (agrega e envia para a nuvem)
- **Comunicação:** HTTPS POST → Supabase Edge Function `/iot/metrics`

### Frontend
| Tech | Versão | Função |
|---|---|---|
| React | 19 | UI |
| TypeScript | — | Tipagem |
| Vite | — | Build |
| React Router | v7.13.0 | Roteamento |
| Tailwind CSS | v4 | Estilização |
| shadcn/ui + Radix UI | — | Componentes UI |
| Recharts | 3.7.0 | Gráficos |
| React Hook Form | 7.71.1 | Formulários |
| @supabase/supabase-js | 2.95.3 | Cliente Supabase |
| Lucide React | — | Ícones |
| Sonner | — | Toast notifications |

### Backend
| Tech | Versão | Função |
|---|---|---|
| Supabase | — | Plataforma (Auth + DB + Edge Functions) |
| Deno | — | Runtime das Edge Functions |
| Hono | 4.4.0 | Framework web para as Edge Functions |
| PostgreSQL | — | Banco de dados (via Supabase) |
| @supabase/supabase-js | 2.49.8 | Cliente dentro das functions |

---

## 4. Banco de Dados

### Estratégia: KV Store sobre PostgreSQL
O projeto usa uma tabela de chave-valor genérica chamada `kv_store_ba5f214e` em vez de tabelas relacionais tradicionais:

```sql
-- Tabela principal de dados
CREATE TABLE kv_store_ba5f214e (
  key  TEXT PRIMARY KEY,
  value JSONB
);
```

### Convenções de Chaves
| Padrão de Chave | Conteúdo |
|---|---|
| `user:{userId}:patient:{patientId}` | Registro do paciente com métricas |
| `device:{deviceId}` | Credenciais do dispositivo IoT |
| `metrics:{patientId}:{metricId}` | Registro histórico de métrica (timestamp como ID) |
| `alert:{patientId}:{alertId}` | Alerta de queda ou inatividade |

### Funções do KV Store (`supabase/functions/_shared/kv_store.ts`)
- `set(key, value)` — Upsert
- `get(key)` — Busca por chave
- `del(key)` — Remoção
- `mset(keys[], values[])` — Upsert em lote
- `mget(keys[])` — Busca em lote
- `mdel(keys[])` — Remoção em lote
- `getByPrefix(prefix)` — Busca por prefixo (usa `LIKE 'prefix%'`)

---

## 5. Backend — Edge Functions

### Variáveis de Ambiente (auto-injetadas pelo Supabase)
```
SUPABASE_URL=https://ewbwxqqwpafqtmiscgsn.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```
**IMPORTANTE:** Os nomes corretos são `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — não nomes customizados.

### Configuração do Hono (CRÍTICO)
O Supabase Edge Runtime passa o caminho completo (incluindo o nome da função) ao handler. Por isso, SEMPRE usar:
```typescript
const app = new Hono().basePath("/nome-da-funcao")
```

### Deploy das Functions
```bash
npx supabase functions deploy auth --no-verify-jwt
npx supabase functions deploy iot --no-verify-jwt
npx supabase functions deploy patients
npx supabase functions deploy health
```
`--no-verify-jwt` é necessário para endpoints públicos (signup, IoT).

---

### 5.1 Function: `auth`

**Endpoint:** `POST /auth/signup`
**Autenticação:** Nenhuma (pública)

**Body esperado:**
```json
{
  "email": "usuario@email.com",
  "password": "senha123",
  "name": "Nome Completo"
}
```

**Fluxo:**
1. Cria usuário no Supabase Auth (auto-confirmed)
2. Faz login automático com as mesmas credenciais
3. Retorna tokens JWT

**Resposta:**
```json
{
  "user": { "id": "uuid", "email": "..." },
  "access_token": "...",
  "refresh_token": "..."
}
```

---

### 5.2 Function: `iot`

#### `POST /iot/metrics`
**Autenticação:** Headers `X-Device-Id` + `X-Device-Key`
**Propósito:** Recebe dados do ESP32 e processa métricas

**Body (dados brutos do sensor):**
```json
{
  "accel": { "x": 0.01, "y": -0.02, "z": 0.98 },
  "gyro": { "x": 1.5, "y": -0.8, "z": 0.3 },
  "temperature": 36.7,
  "timestamp": 12345
}
```

**Processamento server-side:**
1. Valida `deviceId` + `apiKey` no KV store
2. Calcula magnitude do acelerômetro: `sqrt(x² + y² + z²)`
3. Classifica postura (caminhando / em pé / sentado) por thresholds
4. Detecta queda: `accelMag > 2.5g`
5. Detecta transições abruptas: `gyroMag > 45°/s`
6. Atualiza métricas do paciente com EMA (Exponential Moving Average)
7. Armazena métrica histórica no KV store
8. Cria alertas se necessário

**Resposta:**
```json
{
  "success": true,
  "metricId": "timestamp-uuid",
  "updatedMetrics": { "stepCount": 150, "gaitSpeed": 1.2, ... }
}
```

#### `POST /iot/devices`
**Autenticação:** JWT do usuário (header Authorization)
**Propósito:** Registra novo dispositivo ESP32 para um paciente

**Body:**
```json
{ "patientId": "uuid" }
```

**Resposta:**
```json
{
  "deviceId": "uuid-gerado",
  "apiKey": "chave-aleatoria"
}
```

#### `POST /iot/reset-daily`
**Propósito:** Reseta métricas diárias do paciente mantendo médias contínuas (cadência, velocidade de marcha, TUG)

---

### 5.3 Function: `patients`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/patients` | Lista todos os pacientes do usuário autenticado |
| POST | `/patients` | Cria novo paciente |
| PUT | `/patients/:id` | Atualiza informações do paciente |
| DELETE | `/patients/:id` | Remove paciente e dados associados |
| GET | `/patients/:id/metrics` | Histórico de métricas (últimas 100) |
| GET | `/patients/:id/alerts` | Lista de alertas (quedas, inatividade) |

Todos os endpoints requerem JWT do usuário no header `Authorization: Bearer <token>`.

---

### 5.4 Function: `health`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Status do sistema + serviços |
| GET | `/health/ping` | Retorna "pong" |

---

### 5.5 Shared — `_shared/middleware.ts`
```typescript
// requireAuth extrai e valida JWT
// Injeta userId e userEmail no contexto Hono
// Retorna 401 se token inválido ou ausente
```

---

## 6. Frontend — Componentes Principais

### Roteamento (`src/routes.tsx`)
```
/            → Login
/signup      → Cadastro
/dashboard   → Dashboard (protegido)
```

### Componentes (`src/components/`)

| Componente | Função |
|---|---|
| `Dashboard.tsx` | Tela principal: lista pacientes, exibe métricas, gerencia dispositivos |
| `Login.tsx` | Autenticação via `supabase.auth.signInWithPassword()` |
| `Signup.tsx` | Cadastro via Edge Function `/auth/signup` |
| `ProtectedRoute.tsx` | HOC que verifica sessão antes de renderizar |
| `PatientCard.tsx` | Card de seleção de paciente |
| `MetricCard.tsx` | Exibição individual de cada métrica com barra de progresso |
| `CircadianChart.tsx` | Gráfico de barras com atividade por hora (0–23h) |
| `PatientHistory.tsx` | Modal com histórico de métricas e gráficos de tendência |
| `AddPatientModal.tsx` | Formulário para adicionar novo paciente |
| `RegisterDeviceModal.tsx` | Gera e exibe `deviceId` + `apiKey` para configurar o ESP32 |
| `ui/` | 50+ componentes shadcn/ui (botões, dialogs, inputs, etc.) |

---

## 7. Fluxo de Autenticação

### Cadastro
1. Usuário preenche formulário em `/signup`
2. Frontend faz `POST /auth/signup` para a Edge Function
3. Edge Function cria usuário no Supabase Auth + faz login automático
4. Frontend recebe `access_token` + `refresh_token`
5. Frontend chama `supabase.auth.setSession({ access_token, refresh_token })`
6. Redireciona para `/dashboard`

### Login
1. Usuário preenche email/senha em `/`
2. Frontend chama `supabase.auth.signInWithPassword(email, password)`
3. Supabase client gerencia sessão automaticamente (armazena no localStorage)
4. Redireciona para `/dashboard`

### Proteção de Rotas
- `ProtectedRoute` chama `supabase.auth.getSession()`
- Se sessão inválida → redireciona para `/`

### Logout
- Limpa localStorage + invalida sessão Supabase

---

## 8. Firmware ESP32 (`esp32/Implementados/espMPU.ino`)

### Seção de Configuração (editar antes de gravar no dispositivo)
```cpp
const char* WIFI_SSID     = "sua-rede-wifi";
const char* WIFI_PASSWORD = "sua-senha-wifi";
const char* SERVER_URL    = "https://ewbwxqqwpafqtmiscgsn.supabase.co/functions/v1/iot/metrics";
const char* DEVICE_ID     = "uuid-gerado-no-dashboard";
const char* API_KEY       = "chave-gerada-no-dashboard";
const unsigned long SEND_INTERVAL = 5000; // 5 segundos
```

### Loop Principal
```
setup():
  Serial.begin(115200)
  Wire.begin() → I2C
  Inicializa MPU6050 (wake, configura ranges)
  Conecta WiFi (30 tentativas, timeout)

loop():
  Verifica WiFi (reconecta se necessário)
  Lê MPU6050 (accel XYZ, gyro XYZ, temperatura)
  A cada 5 segundos:
    Monta JSON com leituras
    Envia POST para /iot/metrics com headers:
      X-Device-Id: DEVICE_ID
      X-Device-Key: API_KEY
      Content-Type: application/json
    Lê resposta (verifica alertas de queda)
    Log no Serial
```

### Conversão dos Dados Brutos
```cpp
accel_g = raw_accel / 16384.0;    // ±2g → g-force
gyro_dps = raw_gyro / 131.0;      // ±250°/s → graus/segundo
temp_c = (raw_temp / 340.0) + 36.53;
```

---

## 9. As 10 Métricas Monitoradas

| # | Métrica | Tipo | Descrição |
|---|---|---|---|
| 1 | `stepCount` | int | Contagem de passos (picos no eixo Z, >1.2g) |
| 2 | `averageCadence` | float (passos/min) | Ritmo de caminhada |
| 3 | `timeSeated` / `timeStanding` / `timeWalking` | float (horas) | Distribuição de tempo por postura |
| 4 | `gaitSpeed` | float (m/s) | Velocidade de marcha (cadência × 0.7m) |
| 5 | `posturalStability` | 0–100 | Estabilidade postural (desvio da baseline) |
| 6 | `fallsDetected` | bool + timestamp | Queda detectada (algoritmo 3 fases) |
| 7 | `inactivityEpisodes` | int + duração | Sedentarismo prolongado (>2h, accel <0.15g) |
| 8 | `tugEstimated` | float (segundos) | TUG (Timed Up and Go) automatizado |
| 9 | `abruptTransitions` | int/dia | Rotações abruptas (>45°/s) |
| 10 | `circadianPattern` | array[24] | Distribuição de atividade por hora |

### Algoritmo de Detecção de Quedas (3 Fases)
1. **Fase 1:** Magnitude do acelerômetro > 2.5g (impacto)
2. **Fase 2:** Mudança de orientação de ~90° (corpo horizontal)
3. **Fase 3:** Ausência de movimento por > 5 segundos (pessoa no chão)

### Estratégias de Atualização das Métricas
- **EMA (Exponential Moving Average):** Cadência, velocidade de marcha, estabilidade postural, TUG
- **Acumulativo:** Contagem de passos, tempo por postura, transições abruptas
- **Booleano persistente:** Queda detectada (permanece `true` se detectada)
- **Array acumulativo:** Padrão circadiano (incrementa por hora do dia)

---

## 10. Sistema de Alertas

Dois tipos de alertas são gerados automaticamente:

| Tipo | Gatilho | Armazenamento |
|---|---|---|
| Queda | `accelMag > 2.5g` + critérios adicionais | `alert:{patientId}:{alertId}` |
| Inatividade | > 2 horas sem movimento (`accel < 0.15g`) | `alert:{patientId}:{alertId}` |

---

## 11. Status Online do Dispositivo

O dashboard verifica se o dispositivo está online comparando o timestamp da última atualização:
- **Online:** Última atualização < 2 minutos atrás
- **Offline:** Última atualização ≥ 2 minutos atrás

---

## 12. Variáveis de Ambiente do Frontend

Arquivo `.env.local` em `ElderSync/`:
```env
VITE_SUPABASE_URL=https://ewbwxqqwpafqtmiscgsn.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

---

## 13. Comandos de Desenvolvimento

```bash
# Frontend
cd ElderSync
pnpm install
pnpm dev          # Servidor de desenvolvimento (http://localhost:5173)
pnpm build        # Build de produção
pnpm lint         # Verificação ESLint

# Deploy das Edge Functions
npx supabase functions deploy auth --no-verify-jwt
npx supabase functions deploy iot --no-verify-jwt
npx supabase functions deploy patients
npx supabase functions deploy health
```

---

## 14. Detalhes do Supabase

- **Project ref:** `ewbwxqqwpafqtmiscgsn`
- **URL:** `https://ewbwxqqwpafqtmiscgsn.supabase.co`
- **Tabela de dados:** `kv_store_ba5f214e`
- **Auth:** Supabase Auth nativo (email + senha)

---

## 15. Armadilhas Conhecidas e Soluções

| Problema | Causa | Solução |
|---|---|---|
| Rotas não batem nas Edge Functions | Hono não tem `basePath` configurado | `new Hono().basePath("/nome-funcao")` |
| Variáveis de ambiente não encontradas | Usar nomes customizados | Usar exatamente `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` |
| `WARNING: Docker is not running` no deploy | Docker offline | Não bloqueia o deploy; é apenas aviso |
| `setSession` não chamado após signup | Tokens retornados mas não injetados | Chamar `supabase.auth.setSession({ access_token, refresh_token })` |
| Sessão não persiste no dashboard | `getSession()` chamado antes de `setSession()` | Garantir ordem correta no fluxo de signup |

---

## 16. Próximas Melhorias Planejadas

- Módulo SD Card para operação offline (armazenamento local quando sem WiFi)
- Bluetooth Low Energy (BLE) como alternativa ao WiFi
- Algoritmo de TUG mais preciso com análise temporal real
- App mobile para cuidadores (React Native ou Flutter)
- Exportação de relatórios PDF para fisioterapeutas

---

*Documento gerado em 22/02/2026 — ElderSync v1.0 — CNPq PIBICT / CESUPA*
