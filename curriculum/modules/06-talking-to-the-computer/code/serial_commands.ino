// serial_commands.ino
// 💡 Type commands to control LEDs! Try: on, off, blink, status

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
