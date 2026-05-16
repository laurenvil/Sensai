// csv_logger.ino
// 💡 Log sensor data as CSV — paste into a spreadsheet!

const int SENSOR_PIN = A0;
unsigned long startTime;
int readingNumber = 0;

void setup() {
    Serial.begin(9600);
    startTime = millis();
    Serial.println("reading,time_ms,raw_value,voltage");
}

void loop() {
    int rawValue = analogRead(SENSOR_PIN);
    // ⚠️ 3.3V for Uno Q, use 5.0 for classic Uno
    float voltage = rawValue * 3.3 / 1023.0;
    unsigned long elapsed = millis() - startTime;
    readingNumber++;

    Serial.print(readingNumber);
    Serial.print(",");
    Serial.print(elapsed);
    Serial.print(",");
    Serial.print(rawValue);
    Serial.print(",");
    Serial.println(voltage, 2);

    delay(1000);
}
