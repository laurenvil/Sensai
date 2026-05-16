export const APP_NAME = "gitClasses";
export const APP_DESCRIPTION = "Open Classroom Framework — GitHub-native learning platform";

export const GITHUB_SCOPES = ["read:org", "repo", "workflow"];

export const WORKFLOW_FILES = {
  classroom: "classroom.yml",
  peerReview: "peer-review.yml",
  contractCurriculum: "contract-curriculum.yml",
  deployPages: "deploy-pages.yml",
} as const;

export const PROMPT_FILES = {
  explainTestFailure: ".github/prompts/explain-test-failure.prompt.yml",
  generateQuiz: ".github/prompts/generate-quiz.prompt.yml",
  generateContractCurriculum: ".github/prompts/generate-contract-curriculum.prompt.yml",
} as const;

export const GRADING_WEIGHTS = {
  "module-01-basics": {
    learningContract: 25,
    moduleMastery: 50,
    communityContribution: 25,
  },
  "module-02-branching": {
    add: 40,
    subtract: 40,
    branchExists: 20,
  },
} as const;

export const LEARNING_PATHS = [
  {
    id: "A",
    name: "Guided",
    description: "Follow step-by-step starter code",
    audience: "New learners",
  },
  {
    id: "B",
    name: "Explorer",
    description: "Build an original project using core concepts",
    audience: "Self-directed learners",
  },
  {
    id: "C",
    name: "Expert",
    description: "Submit PRs to improve the curriculum itself",
    audience: "Advanced learners",
  },
] as const;

export const MODULE_META: Record<string, { title: string; maxScore: number }> = {
  "module-01-basics": { title: "Git Basics", maxScore: 100 },
  "module-02-branching": { title: "Branching & Merging", maxScore: 100 },
  "module-03-cicd": { title: "CI/CD", maxScore: 100 },
  "module-04-opensource": { title: "Open Source", maxScore: 100 },
  "module-05-capstone": { title: "Capstone", maxScore: 100 },
};
