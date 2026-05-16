// toggle_button.ino
// 💡 Press once to turn LED on. Press again to turn it off.

const int BUTTON_PIN = 7;
const int LED_PIN = 13;

bool ledOn = false;
bool lastButtonState = HIGH;

void setup() {
    pinMode(BUTTON_PIN, INPUT_PULLUP);
    pinMode(LED_PIN, OUTPUT);
}

void loop() {
    bool currentState = digitalRead(BUTTON_PIN);
    if (currentState == LOW && lastButtonState == HIGH) {
        ledOn = !ledOn;
        digitalWrite(LED_PIN, ledOn ? HIGH : LOW);
        delay(50);  // ⚠️ Simple debounce
    }
    lastButtonState = currentState;
}
