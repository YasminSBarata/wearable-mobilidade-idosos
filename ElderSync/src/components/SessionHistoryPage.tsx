import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Calendar,
  AlertTriangle,
  X,
  ChevronDown,
  Radio,
  Activity,
  Footprints,
  Armchair,
  Timer,
} from "lucide-react";
import { apiFetch } from "../utils/api";
import { getSupabaseClient } from "../utils/supabase/client";
import { Alert, AlertDescription } from "./ui/alert";
import type { Patient, TestSession } from "../lib/types";
import type { DeviceReading } from "../hooks/useDeviceSession";
import { formatDateBR } from "../utils/date";
import { getSPPBCategory } from "../lib/scoring/sppb";
import { TUGClassificationBadge } from "./TUGClassificationBadge";

// ── Helpers ────────────────────────────────────────────────────

function getSPPBColor(score?: number | null) {
  if (score == null) return "text-gray-400";
  if (score >= 10) return "text-green-600";
  if (score >= 7) return "text-yellow-600";
  if (score >= 4) return "text-orange-600";
  return "text-red-600";
}

function getSPPBBadgeStyle(score?: number | null) {
  if (score == null) return null;
  if (score >= 10) return { bg: "bg-green-50 border-green-200", text: "text-green-700" };
  if (score >= 7) return { bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-700" };
  if (score >= 4) return { bg: "bg-orange-50 border-orange-200", text: "text-orange-700" };
  return { bg: "bg-red-50 border-red-200", text: "text-red-700" };
}

function MetricRow({ label, value, unit }: { label: string; value?: number | null; unit: string }) {
  if (value == null) return null;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">
        {value.toFixed(2)} {unit}
      </span>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, score, scoreMax }: {
  icon: React.ElementType;
  title: string;
  score?: number | null;
  scoreMax?: string;
}) {
  return (
    <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-[#29D68B]" />
        <h4 className="text-base font-semibold text-gray-900">{title}</h4>
      </div>
      {score != null && scoreMax && (
        <span className={`text-base font-bold ${getSPPBColor(score)}`}>
          {score}/{scoreMax}
        </span>
      )}
    </div>
  );
}

function SensorCard({ readings, testTypes, label }: {
  readings: DeviceReading[];
  testTypes: string[];
  label: string;
}) {
  const matching = readings.filter((r) => testTypes.includes(r.test_type));
  if (matching.length === 0) return null;

  return (
    <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
        <Radio className="w-3.5 h-3.5" />
        Dados do sensor — {label}
      </div>
      {matching.map((r) => {
        const osc = r.oscillation_metrics;
        const gait = r.gait_metrics;
        return (
          <div key={r.id} className="space-y-1">
            {r.test_type !== testTypes[0] && (
              <p className="text-xs uppercase tracking-wide text-emerald-600 font-semibold mt-1">
                {r.test_type.replace("_", " ")}
              </p>
            )}
            {osc && (
              <>
                <MetricRow label="Amplitude AP" value={osc.amplitude_ap} unit="m/s²" />
                <MetricRow label="Amplitude ML" value={osc.amplitude_ml} unit="m/s²" />
                <MetricRow label="RMS AP" value={osc.rms_ap} unit="m/s²" />
                <MetricRow label="RMS ML" value={osc.rms_ml} unit="m/s²" />
                <MetricRow label="Duração" value={osc.duration_s} unit="s" />
              </>
            )}
            {gait && (
              <>
                <MetricRow label="Índice oscilação" value={gait.oscillation_index} unit="m/s²" />
                <MetricRow label="Inclinação máx." value={gait.max_angle} unit="°" />
                <MetricRow label="Duração" value={gait.duration_s} unit="s" />
                {gait.angles_per_rep && gait.angles_per_rep.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Inclinação/rep</span>
                    <span className="font-medium text-gray-900">
                      {gait.angles_per_rep.map((a) => `${a.toFixed(1)}°`).join(", ")}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export function SessionHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Device readings cache per session
  const [readingsMap, setReadingsMap] = useState<Record<string, DeviceReading[]>>({});

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
      setError("Não foi possível carregar o histórico de sessões.");
    } finally {
      setLoading(false);
    }
  };

  const loadReadings = async (sessionId: string) => {
    if (readingsMap[sessionId]) return; // already cached
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from("device_readings")
        .select("*")
        .eq("session_id", sessionId)
        .order("timestamp", { ascending: true });
      setReadingsMap((prev) => ({ ...prev, [sessionId]: (data as DeviceReading[]) ?? [] }));
    } catch {
      // silently fail — sensor data is optional
    }
  };

  const handleToggle = (sessionId: string) => {
    if (expandedId === sessionId) {
      setExpandedId(null);
    } else {
      setExpandedId(sessionId);
      loadReadings(sessionId);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Remover esta sessão permanentemente?")) return;
    try {
      await apiFetch(`/sessions/${sessionId}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (expandedId === sessionId) setExpandedId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao remover sessão.");
    }
  };

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/patients/${id}`)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Histórico</h1>
                <p className="text-sm text-gray-500">{patient?.name ?? ""}</p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/patients/${id}/session/new`)}
              className="px-4 py-2 bg-[#29D68B] text-white text-base rounded-lg font-semibold hover:bg-[#24c07d] transition"
            >
              Nova Sessão
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription>
              <div className="flex items-start justify-between gap-2">
                <span>{error}</span>
                <button onClick={() => setError("")} className="shrink-0">
                  <X className="h-4 w-4" />
                </button>
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
            <Calendar className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhuma sessão registrada
            </h3>
            <p className="text-gray-500 mb-6 text-base">
              Comece registrando a primeira avaliação do paciente.
            </p>
            <button
              onClick={() => navigate(`/patients/${id}/session/new`)}
              className="px-6 py-3 bg-[#29D68B] text-white rounded-lg font-semibold hover:bg-[#24c07d] transition"
            >
              Registrar Primeira Sessão
            </button>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <h2 className="text-base font-semibold text-gray-900">Resumo</h2>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Sessões</p>
                </div>
                <div>
                  <p className="text-base font-medium text-gray-900">
                    {formatDateBR(sortedSessions[sortedSessions.length - 1]?.date)}
                  </p>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Primeira</p>
                </div>
                <div>
                  <p className="text-base font-medium text-gray-900">
                    {formatDateBR(sortedSessions[0]?.date)}
                  </p>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Última</p>
                </div>
              </div>
            </div>

            {/* Session Cards */}
            {sortedSessions.map((session) => {
              const isExpanded = expandedId === session.id;
              const sppbStyle = getSPPBBadgeStyle(session.sppb_total);
              const sppbCat = session.sppb_total != null ? getSPPBCategory(session.sppb_total) : null;
              const readings = readingsMap[session.id] ?? [];

              return (
                <div
                  key={session.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow hover:shadow-sm"
                >
                  {/* Card header — always visible */}
                  <button
                    type="button"
                    onClick={() => handleToggle(session.id)}
                    className="w-full px-5 py-4 flex items-center gap-4 text-left"
                  >
                    {/* Date */}
                    <div className="shrink-0">
                      <p className="text-base font-semibold text-gray-900">
                        {formatDateBR(session.date)}
                      </p>
                      {session.examiner_initials && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          por {session.examiner_initials}
                        </p>
                      )}
                    </div>

                    {/* Scores */}
                    <div className="flex-1 flex items-center gap-3 justify-end">
                      {sppbStyle && (
                        <span className={`inline-flex items-center px-2.5 py-1 text-sm font-bold rounded-full border ${sppbStyle.bg} ${sppbStyle.text}`}>
                          SPPB {session.sppb_total}/12
                        </span>
                      )}
                      {session.tug_time != null && (
                        <span className="text-sm text-gray-500 font-medium">
                          TUG {session.tug_time}s
                        </span>
                      )}
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-gray-100 space-y-5">
                      {/* SPPB Score summary */}
                      {sppbCat && (
                        <div className={`mt-4 rounded-lg border p-4 text-center ${sppbStyle?.bg} ${sppbStyle?.text}`}>
                          <p className="text-3xl font-black">{session.sppb_total}/12</p>
                          <p className="text-sm font-semibold mt-1">{sppbCat.label}</p>
                        </div>
                      )}

                      {/* Component scores bar */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-gray-50 p-2.5">
                          <p className={`text-lg font-bold ${getSPPBColor(session.balance_total)}`}>
                            {session.balance_total ?? "—"}<span className="text-xs text-gray-400">/4</span>
                          </p>
                          <p className="text-[10px] text-gray-500 uppercase">Equilíbrio</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-2.5">
                          <p className={`text-lg font-bold ${getSPPBColor(session.gait_score)}`}>
                            {session.gait_score ?? "—"}<span className="text-xs text-gray-400">/4</span>
                          </p>
                          <p className="text-[10px] text-gray-500 uppercase">Marcha</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-2.5">
                          <p className={`text-lg font-bold ${getSPPBColor(session.chair_score)}`}>
                            {session.chair_score ?? "—"}<span className="text-xs text-gray-400">/4</span>
                          </p>
                          <p className="text-[10px] text-gray-500 uppercase">Cadeira</p>
                        </div>
                      </div>

                      {/* ── Equilíbrio ──────────────────────── */}
                      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-2">
                        <SectionHeader icon={Activity} title="Equilíbrio" score={session.balance_total} scoreMax="4" />
                        <div className="space-y-2 text-sm text-gray-700">
                          <div className="flex justify-between">
                            <span>Pés Juntos</span>
                            <span className="font-medium">
                              {session.balance_feet_together_score ?? "—"}/1
                              {session.balance_feet_together_time != null && (
                                <span className="text-gray-400 ml-1">({session.balance_feet_together_time}s)</span>
                              )}
                            </span>
                          </div>
                          {session.balance_feet_together_failure_reason && (
                            <p className="text-red-500 text-xs ml-2">
                              {session.balance_feet_together_failure_reason}
                            </p>
                          )}
                          <div className="flex justify-between">
                            <span>Semi-Tandem</span>
                            <span className="font-medium">
                              {session.balance_semi_tandem_score ?? "—"}/1
                              {session.balance_semi_tandem_time != null && (
                                <span className="text-gray-400 ml-1">({session.balance_semi_tandem_time}s)</span>
                              )}
                            </span>
                          </div>
                          {session.balance_semi_tandem_failure_reason && (
                            <p className="text-red-500 text-xs ml-2">
                              {session.balance_semi_tandem_failure_reason}
                            </p>
                          )}
                          <div className="flex justify-between">
                            <span>Tandem</span>
                            <span className="font-medium">
                              {session.balance_tandem_score ?? "—"}/2
                              {session.balance_tandem_time != null && (
                                <span className="text-gray-400 ml-1">({session.balance_tandem_time}s)</span>
                              )}
                            </span>
                          </div>
                          {session.balance_tandem_failure_reason && (
                            <p className="text-red-500 text-xs ml-2">
                              {session.balance_tandem_failure_reason}
                            </p>
                          )}
                        </div>
                        <SensorCard
                          readings={readings}
                          testTypes={["balance_a", "balance_b", "balance_c"]}
                          label="Equilíbrio"
                        />
                      </div>

                      {/* ── Marcha ──────────────────────────── */}
                      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-2">
                        <SectionHeader icon={Footprints} title="Marcha" score={session.gait_score} scoreMax="4" />
                        <div className="space-y-2 text-sm text-gray-700">
                          <div className="flex justify-between">
                            <span>Distância</span>
                            <span className="font-medium">
                              {session.gait_distance != null ? `${session.gait_distance}m` : "—"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tentativa 1</span>
                            <span className="font-medium">
                              {session.gait_attempt1_time != null ? `${session.gait_attempt1_time}s` : "—"}
                              {session.gait_attempt1_completed === false && (
                                <span className="text-red-500 ml-1">(incompleta)</span>
                              )}
                            </span>
                          </div>
                          {session.gait_attempt1_failure_reason && (
                            <p className="text-red-500 text-xs ml-2">
                              {session.gait_attempt1_failure_reason}
                            </p>
                          )}
                          <div className="flex justify-between">
                            <span>Tentativa 2</span>
                            <span className="font-medium">
                              {session.gait_attempt2_time != null ? `${session.gait_attempt2_time}s` : "—"}
                              {session.gait_attempt2_completed === false && (
                                <span className="text-red-500 ml-1">(incompleta)</span>
                              )}
                            </span>
                          </div>
                          {session.gait_attempt2_failure_reason && (
                            <p className="text-red-500 text-xs ml-2">
                              {session.gait_attempt2_failure_reason}
                            </p>
                          )}
                          <div className="flex justify-between font-semibold">
                            <span>Melhor tempo</span>
                            <span>{session.gait_best_time != null ? `${session.gait_best_time}s` : "—"}</span>
                          </div>
                          {(session.gait_oscillation_index_1 != null || session.gait_oscillation_index_2 != null) && (
                            <>
                              <div className="flex justify-between text-emerald-700">
                                <span>Índice oscilação T1</span>
                                <span className="font-medium">
                                  {session.gait_oscillation_index_1?.toFixed(2) ?? "—"} m/s²
                                </span>
                              </div>
                              <div className="flex justify-between text-emerald-700">
                                <span>Índice oscilação T2</span>
                                <span className="font-medium">
                                  {session.gait_oscillation_index_2?.toFixed(2) ?? "—"} m/s²
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        <SensorCard
                          readings={readings}
                          testTypes={["gait_1", "gait_2"]}
                          label="Marcha"
                        />
                      </div>

                      {/* ── Cadeira ─────────────────────────── */}
                      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-2">
                        <SectionHeader icon={Armchair} title="Levantar da Cadeira" score={session.chair_score} scoreMax="4" />
                        <div className="space-y-2 text-sm text-gray-700">
                          <div className="flex justify-between">
                            <span>Pré-teste</span>
                            <span className="font-medium">
                              {session.chair_pretest_passed == null
                                ? "—"
                                : session.chair_pretest_passed
                                  ? "Aprovado"
                                  : "Reprovado"}
                            </span>
                          </div>
                          {session.chair_pretest_used_arms && (
                            <p className="text-amber-600 text-xs ml-2">Usou os braços</p>
                          )}
                          {session.chair_pretest_failure_reason && (
                            <p className="text-red-500 text-xs ml-2">
                              {session.chair_pretest_failure_reason}
                            </p>
                          )}
                          {session.chair_pretest_max_inclination != null && (
                            <div className="flex justify-between text-emerald-700">
                              <span>Inclinação máx. pré-teste</span>
                              <span className="font-medium">{session.chair_pretest_max_inclination.toFixed(1)}°</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Tempo (5 rep.)</span>
                            <span className="font-medium">
                              {session.chair_time != null ? `${session.chair_time}s` : "—"}
                              {session.chair_completed === false && (
                                <span className="text-red-500 ml-1">(incompleto)</span>
                              )}
                            </span>
                          </div>
                          {session.chair_failure_reason && (
                            <p className="text-red-500 text-xs ml-2">
                              {session.chair_failure_reason}
                            </p>
                          )}
                          {session.chair_avg_inclination != null && (
                            <div className="flex justify-between text-emerald-700">
                              <span>Inclinação média</span>
                              <span className="font-medium">{session.chair_avg_inclination.toFixed(1)}°</span>
                            </div>
                          )}
                          {session.chair_inclination_per_rep && session.chair_inclination_per_rep.length > 0 && (
                            <div className="flex justify-between text-emerald-700">
                              <span>Inclinação/rep</span>
                              <span className="font-medium">
                                {session.chair_inclination_per_rep.map((a) => `${a.toFixed(1)}°`).join(", ")}
                              </span>
                            </div>
                          )}
                        </div>
                        <SensorCard
                          readings={readings}
                          testTypes={["chair_pretest", "chair_main"]}
                          label="Cadeira"
                        />
                      </div>

                      {/* ── TUG ─────────────────────────────── */}
                      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-2">
                        <SectionHeader icon={Timer} title="TUG — Timed Up and Go" />
                        <div className="space-y-2 text-sm text-gray-700">
                          <div className="flex justify-between items-center">
                            <span>Tempo</span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-base text-gray-900">
                                {session.tug_time != null ? `${session.tug_time}s` : "—"}
                              </span>
                              <TUGClassificationBadge time={session.tug_time} />
                            </div>
                          </div>
                          {session.tug_classification && (
                            <div className="flex justify-between">
                              <span>Classificação</span>
                              <span className="font-medium">{session.tug_classification}</span>
                            </div>
                          )}
                          {session.tug_assistive_device && (
                            <div className="flex justify-between">
                              <span>Dispositivo auxiliar</span>
                              <span className="font-medium">{session.tug_assistive_device}</span>
                            </div>
                          )}
                          {session.tug_footwear && (
                            <div className="flex justify-between">
                              <span>Calçado</span>
                              <span className="font-medium">{session.tug_footwear}</span>
                            </div>
                          )}
                          {session.tug_physical_help && (
                            <p className="text-amber-600 text-xs">Necessitou ajuda física</p>
                          )}
                          {session.tug_gait_pattern && (
                            <div className="flex justify-between">
                              <span>Padrão de marcha</span>
                              <span className="font-medium">{session.tug_gait_pattern}</span>
                            </div>
                          )}
                          {session.tug_balance_turn && (
                            <div className="flex justify-between">
                              <span>Equilíbrio na volta</span>
                              <span className="font-medium">{session.tug_balance_turn}</span>
                            </div>
                          )}
                          {session.tug_sit_control && (
                            <div className="flex justify-between">
                              <span>Controle ao sentar</span>
                              <span className="font-medium">{session.tug_sit_control}</span>
                            </div>
                          )}
                          {session.tug_instability && (
                            <p className="text-red-500 text-xs">
                              Instabilidade{session.tug_instability_notes ? `: ${session.tug_instability_notes}` : ""}
                            </p>
                          )}
                          {session.tug_pain && (
                            <p className="text-red-500 text-xs">
                              Dor{session.tug_pain_notes ? `: ${session.tug_pain_notes}` : ""}
                            </p>
                          )}
                          {session.tug_compensatory_strategies && (
                            <div className="flex justify-between">
                              <span>Estratégias compensatórias</span>
                              <span className="font-medium">{session.tug_compensatory_strategies}</span>
                            </div>
                          )}
                        </div>
                        <SensorCard
                          readings={readings}
                          testTypes={["tug"]}
                          label="TUG"
                        />
                      </div>

                      {/* ── Notas ───────────────────────────── */}
                      {session.notes && (
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-1">
                            Observações
                          </p>
                          <p className="text-sm text-gray-700">{session.notes}</p>
                        </div>
                      )}

                      {/* ── Actions ─────────────────────────── */}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => navigate(`/patients/${id}/session/${session.id}/edit`)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition"
                        >
                          <Pencil className="w-4 h-4" />
                          Editar Sessão
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </main>
    </div>
  );
}
