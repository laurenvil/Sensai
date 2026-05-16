# Module 3: Variables & Logic 🧠

> **Goal:** Use variables, `if/else` statements, and buttons to make your Arduino respond to input — the first step toward interactive projects.

---

## 🔌 The Real-World Connection

Every elevator button, doorbell, game controller, and keyboard works on the same principle: the device **reads** whether a button is pressed and **reacts** based on logic. In this module, you'll make your Arduino listen to a button and decide what to do.

---

## Key Concepts

### Variables

A **variable** is a named container that holds a value. Instead of writing `13` everywhere, you write `LED_PIN` — and if you change the pin, you only update one line.

```cpp
int brightness = 200;       // A whole number
const int LED_PIN = 13;     // A constant — never changes
bool isOn = false;          // true or false
```

| Type | Holds | Example |
|------|-------|---------|
| `int` | Whole numbers | `int count = 0;` |
| `float` | Decimal numbers | `float temp = 22.5;` |
| `bool` | True or false | `bool pressed = true;` |
| `const int` | A number that never changes | `const int PIN = 7;` |

### `if/else` — Making Decisions

```cpp
if (buttonState == HIGH) {
    // Button is pressed — do something
    digitalWrite(LED_PIN, HIGH);
} else {
    // Button is NOT pressed — do something else
    digitalWrite(LED_PIN, LOW);
}
```

### Buttons and Pull-Up Resistors

When a button is not pressed, the input pin is "floating" — it's not connected to anything, so it reads random noise. A **pull-up resistor** connects the pin to 3.3V (HIGH) when the button is open, giving it a stable default state.

Arduino has **built-in pull-up resistors** you can activate with: `pinMode(pin, INPUT_PULLUP);`

> [!IMPORTANT]
> With `INPUT_PULLUP`, the logic is **inverted**: the pin reads `LOW` when pressed and `HIGH` when released.

---

## Step 1: Button-Controlled LED

### Parts Needed
- 1× push button, 1× LED, 1× 220Ω resistor, jumper wires

### Wiring

| Connection | From | To |
|------------|------|-----|
| Button leg 1 | Arduino **D7** | — |
| Button leg 2 | Arduino **GND** | — |
| LED circuit | **D13** → 220Ω → LED → GND | (same as Module 2) |

```cpp
// button_led.ino
// 💡 Press the button to turn on the LED. Release to turn off.

const int BUTTON_PIN = 7;
const int LED_PIN = 13;

void setup() {
    // 💡 INPUT_PULLUP activates the internal pull-up resistor
    // This means: pin reads HIGH normally, LOW when button is pressed
    pinMode(BUTTON_PIN, INPUT_PULLUP);
    pinMode(LED_PIN, OUTPUT);
}

void loop() {
    int buttonState = digitalRead(BUTTON_PIN);

    if (buttonState == LOW) {
        // ⚠️ With INPUT_PULLUP, LOW means pressed!
        digitalWrite(LED_PIN, HIGH);
    } else {
        digitalWrite(LED_PIN, LOW);
    }
}
```

---

## Step 2: Toggle Button (State Variable)

The previous sketch only lights the LED while you hold the button. A **toggle** flips the LED on/off with each press — like a light switch.

```cpp
// toggle_button.ino
// 💡 Press the button once to turn the LED on. Press again to turn it off.

const int BUTTON_PIN = 7;
const int LED_PIN = 13;

bool ledOn = false;             // 💡 This "state variable" remembers if the LED is on or off
bool lastButtonState = HIGH;    // Tracks the previous button reading

void setup() {
    pinMode(BUTTON_PIN, INPUT_PULLUP);
    pinMode(LED_PIN, OUTPUT);
}

void loop() {
    bool currentState = digitalRead(BUTTON_PIN);

    // Detect a button PRESS (transition from HIGH to LOW)
    if (currentState == LOW && lastButtonState == HIGH) {
        ledOn = !ledOn;  // 💡 Flip the state: true becomes false, false becomes true
        digitalWrite(LED_PIN, ledOn ? HIGH : LOW);
        delay(50);       // ⚠️ Simple debounce — buttons "bounce" for a few milliseconds
    }

    lastButtonState = currentState;
}
```

---

## Step 3: Reaction Timer Game

Test your reflexes! The LED turns on after a random delay — press the button as fast as you can.

```cpp
// reaction_timer.ino
// 💡 Test your reaction time! How fast can you press the button?

const int BUTTON_PIN = 7;
const int LED_PIN = 13;

void setup() {
    pinMode(BUTTON_PIN, INPUT_PULLUP);
    pinMode(LED_PIN, OUTPUT);
    Serial.begin(9600);

    // Seed the random number generator with noise from an unconnected analog pin
    randomSeed(analogRead(A0));
}

void loop() {
    Serial.println("Get ready...");
    delay(random(2000, 5000));  // 💡 Wait 2-5 seconds randomly

    // Turn on the LED — GO!
    digitalWrite(LED_PIN, HIGH);
    unsigned long startTime = millis();  // 💡 millis() counts milliseconds since startup

    // Wait for button press
    while (digitalRead(BUTTON_PIN) == HIGH) {
        // Do nothing — just wait
    }

    unsigned long reactionTime = millis() - startTime;
    digitalWrite(LED_PIN, LOW);

    // Show the result
    Serial.print("Your reaction time: ");
    Serial.print(reactionTime);
    Serial.println(" ms");

    if (reactionTime < 250) {
        Serial.println("⚡ Lightning fast!");
    } else if (reactionTime < 500) {
        Serial.println("👍 Nice reflexes!");
    } else {
        Serial.println("🐢 Keep practicing!");
    }

    delay(2000);  // Pause before next round
}
```

---

## 🤖 Ask Sensai

- *"What is a pull-up resistor and why do buttons need one?"*
- *"My button LED sketch isn't working — the LED stays on all the time. Here is my code: ..."*
- *"Use the arduino tool to upload the reaction timer sketch."*

---

## 🧪 Exercises

1. **Two-button controller** — Add a second button. One turns the LED on, the other turns it off.
2. **Press counter** — Count how many times the button is pressed and print the count to Serial.
3. **Speed challenge** — Modify the reaction timer to run 5 rounds and show the average time at the end.

---

## ✅ Module 3 Checkpoint

Before moving on, verify:

- [ ] You can use `digitalRead()` to detect a button press
- [ ] You understand `INPUT_PULLUP` and why LOW means "pressed"
- [ ] You created a toggle using a state variable (`bool ledOn`)
- [ ] You understand `if/else` for making decisions in code
- [ ] You ran the reaction timer and saw your time in the Serial Monitor

---

**⬅️ Previous: [Module 2 — Your First Circuit](../02-your-first-circuit/)** | **➡️ Next: [Module 4 — Reading the World](../04-reading-the-world/)**
