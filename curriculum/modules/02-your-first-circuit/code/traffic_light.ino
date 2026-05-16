// traffic_light.ino
// 💡 A traffic light that cycles through green, yellow, and red.

const int RED_PIN    = 4;
const int YELLOW_PIN = 3;
const int GREEN_PIN  = 2;

void setup() {
    pinMode(RED_PIN, OUTPUT);
    pinMode(YELLOW_PIN, OUTPUT);
    pinMode(GREEN_PIN, OUTPUT);
}

void loop() {
    // Green — GO
    digitalWrite(GREEN_PIN, HIGH);
    delay(3000);
    digitalWrite(GREEN_PIN, LOW);

    // Yellow — CAUTION
    digitalWrite(YELLOW_PIN, HIGH);
    delay(1000);
    digitalWrite(YELLOW_PIN, LOW);

    // Red — STOP
    digitalWrite(RED_PIN, HIGH);
    delay(3000);
    digitalWrite(RED_PIN, LOW);
}
