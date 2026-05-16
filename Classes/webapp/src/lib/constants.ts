export const APP_NAME = "Sensai Classes";
export const APP_DESCRIPTION = "Open Classroom Framework — Arduino & IoT learning platform powered by Sensai";

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
  "module-01-welcome": {
    learningContract: 25,
    sketchMastery: 50,
    communityContribution: 25,
  },
  "module-02-circuits": {
    learningContract: 25,
    sketchMastery: 50,
    communityContribution: 25,
  },
  "module-03-logic": {
    learningContract: 25,
    sketchMastery: 50,
    communityContribution: 25,
  },
} as const;

export const LEARNING_PATHS = [
  {
    id: "A",
    name: "Guided",
    description: "Follow step-by-step Arduino sketches and wiring guides",
    audience: "New learners",
  },
  {
    id: "B",
    name: "Explorer",
    description: "Build an original Arduino/IoT project using core concepts",
    audience: "Self-directed learners",
  },
  {
    id: "C",
    name: "Expert",
    description: "Submit PRs to improve the curriculum and AI prompts",
    audience: "Advanced learners",
  },
] as const;

export const MODULE_META: Record<string, { title: string; maxScore: number }> = {
  "module-01-welcome": { title: "Welcome to Arduino", maxScore: 100 },
  "module-02-circuits": { title: "Your First Circuit", maxScore: 100 },
  "module-03-logic": { title: "Variables & Logic", maxScore: 100 },
  "module-04-analog": { title: "Reading the World", maxScore: 100 },
  "module-05-sensors": { title: "Sensing the Environment", maxScore: 100 },
  "module-06-serial": { title: "Talking to the Computer", maxScore: 100 },
  "module-07-actuators": { title: "Making Things Move", maxScore: 100 },
  "module-08-i2c": { title: "Advanced Communication", maxScore: 100 },
  "module-09-iot": { title: "IoT Projects", maxScore: 100 },
  "module-10-capstone": { title: "Demo Day", maxScore: 100 },
};
