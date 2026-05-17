"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import Link from "next/link";
import {
  BookOpen,
  Code,
  FileText,
  TestTube,
  ChevronLeft,
  Bot,
  Copy,
  Check,
  Upload,
  Send,
  Loader2,
} from "lucide-react";
import { clsx } from "clsx";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import type { ModuleContent } from "@/types";

type Tab = "readme" | "starter-code" | "tests" | "resources";

export default function ModuleDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [content, setContent] = useState<ModuleContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("readme");
  const [selectedFile, setSelectedFile] = useState<string>("");

  const [editedCode, setEditedCode] = useState<Record<string, string>>({});
  const [copyStatus, setCopyStatus] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  useEffect(() => {
    fetch(`/api/github/module-content?slug=${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load module");
        return r.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setContent(data);
        if (data?.starterCode) {
          setEditedCode(data.starterCode);
          const firstFile = Object.keys(data.starterCode)[0];
          if (firstFile) setSelectedFile(firstFile);
        }
      })
      .catch((e) => {
        console.error("Failed to load module:", e);
        setContent(null);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const TABS: { id: Tab; label: string; icon: typeof BookOpen }[] = [
    { id: "readme", label: "Module Guide", icon: BookOpen },
    { id: "starter-code", label: "Starter Code", icon: Code },
    { id: "tests", label: "Tests", icon: TestTube },
    { id: "resources", label: "Resources", icon: FileText },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Module Not Found
        </h1>
        <p className="mt-2 text-gray-500">
          Could not load content for <code>{slug}</code>. Make sure the GitHub
          repo is configured and accessible.
        </p>
        <Link
          href="/courses"
          className="mt-6 inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Courses
        </Link>
      </div>
    );
  }

  const codeFiles = Object.keys(content.starterCode);
  const testFiles = Object.keys(content.tests);

  const handleCopy = () => {
    navigator.clipboard.writeText(editedCode[selectedFile] || "");
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  const handleUpload = () => {
    setUploadStatus("uploading");
    // Simulate compilation and upload to Arduino board via Serial/CLI
    setTimeout(() => {
      setUploadStatus("success");
      setTimeout(() => setUploadStatus("idle"), 3000);
    }, 2500);
  };

  const handleSubmit = async () => {
    setSubmitStatus("submitting");
    try {
      const res = await fetch("/api/github/submit-work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          filename: selectedFile,
          content: editedCode[selectedFile] || "",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit work");
      }

      setSubmitStatus("success");
      setTimeout(() => setSubmitStatus("idle"), 5000);
    } catch (e) {
      console.error(e);
      setSubmitStatus("error");
      setTimeout(() => setSubmitStatus("idle"), 3000);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/courses" className="hover:text-indigo-600">
          Courses
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white">{slug}</span>
      </div>

      {/* Module header */}
      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {slug
              .replace("module-", "Module ")
              .replace(/-/g, " ")
              .replace(/(\d+)\s/, "$1 — ")}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {codeFiles.length} starter file(s) &middot; {testFiles.length} test
            file(s)
          </p>
        </div>
        <Link
          href={`/ai?module=${slug}`}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Bot className="h-4 w-4" />
          Ask AI
        </Link>
      </div>

      {/* Tabs */}
      <div className="mt-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "readme" && (
          <div className="max-w-4xl">
            <MarkdownRenderer content={content.readme} />
          </div>
        )}

        {activeTab === "starter-code" && (
          <div className="flex gap-6">
            {/* File list sidebar */}
            <div className="w-48 shrink-0">
              <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                Files
              </h3>
              <div className="mt-2 space-y-1">
                {codeFiles.map((file) => (
                  <button
                    key={file}
                    onClick={() => setSelectedFile(file)}
                    className={clsx(
                      "w-full rounded px-2 py-1.5 text-left text-sm",
                      selectedFile === file
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                        : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                    )}
                  >
                    <Code className="mr-1.5 inline h-3.5 w-3.5" />
                    {file}
                  </button>
                ))}
              </div>
            </div>

            {/* Code viewer */}
            <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 flex flex-col h-[600px]">
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {selectedFile}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {copyStatus ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    {copyStatus ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={uploadStatus !== "idle"}
                    className={clsx(
                      "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-white transition-colors",
                      uploadStatus === "uploading" ? "bg-amber-500" : uploadStatus === "success" ? "bg-green-600" : "bg-amber-600 hover:bg-amber-700"
                    )}
                  >
                    {uploadStatus === "uploading" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : uploadStatus === "success" ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                    {uploadStatus === "uploading" ? "Uploading..." : uploadStatus === "success" ? "Uploaded!" : "Upload to Board"}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitStatus !== "idle"}
                    className={clsx(
                      "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-white transition-colors",
                      submitStatus === "submitting" ? "bg-indigo-400" : submitStatus === "success" ? "bg-green-600" : "bg-indigo-600 hover:bg-indigo-700"
                    )}
                  >
                    {submitStatus === "submitting" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : submitStatus === "success" ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                    {submitStatus === "submitting" ? "Submitting..." : submitStatus === "success" ? "Submitted!" : "Submit Work"}
                  </button>
                </div>
              </div>
              <textarea
                value={editedCode[selectedFile] || ""}
                onChange={(e) => setEditedCode({ ...editedCode, [selectedFile]: e.target.value })}
                className="flex-1 w-full resize-none bg-gray-950 p-4 font-mono text-sm text-gray-300 focus:outline-none"
                spellCheck={false}
              />
            </div>
          </div>
        )}

        {activeTab === "tests" && (
          <div>
            {testFiles.map((file) => (
              <div
                key={file}
                className="mb-6 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
              >
                <div className="flex items-center border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
                  <TestTube className="mr-2 h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {file}
                  </span>
                </div>
                <pre className="overflow-x-auto bg-gray-950 p-4 text-sm text-gray-300">
                  <code>{content.tests[file]}</code>
                </pre>
              </div>
            ))}
          </div>
        )}

        {activeTab === "resources" && content.resources && (
          <div className="max-w-4xl">
            <MarkdownRenderer content={content.resources} />
          </div>
        )}
      </div>
    </div>
  );
}
