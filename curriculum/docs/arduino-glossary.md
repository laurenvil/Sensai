# Arduino Glossary 📖

A student-friendly glossary of all technical terms used in the Sensai Arduino Lab curriculum.

---

## A

**ADC (Analog-to-Digital Converter)** — A chip inside the Arduino that converts a smooth, continuous voltage (like 1.7V) into a number the computer can understand (like 528). On the Uno Q, the ADC maps 0–3.3V to 0–1023.

**`analogRead()`** — An Arduino function that reads the voltage on an analog pin and returns a number from 0 (0V) to 1023 (3.3V on Uno Q, 5V on classic Uno).

**`analogWrite()`** — An Arduino function that outputs a PWM signal on certain pins (~D3, ~D5, ~D6, ~D9, ~D10, ~D11). The value ranges from 0 (always off) to 255 (always on).

**Arduino** — An open-source platform for building electronics projects. It includes both the physical boards and the software (IDE) used to program them.

**Arduino CLI** — A command-line tool for compiling and uploading Arduino sketches without the graphical IDE. Sensai uses this behind the scenes.

**Arduino IDE** — The graphical software used to write, compile, and upload Arduino code. Version 2.x is the current version.

## B

**Baud Rate** — The speed of serial communication, measured in bits per second. The default for Arduino is 9600 baud.

**Breadboard** — A plastic board with holes connected in rows, used to build temporary circuits without soldering. The center channel divides the board into two independent halves.

**Bridge API** — On the Uno Q, a communication link between the Linux processor (MPU) and the Arduino processor (MCU). Allows Python code to talk to Arduino sketches.

## C

**Circuit** — A complete loop that electricity can flow through. Every circuit needs a power source, a path (wire), and a load (like an LED).

**Compile** — To translate human-readable code (C++) into machine code that the processor can execute. Think of it as translating English into the processor's native language.

**`const`** — A C++ keyword that means "this value will never change." Used for pin numbers: `const int LED_PIN = 13;`

## D

**`delay()`** — An Arduino function that pauses the program for a specified number of milliseconds. `delay(1000)` pauses for 1 second. Warning: nothing else can happen during a `delay()`.

**DHT11 / DHT22** — Common temperature and humidity sensors. The DHT22 is more accurate but more expensive.

**Digital** — A signal that is either ON (HIGH, 3.3V) or OFF (LOW, 0V). Like a light switch — no in-between.

**`digitalRead()`** — Reads whether a pin is HIGH or LOW. Returns `HIGH` (1) or `LOW` (0).

**`digitalWrite()`** — Sets a pin to HIGH (3.3V) or LOW (0V).

## F

**FQBN (Fully Qualified Board Name)** — The identifier Arduino CLI uses for your board. For the Uno Q: `arduino:zephyr:unoq`.

## G

**GND (Ground)** — The 0V reference point in a circuit. Every circuit needs a ground connection.

**GPIO (General Purpose Input/Output)** — Pins on a microcontroller that can be configured as either input or output.

## H

**HIGH** — The "on" state of a digital pin. On the Uno Q, HIGH = 3.3V.

## I

**I2C (Inter-Integrated Circuit)** — A communication protocol that uses just 2 wires (SDA for data, SCL for clock) to connect multiple devices. Pronounced "I-squared-C" or "I-two-C."

**`.ino`** — The file extension for Arduino sketch files. Short for "Arduino."

## L

**LED (Light-Emitting Diode)** — A small light that only allows current to flow in one direction. The longer leg is positive (anode), the shorter leg is negative (cathode).

**Library** — Pre-written code that adds functionality. For example, `Servo.h` adds servo motor control. Install libraries through the Library Manager.

**`loop()`** — The second required function in every Arduino sketch. Code inside `loop()` runs over and over forever, like a song on repeat.

**LOW** — The "off" state of a digital pin. LOW = 0V.

## M

**`map()`** — A function that rescales a number from one range to another. Example: `map(sensorValue, 0, 1023, 0, 255)` converts ADC readings to PWM range.

**MCU (Microcontroller Unit)** — A small computer on a single chip. On the Uno Q, this is the STM32U585 that runs your Arduino sketches.

**`millis()`** — Returns the number of milliseconds since the Arduino started running. Used for non-blocking timing (instead of `delay()`).

**MPU (Main Processing Unit)** — On the Uno Q, this is the Qualcomm QRB2210 that runs Linux and Sensai.

## O

**OLED (Organic Light-Emitting Diode)** — A type of small display. The SSD1306 is a common 0.96" OLED used in Arduino projects, connected via I2C.

**Ohm's Law** — V = I × R. Voltage equals current times resistance. Used to calculate the right resistor for an LED.

## P

**`pinMode()`** — Configures a pin as INPUT or OUTPUT. Must be called in `setup()` before using the pin.

**Potentiometer** — A variable resistor with a knob. Turning the knob changes the resistance, which changes the voltage read by `analogRead()`.

**Pull-up Resistor** — A resistor connected between a pin and 3.3V (or 5V) that keeps the pin HIGH when nothing else is connected. Prevents "floating" inputs. Arduino has built-in ones: `pinMode(pin, INPUT_PULLUP)`.

**PWM (Pulse Width Modulation)** — A technique that simulates analog output by rapidly switching a pin on and off. The "duty cycle" (% of time on) controls the perceived brightness or speed.

## Q

**Qwiic** — A plug-and-play I2C connector system by SparkFun. The Uno Q has a Qwiic port on the I2C4 bus.

## R

**Resistor** — A component that limits the flow of electric current. Measured in ohms (Ω). A 220Ω resistor is commonly used with LEDs.

## S

**Sensai** — Your AI tutor! An on-device AI assistant running on the Uno Q that can explain concepts, write code, compile sketches, and upload them to the board.

**`Serial`** — Arduino's built-in communication channel to the computer. Use `Serial.begin(9600)` to start and `Serial.println()` to send messages.

**`setup()`** — The first required function in every Arduino sketch. Code inside `setup()` runs once when the board powers on.

**Sketch** — The Arduino name for a program. Every sketch has two functions: `setup()` and `loop()`.

**SPI (Serial Peripheral Interface)** — A fast communication protocol using 4 wires (MOSI, MISO, SCK, CS). Used for SD cards, fast displays, and some sensors.

## U

**Upload** — The process of sending compiled code from the computer (or Sensai) to the Arduino board.

## V

**`void`** — A C++ keyword meaning "this function doesn't return a value." Both `setup()` and `loop()` are `void` functions.

**Voltage** — The "pressure" that pushes electricity through a circuit. Measured in volts (V). The Uno Q uses 3.3V logic.
