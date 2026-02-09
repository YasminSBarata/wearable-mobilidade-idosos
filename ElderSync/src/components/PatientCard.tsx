import { User } from "lucide-react";
import type { PatientData } from "./Dashboard";
import { cn } from "../utils/cn";

interface PatientCardProps {
  patient: PatientData;
  isSelected: boolean;
  onClick: () => void;
}

export function PatientCard({
  patient,
  isSelected,
  onClick,
}: PatientCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-lg border-2 transition cursor-pointer",
        isSelected
          ? "border-[#29D68B] bg-[#29D68B]/10"
          : "border-gray-200 bg-white hover:border-[#29D68B]/50",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "p-2 rounded-full",
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
          <p className="text-sm text-gray-500">{patient.age} anos</p>
        </div>
      </div>

      {patient.metrics.fallsDetected && (
        <div className="mt-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded flex items-center gap-1">
          <span>Alerta ativo</span>
        </div>
      )}
    </button>
  );
}
