/**
 * Edge Function: iot
 * Comunicação com dispositivo ESP32 via SSE — ElderSync v2.0
 *
 * Rotas:
 *   GET  /iot/listen?device_id=abc  — SSE, mantido aberto pelo ESP32
 *   POST /iot/command               — dashboard dispara coleta
 *   PATCH /iot/command/:id          — dashboard encerra coleta (cancelled)
 *   POST /iot/reading               — ESP32 envia dados ao terminar
 */

import { Hono } from "npm:hono@4.4.0";
import { cors } from "npm:hono@4.4.0/cors";
import { logger } from "npm:hono@4.4.0/logger";
import type { Context } from "npm:hono@4.4.0";
import { requireAuth } from "../_shared/middleware.ts";
import { getSupabaseServiceClient } from "../_shared/supabase.ts";
import { createLogger } from "../_shared/logger.ts";
import type { TestType, DeviceReadingInsert } from "../_shared/types.ts";

const log = createLogger("IoT API");

const app = new Hono().basePath("/iot");

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With", "apikey"],
    exposeHeaders: ["Content-Length"],
    maxAge: 86400,
    credentials: true,
  }),
);
app.use("*", logger(console.log));

// Duração máxima por tipo de teste (segundos)
const DURATION_MAX: Record<TestType, number> = {
  calibrate:     5,
  balance_a:     10,
  balance_b:     10,
  balance_c:     10,
  gait_1:        30,
  gait_2:        30,
  chair_pretest: 15,
  chair_main:    60,
  tug:           60,
};

// ============================================================
// GET /iot/listen?device_id=abc
// SSE — mantido aberto pelo ESP32. Sem autenticação JWT (dispositivo IoT).
// ============================================================
app.get("/listen", async (c: Context) => {
  const deviceId = c.req.query("device_id");
  if (!deviceId) {
    return c.json({ error: "Parâmetro 'device_id' é obrigatório" }, 400);
  }

  log.log("ESP32 conectado via SSE", { deviceId });

  const supabase = getSupabaseServiceClient();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Confirma conexão
      controller.enqueue(encoder.encode(": connected\n\n"));

      // Escuta novos comandos pendentes para este device_id
      const channel = supabase
        .channel(`device-${deviceId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "device_commands",
            filter: `device_id=eq.${deviceId}`,
          },
          async (payload: { new: { id: string; test_type: TestType; duration_max: number; session_id: string; status: string } }) => {
            const cmd = payload.new;

            if (cmd.status !== "pending") return;

            // Marca como em execução
            await supabase
              .from("device_commands")
              .update({ status: "executing" })
              .eq("id", cmd.id);

            const event = JSON.stringify({
              id: cmd.id,
              test_type: cmd.test_type,
              duration_max: cmd.duration_max,
              session_id: cmd.session_id,
            });

            log.log("Comando enviado via SSE", { deviceId, cmdId: cmd.id });
            controller.enqueue(encoder.encode(`data: ${event}\n\n`));
          },
        )
        // Escuta cancelamentos
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "device_commands",
            filter: `device_id=eq.${deviceId}`,
          },
          (payload: { new: { id: string; status: string } }) => {
            const cmd = payload.new;
            if (cmd.status !== "cancelled") return;

            const event = JSON.stringify({ id: cmd.id, action: "stop" });
            log.log("Stop enviado via SSE", { deviceId, cmdId: cmd.id });
            controller.enqueue(encoder.encode(`data: ${event}\n\n`));
          },
        )
        .subscribe();

      // Heartbeat a cada 30s para manter conexão viva
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
          supabase.removeChannel(channel);
        }
      }, 30_000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  });
});

// ============================================================
// POST /iot/command
// Chamado pela dashboard ao clicar "Iniciar".
// Body: { device_id, session_id, test_type }
// ============================================================
app.post("/command", requireAuth, async (c: Context) => {
  try {
    const body = await c.req.json() as {
      device_id: string;
      session_id: string;
      test_type: TestType;
    };

    const { device_id, session_id, test_type } = body;

    if (!device_id || !session_id || !test_type) {
      return c.json(
        { error: "Campos 'device_id', 'session_id' e 'test_type' são obrigatórios" },
        400,
      );
    }

    const duration_max = DURATION_MAX[test_type];
    if (!duration_max) {
      return c.json({ error: `test_type inválido: ${test_type}` }, 400);
    }

    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("device_commands")
      .insert({ device_id, session_id, test_type, duration_max, status: "pending" })
      .select()
      .single();

    if (error) {
      log.error("Erro ao criar comando", error.message);
      return c.json({ error: error.message }, 500);
    }

    log.log("✅ Comando criado", { id: data.id, device_id, test_type });
    return c.json({ command: data }, 201);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    log.error("Exceção ao criar comando", msg);
    return c.json({ error: msg }, 500);
  }
});

// ============================================================
// PATCH /iot/command/:id
// Chamado pela dashboard ao clicar "Encerrar".
// Body: { status: "cancelled" | "done" }
// ============================================================
app.patch("/command/:id", requireAuth, async (c: Context) => {
  try {
    const cmdId = c.req.param("id");
    const body = await c.req.json() as { status: string };

    if (body.status !== "cancelled" && body.status !== "done") {
      return c.json({ error: "Status deve ser 'cancelled' ou 'done'" }, 400);
    }

    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("device_commands")
      .update({ status: body.status })
      .eq("id", cmdId)
      .select()
      .single();

    if (error) {
      log.error("Erro ao atualizar comando", error.message);
      return c.json({ error: error.message }, 500);
    }

    if (!data) {
      return c.json({ error: "Comando não encontrado" }, 404);
    }

    log.log("✅ Comando atualizado", { id: cmdId, status: body.status });
    return c.json({ command: data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    log.error("Exceção ao atualizar comando", msg);
    return c.json({ error: msg }, 500);
  }
});

// ============================================================
// POST /iot/reading
// Chamado pelo ESP32 ao terminar a coleta.
// Sem autenticação JWT (dispositivo IoT).
// Body: { session_id, test_type, command_id?, raw_data?, oscillation_metrics?, gait_metrics? }
// ============================================================
app.post("/reading", async (c: Context) => {
  try {
    const body = await c.req.json() as DeviceReadingInsert & { command_id?: string };

    if (!body.session_id || !body.test_type) {
      return c.json(
        { error: "Campos 'session_id' e 'test_type' são obrigatórios" },
        400,
      );
    }

    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
      .from("device_readings")
      .insert({
        session_id:           body.session_id,
        test_type:            body.test_type,
        raw_data:             body.raw_data             ?? null,
        oscillation_metrics:  body.oscillation_metrics  ?? null,
        gait_metrics:         body.gait_metrics         ?? null,
      })
      .select()
      .single();

    if (error) {
      log.error("Erro ao salvar leitura", error.message);
      return c.json({ error: error.message }, 500);
    }

    // Marca o comando como concluído
    if (body.command_id) {
      await supabase
        .from("device_commands")
        .update({ status: "done" })
        .eq("id", body.command_id);
    }

    log.log("✅ Leitura salva", { id: data.id, testType: body.test_type });
    return c.json({ reading: data }, 201);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    log.error("Exceção ao salvar leitura", msg);
    return c.json({ error: msg }, 500);
  }
});

Deno.serve(app.fetch);
