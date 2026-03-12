import { User, Trash2 } from "lucide-react";
import type { Patient, TestSession } from "../lib/types";
import { cn } from "../utils/cn";

function calcAge(birthDate?: string | null): string {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return `${age} anos`;
}

interface PatientCardProps {
  patient: Patient;
  lastSession?: TestSession | null;
  isSelected?: boolean;
  onClick: () => void;
  onDelete?: (patientId: string) => void;
}

export function PatientCard({
  patient,
  lastSession,
  isSelected = false,
  onClick,
  onDelete,
}: PatientCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && confirm(`Remover paciente ${patient.name}?`)) {
      onDelete(patient.id);
    }
  };

  const age = calcAge(patient.birth_date);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-lg border-2 transition cursor-pointer group",
        isSelected
          ? "border-[#29D68B] bg-[#29D68B]/10"
          : "border-gray-200 bg-white hover:border-[#29D68B]/50",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "p-2 rounded-full shrink-0",
            isSelected ? "bg-[#29D68B]" : "bg-gray-200",
          )}
        >
          <User
            className={cn(
              "w-5 h-5",
              isSelected ? "text-white" : "text-gray-600",
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{patient.name}</p>
          {age && <p className="text-sm text-gray-500">{age}</p>}
          {lastSession ? (
            <p className="text-xs text-gray-400 mt-0.5">
              Última sessão:{" "}
              {new Date(lastSession.date).toLocaleDateString("pt-BR")}
              {lastSession.sppb_total != null && (
                <> · SPPB {lastSession.sppb_total}/12</>
              )}
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">Sem sessões</p>
          )}
        </div>
        {onDelete && (
          <div
            onClick={handleDelete}
            className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-all cursor-pointer"
            title="Remover paciente"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </div>
        )}
      </div>
    </button>
  );
}
