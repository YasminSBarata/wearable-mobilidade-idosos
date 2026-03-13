import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, AlertTriangle, X, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";
import { apiFetch } from "../utils/api";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import type { Patient, TestSession } from "../lib/types";
import { formatDateBR } from "../utils/date";

// ─── Tipos de dados para gráficos ────────────────────────────────────────────

interface ChartDataPoint {
  date: string;
  dateLabel: string;
  sppb_total: number | null;
  balance_total: number | null;
  gait_score: number | null;
  chair_score: number | null;
  tug_time: number | null;
  gait_best_time: number | null;
  gait_oscillation: number | null;
  chair_time: number | null;
  chair_avg_inclination: number | null;
}

function buildChartData(sessions: TestSession[]): ChartDataPoint[] {
  // Ordenar por data crescente para o gráfico
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return sorted.map((s) => {
    // Usar a melhor oscilação entre as duas tentativas de marcha
    const osc1 = s.gait_oscillation_index_1;
    const osc2 = s.gait_oscillation_index_2;
    let gait_oscillation: number | null = null;
    if (osc1 != null && osc2 != null) {
      gait_oscillation = Math.min(osc1, osc2);
    } else if (osc1 != null) {
      gait_oscillation = osc1;
    } else if (osc2 != null) {
      gait_oscillation = osc2;
    }

    return {
      date: s.date,
      dateLabel: formatDateBR(s.date),
      sppb_total: s.sppb_total ?? null,
      balance_total: s.balance_total ?? null,
      gait_score: s.gait_score ?? null,
      chair_score: s.chair_score ?? null,
      tug_time: s.tug_time ?? null,
      gait_best_time: s.gait_best_time ?? null,
      gait_oscillation,
      chair_time: s.chair_time ?? null,
      chair_avg_inclination: s.chair_avg_inclination ?? null,
    };
  });
}

// ─── Tooltip customizado ─────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
  suffix,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: <span className="font-semibold">{entry.value}{suffix ?? ""}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Card wrapper para cada gráfico ──────────────────────────────────────────

function ChartCard({
  title,
  children,
  empty,
}: {
  title: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
      {empty ? (
        <p className="text-sm text-gray-400 text-center py-8">
          Sem dados suficientes para este gráfico.
        </p>
      ) : (
        <div className="h-64">{children}</div>
      )}
    </div>
  );
}

// ─── 5.1 — SPPB Total (Linha) ────────────────────────────────────────────────

function SPPBTotalChart({ data }: { data: ChartDataPoint[] }) {
  const valid = data.filter((d) => d.sppb_total != null);
  return (
    <ChartCard title="Evolução SPPB Total" empty={valid.length < 1}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={valid} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          {/* Faixas de classificação SPPB */}
          <ReferenceArea y1={0} y2={3} fill="#fee2e2" fillOpacity={0.5} />
          <ReferenceArea y1={3} y2={6} fill="#ffedd5" fillOpacity={0.5} />
          <ReferenceArea y1={6} y2={9} fill="#fef9c3" fillOpacity={0.5} />
          <ReferenceArea y1={9} y2={12} fill="#dcfce7" fillOpacity={0.5} />
          <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 12]} ticks={[0, 3, 6, 9, 12]} tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip suffix=" pts" />} />
          <Line
            type="monotone"
            dataKey="sppb_total"
            name="SPPB Total"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ r: 4, fill: "#6366f1" }}
            activeDot={{ r: 6 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── 5.2 — Componentes SPPB (Multi-linha) ────────────────────────────────────

function SPPBComponentsChart({ data }: { data: ChartDataPoint[] }) {
  const valid = data.filter(
    (d) => d.balance_total != null || d.gait_score != null || d.chair_score != null,
  );
  return (
    <ChartCard title="Evolução por Componente SPPB" empty={valid.length < 1}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={valid} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip suffix=" pts" />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="balance_total"
            name="Equilíbrio"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="gait_score"
            name="Marcha"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="chair_score"
            name="Cadeira"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── 5.3 — TUG com faixas de cor ─────────────────────────────────────────────

function TUGChart({ data }: { data: ChartDataPoint[] }) {
  const valid = data.filter((d) => d.tug_time != null);
  const maxTime = valid.length > 0
    ? Math.max(...valid.map((d) => d.tug_time!), 35)
    : 35;

  return (
    <ChartCard title="Evolução TUG (Timed Up and Go)" empty={valid.length < 1}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={valid} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          {/* Faixas TUG: verde ≤10, amarelo 10-20, laranja 20-30, vermelho >30 */}
          <ReferenceArea y1={0} y2={10} fill="#dcfce7" fillOpacity={0.5} />
          <ReferenceArea y1={10} y2={20} fill="#fef9c3" fillOpacity={0.5} />
          <ReferenceArea y1={20} y2={30} fill="#ffedd5" fillOpacity={0.5} />
          <ReferenceArea y1={30} y2={maxTime} fill="#fee2e2" fillOpacity={0.5} />
          <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, maxTime]} tick={{ fontSize: 11 }} unit="s" />
          <Tooltip content={<CustomTooltip suffix="s" />} />
          <Line
            type="monotone"
            dataKey="tug_time"
            name="TUG"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 4, fill: "#ef4444" }}
            activeDot={{ r: 6 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── 5.4 — Velocidade de Marcha + Oscilações (dual Y-axis) ──────────────────

function GaitEvolutionChart({ data }: { data: ChartDataPoint[] }) {
  const valid = data.filter(
    (d) => d.gait_best_time != null || d.gait_oscillation != null,
  );

  return (
    <ChartCard title="Marcha: Tempo + Oscilação" empty={valid.length < 1}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={valid} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="time" tick={{ fontSize: 11 }} unit="s" />
          <YAxis yAxisId="osc" orientation="right" tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            yAxisId="time"
            type="monotone"
            dataKey="gait_best_time"
            name="Melhor tempo (s)"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
          <Line
            yAxisId="osc"
            type="monotone"
            dataKey="gait_oscillation"
            name="Índice de oscilação"
            stroke="#f97316"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={{ r: 3 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── 5.5 — Cadeira: Tempo + Inclinação (dual Y-axis) ────────────────────────

function ChairEvolutionChart({ data }: { data: ChartDataPoint[] }) {
  const valid = data.filter(
    (d) => d.chair_time != null || d.chair_avg_inclination != null,
  );

  return (
    <ChartCard title="Cadeira: Tempo + Inclinação Média" empty={valid.length < 1}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={valid} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="time" tick={{ fontSize: 11 }} unit="s" />
          <YAxis yAxisId="angle" orientation="right" tick={{ fontSize: 11 }} unit="°" />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            yAxisId="time"
            type="monotone"
            dataKey="chair_time"
            name="Tempo 5 rep. (s)"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
          <Line
            yAxisId="angle"
            type="monotone"
            dataKey="chair_avg_inclination"
            name="Inclinação média (°)"
            stroke="#8b5cf6"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={{ r: 3 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── 5.6 — EvolutionDashboard (container) ────────────────────────────────────

export function EvolutionDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (patientId: string) => {
    setLoading(true);
    setError("");
    try {
      const [patientData, sessionsData] = await Promise.all([
        apiFetch(`/patients/${patientId}`),
        apiFetch(`/sessions?patient_id=${patientId}`),
      ]);
      setPatient(patientData.patient ?? patientData);
      setSessions(sessionsData.sessions ?? []);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "not_authenticated") {
        navigate("/");
        return;
      }
      setError("Não foi possível carregar os dados de evolução.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = buildChartData(sessions);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/patients/${id}`)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">
                {patient ? patient.name : "Evolução"}
              </h1>
              <p className="text-sm text-gray-500">Dashboard de evolução</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="size-4" />
            <AlertDescription>
              <div className="flex items-start justify-between gap-2">
                <span>{error}</span>
                <Button variant="ghost" size="icon" onClick={() => setError("")} className="h-5 w-5 shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#29D68B]" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <TrendingUp className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">
              Nenhuma sessão registrada. Registre avaliações para visualizar a evolução.
            </p>
            <Button onClick={() => navigate(`/patients/${id}/session/new`)}>
              Iniciar primeira avaliação
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Resumo */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">{sessions.length}</span>{" "}
                {sessions.length === 1 ? "sessão registrada" : "sessões registradas"}
                {" — "}
                de{" "}
                <span className="font-medium">
                  {formatDateBR(chartData[0]?.date ?? "")}
                </span>{" "}
                a{" "}
                <span className="font-medium">
                  {formatDateBR(chartData[chartData.length - 1]?.date ?? "")}
                </span>
              </p>
            </div>

            {/* 5.1 — SPPB Total */}
            <SPPBTotalChart data={chartData} />

            {/* 5.2 — Componentes SPPB */}
            <SPPBComponentsChart data={chartData} />

            {/* 5.3 — TUG */}
            <TUGChart data={chartData} />

            {/* 5.4 — Marcha + Oscilações */}
            <GaitEvolutionChart data={chartData} />

            {/* 5.5 — Cadeira: Tempo + Inclinação */}
            <ChairEvolutionChart data={chartData} />
          </div>
        )}
      </div>
    </div>
  );
}
