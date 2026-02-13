import { useState } from "react";
import { Cpu, Copy, Check, Wifi, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface DeviceCredentials {
  deviceId: string;
  apiKey: string;
  deviceName: string;
  patientId: string;
}

interface RegisterDeviceModalProps {
  patientId: string;
  patientName: string;
  accessToken: string;
  onClose: () => void;
  onSuccess?: (device: DeviceCredentials) => void;
}

export function RegisterDeviceModal({
  patientId,
  patientName,
  accessToken,
  onClose,
  onSuccess,
}: RegisterDeviceModalProps) {
  const [deviceName, setDeviceName] = useState(`Sensor de ${patientName}`);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState<DeviceCredentials | null>(
    null,
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/iot/devices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({
          patientId,
          deviceName: deviceName.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao registrar dispositivo");
      }

      const data = await response.json();
      setCredentials(data.device);
      onSuccess?.(data.device);
    } catch (err: any) {
      setError(err.message || "Erro ao registrar dispositivo");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Erro ao copiar:", err);
    }
  };

  const generateEspCode = () => {
    if (!credentials) return "";
    return `// Configurações do dispositivo - Cole no código do ESP32
const char* DEVICE_ID = "${credentials.deviceId}";
const char* API_KEY = "${credentials.apiKey}";
const char* SERVER_URL = "${supabaseUrl}/functions/v1/iot/metrics";`;
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto my-4 top-[50%] translate-y-[-50%] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Cpu className="w-6 h-6 text-[#29D68B]" />
            {credentials ? "Dispositivo Registrado" : "Registrar Dispositivo"}
          </DialogTitle>
        </DialogHeader>

        {!credentials ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Alert>
              <Wifi className="size-4" />
              <AlertDescription>
                <p className="font-medium mb-1">Conectar ESP32/ESP8266</p>
                <p className="text-sm">
                  Registre um dispositivo IoT para coletar dados do sensor
                  MPU6050 e enviar para o paciente {patientName}.
                </p>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="deviceName">Nome do Dispositivo</Label>
              <Input
                id="deviceName"
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="Ex: Sensor do quarto, Pulseira, etc."
                required
              />
            </div>

            <div className="text-sm text-muted-foreground bg-muted rounded-lg p-3">
              <p className="font-medium mb-2">Métricas coletadas:</p>
              <ul className="grid grid-cols-2 gap-1 text-xs">
                <li>• Contagem de passos</li>
                <li>• Cadência média</li>
                <li>• Tempo sentado/em pé</li>
                <li>• Velocidade de marcha</li>
                <li>• Estabilidade postural</li>
                <li>• Detecção de quedas</li>
                <li>• Inatividade prolongada</li>
                <li>• TUG estimado</li>
                <li>• Transições bruscas</li>
                <li>• Padrão circadiano</li>
              </ul>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                variant="success"
                className="flex-1"
              >
                {loading ? "Registrando..." : "Registrar Dispositivo"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <Check className="size-4 text-green-600" />
              <AlertDescription>
                <p className="font-medium text-green-800 mb-1">
                  Dispositivo registrado com sucesso!
                </p>
                <p className="text-sm text-green-700">
                  Copie as credenciais abaixo para configurar o ESP32.
                </p>
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Device ID</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded-lg text-sm font-mono break-all">
                    {credentials.deviceId}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      copyToClipboard(credentials.deviceId, "deviceId")
                    }
                    title="Copiar"
                  >
                    {copiedField === "deviceId" ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">API Key</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded-lg text-sm font-mono break-all">
                    {credentials.apiKey}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      copyToClipboard(credentials.apiKey, "apiKey")
                    }
                    title="Copiar"
                  >
                    {copiedField === "apiKey" ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Código para ESP32</Label>
              <div className="relative">
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
                  {generateEspCode()}
                </pre>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(generateEspCode(), "code")}
                  className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600"
                  title="Copiar código"
                >
                  {copiedField === "code" ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-300" />
                  )}
                </Button>
              </div>
            </div>

            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="size-4 text-yellow-600" />
              <AlertDescription>
                <p className="font-medium text-yellow-800 mb-1">
                  ⚠️ Importante
                </p>
                <p className="text-sm text-yellow-700">
                  Guarde a API Key em local seguro. Ela não será mostrada
                  novamente.
                </p>
              </AlertDescription>
            </Alert>

            <Button onClick={onClose} variant="success" className="w-full">
              Concluído
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
