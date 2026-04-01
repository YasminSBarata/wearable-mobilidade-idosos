import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Loader2, AlertTriangle, X, Wifi } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Alert, AlertDescription } from "./ui/alert";
import { BalanceTestModule, type BalanceModuleData } from "./BalanceTestModule";
import { GaitSpeedModule, type GaitModuleData } from "./GaitSpeedModule";
import { ChairStandModule, type ChairStandModuleData } from "./ChairStandModule";
import { TUGModule, type TUGModuleData } from "./TUGModule";
import { DeviceStatusBadge } from "./DeviceStatusBadge";
import { apiFetch } from "../utils/api";
import { calculateSPPBTotal } from "../lib/scoring/sppb";
import { todayLocal } from "../utils/date";
import { useDeviceSession } from "../hooks/useDeviceSession";

interface NewSessionFormProps {
  patientId: string;
  patientName?: string;
}

type Step = "info" | "balance" | "gait" | "chair" | "tug" | "done";

const STEPS: { id: Step; label: string }[] = [
  { id: "info",    label: "Sessão" },
  { id: "balance", label: "Equilíbrio" },
  { id: "gait",    label: "Marcha" },
  { id: "chair",   label: "Cadeira" },
  { id: "tug",     label: "TUG" },
  { id: "done",    label: "Resumo" },
];

const STEP_INDEX: Record<Step, number> = {
  info: 0, balance: 1, gait: 2, chair: 3, tug: 4, done: 5,
};

/**
 * Formulário completo de nova sessão SPPB + TUG.
 * Cria a sessão no backend ao iniciar, depois salva incrementalmente módulo a módulo.
 */
export function NewSessionForm({ patientId, patientName }: NewSessionFormProps) {
  const navigate = useNavigate();

  // Etapa atual
  const [step, setStep] = useState<Step>("info");

  // Sessão
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [date, setDate] = useState(todayLocal);
  const [examinerInitials, setExaminerInitials] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);

  // Device ID (opcional — MAC address do ESP32)
  const [deviceId, setDeviceId] = useState("4022D8FF9810");

  // Dados de cada módulo
  const [balanceData, setBalanceData] = useState<BalanceModuleData | null>(null);
  const [gaitData, setGaitData] = useState<GaitModuleData | null>(null);
  const [chairData, setChairData] = useState<ChairStandModuleData | null>(null);
  const [tugData, setTugData] = useState<TUGModuleData | null>(null);

  // Erros globais
  const [error, setError] = useState("");

  // IoT hook — dispositivo é opcional, nunca bloqueia o fluxo
  const hasDevice = deviceId.trim().length > 0;
  const device = useDeviceSession(sessionId, hasDevice ? deviceId.trim() : null);

  // ── Criar sessão ────────────────────────────────────────────────────────────
  const handleCreateSession = async () => {
    setCreating(true);
    setError("");
    try {
      const data = await apiFetch("/sessions", {
        method: "POST",
        body: JSON.stringify({
          patient_id: patientId,
          date,
          examiner_initials: examinerInitials || null,
          notes: notes || null,
        }),
      });
      setSessionId(data.session.id);
      setStep("balance");
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "not_authenticated") {
        navigate("/");
        return;
      }
      setError("Não foi possível criar a sessão. Tente novamente.");
    } finally {
      setCreating(false);
    }
  };

  // ── Salvar módulo e avançar ─────────────────────────────────────────────────
  const saveModule = async (payload: object, nextStep: Step) => {
    if (!sessionId) return;
    await apiFetch(`/sessions/${sessionId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    device.resetDevice();
    setStep(nextStep);
  };

  const handleSaveBalance = async (data: BalanceModuleData) => {
    await saveModule(data, "gait");
    setBalanceData(data);
  };

  const handleSaveGait = async (data: GaitModuleData) => {
    await saveModule(data, "chair");
    setGaitData(data);
  };

  const handleSaveChair = async (data: ChairStandModuleData) => {
    await saveModule(data, "tug");
    setChairData(data);
  };

  const handleSaveTUG = async (data: TUGModuleData) => {
    const sppb_total = calculateSPPBTotal(
      balanceData?.balance_total,
      gaitData?.gait_score,
      chairData?.chair_score,
    );
    await saveModule({ ...data, sppb_total }, "done");
    setTugData(data);
  };

  // ── Barra de progresso ──────────────────────────────────────────────────────
  const currentIndex = STEP_INDEX[step];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/patients/${patientId}`)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-gray-900">Nova Sessão</h1>
              {patientName && (
                <p className="text-xs text-gray-500 truncate">{patientName}</p>
              )}
            </div>
            <DeviceStatusBadge
              deviceState={device.deviceState}
              isCalibrated={device.isCalibrated}
              deviceError={device.deviceError}
              hasDevice={hasDevice}
            />
          </div>

          {/* Steps */}
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <div
                  className={`
                    flex-1 h-1.5 rounded-full transition-colors
                    ${i < currentIndex ? "bg-[#29D68B]" : i === currentIndex ? "bg-[#29D68B]/50" : "bg-gray-200"}
                  `}
                />
                {i < STEPS.length - 1 && (
                  <span
                    className={`text-xs mx-1 shrink-0 hidden sm:block transition-colors ${
                      i <= currentIndex ? "text-gray-700 font-medium" : "text-gray-400"
                    }`}
                  >
                    {s.label}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Erro global */}
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

        {/* Aviso de dispositivo IoT (não-bloqueante) */}
        {device.deviceError && (
          <Alert>
            <AlertDescription className="text-xs text-amber-700">
              Dispositivo IoT: {device.deviceError}. Registre os dados manualmente.
            </AlertDescription>
          </Alert>
        )}

        {/* ── Step: info ── */}
        {step === "info" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <h2 className="text-base font-semibold text-gray-900">Dados da Sessão</h2>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="session-date">Data da avaliação</Label>
                <Input
                  id="session-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="session-examiner">Iniciais do examinador</Label>
                <Input
                  id="session-examiner"
                  value={examinerInitials}
                  onChange={(e) => setExaminerInitials(e.target.value)}
                  placeholder="Ex: JPS"
                  maxLength={10}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="session-notes">Observações (opcional)</Label>
                <Textarea
                  id="session-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Condições ambientais, estado geral do paciente..."
                  rows={3}
                />
              </div>

              {/* Dispositivo IoT (opcional) */}
              <div className="space-y-1.5">
                <Label htmlFor="device-id" className="flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5" />
                  Dispositivo sensor (opcional)
                </Label>
                <Input
                  id="device-id"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value.toUpperCase())}
                  placeholder="MAC address do ESP32 — ex: AABBCCDDEEFF"
                  maxLength={12}
                />
                <p className="text-xs text-gray-400">
                  Deixe vazio para registrar dados manualmente, sem sensor.
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleCreateSession}
              disabled={creating || !date}
              className="w-full bg-[#29D68B] hover:bg-[#22c07a] text-white"
            >
              {creating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando sessão...</>
              ) : (
                "Iniciar Avaliação →"
              )}
            </Button>
          </div>
        )}

        {/* ── Step: balance ── */}
        {step === "balance" && (
          <div className="space-y-4">
            {/* Calibração — aparece antes do primeiro teste se há dispositivo */}
            {hasDevice && !device.isCalibrated && (
              <CalibrationCard
                deviceState={device.deviceState}
                onCalibrate={device.calibrate}
              />
            )}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <BalanceTestModule
                onSave={handleSaveBalance}
                device={hasDevice ? device : undefined}
              />
            </div>
          </div>
        )}

        {/* ── Step: gait ── */}
        {step === "gait" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <GaitSpeedModule
              onSave={handleSaveGait}
              device={hasDevice ? device : undefined}
            />
          </div>
        )}

        {/* ── Step: chair ── */}
        {step === "chair" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <ChairStandModule
              onSave={handleSaveChair}
              device={hasDevice ? device : undefined}
            />
          </div>
        )}

        {/* ── Step: tug ── */}
        {step === "tug" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <TUGModule
              onSave={handleSaveTUG}
              device={hasDevice ? device : undefined}
            />
          </div>
        )}

        {/* ── Step: done ── */}
        {step === "done" && (
          <SessionSummary
            balanceData={balanceData}
            gaitData={gaitData}
            chairData={chairData}
            tugData={tugData}
            onFinish={() => navigate(`/patients/${patientId}/sessions`)}
          />
        )}
      </div>
    </div>
  );
}

// ── Card de calibração ──────────────────────────────────────────────────────

interface CalibrationCardProps {
  deviceState: string;
  onCalibrate: () => Promise<void>;
}

function CalibrationCard({ deviceState, onCalibrate }: CalibrationCardProps) {
  const isCalibrating = deviceState === "calibrating";

  return (
    <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-amber-800">
        Calibração do sensor
      </h3>
      <p className="text-xs text-amber-700">
        Posicione o paciente parado na posição de teste e fixe o sensor.
        A calibração leva 5 segundos e define o ponto zero para as medições.
      </p>
      <Button
        type="button"
        onClick={onCalibrate}
        disabled={isCalibrating}
        variant="outline"
        className="border-amber-300 text-amber-800 hover:bg-amber-100"
      >
        {isCalibrating ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Calibrando (5s)...</>
        ) : (
          "Calibrar sensor"
        )}
      </Button>
    </div>
  );
}

// ── Resumo inline ─────────────────────────────────────────────────────────────

interface SessionSummaryProps {
  balanceData: BalanceModuleData | null;
  gaitData: GaitModuleData | null;
  chairData: ChairStandModuleData | null;
  tugData: TUGModuleData | null;
  onFinish: () => void;
}

import { SPPBScoreSummary } from "./SPPBScoreSummary";

function SessionSummary({
  balanceData,
  gaitData,
  chairData,
  tugData,
  onFinish,
}: SessionSummaryProps) {
  return (
    <div className="space-y-4">
      <SPPBScoreSummary
        balanceTotal={balanceData?.balance_total ?? null}
        gaitScore={gaitData?.gait_score ?? null}
        chairScore={chairData?.chair_score ?? null}
        tugTime={tugData?.tug_time ?? null}
      />
      <Button
        type="button"
        onClick={onFinish}
        className="w-full bg-[#29D68B] hover:bg-[#22c07a] text-white"
      >
        Ver histórico de sessões →
      </Button>
    </div>
  );
}
