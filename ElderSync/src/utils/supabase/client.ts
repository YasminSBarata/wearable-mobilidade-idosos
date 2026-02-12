import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseClient: SupabaseClient | null = null;

// Logger para debug
const log = (message: string, data?: unknown) => {
  console.log(`[Supabase Client] ${message}`, data ?? "");
};

const logError = (message: string, error?: unknown) => {
  console.error(`[Supabase Client] ❌ ${message}`, error ?? "");
};

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    log("Inicializando cliente Supabase...");

    if (!supabaseUrl) {
      logError("VITE_SUPABASE_URL não definida");
      throw new Error("Variável de ambiente VITE_SUPABASE_URL não encontrada");
    }

    if (!supabaseAnonKey) {
      logError("VITE_SUPABASE_ANON_KEY não definida");
      throw new Error(
        "Variável de ambiente VITE_SUPABASE_ANON_KEY não encontrada",
      );
    }

    log("Variáveis de ambiente OK", {
      url: supabaseUrl.substring(0, 30) + "...",
      keyLength: supabaseAnonKey.length,
    });

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage:
          typeof window !== "undefined" ? window.localStorage : undefined,
      },
    });

    log("✅ Cliente Supabase inicializado com sucesso");
  }

  return supabaseClient;
}

// Função auxiliar para verificar o estado da sessão
export async function checkSession() {
  try {
    const client = getSupabaseClient();
    const {
      data: { session },
      error,
    } = await client.auth.getSession();

    if (error) {
      logError("Erro ao verificar sessão", error);
      return { session: null, error };
    }

    if (session) {
      log("✅ Sessão ativa", {
        userId: session.user.id,
        email: session.user.email,
        expiresAt: session.expires_at,
      });
    } else {
      log("ℹ️ Nenhuma sessão ativa");
    }

    return { session, error: null };
  } catch (err) {
    logError("Exceção ao verificar sessão", err);
    return { session: null, error: err };
  }
}
