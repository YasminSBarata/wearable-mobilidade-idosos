/**
 * Edge Function: patients
 * CRUD de pacientes — ElderSync v2.0
 * Persistência: tabela relacional `patients` (PostgreSQL)
 */

import { Hono } from "npm:hono@4.4.0";
import { cors } from "npm:hono@4.4.0/cors";
import { logger } from "npm:hono@4.4.0/logger";
import type { Context } from "npm:hono@4.4.0";
import { requireAuth } from "../_shared/middleware.ts";
import { getSupabaseServiceClient } from "../_shared/supabase.ts";
import { createLogger } from "../_shared/logger.ts";
import type { PatientInsert, PatientUpdate } from "../_shared/types.ts";

const log = createLogger("Patients API");

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With", "apikey"],
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
    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      log.error("Erro ao buscar pacientes", error.message);
      return c.json({ error: error.message }, 500);
    }

    log.log("✅ Pacientes encontrados", { count: data.length });
    return c.json({ patients: data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    log.error("Exceção ao buscar pacientes", msg);
    return c.json({ error: msg }, 500);
  }
});

/**
 * GET /patients/:patientId
 * Busca um paciente pelo ID
 */
app.get("/patients/:patientId", requireAuth, async (c: Context) => {
  try {
    const userId = c.get("userId");
    const patientId = c.req.param("patientId");
    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      log.error("Erro ao buscar paciente", error.message);
      return c.json({ error: error.message }, 500);
    }

    if (!data) {
      return c.json({ error: "Paciente não encontrado" }, 404);
    }

    return c.json({ patient: data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    log.error("Exceção ao buscar paciente", msg);
    return c.json({ error: msg }, 500);
  }
});

/**
 * POST /patients
 * Cria um novo paciente
 * Body: { name, birth_date?, gender?, clinical_notes? }
 */
app.post("/patients", requireAuth, async (c: Context) => {
  try {
    const userId = c.get("userId");
    const body = await c.req.json();

    if (!body.name?.trim()) {
      return c.json({ error: "Campo 'name' é obrigatório" }, 400);
    }

    const insert: PatientInsert = {
      user_id: userId,
      name: body.name.trim(),
      birth_date: body.birth_date ?? null,
      gender: body.gender ?? null,
      clinical_notes: body.clinical_notes ?? null,
    };

    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("patients")
      .insert(insert)
      .select()
      .single();

    if (error) {
      log.error("Erro ao criar paciente", error.message);
      return c.json({ error: error.message }, 500);
    }

    log.log("✅ Paciente criado", { id: data.id });
    return c.json({ patient: data }, 201);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    log.error("Exceção ao criar paciente", msg);
    return c.json({ error: msg }, 500);
  }
});

/**
 * PUT /patients/:patientId
 * Atualiza dados de um paciente
 * Body: { name?, birth_date?, gender?, clinical_notes? }
 */
app.put("/patients/:patientId", requireAuth, async (c: Context) => {
  try {
    const userId = c.get("userId");
    const patientId = c.req.param("patientId");
    const body = await c.req.json();

    const update: PatientUpdate = {};
    if (body.name !== undefined) update.name = body.name.trim();
    if (body.birth_date !== undefined) update.birth_date = body.birth_date;
    if (body.gender !== undefined) update.gender = body.gender;
    if (body.clinical_notes !== undefined) update.clinical_notes = body.clinical_notes;

    if (Object.keys(update).length === 0) {
      return c.json({ error: "Nenhum campo para atualizar" }, 400);
    }

    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("patients")
      .update(update)
      .eq("id", patientId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      // PGRST116 = zero rows returned → not found or wrong owner
      if (error.code === "PGRST116") {
        return c.json({ error: "Paciente não encontrado" }, 404);
      }
      log.error("Erro ao atualizar paciente", error.message);
      return c.json({ error: error.message }, 500);
    }

    log.log("✅ Paciente atualizado", { id: data.id });
    return c.json({ patient: data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    log.error("Exceção ao atualizar paciente", msg);
    return c.json({ error: msg }, 500);
  }
});

/**
 * DELETE /patients/:patientId
 * Remove um paciente (cascata apaga sessões e leituras)
 */
app.delete("/patients/:patientId", requireAuth, async (c: Context) => {
  try {
    const userId = c.get("userId");
    const patientId = c.req.param("patientId");
    const supabase = getSupabaseServiceClient();

    const { error, count } = await supabase
      .from("patients")
      .delete({ count: "exact" })
      .eq("id", patientId)
      .eq("user_id", userId);

    if (error) {
      log.error("Erro ao remover paciente", error.message);
      return c.json({ error: error.message }, 500);
    }

    if (count === 0) {
      return c.json({ error: "Paciente não encontrado" }, 404);
    }

    log.log("✅ Paciente removido", { id: patientId });
    return c.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    log.error("Exceção ao remover paciente", msg);
    return c.json({ error: msg }, 500);
  }
});

Deno.serve(app.fetch);
