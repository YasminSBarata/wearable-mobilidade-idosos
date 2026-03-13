/**
 * SPPB — Pontuação do Teste de Equilíbrio
 *
 * 3 subtestes em sequência com bloqueio progressivo:
 *   A) Pés juntos (side-by-side)  → 0–1 ponto
 *   B) Semi-tandem                → 0–1 ponto  (só realizado se A passou)
 *   C) Tandem completo            → 0–2 pontos (só realizado se B passou)
 *
 * Total de equilíbrio: 0–4 pontos
 *
 * Bloqueio progressivo:
 *   - Falha em A → B e C não realizados (score 0 em todos)
 *   - Falha em B → C não realizado (score 0)
 */

export type BalanceResult = 'passed' | 'failed' | 'not_performed';

// ─── Pontuação individual por subteste ───────────────────────────────────────

/** Subteste A — Pés juntos: 0 ou 1 ponto (≥10s = passou) */
export function scoreBalanceFeetTogether(
  result: BalanceResult,
  time?: number | null,
): number {
  if (result !== 'passed') return 0;
  return time != null && time >= 10 ? 1 : 0;
}

/** Subteste B — Semi-tandem: 0 ou 1 ponto (≥10s = passou). Só válido se A passou. */
export function scoreBalanceSemiTandem(
  result: BalanceResult,
  time?: number | null,
): number {
  if (result !== 'passed') return 0;
  return time != null && time >= 10 ? 1 : 0;
}

/**
 * Subteste C — Tandem completo: 0, 1 ou 2 pontos. Só válido se B passou.
 *   ≥10s → 2 pontos
 *   3–9.99s → 1 ponto
 *   <3s ou não realizado → 0 pontos
 */
export function scoreBalanceTandem(
  result: BalanceResult,
  time?: number | null,
): number {
  if (result !== 'passed' || time == null) return 0;
  if (time >= 10) return 2;
  if (time >= 3) return 1;
  return 0;
}

// ─── Pontuação consolidada ────────────────────────────────────────────────────

export interface BalanceScoringResult {
  feet_together_score: number; // 0–1
  semi_tandem_score: number;   // 0–1
  tandem_score: number;        // 0–2
  balance_total: number;       // 0–4
}

export function scoreBalance(
  feetTogetherResult: BalanceResult,
  feetTogetherTime: number | null | undefined,
  semiTandemResult: BalanceResult,
  semiTandemTime: number | null | undefined,
  tandemResult: BalanceResult,
  tandemTime: number | null | undefined,
): BalanceScoringResult {
  const feet_together_score = scoreBalanceFeetTogether(feetTogetherResult, feetTogetherTime);
  const semi_tandem_score   = scoreBalanceSemiTandem(semiTandemResult, semiTandemTime);
  const tandem_score        = scoreBalanceTandem(tandemResult, tandemTime);

  return {
    feet_together_score,
    semi_tandem_score,
    tandem_score,
    balance_total: feet_together_score + semi_tandem_score + tandem_score,
  };
}

// ─── Lógica de bloqueio progressivo ─────────────────────────────────────────

/**
 * Retorna `true` se o próximo subteste deve ser bloqueado (não realizado).
 * Usar após registrar o resultado de cada subteste antes de exibir o próximo.
 *
 * Regra: bloqueia se o subteste atual falhou OU se passou mas não atingiu 10s.
 */
export function shouldBlockNextBalanceSubtest(
  result: BalanceResult,
  time?: number | null,
): boolean {
  if (result === 'not_performed') return true;
  if (result === 'failed') return true;
  // passou mas não completou 10s → também bloqueia o próximo
  if (time == null || time < 10) return true;
  return false;
}
