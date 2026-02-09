export interface PatientData {
  id: string;
  name: string;
  age: number;
  lastUpdate: string;
  metrics: {
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
  };
}
