# Sensai Architecture Study Bible

How Sensai turns a student's natural language question into working Arduino code on the Uno Q board. This document is for both developers working on Sensai and for students who want to understand how the system works under the hood.

---

## Part 1: The Hardware — Arduino Uno Q

### The Big Picture: Two Brains, One Board

The Arduino Uno Q is not a single computer. It is two computers on one board that talk to each other.

```
┌────────────────────────────────────────────────────────────┐
│                    Arduino Uno Q                            │
│                                                             │
│  ┌──────────────────────┐    Bridge (RPC)    ┌──────────┐  │
│  │  MPU — Linux Side    │◄──────────────────►│  MCU     │  │
│  │  Qualcomm QRB2210    │   USB CDC / UART   │ STM32U585│  │
│  │  Cortex-A53 × 4      │                   │Cortex-M33│  │
│  │  2.0 GHz, 4 GB RAM   │                   │160 MHz   │  │
│  │  Debian Linux        │                   │Arduino   │  │
│  │                      │                   │Core +    │  │
│  │  ► Sensai lives here │                   │Zephyr OS │  │
│  │  ► Python programs   │                   │          │  │
│  │  ► AI inference      │                   │► Sketches│  │
│  │  ► OpenCV / web      │                   │► GPIO    │  │
│  │  ► llama-server      │                   │► PWM/ADC │  │
│  └──────────────────────┘                   └──────────┘  │
│                                                             │
│  1.8 V I/O domain (MPU)        3.3 V I/O domain (MCU)      │
└────────────────────────────────────────────────────────────┘
```

### The MPU: Where Sensai Lives

| Attribute | Detail |
|-----------|--------|
| Chip | Qualcomm Dragonwing QRB2210 |
| CPU | 4× ARM Cortex-A53 @ 2.0 GHz (64-bit) |
| GPU | Adreno 702 @ 845 MHz — OpenGL, Vulkan, OpenCL 2.0 |
| RAM | 2 GB or 4 GB LPDDR4X |
| Storage | 16 GB or 32 GB eMMC |
| OS | Debian Linux |
| I/O voltage | **1.8 V** (NOT accessible from Arduino sketches) |
| Wireless | Wi-Fi 5 (802.11a/b/g/n/ac) + Bluetooth 5.1 |

The MPU handles everything Linux: running Python programs, serving web pages, processing camera images with OpenCV, running AI inference with llama-server, and hosting Sensai itself. Its GPIO pins operate at 1.8 V and are dedicated to system functions (camera control, display, audio). They are NOT the Arduino pins a student uses for their project.

### The MCU: Where Arduino Sketches Run

| Attribute | Detail |
|-----------|--------|
| Chip | STMicroelectronics STM32U585 |
| CPU | ARM Cortex-M33 @ up to 160 MHz |
| Flash | 2 MB |
| SRAM | 786 kB |
| OS | Zephyr RTOS + Arduino Core |
| I/O voltage | **3.3 V** |

The MCU is the real-time controller. It manages every Arduino pin on the headers: digital I/O, PWM, ADC, SPI, I2C, UART, CAN. When a student writes `digitalWrite(13, HIGH)`, that instruction runs on the STM32U585 — not on the Linux processor.

**This means Arduino sketches run on the MCU, not on Linux.**

### Bridge: The Communication Layer

Bridge is Arduino's RPC (Remote Procedure Call) library that connects the two processors. It lets either side call functions on the other:

- A Python script on Linux can call an MCU function to read a sensor
- An Arduino sketch can call a Linux service to log data or fetch AI inference

Physical transports: USB CDC (virtual serial port), UART, or SPI.

```
Python (Linux)                    Arduino Sketch (MCU)
─────────────────                 ─────────────────────
from bridge import ...            #include <Bridge.h>
sensor = bridge.call("read_A0")  Bridge.begin();
print(sensor)                    // expose a service
```

---

## Part 2: The Pin Map

### Headers and Their Owners

| Header | Label | Pins | Owner | Voltage | Purpose |
|--------|-------|------|-------|---------|---------|
| JDIGITAL | A2 | 18-pin | MCU | 3.3 V | Digital I/O, PWM, SPI, UART, CAN |
| JANALOG | A3 | 14-pin | MCU | 3.3 V | ADC, analog I/O, power |
| Qwiic | A4 | 4-pin | MCU | 3.3 V | I2C4 plug-and-play ecosystem |
| JSPI | A5 | 6-pin | MCU | 3.3 V | Dedicated SPI header |
| JCTL | A1 | 10-pin | MPU | 1.8 V | Boot, reset, console (not for user IO) |
| JMISC | B1 | 60-pin | Mixed | 1.8/3.3 V | Advanced: audio, MPU GPIO, MCU debug |
| JMEDIA | B2 | 60-pin | MPU | 1.8 V | MIPI camera, display (not for user IO) |

### JDIGITAL (A2) — Full Pin Reference

All pins are 3.3 V logic on the STM32U585. Tilde (~) means PWM-capable.

| Arduino Pin | STM32 Pin | Key Alternate Functions | Notes |
|-------------|-----------|-------------------------|-------|
| D0 (RX) | PB7 | USART1_RX | Serial RX |
| D1 (TX) | PB6 | USART1_TX, TIM4_CH2 | Serial TX |
| D2 | PB3 | TIM4_CH1 | GPIO |
| **~D3** | PB0 | **TIM2_CH2** (PWM), OPAMP2_OUT | PWM |
| D4 | PA12 | TIM3_CH3, FDCAN1_TX | CAN TX |
| **~D5** | PA11 | TIM1, FDCAN1_RX | PWM, CAN RX |
| **~D6** | PB1 | **TIM3_CH4, TIM8_CH4N** | PWM |
| D7 | PB2 | TIM3_CH1, TIM4_CH3 | GPIO |
| D8 | PB4 | TIM1 | GPIO |
| **~D9** | PB8 | **TIM4_CH4** | PWM |
| **~D10** | PB9 | **TIM1_CH4**, SPI2_SS | PWM, SPI Chip Select |
| **~D11** | PB15 | **TIM1_CH3N**, SPI2_MOSI | PWM, SPI MOSI |
| D12 | PB14 | TIM1_CH2N, SPI2_MISO | SPI MISO |
| D13 | PB13 | TIM1_CH1N, SPI2_SCK | SPI SCK |
| GND | — | — | Ground |
| AREF | PB11 | Analog reference (output, not GPIO) | Tied to 3.3 V |
| D20 (SDA) | — | I2C2_SDA, TIM2_CH4 | Wire SDA |
| D21 (SCL) | PB10 | I2C2_SCL, TIM2_CH3 | Wire SCL |

**SPI bus (D10–D13):** Standard Arduino SPI pinout. D10 = CS, D11 = MOSI, D12 = MISO, D13 = SCK.
**I2C bus (D20/D21):** `Wire.begin()` in a sketch uses I2C2 (SDA=D20, SCL=D21).
**UART (D0/D1):** `Serial.begin(9600)` accesses USART1. Note: D0/D1 are also the USB-serial passthrough on the classic Uno — on the Uno Q these map to USART1 on the MCU.
**CAN bus (D4/D5):** FDCAN1 is available on D4 (TX) and D5 (RX) for automotive/industrial applications.

### JANALOG (A3) — Full Pin Reference

⚠ **CRITICAL VOLTAGE DIFFERENCE FROM CLASSIC ARDUINO UNO:**
Classic Arduino Uno = 5 V ADC, 0–5 V input range.
Arduino Uno Q = 3.3 V ADC, **0–3.3 V input range**. A0–A5 are NOT 5 V-tolerant in ADC mode (absolute max: ~3.6 V). Applying 5 V will damage the MCU.

| Pin | STM32 | ADC Range | Alternate Functions | Notes |
|-----|-------|-----------|---------------------|-------|
| A0 / D14 | PA4 | 0–3.3 V | DAC0, TIM2_CH1 | Also a DAC output |
| A1 / D15 | PA5 | 0–3.3 V | DAC1, TIM3_CH1 | Also a DAC output |
| A2 / D16 | PA6 | 0–3.3 V | OPAMP2_INPUT+ | |
| A3 / D17 | PA7 | 0–3.3 V | OPAMP2_INPUT− | |
| A4 / D18 | PC1 | 0–3.3 V | **I2C3_SDA**, LPTIM1 | Wire2 SDA option |
| A5 / D19 | PC0 | — | **I2C3_SCL**, LPTIM1 | Wire2 SCL option |

`analogRead(A0)` returns 0–1023 (Arduino-compatible 10-bit mapping from the 12-bit STM32 ADC). Voltage = `(analogRead(A0) / 1023.0) * 3.3` volts.

### JSPI Header (A5) — Dedicated SPI

| Pin | Net | Notes |
|-----|-----|-------|
| 1 MISO | PC2 (SPI2_MISO) | 3.3 V |
| 2 +5V | 5V_SYS | Power only |
| 3 SCK | PD1 (SPI2_SCK) | 3.3 V |
| 4 MOSI | PC3 (SPI2_MOSI) | 3.3 V |
| 5 RESET | MCU_NRST | MCU reset |
| 6 GND | Ground | |

### Qwiic Connector (A4) — I2C4

4-pin JST connector for the Qwiic/Stemma QT ecosystem. Maps to I2C4 (PD13=SDA, PD12=SCL). Plug any Modulino sensor directly here — no breadboard, no soldering.

### On-Board LEDs

| LED | Controlled by | Pins | Access |
|-----|---------------|------|--------|
| RGB LED 1 (D27301) | MPU (Linux) | GPIO_41 (R), GPIO_42 (G), GPIO_60 (B) | `/sys/class/leds/red:user` etc. |
| RGB LED 2 (D27302) | MPU (Linux) | GPIO_39 (R), GPIO_40 (G), GPIO_47 (B) | Status: PANIC, WLAN, BT |
| RGB LED 3 (D27401) | MCU (Arduino) | PH10 (R), PH11 (G), PH12 (B) | `analogWrite` / `digitalWrite` from sketch |
| RGB LED 4 (D27402) | MCU (Arduino) | PH13 (R), PH14 (G), PH15 (B) | `analogWrite` / `digitalWrite` from sketch |
| LED Matrix (D27001–D27104) | MCU | — | 8×13 = 104 blue pixels, boot logo |
| Power LED (D27201) | Hardware | — | On when 3.3 V is present |

All RGB LEDs are **active-low** (write `0` to turn on, `1` to turn off).

The Blink LED Hello World example uses RGB LED 3 (red channel) — this is MCU-driven and appears when the sketch runs on the STM32U585.

---

## Part 3: How Sensai Works — The Full Data Path

When a student sends a Telegram message to Sensai, here is every step that happens:

```
Student's phone
    │ Telegram network
    ▼
Telegram servers
    │ Long-poll HTTP (max 30s timeout)
    ▼
picoclaw Telegram channel adapter
(pkg/channels/telegram/telegram.go)
    │ Sends "Asking Sensai..." immediately
    │ Publishes InboundMessage to the message bus
    ▼
Message Bus (pkg/bus/bus.go)
    │ Pub/sub — decouples channel from agent
    ▼
AgentLoop (pkg/agent/loop.go)
    │ Dequeues the message
    │ Calls processMessage()
    ▼
Context Builder (pkg/agent/context.go)
    │ Loads system prompt (cached after first build):
    │   1. getIdentity() — hardcoded picoclaw identity block
    │   2. SOUL.md — Sensai Arduino persona + pin reference
    │   3. IDENTITY.md — Sensai name + purpose
    │   4. Skills summary (if any installed)
    │   5. Memory context (MEMORY.md if exists)
    │ Appends dynamic context (timestamp, session)
    │ Appends conversation history (last N messages)
    ▼
Provider (pkg/providers/openai_compat/provider.go)
    │ Sends HTTP POST to http://127.0.0.1:8080/v1/chat/completions
    │ request_timeout = 1200s (matches slow hardware)
    ▼
llama-server (yzma/lib/llama-server)
    │ Model: Qwen3.5-0.8B-Q6_K (~700 MB in RAM)
    │ Time to first token: ~2.2s
    │ Generation: ~4.4 tok/s
    │ Context window: 12,288 tokens
    │ /no_think active → no reasoning preamble
    ▼
llama.cpp inference engine (via yzma FFI — no CGo)
    │ ARM Cortex-A53 CPU inference
    │ Optional: Adreno 702 OpenCL for prefill acceleration
    ▼
Response text returned to provider
    ▼
AgentLoop publishes OutboundMessage to bus
    ▼
Telegram channel adapter sends message
    │ Format: Markdown → Telegram HTML conversion
    │ Code blocks preserved in <pre> tags
    ▼
Student receives the Arduino sketch
```

### End-to-End Timing Budget

| Step | Time |
|------|------|
| Telegram delivery (long-poll) | < 1s typical |
| Placeholder message sent | ~0.1s after receipt |
| System prompt build (first call) | ~50ms; cached after |
| Provider HTTP overhead (loopback) | ~5ms |
| TTFT (time to first token) | ~2.2s |
| Generation (100-word sketch ≈ 140 tokens) | ~32s |
| Generation (50-word answer ≈ 70 tokens) | ~16s |
| Telegram send | ~0.2s |
| **Total (typical response)** | **~20–35s** |

The 250-word cap in SOUL.md bounds worst-case generation to ~75 seconds. Most Arduino Q&A responses are 60–120 words.

---

## Part 4: Code Paths for Student Questions

### Path 1: Simple Sketch Request

**Student:** "Blink the LED on pin 13 every 500ms"

1. Sensai generates a complete `.ino` sketch targeting the STM32U585
2. The sketch uses `digitalWrite(13, HIGH/LOW)` and `delay(500)`
3. Pin 13 = PB13 (SPI2_SCK) on the MCU — this is the standard Uno LED pin
4. Student copies the sketch into Arduino App Lab → Run → compiles for STM32U585 → flashes MCU

```cpp
// Runs on the STM32U585 MCU
void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(500);
  digitalWrite(13, LOW);
  delay(500);
}
```

### Path 2: Analog Sensor Read

**Student:** "Read a potentiometer on A0 and print the value"

Key difference from classic Uno: `analogRead(A0)` reads 0–3.3 V (not 0–5 V). The return value is still 0–1023 in Arduino-compatible mode (mapped from 12-bit to 10-bit internally).

```cpp
// Runs on the STM32U585 MCU
void setup() {
  Serial.begin(9600);  // USART1 on D0/D1
}

void loop() {
  int raw = analogRead(A0);          // 0-1023
  float voltage = raw * (3.3 / 1023.0);  // 0.0 - 3.3 V
  Serial.print("ADC: ");
  Serial.print(raw);
  Serial.print("  Voltage: ");
  Serial.println(voltage);
  delay(200);
}
```

### Path 3: I2C Sensor

Two I2C buses are available for students:

| Bus | Pins | `Wire` object | Use case |
|-----|------|--------------|----------|
| I2C2 | D20 (SDA), D21 (SCL) | `Wire` | Standard, use with any breakout |
| I2C3 | A4 (SDA), A5 (SCL) | `Wire1` | Same pins as classic Uno |
| I2C4 | Qwiic connector | (via Qwiic) | Plug-and-play Modulino ecosystem |

```cpp
// Runs on the STM32U585 MCU — I2C2 bus (D20/D21)
#include <Wire.h>

void setup() {
  Serial.begin(9600);
  Wire.begin();  // I2C2: SDA=D20, SCL=D21
}

void loop() {
  Wire.requestFrom(0x68, 6);  // e.g., MPU-6050 address
  while (Wire.available()) {
    byte b = Wire.read();
    Serial.print(b, HEX);
    Serial.print(" ");
  }
  Serial.println();
  delay(500);
}
```

### Path 4: Python + Bridge (Linux + MCU Together)

For projects that combine Linux AI/processing with MCU hardware control, the Bridge API connects both sides.

**Python (runs on Linux/MPU):**
```python
# Runs on the QRB2210 Linux side
from arduino_alvik import ArduinoAlvik  # or appropriate Bridge library

alvik = ArduinoAlvik.get_instance()
alvik.begin()

sensor_value = alvik.get_distance()  # calls MCU to read sensor via Bridge
print(f"Distance: {sensor_value} cm")
```

**Arduino sketch (runs on STM32U585 MCU):**
```cpp
// Runs on the STM32U585 MCU — exposes a service via Bridge
#include <Arduino_AlvikCarrier.h>

ArduinoAlvikCarrier carrier;

void setup() {
  carrier.begin();
}

void loop() {
  carrier.update();
}
```

### Path 5: PWM (Fade / Motor Speed)

PWM is only available on pins with a tilde: **D3, D5, D6, D9, D10, D11**.

```cpp
// Runs on STM32U585 MCU
// Breathing LED on D9 (TIM4_CH4)
void setup() {
  // no pinMode needed for analogWrite
}

void loop() {
  for (int i = 0; i <= 255; i++) {
    analogWrite(9, i);
    delay(8);
  }
  for (int i = 255; i >= 0; i--) {
    analogWrite(9, i);
    delay(8);
  }
}
```

---

## Part 5: Hardware Acceleration on the MPU

This section is for Linux-side programs running alongside Sensai.

### Adreno 702 GPU

The GPU is used for two things: graphics (OpenGL/Vulkan) and compute (OpenCL). For AI inference, OpenCL can accelerate the llama.cpp prefill phase.

| API | Version | Use case |
|-----|---------|----------|
| OpenGL | 3.1 | 3D rendering |
| OpenGL ES | 3.1 | Embedded graphics |
| Vulkan | 1.0.318 | Low-level GPU |
| OpenCL | 2.0 | GPGPU / AI prefill |

**OpenCL prefill acceleration for llama-server:**
```bash
# Build llama.cpp with OpenCL backend, then:
./yzma/lib/llama-server \
  -m ~/models/Qwen_Qwen3.5-0.8B-Q6_K.gguf \
  --host 127.0.0.1 --port 8080 \
  --ctx-size 12288 --parallel 2 \
  --opencl  # enables Adreno 702 prefill
```
Effect: TTFT drops from ~28s to ~4–9s for Qwen3-0.6B Q4_0. Decode throughput unchanged (memory-bandwidth bound, not compute bound).

### Video Codecs (V4L2)

Hardware H.264/H.265 encode/decode via `/dev/video0` and `/dev/video1`. Useful for camera-based projects.

```bash
# GStreamer H.264 decode example
gst-launch-1.0 filesrc location=video.mp4 \
  ! qtdemux ! queue ! h264parse ! v4l2h264dec \
  ! videoconvert ! autovideosink
```

### RGB LEDs via Linux sysfs

The two MPU-controlled RGB LEDs are accessible from Python without any sketch:

```python
# Runs on Linux — no MCU sketch needed
import time

def set_led(color, value):
    with open(f'/sys/class/leds/{color}/brightness', 'w') as f:
        f.write(str(value))

# Blink red:user LED
while True:
    set_led('red:user', 255)
    time.sleep(0.5)
    set_led('red:user', 0)
    time.sleep(0.5)
```

---

## Part 6: What Sensai Can and Cannot Do

### What Sensai Does

| Capability | How |
|-----------|-----|
| Generates Arduino sketches | LLM text generation → student copies to App Lab |
| Debugs Arduino errors | Student pastes error, Sensai explains and corrects |
| Explains hardware concepts | LLM answers from SOUL.md context |
| Writes Python programs for Linux side | LLM text generation |
| Reads/writes files in workspace | `read_file`, `write_file` tools |
| Executes shell commands on Linux | `exec` tool — runs on MPU/Linux |
| Reads I2C sensors via Linux | `i2c` tool — accesses MPU I2C buses (1.8 V domain, JMISC/JMEDIA) |
| Reads SPI peripherals via Linux | `spi` tool — accesses MPU SPI buses |
| Remembers conversation | Session history in `~/.picoclaw/workspace/` |

### What Sensai Cannot Do

| Limitation | Reason |
|-----------|--------|
| Directly control MCU GPIO from Linux | MCU GPIO is controlled by STM32U585; Linux can only call MCU via Bridge |
| Run faster than ~4 tok/s | Bounded by LPDDR4X memory bandwidth on QRB2210 |
| Access the internet | Designed for offline-only use; web tools disabled in Sensai config |
| Compile/upload sketches without arduino-cli | The `arduino` tool requires `arduino-cli` and the `arduino:zephyr` core to be installed |

### The I2C Tool — Which Bus?

The `i2c` tool in Sensai (`pkg/tools/i2c.go`) accesses Linux I2C buses via `/dev/i2c-*`. On the Uno Q, these are the **MPU's 1.8 V I2C lines** (on JMISC/JMEDIA). These are separate from the MCU's I2C2/I2C3 buses on the Arduino headers.

Practical implication:
- Sensors wired to A4/A5 or D20/D21 → controlled via Arduino sketch (MCU I2C, 3.3 V)
- Sensors wired to JMISC I2C4 lines → controllable directly from Linux via i2c tool (1.8 V domain — requires level shifting)
- Qwiic connector uses MCU I2C4 (3.3 V) — not directly accessible from the Sensai i2c tool

---

## Part 7: Configuration Reference

### Key Config Values (config/sensai.config.json)

| Parameter | Value | Why |
|-----------|-------|-----|
| `model_name` | `qwen-local` | Local llama-server, no cloud |
| `api_base` | `http://127.0.0.1:8080/v1` | llama-server loopback |
| `request_timeout` | 1200 | 0.8B model @ 4 tok/s needs headroom |
| `max_tokens` | 12288 | Sets context window size |
| `max_tool_iterations` | 8 | Limits round-trips to the model |
| `summarize_message_threshold` | 10 | Compress history at 10 messages |
| Web tools | disabled | Offline use; eliminates DNS latency |
| I2C tool | enabled | Linux I2C access (MPU domain) |
| SPI tool | enabled | Linux SPI access (MPU domain) |
| Heartbeat | disabled | Eliminates background model pings |

### llama-server Optimal Flags for Uno Q

```bash
./yzma/lib/llama-server \
  -m ~/models/Qwen_Qwen3.5-0.8B-Q6_K.gguf \
  --host 127.0.0.1 \      # loopback only — do not expose externally
  --port 8080 \
  --ctx-size 12288 \      # 12K tokens (optimized from 262K default)
  --parallel 2 \           # 2 concurrent request slots
  -t 4                     # use all 4 Cortex-A53 cores
```

Why 12,288 tokens? KV cache memory scales linearly with context. At 262,144 (default), the KV cache alone requires ~3 GB. At 12,288, it requires ~144 MB, bringing total llama-server RAM to ~1.3 GB and eliminating swap usage on the 4 GB variant.

### SOUL.md System Prompt Flow

```
BuildSystemPrompt() in pkg/agent/context.go
│
├── getIdentity()           ← hardcoded: "You are picoclaw..."
│                              (this is from the Go source, not editable as a file)
│
├── LoadBootstrapFiles()    ← reads from ~/.picoclaw/workspace/:
│   ├── AGENTS.md           (if exists)
│   ├── SOUL.md             ← Sensai Arduino persona + pin reference
│   ├── USER.md             (if exists)
│   └── IDENTITY.md         ← Sensai name/purpose
│
├── BuildSkillsSummary()    ← skills/ directory (disabled in Sensai config)
│
└── GetMemoryContext()      ← memory/MEMORY.md (if exists)
```

The combined prompt is cached after the first build. File-mtime checks trigger a rebuild if any source file changes. This means you can edit SOUL.md and it takes effect on the next message without restarting the gateway.

---

## Part 8: Student Mental Model

For students who want to understand the system at a high level:

```
You type a question
        │
        ▼
Telegram → Wi-Fi → Uno Q Linux side
        │
        ▼
Sensai (running on the Uno Q's Linux processor)
reads your question and thinks about it
        │
        ▼
The AI model (Qwen3.5-0.8B) runs entirely on the board
— no internet needed —
        │
        ▼
Sensai writes an Arduino sketch for you
        │
        ▼
You copy the sketch into Arduino App Lab
and click Run
        │
        ▼
App Lab compiles the sketch for the Arduino chip (STM32U585)
and flashes it onto the microcontroller
        │
        ▼
The microcontroller runs your sketch
and controls the pins, LEDs, motors, and sensors
```

The Uno Q is doing two things at once:
1. Running Sensai (the AI teacher) on the Linux processor
2. Running your sketch on the Arduino microcontroller

This is why the board needs 4 GB of RAM — the AI model alone uses about 1.3 GB.

---

## Appendix A: Quick Voltage Reference

| Location | Voltage | Tolerates 5V? |
|----------|---------|---------------|
| JDIGITAL pins (D0–D21) | 3.3 V | Some pins yes (digital input mode only) |
| JANALOG A0–A3 (ADC mode) | 3.3 V | **NO — max 3.6 V** |
| JANALOG A4/A5 (I2C mode) | 3.3 V | Pull-ups to 3.3 V only |
| JSPI header (MISO/MOSI/SCK) | 3.3 V | Yes (inputs/open-drain) |
| Qwiic connector | 3.3 V | No |
| JMISC MCU lines | 3.3 V | Some |
| JMISC MPU lines | **1.8 V** | No |
| JCTL | **1.8 V** | No |
| VIN (JANALOG/JMEDIA) | 7–24 V | Power input |
| USB-C VBUS | 5 V | Power input |

## Appendix B: Common Student Mistakes

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| Applying 5 V to A0–A5 | Damages STM32U585 ADC | Use voltage divider: 5 V → 10 kΩ → A0 → 20 kΩ → GND |
| Using `delay()` in a sensor loop | Loop freezes during delay, misses events | Use `millis()` for non-blocking timing |
| `analogRead()` expecting 0–5 V range | Wrong readings | Calibrate for 0–3.3 V range |
| Forgetting `pinMode(pin, OUTPUT)` | Pin stays as input, no current output | Add `pinMode()` in `setup()` |
| Using D0/D1 for GPIO while Serial is active | UART conflict | Use other pins for GPIO if Serial is needed |
| Trying to control MCU pins from a Python script | Linux GPIO ≠ MCU GPIO | Use Bridge API to call MCU from Python |
| Writing to pin 13 while SPI is active | SPI SCK is on D13 | Use a different pin for LED when SPI is in use |

## Appendix C: Repository Structure

```
Sensai/
├── cmd/picoclaw/            # CLI entry point (Cobra)
│   └── internal/
│       ├── agent/           # agent command + helpers
│       └── auth/            # auth command
├── pkg/
│   ├── agent/               # AgentLoop, ContextBuilder, MemoryStore
│   ├── channels/            # Telegram, Discord, Slack... adapters
│   │   └── telegram/        # Our primary channel
│   ├── config/              # Config struct, defaults, migrations
│   ├── providers/           # LLM provider adapters
│   │   └── openai_compat/   # Our inference path → llama-server
│   └── tools/               # shell, filesystem, i2c, spi, web...
├── workspace/               # Template workspace files
│   ├── SOUL.md              # ← Sensai Arduino persona (edit this)
│   └── IDENTITY.md          # ← Sensai name/purpose
├── config/
│   └── sensai.config.json   # ← Hardware-tuned config for Uno Q
├── yzma/                    # Submodule: llama.cpp FFI bindings
│   └── lib/                 # llama-server and llama-cli binaries
├── docs/Sensai/             # Whitepapers and benchmarks
│   └── development/         # This document and implementation plan
└── Makefile                 # make sensai-setup, make build, make test
```
