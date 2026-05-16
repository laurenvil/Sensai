"""
Module 01 — Starter Code
========================
Your task: Implement the hello() function below.

Rules:
- The function must return EXACTLY the string: "Hello, Open Classroom!"
- Do not rename the function
- You may add additional functions for Path B/C projects

Run locally:
    python app.py

Run tests:
    pytest tests/test_basics.py -v
"""


def hello() -> str:
    """
    Return a greeting string.

    Returns:
        str: "Hello, Open Classroom!"

    TODO: Replace the pass statement with your implementation.
    """
    pass  # ← Delete this line and write your return statement


# ─────────────────────────────────────────────
# Path B / C: Add your own functions below
# ─────────────────────────────────────────────


if __name__ == "__main__":
    # Quick sanity check — run `python app.py` to test locally
    result = hello()
    print(f"hello() returned: {repr(result)}")
    if result == "Hello, Open Classroom!":
        print("✅ Looks good! Push your code and check the AutoGrader.")
    else:
        print("❌ Not quite — the function should return 'Hello, Open Classroom!'")
