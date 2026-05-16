To implement the autograding component of your Open Classroom, you will need two key files in your template repository: the Autograding Test Script (the logic that checks the work) and the GitHub Classroom Workflow (the automation that runs the script). [1, 2, 3] 
## 1. Autograding Test Script (Python Example)
Place this file in curriculum-master/module-01-basics/tests/test_basics.py. This script uses pytest to verify that a student has completed their "Learning Contract" and written a specific function. [4, 5, 6] 

# curriculum-master/module-01-basics/tests/test_basics.pyimport os
def test_learning_contract_exists():
    """Checks if the student created their learning contract file."""
    assert os.path.exists("learning-contract.md"), "You must create a learning-contract.md file!"
def test_hello_world_function():
    """Example test: checks if student implemented a 'hello' function."""
    try:
        from starter_code.app import hello
        assert hello() == "Hello, Open Classroom!", "The function should return 'Hello, Open Classroom!'"
    except ImportError:
        assert False, "Could not find app.py or the hello() function."

## 2. GitHub Classroom Workflow
Create this file at .github/workflows/classroom.yml. When you link your repository to [GitHub Classroom](https://classroom.github.com/), this file will automatically execute every time a student pushes code. [3, 7, 8] 

name: GitHub Classroom Workflowon: [push]permissions:
  checks: write
  actions: read
  contents: readjobs:
  build:
    name: Autograding
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install pytest      - name: Run Autograder
        # This uses the official GitHub Classroom action to report points
        uses: classroom-resources/autograding-python-grader@v1
        with:
          setup-command: 'pip install pytest'
          python-test-file: 'curriculum-master/module-01-basics/tests/test_basics.py'

## 3. Implementation Plan for README "One-Click" Section
In your template's README.md, use the following structure to guide teachers and students through the automated setup: [9, 10] 
------------------------------
## 🚀 Quick Start: Join the Classroom## For Students

   1. Claim Your Seat: Click the Use this Template button to generate your personal workspace.
   2. Verify Your Setup: Go to the Actions tab in your new repo. You should see the Deploy Course Website workflow running. Once finished, your site is live at https://<your-username>.github.io/<your-repo>/.
   3. Submit Work: Complete the tasks in module-01-basics. Every time you push code, the Autograder will run. Check the green checkmark next to your commit for feedback. [8, 10, 11] 

## For Teachers

   1. Create Assignment: Use the GitHub Classroom Dashboard to create a new assignment.
   2. Link Template: Select this repository as the starter code.
   3. Automatic Grading: The tests in tests/test_basics.py are pre-configured to sync with your Classroom gradebook. [12, 13] 

------------------------------


[1] [https://docs.github.com](https://docs.github.com/en/education/manage-coursework-with-github-classroom/teach-with-github-classroom/use-autograding)
[2] [https://www.highimpact-tec.org](https://www.highimpact-tec.org/wp-content/uploads/2023/08/2023-singletary-github-classroom.pdf)
[3] [https://www.reddit.com](https://www.reddit.com/r/CSEducation/comments/192vtfp/auto_grading_for_coding_assignments/)
[4] [https://github.com](https://github.com/classroom-resources/autograding-example-python#:~:text=GitHub%20%2D%20classroom%2Dresources/autograding%2Dexample%2Dpython:%20GitHub%20Classroom%20autograding%20example%20repo%20with%20Python%20and%20Pytest%20%C2%B7%20GitHub.)
[5] [https://www.codegrade.com](https://www.codegrade.com/blog/automatically-grading-students-python-assignments-using-pytest-unit-tests)
[6] [https://github.com](https://github.com/orgs/community/discussions/151323#:~:text=and.%20%2D%20name:%20Run%20Pytest%20id:%20pytest,&&%20pytest%20%2D%2Dtb=short%22%20timeout:%2010%20max%2Dscore:%2010.)
[7] [https://github.com](https://github.com/orgs/community/discussions/68249)
[8] [https://www.highimpact-tec.org](https://www.highimpact-tec.org/wp-content/uploads/2023/08/2023-singletary-github-classroom.pdf)
[9] [https://docs.github.com](https://docs.github.com/en/education/manage-coursework-with-github-classroom/teach-with-github-classroom/use-autograding)
[10] [https://www.youtube.com](https://www.youtube.com/watch?v=cFNbcV5TOfI&t=1)
[11] [https://docs.github.com](https://docs.github.com/en/education/manage-coursework-with-github-classroom/learn-with-github-classroom/view-autograding-results)
[12] [https://github.com](https://github.com/Py4Phy/classroom-generator)
[13] [https://github.com](https://github.com/classroom-resources/autograding-grading-reporter)
