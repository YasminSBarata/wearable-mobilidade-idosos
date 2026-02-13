/*
 * Código SIMPLES para testar conexão ESP32 -> Dashboard
 *
 * O QUE FAZ:
 * - Conecta no WiFi
 * - Envia dados de teste a cada 10 segundos
 * - Mostra o resultado no Serial Monitor
 *
 * COMO USAR:
 * 1. Configure WiFi, DEVICE_ID e API_KEY abaixo
 * 2. Abra o Serial Monitor (115200 baud)
 * 3. Faça upload para o ESP32
 * 4. Veja os dados aparecerem no dashboard
 */

#include <WiFi.h>
#include <HTTPClient.h>

// ============================================
// CONFIGURE AQUI - ALTERE ESTES VALORES
// ============================================

// WiFi
const char* WIFI_SSID = "SUA_REDE_WIFI";
const char* WIFI_PASSWORD = "SUA_SENHA_WIFI";

// Servidor Supabase (obtenha sua URL no dashboard Supabase)
const char* SERVER_URL = "https://ewbwxqqwpafqtmiscgsn.supabase.co/functions/v1/iot/metrics";

// Credenciais do dispositivo (obter no dashboard web - botão "Registrar Dispositivo")
const char* DEVICE_ID = "SEU_DEVICE_ID_AQUI";
const char* API_KEY = "SUA_API_KEY_AQUI";

// Intervalo de envio (10 segundos para teste)
const unsigned long SEND_INTERVAL = 10000;

// ============================================
// NÃO PRECISA ALTERAR DAQUI PRA BAIXO
// ============================================

unsigned long lastSendTime = 0;
int testCounter = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\n=================================");
  Serial.println("   ESP32 - TESTE DE CONEXAO");
  Serial.println("=================================\n");

  connectWiFi();
}

void loop() {
  unsigned long currentTime = millis();

  // Verificar conexão WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi desconectado! Reconectando...");
    connectWiFi();
  }

  // Enviar dados a cada SEND_INTERVAL
  if (currentTime - lastSendTime >= SEND_INTERVAL) {
    sendTestData();
    lastSendTime = currentTime;
  }

  delay(100);
}

void connectWiFi() {
  Serial.print("Conectando ao WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✓ WiFi conectado!");
    Serial.print("✓ IP: ");
    Serial.println(WiFi.localIP());
    Serial.println();
  } else {
    Serial.println("✗ ERRO: Falha ao conectar WiFi");
    Serial.println("  Verifique o SSID e senha!");
    Serial.println();
  }
}

void sendTestData() {
  testCounter++;

  Serial.println("─────────────────────────────────");
  Serial.print("Teste #");
  Serial.println(testCounter);
  Serial.println("─────────────────────────────────");

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ Sem conexão WiFi");
    return;
  }

  HTTPClient http;
  http.begin(SERVER_URL);

  // Headers de autenticação
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("X-Device-Key", API_KEY);

  // Dados de teste (valores fake mas realistas)
  String jsonData = "{";
  jsonData += "\"metrics\":{";
  jsonData += "\"stepCount\":" + String(100 + testCounter * 10) + ",";
  jsonData += "\"averageCadence\":95.5,";
  jsonData += "\"timeSeated\":0.5,";
  jsonData += "\"timeStanding\":0.3,";
  jsonData += "\"timeWalking\":0.2,";
  jsonData += "\"gaitSpeed\":0.85,";
  jsonData += "\"posturalStability\":80,";
  jsonData += "\"fallDetected\":false,";
  jsonData += "\"inactivityEpisodes\":0,";
  jsonData += "\"inactivityAvgDuration\":0,";
  jsonData += "\"tugEstimated\":12.5,";
  jsonData += "\"abruptTransitions\":2,";
  jsonData += "\"hourlyActivity\":[0,0,0,0,0,0,5.2,12.1,8.3,6.5,4.2,3.8,5.1,7.2,9.4,11.2,8.7,6.3,4.1,2.9,1.5,0.8,0.3,0.1]";
  jsonData += "},";
  jsonData += "\"timestamp\":" + String(millis());
  jsonData += "}";

  Serial.println("Enviando dados...");
  Serial.print("URL: ");
  Serial.println(SERVER_URL);
  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);
  Serial.print("Dados: ");
  Serial.println(jsonData);
  Serial.println();

  int httpResponseCode = http.POST(jsonData);

  if (httpResponseCode > 0) {
    String response = http.getString();

    if (httpResponseCode == 200) {
      Serial.println("✓✓✓ SUCESSO! ✓✓✓");
      Serial.print("Código: ");
      Serial.println(httpResponseCode);
      Serial.print("Resposta: ");
      Serial.println(response);
      Serial.println("\n→ Verifique o dashboard para ver os dados!");
    } else {
      Serial.println("✗ ERRO na resposta do servidor");
      Serial.print("Código HTTP: ");
      Serial.println(httpResponseCode);
      Serial.print("Resposta: ");
      Serial.println(response);

      if (httpResponseCode == 401) {
        Serial.println("\n⚠️  PROBLEMA DE AUTENTICAÇÃO");
        Serial.println("   - Verifique se o DEVICE_ID está correto");
        Serial.println("   - Verifique se a API_KEY está correta");
        Serial.println("   - Registre o dispositivo no dashboard se ainda não fez");
      } else if (httpResponseCode == 404) {
        Serial.println("\n⚠️  ENDPOINT NÃO ENCONTRADO");
        Serial.println("   - Verifique a URL do servidor");
      }
    }
  } else {
    Serial.println("✗✗✗ ERRO DE CONEXÃO ✗✗✗");
    Serial.print("Código de erro: ");
    Serial.println(httpResponseCode);

    if (httpResponseCode == -1) {
      Serial.println("\n⚠️  Possíveis causas:");
      Serial.println("   - Servidor fora do ar");
      Serial.println("   - URL incorreta");
      Serial.println("   - Problemas de firewall");
    }
  }

  http.end();
  Serial.println("─────────────────────────────────\n");
}
