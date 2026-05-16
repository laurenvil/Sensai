"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Check, Save, GitMerge, FileText, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

export default function DraftReviewPage({
  params,
}: {
  params: Promise<{ prNumber: string }>;
}) {
  const router = useRouter();
  const { prNumber } = use(params);
  const { data: session, status } = useSession();
  
  const [draft, setDraft] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [savingFile, setSavingFile] = useState(false);
  
  const [merging, setMerging] = useState(false);
  
  const [checklist, setChecklist] = useState({
    objectives: false,
    starterCode: false,
    tests: false,
    resources: false,
    difficulty: false,
    content: false,
  });

  const allChecked = Object.values(checklist).every(Boolean);

  useEffect(() => {
    if (status === "authenticated") {
      fetch(`/api/admin/drafts/${prNumber}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load draft");
          return res.json();
        })
        .then((data) => {
          setDraft(data.draft);
          setFiles(data.files || []);
          if (data.files && data.files.length > 0) {
            setActiveFile(data.files[0].filename);
            setFileContent(data.files[0].content || "");
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, prNumber]);

  function handleFileSelect(filename: string) {
    const file = files.find((f) => f.filename === filename);
    if (file) {
      setActiveFile(filename);
      setFileContent(file.content || "");
    }
  }

  async function handleSaveFile() {
    if (!activeFile || !draft) return;
    
    const file = files.find((f) => f.filename === activeFile);
    if (!file) return;

    setSavingFile(true);
    try {
      const res = await fetch(`/api/admin/drafts/${prNumber}/files`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch: draft.branch,
          path: activeFile,
          content: fileContent,
          sha: file.sha,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save file");
      }

      // Update local state to reflect new content
      setFiles((prev) =>
        prev.map((f) =>
          f.filename === activeFile ? { ...f, content: fileContent } : f
        )
      );
      
      // In a real app we might refetch the file to get the new SHA, 
      // but for simple edits this works until page reload.
      alert("File saved successfully!");
      
    } catch (err: any) {
      alert(`Error saving file: ${err.message}`);
    } finally {
      setSavingFile(false);
    }
  }

  async function handleMerge() {
    if (!allChecked) return;
    
    setMerging(true);
    try {
      const res = await fetch(`/api/admin/drafts/${prNumber}`, {
        method: "POST",
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to merge PR");
      }
      
      alert("Module approved and merged successfully!");
      router.push("/admin/drafts");
    } catch (err: any) {
      alert(`Error merging module: ${err.message}`);
      setMerging(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-32 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
          Error loading draft
        </h3>
        <p className="mt-2 text-sm text-gray-500">{error}</p>
        <Link
          href="/admin/drafts"
          className="mt-6 inline-block text-indigo-600 hover:text-indigo-500"
        >
          &larr; Back to Drafts
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/drafts"
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {draft?.title}
            </h1>
            <p className="text-sm text-gray-500">
              Branch: {draft?.branch} · PR #{draft?.number}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleMerge}
          disabled={!allChecked || merging}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {merging ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitMerge className="h-4 w-4" />}
          Approve &amp; Merge
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Checklist and Files */}
        <div className="w-80 flex-shrink-0 flex flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-y-auto">
          {/* Checklist */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              Teacher Review Checklist
            </h3>
            <div className="mt-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.objectives}
                  onChange={(e) => setChecklist({ ...checklist, objectives: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Learning objectives are accurate</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.starterCode}
                  onChange={(e) => setChecklist({ ...checklist, starterCode: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Starter code is scaffolded correctly</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.tests}
                  onChange={(e) => setChecklist({ ...checklist, tests: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Test suite matches starter code</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.resources}
                  onChange={(e) => setChecklist({ ...checklist, resources: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Resources use working URLs</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.difficulty}
                  onChange={(e) => setChecklist({ ...checklist, difficulty: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Difficulty matches expectations</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.content}
                  onChange={(e) => setChecklist({ ...checklist, content: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Content is appropriate for audience</span>
              </label>
            </div>
          </div>

          {/* File List */}
          <div className="p-4 flex-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">
              Modified Files
            </h3>
            <ul className="space-y-1">
              {files.map((file) => (
                <li key={file.filename}>
                  <button
                    onClick={() => handleFileSelect(file.filename)}
                    className={clsx(
                      "w-full flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium transition-colors",
                      activeFile === file.filename
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    )}
                  >
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{file.filename.split('/').pop()}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-950">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-800">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 font-mono truncate">
              {activeFile}
            </span>
            <button
              onClick={handleSaveFile}
              disabled={savingFile || !activeFile}
              className="flex items-center gap-2 rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              {savingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save File
            </button>
          </div>
          
          <textarea
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
            className="flex-1 resize-none bg-transparent p-4 font-mono text-sm text-gray-900 focus:outline-none dark:text-gray-100 leading-relaxed"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
