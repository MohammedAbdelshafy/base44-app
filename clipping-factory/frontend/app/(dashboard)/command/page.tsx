"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { commandsApi } from "@/lib/api";
import { Terminal, Send, Loader2 } from "lucide-react";
import { clsx } from "clsx";

const SUGGESTIONS = [
  "show health",
  "show failures",
  "show revenue",
  "start processing",
  "pause all campaigns",
  "resume all campaigns",
  "generate report",
  "show today's activity",
];

interface Message {
  role: "user" | "system";
  text: string;
  success?: boolean;
  data?: unknown;
  ts: string;
}

export default function CommandPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      text: "Command Center ready. Type a natural-language command or pick a suggestion.",
      ts: new Date().toISOString(),
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const execute = useMutation({
    mutationFn: (text: string) => commandsApi.execute(text),
    onSuccess: (result, variables) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          text: result.message || (result.success ? "Done." : "Command failed."),
          success: result.success,
          data: result.data,
          ts: new Date().toISOString(),
        },
      ]);
    },
    onError: (err: Error) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          text: `Error: ${err.message}`,
          success: false,
          ts: new Date().toISOString(),
        },
      ]);
    },
  });

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: trimmed, ts: new Date().toISOString() },
    ]);
    setInput("");
    execute.mutate(trimmed);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <Terminal className="w-6 h-6 text-brand-500" />
        <h1 className="text-2xl font-bold text-gray-100">Command Center</h1>
      </div>

      {/* Suggestions */}
      <div className="flex flex-wrap gap-2 mb-4">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            disabled={execute.isPending}
            className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto card mb-4 space-y-4 min-h-0">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={clsx(
              "flex gap-3",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "system" && (
              <Terminal className="w-4 h-4 text-brand-500 mt-1 flex-shrink-0" />
            )}
            <div
              className={clsx(
                "max-w-xl rounded-xl px-4 py-3 text-sm",
                msg.role === "user"
                  ? "bg-brand-500/20 text-brand-300 border border-brand-500/30"
                  : msg.success === false
                  ? "bg-red-900/20 text-red-300 border border-red-800/30"
                  : "bg-gray-800 text-gray-200"
              )}
            >
              <p>{msg.text}</p>
              {msg.data != null && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer">
                    View data
                  </summary>
                  <pre className="text-xs mt-1 text-gray-400 overflow-x-auto max-h-40">
                    {JSON.stringify(msg.data, null, 2)}
                  </pre>
                </details>
              )}
              <p className="text-xs text-gray-600 mt-1">
                {new Date(msg.ts).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {execute.isPending && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a command... e.g. 'show health' or 'pause all'"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || execute.isPending}
          className="btn-primary flex items-center gap-2 px-5 disabled:opacity-50"
        >
          {execute.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Send
        </button>
      </form>
    </div>
  );
}
