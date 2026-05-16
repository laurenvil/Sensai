To finalize your Open Classroom, we’ll implement automated peer review assignments and a weighted grading rubric. This ensures that "Expert" students are incentivized to help "Explorers," fulfilling the collaborative philosophy of the model.
## 1. Automated Peer Review (GitHub Action)
GitHub doesn't assign reviewers to individual repositories by default, but you can use a workflow to remind students and link them to the community guidelines.
Create .github/workflows/peer-review.yml:

name: Peer Review Assistanton:
  pull_request:
    types: [opened]
jobs:
  assign-review:
    runs-on: ubuntu-latest
    steps:
      - name: Peer Review Instructions
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: "### 👋 Peer Review Required\nCongratulations on opening a PR! To complete this module:\n1. Find two peers in the `/student-projects` directory.\n2. Review their code and leave constructive feedback.\n3. Ask them to review yours here.\n\n*Check the `/community-guidelines` for how to give great feedback!*"
            })

## 2. Weighted Grading Criteria
In an Open Classroom, you often grade on Mastery, Autonomy, and Collaboration. You can configure your Python test script to output a JSON string that GitHub Classroom reads to assign points.
Update your tests/test_basics.py to include a points system:

# tests/test_basics.pyimport pytest
def test_module_mastery():
    """Points: 50 | Tests the core technical competency."""
    from starter_code.app import hello
    assert hello() == "Hello, Open Classroom!"
def test_autonomy_contract():
    """Points: 25 | Tests if student defined their own learning path."""
    import os
    assert os.path.exists("learning-contract.md")
def test_community_contribution():
    """Points: 25 | Tests if student added a resource to the shared folder."""
    import os
    # Students are expected to add a markdown file to the shared resources
    files = os.listdir("curriculum-master/community-resources")
    assert len(files) > 1, "You haven't contributed a resource to the community yet!"

## 3. Final README "One-Click" Setup
Add this specific section to your README.md to explain how the grading and reviews work:
------------------------------
## 🎓 Mastery & Peer Review
In this classroom, your grade is determined by your Contributions, not just your code.

* Autograding (75%): Every time you push to main, our bots check your learning-contract.md and your code logic.
* Peer Review (25%): Your PR will not be "Merged" (Completed) until you have participated in the community.
* Task: Leave 2 comments on other students' Pull Requests.
   * Benefit: Reviewing others' code is the fastest way to become an "Expert."

## Click here to see the Leaderboard (Requires Teacher Invite)## Next Steps for Implementation

   1. Teacher Setup: Create a GitHub Organization for your classroom.
   2. Repo Setup: Push these files to your curriculum-master repo and toggle "Template Repository" in settings.
   3. Student Invite: Share the GitHub Classroom Invitation URL with your students.


