import { useRef, useState } from "react";
import { AlertCircle, Calendar } from "lucide-react";
import type { Patient } from "../lib/types";
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
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Alert, AlertDescription } from "./ui/alert";

interface PatientFormModalProps {
  patient?: Patient;
  onClose: () => void;
  onSave: (data: { name: string; birth_date: string; gender: string; clinical_notes: string }) => Promise<void>;
}

export function PatientFormModal({ patient, onClose, onSave }: PatientFormModalProps) {
  const [name, setName] = useState(patient?.name ?? "");
  const [birthDate, setBirthDate] = useState(patient?.birth_date ?? "");
  const [gender, setGender] = useState(patient?.gender ?? "");
  const [clinicalNotes, setClinicalNotes] = useState(patient?.clinical_notes ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const birthDateRef = useRef<HTMLInputElement>(null);
  const isEdit = !!patient;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (name.trim().length < 2) {
      setError("Por favor, insira um nome válido (mínimo 2 caracteres).");
      return;
    }

    setError("");
    setSaving(true);

    try {
      await onSave({
        name: name.trim(),
        birth_date: birthDate,
        gender,
        clinical_notes: clinicalNotes.trim(),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar paciente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Paciente" : "Adicionar Paciente"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patientName">Nome Completo *</Label>
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
            <Label htmlFor="birthDate" className="flex items-center gap-1">
              Data de Nascimento
              <Calendar
                className="size-3.5 text-muted-foreground cursor-pointer"
                onClick={() => birthDateRef.current?.showPicker()}
              />
            </Label>
            <Input
              ref={birthDateRef}
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="[&::-webkit-calendar-picker-indicator]:hidden"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Sexo</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger id="gender">
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent className="z-200">
                <SelectItem value="M">Masculino</SelectItem>
                <SelectItem value="F">Feminino</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clinicalNotes">Notas Clínicas</Label>
            <Textarea
              id="clinicalNotes"
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Diagnósticos, medicamentos, observações relevantes..."
              rows={3}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" variant="success" className="flex-1" disabled={saving}>
              {saving ? "Salvando..." : isEdit ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
