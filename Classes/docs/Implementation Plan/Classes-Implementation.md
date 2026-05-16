To implement your Open Classroom project, you will use a combination of GitHub Template Repositories, GitHub Classroom, and GitHub Actions. [1, 2] 
## 1. The "Template" Foundation
You will create a repository (e.g., curriculum-template) and mark it as a Template Repository in Settings > General. [3] 
## Automatic GitHub Pages Deployment
To ensure the course website launches immediately when a student creates their repo, add this workflow file to .github/workflows/deploy-pages.yml in your template:

name: Deploy Course Websiteon:
  push:
    branches: [main]
  workflow_dispatch: # Allows manual triggerpermissions:
  contents: read
  pages: write
  id-token: writejobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Pages
        uses: actions/configure-pages@v4
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './curriculum-master' # Point to your folder
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4

## 2. Autograding & GitHub Classroom Integration
Linking your template to GitHub Classroom automates the student setup process.

* Setup: In [GitHub Classroom](https://classroom.github.com/), create a new assignment and select your curriculum-template as the starter code.
* Autograder: Use the "Grading and feedback" tab in Classroom to add tests. This automatically generates a .github/workflows/classroom.yml file in every student's repository.
* Action Logic: The tests run on every push, providing students with immediate feedback (green check or red X) directly in their repository. [4, 5, 6, 7] 

## 3. CI/CD & Peer Review Workflow
To enforce the community aspect of your classroom, use Branch Protection Rules and automated status checks.

* Branch Protection: In the template's settings, require "status checks to pass before merging" (the autograder) and "a pull request before merging" with a set number of required reviewers.
* Peer Review Trigger: Add a workflow to notify or assign students to review each other's PRs: [8] 

name: Peer Review Assignmenton:
  pull_request:
    types: [opened]jobs:
  assign-reviewers:
    runs-on: ubuntu-latest
    steps:
      - name: Request Peer Review
        uses: andrewmusgrave/automatic-pull-request-review@0.0.5
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          event: COMMENT
          body: "Great work! Please ensure two peers have reviewed this before merging."

## Proposed README "One-Click" Section
Paste this into your template's README.md to provide the one-click experience for teachers and students:
------------------------------
## 🚀 Launch Your Open Classroom
Follow these three steps to get your personalized learning workspace running:

   1. Deploy Your Workspace: Click the Use this Template button at the top of this page to create your private classroom repository.
   2. Activate Your Website: Your course site will automatically deploy to [GitHub Pages](https://pages.github.com/). Find the link under the "About" section on the right side of your new repository or go to Settings > Pages.
   3. Start Your Journey:
   * Guided: Open module-01-basics and follow the README.md.
      * Explorer: Claim a project by opening an Issue using the "Learning Contract" template.
      * Expert: Submit a Pull Request to propose changes to the master curriculum. [1, 9, 10] 
   
Note to Teachers: Link this template to your GitHub Classroom assignment to enable centralized autograding and progress tracking.

------------------------------

[1] [https://www.youtube.com](https://www.youtube.com/watch?v=ypSkowU9KRw&t=25)
[2] [https://www.youtube.com](https://www.youtube.com/watch?v=cFNbcV5TOfI&t=1)
[3] [https://mgimond.github.io](https://mgimond.github.io/Colby-summer-git-workshop-2021/github_classroom.html)
[4] [https://docs.github.com](https://docs.github.com/en/education/manage-coursework-with-github-classroom/teach-with-github-classroom/create-an-assignment-from-a-template-repository)
[5] [https://docs.github.com](https://docs.github.com/en/education/manage-coursework-with-github-classroom/teach-with-github-classroom/use-autograding)
[6] [https://docs.github.com](https://docs.github.com/en/education/manage-coursework-with-github-classroom/learn-with-github-classroom/view-autograding-results)
[7] [https://www.youtube.com](https://www.youtube.com/watch?v=uHwYuZvys6k&t=1)
[8] [https://docs.github.com](https://docs.github.com/en/organizations/organizing-members-into-teams/managing-code-review-settings-for-your-team)
[9] [https://www.youtube.com](https://www.youtube.com/shorts/Kq28yBigDYw)
[10] [https://collectionbuilder.github.io](https://collectionbuilder.github.io/cb-docs/docs/deploy/gh-pages/)
[11] [https://github.com](https://github.com/classroom-resources/autograding-example-grader-js#:~:text=name:%20Autograding%20Tests%20on:%20push%20jobs:%20run%2Dtests:,max%2Dscore:%20%27100%27%20setup%2Dcommand:%20%27pip%20install%20%2Dr%20requirements.)



Follow these final deployment steps to move from a template to a live, functioning classroom.
## 1. Set Up the GitHub Infrastructure
Before students can join, you need a central administrative hub.

* Create a GitHub Organization: Go to your Organization Settings and create a Free organization (e.g., open-classroom-2024). This acts as the container for all student repositories.
* Configure the Template: Move your curriculum-master repository into this organization. Navigate to Settings > General in the repository and check Template repository.
* Grant Access: Sign into [GitHub Classroom](https://classroom.github.com/) and authorize it to access your new organization. [1, 2, 3, 4, 5] 

## 2. Create and Link the Assignment
This step connects your curriculum files to the automated grading system.

* New Classroom: In GitHub Classroom, click New classroom and select your organization.
* Individual Assignment: Click New assignment. Set a title (e.g., Module-01-Basics).
* Connect Starter Code: Search for and select your Template Repository as the starter code.
* Enable Autograding: Under the "Grading and feedback" section, ensure GitHub Actions are enabled. Since you already added .github/workflows/classroom.yml to your template, it will run automatically for every student. [3, 6, 7, 8, 9, 10, 11] 

## 3. Student Onboarding (The "One-Click" Launch)
Distribute the workspace to your students using a single invitation.

* Generate Invitation URL: GitHub Classroom will provide a unique Invitation Link after you create the assignment.
* Student Experience: When students click this link, they:
1. Authorize their GitHub account.
   2. Accept the assignment, which triggers GitHub to automatically create a private repository for them in your organization.
   3. Deploy: The pre-configured GitHub Action in your template will immediately launch their GitHub Pages site [Previous Turns]. [10, 12, 13, 14, 15] 

## 4. Community Management & Evaluation
Maintain the "Open" nature of the classroom through active monitoring.

* Track Progress: Use the [Assignment Overview page](https://docs.github.com/en/education/manage-coursework-with-github-classroom/teach-with-github-classroom/manage-classrooms) to see real-time status on who has accepted the assignment and who is passing the autograder.
* Facilitate Peer Review: Instruct students to find peers in the organization's Repositories list to leave comments on their Pull Requests.
* Final Grading: Download the final grades directly from the GitHub Classroom dashboard as a CSV once the deadline passes. [9, 10, 12, 16, 17] 

Would you like a sample [Issue Template](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository) specifically for the "Learning Contract" to finalize the curriculum structure?

[1] [https://docs.github.com](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository)
[2] [https://docs.github.com](https://docs.github.com/en/education/quickstart)
[3] [https://faculty-web.msoe.edu](https://faculty-web.msoe.edu/hasker/resources/github-classroom.html)
[4] [https://www.youtube.com](https://www.youtube.com/watch?v=xVVeqIDgCvM&t=12)
[5] [https://dev.to](https://dev.to/gitprotect/how-to-use-github-repository-templates-3dfk)
[6] [https://docs.github.com](https://docs.github.com/en/education/manage-coursework-with-github-classroom/teach-with-github-classroom/manage-classrooms)
[7] [https://github.com](https://github.com/jfiksel/github-classroom-for-teachers)
[8] [https://github.com](https://github.com/UNO-IST-Support/GitHubClassroom_for_UNOTeachers)
[9] [https://docs.github.com](https://docs.github.com/en/education/manage-coursework-with-github-classroom/teach-with-github-classroom)
[10] [https://www.youtube.com](https://www.youtube.com/watch?v=s5tsM7GNOqc&t=1)
[11] [https://docs.github.com](https://docs.github.com/en/education/quickstart)
[12] [https://github.com](https://github.com/UNO-IST-Support/GitHubClassroom_for_UNOTeachers)
[13] [https://docs.github.com](https://docs.github.com/en/education/manage-coursework-with-github-classroom/teach-with-github-classroom/use-the-git-and-github-starter-assignment)
[14] [https://www.youtube.com](https://www.youtube.com/watch?v=lyJq-ise18o&t=195)
[15] [https://www.youtube.com](https://www.youtube.com/watch?v=ypSkowU9KRw&t=25)
[16] [https://www.youtube.com](https://www.youtube.com/watch?v=zcGE4WaiRUE)
[17] [https://www.youtube.com](https://www.youtube.com/watch?v=n143fwArh_8&t=5)




To finalize the Open Classroom workflow, you need an Issue Template. This turns the "Learning Contract" from a vague idea into a structured GitHub Issue that a teacher can approve with a comment.
## 1. Create the Issue Template
Create a file in your repository at .github/ISSUE_TEMPLATE/learning_contract.md. GitHub will automatically detect this and offer it as an option when a student clicks "New Issue."

---name: "📜 Learning Contract"
about: Define your path for this module (Guided, Explorer, or Expert).
title: "[Contract] - Your Name"
labels: contract-pending
assignees: []
---
## 👤 Student Information- **Name:**- **GitHub Username:**
## 🛤️ Chosen Path*Select one by placing an 'x' in the brackets:*
- [ ] **Path A (Guided):** I will follow the step-by-step starter code.
- [ ] **Path B (Explorer):** I will build an original project using the core concepts.
- [ ] **Path C (Expert):** I will submit a PR to improve the curriculum itself.
## 🎯 Learning GoalsWhat are the 3 main things you want to master in this module?1. 2. 3. 
## 🤝 Peer Review Commitment- [ ] I agree to review at least 2 peer Pull Requests before completing this module.
---**Teacher Note:** *Add a comment with "Approved" and change the label to `contract-approved` to green-light this project.*

## 2. Automated "Project Board" (Optional but Recommended)
To keep the classroom organized, go to your Organization Settings > Projects and create a "Classroom Board."

* Configure it to automatically add issues with the label contract-pending to a "To Do" column.
* Once you comment "Approved," move it to "In Progress." This gives students a visual sense of the "Physical Classroom" environment.

## 3. Final Checklist for Your "Open Classroom" Launch

| Component | File/Action | Purpose |
|---|---|---|
| Website | .github/workflows/deploy-pages.yml | Instant course site for every student. |
| Autograder | .github/workflows/classroom.yml | 24/7 technical feedback. |
| Contract | .github/ISSUE_TEMPLATE/learning_contract.md | Student autonomy and goal setting. |
| Collaboration | community-guidelines.md | Setting the tone for peer reviews. |
| Teacher Hub | GitHub Classroom Dashboard[](https://classroom.github.com/) | Centralized gradebook and repo management. |

