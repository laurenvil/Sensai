// temp_humidity.ino
// 💡 Read temperature and humidity from a DHT sensor.

#include <DHT.h>

const int DHT_PIN = 2;
const int DHT_TYPE = DHT11;  // Change to DHT22 if needed

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
    Serial.begin(9600);
    dht.begin();
    Serial.println("Sensai Environment Monitor");
    Serial.println("==========================");
}

void loop() {
    delay(2000);
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();

    if (isnan(temperature) || isnan(humidity)) {
        Serial.println("Error: Could not read sensor!");
        return;
    }

    Serial.print("Temperature: ");
    Serial.print(temperature);
    Serial.print(" C  |  Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");
}
