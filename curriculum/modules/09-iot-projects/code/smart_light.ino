// smart_light.ino
// 💡 Automatic night light with hysteresis and smooth fade.

const int LIGHT_PIN = A1;
const int LED_PIN = 3;

const int DARK_ON = 300;
const int BRIGHT_OFF = 500;

bool lightIsOn = false;

void setup() {
    pinMode(LED_PIN, OUTPUT);
    Serial.begin(9600);
    Serial.println("Smart Light Active");
}

void loop() {
    int lightLevel = analogRead(LIGHT_PIN);

    if (lightLevel < DARK_ON && !lightIsOn) {
        lightIsOn = true;
        for (int b = 0; b <= 255; b += 5) {
            analogWrite(LED_PIN, b);
            delay(20);
        }
        Serial.println("Light ON");
    }
    else if (lightLevel > BRIGHT_OFF && lightIsOn) {
        lightIsOn = false;
        for (int b = 255; b >= 0; b -= 5) {
            analogWrite(LED_PIN, b);
            delay(20);
        }
        Serial.println("Light OFF");
    }

    delay(500);
}
