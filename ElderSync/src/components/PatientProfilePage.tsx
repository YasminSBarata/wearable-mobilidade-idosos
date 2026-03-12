import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  User,
  ClipboardList,
  TrendingUp,
  Plus,
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

function calcAge(birthDate?: string | null): string {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return `${age} anos`;
}

function genderLabel(g?: string | null) {
  if (g === "M") return "Masculino";
  if (g === "F") return "Feminino";
  if (g === "outro") return "Outro";
  return "—";
}

function sppbClassification(total?: number | null): { label: string; color: string } | null {
  if (total == null) return null;
  if (total <= 3) return { label: "Limitação grave", color: "text-red-600" };
  if (total <= 6) return { label: "Limitação moderada", color: "text-orange-500" };
  if (total <= 9) return { label: "Limitação leve", color: "text-yellow-500" };
  return { label: "Sem limitação", color: "text-green-600" };
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

  const sppbInfo = sppbClassification(lastSession?.sppb_total);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/patients")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">{patient.name}</h1>
              <p className="text-sm text-gray-500">Perfil do paciente</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)} className="gap-1.5">
              <Pencil className="w-4 h-4" />
              Editar
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {error && (
          <Alert variant="destructive">
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

        {/* Dados cadastrais */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <User className="w-4 h-4" />
            Dados Cadastrais
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-0.5">Idade</p>
              <p className="font-medium text-gray-900">
                {calcAge(patient.birth_date) || "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-0.5">Nascimento</p>
              <p className="font-medium text-gray-900">
                {patient.birth_date
                  ? new Date(patient.birth_date).toLocaleDateString("pt-BR")
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-0.5">Sexo</p>
              <p className="font-medium text-gray-900">{genderLabel(patient.gender)}</p>
            </div>
            {patient.clinical_notes && (
              <div className="col-span-2 sm:col-span-3">
                <p className="text-gray-500 mb-0.5 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Notas Clínicas
                </p>
                <p className="font-medium text-gray-900 whitespace-pre-wrap">
                  {patient.clinical_notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Última sessão */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4" />
            Última Avaliação
          </h2>
          {lastSession ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-0.5">Data</p>
                <p className="font-medium text-gray-900">
                  {new Date(lastSession.date).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">SPPB Total</p>
                <p className="font-medium text-gray-900">
                  {lastSession.sppb_total != null ? `${lastSession.sppb_total}/12` : "—"}
                </p>
                {sppbInfo && (
                  <p className={`text-xs mt-0.5 ${sppbInfo.color}`}>{sppbInfo.label}</p>
                )}
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">TUG</p>
                <p className="font-medium text-gray-900">
                  {lastSession.tug_time != null ? `${lastSession.tug_time}s` : "—"}
                </p>
                {lastSession.tug_classification && (
                  <p className="text-xs text-gray-500 mt-0.5">{lastSession.tug_classification}</p>
                )}
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Examinador</p>
                <p className="font-medium text-gray-900">
                  {lastSession.examiner_initials || "—"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nenhuma avaliação registrada ainda.</p>
          )}
        </div>

        {/* Ações */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button
            onClick={() => navigate(`/patients/${id}/session/new`)}
            className="gap-2 h-12"
          >
            <Plus className="w-4 h-4" />
            Nova Sessão
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/patients/${id}/sessions`)}
            className="gap-2 h-12"
          >
            <ClipboardList className="w-4 h-4" />
            Histórico de Sessões
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/patients/${id}/evolution`)}
            className="gap-2 h-12"
            disabled
            title="Disponível após registrar sessões"
          >
            <TrendingUp className="w-4 h-4" />
            Evolução
          </Button>
        </div>
      </div>

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
