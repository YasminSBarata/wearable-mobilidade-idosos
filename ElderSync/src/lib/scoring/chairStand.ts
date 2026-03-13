/**
 * SPPB — Pontuação do Teste de Levantar-se da Cadeira (5 repetições)
 *
 * Fluxo do teste:
 *   1. Pré-teste: paciente tenta levantar UMA vez com braços cruzados no peito.
 *      - Se não conseguir → score = 0; teste principal não realizado.
 *      - Se conseguir → realizar o teste principal.
 *   2. Teste principal: 5 repetições de levantar-sentar o mais rápido possível.
 *      - Tempo limite: 60 segundos.
 *
 * Pontuação (Guralnik et al.):
 *   >60s ou incapaz de completar → 0 pontos
 *   16.70–59.99s                → 1 ponto
 *   13.70–16.69s                → 2 pontos
 *   11.20–13.69s                → 3 pontos
 *   ≤11.19s                     → 4 pontos
 */

// ─── Pré-teste ────────────────────────────────────────────────────────────────

/**
 * Retorna `true` se o pré-teste foi aprovado (levantou sem usar os braços).
 * Se `pretestPassed` for `false` ou `null`, o teste principal não deve ser realizado.
 */
export function chairPretestPassed(pretestPassed: boolean | null | undefined): boolean {
  return pretestPassed === true;
}

// ─── Pontuação do teste principal ────────────────────────────────────────────

/**
 * Calcula a pontuação do teste de levantar-se com base no tempo.
 *
 * @param time       Tempo em segundos para 5 repetições. `null` = incapaz/não realizado.
 * @param completed  Se as 5 repetições foram concluídas dentro do limite. Default: true se time != null.
 * @returns Pontuação de 0 a 4.
 */
export function scoreChairStand(
  time: number | null | undefined,
  completed?: boolean | null,
): number {
  if (time == null || completed === false) return 0;
  if (time > 60) return 0;
  if (time > 16.69) return 1;
  if (time > 13.69) return 2;
  if (time > 11.19) return 3;
  return 4;
}

// ─── Conveniência ─────────────────────────────────────────────────────────────

export interface ChairStandScoringResult {
  pretest_passed: boolean;
  chair_score: number; // 0–4
}

/**
 * Avalia o resultado completo do módulo (pré-teste + teste principal).
 */
export function scoreChairStandModule(
  pretestPassed: boolean | null | undefined,
  time: number | null | undefined,
  completed?: boolean | null,
): ChairStandScoringResult {
  const pretest_passed = chairPretestPassed(pretestPassed);
  const chair_score = pretest_passed ? scoreChairStand(time, completed) : 0;
  return { pretest_passed, chair_score };
}
