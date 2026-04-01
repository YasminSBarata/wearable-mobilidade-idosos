import { Wifi, WifiOff, Loader2, CheckCircle2, Radio } from "lucide-react";
import type { DeviceState } from "../hooks/useDeviceSession";

interface DeviceStatusBadgeProps {
  deviceState: DeviceState;
  isCalibrated: boolean;
  deviceError: string | null;
  /** Se não há device_id configurado, o badge fica oculto. */
  hasDevice: boolean;
}

const STATE_CONFIG: Record<
  DeviceState,
  { label: string; color: string; icon: typeof Wifi; pulse?: boolean }
> = {
  idle:           { label: "Sensor conectado",  color: "bg-gray-100 text-gray-600",     icon: Wifi },
  calibrating:    { label: "Calibrando...",      color: "bg-amber-100 text-amber-700",   icon: Loader2, pulse: true },
  calibrated:     { label: "Calibrado",          color: "bg-green-100 text-green-700",   icon: CheckCircle2 },
  waiting_device: { label: "Enviando comando...",color: "bg-amber-100 text-amber-700",   icon: Loader2, pulse: true },
  measuring:      { label: "Medindo...",         color: "bg-green-100 text-green-700",   icon: Radio, pulse: true },
  data_received:  { label: "Dados recebidos",    color: "bg-green-100 text-green-700",   icon: CheckCircle2 },
};

export function DeviceStatusBadge({ deviceState, isCalibrated, deviceError, hasDevice }: DeviceStatusBadgeProps) {
  if (!hasDevice) return null;

  if (deviceError) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <WifiOff className="w-3.5 h-3.5" />
        Erro sensor
      </span>
    );
  }

  const config = STATE_CONFIG[deviceState];
  // Se está idle mas já calibrou, mostrar "Calibrado" em vez de "Sensor conectado"
  const displayConfig = deviceState === "idle" && isCalibrated ? STATE_CONFIG.calibrated : config;
  const Icon = displayConfig.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${displayConfig.color}`}>
      <Icon className={`w-3.5 h-3.5 ${displayConfig.pulse ? "animate-pulse" : ""} ${Icon === Loader2 ? "animate-spin" : ""}`} />
      {displayConfig.label}
    </span>
  );
}
