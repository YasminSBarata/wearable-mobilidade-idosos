import { useState } from "react";
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Stopwatch } from "./Stopwatch";
import { FailureReasonSelect } from "./FailureReasonSelect";
import { SensorDataDisplay } from "./SensorDataDisplay";
import { DeviceCooldownBanner } from "./DeviceCooldownBanner";
import type { BalanceResult } from "../lib/scoring/balance";
import type { UseDeviceSessionReturn, IoTTestType } from "../hooks/useDeviceSession";

export interface BalanceSubtestData {
  result: BalanceResult;
  time: number | null;
  failureReason: string;
}

interface BalanceSubtestProps {
  /** Ex: "A — Pés juntos" */
  title: string;
  /** Instruções para o fisioterapeuta */
  instructions: string;
  /** Tipo de teste IoT para este subteste */
  iotTestType?: IoTTestType;
  /** Bloqueado pela falha no subteste anterior */
  blocked?: boolean;
  /** Impede edição após salvar */
  locked?: boolean;
  onComplete: (data: BalanceSubtestData) => void;
  initialData?: BalanceSubtestData | null;
  /** Device hook (opcional — se ausente, sensor desativado) */
  device?: UseDeviceSessionReturn;
}

/**
 * Componente reutilizável para cada subteste de equilíbrio (A, B ou C).
 * Fluxo: iniciar cronômetro → parar → marcar passou/falhou → confirmar.
 */
export function BalanceSubtest({
  title,
  instructions,
  iotTestType,
  blocked = false,
  locked = false,
  onComplete,
  initialData,
  device,
}: BalanceSubtestProps) {
  const [time, setTime] = useState<number | null>(initialData?.time ?? null);
  const [result, setResult] = useState<BalanceResult>(
    initialData?.result ?? "not_performed",
  );
  const [resultChosen, setResultChosen] = useState(!!initialData);
  const [failureReason, setFailureReason] = useState(
    initialData?.failureReason ?? "",
  );
  const [phase, setPhase] = useState<"ready" | "timed" | "confirmed">(
    initialData ? "confirmed" : "ready",
  );

  if (blocked) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-2">
          <MinusCircle className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-400">{title}</span>
          <span className="ml-auto text-xs text-gray-400">Não realizado</span>
        </div>
      </div>
    );
  }

  const isConfirmed = phase === "confirmed" || locked;
  const canConfirm = phase === "timed" && resultChosen;

  const resultColor =
    result === "passed"
      ? "border-green-200 bg-green-50"
      : result === "failed"
        ? "border-red-100 bg-red-50"
        : "border-gray-200 bg-white";

  const handleConfirm = () => {
    const data: BalanceSubtestData = { result, time, failureReason };
    setPhase("confirmed");
    onComplete(data);
  };

  const handleEdit = () => {
    setPhase("ready");
    setTime(null);
    setResult("not_performed");
    setResultChosen(false);
    setFailureReason("");
    if (device) device.resetDevice();
  };

  return (
    <div className={`rounded-lg border p-4 transition-colors ${resultColor}`}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{instructions}</p>
        </div>
        {isConfirmed && (
          <div className="flex items-center gap-2">
            {result === "passed" ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <span className="text-sm font-medium text-gray-700">
              {time != null ? `${time.toFixed(1)}s` : "—"}
            </span>
            {!locked && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="h-7 px-2 text-xs"
              >
                Editar
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Dados do sensor (se disponíveis) */}
      {isConfirmed && device?.lastReading && iotTestType && device.lastReading.test_type === iotTestType && (
        <SensorDataDisplay reading={device.lastReading} testType={iotTestType} />
      )}

      {!isConfirmed && (
        <div className="space-y-4">
          {/* Cooldown do dispositivo */}
          {device && device.cooldownRemaining > 0 && (
            <DeviceCooldownBanner seconds={device.cooldownRemaining} />
          )}

          {/* Cronômetro */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Tempo</p>
            <Stopwatch
              onStart={() => {
                if (device && iotTestType) device.startCollection(iotTestType);
              }}
              onStop={(t) => {
                setTime(t);
                setPhase("timed");
                if (device) device.stopCollection();
              }}
              disabled={device && device.cooldownRemaining > 0 ? true : undefined}
              initialDisplay={time}
            />
          </div>

          {/* Resultado */}
          {phase === "timed" && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                Resultado
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={result === "passed" ? "default" : "outline"}
                  onClick={() => {
                    setResult("passed");
                    setResultChosen(true);
                    setFailureReason("");
                  }}
                  className={`gap-1.5 ${result === "passed" ? "bg-green-600 hover:bg-green-700" : ""}`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Passou
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={result === "failed" ? "default" : "outline"}
                  onClick={() => { setResult("failed"); setResultChosen(true); }}
                  className={`gap-1.5 ${result === "failed" ? "bg-red-600 hover:bg-red-700" : ""}`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Falhou
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={result === "not_performed" && resultChosen ? "default" : "outline"}
                  onClick={() => { setResult("not_performed"); setResultChosen(true); }}
                  className={`gap-1.5 col-span-2 sm:col-span-1 ${result === "not_performed" && resultChosen ? "bg-gray-600 hover:bg-gray-700" : ""}`}
                >
                  <MinusCircle className="w-3.5 h-3.5" />
                  Não realizado
                </Button>
              </div>

              {result === "failed" && (
                <FailureReasonSelect
                  value={failureReason}
                  onChange={setFailureReason}
                  placeholder="Motivo da falha (opcional)"
                />
              )}
            </div>
          )}

          {/* Botão de "não realizado" sem cronômetro */}
          {phase === "ready" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-gray-500"
              onClick={() => {
                setResult("not_performed");
                setResultChosen(true);
                setPhase("timed");
              }}
            >
              <MinusCircle className="w-3.5 h-3.5 mr-1.5" />
              Marcar como não realizado
            </Button>
          )}

          {canConfirm && (
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              className="bg-[#29D68B] hover:bg-[#22c07a] text-white"
            >
              Confirmar subteste
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
