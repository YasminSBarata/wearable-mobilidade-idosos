# ElderSync v2.0 — Plano de Ação

## Resumo do Inventário

### Tabela de Classificação Geral

| Artefato | Localização | Classificação | Justificativa |
|---|---|---|---|
| `Login.tsx` | `src/components/Login.tsx` | ✅ MANTER | Auth via `signInWithPassword()` sem mudanças |
| `Signup.tsx` | `src/components/Signup.tsx` | ✅ MANTER | Fluxo de token + `setSession()` sem mudanças |
| `ProtectedRoute.tsx` | `src/components/ProtectedRoute.tsx` | ✅ MANTER | Guarda de rotas genérico, sem lógica de domínio |
| `supabase/client.ts` | `src/utils/supabase/client.ts` | ✅ MANTER | Singleton + `checkSession()` reutilizável |
| `cn.ts` | `src/utils/cn.ts` | ✅ MANTER | Utilitário puro de CSS |
| Todos os `src/components/ui/*` | shadcn/ui primitives | ✅ MANTER | Button, Input, Card, Dialog, Form, Select, Tabs, Alert, Chart, Sonner, etc. — 100% genéricos |
| `use-mobile.ts` | `src/components/ui/use-mobile.ts` | ✅ MANTER | Hook de viewport genérico |
| `routes.tsx` | `src/routes.tsx` | ♻️ ADAPTAR | Adicionar 6 novas rotas, manter `/`, `/signup`, `ProtectedRoute` |
| `App.tsx` | `src/App.tsx` | ✅ MANTER | Só encapsula RouterProvider |
| `main.tsx` | `src/main.tsx` | ✅ MANTER | Entry point sem lógica de domínio |
| `AddPatientModal.tsx` | `src/components/AddPatientModal.tsx` | ♻️ ADAPTAR | Adicionar `birth_date`, `gender`, `clinical_notes`; remover métricas iniciais zeradas |
| `PatientCard.tsx` | `src/components/PatientCard.tsx` | ♻️ ADAPTAR | Exibir data nasc. / resumo última sessão; remover indicadores de métricas em tempo real |
| `MetricCard.tsx` | `src/components/MetricCard.tsx` | ♻️ ADAPTAR | Pode ser reaproveitado para exibir resultados de teste (título/valor/unidade/cor) |
| `PatientHistory.tsx` | `src/components/PatientHistory.tsx` | 🔄 SUBSTITUIR | Toda a lógica é de monitoramento contínuo; será o novo "Dashboard de Evolução" com gráficos longitudinais |
| `CircadianChart.tsx` | `src/components/CircadianChart.tsx` | 🔄 SUBSTITUIR | Específico para padrão circadiano 24h; será substituído por gráficos de evolução SPPB/TUG |
| `RegisterDeviceModal.tsx` | `src/components/RegisterDeviceModal.tsx` | 🔄 SUBSTITUIR | Fluxo de API Key não existe mais; novo modal será para associar dispositivo à sessão opcionalmente |
| `Dashboard.tsx` | `src/components/Dashboard.tsx` | 🔄 SUBSTITUIR | Toda a lógica é de tempo real (polling 30s, métricas contínuas, alertas de queda) |
| `supabase/functions/auth/` | Edge Function | ✅ MANTER | Signup funciona sem mudanças |
| `supabase/functions/patients/` (GET/POST/DELETE/PUT) | Edge Function | ♻️ ADAPTAR | CRUD mantido; adaptar schema da resposta (sem `metrics`, adicionar `birth_date`, `gender`) |
| `supabase/functions/patients/` (metrics + alerts) | Edge Function endpoints | 🔄 SUBSTITUIR | Substituir por endpoints de `test_sessions` |
| `supabase/functions/iot/` (todos os endpoints v1) | Edge Function | 🔄 SUBSTITUIR | Reescrita completa para SSE + command + reading |
| `supabase/functions/health/` | Edge Function | ✅ MANTER | Sem mudanças |
| `supabase/functions/_shared/middleware.ts` | Shared | ✅ MANTER | `requireAuth` genérico |
| `supabase/functions/_shared/kv_store.ts` | Shared | 🔄 SUBSTITUIR | KV store substituído por tabelas relacionais (`patients`, `test_sessions`, `device_readings`) |
| `supabase/functions/_shared/supabase.ts` | Shared | ✅ MANTER | Factory de clients reutilizável |
| `supabase/functions/_shared/logger.ts` | Shared | ✅ MANTER | Logging genérico |
| `supabase/functions/_shared/types.ts` | Shared | 🔄 SUBSTITUIR | Tipos baseados em métricas contínuas; reescrever com `Patient`, `TestSession`, `DeviceReading` |
| `esp32/Implementados/espMPU.ino` | Firmware | 🔄 SUBSTITUIR | Lógica de transmissão contínua a cada 5s; reescrever para modo sob demanda |
| `esp32/Testes/MPU_Arduino.ino` | Firmware | ✅ MANTER | Teste de sensor independente do protocolo |
| `espMPU_verificação.ino` | Firmware | ♻️ ADAPTAR | Útil como base para teste do novo endpoint |
| KV store pattern (toda a persistência) | Backend | 🔄 SUBSTITUIR | Migrar para tabelas relacionais no Supabase PostgreSQL |

---

## Plano por Camada

### 🗄️ Banco de Dados

#### Tabelas a criar (migration SQL)

```sql
-- Manter apenas kv_store_ba5f214e se necessário para compatibilidade transitória

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birth_date DATE,
  gender TEXT,
  clinical_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  examiner_initials TEXT,
  notes TEXT,
  -- Equilíbrio
  balance_feet_together_result TEXT,
  balance_feet_together_time NUMERIC(6,2),
  balance_feet_together_score SMALLINT,
  balance_feet_together_failure_reason TEXT,
  balance_semi_tandem_result TEXT,
  balance_semi_tandem_time NUMERIC(6,2),
  balance_semi_tandem_score SMALLINT,
  balance_semi_tandem_failure_reason TEXT,
  balance_tandem_result TEXT,
  balance_tandem_time NUMERIC(6,2),
  balance_tandem_score SMALLINT,
  balance_tandem_failure_reason TEXT,
  balance_total SMALLINT,
  -- Marcha
  gait_distance SMALLINT,  -- 3 ou 4 metros
  gait_attempt1_time NUMERIC(6,2),
  gait_attempt1_support TEXT,
  gait_attempt1_completed BOOLEAN,
  gait_attempt1_failure_reason TEXT,
  gait_attempt2_time NUMERIC(6,2),
  gait_attempt2_support TEXT,
  gait_attempt2_completed BOOLEAN,
  gait_attempt2_failure_reason TEXT,
  gait_best_time NUMERIC(6,2),
  gait_score SMALLINT,
  gait_oscillation_index_1 NUMERIC(6,2),
  gait_oscillation_index_2 NUMERIC(6,2),
  -- Levantar-se da Cadeira
  chair_pretest_passed BOOLEAN,
  chair_pretest_used_arms BOOLEAN,
  chair_pretest_failure_reason TEXT,
  chair_pretest_max_inclination NUMERIC(6,2),
  chair_time NUMERIC(6,2),
  chair_completed BOOLEAN,
  chair_failure_reason TEXT,
  chair_score SMALLINT,
  chair_avg_inclination NUMERIC(6,2),
  chair_inclination_per_rep NUMERIC(6,2)[],
  -- TUG
  tug_time NUMERIC(6,2),
  tug_assistive_device TEXT,
  tug_footwear TEXT,
  tug_physical_help BOOLEAN,
  tug_safety_level TEXT,
  tug_gait_pattern TEXT,
  tug_balance_turn TEXT,
  tug_sit_control TEXT,
  tug_instability BOOLEAN,
  tug_instability_notes TEXT,
  tug_pain BOOLEAN,
  tug_pain_notes TEXT,
  tug_compensatory_strategies TEXT,
  tug_classification TEXT,
  -- Totais
  sppb_total SMALLINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE device_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES test_sessions(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL, -- 'balance_a', 'balance_b', 'balance_c', 'gait_1', 'gait_2', 'chair_pretest', 'chair_main', 'tug'
  raw_data JSONB,
  oscillation_metrics JSONB,
  gait_metrics JSONB,
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE device_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  session_id UUID REFERENCES test_sessions(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL,
  -- duration_max por test_type: balance_a/b/c → 10s | gait_1/2 → 30s | chair_pretest → 15s | chair_main/tug → 60s
  duration_max INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending | executing | done | cancelled
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own patients" ON patients
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users see sessions of own patients" ON test_sessions
  FOR ALL USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

CREATE POLICY "users see readings of own sessions" ON device_readings
  FOR ALL USING (
    session_id IN (
      SELECT ts.id FROM test_sessions ts
      JOIN patients p ON ts.patient_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

ALTER TABLE device_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own device commands" ON device_commands
  FOR ALL USING (
    session_id IN (
      SELECT ts.id FROM test_sessions ts
      JOIN patients p ON ts.patient_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );
```

- [x] Escrever o arquivo de migration em `supabase/migrations/`
- [x] Apagar `kv_store_ba5f214e` (sem dados reais, tabela removida)
- [x] Aplicar migration no Supabase Dashboard

> **⚠️ Alerta**: Não há dados de pacientes reais em produção (projeto de pesquisa em desenvolvimento), então migração de dados não é necessária — confirmar com a equipe antes.

---

### ⚙️ Backend — Edge Functions

#### Manter sem alterações
- `auth/` — signup funciona perfeitamente
- `health/` — diagnóstico genérico
- `_shared/middleware.ts` — `requireAuth` genérico
- `_shared/supabase.ts` — factories reutilizáveis
- `_shared/logger.ts` — logging genérico

#### Adaptar
- `patients/` — Refatorar para usar tabela `patients` (SQL) ao invés de KV store. Endpoints GET/POST/DELETE/PUT se mantêm, apenas a camada de dados muda.
  - [ ] Remover import de `kv_store.ts`
  - [ ] Substituir todas as operações KV por `supabase.from('patients').select/insert/update/delete`
  - [ ] Adaptar schema da resposta: remover `metrics`, adicionar `birth_date`, `gender`, `clinical_notes`
  - [ ] Remover endpoints `/metrics` e `/alerts` (não existem mais no domínio)

#### Substituir completamente
- `iot/index.ts` — Reescrita completa para arquitetura SSE. Sem polling, sem botão físico, sem API Key.
  - [x] `GET /iot/listen?device_id=abc` — SSE persistente; ESP32 conecta e aguarda comandos via Supabase Realtime
  - [x] `POST /iot/command` — dashboard dispara coleta; insere em `device_commands`; SSE entrega ao ESP32 instantaneamente
  - [x] `PATCH /iot/command/:id` — dashboard encerra coleta (`status: "cancelled"`); ESP32 detecta via SSE e para
  - [x] `POST /iot/reading` — ESP32 envia dados ao terminar; sem autenticação JWT (dispositivo IoT)
  - [x] Remover: `/metrics`, `/reset-daily`, `/devices`, toda lógica de agregação, detecção de quedas, API Key

#### Criar do zero
- `supabase/functions/sessions/index.ts` — CRUD completo de sessões de teste
  - [ ] `POST /sessions` — Criar nova sessão (`{patient_id, date, examiner_initials}`)
  - [ ] `GET /sessions?patient_id=X` — Listar sessões de um paciente
  - [ ] `GET /sessions/:id` — Buscar sessão completa
  - [ ] `PUT /sessions/:id` — Atualizar/salvar progresso (salvamento parcial por módulo)
  - [ ] `DELETE /sessions/:id` — Remover sessão

#### Atualizar
- `_shared/types.ts` — Reescrever com novos tipos: `Patient`, `TestSession`, `DeviceReading`, subtipos por módulo de teste

---

### 🖥️ Frontend — Componentes

#### Manter sem alterações
- `Login.tsx`, `Signup.tsx`, `ProtectedRoute.tsx`
- `src/utils/supabase/client.ts`, `src/utils/cn.ts`
- Todo `src/components/ui/*` (shadcn/ui)
- `App.tsx`, `main.tsx`

#### Adaptar (refactor de conteúdo)
- `routes.tsx` — Adicionar novas rotas:
  - [ ] `/patients` → Lista de pacientes (novo `PatientsPage`)
  - [ ] `/patients/:id` → Perfil do paciente
  - [ ] `/patients/:id/session/new` → Nova sessão de testes
  - [ ] `/patients/:id/sessions` → Histórico de sessões
  - [ ] `/patients/:id/evolution` → Dashboard de evolução
  - [ ] Redirecionar `/dashboard` → `/patients`

- `AddPatientModal.tsx` → `PatientFormModal.tsx`
  - [ ] Adicionar campos: `birth_date` (date picker), `gender` (select), `clinical_notes` (textarea)
  - [ ] Remover inicialização de métricas zeradas

- `PatientCard.tsx`
  - [ ] Exibir: nome, idade calculada de `birth_date`, data da última sessão, pontuação SPPB mais recente
  - [ ] Remover: badge de alerta de queda, indicadores de métricas contínuas

- `MetricCard.tsx`
  - [ ] Pode ser usado diretamente para exibir resultados por módulo (já tem `title`, `value`, `color`, `description`)
  - [ ] Verificar se precisa adaptar para exibir pontuação com badge de classificação

#### Substituir completamente
- `Dashboard.tsx` → dividir em 3 novas páginas:
  - [ ] `PatientsPage.tsx` — Lista de pacientes com busca + botão "Nova Sessão"
  - [ ] `PatientProfilePage.tsx` — Dados cadastrais + resumo última sessão + botões de ação
  - [ ] `SessionHistoryPage.tsx` — Lista de sessões com SPPB total e classificação TUG

- `PatientHistory.tsx` → `EvolutionDashboard.tsx`
  - [ ] 6 gráficos Recharts com evolução longitudinal (detalhes abaixo)

- `CircadianChart.tsx` → remover ou converter para gráfico de evolução TUG
- `RegisterDeviceModal.tsx` → simplificar para associação opcional de dispositivo durante sessão

#### Criar do zero

**Hook de comunicação IoT (centralizado):**
- [ ] `useDeviceSession(sessionId, deviceId)` — Centraliza toda a lógica IoT:
  - `POST /iot/command` ao iniciar cada teste
  - `PATCH /iot/command/:id` ao encerrar
  - Escuta chegada de dados em `device_readings` para a `session_id` atual
  - Expõe estado: `'idle' | 'waiting_device' | 'measuring' | 'data_received'`
  - **Regra**: dispositivo é sempre opcional — nunca bloquear o fluxo clínico

**Formulários de Teste:**
- [ ] `NewSessionForm.tsx` — Container com 4 seções (abas ou etapas progressivas)
- [ ] `BalanceTestModule.tsx` — 3 subtestes com bloqueio progressivo
  - [ ] `BalanceSubtest.tsx` — Componente reutilizável para cada subteste (A, B, C)
- [ ] `GaitSpeedModule.tsx` — Seleção de distância + 2 tentativas + pontuação automática
- [ ] `ChairStandModule.tsx` — Pré-teste + teste principal com lógica de bloqueio
- [ ] `TUGModule.tsx` — Cronômetro + campos qualitativos + classificação automática

**Componentes de apoio:**
- [ ] `Stopwatch.tsx` — Cronômetro de precisão (décimos de segundo) para uso nos testes
- [ ] `FailureReasonSelect.tsx` — Componente reutilizável do "Quadro 1" de motivos de falha
- [ ] `SPPBScoreSummary.tsx` — Exibição destacada da pontuação SPPB + TUG ao final da sessão
- [ ] `TUGClassificationBadge.tsx` — Badge colorido com classificação por faixa de tempo

**Gráficos de Evolução (`EvolutionDashboard.tsx`):**
- [ ] Evolução SPPB Total (LineChart, eixo Y 0–12)
- [ ] Evolução por componente SPPB (multi-line ou stacked bar)
- [ ] Evolução TUG com faixas de cor (LineChart + ReferenceArea)
- [ ] Velocidade de Marcha + Oscilações (LineChart, dual Y-axis)
- [ ] Tempo Levantar-se da Cadeira (LineChart)
- [ ] Cadeira: Tempo + Ângulo médio de inclinação (LineChart, dual Y-axis)

---

### 🧠 Frontend — Lógica de Negócio

Todo o scoring deve ser calculado no frontend (não no banco):

- [ ] `src/lib/scoring/balance.ts` — Pontuação dos 3 subtestes, lógica de bloqueio progressivo, total de equilíbrio
- [ ] `src/lib/scoring/gait.ts` — Seleção do menor tempo, lookup na tabela por distância (3m/4m), pontuação 0–4
- [ ] `src/lib/scoring/chairStand.ts` — Pré-teste, pontuação por tempo das 5 repetições (0–4)
- [ ] `src/lib/scoring/tug.ts` — Classificação automática pelas 4 faixas (≤10s, 11–20s, >20s, >30s) + cor
- [ ] `src/lib/scoring/sppb.ts` — Soma dos 3 componentes, pontuação total 0–12
- [ ] `src/lib/scoring/index.ts` — Export centralizado

> **Padrão de estado do formulário de sessão**: `PatientHistory.tsx` já implementa filtros, seleção de métrica e estado local com `useState` + chamadas de API — pode servir de referência estrutural para `NewSessionForm.tsx`.

---

### 🔌 Firmware ESP32

| Arquivo | Classificação | Ação |
|---|---|---|
| `espMPU.ino` | 🔄 SUBSTITUIR | Remover polling e toda lógica de métricas contínuas; reescrever para SSE |
| `MPU_Arduino.ino` (teste sensor) | ✅ MANTER | Útil para calibração e diagnóstico — inalterado |
| `espMPU_verificação.ino` | ♻️ ADAPTAR | Base para testar novo endpoint `POST /iot/reading` |

**Hardware — decisão final:**
- ESP32 + MPU6050 + bateria + LED de status. **Sem botão físico, sem display.**
- LED: apagado = desconectado | piscando devagar = aguardando | aceso = medindo

**O ESP32 sempre coleta os mesmos dados brutos (sem "modo"):**
- Aceleração 3 eixos (raw), giroscópio 3 eixos (raw), ângulo de inclinação (filtro complementar), magnitude de oscilação
- `test_type` define apenas a duração máxima — a dashboard decide qual métrica usar por teste

**Criar do zero — `espMPU_v2.ino`:**
```
setup():
  conectar WiFi
  iniciar LED de status

loop():
  se não conectado ao SSE:
    GET /iot/listen?device_id=DEVICE_ID
    LED pisca devagar

  ao receber evento SSE (novo comando):
    cmd = parse(evento)
    LED aceso (medindo)
    dados = coletar(cmd.duration_max)  // accel + gyro + ângulo + oscilação
    POST /iot/reading { session_id, test_type, command_id, raw_data, oscillation_metrics, gait_metrics }
    LED pisca devagar

  ao receber evento SSE (stop/cancelled):
    interromper coleta
    enviar dados parciais coletados até o momento
    LED pisca devagar

  se WiFi cair:
    tentar reconectar a cada 5s
    LED apagado
```

- [ ] Implementar conexão SSE (`GET /iot/listen`) com reconexão automática a cada 5s
- [ ] Implementar LED de 3 estados (apagado / pisca devagar / aceso)
- [ ] Coletar dados brutos do MPU6050 (accel + gyro nos 3 eixos)
- [ ] Filtro complementar (acelerômetro + giroscópio) para ângulo de inclinação — manter do plano original
- [ ] Calcular magnitude de oscilação — manter do plano original
- [ ] `POST /iot/reading` ao finalizar coleta (normal ou cancelada)
- [ ] **Remover**: polling, botão/interrupção de hardware, detecção de quedas, padrões circadianos, transmissão automática a cada 5s, `X-Device-Key`/`X-Device-Id`

> **⚠️ Alerta técnico**: O filtro complementar para ângulo de inclinação tem drift aceitável para testes de 20–30s. Calibrar posição de repouso antes de cada teste.

---

## Sequência de Implementação

### Fase 1 — Fundação do banco e API (sem UI, sem firmware) ✅
> Objetivo: ter dados persistindo corretamente antes de construir UI

| # | Item | Complexidade | Status |
|---|---|---|---|
| 1.1 | Migration SQL (4 tabelas + RLS) | Média | ✅ |
| 1.2 | Aplicar migration no Supabase Dashboard | Baixa | ✅ |
| 1.3 | Reescrever `_shared/types.ts` com novos tipos | Baixa | ✅ |
| 1.4 | Refatorar `patients/` para usar SQL (remover KV) | Média | ✅ |
| 1.5 | Criar `sessions/` Edge Function (CRUD completo) | Média | ✅ |
| 1.6 | Testar API com curl | Baixa | ✅ |
| 1.7 | Criar tabela `device_commands` + RLS | Baixa | ✅ |
| 1.8 | Reescrever `iot/` Edge Function (SSE + command + reading) | Alta | ✅ |

### Fase 2 — Estrutura base do frontend
> Objetivo: navegação funcionando com lista de pacientes

| # | Item | Complexidade | Dependências |
|---|---|---|---|
| 2.1 | Atualizar `routes.tsx` com todas as novas rotas | Baixa | — |
| 2.2 | Criar `PatientsPage.tsx` (lista + busca) | Baixa | 1.4, 2.1 |
| 2.3 | Adaptar `PatientFormModal.tsx` (add/edit) | Baixa | 1.4, 2.2 |
| 2.4 | Adaptar `PatientCard.tsx` | Baixa | 2.3 |
| 2.5 | Criar `PatientProfilePage.tsx` | Média | 1.5, 2.2 |
| 2.6 | Criar `SessionHistoryPage.tsx` | Baixa | 1.5, 2.5 |

### Fase 3 — Lógica de scoring (pura, testável)
> Objetivo: funções de pontuação prontas antes dos formulários

| # | Item | Complexidade | Dependências |
|---|---|---|---|
| 3.1 | `balance.ts` — subtestes A/B/C, bloqueio progressivo | Média | — |
| 3.2 | `gait.ts` — tabela 3m/4m, menor tempo | Baixa | — |
| 3.3 | `chairStand.ts` — pré-teste, 5 repetições | Baixa | — |
| 3.4 | `tug.ts` — 4 faixas, classificação + cor | Baixa | — |
| 3.5 | `sppb.ts` — soma dos 3 componentes | Baixa | 3.1, 3.2, 3.3 |

*Itens 3.1–3.5 podem ser desenvolvidos em paralelo.*

### Fase 4 — Formulário de nova sessão (caminho crítico)
> Objetivo: fisioterapeuta consegue registrar uma sessão completa

| # | Item | Complexidade | Dependências |
|---|---|---|---|
| 4.1 | `Stopwatch.tsx` + `FailureReasonSelect.tsx` | Baixa | — |
| 4.2 | `useDeviceSession` hook (lógica IoT centralizada) | Média | 1.8 |
| 4.3 | `BalanceSubtest.tsx` + `BalanceTestModule.tsx` | Média | 3.1, 4.1, 4.2 |
| 4.4 | `GaitSpeedModule.tsx` | Média | 3.2, 4.1, 4.2 |
| 4.5 | `ChairStandModule.tsx` | Média | 3.3, 4.1, 4.2 |
| 4.6 | `TUGModule.tsx` + `TUGClassificationBadge.tsx` | Média | 3.4, 4.1, 4.2 |
| 4.7 | `NewSessionForm.tsx` (container com 4 módulos) | Alta | 4.3, 4.4, 4.5, 4.6, 1.5 |
| 4.8 | `SPPBScoreSummary.tsx` (resumo final) | Baixa | 3.5, 4.7 |

*4.1 e 4.2 devem ser feitos primeiro. 4.3–4.6 podem ser feitos em paralelo. 4.7 depende de todos.*

### Fase 5 — Dashboard de evolução
> Objetivo: visualização longitudinal do progresso do paciente

| # | Item | Complexidade | Dependências |
|---|---|---|---|
| 5.1 | Gráfico SPPB Total (linha) | Baixa | Fase 4 com dados |
| 5.2 | Gráfico componentes SPPB (multi-linha) | Baixa | 5.1 |
| 5.3 | Gráfico TUG com faixas de cor | Média | 3.4 |
| 5.4 | Gráfico Marcha + Oscilações (dual Y-axis) | Média | Fase 6 parcial |
| 5.5 | Gráfico Cadeira: Tempo + Inclinação (dual Y-axis) | Média | Fase 6 parcial |
| 5.6 | `EvolutionDashboard.tsx` (container com todos) | Alta | 5.1–5.5 |

*5.4 e 5.5 dependem de dados do sensor (Fase 6), mas podem ser construídos com dados mock.*

### Fase 6 — Firmware ESP32 v2 e integração IoT
> Objetivo: dados do sensor chegando via SSE durante os testes
> Pode ser desenvolvida em paralelo com Fase 4 — dispositivo é opcional para a dashboard

| # | Item | Complexidade | Dependências |
|---|---|---|---|
| 6.1 | Implementar conexão SSE no ESP32 (`GET /iot/listen`) + reconexão automática | Alta | 1.8 |
| 6.2 | Implementar LED de 3 estados | Baixa | 6.1 |
| 6.3 | Coleta de dados brutos MPU6050 por `duration_max` segundos | Média | 6.1 |
| 6.4 | Filtro complementar (ângulo de inclinação) + magnitude de oscilação | Alta | 6.3 |
| 6.5 | `POST /iot/reading` ao final da coleta (normal ou cancelada) | Média | 6.3 |
| 6.6 | Testar integração ponta-a-ponta (SSE → coleta → reading) | Média | 6.1–6.5 |

---

## ⚠️ Alertas e Decisões Pendentes

### Decisões resolvidas

1. **Migração de dados**: ✅ Resolvido — sem dados reais em produção; migration aplicada diretamente. `kv_store_ba5f214e` deletada.

2. **Salvamento parcial da sessão**: ✅ Resolvido — `PUT /sessions/:id` chamado a cada módulo concluído (salvamento incremental por módulo).

3. **Associação do dispositivo à sessão**: ✅ Resolvido via SSE — dashboard envia `session_id` + `test_type` ao ESP32 via `POST /iot/command`; SSE entrega o comando instantaneamente. Dispositivo é sempre opcional.

4. **Autenticação IoT**: ✅ Resolvido — `POST /iot/reading` é endpoint público (sem JWT). O `session_id` no body vincula os dados à sessão correta. `GET /iot/listen` também é público (ESP32 não tem JWT).

5. **Troca de paciente**: ✅ Resolvido — ESP32 não conhece "paciente", só `session_id`. A troca de paciente na dashboard simplesmente muda o `session_id` nos próximos comandos.

6. **`device_id` do ESP32**: ✅ Resolvido — há um único dispositivo na clínica. `device_id` é hardcoded no firmware como `"eldersync-clinic-01"`. O `session_id` no comando SSE já associa os dados ao paciente correto.

### Decisões pendentes

Nenhuma decisão arquitetural pendente.

---

## Estimativa de Esforço por Fase

| Fase | Complexidade Global | Pode paralelizar | Risco principal |
|---|---|---|---|
| Fase 1 — Banco + API | Média | ✅ Concluída | — |
| Fase 2 — Estrutura frontend | Baixa | 2.2–2.6 em paralelo após 2.1 | Baixo |
| Fase 3 — Scoring | Baixa | Todos em paralelo | Erro nas tabelas de pontuação (confirmar valores com protocolo SPPB) |
| Fase 4 — Formulários | Alta | 4.2–4.5 em paralelo | Maior fase; lógica de bloqueio progressivo e UX do cronômetro são pontos críticos |
| Fase 5 — Evolução | Média | 5.1–5.5 em paralelo | Depende de dados reais (Fase 4) para validar visual |
| Fase 6 — Firmware | Alta | Parcialmente | Filtro complementar para ângulo de inclinação é o maior risco técnico de hardware |

**Caminho crítico**: ~~Fase 1~~ ✅ → Fase 3 → Fase 4 → Fase 5

**Pode ser feito em paralelo com Fase 4**: Fase 2 (não depende da lógica de scoring) e Fase 6 (firmware e backend IoT são independentes da UI — dispositivo é opcional).
