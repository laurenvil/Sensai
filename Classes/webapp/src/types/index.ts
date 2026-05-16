export type UserRole = "teacher" | "student" | "admin";

export interface GitClassesUser {
  id: string;
  name: string;
  email: string;
  image: string;
  githubUsername: string;
  role: UserRole;
  orgSlug: string; // GitHub org = tenant
}

export interface Tenant {
  orgSlug: string;
  displayName: string;
  avatarUrl: string;
  repoName: string; // the gitClasses template repo
  repoFullName: string; // org/repo
}

export interface Course {
  id: string;
  tenant: string;
  title: string;
  description: string;
  modules: Module[];
  createdAt: string;
}

export interface Module {
  id: string;
  slug: string; // e.g. "module-01-basics"
  title: string;
  description: string;
  order: number;
  status: "available" | "coming-soon";
  hasAutoGrader: boolean;
  hasPeerReview: boolean;
}

export interface ModuleContent {
  slug: string;
  readme: string; // raw markdown
  resources: string; // raw markdown
  starterCode: Record<string, string>; // filename -> content
  tests: Record<string, string>;
}

export interface GradingResult {
  moduleSlug: string;
  score: number;
  maxScore: number;
  breakdown: {
    label: string;
    points: number;
    maxPoints: number;
    passed: boolean;
  }[];
  timestamp: string;
}

export interface LearningContract {
  studentUsername: string;
  path: "A" | "B" | "C";
  moduleName: string;
  goals: string[];
  projectIdea?: string;
  status: "pending" | "approved" | "in-progress" | "completed";
  issueNumber?: number;
}

export interface WorkflowRun {
  id: number;
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "cancelled" | null;
  createdAt: string;
  htmlUrl: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  moduleContext?: string; // which module the chat is about
  createdAt: string;
}

export interface StudentProgress {
  username: string;
  name: string;
  avatarUrl: string;
  modules: ModuleProgress[];
  contractStatus: LearningContract["status"] | "none";
  contractIssueNumber?: number;
  learningPath?: "A" | "B" | "C";
  lastActivity?: string;
  overallScore: number;
  overallMaxScore: number;
}

export interface ModuleProgress {
  moduleSlug: string;
  moduleTitle: string;
  latestRun?: WorkflowRun;
  score: number;
  maxScore: number;
  attempts: number;
  passed: boolean;
}

export interface ClassroomOverview {
  totalStudents: number;
  contractsSubmitted: number;
  contractsApproved: number;
  averageScore: number;
  moduleCompletionRates: Record<string, number>; // slug → percentage 0-100
}
