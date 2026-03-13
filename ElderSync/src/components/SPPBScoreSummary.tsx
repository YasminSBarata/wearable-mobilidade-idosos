import { Trophy } from "lucide-react";
import { getSPPBCategory, calculateSPPBTotal } from "../lib/scoring/sppb";
import { TUGClassificationBadge } from "./TUGClassificationBadge";

interface SPPBScoreSummaryProps {
  balanceTotal: number | null;
  gaitScore: number | null;
  chairScore: number | null;
  tugTime: number | null | undefined;
}

const COMPONENT_COLOR: Record<number, string> = {
  0: "text-red-600",
  1: "text-orange-500",
  2: "text-yellow-500",
  3: "text-blue-600",
  4: "text-green-600",
};

const SPPB_CATEGORY_STYLE: Record<string, string> = {
  severe:   "bg-red-50 border-red-200 text-red-700",
  moderate: "bg-orange-50 border-orange-200 text-orange-700",
  mild:     "bg-yellow-50 border-yellow-200 text-yellow-700",
  normal:   "bg-green-50 border-green-200 text-green-700",
};

function ScoreBar({ score, max }: { score: number; max: number }) {
  return (
    <div className="flex gap-1 mt-1">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`h-2 flex-1 rounded-full ${i < score ? "bg-[#29D68B]" : "bg-gray-200"}`}
        />
      ))}
    </div>
  );
}

/**
 * Resumo visual destacado da pontuação SPPB + classificação TUG ao final da sessão.
 */
export function SPPBScoreSummary({
  balanceTotal,
  gaitScore,
  chairScore,
  tugTime,
}: SPPBScoreSummaryProps) {
  const sppbTotal = calculateSPPBTotal(balanceTotal, gaitScore, chairScore);
  const category = getSPPBCategory(sppbTotal);
  const categoryStyle = SPPB_CATEGORY_STYLE[category.category];

  const components = [
    { label: "Equilíbrio", score: balanceTotal ?? 0, max: 4 },
    { label: "Marcha",     score: gaitScore ?? 0,    max: 4 },
    { label: "Cadeira",    score: chairScore ?? 0,   max: 4 },
  ];

  return (
    <div className="space-y-4">
      {/* Pontuação total */}
      <div className={`rounded-xl border-2 p-6 text-center ${categoryStyle}`}>
        <div className="flex items-center justify-center gap-2 mb-1">
          <Trophy className="w-5 h-5" />
          <p className="text-sm font-semibold uppercase tracking-wide">SPPB Total</p>
        </div>
        <p className="text-5xl font-black mt-2 mb-1">{sppbTotal}</p>
        <p className="text-sm opacity-70">de 12 pontos</p>
        <p className="text-base font-semibold mt-2">{category.label}</p>
        <p className="text-xs opacity-60 mt-0.5">({category.range} pontos)</p>
      </div>

      {/* Componentes */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Pontuação por componente
        </p>
        <div className="space-y-4">
          {components.map((c) => (
            <div key={c.label}>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-700">{c.label}</span>
                <span className={`text-lg font-bold ${COMPONENT_COLOR[c.score] ?? "text-gray-900"}`}>
                  {c.score}/{c.max}
                </span>
              </div>
              <ScoreBar score={c.score} max={c.max} />
            </div>
          ))}
        </div>
      </div>

      {/* TUG */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          TUG — Timed Up and Go
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {tugTime != null ? `${tugTime.toFixed(1)}s` : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">tempo de execução</p>
          </div>
          <TUGClassificationBadge time={tugTime} />
        </div>
      </div>
    </div>
  );
}
