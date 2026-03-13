/**
 * SPPB — Pontuação do Teste de Velocidade de Marcha
 *
 * Distância: 3 metros ou 4 metros (selecionado pelo examinador).
 * Realiza-se 2 tentativas; usa-se o menor tempo.
 * Pontuação: 0–4 pontos.
 *
 * Tabela de pontuação (Guralnik et al., adaptação brasileira):
 *
 *   4 metros:
 *     ≤4.82s  → 4 pontos
 *     4.83–6.20s → 3 pontos
 *     6.21–8.70s → 2 pontos
 *     >8.70s  → 1 ponto
 *     incapaz → 0 pontos
 *
 *   3 metros:
 *     ≤3.62s  → 4 pontos
 *     3.63–4.65s → 3 pontos
 *     4.66–6.52s → 2 pontos
 *     >6.52s  → 1 ponto
 *     incapaz → 0 pontos
 */

export type GaitDistance = 3 | 4;

// ─── Tabelas de corte ─────────────────────────────────────────────────────────

const GAIT_CUTOFFS: Record<GaitDistance, [number, number, number]> = {
  //         4pts   3pts   2pts  (acima do último corte → 1pt; incapaz → 0)
  4: [4.82, 6.20, 8.70],
  3: [3.62, 4.65, 6.52],
};

// ─── Pontuação ────────────────────────────────────────────────────────────────

/**
 * Calcula a pontuação de marcha com base no tempo e distância.
 * @param time  Melhor tempo em segundos. `null` significa incapaz de completar.
 * @param distance  3 ou 4 metros.
 * @returns Pontuação de 0 a 4.
 */
export function scoreGait(time: number | null | undefined, distance: GaitDistance): number {
  if (time == null) return 0; // incapaz de completar

  const [cut4, cut3, cut2] = GAIT_CUTOFFS[distance];

  if (time <= cut4) return 4;
  if (time <= cut3) return 3;
  if (time <= cut2) return 2;
  return 1;
}

/**
 * Seleciona o melhor (menor) tempo entre as duas tentativas.
 * Tentativas não completadas (`null`) são ignoradas.
 * Se nenhuma tentativa foi completada, retorna `null` (incapaz).
 */
export function bestGaitTime(
  attempt1: number | null | undefined,
  attempt2: number | null | undefined,
): number | null {
  const valid = [attempt1, attempt2].filter((t): t is number => t != null && t > 0);
  if (valid.length === 0) return null;
  return Math.min(...valid);
}

/**
 * Conveniência: seleciona o menor tempo e calcula a pontuação em uma chamada.
 */
export function scoreGaitFromAttempts(
  attempt1: number | null | undefined,
  attempt2: number | null | undefined,
  distance: GaitDistance,
): { best_time: number | null; gait_score: number } {
  const best_time = bestGaitTime(attempt1, attempt2);
  return { best_time, gait_score: scoreGait(best_time, distance) };
}
