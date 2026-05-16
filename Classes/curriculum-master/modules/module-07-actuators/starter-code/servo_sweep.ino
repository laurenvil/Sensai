// servo_sweep.ino
// 💡 Module 07 — Making Things Move
// YOUR TASK: Sweep a servo from 0° to 180° and back.

// TODO: Include the Servo library
// #include <Servo.h>

const int SERVO_PIN = 9;
// TODO: Create a Servo object
// Servo myServo;

void setup() {
    // TODO: Attach servo to pin
    // myServo.attach(SERVO_PIN);
    Serial.begin(9600);
}

void loop() {
    // TODO: Sweep from 0 to 180
    // for (int angle = 0; angle <= 180; angle++) {
    //     myServo.write(angle);
    //     delay(15);
    // }

    // TODO: Sweep back from 180 to 0
    // for (int angle = 180; angle >= 0; angle--) {
    //     myServo.write(angle);
    //     delay(15);
    // }
}
