import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Activity,
  Gauge,
  Shield,
  Clock,
  AlertTriangle,
  History,
} from "lucide-react";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

interface HistoricalMetric {
  deviceId: string;
  patientId: string;
  timestamp: string;
  deviceTimestamp?: string;
  metrics: {
    stepCount?: number;
    averageCadence?: number;
    gaitSpeed?: number;
    posturalStability?: number;
    timeSeated?: number;
    timeStanding?: number;
    timeWalking?: number;
    fallDetected?: boolean;
    inactivityEpisodes?: number;
    tugEstimated?: number;
    abruptTransitions?: number;
  };
  raw?: any;
}

interface PatientHistoryProps {
  patientId: string;
  patientName: string;
  accessToken: string;
  onClose: () => void;
}

type PeriodFilter = "7days" | "30days" | "90days" | "all";
type MetricType =
  | "stepCount"
  | "averageCadence"
  | "gaitSpeed"
  | "posturalStability"
  | "activity";

export function PatientHistory({
  patientId,
  patientName,
  accessToken,
  onClose,
}: PatientHistoryProps) {
  const [metrics, setMetrics] = useState<HistoricalMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>("30days");
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("stepCount");

  useEffect(() => {
    loadHistory();
  }, [patientId]);

  const loadHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/patient-api/patients/${patientId}/metrics`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Erro ao carregar histórico");
      }

      const data = await response.json();
      setMetrics(data.metrics || []);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  };

  // Filtrar por período
  const getFilteredMetrics = () => {
    const now = new Date();
    let cutoffDate: Date;

    switch (period) {
      case "7days":
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30days":
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90days":
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        return metrics;
    }

    return metrics.filter((m) => new Date(m.timestamp) >= cutoffDate);
  };

  // Agrupar métricas por dia para visualização
  const getDailyData = () => {
    const filtered = getFilteredMetrics();
    const dailyMap = new Map<
      string,
      {
        date: string;
        stepCount: number;
        averageCadence: number[];
        gaitSpeed: number[];
        posturalStability: number[];
        timeSeated: number;
        timeStanding: number;
        timeWalking: number;
        falls: number;
        count: number;
      }
    >();

    filtered.forEach((m) => {
      const date = new Date(m.timestamp).toISOString().split("T")[0];
      const existing = dailyMap.get(date) || {
        date,
        stepCount: 0,
        averageCadence: [],
        gaitSpeed: [],
        posturalStability: [],
        timeSeated: 0,
        timeStanding: 0,
        timeWalking: 0,
        falls: 0,
        count: 0,
      };

      existing.stepCount += m.metrics.stepCount || 0;
      if (m.metrics.averageCadence)
        existing.averageCadence.push(m.metrics.averageCadence);
      if (m.metrics.gaitSpeed) existing.gaitSpeed.push(m.metrics.gaitSpeed);
      if (m.metrics.posturalStability)
        existing.posturalStability.push(m.metrics.posturalStability);
      existing.timeSeated += m.metrics.timeSeated || 0;
      existing.timeStanding += m.metrics.timeStanding || 0;
      existing.timeWalking += m.metrics.timeWalking || 0;
      if (m.metrics.fallDetected) existing.falls++;
      existing.count++;

      dailyMap.set(date, existing);
    });

    return Array.from(dailyMap.values())
      .map((d) => ({
        date: d.date,
        dateFormatted: new Date(d.date).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }),
        stepCount: d.stepCount,
        averageCadence:
          d.averageCadence.length > 0
            ? d.averageCadence.reduce((a, b) => a + b, 0) /
              d.averageCadence.length
            : 0,
        gaitSpeed:
          d.gaitSpeed.length > 0
            ? d.gaitSpeed.reduce((a, b) => a + b, 0) / d.gaitSpeed.length
            : 0,
        posturalStability:
          d.posturalStability.length > 0
            ? d.posturalStability.reduce((a, b) => a + b, 0) /
              d.posturalStability.length
            : 0,
        totalActivity: d.timeSeated + d.timeStanding + d.timeWalking,
        timeSeated: d.timeSeated,
        timeStanding: d.timeStanding,
        timeWalking: d.timeWalking,
        falls: d.falls,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  // Calcular tendência
  const calculateTrend = (data: number[]) => {
    if (data.length < 2) return "stable";
    const recent = data.slice(-7);
    const older = data.slice(-14, -7);

    if (older.length === 0) return "stable";

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (change > 10) return "up";
    if (change < -10) return "down";
    return "stable";
  };

  const dailyData = getDailyData();

  // Calcular estatísticas de resumo
  const getStats = () => {
    if (dailyData.length === 0)
      return {
        avgSteps: 0,
        avgCadence: 0,
        avgGaitSpeed: 0,
        avgStability: 0,
        totalFalls: 0,
        stepsTrend: "stable" as const,
        cadenceTrend: "stable" as const,
        gaitSpeedTrend: "stable" as const,
        stabilityTrend: "stable" as const,
      };

    const steps = dailyData.map((d) => d.stepCount);
    const cadence = dailyData.map((d) => d.averageCadence);
    const gaitSpeed = dailyData.map((d) => d.gaitSpeed);
    const stability = dailyData.map((d) => d.posturalStability);

    return {
      avgSteps: Math.round(steps.reduce((a, b) => a + b, 0) / steps.length),
      avgCadence: cadence.reduce((a, b) => a + b, 0) / cadence.length,
      avgGaitSpeed: gaitSpeed.reduce((a, b) => a + b, 0) / gaitSpeed.length,
      avgStability: stability.reduce((a, b) => a + b, 0) / stability.length,
      totalFalls: dailyData.reduce((a, d) => a + d.falls, 0),
      stepsTrend: calculateTrend(steps),
      cadenceTrend: calculateTrend(cadence),
      gaitSpeedTrend: calculateTrend(gaitSpeed),
      stabilityTrend: calculateTrend(stability),
    };
  };

  const stats = getStats();

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === "up")
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === "down")
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const metricConfig = {
    stepCount: {
      label: "Passos",
      color: "#29D68B",
      unit: "passos/dia",
      icon: Activity,
    },
    averageCadence: {
      label: "Cadência",
      color: "#6366F1",
      unit: "passos/min",
      icon: Gauge,
    },
    gaitSpeed: {
      label: "Velocidade de Marcha",
      color: "#F59E0B",
      unit: "m/s",
      icon: TrendingUp,
    },
    posturalStability: {
      label: "Estabilidade",
      color: "#EC4899",
      unit: "/100",
      icon: Shield,
    },
    activity: {
      label: "Tempo de Atividade",
      color: "#29D68B",
      unit: "horas",
      icon: Clock,
    },
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-linear-to-r from-[#29D68B]/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#29D68B]/20 rounded-lg">
              <History className="w-6 h-6 text-[#29D68B]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Histórico de {patientName}
              </h2>
              <p className="text-sm text-gray-600">
                Evolução das métricas ao longo do tempo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#29D68B]"></div>
                <p className="mt-4 text-gray-600">Carregando histórico...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          ) : metrics.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Nenhum histórico disponível
              </h3>
              <p className="text-gray-500">
                Os dados serão exibidos aqui conforme os dispositivos enviarem
                métricas.
              </p>
            </div>
          ) : (
            <>
              {/* Filtros */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-600">Período:</span>
                </div>
                <div className="flex gap-2">
                  {(
                    [
                      { value: "7days", label: "7 dias" },
                      { value: "30days", label: "30 dias" },
                      { value: "90days", label: "90 dias" },
                      { value: "all", label: "Tudo" },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setPeriod(p.value)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition ${
                        period === p.value
                          ? "bg-[#29D68B] text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cards de Resumo */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-linear-to-br from-[#29D68B]/10 to-[#29D68B]/5 p-4 rounded-xl border border-[#29D68B]/20">
                  <div className="flex items-center justify-between mb-2">
                    <Activity className="w-5 h-5 text-[#29D68B]" />
                    <TrendIcon trend={stats.stepsTrend} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.avgSteps.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600">Média passos/dia</p>
                </div>

                <div className="bg-linear-to-br from-indigo-50 to-indigo-100/50 p-4 rounded-xl border border-indigo-200">
                  <div className="flex items-center justify-between mb-2">
                    <Gauge className="w-5 h-5 text-indigo-500" />
                    <TrendIcon trend={stats.cadenceTrend} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.avgCadence.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-600">Média cadência</p>
                </div>

                <div className="bg-linear-to-br from-amber-50 to-amber-100/50 p-4 rounded-xl border border-amber-200">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-5 h-5 text-amber-500" />
                    <TrendIcon trend={stats.gaitSpeedTrend} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.avgGaitSpeed.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-600">Média vel. marcha</p>
                </div>

                <div className="bg-linear-to-br from-pink-50 to-pink-100/50 p-4 rounded-xl border border-pink-200">
                  <div className="flex items-center justify-between mb-2">
                    <Shield className="w-5 h-5 text-pink-500" />
                    <TrendIcon trend={stats.stabilityTrend} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.avgStability.toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-600">Média estabilidade</p>
                </div>
              </div>

              {/* Alertas de Quedas */}
              {stats.totalFalls > 0 && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  <div>
                    <p className="font-semibold text-red-700">
                      {stats.totalFalls} queda(s) detectada(s) no período
                    </p>
                    <p className="text-sm text-red-600">
                      Verifique os detalhes abaixo para identificar padrões
                    </p>
                  </div>
                </div>
              )}

              {/* Seletor de Métrica */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Métrica para visualizar:
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(metricConfig) as MetricType[]).map((key) => {
                    const config = metricConfig[key];
                    const Icon = config.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedMetric(key)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                          selectedMetric === key
                            ? "bg-gray-900 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Gráfico Principal */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {metricConfig[selectedMetric].label} ao longo do tempo
                </h3>
                {dailyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    {selectedMetric === "activity" ? (
                      <AreaChart data={dailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="dateFormatted"
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                          }}
                          formatter={(
                            value: number | undefined,
                            name?: string,
                          ) => [
                            `${(value || 0).toFixed(1)}h`,
                            name === "timeWalking"
                              ? "Caminhando"
                              : name === "timeStanding"
                                ? "Em Pé"
                                : "Sentado",
                          ]}
                        />
                        <Legend
                          formatter={(value) =>
                            value === "timeWalking"
                              ? "Caminhando"
                              : value === "timeStanding"
                                ? "Em Pé"
                                : "Sentado"
                          }
                        />
                        <Area
                          type="monotone"
                          dataKey="timeWalking"
                          stackId="1"
                          stroke="#29D68B"
                          fill="#29D68B"
                          fillOpacity={0.8}
                        />
                        <Area
                          type="monotone"
                          dataKey="timeStanding"
                          stackId="1"
                          stroke="#6366F1"
                          fill="#6366F1"
                          fillOpacity={0.6}
                        />
                        <Area
                          type="monotone"
                          dataKey="timeSeated"
                          stackId="1"
                          stroke="#9CA3AF"
                          fill="#9CA3AF"
                          fillOpacity={0.4}
                        />
                      </AreaChart>
                    ) : (
                      <LineChart data={dailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="dateFormatted"
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number | undefined) => [
                            selectedMetric === "stepCount"
                              ? (value || 0).toLocaleString()
                              : (value || 0).toFixed(2),
                            metricConfig[selectedMetric].label,
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey={selectedMetric}
                          stroke={metricConfig[selectedMetric].color}
                          strokeWidth={2}
                          dot={{
                            fill: metricConfig[selectedMetric].color,
                            r: 4,
                          }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                ) : (
                  <div className="h-75 flex items-center justify-center text-gray-500">
                    Sem dados para o período selecionado
                  </div>
                )}
              </div>

              {/* Tabela de Dados Recentes */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Registros Recentes
                  </h3>
                  <p className="text-sm text-gray-600">
                    Últimas {Math.min(dailyData.length, 10)} entradas
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Passos
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cadência
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vel. Marcha
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estabilidade
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quedas
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {dailyData
                        .slice(-10)
                        .reverse()
                        .map((day) => (
                          <tr key={day.date} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {new Date(day.date).toLocaleDateString("pt-BR", {
                                weekday: "short",
                                day: "2-digit",
                                month: "2-digit",
                              })}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium">
                              {day.stepCount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-700">
                              {day.averageCadence.toFixed(1)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-700">
                              {day.gaitSpeed.toFixed(2)} m/s
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-700">
                              {day.posturalStability.toFixed(0)}/100
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              {day.falls > 0 ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                  {day.falls}
                                </span>
                              ) : (
                                <span className="text-green-500">✓</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            {metrics.length} registros encontrados
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
