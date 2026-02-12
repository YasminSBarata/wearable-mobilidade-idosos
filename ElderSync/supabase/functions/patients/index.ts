/**
 * Edge Function: patients
 * Rotas de gerenciamento de pacientes (CRUD)
 *
 * Endpoint: /patients/*
 */

import { Hono } from "npm:hono@4.4.0";
import { cors } from "npm:hono@4.4.0/cors";
import { logger } from "npm:hono@4.4.0/logger";
import type { Context } from "npm:hono@4.4.0";
import { requireAuth } from "../_shared/middleware.ts";
import * as kv from "../_shared/kv_store.ts";
import { createLogger } from "../_shared/logger.ts";
import type { Patient, MetricWithTimestamp } from "../_shared/types.ts";

const log = createLogger("Patients API");

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
      "apikey",
    ],
    exposeHeaders: ["Content-Length"],
    maxAge: 86400,
    credentials: true,
  }),
);
app.use("*", logger(console.log));

/**
 * GET /patients
 * Lista todos os pacientes do usuário autenticado
 */
app.get("/patients", requireAuth, async (c: Context) => {
  try {
    const userId = c.get("userId");
    log.log("Buscando pacientes", { userId });

    const patients = await kv.getByPrefix(`user:${userId}:patient:`);
    log.log("✅ Pacientes encontrados", { count: patients?.length || 0 });

    return c.json({ patients: patients || [] });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido";
    log.error("Erro ao buscar pacientes", errorMessage);
    return c.json({ error: "Erro ao buscar pacientes: " + errorMessage }, 500);
  }
});

/**
 * POST /patients
 * Adiciona um novo paciente
 */
app.post("/patients", requireAuth, async (c: Context) => {
  try {
    const userId = c.get("userId");
    const patientData = await c.req.json();

    log.log("Adicionando paciente", { userId, name: patientData.name });

    const patientId = crypto.randomUUID();
    const patient: Patient = {
      id: patientId,
      ...patientData,
    };

    await kv.set(`user:${userId}:patient:${patientId}`, patient);
    log.log("✅ Paciente adicionado com sucesso", { patientId });

    return c.json({ patient });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido";
    log.error("Erro ao adicionar paciente", errorMessage);
    return c.json(
      { error: "Erro ao adicionar paciente: " + errorMessage },
      500,
    );
  }
});

/**
 * DELETE /patients/:patientId
 * Remove um paciente
 */
app.delete("/patients/:patientId", requireAuth, async (c: Context) => {
  try {
    const userId = c.get("userId");
    const patientId = c.req.param("patientId");

    const existingPatient = await kv.get(`user:${userId}:patient:${patientId}`);

    if (!existingPatient) {
      return c.json({ error: "Paciente não encontrado" }, 404);
    }

    await kv.del(`user:${userId}:patient:${patientId}`);

    return c.json({ success: true, message: "Paciente removido com sucesso" });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido";
    log.error("Erro ao remover paciente", errorMessage);
    return c.json({ error: "Erro ao remover paciente: " + errorMessage }, 500);
  }
});

/**
 * PUT /patients/:patientId
 * Atualiza um paciente existente
 */
app.put("/patients/:patientId", requireAuth, async (c: Context) => {
  try {
    const userId = c.get("userId");
    const patientId = c.req.param("patientId");
    const updates = await c.req.json();

    log.log("Atualizando paciente", { userId, patientId });

    const existingPatient = (await kv.get(
      `user:${userId}:patient:${patientId}`,
    )) as Patient | null;

    if (!existingPatient) {
      log.error("Paciente não encontrado", { patientId });
      return c.json({ error: "Paciente não encontrado" }, 404);
    }

    const updatedPatient: Patient = {
      ...existingPatient,
      ...updates,
      lastUpdate: new Date().toLocaleString("pt-BR"),
    };

    await kv.set(`user:${userId}:patient:${patientId}`, updatedPatient);
    log.log("✅ Paciente atualizado com sucesso", { patientId });

    return c.json({ patient: updatedPatient });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido";
    log.error("Erro ao atualizar paciente", errorMessage);
    return c.json(
      { error: "Erro ao atualizar paciente: " + errorMessage },
      500,
    );
  }
});

/**
 * GET /patients/:patientId/metrics
 * Busca métricas históricas de um paciente
 */
app.get("/patients/:patientId/metrics", requireAuth, async (c: Context) => {
  try {
    const userId = c.get("userId");
    const patientId = c.req.param("patientId");

    log.log("Buscando métricas históricas", { userId, patientId });

    const patient = await kv.get(`user:${userId}:patient:${patientId}`);
    if (!patient) {
      log.error("Paciente não encontrado", { patientId });
      return c.json({ error: "Paciente não encontrado" }, 404);
    }

    const metrics = await kv.getByPrefix(`metrics:${patientId}:`);

    const sortedMetrics = ((metrics as MetricWithTimestamp[]) || []).sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    log.log("✅ Métricas históricas encontradas", {
      count: sortedMetrics.length,
    });

    return c.json({
      metrics: sortedMetrics.slice(0, 100),
      total: sortedMetrics.length,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido";
    log.error("Erro ao buscar métricas", errorMessage);
    return c.json({ error: "Erro ao buscar métricas: " + errorMessage }, 500);
  }
});

/**
 * GET /patients/:patientId/alerts
 * Busca alertas de um paciente
 */
app.get("/patients/:patientId/alerts", requireAuth, async (c: Context) => {
  try {
    const userId = c.get("userId");
    const patientId = c.req.param("patientId");

    log.log("Buscando alertas", { userId, patientId });

    const patient = await kv.get(`user:${userId}:patient:${patientId}`);
    if (!patient) {
      log.error("Paciente não encontrado", { patientId });
      return c.json({ error: "Paciente não encontrado" }, 404);
    }

    const alerts = await kv.getByPrefix(`alert:${patientId}:`);

    log.log("✅ Alertas encontrados", { count: alerts?.length || 0 });

    return c.json({ alerts: alerts || [] });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido";
    log.error("Erro ao buscar alertas", errorMessage);
    return c.json({ error: "Erro ao buscar alertas: " + errorMessage }, 500);
  }
});

// Handler para Deno Serve
Deno.serve(app.fetch);
