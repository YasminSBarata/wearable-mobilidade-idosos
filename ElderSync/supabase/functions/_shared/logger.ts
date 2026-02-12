/**
 * Logger utilitário para Edge Functions
 * Fornece funções de log padronizadas com prefixo
 */

export const createLogger = (prefix: string) => {
  return {
    log: (message: string, data?: unknown) => {
      console.log(`[${prefix}] ${message}`, data ?? "");
    },
    error: (message: string, error?: unknown) => {
      console.error(`[${prefix}] ❌ ${message}`, error ?? "");
    },
    warn: (message: string, data?: unknown) => {
      console.warn(`[${prefix}] ⚠️ ${message}`, data ?? "");
    },
    info: (message: string, data?: unknown) => {
      console.info(`[${prefix}] ℹ️ ${message}`, data ?? "");
    },
  };
};

// Logger padrão para API
export const apiLogger = createLogger("API");
