/**
 * Edge Function: auth
 * Rotas de autenticação (signup)
 *
 * Endpoint: /auth/*
 */

import { Hono } from "npm:hono@4.4.0";
import { cors } from "npm:hono@4.4.0/cors";
import { logger } from "npm:hono@4.4.0/logger";
import type { Context } from "npm:hono@4.4.0";
import { getSupabaseServiceClient } from "../_shared/supabase.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("Auth API");

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
 * POST /auth/signup
 * Cria uma nova conta de usuário e retorna os tokens de acesso
 */
app.post("/auth/signup", async (c: Context) => {
  try {
    const { email, password, name } = await c.req.json();

    log.log("Recebendo requisição de signup", { email });

    if (!email || !password || !name) {
      log.error("Campos obrigatórios faltando", {
        email: !!email,
        password: !!password,
        name: !!name,
      });
      return c.json({ error: "Campos obrigatórios faltando" }, 400);
    }

    const supabase = getSupabaseServiceClient();

    // Criar usuário no Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true,
    });

    if (error) {
      log.error("Erro ao criar usuário no signup", error);
      return c.json({ error: error.message }, 400);
    }

    log.log("✅ Usuário criado com sucesso", { userId: data.user.id });

    // Fazer login automaticamente para obter o token
    const { data: sessionData, error: sessionError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (sessionError) {
      log.error("Erro ao fazer login após signup", sessionError);
      return c.json({ error: sessionError.message }, 400);
    }

    log.log("✅ Login automático bem-sucedido após signup");

    return c.json({
      user: data.user,
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido";
    log.error("Erro geral no signup", errorMessage);
    return c.json({ error: "Erro ao criar conta: " + errorMessage }, 500);
  }
});

// Handler para Deno Serve
Deno.serve(app.fetch);
