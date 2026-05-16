// reaction_timer.ino
// 💡 Test your reaction time! Press the button when the LED turns on.

const int BUTTON_PIN = 7;
const int LED_PIN = 13;

void setup() {
    pinMode(BUTTON_PIN, INPUT_PULLUP);
    pinMode(LED_PIN, OUTPUT);
    Serial.begin(9600);
    randomSeed(analogRead(A0));
}

void loop() {
    Serial.println("Get ready...");
    delay(random(2000, 5000));

    digitalWrite(LED_PIN, HIGH);
    unsigned long startTime = millis();

    while (digitalRead(BUTTON_PIN) == HIGH) {
        // Wait for press
    }

    unsigned long reactionTime = millis() - startTime;
    digitalWrite(LED_PIN, LOW);

    Serial.print("Reaction time: ");
    Serial.print(reactionTime);
    Serial.println(" ms");

    if (reactionTime < 250) {
        Serial.println("Lightning fast!");
    } else if (reactionTime < 500) {
        Serial.println("Nice reflexes!");
    } else {
        Serial.println("Keep practicing!");
    }

    delay(2000);
}
