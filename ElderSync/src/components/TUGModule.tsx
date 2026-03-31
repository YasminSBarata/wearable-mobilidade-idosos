import { useState } from "react";
import { Timer, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Stopwatch } from "./Stopwatch";
import { TUGClassificationBadge } from "./TUGClassificationBadge";
import { SensorDataDisplay } from "./SensorDataDisplay";
import { tugClassificationLabel } from "../lib/scoring/tug";
import type { UseDeviceSessionReturn } from "../hooks/useDeviceSession";

export interface TUGModuleData {
  tug_time: number | null;
  tug_assistive_device: string | null;
  tug_footwear: string | null;
  tug_physical_help: boolean;
  tug_safety_level: string | null;
  tug_gait_pattern: string | null;
  tug_balance_turn: string | null;
  tug_sit_control: string | null;
  tug_instability: boolean;
  tug_instability_notes: string | null;
  tug_pain: boolean;
  tug_pain_notes: string | null;
  tug_compensatory_strategies: string | null;
  tug_classification: string | null;
}

interface TUGModuleProps {
  onSave: (data: TUGModuleData) => Promise<void>;
  initialData?: Partial<TUGModuleData> | null;
  disabled?: boolean;
  device?: UseDeviceSessionReturn;
}

/**
 * Módulo TUG — Timed Up and Go.
 * Cronômetro + campos qualitativos + classificação automática.
 */
export function TUGModule({ onSave, initialData, disabled, device }: TUGModuleProps) {
  const [time, setTime] = useState<number | null>(initialData?.tug_time ?? null);
  const [assistiveDevice, setAssistiveDevice] = useState(initialData?.tug_assistive_device ?? "Nenhum");
  const [footwear, setFootwear] = useState(initialData?.tug_footwear ?? "");
  const [physicalHelp, setPhysicalHelp] = useState(initialData?.tug_physical_help ?? false);
  const [safetyLevel, setSafetyLevel] = useState(initialData?.tug_safety_level ?? "");
  const [gaitPattern, setGaitPattern] = useState(initialData?.tug_gait_pattern ?? "");
  const [balanceTurn, setBalanceTurn] = useState(initialData?.tug_balance_turn ?? "");
  const [sitControl, setSitControl] = useState(initialData?.tug_sit_control ?? "");
  const [instability, setInstability] = useState(initialData?.tug_instability ?? false);
  const [instabilityNotes, setInstabilityNotes] = useState(initialData?.tug_instability_notes ?? "");
  const [pain, setPain] = useState(initialData?.tug_pain ?? false);
  const [painNotes, setPainNotes] = useState(initialData?.tug_pain_notes ?? "");
  const [compensatory, setCompensatory] = useState(initialData?.tug_compensatory_strategies ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!initialData?.tug_time);

  const canSave = !saving && !saved;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        tug_time: time,
        tug_assistive_device: assistiveDevice || null,
        tug_footwear: footwear || null,
        tug_physical_help: physicalHelp,
        tug_safety_level: safetyLevel || null,
        tug_gait_pattern: gaitPattern || null,
        tug_balance_turn: balanceTurn || null,
        tug_sit_control: sitControl || null,
        tug_instability: instability,
        tug_instability_notes: instability ? instabilityNotes || null : null,
        tug_pain: pain,
        tug_pain_notes: pain ? painNotes || null : null,
        tug_compensatory_strategies: compensatory || null,
        tug_classification: tugClassificationLabel(time),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-[#29D68B]" />
          <h3 className="text-sm font-semibold text-gray-900">Timed Up and Go (TUG)</h3>
        </div>
        {time != null && <TUGClassificationBadge time={time} size="sm" />}
      </div>

      {/* Cronômetro */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-800">Tempo de execução</p>
        <p className="text-xs text-gray-500">
          Do sinal de &quot;vai&quot; até sentar completamente na cadeira.
          Paciente pode usar dispositivo de auxílio habitual.
        </p>
        <Stopwatch
          onStart={() => {
            if (device) {
              device.resetDevice();
              device.startCollection("tug");
            }
          }}
          onStop={(t) => {
            setTime(t);
            if (device) device.stopCollection();
          }}
          initialDisplay={time}
          disabled={disabled || saved}
        />
        {time != null && <TUGClassificationBadge time={time} />}
        {device?.lastReading?.test_type === "tug" && (
          <SensorDataDisplay reading={device.lastReading} testType="tug" />
        )}
      </div>

      {/* Campos qualitativos */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
        <p className="text-sm font-semibold text-gray-800">Observações clínicas</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Dispositivo de auxílio */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-600">Dispositivo de auxílio</Label>
            <Select value={assistiveDevice} onValueChange={setAssistiveDevice} disabled={saved || disabled}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {["Nenhum", "Bengala", "Andador", "Muleta", "Outro"].map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Calçado */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-600">Calçado</Label>
            <Input
              value={footwear}
              onChange={(e) => setFootwear(e.target.value)}
              placeholder="Ex: tênis, descalço..."
              disabled={saved || disabled}
            />
          </div>

          {/* Nível de segurança */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-600">Nível de segurança</Label>
            <Select value={safetyLevel} onValueChange={setSafetyLevel} disabled={saved || disabled}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {["Seguro", "Moderadamente seguro", "Inseguro"].map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Padrão de marcha */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-600">Padrão de marcha</Label>
            <Select value={gaitPattern} onValueChange={setGaitPattern} disabled={saved || disabled}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {["Normal", "Alterado", "Uso de dispositivo"].map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Equilíbrio na curva */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-600">Equilíbrio na curva</Label>
            <Select value={balanceTurn} onValueChange={setBalanceTurn} disabled={saved || disabled}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {["Seguro", "Inseguro", "Usa dispositivo de auxílio"].map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Controle ao sentar */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-600">Controle ao sentar</Label>
            <Select value={sitControl} onValueChange={setSitControl} disabled={saved || disabled}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {["Normal", "Uso dos braços", "Cai na cadeira"].map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="tug-help"
              checked={physicalHelp}
              onCheckedChange={(v) => setPhysicalHelp(!!v)}
              disabled={saved || disabled}
            />
            <Label htmlFor="tug-help" className="text-sm cursor-pointer">
              Recebeu auxílio físico durante o teste
            </Label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="tug-instability"
                checked={instability}
                onCheckedChange={(v) => setInstability(!!v)}
                disabled={saved || disabled}
              />
              <Label htmlFor="tug-instability" className="text-sm cursor-pointer">
                Instabilidade observada
              </Label>
            </div>
            {instability && (
              <Input
                value={instabilityNotes}
                onChange={(e) => setInstabilityNotes(e.target.value)}
                placeholder="Descrever instabilidade..."
                className="ml-6"
                disabled={saved || disabled}
              />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="tug-pain"
                checked={pain}
                onCheckedChange={(v) => setPain(!!v)}
                disabled={saved || disabled}
              />
              <Label htmlFor="tug-pain" className="text-sm cursor-pointer">
                Relato de dor durante o teste
              </Label>
            </div>
            {pain && (
              <Input
                value={painNotes}
                onChange={(e) => setPainNotes(e.target.value)}
                placeholder="Localização e intensidade da dor..."
                className="ml-6"
                disabled={saved || disabled}
              />
            )}
          </div>
        </div>

        {/* Estratégias compensatórias */}
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-600">Estratégias compensatórias (opcional)</Label>
          <Textarea
            value={compensatory}
            onChange={(e) => setCompensatory(e.target.value)}
            placeholder="Descrever estratégias observadas..."
            rows={2}
            disabled={saved || disabled}
          />
        </div>
      </div>

      {!saved && (
        <Button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="w-full bg-[#29D68B] hover:bg-[#22c07a] text-white disabled:opacity-40"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
          ) : (
            "Salvar TUG e Continuar"
          )}
        </Button>
      )}
      {saved && (
        <div className="text-center space-y-1">
          <p className="text-sm text-green-600 font-medium">✓ TUG salvo</p>
          {time != null && <TUGClassificationBadge time={time} />}
        </div>
      )}
    </div>
  );
}
