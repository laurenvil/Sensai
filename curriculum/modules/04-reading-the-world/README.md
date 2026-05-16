# Module 4: Reading the World 📡

> **Goal:** Use `analogRead()` to measure real-world values like light and position, and transform them with the `map()` function.

---

## 🔌 The Real-World Connection

Your phone's brightness slider, a car's fuel gauge, and a dimmer switch all work by reading **analog** values — signals that aren't just on or off, but anywhere in between. In this module, you'll read a potentiometer (a knob) and a light sensor, converting their signals into useful data.

---

## Key Concepts

### Digital vs. Analog

| Type | Values | Example |
|------|--------|---------|
| **Digital** | Only 0 or 1 (LOW or HIGH) | A light switch — on or off |
| **Analog** | Any value in a range (0–1023) | A dimmer knob — anywhere from off to full brightness |

### `analogRead()` and the ADC

The Arduino's **ADC** (Analog-to-Digital Converter) reads a voltage and converts it to a number:

| Board | Voltage Range | Number Range |
|-------|--------------|-------------|
| **Uno Q** | 0V – **3.3V** | 0 – 1023 |
| Classic Uno | 0V – 5V | 0 – 1023 |

> [!WARNING]
> **Uno Q is 3.3V!** Never connect a 5V signal to the analog pins. This is different from the classic Uno.

### The `map()` Function

`map()` rescales a number from one range to another:
```cpp
int brightness = map(sensorValue, 0, 1023, 0, 255);
// Converts 0-1023 (ADC range) to 0-255 (PWM range)
```

---

## Step 1: Potentiometer Controls LED Brightness

A **potentiometer** (pot) is a knob that varies resistance. It outputs a voltage between 0V and 3.3V.

### Wiring

| Pot Pin | Connect To |
|---------|-----------|
| Left leg | Arduino **3.3V** |
| Middle leg (wiper) | Arduino **A0** |
| Right leg | Arduino **GND** |
| LED circuit | **D3** (~PWM) → 220Ω → LED → GND |

```cpp
// pot_led.ino
// 💡 Turn the knob to control LED brightness!

const int POT_PIN = A0;    // Analog input — reads the knob position
const int LED_PIN = 3;     // ⚠️ Must be a PWM pin (~) for analogWrite()

void setup() {
    pinMode(LED_PIN, OUTPUT);
    Serial.begin(9600);
}

void loop() {
    int potValue = analogRead(POT_PIN);  // Read knob: 0–1023

    // 💡 Map the pot range (0–1023) to the PWM range (0–255)
    int brightness = map(potValue, 0, 1023, 0, 255);

    analogWrite(LED_PIN, brightness);    // Set LED brightness

    // Show the values in Serial Monitor
    Serial.print("Pot: ");
    Serial.print(potValue);
    Serial.print(" → Brightness: ");
    Serial.println(brightness);

    delay(100);
}
```

---

## Step 2: Light Sensor

A **photoresistor** (LDR — Light Dependent Resistor) changes resistance based on light levels. Paired with a fixed resistor, it creates a **voltage divider**.

### Wiring

| Connection | Details |
|------------|---------|
| LDR leg 1 | Arduino **3.3V** |
| LDR leg 2 + 10kΩ resistor | Arduino **A1** (junction point) |
| 10kΩ other leg | Arduino **GND** |

```cpp
// light_sensor.ino
// 💡 Read light levels and react — like an automatic night light!

const int LIGHT_PIN = A1;
const int LED_PIN = 13;
const int DARK_THRESHOLD = 300;  // 💡 Adjust this based on your room

void setup() {
    pinMode(LED_PIN, OUTPUT);
    Serial.begin(9600);
}

void loop() {
    int lightLevel = analogRead(LIGHT_PIN);

    Serial.print("Light level: ");
    Serial.println(lightLevel);

    // 💡 Turn on the LED when it gets dark
    if (lightLevel < DARK_THRESHOLD) {
        digitalWrite(LED_PIN, HIGH);
        Serial.println("  → Dark! LED ON");
    } else {
        digitalWrite(LED_PIN, LOW);
        Serial.println("  → Bright. LED OFF");
    }

    delay(500);
}
```

---

## 🤖 Ask Sensai

- *"Why does the Uno Q read 0–1023 when the max voltage is only 3.3V?"*
- *"What is a voltage divider and how does it work with a photoresistor?"*
- *"Use the arduino tool to upload a sketch that reads A0 and prints the voltage in volts."*

---

## 🧪 Exercises

1. **Voltage display** — Modify `pot_led.ino` to also print the actual voltage: `float voltage = potValue * 3.3 / 1023.0;`
2. **Light meter** — Create a "bar graph" using 5 LEDs that light up based on brightness level
3. **Night light** — Combine the potentiometer and light sensor: the pot sets the threshold for the night light

---

## ✅ Module 4 Checkpoint

- [ ] You can read a potentiometer with `analogRead()` and see values 0–1023
- [ ] You used `map()` to convert between ranges
- [ ] You built a light sensor circuit with a voltage divider
- [ ] You understand the difference between digital (on/off) and analog (range of values)
- [ ] You know the Uno Q ADC reads 0–3.3V (not 0–5V)

---

**⬅️ Previous: [Module 3 — Variables & Logic](../03-variables-and-logic/)** | **➡️ Next: [Module 5 — Sensing the Environment](../05-sensing-the-environment/)**
