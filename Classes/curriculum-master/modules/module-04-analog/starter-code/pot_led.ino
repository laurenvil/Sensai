// pot_led.ino
// 💡 Module 04 — Reading the World
// YOUR TASK: Turn the potentiometer knob to control LED brightness.
//
// Instructions:
// 1. Read the potentiometer value on A0 using analogRead()
// 2. Map the value from 0-1023 to 0-255 using map()
// 3. Write the mapped value to the LED pin using analogWrite()
// 4. Print both values to Serial for debugging

const int POT_PIN = A0;
const int LED_PIN = 3;  // ⚠️ Must be a PWM pin (~)

void setup() {
    pinMode(LED_PIN, OUTPUT);
    Serial.begin(9600);
}

void loop() {
    // TODO: Read the potentiometer
    // int potValue = analogRead(POT_PIN);

    // TODO: Map 0-1023 to 0-255
    // int brightness = map(potValue, 0, 1023, 0, 255);

    // TODO: Set LED brightness
    // analogWrite(LED_PIN, brightness);

    // TODO: Print values to Serial
    // Serial.print("Pot: "); Serial.print(potValue);
    // Serial.print(" -> Brightness: "); Serial.println(brightness);

    delay(100);
}
