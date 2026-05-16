// hello_serial.ino
// 💡 Module 01 — Welcome to Arduino
// YOUR TASK: Complete this sketch so it prints a greeting to the Serial Monitor.
//
// Instructions:
// 1. In setup(), start Serial communication at 9600 baud
// 2. Print "Hello from Arduino!" to the Serial Monitor
// 3. In loop(), print the number of seconds since startup (use millis())

void setup() {
    // TODO: Start serial communication at 9600 baud
    // Hint: Serial.begin(???);

    // TODO: Print a greeting message
    // Hint: Serial.println("???");
}

void loop() {
    // TODO: Print the uptime in seconds
    // Hint: unsigned long seconds = millis() / 1000;
    // Hint: Serial.print("Uptime: "); Serial.print(seconds); Serial.println(" seconds");

    delay(1000);  // Wait 1 second between prints
}
