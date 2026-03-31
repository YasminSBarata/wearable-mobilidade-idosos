import { Radio } from "lucide-react";
import type { DeviceReading } from "../hooks/useDeviceSession";

interface SensorDataDisplayProps {
  reading: DeviceReading | null;
  testType: string;
}

/**
 * Exibe dados do sensor de forma read-only após a coleta.
 * Mostra campos relevantes conforme o tipo de teste.
 */
export function SensorDataDisplay({ reading, testType }: SensorDataDisplayProps) {
  if (!reading) return null;

  const osc = reading.oscillation_metrics;
  const gait = reading.gait_metrics;

  return (
    <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-green-700">
        <Radio className="w-3.5 h-3.5" />
        Dados do sensor
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {/* Oscilação AP/ML — relevante para balance e tug */}
        {osc && isBalanceOrTug(testType) && (
          <>
            <MetricRow label="Amplitude AP" value={osc.amplitude_ap} unit="m/s²" />
            <MetricRow label="Amplitude ML" value={osc.amplitude_ml} unit="m/s²" />
            <MetricRow label="RMS AP" value={osc.rms_ap} unit="m/s²" />
            <MetricRow label="RMS ML" value={osc.rms_ml} unit="m/s²" />
          </>
        )}

        {/* Índice de oscilação — relevante para gait e tug */}
        {gait && isGaitOrTug(testType) && (
          <MetricRow label="Índice de oscilação" value={gait.oscillation_index} unit="m/s²" />
        )}

        {/* Inclinação — relevante para chair */}
        {gait && isChair(testType) && (
          <>
            <MetricRow label="Inclinação máx." value={gait.max_angle} unit="°" />
            {gait.angles_per_rep && gait.angles_per_rep.length > 0 && (
              <div className="col-span-2">
                <span className="text-gray-500">Inclinação por rep: </span>
                <span className="text-gray-900 font-medium">
                  {gait.angles_per_rep.map((a) => `${a.toFixed(1)}°`).join(", ")}
                </span>
              </div>
            )}
          </>
        )}

        {/* Duração real da coleta */}
        {(osc || gait) && (
          <MetricRow label="Duração da coleta" value={osc?.duration_s ?? gait?.duration_s} unit="s" />
        )}
      </div>
    </div>
  );
}

function MetricRow({ label, value, unit }: { label: string; value?: number | null; unit: string }) {
  if (value == null) return null;
  return (
    <div>
      <span className="text-gray-500">{label}: </span>
      <span className="text-gray-900 font-medium">
        {value.toFixed(2)} {unit}
      </span>
    </div>
  );
}

function isBalanceOrTug(t: string) {
  return t.startsWith("balance_") || t === "tug";
}

function isGaitOrTug(t: string) {
  return t.startsWith("gait_") || t === "tug";
}

function isChair(t: string) {
  return t === "chair_pretest" || t === "chair_main";
}
