/**
 * TUG — Timed Up and Go
 *
 * Classifica o risco de queda com base no tempo de execução do TUG.
 * Não compõe o SPPB total, mas é um indicador clínico complementar.
 *
 * 4 faixas de classificação:
 *   ≤10s          → Baixo risco / independente            (verde)
 *   10.01–20s     → Risco moderado / maiormente independente (amarelo)
 *   20.01–30s     → Alto risco / mobilidade variável      (laranja)
 *   >30s          → Risco muito alto / mobilidade prejudicada (vermelho)
 */

export type TUGClassification =
  | 'low_risk'       // ≤10s
  | 'moderate_risk'  // 10.01–20s
  | 'high_risk'      // 20.01–30s
  | 'very_high_risk' // >30s
  | 'unable';        // não realizou

export interface TUGClassificationInfo {
  classification: TUGClassification;
  label: string;
  color: string; // Tailwind CSS color token (bg/text)
  timeRange: string;
}

const TUG_CLASSIFICATIONS: Record<Exclude<TUGClassification, 'unable'>, TUGClassificationInfo> = {
  low_risk: {
    classification: 'low_risk',
    label: 'Baixo risco',
    color: 'green',
    timeRange: '≤10s',
  },
  moderate_risk: {
    classification: 'moderate_risk',
    label: 'Risco moderado',
    color: 'yellow',
    timeRange: '10–20s',
  },
  high_risk: {
    classification: 'high_risk',
    label: 'Alto risco',
    color: 'orange',
    timeRange: '20–30s',
  },
  very_high_risk: {
    classification: 'very_high_risk',
    label: 'Risco muito alto',
    color: 'red',
    timeRange: '>30s',
  },
};

const TUG_UNABLE: TUGClassificationInfo = {
  classification: 'unable',
  label: 'Não realizado',
  color: 'gray',
  timeRange: '—',
};

// ─── Classificação ────────────────────────────────────────────────────────────

/**
 * Classifica o TUG com base no tempo em segundos.
 * @param time Tempo em segundos. `null` = não realizou.
 */
export function classifyTUG(time: number | null | undefined): TUGClassification {
  if (time == null) return 'unable';
  if (time <= 10) return 'low_risk';
  if (time <= 20) return 'moderate_risk';
  if (time <= 30) return 'high_risk';
  return 'very_high_risk';
}

/**
 * Retorna o objeto completo de classificação (label, cor, faixa de tempo).
 */
export function getTUGClassificationInfo(time: number | null | undefined): TUGClassificationInfo {
  const classification = classifyTUG(time);
  if (classification === 'unable') return TUG_UNABLE;
  return TUG_CLASSIFICATIONS[classification];
}

/**
 * Retorna o label textual da classificação TUG para persistência no banco.
 * Compatível com o campo `tug_classification TEXT` na tabela `test_sessions`.
 */
export function tugClassificationLabel(time: number | null | undefined): string {
  return getTUGClassificationInfo(time).label;
}
