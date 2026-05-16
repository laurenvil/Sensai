// oled_sensor.ino
// 💡 Show live analog readings on the OLED display!

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 display(128, 64, &Wire, -1);
const int SENSOR_PIN = A0;

void setup() {
    Serial.begin(9600);
    if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
        Serial.println("OLED not found!");
        while (true);
    }
}

void loop() {
    int rawValue = analogRead(SENSOR_PIN);
    float voltage = rawValue * 3.3 / 1023.0;

    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("Sensai Sensor Monitor");
    display.println("---------------------");

    display.setTextSize(2);
    display.setCursor(0, 20);
    display.print("Raw: ");
    display.println(rawValue);
    display.setCursor(0, 44);
    display.print(voltage, 2);
    display.println(" V");

    display.display();
    delay(250);
}
