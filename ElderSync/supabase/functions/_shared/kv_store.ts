/**
 * Key-Value Store usando Supabase como backend
 * Abstração para armazenar dados em formato chave-valor
 */

import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import { createLogger } from "./logger.ts";

const logger = createLogger("KV Store");

const TABLE_NAME = "kv_store_ba5f214e";

const client = () => {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    logger.error("Variáveis de ambiente não configuradas", {
      SUPABASE_URL: !!url,
      SUPABASE_SERVICE_ROLE_KEY: !!key,
    });
    throw new Error("Configuração do Supabase incompleta");
  }

  return createClient(url, key);
};

/**
 * Salva um valor com a chave especificada
 */
export const set = async (key: string, value: unknown): Promise<void> => {
  try {
    const supabase = client();
    const { error } = await supabase.from(TABLE_NAME).upsert({
      key,
      value,
    });
    if (error) {
      logger.error(`Erro ao salvar chave: ${key}`, error);
      throw new Error(error.message);
    }
    logger.log(`✅ Chave salva: ${key}`);
  } catch (err) {
    logger.error(`Exceção ao salvar chave: ${key}`, err);
    throw err;
  }
};

/**
 * Busca um valor pela chave
 */
export const get = async (key: string): Promise<unknown> => {
  try {
    const supabase = client();
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) {
      logger.error(`Erro ao buscar chave: ${key}`, error);
      throw new Error(error.message);
    }
    logger.log(`Chave buscada: ${key}`, { found: !!data });
    return data?.value;
  } catch (err) {
    logger.error(`Exceção ao buscar chave: ${key}`, err);
    throw err;
  }
};

/**
 * Deleta uma chave
 */
export const del = async (key: string): Promise<void> => {
  try {
    const supabase = client();
    const { error } = await supabase.from(TABLE_NAME).delete().eq("key", key);
    if (error) {
      logger.error(`Erro ao deletar chave: ${key}`, error);
      throw new Error(error.message);
    }
    logger.log(`✅ Chave deletada: ${key}`);
  } catch (err) {
    logger.error(`Exceção ao deletar chave: ${key}`, err);
    throw err;
  }
};

/**
 * Salva múltiplos valores de uma vez
 */
export const mset = async (
  keys: string[],
  values: unknown[],
): Promise<void> => {
  try {
    const supabase = client();
    const { error } = await supabase
      .from(TABLE_NAME)
      .upsert(keys.map((k, i) => ({ key: k, value: values[i] })));
    if (error) {
      logger.error(`Erro ao salvar múltiplas chaves`, error);
      throw new Error(error.message);
    }
    logger.log(`✅ ${keys.length} chaves salvas`);
  } catch (err) {
    logger.error(`Exceção ao salvar múltiplas chaves`, err);
    throw err;
  }
};

/**
 * Busca múltiplos valores de uma vez
 */
export const mget = async (keys: string[]): Promise<unknown[]> => {
  try {
    const supabase = client();
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("value")
      .in("key", keys);
    if (error) {
      logger.error(`Erro ao buscar múltiplas chaves`, error);
      throw new Error(error.message);
    }
    logger.log(`${keys.length} chaves buscadas`);
    return data?.map((d) => d.value) ?? [];
  } catch (err) {
    logger.error(`Exceção ao buscar múltiplas chaves`, err);
    throw err;
  }
};

/**
 * Deleta múltiplas chaves de uma vez
 */
export const mdel = async (keys: string[]): Promise<void> => {
  try {
    const supabase = client();
    const { error } = await supabase.from(TABLE_NAME).delete().in("key", keys);
    if (error) {
      logger.error(`Erro ao deletar múltiplas chaves`, error);
      throw new Error(error.message);
    }
    logger.log(`✅ ${keys.length} chaves deletadas`);
  } catch (err) {
    logger.error(`Exceção ao deletar múltiplas chaves`, err);
    throw err;
  }
};

/**
 * Busca todos os valores que começam com um prefixo
 */
export const getByPrefix = async (prefix: string): Promise<unknown[]> => {
  try {
    const supabase = client();
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("key, value")
      .like("key", prefix + "%");
    if (error) {
      logger.error(`Erro ao buscar por prefixo: ${prefix}`, error);
      throw new Error(error.message);
    }
    logger.log(`Busca por prefixo: ${prefix}`, { count: data?.length || 0 });
    return data?.map((d) => d.value) ?? [];
  } catch (err) {
    logger.error(`Exceção ao buscar por prefixo: ${prefix}`, err);
    throw err;
  }
};
