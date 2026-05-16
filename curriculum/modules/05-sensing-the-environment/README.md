# Module 5: Sensing the Environment 🌡️

> **Goal:** Use external sensor libraries to measure temperature and humidity — and build alert systems that respond to environmental conditions.

---

## 🔌 The Real-World Connection

Smart thermostats (like Nest), weather apps, greenhouse controllers, and food storage monitors all read environmental sensors. The DHT11 and DHT22 are the most popular temperature/humidity sensors in the maker world — cheap, reliable, and used in real IoT products.

---

## Key Concepts

### Arduino Libraries

A **library** is pre-written code that handles complex tasks. Instead of writing 200 lines to decode the DHT sensor's protocol, you install the `DHT` library and call `dht.readTemperature()`.

**How to install:**
1. Arduino IDE → **Sketch → Include Library → Manage Libraries**
2. Search for **"DHT sensor library"** by Adafruit
3. Click **Install** (also install the "Adafruit Unified Sensor" dependency)

### DHT11 vs DHT22

| Feature | DHT11 | DHT22 |
|---------|-------|-------|
| Temperature range | 0–50°C | -40–80°C |
| Temperature accuracy | ±2°C | ±0.5°C |
| Humidity range | 20–80% | 0–100% |
| Price | ~$2 | ~$5 |
| Speed | 1 reading/sec | 1 reading/2 sec |

---

## Step 1: Read Temperature and Humidity

### Wiring (DHT11/DHT22 breakout module)

| DHT Pin | Connect To |
|---------|-----------|
| VCC (+) | Arduino **3.3V** |
| DATA | Arduino **D2** |
| GND (−) | Arduino **GND** |

> [!TIP]
> Many DHT breakout boards include a built-in pull-up resistor. If using a bare sensor, add a 10kΩ resistor between VCC and DATA.

```cpp
// temp_humidity.ino
// 💡 Read temperature and humidity from a DHT sensor.

#include <DHT.h>  // 💡 This loads the DHT library — install it first!

const int DHT_PIN = 2;
const int DHT_TYPE = DHT11;  // Change to DHT22 if using that sensor

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
    Serial.begin(9600);
    dht.begin();
    Serial.println("Sensai Environment Monitor");
    Serial.println("==========================");
}

void loop() {
    // ⚠️ DHT sensors are slow — wait 2 seconds between readings
    delay(2000);

    float temperature = dht.readTemperature();     // Celsius
    float humidity = dht.readHumidity();

    // 💡 Check if the reading failed
    if (isnan(temperature) || isnan(humidity)) {
        Serial.println("Error: Could not read sensor!");
        return;
    }

    Serial.print("Temperature: ");
    Serial.print(temperature);
    Serial.print(" C  |  Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");
}
```

---

## Step 2: Heat Alert System

Add an LED that turns on when the temperature exceeds a threshold — your first **alert system**.

```cpp
// heat_alert.ino
// 💡 LED alarm activates when temperature exceeds a threshold.

#include <DHT.h>

const int DHT_PIN = 2;
const int DHT_TYPE = DHT11;
const int ALERT_LED = 13;
const float TEMP_THRESHOLD = 28.0;  // 💡 Adjust for your environment

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
    Serial.begin(9600);
    pinMode(ALERT_LED, OUTPUT);
    dht.begin();
    Serial.println("Heat Alert System Active");
}

void loop() {
    delay(2000);
    float temp = dht.readTemperature();

    if (isnan(temp)) {
        Serial.println("Sensor error!");
        return;
    }

    Serial.print("Temp: ");
    Serial.print(temp);
    Serial.print(" C  ");

    if (temp > TEMP_THRESHOLD) {
        digitalWrite(ALERT_LED, HIGH);
        Serial.println("[ALERT! TOO HOT]");
    } else {
        digitalWrite(ALERT_LED, LOW);
        Serial.println("[OK]");
    }
}
```

---

## 🤖 Ask Sensai

- *"Use the arduino tool to upload a sketch that reads the DHT11 on pin 2 and prints temperature and humidity."*
- *"What is a library in Arduino and how do I install one?"*
- *"How accurate is the DHT11 compared to the DHT22?"*

---

## 🧪 Exercises

1. **Fahrenheit mode** — Add `dht.readTemperature(true)` to also show Fahrenheit
2. **Comfort zone** — Print "Comfortable" when temp is 20–26°C and humidity is 30–60%
3. **Min/Max tracker** — Track and display the highest and lowest temperatures since startup

---

## ✅ Module 5 Checkpoint

- [ ] You installed the DHT library through the Library Manager
- [ ] You read real temperature and humidity values from the sensor
- [ ] You built a heat alert system with a threshold
- [ ] You understand what `#include <DHT.h>` does (loads a library)
- [ ] You understand `isnan()` checks for failed sensor readings

---

**⬅️ Previous: [Module 4 — Reading the World](../04-reading-the-world/)** | **➡️ Next: [Module 6 — Talking to the Computer](../06-talking-to-the-computer/)**
