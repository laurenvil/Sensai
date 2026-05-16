// pot_servo.ino
// 💡 Turn the knob to control servo position!

#include <Servo.h>

const int POT_PIN = A0;
const int SERVO_PIN = 9;
Servo myServo;

void setup() {
    myServo.attach(SERVO_PIN);
    Serial.begin(9600);
}

void loop() {
    int potValue = analogRead(POT_PIN);
    int angle = map(potValue, 0, 1023, 0, 180);
    myServo.write(angle);

    Serial.print("Pot: ");
    Serial.print(potValue);
    Serial.print(" -> Angle: ");
    Serial.println(angle);

    delay(50);
}
