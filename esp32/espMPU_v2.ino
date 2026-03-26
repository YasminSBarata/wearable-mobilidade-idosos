/*
 * ElderSync — Firmware v2.0
 * Dispositivo ESP32 + MPU6050
 *
 * MUDANÇAS v1.0 → v2.0:
 * - Removido: envio automático a cada 5s
 * - Removido: X-Device-Key e X-Device-Id por paciente
 * - Removido: detecção de quedas, contador de passos, padrões circadianos
 * - Removido: botão físico
 * - Adicionado: escuta SSE (Server-Sent Events) para receber comandos
 * - Adicionado: motor de medição sob demanda (start/stop)
 * - Adicionado: calibração de 5s como comando separado (bias gyro + ângulo zero)
 * - Adicionado: filtro complementar para ângulo de inclinação
 * - Adicionado: cálculo de oscillation_metrics (AP/ML) e gait_metrics
 * - Adicionado: LED de status (apagado / piscando lento / piscando rápido / fixo)
 * - device_id agora é o MAC address do ESP32
 *
 * CONEXÕES MPU6050 → ESP32:
 *   VCC → 3.3V | GND → GND | SCL → GPIO 22 | SDA → GPIO 21
 *
 * LED DE STATUS:
 *   Apagado        → sem WiFi
 *   Piscando lento → aguardando comando SSE (1Hz)
 *   Piscando rápido→ calibração em andamento (4Hz)
 *   Fixo           → medição em andamento
 *
 * BIBLIOTECAS (instalar via Arduino IDE):
 *   - ArduinoJson by Benoit Blanchon
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <ArduinoJson.h>

// ============================================================
// CONFIGURAÇÕES — editar antes de fazer upload
// ============================================================

const char* WIFI_SSID     = "wifi";
const char* WIFI_PASSWORD = "senha";

// URL base do servidor (Supabase Edge Functions)
// Exemplo: "https://ewbwxqqwpafqtmiscgsn.supabase.co/functions/v1"
const char* SERVER_BASE_URL = "https://ewbwxqqwpafqtmiscgsn.supabase.co/functions/v1";

// Pino do LED de status
const int LED_PIN = 2;   // LED interno do ESP32; trocar se usar LED externo

// ============================================================
// CONSTANTES — não alterar
// ============================================================

const int    MPU_ADDR          = 0x68;
const float  ALPHA             = 0.96f;   // filtro complementar: favorece giroscópio
const int    SAMPLE_RATE_HZ    = 50;      // 50 leituras/segundo
const int    SAMPLE_INTERVAL_MS = 1000 / SAMPLE_RATE_HZ; // 20 ms
const int    SSE_RECONNECT_MS  = 5000;    // reconectar SSE após 5s
const int    MAX_SAMPLES       = 3000;    // 60s × 50Hz — tamanho máximo do buffer

// ============================================================
// ESTADO GLOBAL
// ============================================================

// Identificação do dispositivo (preenchida em setup)
char DEVICE_ID[20];

// Estado da máquina de medição
enum EstadoMedicao { AGUARDANDO, MEDINDO };
volatile EstadoMedicao estadoAtual = AGUARDANDO;

// Dados do comando SSE atual
String sessionId    = "";
String testType     = "";
String commandId    = "";
int    durationMax  = 60;   // segundos

// Buffer de amostras brutas
struct Amostra {
  uint32_t t;     // ms desde início da coleta
  float ax, ay, az;
  float gx, gy, gz;
};

Amostra* buffer = nullptr;  // alocado dinamicamente ao iniciar medição
int      numAmostras = 0;

// Flag para encerramento antecipado (evento "stop")
volatile bool encerrarMedicao = false;

// Calibração (persiste entre medições até nova calibração)
bool  calibrado  = false;
float calAngle0  = 0.0f;   // ângulo zero (graus)
float calGxBias  = 0.0f;   // bias giroscópio X (°/s)
float calGyBias  = 0.0f;   // bias giroscópio Y
float calGzBias  = 0.0f;   // bias giroscópio Z

// ============================================================
// SETUP
// ============================================================

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== ElderSync v2.0 ===");

  // LED
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);  // apagado até ter WiFi

  // I2C + MPU6050
  Wire.begin();
  initMPU6050();

  // MAC address como device_id
  uint8_t mac[6];
  esp_read_mac(mac, ESP_MAC_WIFI_STA);
  snprintf(DEVICE_ID, sizeof(DEVICE_ID), "%02X%02X%02X%02X%02X%02X",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);

  // WiFi
  conectarWiFi();
}

// ============================================================
// LOOP PRINCIPAL
// ============================================================

void loop() {
  // Garantir WiFi
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(LED_PIN, LOW);
    Serial.println("WiFi desconectado. Reconectando...");
    conectarWiFi();
    return;
  }

  // Abrir (ou reabrir) conexão SSE e processar eventos
  escutarSSE();

  // escutarSSE() só retorna em caso de erro/queda da conexão
  Serial.println("Conexão SSE encerrada. Aguardando " + String(SSE_RECONNECT_MS/1000) + "s para reconectar...");
  piscarLED(SSE_RECONNECT_MS);   // mantém LED piscando durante a espera
}

// ============================================================
// WIFI
// ============================================================

void conectarWiFi() {
  Serial.print("Conectando ao WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 40) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi conectado! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n✗ Falha ao conectar WiFi. Tentando novamente em 5s...");
    delay(5000);
  }
}

// ============================================================
// LED DE STATUS
// ============================================================

// Pisca o LED por totalMs milissegundos (1 vez/segundo)
void piscarLED(unsigned long totalMs) {
  unsigned long inicio = millis();
  bool estado = false;
  while (millis() - inicio < totalMs) {
    estado = !estado;
    digitalWrite(LED_PIN, estado ? HIGH : LOW);
    delay(500);
  }
  digitalWrite(LED_PIN, LOW);
}

// Inicia tarefa de piscar em background enquanto aguarda SSE
// (implementado de forma simples: pisca a cada iteração do loop SSE)
unsigned long ultimoBlink = 0;
bool blinkState = false;

void atualizarLEDEspera() {
  if (millis() - ultimoBlink >= 1000) {
    blinkState = !blinkState;
    digitalWrite(LED_PIN, blinkState ? HIGH : LOW);
    ultimoBlink = millis();
  }
}

// ============================================================
// MPU6050
// ============================================================

void initMPU6050() {
  Serial.println("Inicializando MPU6050...");

  // Acordar sensor
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);
  Wire.write(0x00);
  Wire.endTransmission(true);

  // Acelerômetro ±2g
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x1C);
  Wire.write(0x00);
  Wire.endTransmission(true);

  // Giroscópio ±250°/s
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x1B);
  Wire.write(0x00);
  Wire.endTransmission(true);

  Serial.println("✓ MPU6050 inicializado!");
}

void lerMPU6050(float &ax, float &ay, float &az,
                float &gx, float &gy, float &gz) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 14, true);

  int16_t rax = Wire.read() << 8 | Wire.read();
  int16_t ray = Wire.read() << 8 | Wire.read();
  int16_t raz = Wire.read() << 8 | Wire.read();
  Wire.read(); Wire.read();  // temperatura — ignorar
  int16_t rgx = Wire.read() << 8 | Wire.read();
  int16_t rgy = Wire.read() << 8 | Wire.read();
  int16_t rgz = Wire.read() << 8 | Wire.read();

  // ±2g → m/s² (1g ≈ 9.80665 m/s²)
  ax = (rax / 16384.0f) * 9.80665f;
  ay = (ray / 16384.0f) * 9.80665f;
  az = (raz / 16384.0f) * 9.80665f;

  // ±250°/s
  gx = rgx / 131.0f;
  gy = rgy / 131.0f;
  gz = rgz / 131.0f;
}

// ============================================================
// SSE — escuta de comandos
// ============================================================

void escutarSSE() {
  WiFiClientSecure client;
  client.setInsecure();  // sem validação de certificado (ambiente de dev)

  // Montar URL do endpoint SSE
  String host = String(SERVER_BASE_URL);
  host.replace("https://", "");
  int slashPos = host.indexOf('/');
  String hostname = host.substring(0, slashPos);
  String path     = host.substring(slashPos) + "/iot/listen?device_id=" + String(DEVICE_ID);

  Serial.println("Conectando SSE: " + hostname + path);

  if (!client.connect(hostname.c_str(), 443)) {
    Serial.println("✗ Falha ao conectar ao servidor SSE");
    return;
  }

  // Requisição HTTP GET com keep-alive
  client.print("GET " + path + " HTTP/1.1\r\n");
  client.print("Host: " + hostname + "\r\n");
  client.print("Accept: text/event-stream\r\n");
  client.print("Cache-Control: no-cache\r\n");
  client.print("Connection: keep-alive\r\n\r\n");

  Serial.println("✓ SSE conectado. Aguardando comandos...");

  // LED piscando = aguardando
  ultimoBlink = millis();
  blinkState = false;

  String linhaAtual = "";

  while (client.connected()) {
    atualizarLEDEspera();

    if (!client.available()) {
      delay(10);
      continue;
    }

    char c = client.read();

    if (c == '\n') {
      linhaAtual.trim();

      // Linha vazia = fim do bloco de evento (ignorar)
      if (linhaAtual.length() == 0) {
        // nada
      }
      // Comentário de keepalive (ex: ": ping")
      else if (linhaAtual.startsWith(":")) {
        Serial.println("[SSE keepalive]");
      }
      // Linha de dados
      else if (linhaAtual.startsWith("data:")) {
        String jsonStr = linhaAtual.substring(5);
        jsonStr.trim();
        processarEventoSSE(jsonStr, client);
      }

      linhaAtual = "";
    } else if (c != '\r') {
      linhaAtual += c;
    }
  }

  client.stop();
  Serial.println("Conexão SSE fechada.");
}

void processarEventoSSE(const String& jsonStr, WiFiClientSecure& client) {
  Serial.println("[SSE] " + jsonStr);

  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, jsonStr) != DeserializationError::Ok) {
    Serial.println("✗ Erro ao parsear JSON do evento SSE");
    return;
  }

  // Evento de parada antecipada (backend envia {"id":"...", "action":"stop"})
  if (doc.containsKey("action") && String((const char*)doc["action"]) == "stop") {
    if (estadoAtual == MEDINDO) {
      Serial.println("→ Evento 'stop' recebido. Encerrando medição.");
      encerrarMedicao = true;
    }
    return;
  }

  // Evento de início (comando com test_type)
  if (doc.containsKey("test_type")) {
    sessionId   = String((const char*)doc["session_id"]);
    testType    = String((const char*)doc["test_type"]);
    commandId   = String((const char*)doc["id"]);
    durationMax = doc["duration_max"] | 60;

    Serial.println("→ Comando recebido.");
    Serial.println("  session_id: " + sessionId);
    Serial.println("  test_type:  " + testType);
    Serial.println("  duration_max: " + String(durationMax) + "s");

    estadoAtual = MEDINDO;

    if (testType == "calibrate") {
      realizarCalibracao();
    } else {
      // Acende LED fixo para medição
      digitalWrite(LED_PIN, HIGH);
      realizarMedicao();
    }

    // Volta a piscar após finalizar
    estadoAtual = AGUARDANDO;
    ultimoBlink = millis();
    blinkState = false;
  }
}

// ============================================================
// CALIBRAÇÃO (5s — paciente parado na posição de teste)
// ============================================================

void realizarCalibracao() {
  Serial.println("\n=== Calibração (5s) ===");

  // LED pisca rápido durante calibração (2Hz)
  int nTarget = 5 * SAMPLE_RATE_HZ;  // 250 amostras em 5s
  double sumAy = 0, sumAz = 0;
  double sumGx = 0, sumGy = 0, sumGz = 0;
  int count = 0;

  unsigned long inicio = millis();
  unsigned long ultimaLeitura = inicio;
  unsigned long ultimoLedToggle = inicio;
  bool ledState = true;
  digitalWrite(LED_PIN, HIGH);

  while (count < nTarget && (millis() - inicio) < 6000) {
    unsigned long agora = millis();

    // LED pisca rápido (250ms on/off)
    if (agora - ultimoLedToggle >= 250) {
      ledState = !ledState;
      digitalWrite(LED_PIN, ledState ? HIGH : LOW);
      ultimoLedToggle = agora;
    }

    if (agora - ultimaLeitura < (unsigned long)SAMPLE_INTERVAL_MS) {
      delay(1);
      continue;
    }
    ultimaLeitura = agora;

    float ax, ay, az, gx, gy, gz;
    lerMPU6050(ax, ay, az, gx, gy, gz);

    sumAy += ay;
    sumAz += az;
    sumGx += gx;
    sumGy += gy;
    sumGz += gz;
    count++;
  }

  if (count > 0) {
    calAngle0 = atan2(sumAy / count, sumAz / count) * 180.0f / PI;
    calGxBias = sumGx / count;
    calGyBias = sumGy / count;
    calGzBias = sumGz / count;
    calibrado = true;

    Serial.println("✓ Calibração OK!");
    Serial.println("  Amostras: " + String(count));
    Serial.println("  Ângulo zero: " + String(calAngle0, 2) + "°");
    Serial.println("  Gyro bias: " + String(calGxBias, 2) + " / " +
                   String(calGyBias, 2) + " / " + String(calGzBias, 2) + " °/s");

    // LED pisca 2x rápido para confirmar visualmente
    digitalWrite(LED_PIN, LOW);  delay(200);
    digitalWrite(LED_PIN, HIGH); delay(200);
    digitalWrite(LED_PIN, LOW);  delay(200);
    digitalWrite(LED_PIN, HIGH); delay(200);
    digitalWrite(LED_PIN, LOW);
  } else {
    Serial.println("✗ Calibração falhou (nenhuma amostra coletada)");
  }

  // Enviar confirmação ao servidor (marca command como "done")
  enviarConfirmacaoCalibracao();
}

void enviarConfirmacaoCalibracao() {
  if (WiFi.status() != WL_CONNECTED) return;

  String base = String(SERVER_BASE_URL);
  base.replace("https://", "");
  int slash   = base.indexOf('/');
  String host = base.substring(0, slash);
  String path = base.substring(slash) + "/iot/reading";

  // Payload pequeno — sem raw_data, sem chunked
  String payload = "{\"session_id\":\"" + sessionId +
                   "\",\"test_type\":\"calibrate\"" +
                   ",\"command_id\":\"" + commandId + "\"}";

  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(10);

  if (!client.connect(host.c_str(), 443)) {
    Serial.println("✗ Falha ao enviar confirmação de calibração.");
    return;
  }

  client.print("POST " + path + " HTTP/1.1\r\n");
  client.print("Host: " + host + "\r\n");
  client.print("Content-Type: application/json\r\n");
  client.print("Content-Length: " + String(payload.length()) + "\r\n");
  client.print("Connection: close\r\n\r\n");
  client.print(payload);

  // Aguarda resposta
  unsigned long t0 = millis();
  while (!client.available() && millis() - t0 < 5000) delay(10);

  String statusLine = client.readStringUntil('\n');
  statusLine.trim();
  Serial.println("✓ Calibração confirmada: " + statusLine);

  client.stop();
}

// ============================================================
// MOTOR DE MEDIÇÃO
// ============================================================

void realizarMedicao() {
  Serial.println("\n=== Iniciando medição: " + testType + " ===");

  encerrarMedicao = false;
  numAmostras     = 0;

  int maxSamples = durationMax * SAMPLE_RATE_HZ;
  if (maxSamples > MAX_SAMPLES) maxSamples = MAX_SAMPLES;

  // Alocar buffer
  buffer = (Amostra*) malloc(maxSamples * sizeof(Amostra));
  if (!buffer) {
    Serial.println("✗ Sem memória para o buffer de amostras!");
    return;
  }

  // ---- Ângulo zero e bias do giroscópio ----
  float accelAngle0;
  float gxBias = 0, gyBias = 0, gzBias = 0;

  if (calibrado) {
    accelAngle0 = calAngle0;
    gxBias = calGxBias;
    gyBias = calGyBias;
    gzBias = calGzBias;
    Serial.println("Usando calibração prévia: " + String(accelAngle0, 2) + "°");
  } else {
    // Fallback: amostra única (sem calibração prévia)
    float ax0, ay0, az0, gx0, gy0, gz0;
    lerMPU6050(ax0, ay0, az0, gx0, gy0, gz0);
    accelAngle0 = atan2(ay0, az0) * 180.0f / PI;
    Serial.println("⚠ Sem calibração prévia. Amostra única: " + String(accelAngle0, 2) + "°");
  }

  float anguloFiltrado = accelAngle0;

  // ---- Coleta ----
  unsigned long inicioMs = millis();
  unsigned long ultimaLeitura = inicioMs;

  // Variáveis para oscillation_metrics (AP = eixo Y, ML = eixo X)
  float minAP = 1e6f, maxAP = -1e6f;
  float minML = 1e6f, maxML = -1e6f;
  double somaAP2 = 0, somaML2 = 0;

  // Variáveis para gait_metrics (magnitude escalar)
  double somaMag = 0, somaMagSq = 0;

  // Variables para detecção de repetições (chair_main)
  float anguloPicoAtual = 0.0f;
  float anguloMax       = 0.0f;
  bool  subindo         = false;
  const float MAG_THRESHOLD = 11.0f; // m/s² — acima disso = movimento de levantar
  const int   MAX_REPS = 5;
  float anglesPorRep[MAX_REPS];
  int   numReps = 0;

  while (!encerrarMedicao) {
    unsigned long agora = millis();

    // Respeitar taxa de amostragem
    if (agora - ultimaLeitura < (unsigned long)SAMPLE_INTERVAL_MS) {
      delay(1);
      continue;
    }

    float dt = (agora - ultimaLeitura) / 1000.0f;
    ultimaLeitura = agora;

    // Verificar tempo máximo
    if ((agora - inicioMs) >= (unsigned long)(durationMax * 1000)) {
      Serial.println("→ duration_max atingido.");
      break;
    }

    // Ler sensor e subtrair bias do giroscópio
    float ax, ay, az, gx, gy, gz;
    lerMPU6050(ax, ay, az, gx, gy, gz);
    gx -= gxBias;
    gy -= gyBias;
    gz -= gzBias;

    // Filtro complementar para ângulo de inclinação anterior (eixo X)
    float accelAngle = atan2(ay, az) * 180.0f / PI;
    anguloFiltrado = ALPHA * (anguloFiltrado + gx * dt) + (1.0f - ALPHA) * accelAngle;
    float anguloRelativo = anguloFiltrado - accelAngle0;  // subtrai offset de calibração

    if (fabs(anguloRelativo) > fabs(anguloMax)) {
      anguloMax = anguloRelativo;
    }

    // Acumular métricas AP/ML (oscillation_metrics)
    if (ay < minAP) minAP = ay;
    if (ay > maxAP) maxAP = ay;
    if (ax < minML) minML = ax;
    if (ax > maxML) maxML = ax;
    somaAP2 += (double)ay * ay;
    somaML2 += (double)ax * ax;

    // Acumular magnitude escalar (gait_metrics)
    float mag = sqrt(ax*ax + ay*ay + az*az);
    somaMag   += mag;
    somaMagSq += mag * mag;

    // Detecção de repetições para chair_main
    if (testType == "chair_main" && numReps < MAX_REPS) {
      if (mag > MAG_THRESHOLD) {
        subindo = true;
        if (fabs(anguloRelativo) > fabs(anguloPicoAtual)) {
          anguloPicoAtual = anguloRelativo;
        }
      } else if (subindo && mag < MAG_THRESHOLD - 1.0f) {
        // Borda de descida → paciente sentou → registrar pico da rep
        anglesPorRep[numReps++] = anguloPicoAtual;
        Serial.println("  Rep " + String(numReps) + ": " + String(anguloPicoAtual, 2) + "°");
        anguloPicoAtual = 0.0f;
        subindo = false;
      }

    }

    // Armazenar amostra
    if (numAmostras < maxSamples) {
      buffer[numAmostras] = {
        (uint32_t)(agora - inicioMs),
        ax, ay, az,
        gx, gy, gz
      };
      numAmostras++;
    }
  }

  float duracaoReal = (millis() - inicioMs) / 1000.0f;
  Serial.println("Medição encerrada. Amostras: " + String(numAmostras) +
                 " | Duração: " + String(duracaoReal, 2) + "s");

  // ---- Calcular oscillation_metrics (AP/ML) ----
  float amplitudeAP = (numAmostras > 0) ? (maxAP - minAP) : 0;
  float amplitudeML = (numAmostras > 0) ? (maxML - minML) : 0;
  float rmsAP = (numAmostras > 0) ? sqrt(somaAP2 / numAmostras) : 0;
  float rmsML = (numAmostras > 0) ? sqrt(somaML2 / numAmostras) : 0;

  // ---- Calcular gait_metrics (magnitude escalar) ----
  float avgMag = (numAmostras > 0) ? somaMag / numAmostras : 0;
  float varMag = (numAmostras > 1) ? (somaMagSq / numAmostras) - (avgMag * avgMag) : 0;
  float oscIndex = (varMag > 0) ? sqrt(varMag) : 0;

  // ---- Enviar payload (passa buffer antes de liberar) ----
  enviarLeitura(buffer, numAmostras, duracaoReal,
                amplitudeAP, amplitudeML, rmsAP, rmsML,
                oscIndex, avgMag,
                anguloMax, anglesPorRep, numReps);

  // Liberar buffer
  free(buffer);
  buffer = nullptr;
}

// ============================================================
// ENVIO — POST /iot/reading  (streaming chunked — sem DynamicJsonDocument)
//
// Por que streaming?
// O raw_data de 60s tem ~3.000 amostras → ~180KB de JSON. Montar tudo em
// memória antes de enviar causaria crash. Aqui escrevemos o JSON diretamente
// no socket byte-a-byte usando HTTP/1.1 chunked transfer encoding, gastando
// apenas ~1KB de RAM independente da duração do teste.
// ============================================================

// Acumula bytes num buffer interno e descarrega no socket em blocos de 512B.
// Isso reduz o número de chamadas de escrita TLS (custosas) sem usar muita RAM.
struct ChunkWriter {
  WiFiClientSecure& client;
  char   buf[512];
  size_t pos = 0;

  ChunkWriter(WiFiClientSecure& c) : client(c) {}

  void write(const char* s) {
    while (*s) {
      buf[pos++] = *s++;
      if (pos == sizeof(buf)) flush();
    }
  }

  // Converte float para string e escreve
  void writeFloat(float v, int decimals = 4) {
    char tmp[20];
    dtostrf(v, 1, decimals, tmp);
    write(tmp);
  }

  void writeUInt(uint32_t v) {
    char tmp[12];
    snprintf(tmp, sizeof(tmp), "%lu", (unsigned long)v);
    write(tmp);
  }

  // Envia buffer acumulado como um chunk HTTP
  void flush() {
    if (pos == 0) return;
    // Tamanho do chunk em hex + CRLF
    char header[10];
    snprintf(header, sizeof(header), "%X\r\n", pos);
    client.print(header);
    client.write((uint8_t*)buf, pos);
    client.print("\r\n");
    pos = 0;
  }

  // Encerra o body chunked (chunk final de tamanho 0)
  void end() {
    flush();
    client.print("0\r\n\r\n");
  }
};

void enviarLeitura(Amostra* buf, int nAmostras,
                   float duracaoReal,
                   float amplitudeAP, float amplitudeML,
                   float rmsAP, float rmsML,
                   float oscIndex, float avgMag,
                   float anguloMax, float* anglesPorRep, int numReps) {

  Serial.println("\n→ Enviando leitura ao servidor...");
  Serial.print("  Heap livre antes do envio: ");
  Serial.println(ESP.getFreeHeap());

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ Sem WiFi para enviar. Dado perdido.");
    return;
  }

  // ---- Extrair host e path da SERVER_BASE_URL ----
  String base = String(SERVER_BASE_URL);
  base.replace("https://", "");
  int slash   = base.indexOf('/');
  String host = base.substring(0, slash);
  String path = base.substring(slash) + "/iot/reading";

  // ---- Abrir conexão TLS ----
  WiFiClientSecure client;
  client.setInsecure();  // dev only — ver nota no final do arquivo
  client.setTimeout(15);

  if (!client.connect(host.c_str(), 443)) {
    Serial.println("✗ Falha ao conectar para envio POST.");
    return;
  }

  // ---- Cabeçalhos HTTP ----
  client.print("POST " + path + " HTTP/1.1\r\n");
  client.print("Host: " + host + "\r\n");
  client.print("Content-Type: application/json\r\n");
  client.print("Transfer-Encoding: chunked\r\n");
  client.print("Connection: close\r\n\r\n");

  // ---- Escrever JSON em streaming ----
  ChunkWriter cw(client);

  // Abertura + campos escalares
  cw.write("{");
  cw.write("\"session_id\":\"");  cw.write(sessionId.c_str());  cw.write("\",");
  cw.write("\"test_type\":\"");   cw.write(testType.c_str());   cw.write("\",");
  cw.write("\"command_id\":\"");  cw.write(commandId.c_str());  cw.write("\",");

  // raw_data — formato: {ts_ms, accel:{x,y,z}, gyro:{x,y,z}}
  cw.write("\"raw_data\":[");
  for (int i = 0; i < nAmostras; i++) {
    if (i > 0) cw.write(",");
    cw.write("{\"ts_ms\":");    cw.writeUInt(buf[i].t);
    cw.write(",\"accel\":{\"x\":"); cw.writeFloat(buf[i].ax);
    cw.write(",\"y\":"); cw.writeFloat(buf[i].ay);
    cw.write(",\"z\":"); cw.writeFloat(buf[i].az);
    cw.write("},\"gyro\":{\"x\":"); cw.writeFloat(buf[i].gx);
    cw.write(",\"y\":"); cw.writeFloat(buf[i].gy);
    cw.write(",\"z\":"); cw.writeFloat(buf[i].gz);
    cw.write("}}");
  }
  cw.write("],");

  // oscillation_metrics — AP (eixo Y) e ML (eixo X)
  cw.write("\"oscillation_metrics\":{");
  cw.write("\"amplitude_ap\":"); cw.writeFloat(amplitudeAP);
  cw.write(",\"amplitude_ml\":"); cw.writeFloat(amplitudeML);
  cw.write(",\"rms_ap\":"); cw.writeFloat(rmsAP);
  cw.write(",\"rms_ml\":"); cw.writeFloat(rmsML);
  cw.write(",\"duration_s\":"); cw.writeFloat(duracaoReal, 2);
  cw.write("},");

  // gait_metrics — magnitude escalar + ângulos de inclinação
  cw.write("\"gait_metrics\":{");
  cw.write("\"oscillation_index\":"); cw.writeFloat(oscIndex);
  cw.write(",\"avg_accel_magnitude\":"); cw.writeFloat(avgMag);
  cw.write(",\"duration_s\":"); cw.writeFloat(duracaoReal, 2);
  cw.write(",\"max_angle\":"); cw.writeFloat(anguloMax, 2);
  cw.write(",\"angles_per_rep\":[");
  for (int i = 0; i < numReps; i++) {
    if (i > 0) cw.write(",");
    cw.writeFloat(anglesPorRep[i], 2);
  }
  cw.write("]}}");  // fecha gait_metrics + objeto raiz

  cw.end();  // chunk final → sinaliza fim do body ao servidor

  // ---- Ler resposta HTTP ----
  // Aguarda resposta (timeout 10s)
  unsigned long t0 = millis();
  while (!client.available() && millis() - t0 < 10000) delay(10);

  // Primeira linha = status HTTP (ex: "HTTP/1.1 200 OK")
  String statusLine = client.readStringUntil('\n');
  statusLine.trim();
  Serial.println("✓ Resposta: " + statusLine);

  // Descartar cabeçalhos até linha vazia
  while (client.connected()) {
    String line = client.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) break;
  }

  // Ler body (até 512 chars para log)
  String body = "";
  while (client.available() && body.length() < 512) {
    body += (char)client.read();
  }
  if (body.length() > 0) Serial.println(body);

  client.stop();

  Serial.print("  Heap livre após envio: ");
  Serial.println(ESP.getFreeHeap());
}

/*
 * NOTA SOBRE CERTIFICADO SSL:
 * client.setInsecure() desativa a validação do certificado TLS.
 * Aceitável em desenvolvimento. Em produção, substitua pelo certificado
 * raiz da Supabase: client.setCACert(supabase_root_cert_pem).
 *
 * NOTA SOBRE MEMÓRIA:
 * O buffer de amostras (Amostra*) consome ~84KB para 60s × 50Hz.
 * O ChunkWriter usa apenas 512 bytes fixos na stack.
 * Total em uso durante envio: ~85KB — confortável para o ESP32.
 */
