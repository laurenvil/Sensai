// pot_led.ino
// 💡 Turn the knob to control LED brightness!

const int POT_PIN = A0;
const int LED_PIN = 3;  // ⚠️ Must be a PWM pin (~)

void setup() {
    pinMode(LED_PIN, OUTPUT);
    Serial.begin(9600);
}

void loop() {
    int potValue = analogRead(POT_PIN);
    int brightness = map(potValue, 0, 1023, 0, 255);
    analogWrite(LED_PIN, brightness);

    Serial.print("Pot: ");
    Serial.print(potValue);
    Serial.print(" -> Brightness: ");
    Serial.println(brightness);

    delay(100);
}
