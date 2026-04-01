import { Timer } from "lucide-react";

interface DeviceCooldownBannerProps {
  seconds: number;
}

/**
 * Banner de cooldown entre testes do dispositivo.
 * Exibido quando o ESP32 precisa de tempo para sincronizar antes do próximo teste.
 */
export function DeviceCooldownBanner({ seconds }: DeviceCooldownBannerProps) {
  if (seconds <= 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <Timer className="w-5 h-5 text-amber-600 shrink-0" />
      <div>
        <p className="text-sm font-medium text-amber-800">
          Aguarde {seconds}s para o próximo teste
        </p>
        <p className="text-xs text-amber-600 mt-0.5">
          O dispositivo está sincronizando os dados da coleta anterior.
        </p>
      </div>
    </div>
  );
}
