/**
 * Tipos compartilhados entre as Edge Functions — ElderSync v2.0
 * Modelo: sessões de teste SPPB + TUG (sem monitoramento contínuo)
 */

// ============================================================
// PACIENTE
// ============================================================
export interface Patient {
  id: string;
  user_id: string;
  name: string;
  birth_date?: string | null;   // ISO date: "YYYY-MM-DD"
  gender?: string | null;
  clinical_notes?: string | null;
  created_at: string;
}

export type PatientInsert = Omit<Patient, "id" | "created_at">;
export type PatientUpdate = Partial<Omit<Patient, "id" | "user_id" | "created_at">>;

// ============================================================
// SESSÃO DE TESTE
// ============================================================

export interface BalanceSubtestData {
  result?: string | null;                 // 'completed' | 'failed' | 'not_attempted'
  time?: number | null;                   // segundos
  score?: number | null;                  // 0 ou 1
  failure_reason?: string | null;
}

export interface GaitData {
  distance?: number | null;              // 3 ou 4 metros
  attempt1_time?: number | null;
  attempt1_support?: string | null;
  attempt1_completed?: boolean | null;
  attempt1_failure_reason?: string | null;
  attempt2_time?: number | null;
  attempt2_support?: string | null;
  attempt2_completed?: boolean | null;
  attempt2_failure_reason?: string | null;
  best_time?: number | null;
  score?: number | null;                 // 0–4
  oscillation_index_1?: number | null;
  oscillation_index_2?: number | null;
}

export interface ChairStandData {
  pretest_passed?: boolean | null;
  pretest_used_arms?: boolean | null;
  pretest_failure_reason?: string | null;
  pretest_max_inclination?: number | null;
  time?: number | null;                  // segundos para 5 repetições
  completed?: boolean | null;
  failure_reason?: string | null;
  score?: number | null;                 // 0–4
  avg_inclination?: number | null;
  inclination_per_rep?: number[] | null;
}

export interface TUGData {
  time?: number | null;
  assistive_device?: string | null;
  footwear?: string | null;
  physical_help?: boolean | null;
  safety_level?: string | null;
  gait_pattern?: string | null;
  balance_turn?: string | null;
  sit_control?: string | null;
  instability?: boolean | null;
  instability_notes?: string | null;
  pain?: boolean | null;
  pain_notes?: string | null;
  compensatory_strategies?: string | null;
  classification?: string | null;        // '≤10s' | '11–20s' | '>20s' | '>30s'
}

export interface TestSession {
  id: string;
  patient_id: string;
  date: string;                          // ISO date
  examiner_initials?: string | null;
  notes?: string | null;

  // Equilíbrio
  balance_feet_together_result?: string | null;
  balance_feet_together_time?: number | null;
  balance_feet_together_score?: number | null;
  balance_feet_together_failure_reason?: string | null;
  balance_semi_tandem_result?: string | null;
  balance_semi_tandem_time?: number | null;
  balance_semi_tandem_score?: number | null;
  balance_semi_tandem_failure_reason?: string | null;
  balance_tandem_result?: string | null;
  balance_tandem_time?: number | null;
  balance_tandem_score?: number | null;
  balance_tandem_failure_reason?: string | null;
  balance_total?: number | null;

  // Marcha
  gait_distance?: number | null;
  gait_attempt1_time?: number | null;
  gait_attempt1_support?: string | null;
  gait_attempt1_completed?: boolean | null;
  gait_attempt1_failure_reason?: string | null;
  gait_attempt2_time?: number | null;
  gait_attempt2_support?: string | null;
  gait_attempt2_completed?: boolean | null;
  gait_attempt2_failure_reason?: string | null;
  gait_best_time?: number | null;
  gait_score?: number | null;
  gait_oscillation_index_1?: number | null;
  gait_oscillation_index_2?: number | null;

  // Cadeira
  chair_pretest_passed?: boolean | null;
  chair_pretest_used_arms?: boolean | null;
  chair_pretest_failure_reason?: string | null;
  chair_pretest_max_inclination?: number | null;
  chair_time?: number | null;
  chair_completed?: boolean | null;
  chair_failure_reason?: string | null;
  chair_score?: number | null;
  chair_avg_inclination?: number | null;
  chair_inclination_per_rep?: number[] | null;

  // TUG
  tug_time?: number | null;
  tug_assistive_device?: string | null;
  tug_footwear?: string | null;
  tug_physical_help?: boolean | null;
  tug_safety_level?: string | null;
  tug_gait_pattern?: string | null;
  tug_balance_turn?: string | null;
  tug_sit_control?: string | null;
  tug_instability?: boolean | null;
  tug_instability_notes?: string | null;
  tug_pain?: boolean | null;
  tug_pain_notes?: string | null;
  tug_compensatory_strategies?: string | null;
  tug_classification?: string | null;

  sppb_total?: number | null;
  created_at: string;
}

export type TestSessionInsert = Omit<TestSession, "id" | "created_at">;
export type TestSessionUpdate = Partial<Omit<TestSession, "id" | "patient_id" | "created_at">>;

// ============================================================
// LEITURAS DO DISPOSITIVO (ESP32)
// ============================================================

export type TestType =
  | "calibrate"
  | "balance_a"
  | "balance_b"
  | "balance_c"
  | "gait_1"
  | "gait_2"
  | "chair_pretest"
  | "chair_main"
  | "tug";

export interface RawSensorFrame {
  accel: { x: number; y: number; z: number };
  gyro:  { x: number; y: number; z: number };
  ts_ms: number;
}

export interface OscillationMetrics {
  amplitude_ap: number;   // amplitude antero-posterior (cm ou graus)
  amplitude_ml: number;   // amplitude médio-lateral
  rms_ap: number;
  rms_ml: number;
  duration_s: number;
}

export interface GaitMetrics {
  oscillation_index: number;
  avg_accel_magnitude: number;
  duration_s: number;
}

export interface DeviceReading {
  id: string;
  session_id: string;
  test_type: TestType;
  raw_data?: RawSensorFrame[] | null;
  oscillation_metrics?: OscillationMetrics | null;
  gait_metrics?: GaitMetrics | null;
  timestamp: string;
}

export type DeviceReadingInsert = Omit<DeviceReading, "id" | "timestamp">;

// ============================================================
// DISPOSITIVO IoT
// ============================================================
export interface IoTDevice {
  device_id: string;
  device_name: string;
  user_id: string;
  created_at: string;
}
