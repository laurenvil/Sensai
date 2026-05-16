// serial_commands.ino
// 💡 Module 06 — Talking to the Computer
// YOUR TASK: Parse serial commands to control an LED.
// Commands: "on", "off", "blink", "status"

const int LED_PIN = 13;
bool ledState = false;

void setup() {
    Serial.begin(9600);
    pinMode(LED_PIN, OUTPUT);
    Serial.println("LED Commander Ready!");
    Serial.println("Commands: on, off, blink, status");
}

void loop() {
    // TODO: Check if serial data is available
    // if (Serial.available() > 0) {
    //     String command = Serial.readString();
    //     command.trim();
    //     command.toLowerCase();
    //
    //     if (command == "on") {
    //         ledState = true;
    //         digitalWrite(LED_PIN, HIGH);
    //         Serial.println("LED is ON");
    //     } else if (command == "off") {
    //         ledState = false;
    //         digitalWrite(LED_PIN, LOW);
    //         Serial.println("LED is OFF");
    //     } else if (command == "blink") {
    //         Serial.println("Blinking...");
    //         for (int i = 0; i < 5; i++) {
    //             digitalWrite(LED_PIN, HIGH); delay(200);
    //             digitalWrite(LED_PIN, LOW); delay(200);
    //         }
    //     } else if (command == "status") {
    //         Serial.print("LED: "); Serial.println(ledState ? "ON" : "OFF");
    //     } else {
    //         Serial.print("Unknown: "); Serial.println(command);
    //     }
    // }
}
