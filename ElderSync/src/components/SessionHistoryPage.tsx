import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, ClipboardList, AlertTriangle, X, Plus } from "lucide-react";
import { apiFetch } from "../utils/api";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import type { Patient, TestSession } from "../lib/types";
import { cn } from "../utils/cn";

function tugColor(classification?: string | null): string {
  if (!classification) return "text-gray-500";
  if (classification === "≤10s") return "text-green-600";
  if (classification === "11–20s") return "text-yellow-600";
  if (classification === ">20s") return "text-orange-500";
  return "text-red-600"; // >30s
}

function sppbColor(total?: number | null): string {
  if (total == null) return "text-gray-500";
  if (total <= 3) return "text-red-600";
  if (total <= 6) return "text-orange-500";
  if (total <= 9) return "text-yellow-600";
  return "text-green-600";
}

export function SessionHistoryPage() {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/patients/${id}`)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">
                {patient ? patient.name : "Histórico de Sessões"}
              </h1>
              <p className="text-sm text-gray-500">Histórico de avaliações</p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate(`/patients/${id}/session/new`)}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Nova Sessão
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
            <ClipboardList className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">Nenhuma sessão registrada.</p>
            <Button onClick={() => navigate(`/patients/${id}/session/new`)}>
              Iniciar primeira avaliação
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Examinador</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Equilíbrio</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Marcha</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Cadeira</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">SPPB</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">TUG</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sessions.map((session, i) => (
                  <tr
                    key={session.id}
                    className={cn(
                      "border-b border-gray-100 last:border-0",
                      i % 2 === 0 ? "bg-white" : "bg-gray-50/50",
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {new Date(session.date).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {session.examiner_initials || "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">
                      {session.balance_total != null ? `${session.balance_total}/4` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">
                      {session.gait_score != null ? `${session.gait_score}/4` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">
                      {session.chair_score != null ? `${session.chair_score}/4` : "—"}
                    </td>
                    <td className={cn("px-4 py-3 text-center font-semibold", sppbColor(session.sppb_total))}>
                      {session.sppb_total != null ? `${session.sppb_total}/12` : "—"}
                    </td>
                    <td className={cn("px-4 py-3 text-center", tugColor(session.tug_classification))}>
                      {session.tug_time != null ? (
                        <>
                          <span className="font-medium">{session.tug_time}s</span>
                          {session.tug_classification && (
                            <span className="text-xs ml-1">({session.tug_classification})</span>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        className="text-xs text-red-400 hover:text-red-600 transition"
                        title="Remover sessão"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
