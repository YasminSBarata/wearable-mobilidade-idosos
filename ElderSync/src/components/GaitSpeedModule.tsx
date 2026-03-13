import { useState } from "react";
import { Footprints, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Stopwatch } from "./Stopwatch";
import { FailureReasonSelect } from "./FailureReasonSelect";
import { scoreGaitFromAttempts } from "../lib/scoring/gait";
import type { GaitDistance } from "../lib/scoring/gait";

export interface GaitModuleData {
  gait_distance: number;
  gait_attempt1_time: number | null;
  gait_attempt1_completed: boolean;
  gait_attempt1_failure_reason: string | null;
  gait_attempt2_time: number | null;
  gait_attempt2_completed: boolean;
  gait_attempt2_failure_reason: string | null;
  gait_best_time: number | null;
  gait_score: number;
}

interface AttemptState {
  time: number | null;
  completed: boolean;
  failureReason: string;
  confirmed: boolean;
}

interface GaitSpeedModuleProps {
  onSave: (data: GaitModuleData) => Promise<void>;
  initialData?: Partial<GaitModuleData> | null;
  disabled?: boolean;
}

function AttemptRow({
  label,
  attempt,
  onTimeRecorded,
  onComplete,
  locked,
}: {
  label: string;
  attempt: AttemptState;
  onTimeRecorded: (t: number) => void;
  onComplete: (completed: boolean, reason: string) => void;
  locked: boolean;
}) {
  const [completed, setCompleted] = useState<boolean | null>(
    attempt.confirmed ? attempt.completed : null,
  );
  const [failureReason, setFailureReason] = useState(attempt.failureReason);

  const confirmed = attempt.confirmed || locked;

  const handleConfirm = () => {
    if (completed === null) return;
    onComplete(completed, completed ? "" : failureReason);
  };

  if (confirmed) {
    return (
      <div className="flex items-center gap-3 py-2 border-t border-gray-100 first:border-t-0">
        <span className="text-sm text-gray-500 w-24 shrink-0">{label}</span>
        {attempt.completed ? (
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
        ) : (
          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
        )}
        <span className="text-sm font-medium text-gray-900">
          {attempt.time != null ? `${attempt.time.toFixed(1)}s` : "—"}
        </span>
        {!attempt.completed && attempt.failureReason && (
          <span className="text-xs text-gray-500">{attempt.failureReason}</span>
        )}
      </div>
    );
  }

  return (
    <div className="py-3 border-t border-gray-100 first:border-t-0 space-y-3">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <Stopwatch
        onStop={(t) => {
          onTimeRecorded(t);
        }}
        initialDisplay={attempt.time}
      />
      {attempt.time != null && completed === null && (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => setCompleted(true)}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completou
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setCompleted(false)}
          >
            <XCircle className="w-3.5 h-3.5" />
            Não completou
          </Button>
        </div>
      )}
      {completed === false && (
        <FailureReasonSelect
          value={failureReason}
          onChange={setFailureReason}
          placeholder="Motivo de não completar"
        />
      )}
      {attempt.time != null && completed !== null && (
        <Button
          type="button"
          size="sm"
          onClick={handleConfirm}
          className="bg-[#29D68B] hover:bg-[#22c07a] text-white"
        >
          Confirmar tentativa
        </Button>
      )}
    </div>
  );
}

/**
 * Módulo de velocidade de marcha SPPB — 2 tentativas, melhor tempo.
 */
export function GaitSpeedModule({ onSave, initialData, disabled }: GaitSpeedModuleProps) {
  const [distance, setDistance] = useState<GaitDistance>(
    (initialData?.gait_distance as GaitDistance) ?? 4,
  );
  const [attempt1, setAttempt1] = useState<AttemptState>({
    time: initialData?.gait_attempt1_time ?? null,
    completed: initialData?.gait_attempt1_completed ?? false,
    failureReason: initialData?.gait_attempt1_failure_reason ?? "",
    confirmed: !!initialData?.gait_attempt1_time,
  });
  const [attempt2, setAttempt2] = useState<AttemptState>({
    time: initialData?.gait_attempt2_time ?? null,
    completed: initialData?.gait_attempt2_completed ?? false,
    failureReason: initialData?.gait_attempt2_failure_reason ?? "",
    confirmed: !!initialData?.gait_attempt2_time,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!initialData?.gait_distance);

  const canSave = attempt1.confirmed && !saving && !saved;

  const { best_time, gait_score } = scoreGaitFromAttempts(
    attempt1.completed ? attempt1.time : null,
    attempt2.completed ? attempt2.time : null,
    distance,
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        gait_distance: distance,
        gait_attempt1_time: attempt1.time,
        gait_attempt1_completed: attempt1.completed,
        gait_attempt1_failure_reason: attempt1.failureReason || null,
        gait_attempt2_time: attempt2.time,
        gait_attempt2_completed: attempt2.completed,
        gait_attempt2_failure_reason: attempt2.failureReason || null,
        gait_best_time: best_time,
        gait_score,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Footprints className="w-4 h-4 text-[#29D68B]" />
          <h3 className="text-sm font-semibold text-gray-900">Velocidade de Marcha</h3>
        </div>
        {attempt1.confirmed && (
          <span className="text-sm font-bold text-gray-900">
            Pontuação: {gait_score}/4
          </span>
        )}
      </div>

      {/* Distância */}
      <div>
        <Label className="text-xs text-gray-500 mb-2 block">Distância do percurso</Label>
        <div className="flex gap-2">
          {([4, 3] as GaitDistance[]).map((d) => (
            <Button
              key={d}
              type="button"
              size="sm"
              variant={distance === d ? "default" : "outline"}
              disabled={saved || disabled}
              onClick={() => setDistance(d)}
              className={distance === d ? "bg-gray-900 text-white" : ""}
            >
              {d} metros
            </Button>
          ))}
        </div>
      </div>

      {/* Tentativas */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-1">
        <AttemptRow
          label="1ª tentativa"
          attempt={attempt1}
          locked={saved || disabled || false}
          onTimeRecorded={(t) => setAttempt1((a) => ({ ...a, time: t }))}
          onComplete={(completed, reason) =>
            setAttempt1((a) => ({ ...a, completed, failureReason: reason, confirmed: true }))
          }
        />
        <AttemptRow
          label="2ª tentativa"
          attempt={attempt2}
          locked={saved || disabled || false}
          onTimeRecorded={(t) => setAttempt2((a) => ({ ...a, time: t }))}
          onComplete={(completed, reason) =>
            setAttempt2((a) => ({ ...a, completed, failureReason: reason, confirmed: true }))
          }
        />
      </div>

      {/* Melhor tempo */}
      {attempt1.confirmed && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 flex justify-between text-sm">
          <span className="text-gray-600">Melhor tempo</span>
          <span className="font-semibold text-gray-900">
            {best_time != null ? `${best_time.toFixed(1)}s` : "—"} → {gait_score} pts
          </span>
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
            "Salvar Marcha e Continuar"
          )}
        </Button>
      )}
      {saved && (
        <p className="text-center text-sm text-green-600 font-medium">
          ✓ Marcha salva — pontuação: {gait_score}/4
        </p>
      )}
    </div>
  );
}
