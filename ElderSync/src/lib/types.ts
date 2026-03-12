/**
 * Tipos compartilhados no frontend — ElderSync v2.0
 */

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
  balance_total?: number | null;
  gait_score?: number | null;
  chair_score?: number | null;
  sppb_total?: number | null;
  tug_time?: number | null;
  tug_classification?: string | null;
  created_at: string;
}
