// hello_serial.ino
// 💡 Your very first Arduino sketch!
// This sends a message from the board to your computer.

void setup() {
    // Start serial communication at 9600 bits per second
    // 💡 "Serial" is like a phone line between the board and your computer
    Serial.begin(9600);

    // Wait for the serial connection to be ready
    while (!Serial) {
        ; // Some boards need this wait
    }

    // Send a greeting!
    Serial.println("Hello from Sensai! 🤖");
    Serial.println("Welcome to the Arduino world.");
    Serial.println("I am your Uno Q board, ready to learn with you.");
}

void loop() {
    // Nothing here yet — we'll add things in future modules!
    // 💡 Even though loop() is empty, it MUST exist in every sketch.
}
