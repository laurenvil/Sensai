"""AutoGrader tests for Module 08 — Advanced Communication"""
import os, re, pytest
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))

@pytest.mark.parametrize("points", [25])
def test_learning_contract_exists(points):
    p = os.path.join(REPO_ROOT, "learning-contract.md")
    assert os.path.isfile(p), "learning-contract.md not found."
    with open(p, "r", encoding="utf-8") as f: assert len(f.read().strip()) > 50

@pytest.mark.parametrize("points", [50])
def test_sketch_structure(points):
    p = os.path.join(REPO_ROOT, "curriculum-master", "modules", "module-08-i2c", "starter-code", "i2c_scanner.ino")
    assert os.path.isfile(p), "i2c_scanner.ino not found."
    with open(p, "r", encoding="utf-8") as f: code = f.read()
    assert re.search(r"void\s+setup\s*\(", code), "Missing void setup()."
    assert re.search(r"void\s+loop\s*\(", code), "Missing void loop()."
    assert "Wire" in code, "Missing Wire.h — include the I2C library."

@pytest.mark.parametrize("points", [25])
def test_community_contribution(points):
    d = os.path.join(REPO_ROOT, "curriculum-master", "community-resources")
    if not os.path.isdir(d): pytest.fail("community-resources/ not found.")
    assert any(f.endswith(".md") and f.lower() != "readme.md" for f in os.listdir(d))
