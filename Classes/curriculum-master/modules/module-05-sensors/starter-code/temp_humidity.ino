// temp_humidity.ino
// 💡 Module 05 — Sensing the Environment
// YOUR TASK: Read temperature and humidity from a DHT sensor.

// TODO: Include the DHT library
// #include <DHT.h>

const int DHT_PIN = 2;
// TODO: Create DHT object
// DHT dht(DHT_PIN, DHT11);

void setup() {
    Serial.begin(9600);
    // TODO: Initialize the sensor
    // dht.begin();
    Serial.println("Sensai Environment Monitor");
}

void loop() {
    delay(2000);
    // TODO: Read temperature and humidity
    // float temp = dht.readTemperature();
    // float humidity = dht.readHumidity();

    // TODO: Check for errors
    // if (isnan(temp) || isnan(humidity)) {
    //     Serial.println("Sensor error!");
    //     return;
    // }

    // TODO: Print the readings
    // Serial.print("Temp: "); Serial.print(temp);
    // Serial.print(" C | Humidity: "); Serial.print(humidity); Serial.println(" %");
}
