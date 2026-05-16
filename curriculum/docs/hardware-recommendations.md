# Hardware Recommendations for the Sensai Arduino Lab

This guide helps teachers and students choose the right hardware for the curriculum.

---

## 🎯 Recommended Board: Arduino Uno Q

The curriculum is designed for the **Arduino Uno Q**, which has a unique dual-processor architecture:

| Component | Specification |
|-----------|--------------|
| **MPU (Linux)** | Qualcomm QRB2210, 4× Cortex-A53 @ 2.0 GHz, Debian Linux |
| **MCU (Arduino)** | STM32U585, Cortex-M33 @ 160 MHz, Zephyr OS + Arduino Core |
| **RAM** | 4 GB LPDDR4X |
| **Storage** | 32 GB eMMC |
| **Connectivity** | Wi-Fi 5 (2.4/5 GHz), Bluetooth 5.1 |
| **Logic Voltage** | 3.3V on all Arduino headers |
| **I2C** | 3 buses — I2C2 (D20/D21), I2C3 (A4/A5), I2C4 (Qwiic connector) |
| **Form Factor** | Classic Arduino UNO footprint (shield compatible) |

> [!IMPORTANT]
> The Uno Q runs **Sensai** directly on the Linux side. This means students get an AI tutor that can compile and upload sketches without a separate computer.

### Alternative Boards

The curriculum also works with these boards (with some differences noted in each module):

| Board | Works? | Notes |
|-------|--------|-------|
| **Arduino Uno R4 WiFi** | ✅ Yes | 5V logic, built-in Wi-Fi, no Sensai — use Arduino IDE instead |
| **Arduino Uno R4 Minima** | ✅ Yes | 5V logic, no Wi-Fi, no Sensai |
| **Arduino Uno R3** | ✅ Yes | 5V logic, no Wi-Fi, the classic — thousands of tutorials available |
| **Arduino Nano Every** | ⚠️ Mostly | Same core concepts, different pin layout |
| **ESP32** | ⚠️ Partial | Different pin numbering, built-in Wi-Fi, 3.3V logic |

> [!WARNING]
> **Voltage difference:** The Uno Q uses **3.3V logic** on all analog and digital pins. Classic Uno boards use **5V logic**. Modules note this where it matters (especially Module 4 with `analogRead()`).

---

## 🛒 Student Kit — Shopping List

### Essential Kit (Modules 1–6)

| Item | Quantity | Approx. Cost | Notes |
|------|----------|-------------|-------|
| Arduino Uno Q (or Uno R4) | 1 | $50–70 | The brain of every project |
| USB-C cable | 1 | $5 | Data + power (included with most boards) |
| Half-size breadboard | 1 | $3 | For building circuits without soldering |
| Jumper wire kit (M-M, M-F) | 1 pack | $5 | At least 20 wires |
| LEDs (red, green, yellow) | 5 each | $3 | Standard 5mm, any color works |
| 220Ω resistors | 10 | $2 | Current-limiting for LEDs |
| 10kΩ resistors | 10 | $2 | Pull-up/pull-down for buttons |
| Push buttons (tactile) | 5 | $2 | 4-pin, breadboard-friendly |
| Potentiometer (10kΩ) | 2 | $3 | Rotary, 3-pin, breadboard-mount |
| Photoresistor (LDR) | 2 | $2 | Light-dependent resistor |

**Essential Kit Total: ~$75–95**

### Sensor Kit (Modules 5–6)

| Item | Quantity | Approx. Cost | Notes |
|------|----------|-------------|-------|
| DHT11 or DHT22 sensor | 1 | $4–8 | Temperature + humidity (DHT22 is more accurate) |
| DHT sensor breakout board | 1 | $2 | Some DHT modules include the pull-up resistor |

**Sensor Kit Total: ~$6–10**

### Actuator Kit (Module 7)

| Item | Quantity | Approx. Cost | Notes |
|------|----------|-------------|-------|
| SG90 Micro Servo Motor | 1 | $4 | 180° range, 3-wire (signal, power, ground) |
| Piezo Buzzer (passive) | 1 | $2 | For generating tones with `tone()` |

**Actuator Kit Total: ~$6**

### Advanced Kit (Modules 8–10)

| Item | Quantity | Approx. Cost | Notes |
|------|----------|-------------|-------|
| SSD1306 OLED Display (0.96") | 1 | $5–8 | I2C, 128×64 pixels |
| Soil moisture sensor (capacitive) | 1 | $4 | For smart plant project |
| 5V Relay module | 1 | $3 | For controlling pumps/motors |
| Small water pump (5V) | 1 | $5 | Optional — for smart plant demo |
| BME280 sensor (I2C) | 1 | $6 | Temperature + humidity + pressure (weather station) |

**Advanced Kit Total: ~$23–26**

### 💰 Total Budget

| Kit Level | Contents | Approx. Cost |
|-----------|----------|-------------|
| **Essential only** | Modules 1–4 | ~$75–95 |
| **Essential + Sensors** | Modules 1–6 | ~$85–105 |
| **Complete Kit** | All 10 Modules | ~$110–140 |

> [!TIP]
> **Classroom bulk orders:** Many suppliers (Adafruit, SparkFun, Amazon) offer classroom packs of 10–30 boards with discounts. Arduino also offers the [Education Starter Kit](https://store.arduino.cc/education) with everything needed for the first 7 modules.

---

## 🏫 Classroom Setup Tips

### One Board Per Student vs. Shared Stations

| Setup | Pros | Cons |
|-------|------|------|
| **1 board per student** | Maximum hands-on time, individual pace | Higher cost |
| **Shared stations (2–3 students)** | Lower cost, encourages collaboration | Less individual practice |
| **Teacher demo + Tinkercad** | Minimal cost, works on Chromebooks | No physical circuit experience |

### Using Tinkercad as a Supplement

[Tinkercad Circuits](https://www.tinkercad.com/circuits) is a free, browser-based Arduino simulator that works on any computer, including Chromebooks. Students can:
- Build virtual circuits with drag-and-drop components
- Write and run Arduino code in a simulated environment
- Test before building on physical hardware

> [!NOTE]
> Tinkercad simulates a classic Arduino Uno (5V). The code concepts transfer directly, but voltage values will differ on the Uno Q (3.3V).

### Power and Safety

- All projects in this curriculum use **low voltage** (3.3V or 5V) and are safe for classroom use
- No soldering is required — all circuits use breadboards and jumper wires
- Remind students: **never connect 5V signals to Uno Q analog pins** (A0–A5 are 3.3V only)
