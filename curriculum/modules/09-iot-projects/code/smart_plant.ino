// smart_plant.ino
// 💡 Automatic plant watering — waters when soil is dry!

const int MOISTURE_PIN = A0;
const int RELAY_PIN = 4;
const int LED_PIN = 13;

const int DRY_THRESHOLD = 400;
const int WET_THRESHOLD = 600;
const unsigned long WATER_TIME = 3000;

bool isWatering = false;

void setup() {
    pinMode(RELAY_PIN, OUTPUT);
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(RELAY_PIN, LOW);
    Serial.begin(9600);
    Serial.println("Smart Plant Watering System");
}

void loop() {
    int moisture = analogRead(MOISTURE_PIN);
    Serial.print("Moisture: ");
    Serial.print(moisture);

    if (moisture < DRY_THRESHOLD && !isWatering) {
        Serial.println(" [DRY - WATERING]");
        isWatering = true;
        digitalWrite(RELAY_PIN, HIGH);
        digitalWrite(LED_PIN, HIGH);
        delay(WATER_TIME);
        digitalWrite(RELAY_PIN, LOW);
        isWatering = false;
    } else if (moisture > WET_THRESHOLD) {
        Serial.println(" [WET - OK]");
        digitalWrite(LED_PIN, LOW);
    } else {
        Serial.println(" [MODERATE]");
    }

    delay(2000);
}
