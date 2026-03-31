/**
 * Tipos compartilhados no frontend — ElderSync v2.0
 */

// ============================================================
// DADOS DO SENSOR (ESP32 + MPU6050)
// ============================================================

/** Métricas de oscilação separadas por eixo (AP = antero-posterior, ML = médio-lateral). */
export interface OscillationMetrics {
  amplitude_ap: number;
  amplitude_ml: number;
  rms_ap: number;
  rms_ml: number;
  duration_s: number;
}

/** Métricas de magnitude escalar + ângulos de inclinação. */
export interface GaitMetrics {
  oscillation_index: number;
  avg_accel_magnitude: number;
  duration_s: number;
  max_angle?: number | null;
  angles_per_rep?: number[] | null;
}

/** Frame bruto do sensor (armazenado em device_readings.raw_data). */
export interface RawSensorFrame {
  ts_ms: number;
  accel: { x: number; y: number; z: number };
  gyro: { x: number; y: number; z: number };
}

// ============================================================
// PACIENTES
// ============================================================

export interface Patient {
  id: string;
  name: string;
  birth_date?: string | null;
  gender?: string | null;
  clinical_notes?: string | null;
  created_at: string;
}

export interface TestSession {
  id: string;
  patient_id: string;
  date: string;
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
  gait_attempt1_completed?: boolean | null;
  gait_attempt1_failure_reason?: string | null;
  gait_attempt2_time?: number | null;
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

  // Totais
  sppb_total?: number | null;
  created_at: string;
}
