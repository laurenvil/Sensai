"""
AutoGrader tests for Module 01 — Welcome to Arduino
Validates that the student's sketch has the required Arduino structure.
"""
import os
import re
import pytest

# Resolve the repo root regardless of where pytest is invoked
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))


@pytest.mark.parametrize("points", [25])
def test_learning_contract_exists(points):
    """Check that learning-contract.md exists and has meaningful content."""
    contract_path = os.path.join(REPO_ROOT, "learning-contract.md")
    assert os.path.isfile(contract_path), (
        "learning-contract.md not found in repo root. "
        "Create it using the template in the module README."
    )
    with open(contract_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert len(content.strip()) > 50, (
        "learning-contract.md exists but appears empty. "
        "Fill in your name, path, goals, and timeline."
    )


@pytest.mark.parametrize("points", [50])
def test_sketch_has_setup_and_loop(points):
    """Check that the Arduino sketch contains void setup() and void loop()."""
    sketch_path = os.path.join(
        REPO_ROOT, "curriculum-master", "modules", "module-01-welcome",
        "starter-code", "hello_serial.ino"
    )
    assert os.path.isfile(sketch_path), (
        f"Sketch not found at {sketch_path}. "
        "Make sure hello_serial.ino exists in starter-code/."
    )
    with open(sketch_path, "r", encoding="utf-8") as f:
        code = f.read()

    assert re.search(r"void\s+setup\s*\(", code), (
        "Your sketch is missing 'void setup()'. "
        "Every Arduino sketch needs a setup() function."
    )
    assert re.search(r"void\s+loop\s*\(", code), (
        "Your sketch is missing 'void loop()'. "
        "Every Arduino sketch needs a loop() function."
    )
    # Check that students actually wrote code (not just TODO comments)
    assert "Serial.begin" in code, (
        "Your sketch doesn't call Serial.begin(). "
        "Add Serial.begin(9600) inside setup() to start serial communication."
    )


@pytest.mark.parametrize("points", [25])
def test_community_contribution(points):
    """Check that student added a resource to community-resources/."""
    community_dir = os.path.join(REPO_ROOT, "curriculum-master", "community-resources")
    if not os.path.isdir(community_dir):
        pytest.fail("community-resources/ directory not found.")

    md_files = [
        f for f in os.listdir(community_dir)
        if f.endswith(".md") and f.lower() != "readme.md"
    ]
    assert len(md_files) > 0, (
        "No .md files found in community-resources/ (excluding README.md). "
        "Add a resource file to earn these points!"
    )
