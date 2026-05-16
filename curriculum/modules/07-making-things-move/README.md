# Module 7: Making Things Move ⚙️

> **Goal:** Control LED brightness with PWM, drive servo motors, play tones with a buzzer, and learn non-blocking timing with `millis()`.

---

## 🔌 The Real-World Connection

Robot arms, camera gimbals, drone propellers, and music boxes all use **actuators** — devices that create physical movement or sound. PWM (Pulse Width Modulation) is the secret behind dimming LEDs, controlling motor speed, and positioning servos. It's one of the most powerful tools in electronics.

---

## Key Concepts

### PWM — Fake Analog Output

Digital pins can only be HIGH (3.3V) or LOW (0V). **PWM** fakes intermediate values by switching on and off very rapidly. The **duty cycle** (% of time spent ON) determines the effective voltage.

| `analogWrite()` Value | Duty Cycle | Effective Voltage (Uno Q) |
|----------------------|------------|--------------------------|
| 0 | 0% (always off) | 0V |
| 64 | 25% | ~0.8V |
| 128 | 50% | ~1.65V |
| 255 | 100% (always on) | 3.3V |

> [!IMPORTANT]
> PWM only works on pins marked with **~** : D3, D5, D6, D9, D10, D11.

### `millis()` — Non-Blocking Timing

`delay()` freezes the entire program. `millis()` lets you check elapsed time without stopping — like glancing at a clock instead of setting a sleep timer.

---

## Step 1: Breathing LED (PWM Fade)

```cpp
// led_fade.ino
// 💡 The LED "breathes" — smoothly fading in and out.

const int LED_PIN = 3;  // ⚠️ Must be a PWM pin (~)

void setup() {
    pinMode(LED_PIN, OUTPUT);
}

void loop() {
    // Fade in
    for (int brightness = 0; brightness <= 255; brightness += 5) {
        analogWrite(LED_PIN, brightness);
        delay(30);
    }

    // Fade out
    for (int brightness = 255; brightness >= 0; brightness -= 5) {
        analogWrite(LED_PIN, brightness);
        delay(30);
    }
}
```

---

## Step 2: Servo Motor

A **servo motor** moves to a specific angle (0°–180°). It uses the `Servo.h` library.

### Wiring (SG90 Servo)

| Servo Wire | Color | Connect To |
|-----------|-------|-----------|
| Signal | Orange/Yellow | Arduino **D9** |
| Power | Red | Arduino **5V** |
| Ground | Brown/Black | Arduino **GND** |

```cpp
// servo_sweep.ino
// 💡 The servo sweeps back and forth from 0° to 180°.

#include <Servo.h>

const int SERVO_PIN = 9;
Servo myServo;

void setup() {
    myServo.attach(SERVO_PIN);
    Serial.begin(9600);
}

void loop() {
    // Sweep from 0° to 180°
    for (int angle = 0; angle <= 180; angle++) {
        myServo.write(angle);
        Serial.print("Angle: ");
        Serial.println(angle);
        delay(15);
    }

    // Sweep back from 180° to 0°
    for (int angle = 180; angle >= 0; angle--) {
        myServo.write(angle);
        delay(15);
    }
}
```

---

## Step 3: Potentiometer Controls Servo

```cpp
// pot_servo.ino
// 💡 Turn the knob to control the servo position!

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
```

---

## Step 4: Melody Player (Buzzer)

```cpp
// melody_player.ino
// 💡 Play "Twinkle Twinkle Little Star" on a piezo buzzer!

const int BUZZER_PIN = 6;  // ⚠️ Use a PWM pin

// 💡 Musical note frequencies (Hz)
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
        delay(durations[i] + 50);  // Note duration + small gap
    }

    noTone(BUZZER_PIN);
    Serial.println("Done!");
}

void loop() {
    // Song plays once in setup()
}
```

---

## 🤖 Ask Sensai

- *"Use the arduino tool to upload a sketch that sweeps a servo from 0 to 180 degrees."*
- *"What is PWM and why can't I use it on every pin?"*
- *"Write a sketch that plays 'Happy Birthday' on a buzzer."*

---

## 🧪 Exercises

1. **Heartbeat LED** — Create a "heartbeat" pattern: two quick pulses, then a pause
2. **Servo + button** — Press a button to move the servo 10° each time
3. **Custom melody** — Compose your own 8-note tune and play it on the buzzer

---

## ✅ Module 7 Checkpoint

- [ ] You faded an LED in and out with `analogWrite()` (PWM)
- [ ] You controlled a servo with `Servo.h` and moved it to specific angles
- [ ] You connected a potentiometer to control servo position
- [ ] You played a melody on a buzzer with `tone()`
- [ ] You understand that PWM only works on ~ pins

---

**⬅️ Previous: [Module 6 — Talking to the Computer](../06-talking-to-the-computer/)** | **➡️ Next: [Module 8 — Advanced Communication](../08-advanced-communication/)**
