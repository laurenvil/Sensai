# Module 8: Advanced Communication 🔗

> **Goal:** Learn the I2C and SPI communication protocols, connect OLED displays and Qwiic sensors, and scan for I2C devices.

---

## 🔌 The Real-World Connection

When your phone's accelerometer detects orientation, when a smartwatch reads your heart rate, or when a car's dashboard displays speed — sensors and displays communicate with the main processor using **I2C** or **SPI**. These protocols let dozens of devices share just 2–4 wires.

---

## Key Concepts

### I2C — Two Wires, Many Devices

**I2C** (Inter-Integrated Circuit) uses just 2 wires to connect multiple devices:
- **SDA** (Serial Data) — the data line
- **SCL** (Serial Clock) — the timing line

Each device has a unique **address** (like a mailbox number). The Arduino sends: "Hey device at address 0x3C, here's some data!"

| Uno Q I2C Bus | SDA Pin | SCL Pin | Notes |
|---------------|---------|---------|-------|
| I2C2 | D20 | D21 | Main I2C bus (digital header) |
| I2C3 | A4 | A5 | Analog header |
| I2C4 | PD13 | PD12 | Qwiic connector (plug-and-play) |

### SPI — Fast but More Wires

**SPI** uses 4 wires and is much faster than I2C. Used for SD cards, fast displays, and memory chips.

| Wire | Name | Purpose |
|------|------|---------|
| MOSI | Master Out Slave In | Data from Arduino to device |
| MISO | Master In Slave Out | Data from device to Arduino |
| SCK | Serial Clock | Timing signal |
| CS | Chip Select | Which device to talk to |

---

## Step 1: I2C Scanner

Before connecting any I2C device, scan the bus to find its address:

```cpp
// i2c_scanner.ino
// 💡 Scan the I2C bus and find all connected devices!

#include <Wire.h>

void setup() {
    Wire.begin();
    Serial.begin(9600);
    Serial.println("I2C Scanner — scanning...");
}

void loop() {
    int deviceCount = 0;

    for (byte address = 1; address < 127; address++) {
        Wire.beginTransmission(address);
        byte error = Wire.endTransmission();

        if (error == 0) {
            Serial.print("Device found at address 0x");
            if (address < 16) Serial.print("0");
            Serial.println(address, HEX);
            deviceCount++;
        }
    }

    if (deviceCount == 0) {
        Serial.println("No I2C devices found. Check wiring!");
    } else {
        Serial.print("Found ");
        Serial.print(deviceCount);
        Serial.println(" device(s).");
    }

    Serial.println("---");
    delay(5000);  // Scan every 5 seconds
}
```

> [!TIP]
> Common I2C addresses: OLED display = **0x3C** or 0x3D, BME280 = **0x76** or 0x77.

---

## Step 2: OLED Display — Hello World

The **SSD1306** is a tiny 0.96" OLED display. Install these libraries:
1. **Adafruit SSD1306** (Library Manager)
2. **Adafruit GFX Library** (dependency — installs automatically)

### Wiring (I2C OLED)

| OLED Pin | Connect To |
|----------|-----------|
| VCC | Arduino **3.3V** |
| GND | Arduino **GND** |
| SDA | Arduino **D20** (or A4) |
| SCL | Arduino **D21** (or A5) |

```cpp
// oled_hello.ino
// 💡 Display "Hello from Sensai!" on an OLED screen.

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

const int SCREEN_WIDTH = 128;
const int SCREEN_HEIGHT = 64;

// 💡 Create a display object — -1 means no reset pin
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

void setup() {
    Serial.begin(9600);

    // Initialize the display at I2C address 0x3C
    if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
        Serial.println("OLED not found! Check wiring.");
        while (true);  // Stop here
    }

    display.clearDisplay();
    display.setTextSize(2);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("Hello from");
    display.println("Sensai!");
    display.display();  // 💡 Always call display() to show changes!

    Serial.println("OLED is showing your message!");
}

void loop() {
    // Message stays on screen
}
```

---

## Step 3: Live Sensor Data on OLED

Combine a sensor with the OLED display to show live readings:

```cpp
// oled_sensor.ino
// 💡 Show live analog readings on the OLED display!

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 display(128, 64, &Wire, -1);
const int SENSOR_PIN = A0;

void setup() {
    Serial.begin(9600);
    if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
        Serial.println("OLED not found!");
        while (true);
    }
}

void loop() {
    int rawValue = analogRead(SENSOR_PIN);
    float voltage = rawValue * 3.3 / 1023.0;

    display.clearDisplay();

    // Title
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("Sensai Sensor Monitor");
    display.println("---------------------");

    // Sensor data
    display.setTextSize(2);
    display.setCursor(0, 20);
    display.print("Raw: ");
    display.println(rawValue);

    display.setCursor(0, 44);
    display.print(voltage, 2);
    display.println(" V");

    display.display();
    delay(250);
}
```

---

## 🤖 Ask Sensai

- *"What I2C address does the SSD1306 OLED use?"*
- *"Use the arduino tool to upload an I2C scanner sketch."*
- *"Explain the difference between I2C and SPI — when would I use each?"*
- *"Use the arduino tool to upload a sketch that shows 'Hello' on my OLED."*

---

## 🧪 Exercises

1. **Animated text** — Make text scroll across the OLED display
2. **Temperature display** — Combine the DHT sensor (Module 5) with the OLED to show temp/humidity
3. **Progress bar** — Draw a graphical progress bar on the OLED that tracks a potentiometer

---

## ✅ Module 8 Checkpoint

- [ ] You ran the I2C scanner and found your device's address
- [ ] You displayed text on the OLED screen
- [ ] You showed live sensor data on the OLED
- [ ] You understand I2C uses 2 wires (SDA, SCL) and addresses
- [ ] You can explain why I2C is useful (many devices, few wires)

---

**⬅️ Previous: [Module 7 — Making Things Move](../07-making-things-move/)** | **➡️ Next: [Module 9 — IoT Projects](../09-iot-projects/)**
