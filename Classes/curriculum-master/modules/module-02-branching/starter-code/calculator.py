"""
Module 02 — Starter Code: Calculator
=====================================
Your task: Implement the add() and subtract() functions below.

Rules:
- Functions must handle integers and floats
- Do NOT use eval() or exec()
- add(a, b) must return a + b
- subtract(a, b) must return a - b

Run locally:
    python calculator.py

Run tests:
    pytest tests/test_calculator.py -v
"""


def add(a, b):
    """
    Return the sum of a and b.

    Args:
        a (int | float): First number
        b (int | float): Second number

    Returns:
        int | float: a + b

    TODO: Implement this function.
    """
    pass  # ← Replace with your implementation


def subtract(a, b):
    """
    Return the difference of a and b.

    Args:
        a (int | float): First number
        b (int | float): Second number

    Returns:
        int | float: a - b

    TODO: Implement this function.
    """
    pass  # ← Replace with your implementation


if __name__ == "__main__":
    print("Testing calculator...")
    print(f"add(2, 3)      → {add(2, 3)}   (expected: 5)")
    print(f"subtract(10, 4) → {subtract(10, 4)}   (expected: 6)")
