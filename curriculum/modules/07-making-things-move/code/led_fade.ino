// led_fade.ino
// 💡 The LED "breathes" — smoothly fading in and out.

const int LED_PIN = 3;  // ⚠️ Must be a PWM pin (~)

void setup() {
    pinMode(LED_PIN, OUTPUT);
}

void loop() {
    for (int b = 0; b <= 255; b += 5) {
        analogWrite(LED_PIN, b);
        delay(30);
    }
    for (int b = 255; b >= 0; b -= 5) {
        analogWrite(LED_PIN, b);
        delay(30);
    }
}
