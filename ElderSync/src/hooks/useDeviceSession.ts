import { useState, useRef, useEffect, useCallback } from "react";
import { getSupabaseClient } from "../utils/supabase/client";
import { apiFetch } from "../utils/api";
import type { OscillationMetrics, GaitMetrics, RawSensorFrame } from "../lib/types";

/** Tipos de teste aceitos pelo dispositivo IoT. */
export type IoTTestType =
  | "calibrate"
  | "balance_a"
  | "balance_b"
  | "balance_c"
  | "gait_1"
  | "gait_2"
  | "chair_pretest"
  | "chair_main"
  | "tug";

export type DeviceState =
  | "idle"
  | "calibrating"
  | "calibrated"
  | "waiting_device"
  | "measuring"
  | "data_received";

export interface DeviceReading {
  id: string;
  session_id: string;
  test_type: string;
  raw_data: RawSensorFrame[] | null;
  oscillation_metrics: OscillationMetrics | null;
  gait_metrics: GaitMetrics | null;
  timestamp: string;
}

export interface UseDeviceSessionReturn {
  deviceState: DeviceState;
  isCalibrated: boolean;
  lastReading: DeviceReading | null;
  startCollection: (testType: IoTTestType) => Promise<void>;
  stopCollection: () => Promise<void>;
  calibrate: () => Promise<void>;
  resetDevice: () => void;
  deviceError: string | null;
  /** Segundos restantes de cooldown entre testes (0 = pronto). */
  cooldownRemaining: number;
}

/**
 * Hook centralizado para comunicação com o dispositivo IoT durante uma sessão.
 * O dispositivo é SEMPRE opcional — nunca bloqueia o fluxo clínico.
 *
 * @param sessionId  ID da sessão ativa (null = hook inativo).
 * @param deviceId   MAC address do ESP32 (null/vazio = sensor desativado).
 */
export function useDeviceSession(
  sessionId: string | null,
  deviceId: string | null = null,
): UseDeviceSessionReturn {
  const [deviceState, setDeviceState] = useState<DeviceState>("idle");
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [lastReading, setLastReading] = useState<DeviceReading | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const activeCommandId = useRef<string | null>(null);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const COOLDOWN_SECONDS = 15;

  /** Inicia countdown de cooldown entre testes. */
  const startCooldown = useCallback(() => {
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    setCooldownRemaining(COOLDOWN_SECONDS);
    const startedAt = Date.now();
    cooldownTimer.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = COOLDOWN_SECONDS - elapsed;
      if (remaining <= 0) {
        setCooldownRemaining(0);
        if (cooldownTimer.current) clearInterval(cooldownTimer.current);
        cooldownTimer.current = null;
      } else {
        setCooldownRemaining(remaining);
      }
    }, 1000);
  }, []);

  // Cleanup do timer no unmount
  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  // Supabase Realtime — ouve INSERT em device_readings para esta sessão
  useEffect(() => {
    if (!sessionId) return;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`device_readings_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "device_readings",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const reading = payload.new as DeviceReading;

          if (reading.test_type === "calibrate") {
            // Calibração confirmada pelo ESP32
            setIsCalibrated(true);
            setDeviceState("calibrated");
          } else {
            // Medição normal — inicia cooldown para o próximo teste
            setLastReading(reading);
            setDeviceState("data_received");
            startCooldown();
          }

          activeCommandId.current = null;
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  /** Envia comando ao dispositivo via POST /iot/command. */
  const sendCommand = useCallback(
    async (testType: IoTTestType): Promise<string | null> => {
      if (!sessionId || !deviceId) return null;
      const data = await apiFetch("/iot/command", {
        method: "POST",
        body: JSON.stringify({
          device_id: deviceId,
          session_id: sessionId,
          test_type: testType,
        }),
      });
      return data.command?.id ?? null;
    },
    [sessionId, deviceId],
  );

  /** Inicia calibração (5s no ESP32). */
  const calibrate = useCallback(async () => {
    if (!sessionId || !deviceId) return;
    setDeviceError(null);
    setDeviceState("calibrating");
    try {
      const cmdId = await sendCommand("calibrate");
      activeCommandId.current = cmdId;
      // Estado será atualizado para "calibrated" quando o reading chegar via Realtime
    } catch (err) {
      setDeviceError(
        err instanceof Error ? err.message : "Erro ao calibrar dispositivo",
      );
      setDeviceState("idle");
    }
  }, [sessionId, deviceId, sendCommand]);

  /** Inicia coleta de dados para um tipo de teste. */
  const startCollection = useCallback(
    async (testType: IoTTestType) => {
      if (!sessionId || !deviceId) return;
      setDeviceError(null);
      setLastReading(null);
      setDeviceState("waiting_device");
      try {
        const cmdId = await sendCommand(testType);
        activeCommandId.current = cmdId;
        setDeviceState("measuring");
      } catch (err) {
        setDeviceError(
          err instanceof Error
            ? err.message
            : "Erro ao enviar comando ao dispositivo",
        );
        setDeviceState(isCalibrated ? "calibrated" : "idle");
      }
    },
    [sessionId, deviceId, sendCommand, isCalibrated],
  );

  /** Cancela coleta em andamento. */
  const stopCollection = useCallback(async () => {
    const commandId = activeCommandId.current;
    if (!commandId) return;
    try {
      await apiFetch(`/iot/command/${commandId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      });
      // Estado será atualizado quando leitura parcial chegar via Realtime
    } catch (err) {
      setDeviceError(
        err instanceof Error ? err.message : "Erro ao cancelar coleta",
      );
    }
  }, []);

  /** Reseta estado do dispositivo (entre testes). */
  const resetDevice = useCallback(() => {
    setDeviceState(isCalibrated ? "calibrated" : "idle");
    setLastReading(null);
    setDeviceError(null);
    activeCommandId.current = null;
  }, [isCalibrated]);

  return {
    deviceState,
    isCalibrated,
    lastReading,
    startCollection,
    stopCollection,
    calibrate,
    resetDevice,
    deviceError,
    cooldownRemaining,
  };
}
