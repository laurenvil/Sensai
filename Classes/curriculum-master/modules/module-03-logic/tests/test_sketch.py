"""
AutoGrader tests for Module 03 — Variables & Logic
Validates button_led sketch structure.
"""
import os
import re
import pytest

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))


@pytest.mark.parametrize("points", [25])
def test_learning_contract_exists(points):
    contract_path = os.path.join(REPO_ROOT, "learning-contract.md")
    assert os.path.isfile(contract_path), "learning-contract.md not found in repo root."
    with open(contract_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert len(content.strip()) > 50, "learning-contract.md appears empty."


@pytest.mark.parametrize("points", [50])
def test_sketch_has_setup_and_loop(points):
    sketch_path = os.path.join(
        REPO_ROOT, "curriculum-master", "modules", "module-03-logic",
        "starter-code", "button_led.ino"
    )
    assert os.path.isfile(sketch_path), "button_led.ino not found in starter-code/."
    with open(sketch_path, "r", encoding="utf-8") as f:
        code = f.read()

    assert re.search(r"void\s+setup\s*\(", code), "Missing void setup()."
    assert re.search(r"void\s+loop\s*\(", code), "Missing void loop()."
    assert "digitalRead" in code, "Missing digitalRead() — read the button state in loop()."
    assert "if" in code, "Missing if statement — use if/else to decide when to turn the LED on."


@pytest.mark.parametrize("points", [25])
def test_community_contribution(points):
    community_dir = os.path.join(REPO_ROOT, "curriculum-master", "community-resources")
    if not os.path.isdir(community_dir):
        pytest.fail("community-resources/ directory not found.")
    md_files = [f for f in os.listdir(community_dir) if f.endswith(".md") and f.lower() != "readme.md"]
    assert len(md_files) > 0, "No .md files found in community-resources/."
