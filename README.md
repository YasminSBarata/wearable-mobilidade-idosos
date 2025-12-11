# 🏥 Monitoramento de Mobilidade Física para Prevenção de Quedas em Idosos

<div align="center">

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)
![Hardware](https://img.shields.io/badge/hardware-ESP32-green)
![CNPq](https://img.shields.io/badge/CNPq-PIBICT-red)

**Dispositivo wearable para monitoramento da mobilidade física de pacientes gerontológicos**

</div>

---

## 📋 Sobre o Projeto

Este projeto desenvolve uma **tecnologia automatizada para monitoramento da mobilidade física** de idosos, com foco na **prevenção de quedas**. O sistema coleta dados em tempo real sobre movimentos, passos, frequência cardíaca e saturação de oxigênio (SpO2), permitindo o acompanhamento contínuo e detecção precoce de riscos.

### Contexto

O envelhecimento populacional é uma realidade crescente no Brasil (aproximadamente 32 milhões de idosos segundo o Censo 2022). O sedentarismo e a perda de mobilidade aumentam significativamente o risco de quedas, uma das principais causas de lesões e mortes em idosos. Este projeto visa mitigar esses riscos através de tecnologia acessível e não intrusiva.

### Solução Proposta

Um dispositivo **compacto, leve e portátil** que:

- ✅ Monitora movimentos e atividade física
- ✅ Detecta padrões de risco e quedas
- ✅ Acompanha frequência cardíaca e SpO2
- ✅ Armazena dados localmente e na nuvem
- ✅ Fornece dashboard web para visualização
- ✅ Gera relatórios para profissionais de saúde

---

## 🔧 Hardware

### Componentes Principais

| Componente                      | Função                     | Observações                      |
| ------------------------------- | -------------------------- | -------------------------------- |
| **ESP32 com gerenciador 18650** | Microcontrolador + WiFi/BT | Gerenciamento de carga integrado |
| **MPU6050**                     | Acelerômetro + Giroscópio  | Detecção de movimento e quedas   |
| **MAX30100/30102**              | Frequência cardíaca + SpO2 | Monitor cardíaco                 |
| **Módulo SD Card**              | Armazenamento local        | Backup de dados                  |
| **Bateria 18650**               | Alimentação portátil       | 3000-3500mAh, 1-4 dias autonomia |

**Custo estimado:** R$ 195-270

### Pinout Simplificado

```
ESP32 Conexões:

I2C (GPIO21, GPIO22):
├─ MPU6050 (acelerômetro/giroscópio)
└─ MAX30100 (frequência cardíaca)

SPI (GPIO5, GPIO18, GPIO19, GPIO23):
└─ SD Card (armazenamento)

Alimentação:
├─ Bateria 18650 no slot
└─ Carregamento via Micro USB
```

---

## 💻 Software

### Arquitetura

```
Sistema de Monitoramento
├─ Firmware (ESP32)
│  ├─ Leitura de sensores
│  ├─ Algoritmos (passos, quedas, atividade)
│  ├─ Armazenamento local (SD Card)
│  └─ Transmissão de dados (WiFi)
│
└─ Aplicação Web
     ├─ Backend leve (FastAPI)
     │  ├─ Recebe dados do ESP32 via WiFi
     │  ├─ Salva no PostgreSQL
     │  └─ API REST simples
     │
     └─ Frontend (Streamlit)
        ├─ Conecta com API
        ├─ Análise com Pandas + NumPy
        └─ Dashboards interativos
```

### Funcionalidades

- 📊 **Contador de passos** - Algoritmo de detecção de caminhada
- 🚨 **Detecção de quedas** - Sistema de alerta em tempo real
- 💓 **Monitoramento cardíaco** - Frequência cardíaca e SpO2
- 📈 **Análise de atividade** - Identificação de sedentarismo
- 💾 **Backup local** - Dados salvos no SD Card
- 📱 **Dashboard web** - Visualização em tempo real - Streamlit Cloud
- 📄 **Relatórios PDF** - Para compartilhamento com profissionais - ReportLab (PDF)

---

## 🚀 Instalação Rápida

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/monitoramento-mobilidade-idosos.git
cd monitoramento-mobilidade-idosos
```

### 2. Configure o Arduino IDE

- Instale o Arduino IDE 2.0+
- Adicione suporte ao ESP32
- Instale as bibliotecas necessárias:
  - Adafruit MPU6050
  - MAX30100_PulseOximeter
  - ArduinoJson

### 3. Configure o firmware

```bash
cp firmware/main/config.example.h firmware/main/config.h
# Edite config.h com suas credenciais WiFi e API
```

### 4. Compile e faça upload

- Conecte o ESP32 via USB
- Selecione a placa: `ESP32 Dev Module`
- Compile e faça upload

---

## 📖 Documentação

- **Hardware:** Componentes, pinout e montagem
- **Software:** Instalação, configuração e uso
- **Pesquisa:** Metodologia, objetivos e resultados

---

## 🔬 Pesquisa Acadêmica

### Programa PIBICT Cesupa/CNPq

Este projeto é desenvolvido no âmbito do **Programa Institucional de Bolsas de Iniciação Científica, Desenvolvimento Tecnológico e Inovação (PIBICT)**, financiado pelo CNPq.

### Metodologia

**Fase 1: Desenvolvimento Tecnológico**

- Levantamento de requisitos
- Seleção de componentes
- Desenvolvimento do protótipo
- Integração hardware/software

**Fase 2: Validação**

- Testes com voluntário idoso
- Avaliações fisioterapêuticas (TUG, velocidade de marcha, força muscular)
- Período de uso: 20-30 dias
- Análise de resultados

### Objetivos

**Objetivo Geral:**  
Desenvolver tecnologia automatizada para monitoramento de mobilidade física e prevenção de quedas em idosos.

**Objetivos Específicos:**

- Monitorar parâmetros de mobilidade, passos e sinais vitais
- Criar protótipo funcional considerando segurança e acessibilidade
- Validar tecnologia com testes em idoso voluntário
- Avaliar eficácia na detecção de riscos de quedas

---

## 👥 Equipe

### Orientadoras

- **Prof. Alessandra Natasha Alcântara Barreiros Baganha**
- **Prof. Wiviane Maria Torres de Matos Freitas**

### Bolsistas

- **Rafaely Sarraf Rezegue**
- **Yasmin dos Santos Barata**

### Instituição

**Centro Universitário do Estado do Pará (CESUPA)**  
Associação Cultural e Educacional do Pará (ACEPA)

---

## 📄 Licença

Este projeto está sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 📞 Contato

- **Email:** yasminteo1@gmail.com
- **Issues:** [GitHub Issues](https://github.com/seu-usuario/monitoramento-mobilidade-idosos/issues)

---

## 📚 Referências Principais

- BEARD JR et al. O relatório mundial sobre envelhecimento e saúde. Lancet, 2016.
- IBGE. Censo 2022: Projeção da População. Rio de Janeiro, 2022.
- OPAS. Envelhecimento ativo: uma política de saúde. Brasília, 2005.
- ZAGO, A. S. Exercício físico e o processo saúde-doença no envelhecimento. Rev Bras Geriatr Gerontol, 2010.

---

## 🌍 English Summary

**Automated Physical Mobility Monitoring Technology for Fall Prevention in Elderly Patients**

This project develops a wearable device for real-time monitoring of physical mobility in elderly individuals to prevent falls. The system uses an ESP32 microcontroller with integrated sensors (MPU6050 accelerometer/gyroscope and MAX30100 heart rate/SpO2 sensor) to collect movement data, count steps, and detect fall patterns. Data is stored locally on an SD card and transmitted via WiFi to a web application built with React/Next.js and Node.js/Nest.js, providing real-time visualization and PDF reports for healthcare professionals. The device features an 18650 Li-ion battery with integrated charging management, offering 1-4 days of autonomy. This research is part of the CNPq PIBICT program at CESUPA (Centro Universitário do Estado do Pará) and aims to promote active aging and functional independence through accessible, non-intrusive technology. The validation phase includes physiotherapy assessments (TUG test, gait speed, muscle strength) before and after a 20-30 day usage period with elderly volunteers.

---
