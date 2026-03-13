import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Eye, EyeOff, Trash2, Calendar, AlertTriangle, X } from "lucide-react";
import { apiFetch } from "../utils/api";
import { Alert, AlertDescription } from "./ui/alert";
import type { Patient, TestSession } from "../lib/types";
import { formatDateBR } from "../utils/date";

function getSPPBBadge(score?: number | null) {
  if (score == null) return null;
  if (score >= 10) return { bg: "bg-green-50", text: "text-green-700", label: "Bom" };
  if (score >= 7) return { bg: "bg-yellow-50", text: "text-yellow-700", label: "Leve" };
  if (score >= 4) return { bg: "bg-orange-50", text: "text-orange-700", label: "Moderado" };
  return { bg: "bg-red-50", text: "text-red-700", label: "Grave" };
}

function getTUGBadge(time?: number | null) {
  if (time == null) return null;
  if (time <= 10) return { bg: "bg-green-50", text: "text-green-700" };
  if (time <= 20) return { bg: "bg-yellow-50", text: "text-yellow-700" };
  if (time <= 30) return { bg: "bg-orange-50", text: "text-orange-700" };
  return { bg: "bg-red-50", text: "text-red-700" };
}

export function SessionHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Remover esta sessão permanentemente?")) return;
    try {
      await apiFetch(`/sessions/${sessionId}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
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
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/patients/${id}`)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Histórico de Sessões</h1>
                <p className="text-sm text-gray-600">{patient?.name ?? ""}</p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/patients/${id}/session/new`)}
              className="px-4 py-2 bg-[#29D68B] text-white rounded-lg font-semibold hover:bg-[#24c07d] transition"
            >
              Nova Sessão
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
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
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhuma sessão registrada
            </h3>
            <p className="text-gray-600 mb-6">
              Comece registrando a primeira avaliação do paciente.
            </p>
            <button
              onClick={() => navigate(`/patients/${id}/session/new`)}
              className="inline-flex items-center px-6 py-3 bg-[#29D68B] text-white rounded-lg font-semibold hover:bg-[#24c07d] transition"
            >
              Registrar Primeira Sessão
            </button>
          </div>
        ) : (
          <>
            {/* Summary Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">Resumo</h2>
              </div>
              <div className="flex flex-col min-[480px]:flex-row items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total de Sessões</p>
                  <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Primeira Avaliação</p>
                  <p className="text-lg font-medium text-gray-900">
                    {formatDateBR(sortedSessions[sortedSessions.length - 1]?.date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Última Avaliação</p>
                  <p className="text-lg font-medium text-gray-900">
                    {formatDateBR(sortedSessions[0]?.date)}
                  </p>
                </div>
              </div>
            </div>

            {/* Sessions Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Examinador
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        SPPB Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                        Componentes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        TUG
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedSessions.map((session, index) => {
                      const sppbBadge = getSPPBBadge(session.sppb_total);
                      const tugBadge = getTUGBadge(session.tug_time);

                      return (
                        <React.Fragment key={session.id}>
                        <tr
                          className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatDateBR(session.date)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {session.examiner_initials || "\u2014"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {sppbBadge ? (
                              <span
                                className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${sppbBadge.bg} ${sppbBadge.text}`}
                              >
                                {session.sppb_total}/12
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">{"\u2014"}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                            <div className="flex gap-2 text-xs">
                              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                                E: {session.balance_total != null ? `${session.balance_total}/4` : "\u2014"}
                              </span>
                              <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded">
                                M: {session.gait_score != null ? `${session.gait_score}/4` : "\u2014"}
                              </span>
                              <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded">
                                C: {session.chair_score != null ? `${session.chair_score}/4` : "\u2014"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {tugBadge ? (
                              <span
                                className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${tugBadge.bg} ${tugBadge.text}`}
                              >
                                {session.tug_time}s
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">{"\u2014"}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                title={expandedId === session.id ? "Fechar detalhes" : "Ver detalhes"}
                              >
                                {expandedId === session.id ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteSession(session.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedId === session.id && (
                          <tr className="bg-gray-50/80">
                            <td colSpan={6} className="px-6 py-5">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                                {/* Equilíbrio */}
                                <div>
                                  <p className="font-semibold text-gray-900 mb-2">Equilíbrio ({session.balance_total ?? "\u2014"}/4)</p>
                                  <div className="space-y-1.5">
                                    <div>
                                      <p className="text-gray-600">Pés Juntos: <span className="font-medium text-gray-900">{session.balance_feet_together_score ?? "\u2014"}/1</span>
                                        {session.balance_feet_together_time != null && <span className="text-gray-500"> ({session.balance_feet_together_time}s)</span>}
                                      </p>
                                      {session.balance_feet_together_failure_reason && (
                                        <p className="text-red-600 text-xs">Motivo: {session.balance_feet_together_failure_reason}</p>
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-gray-600">Semi-Tandem: <span className="font-medium text-gray-900">{session.balance_semi_tandem_score ?? "\u2014"}/1</span>
                                        {session.balance_semi_tandem_time != null && <span className="text-gray-500"> ({session.balance_semi_tandem_time}s)</span>}
                                      </p>
                                      {session.balance_semi_tandem_failure_reason && (
                                        <p className="text-red-600 text-xs">Motivo: {session.balance_semi_tandem_failure_reason}</p>
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-gray-600">Tandem: <span className="font-medium text-gray-900">{session.balance_tandem_score ?? "\u2014"}/2</span>
                                        {session.balance_tandem_time != null && <span className="text-gray-500"> ({session.balance_tandem_time}s)</span>}
                                      </p>
                                      {session.balance_tandem_failure_reason && (
                                        <p className="text-red-600 text-xs">Motivo: {session.balance_tandem_failure_reason}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Marcha */}
                                <div>
                                  <p className="font-semibold text-gray-900 mb-2">Marcha ({session.gait_score ?? "\u2014"}/4)</p>
                                  <div className="space-y-1.5">
                                    <p className="text-gray-600">Distância: <span className="font-medium text-gray-900">{session.gait_distance != null ? `${session.gait_distance}m` : "\u2014"}</span></p>
                                    <div>
                                      <p className="text-gray-600">Tentativa 1: <span className="font-medium text-gray-900">{session.gait_attempt1_time != null ? `${session.gait_attempt1_time}s` : "\u2014"}</span>
                                        {session.gait_attempt1_completed === false && <span className="text-red-600 text-xs ml-1">(não completou)</span>}
                                      </p>
                                      {session.gait_attempt1_failure_reason && (
                                        <p className="text-red-600 text-xs">Motivo: {session.gait_attempt1_failure_reason}</p>
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-gray-600">Tentativa 2: <span className="font-medium text-gray-900">{session.gait_attempt2_time != null ? `${session.gait_attempt2_time}s` : "\u2014"}</span>
                                        {session.gait_attempt2_completed === false && <span className="text-red-600 text-xs ml-1">(não completou)</span>}
                                      </p>
                                      {session.gait_attempt2_failure_reason && (
                                        <p className="text-red-600 text-xs">Motivo: {session.gait_attempt2_failure_reason}</p>
                                      )}
                                    </div>
                                    <p className="text-gray-600">Melhor tempo: <span className="font-semibold text-gray-900">{session.gait_best_time != null ? `${session.gait_best_time}s` : "\u2014"}</span></p>
                                  </div>
                                </div>

                                {/* Cadeira */}
                                <div>
                                  <p className="font-semibold text-gray-900 mb-2">Cadeira ({session.chair_score ?? "\u2014"}/4)</p>
                                  <div className="space-y-1.5">
                                    <div>
                                      <p className="text-gray-600">Pré-teste: <span className="font-medium text-gray-900">{session.chair_pretest_passed == null ? "\u2014" : session.chair_pretest_passed ? "Aprovado" : "Reprovado"}</span></p>
                                      {session.chair_pretest_used_arms && (
                                        <p className="text-amber-600 text-xs">Usou os braços</p>
                                      )}
                                      {session.chair_pretest_failure_reason && (
                                        <p className="text-red-600 text-xs">Motivo: {session.chair_pretest_failure_reason}</p>
                                      )}
                                    </div>
                                    <p className="text-gray-600">Tempo (5 rep.): <span className="font-medium text-gray-900">{session.chair_time != null ? `${session.chair_time}s` : "\u2014"}</span>
                                      {session.chair_completed === false && <span className="text-red-600 text-xs ml-1">(não completou)</span>}
                                    </p>
                                    {session.chair_failure_reason && (
                                      <p className="text-red-600 text-xs">Motivo: {session.chair_failure_reason}</p>
                                    )}
                                  </div>
                                </div>

                                {/* TUG */}
                                <div>
                                  <p className="font-semibold text-gray-900 mb-2">TUG ({session.tug_time != null ? `${session.tug_time}s` : "\u2014"})</p>
                                  <div className="space-y-1.5">
                                    <p className="text-gray-600">Classificação: <span className="font-medium text-gray-900">{session.tug_classification ?? "\u2014"}</span></p>
                                    {session.tug_assistive_device && (
                                      <p className="text-gray-600">Dispositivo: <span className="font-medium text-gray-900">{session.tug_assistive_device}</span></p>
                                    )}
                                    {session.tug_footwear && (
                                      <p className="text-gray-600">Calçado: <span className="font-medium text-gray-900">{session.tug_footwear}</span></p>
                                    )}
                                    {session.tug_physical_help && (
                                      <p className="text-amber-600 text-xs">Necessitou ajuda física</p>
                                    )}
                                    {session.tug_gait_pattern && (
                                      <p className="text-gray-600">Padrão marcha: <span className="font-medium text-gray-900">{session.tug_gait_pattern}</span></p>
                                    )}
                                    {session.tug_balance_turn && (
                                      <p className="text-gray-600">Equilíbrio volta: <span className="font-medium text-gray-900">{session.tug_balance_turn}</span></p>
                                    )}
                                    {session.tug_sit_control && (
                                      <p className="text-gray-600">Controle sentar: <span className="font-medium text-gray-900">{session.tug_sit_control}</span></p>
                                    )}
                                    {session.tug_instability && (
                                      <p className="text-red-600 text-xs">Instabilidade{session.tug_instability_notes ? `: ${session.tug_instability_notes}` : ""}</p>
                                    )}
                                    {session.tug_pain && (
                                      <p className="text-red-600 text-xs">Dor{session.tug_pain_notes ? `: ${session.tug_pain_notes}` : ""}</p>
                                    )}
                                    {session.tug_compensatory_strategies && (
                                      <p className="text-gray-600">Estratégias: <span className="font-medium text-gray-900">{session.tug_compensatory_strategies}</span></p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {session.notes && (
                                <div className="mt-4 pt-3 border-t border-gray-200">
                                  <p className="text-gray-500 mb-1">Notas da sessão</p>
                                  <p className="text-gray-900">{session.notes}</p>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
