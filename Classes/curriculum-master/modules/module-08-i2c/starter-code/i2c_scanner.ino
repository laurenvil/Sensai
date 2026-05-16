// i2c_scanner.ino
// 💡 Module 08 — Advanced Communication
// YOUR TASK: Scan the I2C bus and report all connected devices.

#include <Wire.h>

void setup() {
    Wire.begin();
    Serial.begin(9600);
    Serial.println("I2C Scanner — scanning...");
}

void loop() {
    int deviceCount = 0;
    // TODO: Loop through all I2C addresses (1–126)
    // for (byte address = 1; address < 127; address++) {
    //     Wire.beginTransmission(address);
    //     byte error = Wire.endTransmission();
    //     if (error == 0) {
    //         Serial.print("Device at 0x");
    //         if (address < 16) Serial.print("0");
    //         Serial.println(address, HEX);
    //         deviceCount++;
    //     }
    // }

    // TODO: Report results
    // if (deviceCount == 0) Serial.println("No devices found.");
    // else { Serial.print("Found "); Serial.print(deviceCount); Serial.println(" device(s)."); }

    Serial.println("---");
    delay(5000);
}
