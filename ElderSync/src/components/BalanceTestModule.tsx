import { useState } from "react";
import { Scale, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { BalanceSubtest, type BalanceSubtestData } from "./BalanceSubtest";
import { scoreBalance, shouldBlockNextBalanceSubtest } from "../lib/scoring/balance";

export interface BalanceModuleData {
  balance_feet_together_result: string;
  balance_feet_together_time: number | null;
  balance_feet_together_score: number;
  balance_feet_together_failure_reason: string | null;
  balance_semi_tandem_result: string;
  balance_semi_tandem_time: number | null;
  balance_semi_tandem_score: number;
  balance_semi_tandem_failure_reason: string | null;
  balance_tandem_result: string;
  balance_tandem_time: number | null;
  balance_tandem_score: number;
  balance_tandem_failure_reason: string | null;
  balance_total: number;
}

interface BalanceTestModuleProps {
  onSave: (data: BalanceModuleData) => Promise<void>;
  initialData?: Partial<BalanceModuleData> | null;
  disabled?: boolean;
}

const SUBTESTS = [
  {
    key: "feetTogether" as const,
    title: "A — Pés juntos (side-by-side)",
    instructions: "Pés paralelos, calcanhares e dedos alinhados. Meta: 10 segundos.",
  },
  {
    key: "semiTandem" as const,
    title: "B — Semi-tandem",
    instructions: "Calcanhar de um pé ao lado do dedo do outro pé. Meta: 10 segundos.",
  },
  {
    key: "tandem" as const,
    title: "C — Tandem completo",
    instructions: "Calcanhar de um pé imediatamente à frente do dedo do outro. Meta: 10 segundos (2 pts) ou ≥3s (1 pt).",
  },
];

/**
 * Módulo de equilíbrio SPPB — 3 subtestes com bloqueio progressivo.
 */
export function BalanceTestModule({ onSave, initialData, disabled }: BalanceTestModuleProps) {
  const [subtestA, setSubtestA] = useState<BalanceSubtestData | null>(
    initialData?.balance_feet_together_result
      ? {
          result: initialData.balance_feet_together_result as BalanceSubtestData["result"],
          time: initialData.balance_feet_together_time ?? null,
          failureReason: initialData.balance_feet_together_failure_reason ?? "",
        }
      : null,
  );
  const [subtestB, setSubtestB] = useState<BalanceSubtestData | null>(
    initialData?.balance_semi_tandem_result
      ? {
          result: initialData.balance_semi_tandem_result as BalanceSubtestData["result"],
          time: initialData.balance_semi_tandem_time ?? null,
          failureReason: initialData.balance_semi_tandem_failure_reason ?? "",
        }
      : null,
  );
  const [subtestC, setSubtestC] = useState<BalanceSubtestData | null>(
    initialData?.balance_tandem_result
      ? {
          result: initialData.balance_tandem_result as BalanceSubtestData["result"],
          time: initialData.balance_tandem_time ?? null,
          failureReason: initialData.balance_tandem_failure_reason ?? "",
        }
      : null,
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!initialData?.balance_feet_together_result);

  const blockB = subtestA !== null && shouldBlockNextBalanceSubtest(subtestA.result, subtestA.time);
  const blockC =
    blockB ||
    (subtestB !== null && shouldBlockNextBalanceSubtest(subtestB.result, subtestB.time));

  // Pode salvar quando subteste A estiver confirmado (B e C dependem do A)
  const canSave = subtestA !== null && !saving && !saved;

  const handleSave = async () => {
    if (!subtestA) return;
    setSaving(true);
    try {
      const a = subtestA;
      const b: BalanceSubtestData = subtestB ?? { result: "not_performed", time: null, failureReason: "" };
      const c: BalanceSubtestData = subtestC ?? { result: "not_performed", time: null, failureReason: "" };

      const scores = scoreBalance(
        a.result, a.time,
        b.result, b.time,
        c.result, c.time,
      );

      await onSave({
        balance_feet_together_result: a.result,
        balance_feet_together_time: a.time,
        balance_feet_together_score: scores.feet_together_score,
        balance_feet_together_failure_reason: a.failureReason || null,
        balance_semi_tandem_result: b.result,
        balance_semi_tandem_time: b.time,
        balance_semi_tandem_score: scores.semi_tandem_score,
        balance_semi_tandem_failure_reason: b.failureReason || null,
        balance_tandem_result: c.result,
        balance_tandem_time: c.time,
        balance_tandem_score: scores.tandem_score,
        balance_tandem_failure_reason: c.failureReason || null,
        balance_total: scores.balance_total,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const scores = subtestA
    ? scoreBalance(
        subtestA.result, subtestA.time,
        subtestB?.result ?? "not_performed", subtestB?.time,
        subtestC?.result ?? "not_performed", subtestC?.time,
      )
    : null;

  return (
    <div className="space-y-4">
      {/* Cabeçalho do módulo */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-[#29D68B]" />
          <h3 className="text-sm font-semibold text-gray-900">Teste de Equilíbrio</h3>
        </div>
        {scores && (
          <span className="text-sm font-bold text-gray-900">
            Total: {scores.balance_total}/4
          </span>
        )}
      </div>

      {/* Subtestes */}
      <BalanceSubtest
        {...SUBTESTS[0]}
        locked={saved || disabled}
        onComplete={setSubtestA}
        initialData={subtestA}
      />
      <BalanceSubtest
        {...SUBTESTS[1]}
        blocked={!subtestA || blockB}
        locked={saved || disabled}
        onComplete={setSubtestB}
        initialData={subtestB}
      />
      <BalanceSubtest
        {...SUBTESTS[2]}
        blocked={!subtestB || blockC}
        locked={saved || disabled}
        onComplete={setSubtestC}
        initialData={subtestC}
      />

      {/* Ação */}
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
            "Salvar Equilíbrio e Continuar"
          )}
        </Button>
      )}
      {saved && (
        <p className="text-center text-sm text-green-600 font-medium">
          ✓ Equilíbrio salvo — pontuação: {scores?.balance_total ?? 0}/4
        </p>
      )}
    </div>
  );
}
