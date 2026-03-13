/**
 * SPPB — Short Physical Performance Battery
 *
 * Pontuação total: soma dos 3 componentes.
 *   Equilíbrio:        0–4 pontos
 *   Velocidade marcha: 0–4 pontos
 *   Levantar cadeira:  0–4 pontos
 *   ─────────────────────────────
 *   SPPB Total:        0–12 pontos
 *
 * Classificação clínica do SPPB total:
 *   0–3   → Limitação grave
 *   4–6   → Limitação moderada
 *   7–9   → Limitação leve
 *   10–12 → Sem limitação / baixo risco
 */

export type SPPBCategory =
  | 'severe'    // 0–3
  | 'moderate'  // 4–6
  | 'mild'      // 7–9
  | 'normal';   // 10–12

export interface SPPBCategoryInfo {
  category: SPPBCategory;
  label: string;
  color: string; // referência de cor (use como Tailwind token)
  range: string;
}

const SPPB_CATEGORIES: SPPBCategoryInfo[] = [
  { category: 'severe',   label: 'Limitação grave',     color: 'red',    range: '0–3' },
  { category: 'moderate', label: 'Limitação moderada',  color: 'orange', range: '4–6' },
  { category: 'mild',     label: 'Limitação leve',      color: 'yellow', range: '7–9' },
  { category: 'normal',   label: 'Sem limitação',       color: 'green',  range: '10–12' },
];

// ─── Pontuação total ──────────────────────────────────────────────────────────

/**
 * Calcula o SPPB total somando os 3 componentes.
 * Valores `null` são tratados como 0 (componente não avaliado).
 */
export function calculateSPPBTotal(
  balanceTotal: number | null | undefined,
  gaitScore: number | null | undefined,
  chairScore: number | null | undefined,
): number {
  return (balanceTotal ?? 0) + (gaitScore ?? 0) + (chairScore ?? 0);
}

// ─── Classificação clínica ────────────────────────────────────────────────────

/** Retorna a categoria clínica para um dado total SPPB (0–12). */
export function getSPPBCategory(total: number): SPPBCategoryInfo {
  if (total <= 3) return SPPB_CATEGORIES[0];
  if (total <= 6) return SPPB_CATEGORIES[1];
  if (total <= 9) return SPPB_CATEGORIES[2];
  return SPPB_CATEGORIES[3];
}

// ─── Conveniência ─────────────────────────────────────────────────────────────

export interface SPPBSummary {
  balance_total: number;
  gait_score: number;
  chair_score: number;
  sppb_total: number;
  category: SPPBCategoryInfo;
}

/**
 * Retorna um resumo completo do SPPB com total e classificação.
 */
export function summarizeSPPB(
  balanceTotal: number | null | undefined,
  gaitScore: number | null | undefined,
  chairScore: number | null | undefined,
): SPPBSummary {
  const balance_total = balanceTotal ?? 0;
  const gait_s = gaitScore ?? 0;
  const chair_s = chairScore ?? 0;
  const sppb_total = balance_total + gait_s + chair_s;

  return {
    balance_total,
    gait_score: gait_s,
    chair_score: chair_s,
    sppb_total,
    category: getSPPBCategory(sppb_total),
  };
}
