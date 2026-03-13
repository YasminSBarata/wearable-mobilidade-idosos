import { getTUGClassificationInfo } from "../lib/scoring/tug";

const COLOR_MAP: Record<string, string> = {
  green:  "bg-green-100 text-green-800 border-green-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  orange: "bg-orange-100 text-orange-800 border-orange-200",
  red:    "bg-red-100 text-red-800 border-red-200",
  gray:   "bg-gray-100 text-gray-600 border-gray-200",
};

interface TUGClassificationBadgeProps {
  /** Tempo em segundos. null = não realizou. */
  time: number | null | undefined;
  size?: "sm" | "md";
}

/**
 * Badge colorido com a classificação de risco de queda do TUG.
 */
export function TUGClassificationBadge({ time, size = "md" }: TUGClassificationBadgeProps) {
  const info = getTUGClassificationInfo(time);
  const colors = COLOR_MAP[info.color] ?? COLOR_MAP.gray;
  const textSize = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${textSize} ${colors}`}
    >
      {info.label}
      <span className="opacity-70 font-normal">{info.timeRange}</span>
    </span>
  );
}
