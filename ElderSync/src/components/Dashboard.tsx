import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { getSupabaseClient, checkSession } from "../utils/supabase/client";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

import {
  Activity,
  LogOut,
  Users,
  TrendingUp,
  Clock,
  Gauge,
  Shield,
  AlertTriangle,
  Zap,
  Target,
  PieChart,
  Cpu,
  History,
  X,
} from "lucide-react";
import { PatientCard } from "./PatientCard";
import { MetricCard } from "./MetricCard";
import { CircadianChart } from "./CircadianChart";
import { AddPatientModal } from "./AddPatientModal";
import { RegisterDeviceModal } from "./RegisterDeviceModal";
import { PatientHistory } from "./PatientHistory";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import logo from "../assets/Logo.svg";

export interface PatientData {
  id: string;
  name: string;
  age: number;
  lastUpdate: string;
  metrics: {
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
  };
}

export function Dashboard() {
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [error, setError] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const navigate = useNavigate();

  // Aguardar a sessão estar pronta antes de carregar dados
  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();

    const initSession = async () => {
      try {
        const { session, error } = await checkSession();
        if (!mounted) return;

        if (error) {
          console.error("[Dashboard] Erro ao verificar sessão", error);
          return;
        }

        if (session) {
          setSessionReady(true);
          setAccessToken(session.access_token);
        }
      } catch (err) {
        console.error("[Dashboard] Exceção ao inicializar sessão", err);
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (session) {
        setSessionReady(true);
        setAccessToken(session.access_token);
      } else if (event === "SIGNED_OUT") {
        setAccessToken(null);
        navigate("/");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Carregar pacientes quando a sessão estiver pronta
  useEffect(() => {
    if (sessionReady) {
      loadPatients();
    }
  }, [sessionReady]);

  const loadPatients = async () => {
    setLoading(true);
    setError("");
    try {
      const { session, error: sessionError } = await checkSession();

      if (sessionError) {
        console.error("[Dashboard] Erro ao obter sessão", sessionError);
        setError("Erro ao verificar sessão. Tente fazer login novamente.");
        return;
      }

      const token = session?.access_token;
      if (!token) {
        navigate("/");
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/patients`, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: supabaseAnonKey,
        },
      });

      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));
        setError(
          "Erro de autenticação no servidor: " +
            (errorData.error || "Token inválido"),
        );
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao carregar pacientes");
      }

      const data = await response.json();
      const loadedPatients = data.patients || [];
      setPatients(loadedPatients);

      if (loadedPatients.length === 0) {
        setSelectedPatient(null);
      } else {
        const currentSelectedExists = loadedPatients.some(
          (p: PatientData) => p.id === selectedPatient?.id,
        );
        if (!currentSelectedExists) {
          setSelectedPatient(loadedPatients[0]);
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      console.error("[Dashboard] Erro ao carregar pacientes", errorMessage);
      setError(
        "Não foi possível carregar a lista de pacientes. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    localStorage.removeItem("user_email");
    navigate("/");
  };

  const handleDeletePatient = async (patientId: string) => {
    try {
      const { session } = await checkSession();
      const token = session?.access_token;

      if (!token) {
        setError("Sessão expirada. Faça login novamente.");
        setTimeout(() => navigate("/"), 2000);
        return;
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/patients/${patientId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: supabaseAnonKey,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao remover paciente");
      }

      if (selectedPatient?.id === patientId) {
        setSelectedPatient(null);
      }

      await loadPatients();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      console.error("[Dashboard] Erro ao remover paciente", errorMessage);
      setError("Não foi possível remover o paciente: " + errorMessage);
    }
  };

  const handleAddPatient = async (patientData: Omit<PatientData, "id">) => {
    try {
      const { session } = await checkSession();
      const token = session?.access_token;

      if (!token) {
        setError("Sessão expirada. Faça login novamente.");
        setTimeout(() => navigate("/"), 2000);
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/patients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify(patientData),
      });

      if (response.status === 401) {
        const supabase = getSupabaseClient();
        await supabase.auth.signOut();
        setError("Sessão expirada. Você será redirecionado para o login.");
        setTimeout(() => navigate("/"), 2000);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao adicionar paciente");
      }

      await loadPatients();
      setShowAddModal(false);
      setError("");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      console.error("[Dashboard] Erro ao adicionar paciente", errorMessage);
      setError("Não foi possível adicionar o paciente: " + errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#272727] p-2 rounded-lg">
                <img src={logo} alt="ElderSync" className="h-10" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ElderSync</h1>
                <p className="text-sm text-gray-600">
                  Dashboard de Monitoramento
                </p>
              </div>
            </div>
            <Button variant="ghost" onClick={handleLogout} className="gap-2">
              <LogOut className="w-5 h-5" />
              <span>Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mensagem de erro global */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="size-4" />
            <AlertDescription>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-semibold">Erro</p>
                  <p className="text-sm">{error}</p>
                </div>
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Lista de Pacientes */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Pacientes
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowAddModal(true)}
                  className="h-auto p-0 text-sm"
                >
                  + Adicionar
                </Button>
              </div>

              {patients.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm mb-4">
                    Nenhum paciente cadastrado
                  </p>
                  <Button
                    variant="ghost"
                    onClick={() => setShowAddModal(true)}
                    className="text-sm"
                  >
                    Adicionar primeiro paciente
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {patients.map((patient) => (
                    <PatientCard
                      key={patient.id}
                      patient={patient}
                      isSelected={selectedPatient?.id === patient.id}
                      onClick={() => setSelectedPatient(patient)}
                      onDelete={handleDeletePatient}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Métricas do Paciente Selecionado */}
          <div className="lg:col-span-3">
            {selectedPatient ? (
              <>
                {/* Informações do Paciente */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {selectedPatient.name}
                      </h2>
                      <p className="text-gray-600">
                        Idade: {selectedPatient.age} anos
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setShowHistoryModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition font-medium text-sm cursor-pointer"
                      >
                        <History className="w-4 h-4" />
                        Ver Histórico
                      </button>
                      <button
                        onClick={() => setShowDeviceModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#29D68B]/10 text-[#29D68B] border border-[#29D68B]/30 rounded-lg hover:bg-[#29D68B]/20 transition font-medium text-sm cursor-pointer"
                      >
                        <Cpu className="w-4 h-4" />
                        Registrar Dispositivo
                      </button>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          Última atualização
                        </p>
                        <p className="font-semibold text-gray-700">
                          {selectedPatient.lastUpdate}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid de Métricas */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <MetricCard
                    title="Contagem de Passos"
                    value={selectedPatient.metrics.stepCount.toLocaleString()}
                    unit="passos/dia"
                    icon={<Activity className="w-5 h-5" />}
                    color="primary"
                    description="Picos no acelerômetro eixo Z > 1.2g, filtro passa-alta, intervalo mín. 0.3s"
                  />

                  <MetricCard
                    title="Cadência Média"
                    value={selectedPatient.metrics.averageCadence.toFixed(1)}
                    unit="passos/min"
                    icon={<Gauge className="w-5 h-5" />}
                    color="primary"
                    description="Passos detectados / tempo em movimento"
                  />

                  <MetricCard
                    title="Velocidade de Marcha"
                    value={selectedPatient.metrics.gaitSpeed.toFixed(2)}
                    unit="m/s"
                    icon={<TrendingUp className="w-5 h-5" />}
                    color="primary"
                    description="Cadência × 0.7m (comprimento médio de passo para idosos)"
                  />

                  <MetricCard
                    title="Estabilidade Postural"
                    value={selectedPatient.metrics.posturalStability.toFixed(0)}
                    unit="/100"
                    icon={<Shield className="w-5 h-5" />}
                    color="primary"
                    progress={selectedPatient.metrics.posturalStability}
                    description="Desvio padrão da aceleração em pé (janela 10s). Menor variação = mais estável"
                  />

                  <MetricCard
                    title="TUG Estimado"
                    value={selectedPatient.metrics.tugEstimated.toFixed(1)}
                    unit="segundos"
                    icon={<Clock className="w-5 h-5" />}
                    color="primary"
                    description="Tempo entre transição sentado→em pé→caminhada→sentado"
                  />

                  <MetricCard
                    title="Transições Bruscas"
                    value={selectedPatient.metrics.abruptTransitions.toString()}
                    unit="eventos/dia"
                    icon={<Zap className="w-5 h-5" />}
                    color="warning"
                    alert={selectedPatient.metrics.abruptTransitions > 10}
                    description="Mudanças de orientação > 45° em < 1s"
                  />
                </div>

                {/* Tempo de Atividade */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Distribuição de Tempo
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Classificação: ângulo (giroscópio) + magnitude aceleração
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600 mb-1">Sentado</p>
                      <p className="text-2xl font-bold text-gray-700">
                        {selectedPatient.metrics.timeSeated.toFixed(1)}h
                      </p>
                      <p className="text-xs text-gray-500 mb-2">
                        {(
                          (selectedPatient.metrics.timeSeated / 24) *
                          100
                        ).toFixed(0)}
                        % do dia
                      </p>
                      <p className="text-xs text-gray-400">~90°, accel ~1g</p>
                    </div>
                    <div className="text-center p-4 bg-[#29D68B]/10 rounded-lg border border-[#29D68B]/30">
                      <p className="text-sm text-gray-600 mb-1">Em Pé</p>
                      <p className="text-2xl font-bold text-[#29D68B]">
                        {selectedPatient.metrics.timeStanding.toFixed(1)}h
                      </p>
                      <p className="text-xs text-gray-500 mb-2">
                        {(
                          (selectedPatient.metrics.timeStanding / 24) *
                          100
                        ).toFixed(0)}
                        % do dia
                      </p>
                      <p className="text-xs text-gray-400">~0°, accel ~1g</p>
                    </div>
                    <div className="text-center p-4 bg-[#29D68B]/10 rounded-lg border border-[#29D68B]/30">
                      <p className="text-sm text-gray-600 mb-1">Caminhando</p>
                      <p className="text-2xl font-bold text-[#29D68B]">
                        {selectedPatient.metrics.timeWalking.toFixed(1)}h
                      </p>
                      <p className="text-xs text-gray-500 mb-2">
                        {(
                          (selectedPatient.metrics.timeWalking / 24) *
                          100
                        ).toFixed(0)}
                        % do dia
                      </p>
                      <p className="text-xs text-gray-400">
                        Variação periódica
                      </p>
                    </div>
                  </div>
                </div>

                {/* Alertas e Inatividade */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Alertas
                    </h3>
                    <div className="space-y-3">
                      <div
                        className={`p-4 rounded-lg ${selectedPatient.metrics.fallsDetected ? "bg-red-50 border border-red-200" : "bg-[#29D68B]/10 border border-[#29D68B]/30"}`}
                      >
                        <p className="font-semibold mb-1">
                          {selectedPatient.metrics.fallsDetected
                            ? "⚠️ Queda Detectada"
                            : "✓ Sem Quedas"}
                        </p>
                        {selectedPatient.metrics.fallsDetected &&
                          selectedPatient.metrics.fallsTimestamp && (
                            <p className="text-sm text-gray-600 mb-2">
                              Último registro:{" "}
                              {selectedPatient.metrics.fallsTimestamp}
                            </p>
                          )}
                        <p className="text-xs text-gray-500 mt-2">
                          Detecção: accel &gt; 2.5g + ângulo ~90°±20° + sem
                          movimento &gt; 5s
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Inatividade Prolongada
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">
                      Aceleração total &lt; 0.15g por &gt; 2h consecutivas
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Episódios</span>
                        <span className="text-2xl font-bold text-[#29D68B]">
                          {selectedPatient.metrics.inactivityEpisodes}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Duração média</span>
                        <span className="text-xl font-semibold text-gray-700">
                          {selectedPatient.metrics.inactivityAvgDuration.toFixed(
                            0,
                          )}{" "}
                          min
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Padrão Circadiano */}
                <CircadianChart
                  data={selectedPatient.metrics.circadianPattern}
                />
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  Selecione um paciente para visualizar os dados
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddPatientModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddPatient}
        />
      )}

      {showDeviceModal && selectedPatient && accessToken && (
        <RegisterDeviceModal
          patientId={selectedPatient.id}
          patientName={selectedPatient.name}
          accessToken={accessToken}
          onClose={() => setShowDeviceModal(false)}
          onSuccess={() => {
            console.log("Dispositivo registrado com sucesso!");
          }}
        />
      )}

      {showHistoryModal && selectedPatient && accessToken && (
        <PatientHistory
          patientId={selectedPatient.id}
          patientName={selectedPatient.name}
          accessToken={accessToken}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  );
}
