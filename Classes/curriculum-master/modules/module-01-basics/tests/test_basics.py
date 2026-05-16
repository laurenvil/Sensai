"""
AutoGrader Test Suite — Module 01 Basics
=========================================
Weighted scoring:
  test_learning_contract_exists  → 25 points
  test_hello_world_function      → 50 points
  test_community_contribution    → 25 points
  TOTAL                          → 100 points

These tests run automatically via GitHub Actions on every push.
Students can also run them locally:

    cd <repo-root>
    pip install pytest
    pytest curriculum-master/modules/module-01-basics/tests/test_basics.py -v

"""
import os
import sys
import pytest

# ── Resolve repo root so imports work regardless of where pytest is called from ──
REPO_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "..")
)
sys.path.insert(0, os.path.join(REPO_ROOT, "curriculum-master", "modules", "module-01-basics", "starter-code"))


# ─────────────────────────────────────────────────────────────────────────────
# TEST 1 — Learning Contract (25 points)
# Students must create learning-contract.md in the repo root.
# This enforces the "student-centered" goal-setting from the Open Classroom model.
# ─────────────────────────────────────────────────────────────────────────────
@pytest.mark.parametrize("points", [25])
def test_learning_contract_exists(points):
    """
    Points: 25
    Checks that the student created their learning-contract.md in the repo root.
    """
    contract_path = os.path.join(REPO_ROOT, "learning-contract.md")
    assert os.path.exists(contract_path), (
        "❌ You must create a 'learning-contract.md' file in the root of your repository!\n"
        "   See module-01-basics/README.md for the template."
    )

    # Bonus check: the file shouldn't be empty
    with open(contract_path, "r", encoding="utf-8") as f:
        content = f.read().strip()

    assert len(content) > 50, (
        "❌ Your learning-contract.md looks empty or too short. "
        "Fill in your name, goals, and peer review pledge."
    )


# ─────────────────────────────────────────────────────────────────────────────
# TEST 2 — Core Module Mastery (50 points)
# Students must implement the hello() function correctly.
# ─────────────────────────────────────────────────────────────────────────────
@pytest.mark.parametrize("points", [50])
def test_hello_world_function(points):
    """
    Points: 50
    Tests that the student implemented the hello() function in starter-code/app.py.
    """
    try:
        from app import hello
    except ImportError:
        pytest.fail(
            "❌ Could not import 'hello' from app.py. "
            "Make sure starter-code/app.py exists and defines a hello() function."
        )

    result = hello()

    assert result is not None, (
        "❌ hello() returned None. Did you remember to add a 'return' statement?"
    )

    assert isinstance(result, str), (
        f"❌ hello() should return a string, but got: {type(result).__name__}"
    )

    assert result == "Hello, Open Classroom!", (
        f"❌ hello() returned '{result}' — expected 'Hello, Open Classroom!'\n"
        "   Check your spelling and capitalization carefully."
    )


# ─────────────────────────────────────────────────────────────────────────────
# TEST 3 — Community Contribution (25 points)
# Students must add at least one .md file to community-resources/.
# This enforces the collaborative philosophy of the Open Classroom model.
# ─────────────────────────────────────────────────────────────────────────────
@pytest.mark.parametrize("points", [25])
def test_community_contribution(points):
    """
    Points: 25
    Tests that the student contributed at least one resource to the shared
    community-resources/ folder.
    """
    resources_path = os.path.join(REPO_ROOT, "curriculum-master", "community-resources")

    assert os.path.exists(resources_path), (
        "❌ The 'curriculum-master/community-resources/' folder doesn't exist. "
        "Create it and add a .md file with a resource you found helpful."
    )

    md_files = [
        f for f in os.listdir(resources_path)
        if f.endswith(".md") and f.lower() != "readme.md"
    ]

    assert len(md_files) >= 1, (
        "❌ You haven't contributed a resource to the community yet!\n"
        "   Add a Markdown file to 'curriculum-master/community-resources/' "
        "with a link to something you found helpful (video, article, tool, etc.)."
    )
