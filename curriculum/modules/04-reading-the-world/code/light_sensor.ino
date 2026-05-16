// light_sensor.ino
// 💡 Automatic night light — LED turns on when it gets dark.

const int LIGHT_PIN = A1;
const int LED_PIN = 13;
const int DARK_THRESHOLD = 300;

void setup() {
    pinMode(LED_PIN, OUTPUT);
    Serial.begin(9600);
}

void loop() {
    int lightLevel = analogRead(LIGHT_PIN);

    Serial.print("Light: ");
    Serial.println(lightLevel);

    if (lightLevel < DARK_THRESHOLD) {
        digitalWrite(LED_PIN, HIGH);
    } else {
        digitalWrite(LED_PIN, LOW);
    }

    delay(500);
}
