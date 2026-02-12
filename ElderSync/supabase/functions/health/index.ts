/**
 * Edge Function: health
 * Rota de health check para monitoramento
 *
 * Endpoint: /health
 */

import { Hono } from "npm:hono@4.4.0";
import { cors } from "npm:hono@4.4.0/cors";
import type { Context } from "npm:hono@4.4.0";

const app = new Hono();

// CORS - deve vir antes de todas as rotas
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "apikey"],
    exposeHeaders: ["Content-Length"],
    maxAge: 86400,
  }),
);

/**
 * GET /health
 * Retorna status do serviço
 */
app.get("/health", (c: Context) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    services: {
      auth: "/auth",
      patients: "/patients",
      iot: "/iot",
    },
  });
});

/**
 * GET /health/ping
 * Ping simples para verificar disponibilidade
 */
app.get("/health/ping", (c: Context) => {
  return c.text("pong");
});

// Handler para Deno Serve
Deno.serve(app.fetch);
