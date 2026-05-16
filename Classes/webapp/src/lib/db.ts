import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "gitclasses.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;

  // Ensure data directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  migrate(_db);
  return _db;
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      username TEXT PRIMARY KEY,
      name TEXT,
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      template_repo TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS student_repos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL REFERENCES assignments(id),
      username TEXT NOT NULL REFERENCES students(username),
      repo_full_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(assignment_id, username)
    );

    CREATE TABLE IF NOT EXISTS grading_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL REFERENCES students(username),
      module_slug TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      passed INTEGER NOT NULL DEFAULT 0,
      workflow_run_id INTEGER,
      workflow_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL REFERENCES students(username),
      issue_number INTEGER NOT NULL,
      module_slug TEXT NOT NULL DEFAULT 'module-01-basics',
      learning_path TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(username, issue_number)
    );

    CREATE TABLE IF NOT EXISTS webhook_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      delivery_id TEXT,
      payload TEXT NOT NULL,
      processed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

// ─── Row types ───────────────────────────────────────────────────────────────

export interface StudentRow {
  username: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface AssignmentRow {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  template_repo: string;
  created_at: string;
}

export interface StudentRepoRow {
  id: number;
  assignment_id: number;
  username: string;
  repo_full_name: string;
  created_at: string;
}

export interface GradingResultRow {
  id: number;
  username: string;
  module_slug: string;
  score: number;
  passed: number;
  workflow_run_id: number | null;
  workflow_url: string | null;
  created_at: string;
}

export interface ContractRow {
  id: number;
  username: string;
  issue_number: number;
  module_slug: string;
  learning_path: string | null;
  status: string;
  created_at: string;
}

// ─── DB operations ───────────────────────────────────────────────────────────

export const db = {
  upsertStudent(data: {
    username: string;
    name?: string;
    avatarUrl?: string;
  }): void {
    getDb().prepare(`
      INSERT INTO students (username, name, avatar_url)
      VALUES (?, ?, ?)
      ON CONFLICT(username) DO UPDATE SET
        name = COALESCE(excluded.name, name),
        avatar_url = COALESCE(excluded.avatar_url, avatar_url)
    `).run(data.username, data.name ?? null, data.avatarUrl ?? null);
  },

  listStudents(): StudentRow[] {
    return getDb().prepare(`SELECT * FROM students ORDER BY username`).all() as StudentRow[];
  },

  createAssignment(data: {
    slug: string;
    title: string;
    description?: string;
    templateRepo: string;
  }): void {
    getDb().prepare(`
      INSERT INTO assignments (slug, title, description, template_repo)
      VALUES (?, ?, ?, ?)
    `).run(data.slug, data.title, data.description ?? null, data.templateRepo);
  },

  getAssignment(slug: string): AssignmentRow | null {
    return getDb().prepare(`SELECT * FROM assignments WHERE slug = ?`).get(slug) as AssignmentRow | null;
  },

  listAssignments(): AssignmentRow[] {
    return getDb().prepare(`SELECT * FROM assignments ORDER BY created_at DESC`).all() as AssignmentRow[];
  },

  createStudentRepo(
    assignmentId: number,
    username: string,
    repoFullName: string
  ): void {
    getDb().prepare(`
      INSERT INTO student_repos (assignment_id, username, repo_full_name)
      VALUES (?, ?, ?)
      ON CONFLICT(assignment_id, username) DO NOTHING
    `).run(assignmentId, username, repoFullName);
  },

  getStudentRepo(
    assignmentId: number,
    username: string
  ): StudentRepoRow | null {
    return getDb().prepare(`
      SELECT * FROM student_repos WHERE assignment_id = ? AND username = ?
    `).get(assignmentId, username) as StudentRepoRow | null;
  },

  insertGradingResult(data: {
    username: string;
    moduleSlug: string;
    score: number;
    passed: boolean;
    workflowRunId?: number;
    workflowUrl?: string;
  }): void {
    getDb().prepare(`
      INSERT INTO grading_results (username, module_slug, score, passed, workflow_run_id, workflow_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.username,
      data.moduleSlug,
      data.score,
      data.passed ? 1 : 0,
      data.workflowRunId ?? null,
      data.workflowUrl ?? null
    );
  },

  getStudentGrades(username: string): GradingResultRow[] {
    return getDb().prepare(`
      SELECT * FROM grading_results WHERE username = ? ORDER BY created_at DESC
    `).all(username) as GradingResultRow[];
  },

  /** Returns only the most recent grade per (username, module_slug) */
  getLatestGrades(username: string): GradingResultRow[] {
    return getDb().prepare(`
      SELECT g1.*
      FROM grading_results g1
      LEFT JOIN grading_results g2
        ON g1.username = g2.username
        AND g1.module_slug = g2.module_slug
        AND g1.created_at < g2.created_at
      WHERE g1.username = ? AND g2.id IS NULL
      ORDER BY g1.module_slug
    `).all(username) as GradingResultRow[];
  },

  upsertContract(data: {
    username: string;
    issueNumber: number;
    moduleSlug: string;
    learningPath?: string | null;
    status: string;
  }): void {
    getDb().prepare(`
      INSERT INTO contracts (username, issue_number, module_slug, learning_path, status)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(username, issue_number) DO UPDATE SET
        learning_path = COALESCE(excluded.learning_path, learning_path),
        status = excluded.status
    `).run(
      data.username,
      data.issueNumber,
      data.moduleSlug,
      data.learningPath ?? null,
      data.status
    );
  },

  getContractByUser(username: string): ContractRow | null {
    return getDb().prepare(`
      SELECT * FROM contracts WHERE username = ? ORDER BY created_at DESC LIMIT 1
    `).get(username) as ContractRow | null;
  },

  listContracts(status?: string): ContractRow[] {
    if (status) {
      return getDb().prepare(`
        SELECT * FROM contracts WHERE status = ? ORDER BY created_at DESC
      `).all(status) as ContractRow[];
    }
    return getDb().prepare(`SELECT * FROM contracts ORDER BY created_at DESC`).all() as ContractRow[];
  },

  updateContractStatus(username: string, issueNumber: number, status: string): void {
    getDb().prepare(`
      UPDATE contracts SET status = ? WHERE username = ? AND issue_number = ?
    `).run(status, username, issueNumber);
  },

  insertWebhookEvent(data: {
    eventType: string;
    deliveryId?: string;
    payload: string;
  }): void {
    getDb().prepare(`
      INSERT INTO webhook_events (event_type, delivery_id, payload)
      VALUES (?, ?, ?)
    `).run(data.eventType, data.deliveryId ?? null, data.payload);
  },

  getClassroomStats(): {
    totalStudents: number;
    avgScore: number;
    contractStats: { status: string; c: number }[];
  } {
    const db = getDb();
    const { total } = db.prepare(`SELECT COUNT(*) as total FROM students`).get() as { total: number };
    const { avg } = db.prepare(`SELECT COALESCE(AVG(score), 0) as avg FROM grading_results`).get() as { avg: number };
    const contractStats = db.prepare(`
      SELECT status, COUNT(*) as c FROM contracts GROUP BY status
    `).all() as { status: string; c: number }[];

    return {
      totalStudents: total,
      avgScore: Math.round(avg),
      contractStats,
    };
  },
};
