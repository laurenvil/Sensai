// button_led.ino
// 💡 Module 03 — Variables & Logic
// YOUR TASK: Press the button to turn on the LED. Release to turn off.
//
// Instructions:
// 1. Set BUTTON_PIN as INPUT_PULLUP in setup()
// 2. Set LED_PIN as OUTPUT in setup()
// 3. In loop(), read the button state with digitalRead()
// 4. Use if/else to control the LED

const int BUTTON_PIN = 7;
const int LED_PIN = 13;

void setup() {
    // TODO: Set BUTTON_PIN as INPUT_PULLUP
    // TODO: Set LED_PIN as OUTPUT
}

void loop() {
    // TODO: Read the button state
    // int buttonState = digitalRead(BUTTON_PIN);

    // TODO: If button is pressed (LOW with INPUT_PULLUP), turn LED on
    // ⚠️ With INPUT_PULLUP, LOW means pressed!
    // if (buttonState == LOW) {
    //     digitalWrite(LED_PIN, HIGH);
    // } else {
    //     digitalWrite(LED_PIN, LOW);
    // }
}
