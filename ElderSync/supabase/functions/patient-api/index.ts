import { Hono } from "npm:hono@4.4.0";
import { cors } from "npm:hono@4.4.0/cors";
import { logger } from "npm:hono@4.4.0/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import type { Context } from "npm:hono@4.4.0";
import * as kv from "./kv_store.ts";

const app = new Hono().basePath("/patient-api");

// Middleware
app.use("*", cors());
app.use("*", logger(console.log));

// Initialize Supabase client with service role (for admin operations)
const getSupabaseServiceClient = () => {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
};

// Initialize Supabase client with user's token (for auth validation)
const getSupabaseClientWithAuth = (authHeader: string) => {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: { Authorization: authHeader },
      },
    },
  );
};

// Rota de signup
app.post("/signup", async (c: Context) => {
  try {
    const { email, password, name } = await c.req.json();

    console.log("Recebendo requisição de signup para:", email);

    if (!email || !password || !name) {
      console.error("Campos obrigatórios faltando:", {
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
      console.error("Erro ao criar usuário no signup:", error);
      return c.json({ error: error.message }, 400);
    }

    console.log("Usuário criado com sucesso:", data.user.id);

    // Fazer login automaticamente para obter o token
    const { data: sessionData, error: sessionError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (sessionError) {
      console.error("Erro ao fazer login após signup:", sessionError);
      return c.json({ error: sessionError.message }, 400);
    }

    console.log("Login automático bem-sucedido após signup");

    return c.json({
      user: data.user,
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
    });
  } catch (error: any) {
    console.error("Erro geral no signup:", error);
    return c.json({ error: "Erro ao criar conta: " + error.message }, 500);
  }
});

// Middleware de autenticação
const requireAuth = async (c: any, next: any) => {
  const authHeader = c.req.header("Authorization");
  const accessToken = authHeader?.split(" ")[1];

  console.log("Middleware de autenticação, token presente?", !!accessToken);
  console.log("SUPABASE_URL presente?", !!Deno.env.get("SUPABASE_URL"));
  console.log("SUPABASE_ANON_KEY presente?", !!Deno.env.get("SUPABASE_ANON_KEY"));

  if (!accessToken) {
    console.error("❌ Token não fornecido na requisição");
    return c.json({ error: "Token não fornecido" }, 401);
  }

  // Verificar variáveis de ambiente
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Variáveis de ambiente faltando:", {
      SUPABASE_URL: !!supabaseUrl,
      SUPABASE_ANON_KEY: !!supabaseAnonKey,
    });
    return c.json({ error: "Configuração do servidor incompleta" }, 500);
  }

  try {
    const supabase = getSupabaseClientWithAuth(`Bearer ${accessToken}`);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("❌ Erro ao validar token:", error.message);
      return c.json(
        { error: "Token inválido ou expirado: " + error.message },
        401,
      );
    }

    if (!user?.id) {
      console.error("❌ Usuário não encontrado no token");
      return c.json({ error: "Usuário não encontrado" }, 401);
    }

    console.log("✅ Usuário autenticado com sucesso:", user.id, user.email);
    c.set("userId", user.id);
    c.set("userEmail", user.email);
    await next();
  } catch (error: any) {
    console.error("❌ Erro no middleware de autenticação:", error);
    return c.json(
      { error: "Erro ao validar autenticação: " + error.message },
      401,
    );
  }
};

// Rota para obter pacientes
app.get("/patients", requireAuth, async (c: Context) => {
  try {
    const userId = c.get("userId");
    console.log("Buscando pacientes para usuário:", userId);

    const patients = await kv.getByPrefix(`user:${userId}:patient:`);
    console.log("Pacientes encontrados:", patients?.length || 0);

    return c.json({ patients: patients || [] });
  } catch (error: any) {
    console.error("Erro ao buscar pacientes:", error);
    return c.json({ error: "Erro ao buscar pacientes: " + error.message }, 500);
  }
});

// Rota para adicionar paciente
app.post("/patients", requireAuth, async (c: Context) => {
  try {
    const userId = c.get("userId");
    const patientData = await c.req.json();

    console.log(
      "Adicionando paciente para usuário:",
      userId,
      "Nome:",
      patientData.name,
    );

    const patientId = crypto.randomUUID();
    const patient = {
      id: patientId,
      ...patientData,
    };

    await kv.set(`user:${userId}:patient:${patientId}`, patient);
    console.log("Paciente adicionado com sucesso:", patientId);

    return c.json({ patient });
  } catch (error: any) {
    console.error("Erro ao adicionar paciente:", error);
    return c.json(
      { error: "Erro ao adicionar paciente: " + error.message },
      500,
    );
  }
});

// Rota para atualizar métricas de um paciente
app.put("/patients/:patientId", requireAuth, async (c: Context) => {
  try {
    const userId = c.get("userId");
    const patientId = c.req.param("patientId");
    const updates = await c.req.json();

    const existingPatient = await kv.get(`user:${userId}:patient:${patientId}`);

    if (!existingPatient) {
      return c.json({ error: "Paciente não encontrado" }, 404);
    }

    const updatedPatient = {
      ...existingPatient,
      ...updates,
      lastUpdate: new Date().toLocaleString("pt-BR"),
    };

    await kv.set(`user:${userId}:patient:${patientId}`, updatedPatient);

    return c.json({ patient: updatedPatient });
  } catch (error: any) {
    console.error("Erro ao atualizar paciente:", error);
    return c.json(
      { error: "Erro ao atualizar paciente: " + error.message },
      500,
    );
  }
});

// Rota de health check
app.get("/health", (c: Context) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============================================
// ROTAS IoT - Para ESP32/ESP8266 com MPU6050
// ============================================

// Interface para métricas do paciente
interface PatientMetrics {
  stepCount: number;
  averageCadence: number;
  timeSeated: number;
  timeStanding: number;
  timeWalking: number;
  gaitSpeed: number;
  posturalStability: number;
  fallsDetected: boolean;
  fallsTimestamp?: string;
  inactivityEpisodes: number;
  inactivityAvgDuration: number;
  tugEstimated: number;
  abruptTransitions: number;
  circadianPattern: number[];
}

// Rota para receber dados do sensor (ESP32)
app.post("/iot/metrics", async (c: Context) => {
  try {
    const apiKey = c.req.header("X-Device-Key");
    const deviceId = c.req.header("X-Device-Id");

    if (!apiKey || !deviceId) {
      console.error("❌ Dispositivo IoT sem credenciais");
      return c.json(
        { error: "Credenciais do dispositivo não fornecidas" },
        401,
      );
    }

    const device = await kv.get(`device:${deviceId}`);
    if (!device || device.apiKey !== apiKey) {
      console.error("❌ Dispositivo IoT não autorizado:", deviceId);
      return c.json({ error: "Dispositivo não autorizado" }, 401);
    }

    const data = await c.req.json();
    console.log("📡 Dados recebidos do dispositivo:", deviceId);

    const { metrics, raw, timestamp } = data;

    const patient = await kv.get(
      `user:${device.userId}:patient:${device.patientId}`,
    );

    if (!patient) {
      return c.json({ error: "Paciente não encontrado" }, 404);
    }

    const currentMetrics = patient.metrics || {};
    const now = new Date();
    const currentHour = now.getHours();

    const updatedMetrics: PatientMetrics = {
      stepCount: (currentMetrics.stepCount || 0) + (metrics?.stepCount || 0),
      averageCadence:
        metrics?.averageCadence !== undefined
          ? (currentMetrics.averageCadence || metrics.averageCadence) * 0.7 +
            metrics.averageCadence * 0.3
          : currentMetrics.averageCadence || 0,
      timeSeated: (currentMetrics.timeSeated || 0) + (metrics?.timeSeated || 0),
      timeStanding:
        (currentMetrics.timeStanding || 0) + (metrics?.timeStanding || 0),
      timeWalking:
        (currentMetrics.timeWalking || 0) + (metrics?.timeWalking || 0),
      gaitSpeed:
        metrics?.gaitSpeed !== undefined
          ? (currentMetrics.gaitSpeed || metrics.gaitSpeed) * 0.7 +
            metrics.gaitSpeed * 0.3
          : currentMetrics.gaitSpeed || 0,
      posturalStability:
        metrics?.posturalStability !== undefined
          ? (currentMetrics.posturalStability || metrics.posturalStability) *
              0.8 +
            metrics.posturalStability * 0.2
          : currentMetrics.posturalStability || 0,
      fallsDetected:
        currentMetrics.fallsDetected || metrics?.fallDetected || false,
      fallsTimestamp: metrics?.fallDetected
        ? now.toLocaleString("pt-BR")
        : currentMetrics.fallsTimestamp,
      inactivityEpisodes:
        (currentMetrics.inactivityEpisodes || 0) +
        (metrics?.inactivityEpisodes || 0),
      inactivityAvgDuration:
        metrics?.inactivityAvgDuration !== undefined
          ? (currentMetrics.inactivityAvgDuration ||
              metrics.inactivityAvgDuration) *
              0.7 +
            metrics.inactivityAvgDuration * 0.3
          : currentMetrics.inactivityAvgDuration || 0,
      tugEstimated:
        metrics?.tugEstimated !== undefined && metrics.tugEstimated > 0
          ? metrics.tugEstimated
          : currentMetrics.tugEstimated || 0,
      abruptTransitions:
        (currentMetrics.abruptTransitions || 0) +
        (metrics?.abruptTransitions || 0),
      circadianPattern: (() => {
        const pattern = [
          ...(currentMetrics.circadianPattern || Array(24).fill(0)),
        ];
        if (metrics?.hourlyActivity !== undefined) {
          if (
            Array.isArray(metrics.hourlyActivity) &&
            metrics.hourlyActivity.length === 24
          ) {
            return metrics.hourlyActivity;
          }
          pattern[currentHour] =
            (pattern[currentHour] || 0) + (metrics.hourlyActivity || 0);
        }
        return pattern;
      })(),
    };

    const metricId = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    await kv.set(`metrics:${device.patientId}:${metricId}`, {
      deviceId,
      patientId: device.patientId,
      timestamp: now.toISOString(),
      deviceTimestamp: timestamp,
      metrics: metrics || {},
      raw: raw || null,
    });

    await kv.set(`user:${device.userId}:patient:${device.patientId}`, {
      ...patient,
      metrics: updatedMetrics,
      lastUpdate: now.toLocaleString("pt-BR"),
    });

    if (metrics?.fallDetected) {
      const alertId = crypto.randomUUID();
      await kv.set(`alert:${device.patientId}:${alertId}`, {
        type: "fall_detected",
        timestamp: now.toISOString(),
        acknowledged: false,
        details: { raw: raw || null },
      });
      console.log(
        "⚠️ ALERTA: Queda detectada para paciente:",
        device.patientId,
      );
    }

    if (metrics?.inactivityEpisodes && metrics.inactivityEpisodes > 0) {
      const alertId = crypto.randomUUID();
      await kv.set(`alert:${device.patientId}:${alertId}`, {
        type: "prolonged_inactivity",
        timestamp: now.toISOString(),
        duration: metrics.inactivityAvgDuration || 0,
        acknowledged: false,
      });
      console.log(
        "⚠️ ALERTA: Inatividade prolongada para paciente:",
        device.patientId,
      );
    }

    return c.json({
      success: true,
      metricId,
      updatedMetrics: {
        stepCount: updatedMetrics.stepCount,
        averageCadence: parseFloat(updatedMetrics.averageCadence.toFixed(1)),
        gaitSpeed: parseFloat(updatedMetrics.gaitSpeed.toFixed(2)),
        posturalStability: parseFloat(
          updatedMetrics.posturalStability.toFixed(0),
        ),
      },
    });
  } catch (error: any) {
    console.error("❌ Erro ao processar dados IoT:", error);
    return c.json({ error: "Erro ao processar dados: " + error.message }, 500);
  }
});

// Rota para resetar métricas diárias
app.post("/iot/reset-daily", async (c: Context) => {
  try {
    const apiKey = c.req.header("X-Device-Key");
    const deviceId = c.req.header("X-Device-Id");

    if (!apiKey || !deviceId) {
      return c.json({ error: "Credenciais não fornecidas" }, 401);
    }

    const device = await kv.get(`device:${deviceId}`);
    if (!device || device.apiKey !== apiKey) {
      return c.json({ error: "Dispositivo não autorizado" }, 401);
    }

    const patient = await kv.get(
      `user:${device.userId}:patient:${device.patientId}`,
    );

    if (!patient) {
      return c.json({ error: "Paciente não encontrado" }, 404);
    }

    const resetMetrics = {
      stepCount: 0,
      averageCadence: 0,
      timeSeated: 0,
      timeStanding: 0,
      timeWalking: 0,
      gaitSpeed: patient.metrics?.gaitSpeed || 0,
      posturalStability: patient.metrics?.posturalStability || 0,
      fallsDetected: false,
      fallsTimestamp: undefined,
      inactivityEpisodes: 0,
      inactivityAvgDuration: 0,
      tugEstimated: patient.metrics?.tugEstimated || 0,
      abruptTransitions: 0,
      circadianPattern: Array(24).fill(0),
    };

    await kv.set(`user:${device.userId}:patient:${device.patientId}`, {
      ...patient,
      metrics: resetMetrics,
      lastUpdate: new Date().toLocaleString("pt-BR"),
    });

    console.log(
      "🔄 Métricas diárias resetadas para paciente:",
      device.patientId,
    );

    return c.json({ success: true, message: "Métricas diárias resetadas" });
  } catch (error: any) {
    console.error("❌ Erro ao resetar métricas:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Rota para registrar um dispositivo IoT
app.post("/iot/devices", requireAuth, async (c: Context) => {
  try {
    const userId = c.get("userId");
    const { patientId, deviceName } = await c.req.json();

    if (!patientId) {
      return c.json({ error: "ID do paciente é obrigatório" }, 400);
    }

    const patient = await kv.get(`user:${userId}:patient:${patientId}`);
    if (!patient) {
      return c.json({ error: "Paciente não encontrado" }, 404);
    }

    const deviceId = crypto.randomUUID();
    const apiKey = crypto.randomUUID().replace(/-/g, "");

    const device = {
      deviceId,
      apiKey,
      deviceName: deviceName || `Sensor de ${patient.name}`,
      patientId,
      userId,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`device:${deviceId}`, device);

    console.log(
      "✅ Dispositivo IoT registrado:",
      deviceId,
      "para paciente:",
      patientId,
    );

    return c.json({
      device: {
        deviceId,
        apiKey,
        deviceName: device.deviceName,
        patientId,
      },
      instructions: "Use estes valores no código do ESP32",
    });
  } catch (error: any) {
    console.error("❌ Erro ao registrar dispositivo:", error);
    return c.json(
      { error: "Erro ao registrar dispositivo: " + error.message },
      500,
    );
  }
});

// Rota para obter métricas históricas de um paciente
app.get("/patients/:patientId/metrics", requireAuth, async (c: Context) => {
  try {
    const userId = c.get("userId");
    const patientId = c.req.param("patientId");

    const patient = await kv.get(`user:${userId}:patient:${patientId}`);
    if (!patient) {
      return c.json({ error: "Paciente não encontrado" }, 404);
    }

    const metrics = await kv.getByPrefix(`metrics:${patientId}:`);

    const sortedMetrics = (metrics || []).sort(
      (a: any, b: any) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return c.json({
      metrics: sortedMetrics.slice(0, 100),
      total: sortedMetrics.length,
    });
  } catch (error: any) {
    console.error("❌ Erro ao buscar métricas:", error);
    return c.json({ error: "Erro ao buscar métricas: " + error.message }, 500);
  }
});

// Rota para obter alertas de um paciente
app.get("/patients/:patientId/alerts", requireAuth, async (c: Context) => {
  try {
    const userId = c.get("userId");
    const patientId = c.req.param("patientId");

    const patient = await kv.get(`user:${userId}:patient:${patientId}`);
    if (!patient) {
      return c.json({ error: "Paciente não encontrado" }, 404);
    }

    const alerts = await kv.getByPrefix(`alert:${patientId}:`);

    return c.json({ alerts: alerts || [] });
  } catch (error: any) {
    console.error("❌ Erro ao buscar alertas:", error);
    return c.json({ error: "Erro ao buscar alertas: " + error.message }, 500);
  }
});

// Handler para Deno Serve
Deno.serve(app.fetch);
