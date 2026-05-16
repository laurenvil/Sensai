"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  Send,
  Bot,
  User,
  Loader2,
  BookOpen,
  Sparkles,
  Trash2,
} from "lucide-react";
import { clsx } from "clsx";
import { MarkdownRenderer } from "@/components/markdown-renderer";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  { label: "Explain git branching", prompt: "Explain how git branching works and why feature branches are important." },
  { label: "Debug test failure", prompt: "My AutoGrader tests are failing. How do I read the pytest output and fix my code?" },
  { label: "Write learning goals", prompt: "Help me write 3 learning goals for my Learning Contract for Module 01 Basics." },
  { label: "Peer review tips", prompt: "What makes a good peer review? Give me examples of meaningful feedback." },
];

export default function AIAssistantPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      }
    >
      <AIAssistantContent />
    </Suspense>
  );
}

function AIAssistantContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const moduleContext = searchParams.get("module") || undefined;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function sendMessage(content: string) {
    if (!content.trim() || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
    };

    setMessages([...newMessages, assistantMsg]);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          moduleContext,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        assistantMsg.content = `Error: ${err.error || "Failed to get AI response"}`;
        setMessages([...newMessages, assistantMsg]);
        setLoading(false);
        return;
      }

      // Parse SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                assistantMsg.content += delta;
                setMessages([...newMessages, { ...assistantMsg }]);
              }
            } catch {
              // skip invalid JSON
            }
          }
        }
      }

      if (!assistantMsg.content) {
        assistantMsg.content =
          "I'm sorry, I wasn't able to generate a response. Please try again.";
      }

      setMessages([...newMessages, assistantMsg]);
    } catch {
      assistantMsg.content = "Network error. Please check your connection and try again.";
      setMessages([...newMessages, assistantMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-4xl flex-col px-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 py-4 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900">
            <Bot className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              AI Assistant
            </h1>
            {moduleContext && (
              <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <BookOpen className="h-3 w-3" />
                Context: {moduleContext}
              </p>
            )}
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Sparkles className="h-12 w-12 text-indigo-300 dark:text-indigo-700" />
            <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
              How can I help you learn?
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Ask about Git concepts, debug test failures, or get help with your
              Learning Contract.
            </p>

            {/* Quick prompts */}
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.label}
                  onClick={() => sendMessage(qp.prompt)}
                  className="rounded-lg border border-gray-200 p-3 text-left text-sm hover:border-indigo-300 hover:bg-indigo-50 dark:border-gray-700 dark:hover:border-indigo-700 dark:hover:bg-indigo-950 transition-colors"
                >
                  <span className="font-medium text-gray-900 dark:text-white">
                    {qp.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={clsx("flex gap-3", msg.role === "user" && "justify-end")}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                    <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                )}
                <div
                  className={clsx(
                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                    msg.role === "user"
                      ? "chat-message-user text-gray-900 dark:text-white"
                      : "chat-message-assistant text-gray-800 dark:text-gray-200"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <MarkdownRenderer content={msg.content || "..."} />
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                    <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                AI is thinking...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 py-4 dark:border-gray-800">
        {!session ? (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Sign in with GitHub to use the AI Assistant.
          </p>
        ) : (
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about Git, debug test failures, or get help..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-indigo-500"
              style={{ minHeight: "44px", maxHeight: "120px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
