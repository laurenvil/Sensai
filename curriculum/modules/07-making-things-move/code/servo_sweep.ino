// servo_sweep.ino
// 💡 Servo sweeps back and forth from 0 to 180 degrees.

#include <Servo.h>

const int SERVO_PIN = 9;
Servo myServo;

void setup() {
    myServo.attach(SERVO_PIN);
    Serial.begin(9600);
}

void loop() {
    for (int angle = 0; angle <= 180; angle++) {
        myServo.write(angle);
        delay(15);
    }
    for (int angle = 180; angle >= 0; angle--) {
        myServo.write(angle);
        delay(15);
    }
}
