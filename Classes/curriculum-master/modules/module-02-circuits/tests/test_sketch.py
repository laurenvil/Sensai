"""
AutoGrader tests for Module 02 — Your First Circuit
Validates blink sketch structure.
"""
import os
import re
import pytest

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))


@pytest.mark.parametrize("points", [25])
def test_learning_contract_exists(points):
    """Check that learning-contract.md exists and has meaningful content."""
    contract_path = os.path.join(REPO_ROOT, "learning-contract.md")
    assert os.path.isfile(contract_path), "learning-contract.md not found in repo root."
    with open(contract_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert len(content.strip()) > 50, "learning-contract.md appears empty."


@pytest.mark.parametrize("points", [50])
def test_sketch_has_setup_and_loop(points):
    """Check that blink.ino contains setup(), loop(), and key Arduino calls."""
    sketch_path = os.path.join(
        REPO_ROOT, "curriculum-master", "modules", "module-02-circuits",
        "starter-code", "blink.ino"
    )
    assert os.path.isfile(sketch_path), "blink.ino not found in starter-code/."
    with open(sketch_path, "r", encoding="utf-8") as f:
        code = f.read()

    assert re.search(r"void\s+setup\s*\(", code), "Missing void setup()."
    assert re.search(r"void\s+loop\s*\(", code), "Missing void loop()."
    assert "pinMode" in code, "Missing pinMode() call — set your pin as OUTPUT in setup()."
    assert "digitalWrite" in code, "Missing digitalWrite() call — turn the LED on/off in loop()."


@pytest.mark.parametrize("points", [25])
def test_community_contribution(points):
    """Check that student added a resource to community-resources/."""
    community_dir = os.path.join(REPO_ROOT, "curriculum-master", "community-resources")
    if not os.path.isdir(community_dir):
        pytest.fail("community-resources/ directory not found.")
    md_files = [f for f in os.listdir(community_dir) if f.endswith(".md") and f.lower() != "readme.md"]
    assert len(md_files) > 0, "No .md files found in community-resources/."
