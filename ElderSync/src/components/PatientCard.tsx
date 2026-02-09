import { User, TriangleAlert } from "lucide-react";
import { patientData } from "./Dashboard";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "@/utils/cn";

interface PatientCardProps {
  patient: patientData;
  isSelected: boolean;
  onClick: () => void;
}

export function PatientCard({
  patient,
  isSelected,
  onClick,
}: PatientCardProps) {
  return (
    <Button onClick={onClick} variant="card" data-selected={isSelected}>
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "p-2 rounded-full transition-colors",
            isSelected ? "bg-[#29D68B]" : "bg-gray-200",
          )}
        >
          <User
            className={cn(
              "w-5 h-5 transition-colors",
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
        <Badge variant="destructive" className="mt-2 gap-1">
          <TriangleAlert className="w-4 h-4" />
          <span>Alerta ativo</span>
        </Badge>
      )}
    </Button>
  );
}
