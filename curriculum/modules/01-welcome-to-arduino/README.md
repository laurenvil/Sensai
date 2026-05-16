# Module 1: Welcome to Arduino 🤖

> **Goal:** Understand what a microcontroller is, explore the Uno Q board anatomy, and run your very first Arduino sketch.

---

## 🔌 The Real-World Connection

Every "smart" device you interact with — from a microwave oven to a traffic light to a fitness tracker — has a **microcontroller** inside. A microcontroller is a tiny computer on a single chip. It doesn't browse the web or play games — it does one job: read inputs (buttons, sensors) and control outputs (lights, motors, displays).

Arduino makes microcontrollers **accessible**. Instead of needing an electrical engineering degree, you can build interactive electronics projects with a board, some wires, and a few lines of code.

> [!NOTE]
> Your Arduino Uno Q is special — it has **two processors**: one that runs your Arduino sketches (the MCU) and one that runs Linux and Sensai (the MPU). More on that below.

---

## Key Concepts

### What Is a Microcontroller?

Think of a microcontroller as a **tiny brain** for a device. It has:
- **Inputs** — Ways to sense the world (buttons, sensors, knobs)
- **Outputs** — Ways to act in the world (LEDs, motors, buzzers)
- **A program** — Instructions you write that tell it what to do

A smartphone has a powerful processor that runs thousands of apps. A microcontroller runs **one program** — yours.

### The Uno Q — A Board with Two Brains

| Processor | Name | What It Does |
|-----------|------|-------------|
| **MCU** (Microcontroller) | STM32U585 | Runs your Arduino sketches — controls pins, reads sensors, drives motors |
| **MPU** (Main Processor) | Qualcomm QRB2210 | Runs Linux, Sensai, Python scripts — the "smart" brain |

The MCU is where your code runs. The MPU is where Sensai lives. They communicate through a **Bridge** — like two people passing notes.

### The Arduino IDE

The **Arduino IDE** (Integrated Development Environment) is the software you use to write code and upload it to the board. Every Arduino program is called a **sketch**.

Every sketch has exactly two required functions:

```cpp
void setup() {
    // Runs ONCE when the board powers on
    // Use this for one-time setup (like configuring pins)
}

void loop() {
    // Runs OVER AND OVER forever
    // This is where your main logic goes
}
```

Think of `setup()` as "getting ready for school" and `loop()` as "the school day that repeats every day."

---

## Step 1: Open the Arduino IDE

If you're using the Arduino IDE on a computer:
1. Download [Arduino IDE 2.x](https://www.arduino.cc/en/software)
2. Install it and open it
3. Connect your Uno Q via USB-C

If you're using **Sensai on the Uno Q**, you don't need the IDE — Sensai compiles and uploads code for you!

---

## Step 2: Select Your Board

In the Arduino IDE:
1. Go to **Tools → Board → Arduino Zephyr Boards**
2. Select **Arduino Uno Q**
3. Go to **Tools → Port** and select the port that shows your board

> [!TIP]
> Not sure which port? Ask Sensai: *"Use the arduino tool to detect connected boards."*

---

## Step 3: Your First Sketch — Hello, Serial!

This sketch sends a message from the Arduino to your computer. It's the Arduino equivalent of "Hello, World!"

```cpp
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
```

### Upload and Run

**Using the Arduino IDE:**
1. Copy the code above into a new sketch
2. Click the **Upload** button (→ arrow)
3. Open **Tools → Serial Monitor** (set baud rate to 9600)
4. You should see the greeting message!

**Using Sensai:**
> 🤖 **Ask Sensai:** *"Use the arduino tool to upload a sketch that prints 'Hello from Sensai!' to the serial monitor."*

---

## Step 4: Explore Your Board

Look at your Uno Q board and identify these parts:

| Part | Location | Purpose |
|------|----------|---------|
| **USB-C port** | Top edge | Power + data connection |
| **Digital pins (D0–D13)** | Right header | Digital input/output, some with PWM (~) |
| **Analog pins (A0–A5)** | Left header | Read analog voltages (0–3.3V) |
| **Power pins** | Left header | 3.3V, 5V, GND |
| **Built-in LED** | Near pin 13 | Connected to D13 — you'll blink this next! |
| **Qwiic connector** | Small white port | Plug-and-play I2C sensors |
| **Reset button** | Near USB port | Restarts your sketch |

> [!WARNING]
> **Uno Q voltage:** All pins operate at **3.3V**, not 5V like the classic Uno. Never connect 5V signals to the analog pins — it can damage the board.

---

## 🤖 Ask Sensai

Try these prompts to explore:

- *"What is the difference between the MPU and MCU on the Uno Q?"*
- *"What pins can I use for PWM on the Uno Q?"*
- *"Use the arduino tool to upload a sketch that prints my name to the serial monitor."*

---

## 🧪 Exercises

1. **Personalize it** — Modify the sketch to print your name and today's date
2. **Add a counter** — Move a `Serial.println()` into `loop()` and add a counter that increments each time. What happens?
3. **Speed test** — Change `9600` to `115200` in both the sketch and the Serial Monitor. Is it faster?

---

## ✅ Module 1 Checkpoint

Before moving on, verify:

- [ ] You understand that an Arduino is a microcontroller — a tiny computer for one job
- [ ] You know the Uno Q has two processors (MCU for sketches, MPU for Sensai)
- [ ] You can identify the key parts of the board (USB, digital pins, analog pins, power)
- [ ] You ran `hello_serial.ino` and saw output in the Serial Monitor
- [ ] You understand that every sketch needs `setup()` and `loop()`

---

**➡️ Next: [Module 2 — Your First Circuit](../02-your-first-circuit/)**
