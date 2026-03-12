/**
 * Edge Function: sessions
 * CRUD de sessões de teste SPPB + TUG — ElderSync v2.0
 * Persistência: tabela relacional `test_sessions` (PostgreSQL)
 */

import { Hono } from "npm:hono@4.4.0";
import { cors } from "npm:hono@4.4.0/cors";
import { logger } from "npm:hono@4.4.0/logger";
import type { Context } from "npm:hono@4.4.0";
import { requireAuth } from "../_shared/middleware.ts";
import { getSupabaseServiceClient } from "../_shared/supabase.ts";
import { createLogger } from "../_shared/logger.ts";
import type { TestSessionInsert, TestSessionUpdate } from "../_shared/types.ts";

const log = createLogger("Sessions API");

const app = new Hono().basePath("/sessions");

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
 * Verifica se o paciente pertence ao usuário autenticado.
 * Necessário porque test_sessions não tem user_id direto.
 */
async function patientBelongsToUser(
  patientId: string,
  userId: string,
): Promise<boolean> {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

/**
 * Verifica se a sessão pertence (indiretamente) ao usuário autenticado.
 */
async function sessionBelongsToUser(
  sessionId: string,
  userId: string,
): Promise<boolean> {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase
    .from("test_sessions")
    .select("id, patients!inner(user_id)")
    .eq("id", sessionId)
    .eq("patients.user_id", userId)
    .maybeSingle();
  return !!data;
}

/**
 * GET /sessions?patient_id=X
 * Lista todas as sessões de um paciente
 */
app.get("/", requireAuth, async (c: Context) => {
  try {
    const userId = c.get("userId");
    const patientId = c.req.query("patient_id");

    if (!patientId) {
      return c.json({ error: "Parâmetro 'patient_id' é obrigatório" }, 400);
    }

    if (!(await patientBelongsToUser(patientId, userId))) {
      return c.json({ error: "Paciente não encontrado" }, 404);
    }

    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("test_sessions")
      .select("*")
      .eq("patient_id", patientId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      log.error("Erro ao listar sessões", error.message);
      return c.json({ error: error.message }, 500);
    }

    log.log("✅ Sessões encontradas", { count: data.length, patientId });
    return c.json({ sessions: data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    log.error("Exceção ao listar sessões", msg);
    return c.json({ error: msg }, 500);
  }
});

/**
 * GET /sessions/:id
 * Busca uma sessão completa pelo ID
 */
app.get("/:id", requireAuth, async (c: Context) => {
  try {
    const userId = c.get("userId");
    const sessionId = c.req.param("id");

    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("test_sessions")
      .select("*, patients!inner(user_id)")
      .eq("id", sessionId)
      .eq("patients.user_id", userId)
      .maybeSingle();

    if (error) {
      log.error("Erro ao buscar sessão", error.message);
      return c.json({ error: error.message }, 500);
    }

    if (!data) {
      return c.json({ error: "Sessão não encontrada" }, 404);
    }

    // Remove o join auxiliar antes de retornar
    const { patients: _p, ...session } = data as typeof data & { patients: unknown };
    return c.json({ session });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    log.error("Exceção ao buscar sessão", msg);
    return c.json({ error: msg }, 500);
  }
});

/**
 * POST /sessions
 * Cria uma nova sessão de teste
 * Body: { patient_id, date?, examiner_initials?, notes? }
 */
app.post("/", requireAuth, async (c: Context) => {
  try {
    const userId = c.get("userId");
    const body = await c.req.json();

    if (!body.patient_id) {
      return c.json({ error: "Campo 'patient_id' é obrigatório" }, 400);
    }

    if (!(await patientBelongsToUser(body.patient_id, userId))) {
      return c.json({ error: "Paciente não encontrado" }, 404);
    }

    const insert: TestSessionInsert = {
      patient_id: body.patient_id,
      date: body.date ?? new Date().toISOString().split("T")[0],
      examiner_initials: body.examiner_initials ?? null,
      notes: body.notes ?? null,
    };

    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("test_sessions")
      .insert(insert)
      .select()
      .single();

    if (error) {
      log.error("Erro ao criar sessão", error.message);
      return c.json({ error: error.message }, 500);
    }

    log.log("✅ Sessão criada", { id: data.id, patientId: body.patient_id });
    return c.json({ session: data }, 201);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    log.error("Exceção ao criar sessão", msg);
    return c.json({ error: msg }, 500);
  }
});

/**
 * PUT /sessions/:id
 * Atualiza (parcialmente) uma sessão — chamado módulo a módulo durante o teste
 * Body: qualquer subconjunto dos campos de test_sessions
 */
app.put("/:id", requireAuth, async (c: Context) => {
  try {
    const userId = c.get("userId");
    const sessionId = c.req.param("id");
    const body = await c.req.json();

    if (!(await sessionBelongsToUser(sessionId, userId))) {
      return c.json({ error: "Sessão não encontrada" }, 404);
    }

    // Campos protegidos que não podem ser sobrescritos via PUT
    const { id: _id, patient_id: _pid, created_at: _ca, ...safeUpdate } = body as TestSessionUpdate & {
      id?: string;
      patient_id?: string;
      created_at?: string;
    };

    if (Object.keys(safeUpdate).length === 0) {
      return c.json({ error: "Nenhum campo para atualizar" }, 400);
    }

    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("test_sessions")
      .update(safeUpdate)
      .eq("id", sessionId)
      .select()
      .single();

    if (error) {
      log.error("Erro ao atualizar sessão", error.message);
      return c.json({ error: error.message }, 500);
    }

    log.log("✅ Sessão atualizada", { id: sessionId });
    return c.json({ session: data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    log.error("Exceção ao atualizar sessão", msg);
    return c.json({ error: msg }, 500);
  }
});

/**
 * DELETE /sessions/:id
 * Remove uma sessão (cascata apaga device_readings)
 */
app.delete("/:id", requireAuth, async (c: Context) => {
  try {
    const userId = c.get("userId");
    const sessionId = c.req.param("id");

    if (!(await sessionBelongsToUser(sessionId, userId))) {
      return c.json({ error: "Sessão não encontrada" }, 404);
    }

    const supabase = getSupabaseServiceClient();
    const { error } = await supabase
      .from("test_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      log.error("Erro ao remover sessão", error.message);
      return c.json({ error: error.message }, 500);
    }

    log.log("✅ Sessão removida", { id: sessionId });
    return c.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    log.error("Exceção ao remover sessão", msg);
    return c.json({ error: msg }, 500);
  }
});

Deno.serve(app.fetch);
