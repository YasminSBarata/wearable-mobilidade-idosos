/**
 * Edge Function: iot
 * Rotas para dispositivos IoT (ESP32/ESP8266 com MPU6050)
 *
 * Endpoint: /iot/*
 */

import { Hono } from "npm:hono@4.4.0";
import { cors } from "npm:hono@4.4.0/cors";
import { logger } from "npm:hono@4.4.0/logger";
import type { Context } from "npm:hono@4.4.0";
import { requireAuth } from "../_shared/middleware.ts";
import * as kv from "../_shared/kv_store.ts";
import { createLogger } from "../_shared/logger.ts";
import type {
  PatientMetrics,
  Patient,
  IoTDevice,
  SensorData,
} from "../_shared/types.ts";

const log = createLogger("IoT API");

const app = new Hono();

// CORS - deve vir antes de todas as rotas
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Device-Key",
      "X-Device-Id",
      "apikey",
    ],
    exposeHeaders: ["Content-Length"],
    maxAge: 86400,
    credentials: true,
  }),
);
app.use("*", logger(console.log));

/**
 * POST /iot/metrics
 * Recebe dados do sensor (ESP32)
 * Autenticação via X-Device-Key e X-Device-Id
 */
app.post("/iot/metrics", async (c: Context) => {
  try {
    const apiKey = c.req.header("X-Device-Key");
    const deviceId = c.req.header("X-Device-Id");

    if (!apiKey || !deviceId) {
      log.error("Dispositivo IoT sem credenciais");
      return c.json(
        { error: "Credenciais do dispositivo não fornecidas" },
        401,
      );
    }

    const device = (await kv.get(`device:${deviceId}`)) as IoTDevice | null;
    if (!device || device.apiKey !== apiKey) {
      log.error("Dispositivo IoT não autorizado", { deviceId });
      return c.json({ error: "Dispositivo não autorizado" }, 401);
    }

    const data: SensorData = await c.req.json();
    log.log("📡 Dados recebidos do dispositivo", { deviceId });

    const { metrics, raw, timestamp } = data;

    const patient = (await kv.get(
      `user:${device.userId}:patient:${device.patientId}`,
    )) as Patient | null;

    if (!patient) {
      log.error("Paciente não encontrado para dispositivo", {
        deviceId,
        patientId: device.patientId,
      });
      return c.json({ error: "Paciente não encontrado" }, 404);
    }

    const currentMetrics = patient.metrics || {};
    const now = new Date();
    const currentHour = now.getHours();

    // Atualizar métricas com média ponderada
    const updatedMetrics: PatientMetrics = {
      stepCount: (currentMetrics.stepCount || 0) + (metrics?.stepCount || 0),
      averageCadence:
        metrics?.averageCadence !== undefined
          ? (currentMetrics.averageCadence || metrics.averageCadence) * 0.7 +
            metrics.averageCadence * 0.3
          : currentMetrics.averageCadence || 0,
      timeSeated: (currentMetrics.timeSeated || 0) + (metrics?.timeSeated || 0),
      timeStanding:
        (currentMetrics.timeStanding || 0) + (metrics?.timeStanding || 0),
      timeWalking:
        (currentMetrics.timeWalking || 0) + (metrics?.timeWalking || 0),
      gaitSpeed:
        metrics?.gaitSpeed !== undefined
          ? (currentMetrics.gaitSpeed || metrics.gaitSpeed) * 0.7 +
            metrics.gaitSpeed * 0.3
          : currentMetrics.gaitSpeed || 0,
      posturalStability:
        metrics?.posturalStability !== undefined
          ? (currentMetrics.posturalStability || metrics.posturalStability) *
              0.8 +
            metrics.posturalStability * 0.2
          : currentMetrics.posturalStability || 0,
      fallsDetected:
        currentMetrics.fallsDetected || metrics?.fallDetected || false,
      fallsTimestamp: metrics?.fallDetected
        ? now.toLocaleString("pt-BR")
        : currentMetrics.fallsTimestamp,
      inactivityEpisodes:
        (currentMetrics.inactivityEpisodes || 0) +
        (metrics?.inactivityEpisodes || 0),
      inactivityAvgDuration:
        metrics?.inactivityAvgDuration !== undefined
          ? (currentMetrics.inactivityAvgDuration ||
              metrics.inactivityAvgDuration) *
              0.7 +
            metrics.inactivityAvgDuration * 0.3
          : currentMetrics.inactivityAvgDuration || 0,
      tugEstimated:
        metrics?.tugEstimated !== undefined && metrics.tugEstimated > 0
          ? metrics.tugEstimated
          : currentMetrics.tugEstimated || 0,
      abruptTransitions:
        (currentMetrics.abruptTransitions || 0) +
        (metrics?.abruptTransitions || 0),
      circadianPattern: (() => {
        const pattern = [
          ...(currentMetrics.circadianPattern || Array(24).fill(0)),
        ];
        if (metrics?.hourlyActivity !== undefined) {
          if (
            Array.isArray(metrics.hourlyActivity) &&
            metrics.hourlyActivity.length === 24
          ) {
            return metrics.hourlyActivity;
          }
          pattern[currentHour] =
            (pattern[currentHour] || 0) +
            (typeof metrics.hourlyActivity === "number"
              ? metrics.hourlyActivity
              : 0);
        }
        return pattern;
      })(),
    };

    // Salvar métrica histórica
    const metricId = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    await kv.set(`metrics:${device.patientId}:${metricId}`, {
      deviceId,
      patientId: device.patientId,
      timestamp: now.toISOString(),
      deviceTimestamp: timestamp,
      metrics: metrics || {},
      raw: raw || null,
    });

    // Atualizar paciente com novas métricas
    await kv.set(`user:${device.userId}:patient:${device.patientId}`, {
      ...patient,
      metrics: updatedMetrics,
      lastUpdate: now.toLocaleString("pt-BR"),
    });

    // Criar alertas se necessário
    if (metrics?.fallDetected) {
      const alertId = crypto.randomUUID();
      await kv.set(`alert:${device.patientId}:${alertId}`, {
        type: "fall_detected",
        timestamp: now.toISOString(),
        acknowledged: false,
        details: { raw: raw || null },
      });
      log.warn("ALERTA: Queda detectada", { patientId: device.patientId });
    }

    if (metrics?.inactivityEpisodes && metrics.inactivityEpisodes > 0) {
      const alertId = crypto.randomUUID();
      await kv.set(`alert:${device.patientId}:${alertId}`, {
        type: "prolonged_inactivity",
        timestamp: now.toISOString(),
        duration: metrics.inactivityAvgDuration || 0,
        acknowledged: false,
      });
      log.warn("ALERTA: Inatividade prolongada", {
        patientId: device.patientId,
      });
    }

    return c.json({
      success: true,
      metricId,
      updatedMetrics: {
        stepCount: updatedMetrics.stepCount,
        averageCadence: parseFloat(updatedMetrics.averageCadence.toFixed(1)),
        gaitSpeed: parseFloat(updatedMetrics.gaitSpeed.toFixed(2)),
        posturalStability: parseFloat(
          updatedMetrics.posturalStability.toFixed(0),
        ),
      },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido";
    log.error("Erro ao processar dados IoT", errorMessage);
    return c.json({ error: "Erro ao processar dados: " + errorMessage }, 500);
  }
});

/**
 * POST /iot/reset-daily
 * Reseta métricas diárias do paciente
 * Autenticação via X-Device-Key e X-Device-Id
 */
app.post("/iot/reset-daily", async (c: Context) => {
  try {
    const apiKey = c.req.header("X-Device-Key");
    const deviceId = c.req.header("X-Device-Id");

    if (!apiKey || !deviceId) {
      log.error("Credenciais não fornecidas para reset");
      return c.json({ error: "Credenciais não fornecidas" }, 401);
    }

    const device = (await kv.get(`device:${deviceId}`)) as IoTDevice | null;
    if (!device || device.apiKey !== apiKey) {
      log.error("Dispositivo não autorizado para reset", { deviceId });
      return c.json({ error: "Dispositivo não autorizado" }, 401);
    }

    const patient = (await kv.get(
      `user:${device.userId}:patient:${device.patientId}`,
    )) as Patient | null;

    if (!patient) {
      return c.json({ error: "Paciente não encontrado" }, 404);
    }

    // Resetar métricas diárias, mantendo algumas médias
    const resetMetrics: PatientMetrics = {
      stepCount: 0,
      averageCadence: 0,
      timeSeated: 0,
      timeStanding: 0,
      timeWalking: 0,
      gaitSpeed: patient.metrics?.gaitSpeed || 0,
      posturalStability: patient.metrics?.posturalStability || 0,
      fallsDetected: false,
      fallsTimestamp: undefined,
      inactivityEpisodes: 0,
      inactivityAvgDuration: 0,
      tugEstimated: patient.metrics?.tugEstimated || 0,
      abruptTransitions: 0,
      circadianPattern: Array(24).fill(0),
    };

    await kv.set(`user:${device.userId}:patient:${device.patientId}`, {
      ...patient,
      metrics: resetMetrics,
      lastUpdate: new Date().toLocaleString("pt-BR"),
    });

    log.log("🔄 Métricas diárias resetadas", { patientId: device.patientId });

    return c.json({ success: true, message: "Métricas diárias resetadas" });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido";
    log.error("Erro ao resetar métricas", errorMessage);
    return c.json({ error: errorMessage }, 500);
  }
});

/**
 * POST /iot/devices
 * Registra um novo dispositivo IoT para um paciente
 * Requer autenticação de usuário
 */
app.post("/iot/devices", requireAuth, async (c: Context) => {
  try {
    const userId = c.get("userId");
    const { patientId, deviceName } = await c.req.json();

    log.log("Registrando dispositivo IoT", { userId, patientId });

    if (!patientId) {
      log.error("ID do paciente não fornecido");
      return c.json({ error: "ID do paciente é obrigatório" }, 400);
    }

    const patient = (await kv.get(
      `user:${userId}:patient:${patientId}`,
    )) as Patient | null;
    if (!patient) {
      log.error("Paciente não encontrado para registro de dispositivo", {
        patientId,
      });
      return c.json({ error: "Paciente não encontrado" }, 404);
    }

    const newDeviceId = crypto.randomUUID();
    const apiKey = crypto.randomUUID().replace(/-/g, "");

    const device: IoTDevice = {
      deviceId: newDeviceId,
      apiKey,
      deviceName: deviceName || `Sensor de ${patient.name}`,
      patientId,
      userId,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`device:${newDeviceId}`, device);

    log.log("✅ Dispositivo IoT registrado", {
      deviceId: newDeviceId,
      patientId,
    });

    return c.json({
      device: {
        deviceId: newDeviceId,
        apiKey,
        deviceName: device.deviceName,
        patientId,
      },
      instructions: "Use estes valores no código do ESP32",
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido";
    log.error("Erro ao registrar dispositivo", errorMessage);
    return c.json(
      { error: "Erro ao registrar dispositivo: " + errorMessage },
      500,
    );
  }
});

// Handler para Deno Serve
Deno.serve(app.fetch);
