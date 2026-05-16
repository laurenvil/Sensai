import Link from "next/link";
import {
  BookOpen,
  GitBranch,
  Bot,
  Users,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Udemy-Style Courses",
    description:
      "Browse modules with progress tracking, auto-grading, and completion certificates — all powered by GitHub.",
  },
  {
    icon: GitBranch,
    title: "Learn by Doing",
    description:
      "Every concept taught through real Pull Requests, code reviews, and CI/CD pipelines.",
  },
  {
    icon: Bot,
    title: "AI-Powered Learning",
    description:
      "AI explains test failures, generates quizzes, and creates personalized curricula from your goals.",
  },
  {
    icon: Users,
    title: "Peer Review Built In",
    description:
      "Give and receive meaningful code reviews. The 2-for-1 rule means everyone teaches and learns.",
  },
];

const PATHS = [
  {
    id: "A",
    name: "Guided",
    audience: "New learners",
    description: "Follow step-by-step starter code with AI-powered hints.",
    color: "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
  },
  {
    id: "B",
    name: "Explorer",
    audience: "Self-directed",
    description: "Build an original project with a personalized AI curriculum.",
    color: "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
  },
  {
    id: "C",
    name: "Expert",
    audience: "Advanced",
    description: "Improve the course itself — submit PRs to the curriculum.",
    color: "bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800",
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 to-white dark:from-gray-950 dark:to-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
              Learn Git & GitHub
              <br />
              <span className="text-indigo-600">the way professionals work</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
              gitClasses is an open classroom framework where teachers deploy
              courses in one click and students learn through real Pull Requests,
              AutoGrading, and AI-powered feedback.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/courses"
                className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
              >
                Browse Courses
              </Link>
              <Link
                href="/docs"
                className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-750 transition-colors"
              >
                Read the Docs
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white">
            Everything you need to teach and learn
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900">
                    <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Learning Paths */}
      <section className="bg-gray-50 py-20 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white">
            Choose Your Learning Path
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-gray-600 dark:text-gray-400">
            Three paths, one classroom. Pick the adventure that fits your level.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PATHS.map((path) => (
              <div
                key={path.id}
                className={`rounded-xl border p-6 ${path.color}`}
              >
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Path {path.id}
                </div>
                <h3 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                  {path.name}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  For {path.audience}
                </p>
                <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                  {path.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How AutoGrading Works */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white">
            How AutoGrading Works
          </h2>
          <div className="mx-auto mt-12 max-w-2xl space-y-6">
            {[
              { step: "1", text: "You push code to your GitHub repository" },
              { step: "2", text: "GitHub Actions runs pytest against your code" },
              { step: "3", text: "Score out of 100 is posted to your PR" },
              { step: "4", text: "If tests fail, AI explains what went wrong and suggests a fix" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                  {item.step}
                </div>
                <p className="text-gray-700 dark:text-gray-300 pt-1">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 text-indigo-600 font-medium hover:text-indigo-700"
            >
              Start learning now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8 dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-500 dark:text-gray-400 sm:px-6 lg:px-8">
          <p>
            Built on the Open Classroom model — where everyone is both a teacher
            and a student.
          </p>
          <div className="mt-4 flex items-center justify-center gap-6">
            <Link href="/docs" className="hover:text-gray-700 dark:hover:text-gray-300">
              Documentation
            </Link>
            <Link href="/docs/community" className="hover:text-gray-700 dark:hover:text-gray-300">
              Community Guidelines
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
