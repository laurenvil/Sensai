// button_led.ino
// 💡 Press the button to turn on the LED. Release to turn off.

const int BUTTON_PIN = 7;
const int LED_PIN = 13;

void setup() {
    pinMode(BUTTON_PIN, INPUT_PULLUP);
    pinMode(LED_PIN, OUTPUT);
}

void loop() {
    int buttonState = digitalRead(BUTTON_PIN);
    // ⚠️ With INPUT_PULLUP, LOW means pressed!
    if (buttonState == LOW) {
        digitalWrite(LED_PIN, HIGH);
    } else {
        digitalWrite(LED_PIN, LOW);
    }
}
