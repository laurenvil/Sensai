// melody_player.ino
// 💡 Play "Twinkle Twinkle Little Star" on a piezo buzzer!

const int BUZZER_PIN = 6;

#define NOTE_C4 262
#define NOTE_D4 294
#define NOTE_E4 330
#define NOTE_F4 349
#define NOTE_G4 392
#define NOTE_A4 440
#define NOTE_REST 0

int melody[] = {
    NOTE_C4, NOTE_C4, NOTE_G4, NOTE_G4,
    NOTE_A4, NOTE_A4, NOTE_G4, NOTE_REST,
    NOTE_F4, NOTE_F4, NOTE_E4, NOTE_E4,
    NOTE_D4, NOTE_D4, NOTE_C4, NOTE_REST
};

int durations[] = {
    400, 400, 400, 400,
    400, 400, 800, 200,
    400, 400, 400, 400,
    400, 400, 800, 200
};

void setup() {
    Serial.begin(9600);
    Serial.println("Playing Twinkle Twinkle...");

    for (int i = 0; i < 16; i++) {
        if (melody[i] == NOTE_REST) {
            noTone(BUZZER_PIN);
        } else {
            tone(BUZZER_PIN, melody[i], durations[i]);
        }
        delay(durations[i] + 50);
    }

    noTone(BUZZER_PIN);
    Serial.println("Done!");
}

void loop() {
    // Song plays once in setup()
}
