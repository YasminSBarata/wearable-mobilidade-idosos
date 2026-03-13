import { useState } from "react";
import { Armchair, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Stopwatch } from "./Stopwatch";
import { FailureReasonSelect } from "./FailureReasonSelect";
import { scoreChairStandModule } from "../lib/scoring/chairStand";

export interface ChairStandModuleData {
  chair_pretest_passed: boolean | null;
  chair_pretest_used_arms: boolean | null;
  chair_pretest_failure_reason: string | null;
  chair_time: number | null;
  chair_completed: boolean;
  chair_failure_reason: string | null;
  chair_score: number;
}

interface ChairStandModuleProps {
  onSave: (data: ChairStandModuleData) => Promise<void>;
  initialData?: Partial<ChairStandModuleData> | null;
  disabled?: boolean;
}

/**
 * Módulo de levantar-se da cadeira SPPB.
 * Pré-teste: levantar UMA vez sem usar os braços.
 * Teste principal: 5 repetições o mais rápido possível (máx. 60s).
 */
export function ChairStandModule({ onSave, initialData, disabled }: ChairStandModuleProps) {
  // Pré-teste
  const [pretestDone, setPretestDone] = useState(initialData?.chair_pretest_passed != null);
  const [pretestPassed, setPretestPassed] = useState<boolean | null>(
    initialData?.chair_pretest_passed ?? null,
  );
  const [pretestUsedArms, setPretestUsedArms] = useState<boolean | null>(
    initialData?.chair_pretest_used_arms ?? null,
  );
  const [pretestFailureReason, setPretestFailureReason] = useState(
    initialData?.chair_pretest_failure_reason ?? "",
  );

  // Teste principal
  const [mainTime, setMainTime] = useState<number | null>(initialData?.chair_time ?? null);
  const [mainCompleted, setMainCompleted] = useState<boolean | null>(
    initialData?.chair_time != null ? initialData.chair_completed ?? null : null,
  );
  const [mainFailureReason, setMainFailureReason] = useState(
    initialData?.chair_failure_reason ?? "",
  );
  const [mainConfirmed, setMainConfirmed] = useState(initialData?.chair_time != null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(
    initialData?.chair_pretest_passed != null,
  );

  const { chair_score } = scoreChairStandModule(
    pretestPassed,
    mainCompleted === true ? mainTime : null,
    mainCompleted ?? undefined,
  );

  const canSave =
    pretestDone &&
    (pretestPassed === false || mainConfirmed) &&
    !saving &&
    !saved;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        chair_pretest_passed: pretestPassed,
        chair_pretest_used_arms: pretestUsedArms,
        chair_pretest_failure_reason: pretestFailureReason || null,
        chair_time: mainTime,
        chair_completed: mainCompleted ?? false,
        chair_failure_reason: mainFailureReason || null,
        chair_score,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Armchair className="w-4 h-4 text-[#29D68B]" />
          <h3 className="text-sm font-semibold text-gray-900">Levantar-se da Cadeira</h3>
        </div>
        {pretestDone && (
          <span className="text-sm font-bold text-gray-900">
            Pontuação: {chair_score}/4
          </span>
        )}
      </div>

      {/* Pré-teste */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-800">Pré-teste — Uma repetição</p>
        <p className="text-xs text-gray-500">
          Paciente com braços cruzados no peito. Solicitar que levante da cadeira UMA vez.
          Se não conseguir, o teste principal não é realizado.
        </p>

        {!pretestDone ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className="gap-1.5 flex-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={disabled}
                onClick={() => {
                  setPretestPassed(true);
                  setPretestUsedArms(false);
                  setPretestDone(true);
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Passou (sem braços)
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5 flex-1"
                disabled={disabled}
                onClick={() => {
                  setPretestPassed(false);
                  setPretestUsedArms(true);
                  setPretestDone(true);
                }}
              >
                <XCircle className="w-3.5 h-3.5" />
                Falhou / Usou braços
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {pretestPassed ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            <span className="text-sm font-medium text-gray-700">
              {pretestPassed ? "Passou" : "Falhou — teste principal não realizado"}
            </span>
            {!saved && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto h-7 px-2 text-xs"
                onClick={() => {
                  setPretestDone(false);
                  setPretestPassed(null);
                  setPretestUsedArms(null);
                  setPretestFailureReason("");
                }}
              >
                Editar
              </Button>
            )}
          </div>
        )}

        {pretestDone && !pretestPassed && (
          <FailureReasonSelect
            value={pretestFailureReason}
            onChange={setPretestFailureReason}
            placeholder="Motivo da falha no pré-teste (opcional)"
            disabled={saved}
          />
        )}
      </div>

      {/* Teste principal — só aparece se pré-teste passou */}
      {pretestDone && pretestPassed && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-800">Teste principal — 5 repetições</p>
          <p className="text-xs text-gray-500">
            Instruir paciente a levantar e sentar 5 vezes o mais rápido possível, sem usar os braços.
            Tempo máximo: 60 segundos.
          </p>

          {!mainConfirmed ? (
            <div className="space-y-3">
              <Stopwatch
                onStop={(t) => setMainTime(t)}
                initialDisplay={mainTime}
                disabled={disabled}
              />

              {mainTime != null && mainCompleted === null && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5 flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setMainCompleted(true)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Completou 5 reps
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5 flex-1"
                    onClick={() => setMainCompleted(false)}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Não completou
                  </Button>
                </div>
              )}

              {mainCompleted === false && (
                <FailureReasonSelect
                  value={mainFailureReason}
                  onChange={setMainFailureReason}
                  placeholder="Motivo de não completar"
                />
              )}

              {mainTime != null && mainCompleted !== null && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setMainConfirmed(true)}
                  className="bg-[#29D68B] hover:bg-[#22c07a] text-white"
                >
                  Confirmar tempo
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {mainCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              <span className="text-sm font-medium text-gray-900">
                {mainTime != null ? `${mainTime.toFixed(1)}s` : "—"}
              </span>
              <span className="text-xs text-gray-500">→ {chair_score} pontos</span>
              {!saved && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7 px-2 text-xs"
                  onClick={() => {
                    setMainConfirmed(false);
                    setMainTime(null);
                    setMainCompleted(null);
                    setMainFailureReason("");
                  }}
                >
                  Editar
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {!saved && (
        <Button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="w-full bg-[#29D68B] hover:bg-[#22c07a] text-white disabled:opacity-40"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
          ) : (
            "Salvar Cadeira e Continuar"
          )}
        </Button>
      )}
      {saved && (
        <p className="text-center text-sm text-green-600 font-medium">
          ✓ Levantar-se salvo — pontuação: {chair_score}/4
        </p>
      )}
    </div>
  );
}
