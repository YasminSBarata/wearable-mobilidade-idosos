-- ElderSync v2.0 — Schema relacional
-- Substitui o padrão KV store por tabelas relacionais tipadas

-- ============================================================
-- 1. PACIENTES
-- ============================================================
CREATE TABLE patients (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  birth_date  DATE,
  gender      TEXT,
  clinical_notes TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. SESSÕES DE TESTE (SPPB + TUG)
-- ============================================================
CREATE TABLE test_sessions (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id                  UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date                        DATE        NOT NULL DEFAULT CURRENT_DATE,
  examiner_initials           TEXT,
  notes                       TEXT,

  -- Equilíbrio — pés juntos
  balance_feet_together_result         TEXT,
  balance_feet_together_time           NUMERIC(6,2),
  balance_feet_together_score          SMALLINT,
  balance_feet_together_failure_reason TEXT,

  -- Equilíbrio — semi-tandem
  balance_semi_tandem_result           TEXT,
  balance_semi_tandem_time             NUMERIC(6,2),
  balance_semi_tandem_score            SMALLINT,
  balance_semi_tandem_failure_reason   TEXT,

  -- Equilíbrio — tandem
  balance_tandem_result                TEXT,
  balance_tandem_time                  NUMERIC(6,2),
  balance_tandem_score                 SMALLINT,
  balance_tandem_failure_reason        TEXT,

  balance_total                        SMALLINT,

  -- Marcha
  gait_distance                        SMALLINT,      -- 3 ou 4 metros
  gait_attempt1_time                   NUMERIC(6,2),
  gait_attempt1_support                TEXT,
  gait_attempt1_completed              BOOLEAN,
  gait_attempt1_failure_reason         TEXT,
  gait_attempt2_time                   NUMERIC(6,2),
  gait_attempt2_support                TEXT,
  gait_attempt2_completed              BOOLEAN,
  gait_attempt2_failure_reason         TEXT,
  gait_best_time                       NUMERIC(6,2),
  gait_score                           SMALLINT,
  gait_oscillation_index_1             NUMERIC(6,2),
  gait_oscillation_index_2             NUMERIC(6,2),

  -- Levantar-se da cadeira
  chair_pretest_passed                 BOOLEAN,
  chair_pretest_used_arms              BOOLEAN,
  chair_pretest_failure_reason         TEXT,
  chair_pretest_max_inclination        NUMERIC(6,2),
  chair_time                           NUMERIC(6,2),
  chair_completed                      BOOLEAN,
  chair_failure_reason                 TEXT,
  chair_score                          SMALLINT,
  chair_avg_inclination                NUMERIC(6,2),
  chair_inclination_per_rep            NUMERIC(6,2)[],

  -- TUG
  tug_time                             NUMERIC(6,2),
  tug_assistive_device                 TEXT,
  tug_footwear                         TEXT,
  tug_physical_help                    BOOLEAN,
  tug_safety_level                     TEXT,
  tug_gait_pattern                     TEXT,
  tug_balance_turn                     TEXT,
  tug_sit_control                      TEXT,
  tug_instability                      BOOLEAN,
  tug_instability_notes                TEXT,
  tug_pain                             BOOLEAN,
  tug_pain_notes                       TEXT,
  tug_compensatory_strategies          TEXT,
  tug_classification                   TEXT,

  -- Totais
  sppb_total                           SMALLINT,

  created_at                           TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. LEITURAS DO DISPOSITIVO (ESP32)
-- ============================================================
CREATE TABLE device_readings (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID        REFERENCES test_sessions(id) ON DELETE CASCADE,
  test_type           TEXT        NOT NULL,
  -- Valores esperados: 'balance_a', 'balance_b', 'balance_c',
  --                    'gait_1', 'gait_2',
  --                    'chair_pretest', 'chair_main', 'tug'
  raw_data            JSONB,
  oscillation_metrics JSONB,
  gait_metrics        JSONB,
  timestamp           TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE patients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_readings ENABLE ROW LEVEL SECURITY;

-- Fisioterapeuta vê apenas seus próprios pacientes
CREATE POLICY "users_see_own_patients" ON patients
  FOR ALL USING (auth.uid() = user_id);

-- Sessões são acessíveis se o paciente pertence ao usuário
CREATE POLICY "users_see_sessions_of_own_patients" ON test_sessions
  FOR ALL USING (
    patient_id IN (
      SELECT id FROM patients WHERE user_id = auth.uid()
    )
  );

-- Leituras são acessíveis se a sessão pertence ao usuário
CREATE POLICY "users_see_readings_of_own_sessions" ON device_readings
  FOR ALL USING (
    session_id IN (
      SELECT ts.id
      FROM   test_sessions ts
      JOIN   patients p ON ts.patient_id = p.id
      WHERE  p.user_id = auth.uid()
    )
  );
