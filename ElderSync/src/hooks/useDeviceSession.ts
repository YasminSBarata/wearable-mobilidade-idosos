import { useState, useRef, useEffect, useCallback } from "react";
import { getSupabaseClient } from "../utils/supabase/client";
import { apiFetch } from "../utils/api";

/** Tipos de teste aceitos pelo dispositivo IoT. */
export type IoTTestType =
  | "balance_a"
  | "balance_b"
  | "balance_c"
  | "gait_1"
  | "gait_2"
  | "chair_pretest"
  | "chair_main"
  | "tug";

export type DeviceState = "idle" | "waiting_device" | "measuring" | "data_received";

export interface DeviceReading {
  id: string;
  session_id: string;
  test_type: string;
  raw_data: unknown;
  oscillation_metrics: unknown;
  gait_metrics: unknown;
  timestamp: string;
}

export interface UseDeviceSessionReturn {
  deviceState: DeviceState;
  lastReading: DeviceReading | null;
  startCollection: (testType: IoTTestType) => Promise<void>;
  stopCollection: () => Promise<void>;
  resetDevice: () => void;
  deviceError: string | null;
}

const DEVICE_ID = "eldersync-clinic-01";

/**
 * Hook centralizado para comunicação com o dispositivo IoT durante uma sessão.
 * O dispositivo é SEMPRE opcional — nunca bloqueia o fluxo clínico.
 *
 * @param sessionId  ID da sessão ativa (null = hook inativo).
 */
export function useDeviceSession(sessionId: string | null): UseDeviceSessionReturn {
  const [deviceState, setDeviceState] = useState<DeviceState>("idle");
  const [lastReading, setLastReading] = useState<DeviceReading | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const activeCommandId = useRef<string | null>(null);

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
          setLastReading(payload.new as DeviceReading);
          setDeviceState("data_received");
          activeCommandId.current = null;
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const startCollection = useCallback(
    async (testType: IoTTestType) => {
      if (!sessionId) return;
      setDeviceError(null);
      setDeviceState("waiting_device");
      try {
        const data = await apiFetch("/iot/command", {
          method: "POST",
          body: JSON.stringify({
            device_id: DEVICE_ID,
            session_id: sessionId,
            test_type: testType,
          }),
        });
        activeCommandId.current = data.command?.id ?? null;
        setDeviceState("measuring");
      } catch (err) {
        setDeviceError(err instanceof Error ? err.message : "Erro ao enviar comando ao dispositivo");
        setDeviceState("idle");
      }
    },
    [sessionId],
  );

  const stopCollection = useCallback(async () => {
    const commandId = activeCommandId.current;
    if (!commandId) return;
    try {
      await apiFetch(`/iot/command/${commandId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      });
      // Estado atualizado quando leitura parcial chegar via Realtime
    } catch (err) {
      setDeviceError(err instanceof Error ? err.message : "Erro ao cancelar coleta");
    }
  }, []);

  const resetDevice = useCallback(() => {
    setDeviceState("idle");
    setLastReading(null);
    setDeviceError(null);
    activeCommandId.current = null;
  }, []);

  return { deviceState, lastReading, startCollection, stopCollection, resetDevice, deviceError };
}
