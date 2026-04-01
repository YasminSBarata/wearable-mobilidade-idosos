import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Loader2, AlertTriangle, X, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Alert, AlertDescription } from "./ui/alert";
import { BalanceTestModule, type BalanceModuleData } from "./BalanceTestModule";
import { GaitSpeedModule, type GaitModuleData } from "./GaitSpeedModule";
import { ChairStandModule, type ChairStandModuleData } from "./ChairStandModule";
import { TUGModule, type TUGModuleData } from "./TUGModule";
import { SPPBScoreSummary } from "./SPPBScoreSummary";
import { apiFetch } from "../utils/api";
import { calculateSPPBTotal } from "../lib/scoring/sppb";
import type { TestSession } from "../lib/types";

interface EditSessionFormProps {
  patientId: string;
  sessionId: string;
  patientName?: string;
}

type Section = "info" | "balance" | "gait" | "chair" | "tug";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "info", label: "Dados da Sessão" },
  { id: "balance", label: "Equilíbrio" },
  { id: "gait", label: "Marcha" },
  { id: "chair", label: "Cadeira" },
  { id: "tug", label: "TUG" },
];

export function EditSessionForm({ patientId, sessionId, patientName }: EditSessionFormProps) {
  const navigate = useNavigate();

  const [session, setSession] = useState<TestSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Session info fields
  const [date, setDate] = useState("");
  const [examinerInitials, setExaminerInitials] = useState("");
  const [notes, setNotes] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  // Which section is expanded
  const [expanded, setExpanded] = useState<Section | null>(null);

  // Track which modules have been re-saved (to recalculate SPPB)
  const [balanceData, setBalanceData] = useState<BalanceModuleData | null>(null);
  const [gaitData, setGaitData] = useState<GaitModuleData | null>(null);
  const [chairData, setChairData] = useState<ChairStandModuleData | null>(null);
  const [tugData, setTugData] = useState<TUGModuleData | null>(null);

  // Load session data
  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch(`/sessions/${sessionId}`);
      const s: TestSession = data.session;
      setSession(s);
      setDate(s.date);
      setExaminerInitials(s.examiner_initials ?? "");
      setNotes(s.notes ?? "");
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "not_authenticated") {
        navigate("/");
        return;
      }
      setError("Não foi possível carregar a sessão.");
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const toggleSection = (id: Section) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  // Save session info (date, examiner, notes)
  const handleSaveInfo = async () => {
    setSavingInfo(true);
    setError("");
    try {
      await apiFetch(`/sessions/${sessionId}`, {
        method: "PUT",
        body: JSON.stringify({
          date,
          examiner_initials: examinerInitials || null,
          notes: notes || null,
        }),
      });
      setSession((prev) => prev ? { ...prev, date, examiner_initials: examinerInitials || null, notes: notes || null } : prev);
      showSuccess("Dados da sessão atualizados.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSavingInfo(false);
    }
  };

  // Save a test module
  const saveModule = async (payload: object, label: string) => {
    setError("");
    try {
      await apiFetch(`/sessions/${sessionId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      showSuccess(`${label} atualizado.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
      throw err;
    }
  };

  const handleSaveBalance = async (data: BalanceModuleData) => {
    await saveModule(data, "Equilíbrio");
    setBalanceData(data);
    setSession((prev) => prev ? { ...prev, ...data } : prev);
    // Recalculate SPPB total
    const sppb_total = calculateSPPBTotal(
      data.balance_total,
      gaitData?.gait_score ?? session?.gait_score,
      chairData?.chair_score ?? session?.chair_score,
    );
    await apiFetch(`/sessions/${sessionId}`, {
      method: "PUT",
      body: JSON.stringify({ sppb_total }),
    });
    setSession((prev) => prev ? { ...prev, sppb_total } : prev);
  };

  const handleSaveGait = async (data: GaitModuleData) => {
    await saveModule(data, "Marcha");
    setGaitData(data);
    setSession((prev) => prev ? { ...prev, ...data } : prev);
    const sppb_total = calculateSPPBTotal(
      balanceData?.balance_total ?? session?.balance_total,
      data.gait_score,
      chairData?.chair_score ?? session?.chair_score,
    );
    await apiFetch(`/sessions/${sessionId}`, {
      method: "PUT",
      body: JSON.stringify({ sppb_total }),
    });
    setSession((prev) => prev ? { ...prev, sppb_total } : prev);
  };

  const handleSaveChair = async (data: ChairStandModuleData) => {
    await saveModule(data, "Cadeira");
    setChairData(data);
    setSession((prev) => prev ? { ...prev, ...data } : prev);
    const sppb_total = calculateSPPBTotal(
      balanceData?.balance_total ?? session?.balance_total,
      gaitData?.gait_score ?? session?.gait_score,
      data.chair_score,
    );
    await apiFetch(`/sessions/${sessionId}`, {
      method: "PUT",
      body: JSON.stringify({ sppb_total }),
    });
    setSession((prev) => prev ? { ...prev, sppb_total } : prev);
  };

  const handleSaveTUG = async (data: TUGModuleData) => {
    await saveModule(data, "TUG");
    setTugData(data);
    setSession((prev) => prev ? { ...prev, ...data } : prev);
  };

  // Current scores for the summary
  const currentBalance = balanceData?.balance_total ?? session?.balance_total ?? null;
  const currentGait = gaitData?.gait_score ?? session?.gait_score ?? null;
  const currentChair = chairData?.chair_score ?? session?.chair_score ?? null;
  const currentTugTime = tugData?.tug_time ?? session?.tug_time ?? null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#29D68B]" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Sessão não encontrada.</p>
          <Button onClick={() => navigate(`/patients/${patientId}/sessions`)}>
            Voltar ao histórico
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/patients/${patientId}/sessions`)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-gray-900">Editar Sessão</h1>
              {patientName && (
                <p className="text-xs text-gray-500 truncate">{patientName}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Error */}
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

        {/* Success */}
        {successMsg && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-700 text-sm font-medium">
              {successMsg}
            </AlertDescription>
          </Alert>
        )}

        {/* Score summary */}
        <SPPBScoreSummary
          balanceTotal={currentBalance}
          gaitScore={currentGait}
          chairScore={currentChair}
          tugTime={currentTugTime}
        />

        {/* Collapsible sections */}
        {SECTIONS.map(({ id, label }) => {
          const isExpanded = expanded === id;

          return (
            <div key={id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection(id)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-semibold text-gray-900">{label}</span>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {isExpanded && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  {id === "info" && (
                    <div className="space-y-4 pt-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-date">Data da avaliação</Label>
                        <Input
                          id="edit-date"
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-examiner">Iniciais do examinador</Label>
                        <Input
                          id="edit-examiner"
                          value={examinerInitials}
                          onChange={(e) => setExaminerInitials(e.target.value)}
                          placeholder="Ex: JPS"
                          maxLength={10}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-notes">Observações</Label>
                        <Textarea
                          id="edit-notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Condições ambientais, estado geral do paciente..."
                          rows={3}
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleSaveInfo}
                        disabled={savingInfo}
                        className="w-full bg-[#29D68B] hover:bg-[#22c07a] text-white"
                      >
                        {savingInfo ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
                        ) : (
                          "Salvar Dados da Sessão"
                        )}
                      </Button>
                    </div>
                  )}

                  {id === "balance" && (
                    <div className="pt-4">
                      <BalanceTestModule
                        onSave={handleSaveBalance}
                        editMode
                        initialData={balanceData ?? {
                          balance_feet_together_result: session.balance_feet_together_result ?? "",
                          balance_feet_together_time: session.balance_feet_together_time ?? null,
                          balance_feet_together_score: session.balance_feet_together_score ?? 0,
                          balance_feet_together_failure_reason: session.balance_feet_together_failure_reason ?? null,
                          balance_semi_tandem_result: session.balance_semi_tandem_result ?? "",
                          balance_semi_tandem_time: session.balance_semi_tandem_time ?? null,
                          balance_semi_tandem_score: session.balance_semi_tandem_score ?? 0,
                          balance_semi_tandem_failure_reason: session.balance_semi_tandem_failure_reason ?? null,
                          balance_tandem_result: session.balance_tandem_result ?? "",
                          balance_tandem_time: session.balance_tandem_time ?? null,
                          balance_tandem_score: session.balance_tandem_score ?? 0,
                          balance_tandem_failure_reason: session.balance_tandem_failure_reason ?? null,
                          balance_total: session.balance_total ?? 0,
                        }}
                      />
                    </div>
                  )}

                  {id === "gait" && (
                    <div className="pt-4">
                      <GaitSpeedModule
                        onSave={handleSaveGait}
                        editMode
                        initialData={gaitData ?? {
                          gait_distance: session.gait_distance ?? 4,
                          gait_attempt1_time: session.gait_attempt1_time ?? null,
                          gait_attempt1_completed: session.gait_attempt1_completed ?? false,
                          gait_attempt1_failure_reason: session.gait_attempt1_failure_reason ?? null,
                          gait_attempt2_time: session.gait_attempt2_time ?? null,
                          gait_attempt2_completed: session.gait_attempt2_completed ?? false,
                          gait_attempt2_failure_reason: session.gait_attempt2_failure_reason ?? null,
                          gait_best_time: session.gait_best_time ?? null,
                          gait_score: session.gait_score ?? 0,
                          gait_oscillation_index_1: session.gait_oscillation_index_1 ?? null,
                          gait_oscillation_index_2: session.gait_oscillation_index_2 ?? null,
                        }}
                      />
                    </div>
                  )}

                  {id === "chair" && (
                    <div className="pt-4">
                      <ChairStandModule
                        onSave={handleSaveChair}
                        editMode
                        initialData={chairData ?? {
                          chair_pretest_passed: session.chair_pretest_passed ?? null,
                          chair_pretest_used_arms: session.chair_pretest_used_arms ?? null,
                          chair_pretest_failure_reason: session.chair_pretest_failure_reason ?? null,
                          chair_pretest_max_inclination: session.chair_pretest_max_inclination ?? null,
                          chair_time: session.chair_time ?? null,
                          chair_completed: session.chair_completed ?? false,
                          chair_failure_reason: session.chair_failure_reason ?? null,
                          chair_score: session.chair_score ?? 0,
                          chair_avg_inclination: session.chair_avg_inclination ?? null,
                          chair_inclination_per_rep: session.chair_inclination_per_rep ?? null,
                        }}
                      />
                    </div>
                  )}

                  {id === "tug" && (
                    <div className="pt-4">
                      <TUGModule
                        onSave={handleSaveTUG}
                        editMode
                        initialData={tugData ?? {
                          tug_time: session.tug_time ?? null,
                          tug_assistive_device: session.tug_assistive_device ?? null,
                          tug_footwear: session.tug_footwear ?? null,
                          tug_physical_help: session.tug_physical_help ?? false,
                          tug_safety_level: session.tug_safety_level ?? null,
                          tug_gait_pattern: session.tug_gait_pattern ?? null,
                          tug_balance_turn: session.tug_balance_turn ?? null,
                          tug_sit_control: session.tug_sit_control ?? null,
                          tug_instability: session.tug_instability ?? false,
                          tug_instability_notes: session.tug_instability_notes ?? null,
                          tug_pain: session.tug_pain ?? false,
                          tug_pain_notes: session.tug_pain_notes ?? null,
                          tug_compensatory_strategies: session.tug_compensatory_strategies ?? null,
                          tug_classification: session.tug_classification ?? null,
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Back button */}
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(`/patients/${patientId}/sessions`)}
          className="w-full"
        >
          Voltar ao histórico
        </Button>
      </div>
    </div>
  );
}
