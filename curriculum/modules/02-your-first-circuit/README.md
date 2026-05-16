# Module 2: Your First Circuit 💡

> **Goal:** Build a real circuit on a breadboard, wire an LED, and make it blink with code.

---

## 🔌 The Real-World Connection

Every traffic light, car dashboard, and phone notification LED works the same way: a microcontroller sends an electrical signal to turn a light on or off. The blink sketch is the "Hello, World!" of electronics — if you can blink an LED, you can control anything.

---

## Key Concepts

### What Is a Circuit?

A **circuit** is a complete loop that electricity flows through. It needs three things:
1. **Power source** — the 3.3V pin on your Arduino
2. **Load** — something that uses the electricity (like an LED)
3. **Return path** — a wire back to GND (ground)

If the loop is broken at any point, no electricity flows. Think of it like a circular train track — if there's a gap, the train stops.

### LEDs and Resistors

An **LED** (Light-Emitting Diode) is a small light that only works in one direction:
- **Long leg (anode)** = positive (+)
- **Short leg (cathode)** = negative (−)

An LED without a **resistor** will burn out instantly! The resistor limits the current flowing through the LED. A **220Ω resistor** is standard for most LEDs.

### The Breadboard

A breadboard has rows of connected holes:
- **Each row** (on the sides) is connected horizontally
- **The center channel** separates two independent halves
- **Power rails** (+ and −) run along the edges

---

## Step 1: Wire the Blink Circuit

### Parts Needed
- 1× LED (any color)
- 1× 220Ω resistor
- 2× jumper wires

### Wiring

```
Arduino Pin 13 ──→ 220Ω Resistor ──→ LED (long leg) ──→ LED (short leg) ──→ GND
```

| Connection | From | To |
|------------|------|-----|
| Wire 1 | Arduino **D13** | Breadboard row A |
| Resistor | Row A | Row B |
| LED long leg (+) | Row B | Row C |
| LED short leg (−) | Row C | Breadboard ground rail |
| Wire 2 | Arduino **GND** | Breadboard ground rail |

> [!WARNING]
> **Check LED direction!** If the LED doesn't light up, try flipping it around. LEDs only work in one direction.

---

## Step 2: The Blink Sketch

```cpp
// blink.ino
// 💡 The classic Arduino sketch — makes an LED blink on and off.

// ── Pin Configuration ───────────────────────────────────
const int LED_PIN = 13;  // 💡 Use 'const int' to name your pins — never use magic numbers!

void setup() {
    // Tell the Arduino that pin 13 is an OUTPUT (we're sending power OUT)
    pinMode(LED_PIN, OUTPUT);
}

void loop() {
    digitalWrite(LED_PIN, HIGH);   // Turn the LED ON (3.3V on Uno Q)
    delay(500);                     // Wait 500 milliseconds (half a second)
    digitalWrite(LED_PIN, LOW);    // Turn the LED OFF (0V)
    delay(500);                     // Wait another 500 milliseconds
    // 💡 Then loop() starts over — the LED blinks forever!
}
```

### Upload and Test

**Using Sensai:**
> 🤖 **Ask Sensai:** *"Use the arduino tool to upload a blink sketch for pin 13 with 500 ms toggles."*

**Using Arduino IDE:**
1. Copy the code into a new sketch
2. Click Upload (→)
3. Watch the LED blink!

---

## Step 3: Traffic Light Challenge

Now let's use THREE LEDs to build a traffic light sequence:

```cpp
// traffic_light.ino
// 💡 A traffic light that cycles through green, yellow, and red.

// ── Pin Configuration ───────────────────────────────────
const int RED_PIN    = 4;   // Red LED on pin D4
const int YELLOW_PIN = 3;   // Yellow LED on pin D3
const int GREEN_PIN  = 2;   // Green LED on pin D2

void setup() {
    pinMode(RED_PIN, OUTPUT);
    pinMode(YELLOW_PIN, OUTPUT);
    pinMode(GREEN_PIN, OUTPUT);
}

void loop() {
    // Green light — GO!
    digitalWrite(GREEN_PIN, HIGH);
    delay(3000);  // Green for 3 seconds
    digitalWrite(GREEN_PIN, LOW);

    // Yellow light — SLOW DOWN!
    digitalWrite(YELLOW_PIN, HIGH);
    delay(1000);  // Yellow for 1 second
    digitalWrite(YELLOW_PIN, LOW);

    // Red light — STOP!
    digitalWrite(RED_PIN, HIGH);
    delay(3000);  // Red for 3 seconds
    digitalWrite(RED_PIN, LOW);

    // 💡 Then loop() repeats — the traffic light cycles forever!
}
```

### Wiring (3 LEDs)

| LED | Arduino Pin | Resistor | GND |
|-----|------------|----------|-----|
| Green | D2 | 220Ω | GND rail |
| Yellow | D3 | 220Ω | GND rail |
| Red | D4 | 220Ω | GND rail |

---

## 🤖 Ask Sensai

- *"Use the arduino tool to upload a blink sketch that blinks every 100 ms — what happens?"*
- *"What would happen if I forgot the resistor?"*
- *"Use the arduino tool to upload a traffic light sketch with 5-second green, 2-second yellow, 3-second red."*

---

## 🧪 Exercises

1. **Speed it up** — Change `delay(500)` to `delay(100)`. What do you see? What about `delay(50)`?
2. **SOS signal** — Make the LED blink the Morse code for SOS: 3 short, 3 long, 3 short

<details>
<summary>💡 Hint for SOS</summary>

```cpp
// Short blink
void shortBlink() {
    digitalWrite(LED_PIN, HIGH);
    delay(200);
    digitalWrite(LED_PIN, LOW);
    delay(200);
}

// Long blink
void longBlink() {
    digitalWrite(LED_PIN, HIGH);
    delay(600);
    digitalWrite(LED_PIN, LOW);
    delay(200);
}
```
</details>

3. **Pattern designer** — Create your own LED blinking pattern (e.g., heartbeat, countdown)

---

## ✅ Module 2 Checkpoint

Before moving on, verify:

- [ ] You built a working LED circuit on a breadboard
- [ ] You understand why a resistor is needed (to limit current)
- [ ] The blink sketch works — the LED turns on and off
- [ ] You know `pinMode()` sets a pin as INPUT or OUTPUT
- [ ] You know `digitalWrite()` sets a pin HIGH (on) or LOW (off)
- [ ] You know `delay()` pauses the program in milliseconds

---

**⬅️ Previous: [Module 1 — Welcome to Arduino](../01-welcome-to-arduino/)** | **➡️ Next: [Module 3 — Variables & Logic](../03-variables-and-logic/)**
