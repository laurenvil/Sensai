# 🤝 Community Guidelines — Arduino Classes

> *In this classroom, we are all teachers and we are all students.*

---

## The Code of Review

Peer review is about sharing perspectives and learning together — not finding bugs.

| ✅ Do | ❌ Don't |
|---|---|
| "This sketch could be simplified by..." | "You wrote this wrong." |
| "Consider using `millis()` instead of `delay()` because..." | "Just use millis()." |
| "I learned from your wiring approach — have you considered..." | "Mine is better." |
| "What would happen if the sensor reads 0 here?" | "This will break." |

---

## Collaboration vs. Plagiarism

| ✅ Collaboration | ❌ Plagiarism |
|---|---|
| Discussing circuit design and coding approach | Copying another student's sketch |
| Sharing a helpful Arduino tutorial | Submitting AI-generated code without understanding it |
| Helping a peer debug their wiring | Copying code without attribution |
| Using code snippets with a `// Source:` comment | Removing someone else's authorship |

**If you use a snippet from a peer, Sensai, or website:** Add a comment citing the source.

---

## Arduino-Specific Review Checklist

When reviewing a peer's PR, check:
- [ ] Does the sketch have `void setup()` and `void loop()`?
- [ ] Are pin numbers declared as named constants (not magic numbers)?
- [ ] Is the voltage safe? (Uno Q is 3.3V — no 5V signals on pins!)
- [ ] Does the code have comments explaining the logic?
- [ ] Is `Serial.begin(9600)` called in `setup()` if Serial is used?

---

## Communication Norms

- Treat Learning Contracts as living documents
- Respond to review requests within **48 hours**
- If you disagree, offer an alternative with reasoning
- Ask Sensai for help before asking a peer — but always ask a peer too!

---

## Escalation

If a peer's review feels unfair:
1. Reply calmly with your reasoning
2. If it persists, open a private issue tagged to your teacher
