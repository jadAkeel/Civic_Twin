"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { citymindApi, type AssistantQuery } from "@/lib/api-client";
import { providerLabel } from "@/lib/display-labels";

const promptStarters = [
  "أي حي في طرابلس يحتاج إلى أشجار أولًا؟",
  "ما التدخل الذي يحسن باب التبانة أكثر؟",
  "ما البلاغات التي لم تُحل بعد؟",
  "أين قابلية المشي هي الأضعف؟",
];

const fallbackAnswer: AssistantQuery = {
  id: "local-data-review-1",
  question: "أي حي في طرابلس يحتاج إلى أشجار أولًا؟",
  answer: "باب التبانة لديه أضعف غطاء أخضر في البيانات الاحتياطية المحلية، لذلك يجب مراجعته أولًا لزراعة الأشجار.",
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
          id: `local-data-review-${Date.now()}`,
          question,
          created_at: new Date().toISOString(),
        answer: "غير متاح أثناء توقف خدمة CityMind. تعرض هذه الأداة فقط ما يمكن استنتاجه من بيانات CityMind Tripoli التجريبية.",
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
      <Panel title="أسئلة مراجعة جاهزة" eyebrow="بيانات طرابلس">
        <div className="grid gap-3">
          {promptStarters.map((starter) => (
            <button
              key={starter}
              className="rounded-md border border-slate-200 bg-slate-50 p-4 text-right text-sm font-medium text-slate-800 hover:border-teal-500"
              type="button"
              onClick={() => setQuestion(starter)}
            >
              {starter}
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="مراجعة البيانات" eyebrow="إجابات تحتاج إلى تحقق بشري" action={<Badge tone={source === "api" ? "green" : "amber"}>{providerLabel(source)}</Badge>}>
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
            راجع
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="rounded-md border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-950">{message.question}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{message.answer}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="blue">{providerLabel(message.provider)}</Badge>
                <Badge tone="neutral">للمراجعة البشرية</Badge>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
