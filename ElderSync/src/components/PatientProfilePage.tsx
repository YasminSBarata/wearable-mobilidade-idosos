import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  User,
  Trash2,
  Pencil,
  AlertTriangle,
  X,
  Calendar,
  FileText,
} from "lucide-react";
import { apiFetch } from "../utils/api";
import { PatientFormModal } from "./PatientFormModal";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import type { Patient, TestSession } from "../lib/types";
import { formatDateBR } from "../utils/date";

function calcAge(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate + "T00:00:00");
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function genderLabel(g?: string | null) {
  if (g === "M") return "Masculino";
  if (g === "F") return "Feminino";
  if (g === "outro") return "Outro";
  return "—";
}

function getSPPBBadge(score?: number | null) {
  if (score == null) return null;
  if (score >= 10) return { bg: "bg-green-50", text: "text-green-700", label: "Bom" };
  if (score >= 7) return { bg: "bg-yellow-50", text: "text-yellow-700", label: "Leve" };
  if (score >= 4) return { bg: "bg-orange-50", text: "text-orange-700", label: "Moderado" };
  return { bg: "bg-red-50", text: "text-red-700", label: "Grave" };
}

function getTUGBadge(time?: number | null) {
  if (time == null) return null;
  if (time <= 10) return { bg: "bg-green-50", text: "text-green-700", label: "Mobilidade Normal" };
  if (time <= 20) return { bg: "bg-yellow-50", text: "text-yellow-700", label: "Algum Comprometimento" };
  if (time <= 30) return { bg: "bg-orange-50", text: "text-orange-700", label: "Comprometimento Moderado" };
  return { bg: "bg-red-50", text: "text-red-700", label: "Comprometimento Grave" };
}

export function PatientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [lastSession, setLastSession] = useState<TestSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (patientId: string) => {
    setLoading(true);
    setError("");
    try {
      const [patientData, sessionsData] = await Promise.all([
        apiFetch(`/patients/${patientId}`),
        apiFetch(`/sessions?patient_id=${patientId}&limit=1`),
      ]);
      setPatient(patientData.patient ?? patientData);
      const sessions: TestSession[] = sessionsData.sessions ?? [];
      setLastSession(sessions[0] ?? null);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "not_authenticated") {
        navigate("/");
        return;
      }
      setError("Não foi possível carregar os dados do paciente.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async (formData: {
    name: string;
    birth_date: string;
    gender: string;
    clinical_notes: string;
  }) => {
    await apiFetch(`/patients/${id}`, {
      method: "PUT",
      body: JSON.stringify(formData),
    });
    setShowEditModal(false);
    if (id) await loadData(id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#29D68B]" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Paciente não encontrado.</p>
          <Button onClick={() => navigate("/patients")}>Voltar</Button>
        </div>
      </div>
    );
  }

  const age = calcAge(patient.birth_date);
  const sppbBadge = getSPPBBadge(lastSession?.sppb_total);
  const tugBadge = getTUGBadge(lastSession?.tug_time);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => navigate("/patients")}
                className="p-2 hover:bg-gray-100 rounded-lg transition shrink-0"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{patient.name}</h1>
                <p className="text-sm text-gray-600">
                  {age != null ? `${age} anos` : ""}{age != null && patient.gender ? " \u2022 " : ""}{genderLabel(patient.gender) !== "\u2014" ? genderLabel(patient.gender) : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <Pencil className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-red-50 rounded-lg transition">
                <Trash2 className="w-5 h-5 text-red-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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

        {/* Informações do Paciente */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações do Paciente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Data de Nascimento</p>
                <p className="font-medium text-gray-900">
                  {patient.birth_date ? formatDateBR(patient.birth_date) : "\u2014"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Idade</p>
                <p className="font-medium text-gray-900">
                  {age != null ? `${age} anos` : "\u2014"}
                </p>
              </div>
            </div>
          </div>
          {patient.clinical_notes && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600 mb-1">Notas Clínicas</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{patient.clinical_notes}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Última Avaliação */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Última Avaliação</h2>
          {lastSession ? (
            <div className="flex flex-col min-[480px]:flex-row items-start justify-between gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Data</p>
                <p className="font-medium text-gray-900">
                  {formatDateBR(lastSession.date)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">SPPB Score</p>
                {sppbBadge ? (
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${sppbBadge.bg} ${sppbBadge.text}`}>
                    {lastSession.sppb_total}/12 - {sppbBadge.label}
                  </span>
                ) : (
                  <p className="font-medium text-gray-900">{"\u2014"}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">TUG</p>
                {tugBadge ? (
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${tugBadge.bg} ${tugBadge.text}`}>
                    {lastSession.tug_time}s - {tugBadge.label}
                  </span>
                ) : (
                  <p className="font-medium text-gray-900">{"\u2014"}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nenhuma avaliação registrada ainda.</p>
          )}
        </div>

        {/* Ações */}
        <div className="flex flex-col min-[480px]:flex-row gap-3">
          <button
            onClick={() => navigate(`/patients/${id}/session/new`)}
            className="flex-1 px-4 py-3 min-[480px]:px-6 min-[480px]:py-4 bg-[#29D68B] text-white rounded-lg font-semibold hover:bg-[#24c07d] transition"
          >
            Nova Sessão
          </button>
          <button
            onClick={() => navigate(`/patients/${id}/sessions`)}
            className="flex-1 px-4 py-3 min-[480px]:px-6 min-[480px]:py-4 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            Histórico de Sessões
          </button>
          <button
            onClick={() => navigate(`/patients/${id}/evolution`)}
            disabled={!lastSession}
            className="flex-1 px-4 py-3 min-[480px]:px-6 min-[480px]:py-4 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Evolução
          </button>
        </div>
      </main>

      {showEditModal && (
        <PatientFormModal
          patient={patient}
          onClose={() => setShowEditModal(false)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}
