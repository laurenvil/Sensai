// heat_alert.ino
// 💡 LED alarm when temperature exceeds threshold.

#include <DHT.h>

const int DHT_PIN = 2;
const int DHT_TYPE = DHT11;
const int ALERT_LED = 13;
const float TEMP_THRESHOLD = 28.0;

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
    Serial.begin(9600);
    pinMode(ALERT_LED, OUTPUT);
    dht.begin();
    Serial.println("Heat Alert System Active");
}

void loop() {
    delay(2000);
    float temp = dht.readTemperature();

    if (isnan(temp)) {
        Serial.println("Sensor error!");
        return;
    }

    Serial.print("Temp: ");
    Serial.print(temp);
    Serial.print(" C  ");

    if (temp > TEMP_THRESHOLD) {
        digitalWrite(ALERT_LED, HIGH);
        Serial.println("[ALERT! TOO HOT]");
    } else {
        digitalWrite(ALERT_LED, LOW);
        Serial.println("[OK]");
    }
}
