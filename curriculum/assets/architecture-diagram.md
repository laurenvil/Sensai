# Architecture Diagrams

Mermaid diagrams showing the Sensai Arduino Lab architecture and data flows.

---

## The Uno Q Dual-Processor Architecture

```mermaid
graph TB
    subgraph "Arduino Uno Q Board"
        subgraph "MPU — Linux Side (QRB2210)"
            A["Sensai AI Assistant"]
            B["llama-server (Qwen3 model)"]
            C["arduino-cli"]
            D["Python / Bridge API"]
            A --> B
            A --> C
        end

        subgraph "MCU — Arduino Side (STM32U585)"
            E["Your Arduino Sketch (.ino)"]
            F["GPIO / PWM / ADC"]
            G["I2C / SPI / UART"]
            E --> F
            E --> G
        end

        C -->|"compile + upload (SWD)"| E
        D <-->|"Bridge RPC"| E
    end

    subgraph "Physical World"
        H["LEDs / Buzzers / Motors"]
        I["Sensors / Buttons / Pots"]
    end

    F --> H
    I --> F

    style A fill:#8e44ad,color:#fff
    style B fill:#e67e22,color:#fff
    style E fill:#00979D,color:#fff
    style C fill:#27ae60,color:#fff
```

---

## Student → Sensai → Board Pipeline

```mermaid
sequenceDiagram
    participant S as Student
    participant AI as Sensai (MPU)
    participant CLI as arduino-cli (MPU)
    participant MCU as STM32U585 (MCU)
    participant HW as Hardware (LEDs/Sensors)

    S->>AI: "Upload a blink sketch for pin 13"
    AI->>AI: Generate Arduino sketch
    AI->>CLI: compile + upload sketch
    CLI->>MCU: Flash binary via SWD
    MCU->>HW: digitalWrite(13, HIGH/LOW)
    HW-->>S: LED blinks! 🎉
    AI-->>S: "Done! Try changing 500 to 100."
```

---

## Curriculum Learning Path

```mermaid
graph LR
    subgraph "Phase 1: Foundations 🧱"
        M1["01 Welcome"] --> M2["02 First Circuit"]
        M2 --> M3["03 Variables & Logic"]
    end

    subgraph "Phase 2: Sensing 📡"
        M3 --> M4["04 Reading the World"]
        M4 --> M5["05 Environment Sensors"]
        M5 --> M6["06 Serial Communication"]
    end

    subgraph "Phase 3: Actuators ⚙️"
        M6 --> M7["07 Motors & PWM"]
        M7 --> M8["08 I2C & SPI"]
    end

    subgraph "Phase 4: IoT 🌐"
        M8 --> M9["09 IoT Projects"]
        M9 --> M10["10 Demo Day 🎓"]
    end

    style M1 fill:#3498db,color:#fff
    style M2 fill:#3498db,color:#fff
    style M3 fill:#3498db,color:#fff
    style M4 fill:#2ecc71,color:#fff
    style M5 fill:#2ecc71,color:#fff
    style M6 fill:#2ecc71,color:#fff
    style M7 fill:#e67e22,color:#fff
    style M8 fill:#e67e22,color:#fff
    style M9 fill:#e74c3c,color:#fff
    style M10 fill:#e74c3c,color:#fff
```

---

## IoT Project Architecture (Module 9)

```mermaid
graph TB
    subgraph "Sensors"
        S1["Soil Moisture"]
        S2["DHT22 (Temp/Humidity)"]
        S3["Light Sensor (LDR)"]
    end

    subgraph "Arduino MCU (STM32U585)"
        A["Read Sensors"]
        B["Process Data"]
        C["Control Actuators"]
        A --> B
        B --> C
    end

    subgraph "Actuators"
        D["Water Pump (via Relay)"]
        E["Status LEDs"]
        F["OLED Display"]
    end

    subgraph "Linux MPU (QRB2210)"
        G["Sensai AI"]
        H["Data Logger"]
        I["Bridge API"]
    end

    S1 --> A
    S2 --> A
    S3 --> A
    C --> D
    C --> E
    C --> F
    I <-->|Bridge| B
    G --> I
    B --> H

    style A fill:#00979D,color:#fff
    style G fill:#8e44ad,color:#fff
```
