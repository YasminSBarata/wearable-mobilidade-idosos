import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Users, Search, LogOut, Plus, AlertTriangle, X } from "lucide-react";
import { getSupabaseClient } from "../utils/supabase/client";
import { apiFetch } from "../utils/api";
import { PatientCard } from "./PatientCard";
import { PatientFormModal } from "./PatientFormModal";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Alert, AlertDescription } from "./ui/alert";
import type { Patient, TestSession } from "../lib/types";
import logo from "../assets/Logo.svg";

export function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [lastSessions, setLastSessions] = useState<Record<string, TestSession>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/patients");
      const list: Patient[] = data.patients ?? [];
      setPatients(list);
      await loadLastSessions(list);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "not_authenticated") {
        navigate("/");
        return;
      }
      setError("Não foi possível carregar a lista de pacientes.");
    } finally {
      setLoading(false);
    }
  };

  const loadLastSessions = async (list: Patient[]) => {
    if (list.length === 0) return;
    try {
      const map: Record<string, TestSession> = {};
      await Promise.all(
        list.map(async (p) => {
          try {
            const data = await apiFetch(`/sessions?patient_id=${p.id}&limit=1`);
            const sessions: TestSession[] = data.sessions ?? [];
            if (sessions.length > 0) map[p.id] = sessions[0];
          } catch {
            // silently ignore per-patient errors
          }
        }),
      );
      setLastSessions(map);
    } catch {
      // non-critical
    }
  };

  const handleAddPatient = async (formData: {
    name: string;
    birth_date: string;
    gender: string;
    clinical_notes: string;
  }) => {
    await apiFetch("/patients", {
      method: "POST",
      body: JSON.stringify(formData),
    });
    setShowAddModal(false);
    await loadPatients();
  };

  const handleDeletePatient = async (patientId: string) => {
    try {
      await apiFetch(`/patients/${patientId}`, { method: "DELETE" });
      await loadPatients();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao remover paciente.");
    }
  };

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    navigate("/");
  };

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#272727] p-2 rounded-lg">
                <img src={logo} alt="ElderSync" className="h-10" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ElderSync</h1>
                <p className="text-sm text-gray-600">Avaliação Funcional</p>
              </div>
            </div>
            <Button variant="ghost" onClick={handleLogout} className="gap-2">
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="size-4" />
            <AlertDescription>
              <div className="flex items-start justify-between gap-2">
                <span>{error}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setError("")}
                  className="h-5 w-5 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Título + botão */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Pacientes
          </h2>
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Paciente
          </Button>
        </div>

        {/* Busca */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            type="text"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "2.5rem" }}
          />
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#29D68B]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Users className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">
              {search ? "Nenhum paciente encontrado." : "Nenhum paciente cadastrado."}
            </p>
            {!search && (
              <Button variant="outline" onClick={() => setShowAddModal(true)}>
                Adicionar primeiro paciente
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((patient) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                lastSession={lastSessions[patient.id]}
                onClick={() => navigate(`/patients/${patient.id}`)}
                onDelete={handleDeletePatient}
              />
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <PatientFormModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddPatient}
        />
      )}
    </div>
  );
}
