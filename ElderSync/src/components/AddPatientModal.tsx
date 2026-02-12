import { useState } from "react";
import { AlertCircle, Info } from "lucide-react";
import type { PatientData } from "./Dashboard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";

interface AddPatientModalProps {
  onClose: () => void;
  onAdd: (patient: Omit<PatientData, "id">) => void;
}

export function AddPatientModal({ onClose, onAdd }: AddPatientModalProps) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (name.trim().length < 2) {
      setError("Por favor, insira um nome válido (mínimo 2 caracteres).");
      return;
    }

    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      setError("Por favor, insira uma idade válida (entre 1 e 120 anos).");
      return;
    }

    setError("");

    const newPatient: Omit<PatientData, "id"> = {
      name,
      age: ageNum,
      lastUpdate: "Aguardando dados do dispositivo",
      metrics: {
        stepCount: 0,
        averageCadence: 0,
        timeSeated: 0,
        timeStanding: 0,
        timeWalking: 0,
        gaitSpeed: 0,
        posturalStability: 0,
        fallsDetected: false,
        inactivityEpisodes: 0,
        inactivityAvgDuration: 0,
        tugEstimated: 0,
        abruptTransitions: 0,
        circadianPattern: Array(24).fill(0),
      },
    };

    onAdd(newPatient);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Paciente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patientName">Nome Completo</Label>
            <Input
              id="patientName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do paciente"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="patientAge">Idade</Label>
            <Input
              id="patientAge"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Idade"
              required
              min="1"
              max="120"
            />
          </div>

          <Alert>
            <Info className="size-4" />
            <AlertDescription>
              <strong>Nota:</strong> Os dados do Dashboard começarão zerados.
              Registre um dispositivo ESP32 após adicionar o paciente para
              começar a receber métricas reais.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 sm:flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="success"
              className="flex-1 sm:flex-1"
            >
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
