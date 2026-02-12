/**
 * Clientes Supabase compartilhados
 */

import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import { createLogger } from "./logger.ts";

const logger = createLogger("Supabase Client");

/**
 * Obtém o cliente Supabase com service role (para operações admin)
 */
export const getSupabaseServiceClient = () => {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    logger.error("Variáveis de ambiente faltando para Service Client", {
      SUPABASE_URL: !!url,
      SUPABASE_SERVICE_ROLE_KEY: !!key,
    });
    throw new Error("Configuração do Supabase incompleta");
  }

  return createClient(url, key);
};

/**
 * Obtém o cliente Supabase com token do usuário (para validação de auth)
 */
export const getSupabaseClientWithAuth = (authHeader: string) => {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");

  if (!url || !key) {
    logger.error("Variáveis de ambiente faltando para Auth Client", {
      SUPABASE_URL: !!url,
      SUPABASE_ANON_KEY: !!key,
    });
    throw new Error("Configuração do Supabase incompleta");
  }

  return createClient(url, key, {
    global: {
      headers: { Authorization: authHeader },
    },
  });
};
