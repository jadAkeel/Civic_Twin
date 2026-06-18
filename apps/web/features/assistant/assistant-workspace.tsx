"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { citymindApi, type AssistantQuery } from "@/lib/api-client";

const promptStarters = [
  "Which Tripoli neighborhood needs trees first?",
  "What intervention improves Bab Al Tebbaneh most?",
  "Which reports are unresolved?",
  "Where is walkability weakest?",
];

const fallbackAnswer: AssistantQuery = {
  id: "local-ai-query-1",
  question: "Which Tripoli neighborhood needs trees first?",
  answer: "Bab Al Tebbaneh has the weakest green coverage in the local fallback data and should be reviewed first for tree planting.",
  data_sources_json: { tables: ["green_metrics", "neighborhoods"] },
  confidence_score: 0.72,
  created_at: "2026-06-16T21:00:00.000Z",
  provider: "local_fallback",
};

export function AssistantWorkspace() {
  const [question, setQuestion] = useState(promptStarters[0]);
  const [messages, setMessages] = useState<AssistantQuery[]>([fallbackAnswer]);
  const [source, setSource] = useState<"api" | "fallback">("fallback");
  const [loading, setLoading] = useState(false);

  async function ask() {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const answer = await citymindApi.assistant.ask(question.trim());
      setMessages((current) => [answer, ...current]);
      setSource("api");
    } catch {
      setMessages((current) => [
        {
          ...fallbackAnswer,
          id: `local-ai-query-${Date.now()}`,
          question,
          created_at: new Date().toISOString(),
          answer: "Unavailable while the API is offline. The assistant only answers from CityMind Tripoli demo data.",
        },
        ...current,
      ]);
      setSource("fallback");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <Panel title="Prompt starters" eyebrow="Tripoli questions">
        <div className="grid gap-3">
          {promptStarters.map((starter) => (
            <button
              key={starter}
              className="rounded-md border border-slate-200 bg-slate-50 p-4 text-left text-sm font-medium text-slate-800 hover:border-teal-500"
              type="button"
              onClick={() => setQuestion(starter)}
            >
              {starter}
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Assistant conversation" eyebrow="Data-grounded responses" action={<Badge tone={source === "api" ? "green" : "amber"}>{source}</Badge>}>
        <div className="flex gap-3">
          <input
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <button
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
            type="button"
            onClick={ask}
            disabled={loading}
          >
            Ask
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="rounded-md border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-950">{message.question}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{message.answer}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="blue">{message.provider}</Badge>
                <Badge tone={message.confidence_score > 0 ? "green" : "rose"}>
                  {Math.round(message.confidence_score * 100)}% confidence
                </Badge>
                <Badge tone="neutral">{Object.keys(message.data_sources_json).length} source fields</Badge>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
