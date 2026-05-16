# Module 9: IoT Projects 🌐

> **Goal:** Combine sensors, actuators, and displays to build real Internet of Things projects — devices that sense, think, and act autonomously.

---

## 🔌 The Real-World Connection

The **Internet of Things** (IoT) is the network of physical devices that collect data and take action. Smart thermostats, automated greenhouses, weather stations, and security systems are all IoT devices. In this module, you'll build three complete IoT projects.

> [!NOTE]
> "IoT" traditionally means "connected to the internet," but the core pattern is the same even offline: **Sense → Process → Act**. Our projects work standalone and can optionally connect to the Linux side via the Uno Q's Bridge API.

---

## Key Concepts

### The IoT Pattern

Every IoT project follows this cycle:

```
┌─────────┐     ┌───────────┐     ┌─────────┐
│  SENSE  │ ──→ │  PROCESS  │ ──→ │   ACT   │
│ (read   │     │ (decide   │     │ (control │
│ sensors)│     │  what to  │     │  outputs)│
└─────────┘     │   do)     │     └─────────┘
                └───────────┘
       ↑                              │
       └──────────────────────────────┘
                 (loop forever)
```

### Hysteresis — Avoiding Flicker

If your threshold is 500 and the sensor reads 499, 501, 499, 501... your output will flip on and off rapidly. **Hysteresis** adds a buffer zone:
- Turn ON when value drops below 400
- Turn OFF when value rises above 600

---

## Project 1: Smart Plant Watering System 🌱

Automatically water a plant when the soil gets dry.

### Parts
- Capacitive soil moisture sensor
- 5V relay module
- Small water pump (5V)
- LED (status indicator)

### Wiring

| Component | Connect To |
|-----------|-----------|
| Soil sensor signal | Arduino **A0** |
| Soil sensor VCC | **3.3V** |
| Soil sensor GND | **GND** |
| Relay signal | Arduino **D4** |
| Relay VCC/GND | **5V** / **GND** |
| Status LED | **D13** → 220Ω → GND |

```cpp
// smart_plant.ino
// 💡 Automatic plant watering — waters when soil is dry!

const int MOISTURE_PIN = A0;
const int RELAY_PIN = 4;
const int LED_PIN = 13;

// 💡 Calibrate these for your sensor and soil!
const int DRY_THRESHOLD = 400;   // Below this = dry, start watering
const int WET_THRESHOLD = 600;   // Above this = wet, stop watering
const unsigned long WATER_TIME = 3000;  // Water for 3 seconds

bool isWatering = false;

void setup() {
    pinMode(RELAY_PIN, OUTPUT);
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(RELAY_PIN, LOW);  // Pump OFF at start
    Serial.begin(9600);
    Serial.println("Smart Plant Watering System");
    Serial.println("===========================");
}

void loop() {
    int moisture = analogRead(MOISTURE_PIN);

    Serial.print("Moisture: ");
    Serial.print(moisture);

    // 💡 Hysteresis: use two thresholds to avoid rapid switching
    if (moisture < DRY_THRESHOLD && !isWatering) {
        Serial.println(" [DRY - WATERING]");
        isWatering = true;
        digitalWrite(RELAY_PIN, HIGH);  // Pump ON
        digitalWrite(LED_PIN, HIGH);     // LED ON = watering
        delay(WATER_TIME);
        digitalWrite(RELAY_PIN, LOW);   // Pump OFF
        isWatering = false;
    }
    else if (moisture > WET_THRESHOLD) {
        Serial.println(" [WET - OK]");
        digitalWrite(LED_PIN, LOW);
    }
    else {
        Serial.println(" [MODERATE]");
    }

    delay(2000);  // Check every 2 seconds
}
```

---

## Project 2: Weather Station 🌤️

A multi-sensor weather station that displays conditions on the OLED.

### Parts
- DHT22 sensor (temp + humidity)
- Photoresistor + 10kΩ resistor (light level)
- SSD1306 OLED display (I2C)

```cpp
// weather_station.ino
// 💡 A complete weather station with OLED display!

#include <DHT.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

const int DHT_PIN = 2;
const int LIGHT_PIN = A1;

DHT dht(DHT_PIN, DHT22);
Adafruit_SSD1306 display(128, 64, &Wire, -1);

void setup() {
    Serial.begin(9600);
    dht.begin();

    if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
        Serial.println("OLED not found!");
        while (true);
    }

    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("Sensai Weather Station");
    display.println("Initializing...");
    display.display();
    delay(2000);
}

void loop() {
    float temp = dht.readTemperature();
    float humidity = dht.readHumidity();
    int lightRaw = analogRead(LIGHT_PIN);
    int lightPercent = map(lightRaw, 0, 1023, 0, 100);

    // Update OLED
    display.clearDisplay();
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("=== WEATHER STATION ===");

    display.setTextSize(2);
    display.setCursor(0, 14);
    if (!isnan(temp)) {
        display.print(temp, 1);
        display.println(" C");
    } else {
        display.println("ERR");
    }

    display.setTextSize(1);
    display.setCursor(0, 38);
    if (!isnan(humidity)) {
        display.print("Humidity: ");
        display.print(humidity, 0);
        display.println("%");
    }

    display.print("Light:    ");
    display.print(lightPercent);
    display.println("%");

    display.display();

    // Also print to Serial
    Serial.print(temp);
    Serial.print("C, ");
    Serial.print(humidity);
    Serial.print("%, Light:");
    Serial.print(lightPercent);
    Serial.println("%");

    delay(2000);
}
```

---

## Project 3: Smart Light 💡

An automatic light that turns on when it gets dark — with hysteresis to avoid flickering.

```cpp
// smart_light.ino
// 💡 Automatic night light with hysteresis — no flickering!

const int LIGHT_PIN = A1;
const int LED_PIN = 3;  // PWM pin for dimming

const int DARK_ON = 300;    // Turn on when below this
const int BRIGHT_OFF = 500; // Turn off when above this

bool lightIsOn = false;

void setup() {
    pinMode(LED_PIN, OUTPUT);
    Serial.begin(9600);
    Serial.println("Smart Light Active");
}

void loop() {
    int lightLevel = analogRead(LIGHT_PIN);

    // 💡 Hysteresis prevents rapid on/off switching
    if (lightLevel < DARK_ON && !lightIsOn) {
        lightIsOn = true;
        // Fade in smoothly
        for (int b = 0; b <= 255; b += 5) {
            analogWrite(LED_PIN, b);
            delay(20);
        }
        Serial.println("Light ON (dark detected)");
    }
    else if (lightLevel > BRIGHT_OFF && lightIsOn) {
        lightIsOn = false;
        // Fade out smoothly
        for (int b = 255; b >= 0; b -= 5) {
            analogWrite(LED_PIN, b);
            delay(20);
        }
        Serial.println("Light OFF (bright detected)");
    }

    delay(500);
}
```

---

## 🤖 Ask Sensai

- *"Help me design a smart plant watering system using a soil moisture sensor and relay."*
- *"Use the arduino tool to upload a weather station sketch that reads DHT22 and shows data on OLED."*
- *"What is hysteresis and why is it important for sensor-based automation?"*
- *"How can I use the Bridge API to send sensor data from the MCU to the Linux side?"*

---

## 🧪 Exercises

1. **Data logging** — Add CSV serial output to the weather station for spreadsheet analysis
2. **Multi-zone plant system** — Use 2 soil sensors and 2 relays for independent watering zones
3. **Smart light + motion** — Add a PIR motion sensor so the light only turns on if someone is present AND it's dark

---

## ✅ Module 9 Checkpoint

- [ ] You built at least one complete IoT project (plant, weather, or light)
- [ ] You understand the Sense → Process → Act pattern
- [ ] You can explain hysteresis and why it prevents flickering
- [ ] You combined sensors, actuators, and displays in one project
- [ ] You used Serial output for monitoring and debugging your system

---

**⬅️ Previous: [Module 8 — Advanced Communication](../08-advanced-communication/)** | **➡️ Next: [Module 10 — Demo Day](../10-demo-day/)**
