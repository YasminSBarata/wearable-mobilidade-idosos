/**
 * Middlewares compartilhados para Edge Functions
 */

import type { Context, Next } from "npm:hono@4.4.0";
import { getSupabaseServiceClient } from "./supabase.ts";
import { createLogger } from "./logger.ts";

const logger = createLogger("Auth Middleware");

/**
 * Middleware de autenticação
 * Valida o token JWT e adiciona userId e userEmail ao contexto
 */
export const requireAuth = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");
  const accessToken = authHeader?.split(" ")[1];

  logger.log("Verificando autenticação", {
    tokenPresente: !!accessToken,
    tokenLength: accessToken?.length || 0,
    SUPABASE_URL: !!Deno.env.get("SUPABASE_URL"),
    SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  });

  if (!accessToken) {
    logger.error("Token não fornecido na requisição");
    return c.json({ error: "Token não fornecido" }, 401);
  }

  // Verificar variáveis de ambiente
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    logger.error("Variáveis de ambiente faltando", {
      SUPABASE_URL: !!supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey,
    });
    return c.json({ error: "Configuração do servidor incompleta" }, 500);
  }

  try {
    // Usar Service Client para validar o token do usuário
    const supabase = getSupabaseServiceClient();

    // Passar o token diretamente para getUser() para validação correta
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error) {
      logger.error("Erro ao validar token", {
        message: error.message,
        status: error.status,
      });
      return c.json(
        { error: "Token inválido ou expirado: " + error.message },
        401,
      );
    }

    if (!user?.id) {
      logger.error("Usuário não encontrado no token");
      return c.json({ error: "Usuário não encontrado" }, 401);
    }

    logger.log("✅ Usuário autenticado com sucesso", {
      userId: user.id,
      email: user.email,
    });

    c.set("userId", user.id);
    c.set("userEmail", user.email);
    await next();
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido";
    logger.error("Erro no middleware de autenticação", errorMessage);
    return c.json(
      { error: "Erro ao validar autenticação: " + errorMessage },
      401,
    );
  }
};
