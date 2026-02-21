/*
 * Código para ESP32 + MPU6050
 * Envia dados de acelerômetro e giroscópio para o servidor
 * 
 * HARDWARE NECESSÁRIO:
 * - ESP32 ou ESP8266
 * - MPU6050 (acelerômetro + giroscópio)
 * 
 * CONEXÕES MPU6050 -> ESP32:
 * - VCC -> 3.3V
 * - GND -> GND
 * - SCL -> GPIO 22
 * - SDA -> GPIO 21
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <ArduinoJson.h>

// ============================================
// CONFIGURAÇÕES 
// ============================================

// WiFi
const char* WIFI_SSID = "wifi";
const char* WIFI_PASSWORD = "senha";

// Servidor (URL do Supabase Edge Functions)
const char* SERVER_URL = "https:...";

// Credenciais do dispositivo (obtidas ao registrar o dispositivo no dashboard)
const char* DEVICE_ID = "SEU_DEVICE_ID_AQUI";
const char* API_KEY = "SUA_API_KEY_AQUI";

// Intervalo de envio em milissegundos (5 segundos)
const unsigned long SEND_INTERVAL = 5000;

// ============================================
// CONFIGURAÇÕES DO MPU6050
// ============================================
const int MPU_ADDR = 0x68;

// Variáveis para armazenar dados do sensor
float accelX, accelY, accelZ;
float gyroX, gyroY, gyroZ;
float temperature;

unsigned long lastSendTime = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Monitor de Paciente - ESP32 ===");
  
  // Inicializar I2C
  Wire.begin();
  
  // Inicializar MPU6050
  initMPU6050();
  
  // Conectar ao WiFi
  connectWiFi();
}

void loop() {
  // Verificar conexão WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi desconectado. Reconectando...");
    connectWiFi();
  }
  
  // Ler dados do sensor
  readMPU6050();
  
  // Enviar dados a cada intervalo definido
  if (millis() - lastSendTime >= SEND_INTERVAL) {
    sendDataToServer();
    lastSendTime = millis();
  }
  
  delay(100); // Pequeno delay para não sobrecarregar
}

// ============================================
// FUNÇÕES DO WIFI
// ============================================

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
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi conectado!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n✗ Falha ao conectar WiFi");
  }
}

// ============================================
// FUNÇÕES DO MPU6050
// ============================================

void initMPU6050() {
  Serial.println("Inicializando MPU6050...");
  
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);  // Registrador PWR_MGMT_1
  Wire.write(0);     // Despertar o MPU6050
  Wire.endTransmission(true);
  
  // Configurar sensibilidade do acelerômetro (±2g)
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x1C);  // Registrador ACCEL_CONFIG
  Wire.write(0x00);  // ±2g
  Wire.endTransmission(true);
  
  // Configurar sensibilidade do giroscópio (±250°/s)
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x1B);  // Registrador GYRO_CONFIG
  Wire.write(0x00);  // ±250°/s
  Wire.endTransmission(true);
  
  Serial.println("✓ MPU6050 inicializado!");
}

void readMPU6050() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);  // Começar no registrador ACCEL_XOUT_H
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 14, true);  // Ler 14 bytes
  
  // Ler acelerômetro (valores raw)
  int16_t rawAccelX = Wire.read() << 8 | Wire.read();
  int16_t rawAccelY = Wire.read() << 8 | Wire.read();
  int16_t rawAccelZ = Wire.read() << 8 | Wire.read();
  
  // Ler temperatura (raw)
  int16_t rawTemp = Wire.read() << 8 | Wire.read();
  
  // Ler giroscópio (valores raw)
  int16_t rawGyroX = Wire.read() << 8 | Wire.read();
  int16_t rawGyroY = Wire.read() << 8 | Wire.read();
  int16_t rawGyroZ = Wire.read() << 8 | Wire.read();
  
  // Converter para unidades físicas
  // Acelerômetro: dividir por 16384 para ±2g (resultado em g)
  accelX = rawAccelX / 16384.0;
  accelY = rawAccelY / 16384.0;
  accelZ = rawAccelZ / 16384.0;
  
  // Temperatura: fórmula do datasheet
  temperature = (rawTemp / 340.0) + 36.53;
  
  // Giroscópio: dividir por 131 para ±250°/s (resultado em °/s)
  gyroX = rawGyroX / 131.0;
  gyroY = rawGyroY / 131.0;
  gyroZ = rawGyroZ / 131.0;
}

// ============================================
// FUNÇÕES DE COMUNICAÇÃO COM SERVIDOR
// ============================================

void sendDataToServer() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ Sem conexão WiFi para enviar dados");
    return;
  }
  
  HTTPClient http;
  http.begin(SERVER_URL);
  
  // Headers
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("X-Device-Key", API_KEY);
  
  // Criar JSON com os dados
  StaticJsonDocument<512> doc;
  
  JsonObject accel = doc.createNestedObject("accel");
  accel["x"] = accelX;
  accel["y"] = accelY;
  accel["z"] = accelZ;
  
  JsonObject gyro = doc.createNestedObject("gyro");
  gyro["x"] = gyroX;
  gyro["y"] = gyroY;
  gyro["z"] = gyroZ;
  
  doc["temperature"] = temperature;
  doc["timestamp"] = millis();
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("\n--- Enviando dados ---");
  Serial.print("Accel: ");
  Serial.print(accelX); Serial.print(", ");
  Serial.print(accelY); Serial.print(", ");
  Serial.println(accelZ);
  Serial.print("Gyro: ");
  Serial.print(gyroX); Serial.print(", ");
  Serial.print(gyroY); Serial.print(", ");
  Serial.println(gyroZ);
  Serial.print("Temp: ");
  Serial.println(temperature);
  
  // Enviar requisição POST
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("✓ Resposta (");
    Serial.print(httpResponseCode);
    Serial.print("): ");
    Serial.println(response);
    
    // Parse da resposta para verificar alertas
    StaticJsonDocument<256> responseDoc;
    if (deserializeJson(responseDoc, response) == DeserializationError::Ok) {
      if (responseDoc["computed"]["possibleFall"] == true) {
        Serial.println("⚠️ ALERTA: Possível queda detectada pelo servidor!");
        // Aqui você pode adicionar um buzzer ou LED para alertar
      }
    }
  } else {
    Serial.print("✗ Erro HTTP: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}

/*
 * BIBLIOTECAS NECESSÁRIAS (instalar via Arduino IDE):
 * - ArduinoJson by Benoit Blanchon
 * - (WiFi e Wire já vêm com o ESP32)
 * 
 * COMO USAR:
 * 1. Registre um dispositivo no dashboard web (vai gerar DEVICE_ID e API_KEY)
 * 2. Preencha as configurações no início deste código
 * 3. Faça upload para o ESP32
 * 4. Os dados aparecerão automaticamente no dashboard
 * 
 * PARA TESTES SEM MPU6050:
 * Comente a função readMPU6050() no loop() e defina valores fixos
 * para testar a comunicação com o servidor.
 */
