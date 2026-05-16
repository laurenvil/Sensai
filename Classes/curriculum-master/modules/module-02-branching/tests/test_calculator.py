"""
AutoGrader Test Suite — Module 02 Branching
=============================================
Weighted scoring:
  test_add_function       → 40 points
  test_subtract_function  → 40 points
  test_branch_exists      → 20 points
  TOTAL                   → 100 points
"""
import os
import sys
import pytest

REPO_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "..")
)
sys.path.insert(0, os.path.join(REPO_ROOT, "curriculum-master", "modules", "module-02-branching", "starter-code"))


@pytest.mark.parametrize("points", [40])
def test_add_function(points):
    """Points: 40 | Tests the add() function."""
    try:
        from calculator import add
    except ImportError:
        pytest.fail("❌ Could not import 'add' from calculator.py.")

    assert add(2, 3) == 5,   "add(2, 3) should equal 5"
    assert add(0, 0) == 0,   "add(0, 0) should equal 0"
    assert add(-1, 1) == 0,  "add(-1, 1) should equal 0"
    assert add(1.5, 2.5) == 4.0, "add(1.5, 2.5) should equal 4.0"


@pytest.mark.parametrize("points", [40])
def test_subtract_function(points):
    """Points: 40 | Tests the subtract() function."""
    try:
        from calculator import subtract
    except ImportError:
        pytest.fail("❌ Could not import 'subtract' from calculator.py.")

    assert subtract(10, 4) == 6,   "subtract(10, 4) should equal 6"
    assert subtract(0, 0) == 0,    "subtract(0, 0) should equal 0"
    assert subtract(5, 10) == -5,  "subtract(5, 10) should equal -5"
    assert subtract(2.5, 1.0) == pytest.approx(1.5), "subtract(2.5, 1.0) should equal 1.5"


@pytest.mark.parametrize("points", [20])
def test_branch_exists(points):
    """
    Points: 20
    Checks that the student pushed from a feature branch, not directly from main.
    This is checked via the GITHUB_REF environment variable set by GitHub Actions.
    """
    ref = os.environ.get("GITHUB_REF", "refs/heads/main")
    branch = ref.replace("refs/heads/", "")

    # In local dev, skip this check gracefully
    if "GITHUB_ACTIONS" not in os.environ:
        pytest.skip("Branch check only runs in GitHub Actions — skipping locally.")

    assert branch != "main", (
        "❌ You pushed directly to 'main'!\n"
        "   For Module 02, you must work on a feature branch.\n"
        "   Run: git checkout -b feature/your-name\n"
        "   Then push your branch and open a Pull Request."
    )

    assert branch.startswith("feature/") or branch.startswith("fix/"), (
        f"❌ Your branch '{branch}' doesn't follow the naming convention.\n"
        "   Use: feature/<your-name> or fix/<description>"
    )
