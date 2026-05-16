# Module 6: Talking to the Computer 💬

> **Goal:** Master serial communication — send data from Arduino to your computer, receive commands back, and log sensor data as CSV.

---

## 🔌 The Real-World Connection

Every USB device you plug in "talks" to your computer using serial communication. When scientists log temperature data from a weather station, when a 3D printer receives commands, when a GPS module sends coordinates — it's all serial. Learning serial is learning the language devices use to talk to each other.

---

## Key Concepts

### Serial Communication

**Serial** means sending data one bit at a time over a wire. Arduino uses its USB connection as a serial line.

| Function | Purpose |
|----------|---------|
| `Serial.begin(9600)` | Start communication at 9600 baud (bits per second) |
| `Serial.print("Hi")` | Send text (stays on same line) |
| `Serial.println("Hi")` | Send text + new line |
| `Serial.available()` | Check if data has been received |
| `Serial.readString()` | Read received text as a string |

### The Serial Monitor

The Serial Monitor is a built-in tool in the Arduino IDE that displays messages from the board and lets you send messages back. Open it with **Tools → Serial Monitor** (or Ctrl+Shift+M).

---

## Step 1: Serial Echo

Send a message from your computer to the Arduino, and have it echo it back.

```cpp
// serial_echo.ino
// 💡 Type something in Serial Monitor — the Arduino echoes it back!

void setup() {
    Serial.begin(9600);
    Serial.println("Serial Echo Ready — type something!");
}

void loop() {
    if (Serial.available() > 0) {
        String message = Serial.readString();
        message.trim();  // Remove whitespace/newlines

        Serial.print("You said: ");
        Serial.println(message);
        Serial.print("Length: ");
        Serial.print(message.length());
        Serial.println(" characters");
    }
}
```

---

## Step 2: CSV Data Logger

Format sensor data as **CSV** (Comma-Separated Values) so you can paste it into Google Sheets or Excel.

```cpp
// csv_logger.ino
// 💡 Log sensor data as CSV — paste into a spreadsheet!

const int SENSOR_PIN = A0;
unsigned long startTime;
int readingNumber = 0;

void setup() {
    Serial.begin(9600);
    startTime = millis();

    // 💡 Print the CSV header row
    Serial.println("reading,time_ms,raw_value,voltage");
}

void loop() {
    int rawValue = analogRead(SENSOR_PIN);
    float voltage = rawValue * 3.3 / 1023.0;  // ⚠️ 3.3V for Uno Q, 5.0V for classic Uno
    unsigned long elapsed = millis() - startTime;
    readingNumber++;

    // Print one CSV row
    Serial.print(readingNumber);
    Serial.print(",");
    Serial.print(elapsed);
    Serial.print(",");
    Serial.print(rawValue);
    Serial.print(",");
    Serial.println(voltage, 2);  // 2 decimal places

    delay(1000);  // One reading per second
}
```

> [!TIP]
> Copy the entire Serial Monitor output, paste into Google Sheets, and use **Data → Split text to columns** (delimiter: comma) to create a chart.

---

## Step 3: Serial Commands

Parse commands from the Serial Monitor to control hardware — like a simple command-line interface.

```cpp
// serial_commands.ino
// 💡 Type commands to control LEDs! Try: "on", "off", "blink", "status"

const int LED_PIN = 13;
bool ledState = false;

void setup() {
    Serial.begin(9600);
    pinMode(LED_PIN, OUTPUT);
    Serial.println("LED Commander Ready!");
    Serial.println("Commands: on, off, blink, status");
}

void loop() {
    if (Serial.available() > 0) {
        String command = Serial.readString();
        command.trim();
        command.toLowerCase();

        if (command == "on") {
            ledState = true;
            digitalWrite(LED_PIN, HIGH);
            Serial.println("LED is ON");
        }
        else if (command == "off") {
            ledState = false;
            digitalWrite(LED_PIN, LOW);
            Serial.println("LED is OFF");
        }
        else if (command == "blink") {
            Serial.println("Blinking 5 times...");
            for (int i = 0; i < 5; i++) {
                digitalWrite(LED_PIN, HIGH);
                delay(200);
                digitalWrite(LED_PIN, LOW);
                delay(200);
            }
            Serial.println("Done!");
        }
        else if (command == "status") {
            Serial.print("LED is currently: ");
            Serial.println(ledState ? "ON" : "OFF");
        }
        else {
            Serial.print("Unknown command: ");
            Serial.println(command);
        }
    }
}
```

---

## 🤖 Ask Sensai

- *"Help me format my sensor output as CSV so I can paste it into a spreadsheet."*
- *"Use the arduino tool to upload a sketch that reads A0 every second and prints CSV data."*
- *"What is baud rate and why does it need to match between the sketch and Serial Monitor?"*

---

## 🧪 Exercises

1. **Custom commands** — Add a `brightness <0-255>` command that controls LED brightness via PWM
2. **Timestamp format** — Modify the CSV logger to print time as `mm:ss` instead of milliseconds
3. **Two-way sensor** — Combine serial commands with sensor reading: send `read` to get one sensor value on demand

---

## ✅ Module 6 Checkpoint

- [ ] You can send messages from Arduino to the Serial Monitor
- [ ] You can receive and parse commands from the Serial Monitor
- [ ] You formatted sensor data as CSV and understand the output
- [ ] You understand `Serial.available()` checks for incoming data
- [ ] You can explain why baud rate must match on both ends

---

**⬅️ Previous: [Module 5 — Sensing the Environment](../05-sensing-the-environment/)** | **➡️ Next: [Module 7 — Making Things Move](../07-making-things-move/)**
