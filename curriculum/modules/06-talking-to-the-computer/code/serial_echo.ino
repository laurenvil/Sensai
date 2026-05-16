// serial_echo.ino
// 💡 Type in Serial Monitor — Arduino echoes it back!

void setup() {
    Serial.begin(9600);
    Serial.println("Serial Echo Ready — type something!");
}

void loop() {
    if (Serial.available() > 0) {
        String message = Serial.readString();
        message.trim();
        Serial.print("You said: ");
        Serial.println(message);
        Serial.print("Length: ");
        Serial.print(message.length());
        Serial.println(" characters");
    }
}
