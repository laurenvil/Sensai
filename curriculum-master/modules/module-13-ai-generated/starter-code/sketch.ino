// Bluetooth Low Energy Example for Arduino Uno Q
// This example demonstrates simple BLE communications.

// Include the necessary libraries
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// Define the PINs
const int LED_PIN = 2; // LED pin for indication

// Create BLE server variables
BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;

// Function to setup BLE services and characteristics
void setupBLE() {
    // TODO: Initialize the BLE device
    // 💡 Use BLEDevice::init("YourDeviceName") to set the device name

    // TODO: Create a BLE server
    // 💡 Use BLEDevice::createServer() to create a server instance

    // TODO: Create a BLE characteristic
    // 💡 Use pServer->createService() to create a service and pServer->createCharacteristic() to add your characteristic

    // TODO: Add a characteristic descriptor
    // 💡 Use pCharacteristic->addDescriptor() for adding a descriptor like BLE2902
    
    // TODO: Start the BLE service
}

// Setup function
void setup() {
    // Initialize Serial for debugging
    Serial.begin(9600); // Set the baud rate to 9600

    // Setup BLE
    setupBLE();

    // Initialize the LED pin
    pinMode(LED_PIN, OUTPUT);
}

// Loop function
void loop() {
    // TODO: Read sensor data (e.g., temperature, light) and send via BLE
    // 💡 Use pCharacteristic->setValue() to update the characteristic value

    // TODO: Optional: Blink the LED to indicate BLE activity
    digitalWrite(LED_PIN, HIGH);
    delay(1000);
    digitalWrite(LED_PIN, LOW);
    delay(1000);
}
```

***
