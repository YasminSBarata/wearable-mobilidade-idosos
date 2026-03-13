import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

/**
 * Motivos padronizados de não realização / falha — Quadro 1 do protocolo SPPB/TUG.
 */
const FAILURE_REASONS = [
  "Problemas de equilíbrio",
  "Dor",
  "Medo de cair",
  "Fraqueza ou resistência insuficiente",
  "Comprometimento cognitivo",
  "Problema respiratório ou cardiovascular",
  "Recusou-se a continuar",
  "Outro",
];

interface FailureReasonSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function FailureReasonSelect({
  value,
  onChange,
  placeholder = "Selecionar motivo",
  disabled,
}: FailureReasonSelectProps) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {FAILURE_REASONS.map((reason) => (
          <SelectItem key={reason} value={reason}>
            {reason}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
