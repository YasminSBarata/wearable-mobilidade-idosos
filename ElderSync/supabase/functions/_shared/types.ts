/**
 * Tipos compartilhados entre as Edge Functions
 */

// Interface para métricas do paciente
export interface PatientMetrics {
  stepCount: number;
  averageCadence: number;
  timeSeated: number;
  timeStanding: number;
  timeWalking: number;
  gaitSpeed: number;
  posturalStability: number;
  fallsDetected: boolean;
  fallsTimestamp?: string;
  inactivityEpisodes: number;
  inactivityAvgDuration: number;
  tugEstimated: number;
  abruptTransitions: number;
  circadianPattern: number[];
}

// Interface para paciente
export interface Patient {
  id: string;
  name?: string;
  metrics?: Partial<PatientMetrics>;
  lastUpdate?: string;
  [key: string]: unknown;
}

// Interface para dispositivo IoT
export interface IoTDevice {
  deviceId: string;
  apiKey: string;
  deviceName: string;
  patientId: string;
  userId: string;
  createdAt: string;
}

// Interface para alerta
export interface Alert {
  type: "fall_detected" | "prolonged_inactivity";
  timestamp: string;
  acknowledged: boolean;
  duration?: number;
  details?: unknown;
}

// Interface para métrica com timestamp
export interface MetricWithTimestamp {
  timestamp: string;
  [key: string]: unknown;
}

// Interface para dados do sensor IoT
export interface SensorData {
  metrics?: {
    stepCount?: number;
    averageCadence?: number;
    timeSeated?: number;
    timeStanding?: number;
    timeWalking?: number;
    gaitSpeed?: number;
    posturalStability?: number;
    fallDetected?: boolean;
    inactivityEpisodes?: number;
    inactivityAvgDuration?: number;
    tugEstimated?: number;
    abruptTransitions?: number;
    hourlyActivity?: number | number[];
  };
  // Dados raw do ESP32 (formato do esp32_code_example)
  accel?: { x: number; y: number; z: number };
  gyro?: { x: number; y: number; z: number };
  temperature?: number;
  raw?: unknown;
  timestamp?: number | string;
}
