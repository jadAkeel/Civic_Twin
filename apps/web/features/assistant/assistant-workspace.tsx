"use client";

import { useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/async-state";
import { Panel } from "@/components/ui/panel";
import { citymindApi, type AssistantQuery } from "@/lib/api-client";
import { providerLabel } from "@/lib/display-labels";
import { apiErrorMessage } from "@/lib/use-api-resource";

const promptStarters = [
  "أي حي في طرابلس يحتاج إلى أشجار أولًا؟",
  "ما التدخل الذي يحسن باب التبانة أكثر؟",
  "ما البلاغات التي لم تُحل بعد؟",
  "أين قابلية المشي هي الأضعف؟",
];

const MIN_QUESTION_LENGTH = 4;

export function AssistantWorkspace() {
  const [question, setQuestion] = useState(promptStarters[0]);
  const [messages, setMessages] = useState<AssistantQuery[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length < MIN_QUESTION_LENGTH) {
      setError("اكتب سؤالًا من أربعة أحرف على الأقل.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const answer = await citymindApi.assistant.ask(trimmed);
      setMessages((current) => [answer, ...current]);
    } catch (caught) {
      // No invented answer is ever shown: an unavailable assistant stays silent.
      setError(apiErrorMessage(caught));
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
              className="rounded-md border border-slate-200 bg-slate-50 p-4 text-right text-sm font-medium text-slate-800 transition hover:border-teal-500 hover:bg-white"
              type="button"
              onClick={() => setQuestion(starter)}
            >
              {starter}
            </button>
          ))}
        </div>
        <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          تجيب هذه الأداة فقط مما تجده في بيانات CityMind Tripoli المحمّلة. إذا لم تجد دليلًا، فإنها ترفض الإجابة بدل
          تخمينها.
        </p>
      </Panel>

      <Panel title="مراجعة البيانات" eyebrow="إجابات تحتاج إلى تحقق بشري">
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={ask}>
          <label className="min-w-0 flex-1">
            <span className="sr-only">سؤالك عن بيانات طرابلس</span>
            <input
              className="city-control"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength={500}
              aria-invalid={Boolean(error)}
              placeholder="اكتب سؤالًا عن بيانات المدينة"
            />
          </label>
          <button className="city-primary-button sm:w-32" type="submit" disabled={loading}>
            {loading ? "جارٍ المراجعة" : "راجع"}
          </button>
        </form>

        <div aria-live="polite" className="mt-5 space-y-4">
          {error ? <ErrorState message={error} /> : null}

          {messages.length === 0 && !error ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              لم تطرح سؤالًا بعد. اختر سؤالًا جاهزًا أو اكتب سؤالك، وستظهر الإجابة مع مصادرها من بيانات CityMind فقط.
            </div>
          ) : null}

          {messages.map((message) => (
            <article key={message.id} className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-950">{message.question}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{message.answer}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone="blue">{providerLabel(message.provider)}</Badge>
                <Badge tone="neutral">للمراجعة البشرية</Badge>
                <Badge tone="neutral">الثقة: {Math.round(message.confidence_score * 100)}%</Badge>
              </div>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}
