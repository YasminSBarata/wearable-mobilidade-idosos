/**
 * Formata uma data ISO (YYYY-MM-DD) para pt-BR (DD/MM/YYYY)
 * sem passar por `new Date()`, evitando o bug de timezone
 * onde "2026-03-12" vira 11/03 em UTC-3.
 */
export function formatDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Retorna a data local de hoje em formato YYYY-MM-DD
 * (seguro para fuso horário, sem usar toISOString).
 */
export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
