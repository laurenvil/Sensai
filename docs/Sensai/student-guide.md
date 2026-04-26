# Sensai Student Guide

Sensai is an AI coding assistant that lives on your Arduino Uno Q board. It knows everything about that board — every pin, every voltage, every common mistake. Ask it a question and it will explain what is happening, show you working code, and then challenge you to try something on your own.

This guide shows you how to talk to Sensai and how to get the most out of it.

---

## How to Talk to Sensai

You have two ways to reach Sensai:

**Option 1 — Terminal (directly on the board)**

Once your teacher runs `make sensai`, the terminal shows a welcome banner and then a `You:` prompt. Type your question and press Enter. Sensai thinks for a few seconds, then prints its answer right below.

```
  ┌───────────────────────────────────────────┐
  │  🧘  S  E  N  S  A  I                    │
  │      Arduino AI Assistant                  │
  │                                            │
  │  Type your question at 'You:' and press    │
  │  Enter. Sensai responds in a few seconds.  │
  │  Type 'exit' or Ctrl+C to quit.           │
  └───────────────────────────────────────────┘

Sensai is ready — type your question below (type 'exit' to quit)

You: how do I blink an LED on D9?

Sensai: Here is a complete sketch...

You:
```

Each time you type a question and press Enter, Sensai responds. The conversation continues until you type `exit` or press `Ctrl+C`.

**Option 2 — Telegram (from your phone or laptop)**
If your teacher has set up Telegram, message the class bot from your phone or laptop. You will see "Asking Sensai..." appear immediately, then the answer arrives in a few seconds.

Both options work the same way. Sensai does not know or care which one you use.

---

## What to Ask

Sensai is best when you ask specific questions about what you are building. Here are real examples:

**Getting code written**
> "Write a sketch that blinks pin D9 every 300 milliseconds"

> "Make the LED on D6 slowly brighten and dim in a loop"

> "Read a button on D2 and turn on a light on D5 when I press it"

**Understanding why something works**
> "Why does delay() stop my button from working?"

> "What is the difference between analogRead and digitalRead?"

> "Why do I need pinMode before I can use a pin?"

**Fixing errors**
Just paste the error message from Arduino and ask:
> "I got this error: 'was not declared in this scope' — what does that mean?"

> "My servo keeps jumping around — here is my code: [paste your code]"

**Checking your wiring and voltages**
> "Can I connect a 5V sensor to pin A0?"

> "Which pins can I use for PWM on the Uno Q?"

> "I have a Qwiic sensor — which connector do I plug it into?"

---

## What Sensai Will Do

For every piece of code Sensai gives you, it will:

1. **Show you the complete, working sketch** — not a fragment, the whole thing
2. **Explain the key idea in plain English** — what the code is doing and why
3. **Ask you a "what if" question** — something to try on your own

The "what if" question is not homework. It is an invitation. *"What do you predict happens if you change 500 to 100?"* Try it and find out. That moment of prediction followed by observation is where real learning happens.

---

## When You Are Stuck

Sensai will not make you feel bad for not knowing something. When you show it broken code, it will:
- Name what you got **right** first
- Explain what caused the problem in plain language
- Show you the fix

If you are frustrated and just need the answer, say so:
> "I give up, just show me the working code"

Sensai will give it to you. Then it will explain why it works, because understanding the fix is more useful than just having it.

---

## How Sensai Talks

Sensai uses analogies to make abstract ideas concrete. A few you will hear:

- **`delay()`** is like putting the board to sleep — it cannot hear buttons or read sensors while it is sleeping
- **`millis()`** is like a stopwatch that is always running — you check it without stopping anything else
- **A PWM signal** is like rapidly flickering a light on and off — your eye averages it out and sees it as dimmer
- **I2C** is like a shared phone line — multiple devices take turns talking by using their own address

If an explanation does not make sense, ask again in different words. Sensai adjusts.

---

## The Uno Q Is Different From a Classic Arduino

Your board has two processors inside. This matters when you read online tutorials.

| | Classic Arduino Uno | Your Arduino Uno Q |
|---|---|---|
| Analog pins (A0–A5) | 5 V max | **3.3 V max** — do not exceed this |
| Where sketches run | ATmega328P chip | STM32U585 chip (different names, same idea) |
| Linux side | None | Yes — Sensai runs here |
| ADC range | 0–5 V → 0–1023 | **0–3.3 V → 0–1023** |

**The most important difference: never connect a 5 V signal to A0–A5.** Classic Arduino tutorials often show 5 V sensors on analog pins. On the Uno Q this can permanently damage the chip. Ask Sensai before connecting any sensor if you are not sure.

---

## Useful Things to Ask About Your Board

**Finding the right pin**
> "Which pin do I use for PWM if I want to control motor speed?"
> "I need two I2C devices — can they share the same pins?"

**Checking before you connect**
> "I have a DHT11 temperature sensor — is it safe to connect directly to the Uno Q?"
> "Can I power a servo from the 5V pin on the header?"

**Understanding what went wrong**
> "My analogRead always returns 1023 no matter what — why?"
> "Serial.println is not printing anything — what did I miss?"

---

## Tips for Good Questions

The more specific your question, the better Sensai's answer.

| Instead of... | Try... |
|---|---|
| "My code does not work" | "My LED is not turning on — here is my sketch: [paste it]" |
| "How do I use I2C?" | "I have an SSD1306 OLED on the Qwiic port — how do I display text?" |
| "It is giving an error" | "I get 'redefinition of void setup()' — what does that mean?" |

Paste your actual code and actual error messages. Sensai diagnoses what you give it.

---

## What Sensai Cannot Do

- **It cannot upload code to your board.** It generates the sketch; you paste it into Arduino IDE and upload yourself.
- **It cannot see your wiring.** Describe what you have connected — pin numbers, sensor names — so it can help.
- **It cannot fix hardware problems.** If a wire is loose or a component is broken, it cannot know. Describe what you see (no light, strange reading, smoke) and it will guide you through checking.
- **Answers take time.** Sensai thinks on the board's processor, not a data center. Short answers arrive in about 5–10 seconds. Long answers with full sketches take up to 30–40 seconds. That is normal.

---

## Example Conversation

Here is what a real Sensai exchange looks like:

---

```
You: My button on D2 works but when I hold it, the LED on D5 flickers instead of staying on.
```

**Sensai:**

Your wiring and `digitalRead()` call are correct — the button is being read. The flickering is caused by **contact bounce**: when a physical button closes, the metal contacts briefly vibrate and send dozens of on/off signals before settling. The processor reads them all.

Here is a debounced version using `millis()` to ignore signals that arrive faster than 50 ms:

```cpp
const int BUTTON = 2;
const int LED = 5;
const unsigned long DEBOUNCE_MS = 50;

int lastState = HIGH;
unsigned long lastChange = 0;
bool ledOn = false;

void setup() {
  pinMode(BUTTON, INPUT_PULLUP);
  pinMode(LED, OUTPUT);
}

void loop() {
  int reading = digitalRead(BUTTON);
  if (reading != lastState && millis() - lastChange > DEBOUNCE_MS) {
    lastState = reading;
    lastChange = millis();
    if (reading == LOW) {
      ledOn = !ledOn;
      digitalWrite(LED, ledOn ? HIGH : LOW);
    }
  }
}
```

`INPUT_PULLUP` means the pin reads HIGH when the button is not pressed and LOW when it is — no external resistor needed.

*What do you predict happens if you change `DEBOUNCE_MS` to 5? Try it and see whether the flicker comes back.*

---

Notice what happened:
- Sensai named what you got right (wiring and `digitalRead`)
- Explained the root cause in plain language (contact bounce)
- Gave complete, working code
- Explained one key detail (`INPUT_PULLUP`)
- Ended with a challenge

---

## Quick Reference — Uno Q Pin Voltages

| Header | Voltage | Safe for |
|---|---|---|
| JDIGITAL (D0–D21) | 3.3 V logic | 3.3 V signals only |
| JANALOG (A0–A5) | **3.3 V max** | Sensors rated 3.3 V only |
| Qwiic connector | 3.3 V | All Qwiic/Stemma QT sensors |
| 5V power pin | 5 V output | Powering devices — not for signal input to MCU |

When in doubt, ask Sensai: *"Is it safe to connect [sensor name] directly to the Uno Q?"*

---

## Getting Started Right Now

Connect to Sensai and try one of these:

1. **"Blink pin D9 every half second"** — your first sketch
2. **"Read A0 and print the value to Serial every second"** — learn analog reading
3. **"What is the difference between delay() and millis()?"** — learn the most important concept in embedded programming
4. **"I connected an LED to D3 and nothing happens"** — practice debugging

Every question is a good question. Sensai has been waiting for it.
