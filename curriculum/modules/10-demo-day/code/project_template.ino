// project_template.ino
// 💡 Capstone Project: [Your Project Name]
// Author: [Your Name]
// Date: [Today's Date]
// Description: [What does your project do?]

// ── Libraries ────────────────────────────────────────
// Uncomment the libraries you need:
// #include <DHT.h>
// #include <Servo.h>
// #include <Wire.h>
// #include <Adafruit_GFX.h>
// #include <Adafruit_SSD1306.h>

// ── Pin Configuration ────────────────────────────────
// const int SENSOR_1_PIN = A0;
// const int SENSOR_2_PIN = A1;
// const int ACTUATOR_PIN = 4;
// const int LED_PIN = 13;

// ── Constants & Thresholds ───────────────────────────
// const int THRESHOLD = 500;

// ── Global Variables ─────────────────────────────────
// bool systemActive = true;

void setup() {
    Serial.begin(9600);
    Serial.println("=== [Your Project Name] ===");
    Serial.println("Initializing...");

    // TODO: Set up your pins, sensors, and displays here
    // pinMode(LED_PIN, OUTPUT);

    Serial.println("Ready!");
}

void loop() {
    // ── Step 1: SENSE — Read your sensors ────────────
    // int sensorValue = analogRead(SENSOR_1_PIN);

    // ── Step 2: PROCESS — Make decisions ─────────────
    // if (sensorValue < THRESHOLD) {
    //     // Take action
    // }

    // ── Step 3: ACT — Control outputs ────────────────
    // digitalWrite(ACTUATOR_PIN, HIGH);

    // ── Step 4: DISPLAY — Show status ────────────────
    // Serial.print("Sensor: ");
    // Serial.println(sensorValue);

    delay(1000);
}
