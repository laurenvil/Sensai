// weather_station.ino
// 💡 Multi-sensor weather station with OLED display!

#include <DHT.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

const int DHT_PIN = 2;
const int LIGHT_PIN = A1;

DHT dht(DHT_PIN, DHT22);
Adafruit_SSD1306 display(128, 64, &Wire, -1);

void setup() {
    Serial.begin(9600);
    dht.begin();
    if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
        Serial.println("OLED not found!");
        while (true);
    }
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("Sensai Weather Station");
    display.display();
    delay(2000);
}

void loop() {
    float temp = dht.readTemperature();
    float humidity = dht.readHumidity();
    int lightPercent = map(analogRead(LIGHT_PIN), 0, 1023, 0, 100);

    display.clearDisplay();
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("=== WEATHER STATION ===");
    display.setTextSize(2);
    display.setCursor(0, 14);
    if (!isnan(temp)) { display.print(temp, 1); display.println(" C"); }
    display.setTextSize(1);
    display.setCursor(0, 38);
    if (!isnan(humidity)) { display.print("Humidity: "); display.print(humidity, 0); display.println("%"); }
    display.print("Light:    "); display.print(lightPercent); display.println("%");
    display.display();

    delay(2000);
}
