import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { Page } from "../components/Page";
import { learningQueryClient, useLearningProgress } from "../learning/cloud";
import { testOutAccuracy, useLocalTestOut } from "../learning/testout";
import { lessons } from "../lib/curriculum";
import { useSettings } from "../lib/settings";
import { z } from "../lib/zod-config";
import { queueMutation } from "../offline/dispatch";
import { useEventResolution } from "../offline/receipts";
import { reviewCopy } from "./copy";

const unitLessons = lessons.filter((lesson) => lesson.unit === 1);
const items = unitLessons.flatMap((lesson) =>
  lesson.items.map((item) => ({ lesson, item })),
);
const responseSchema = z.object({
  event_id: z.uuid(),
  unit_slug: z.literal("unit-1"),
  accuracy: z.number().min(0).max(1),
  passed: z.boolean(),
  xp_awarded: z.number().int(),
  total_xp: z.number().int(),
  completed_lesson_slugs: z.array(z.string()),
});
export default function TestOutRoute() {
  const progress = useLearningProgress();
  const t = reviewCopy(useSettings().language);
  if (progress.scope === "verifying") return <p role="status">{t.load}</p>;
  return (
    <>
      <div hidden={progress.verifying}>
        <TestOut key={progress.scope} />
      </div>
      {progress.verifying && <p role="status">{t.load}</p>}
    </>
  );
}
function TestOut() {
  const progress = useLearningProgress();
  const auth = useAuth();
  const language = useSettings().language;
  const t = reviewCopy(language);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const request = useRef<{
    id: string;
    answers: { lesson_slug: string; item_id: string; answer: string }[];
  } | null>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const firstAnswer = useRef<HTMLInputElement>(null);
  const previousAccuracy = useRef<number | null>(null);
  const [attemptNumber, setAttemptNumber] = useState(0);
  useEffect(() => {
    if (attemptNumber > 0) firstAnswer.current?.focus();
  }, [attemptNumber]);
  useEffect(() => {
    if (accuracy !== null) resultHeading.current?.focus();
    else if (previousAccuracy.current !== null) firstAnswer.current?.focus();
    previousAccuracy.current = accuracy;
  }, [accuracy]);
  const resolution = useEventResolution(request.current?.id ?? null, "testout");
  const accepted = resolution.outcome?.state === "accepted";
  const rejected = resolution.outcome?.state === "rejected";
  useEffect(() => {
    if (resolution.receipt) {
      const parsed = responseSchema.safeParse(resolution.receipt);
      if (parsed.success) {
        setAccuracy(parsed.data.accuracy);
        setPending(false);
        setFailed(false);
      }
    } else if (accepted) {
      setPending(false);
      setFailed(false);
    } else if (rejected) {
      setPending(false);
      setFailed(true);
    }
  }, [resolution.receipt, accepted, rejected]);
  const scope = useRef(progress.scope);
  const allowed = lessons
    .filter((lesson) => lesson.unit === 0)
    .every((lesson) => progress.completed.includes(lesson.id));
  async function submit() {
    if (
      pending ||
      !allowed ||
      progress.verifying ||
      progress.scope !== scope.current
    )
      return;
    setPending(true);
    setFailed(false);
    const event = request.current ?? {
      id: crypto.randomUUID(),
      answers: items.map(({ lesson, item }) => ({
        lesson_slug: lesson.id,
        item_id: item.id,
        answer: answers[item.id] ?? "",
      })),
    };
    request.current = event;
    try {
      if (progress.scope === "practice") {
        useLocalTestOut.getState().add({
          id: event.id,
          scope: "practice",
          createdAt: new Date().toISOString(),
          answers: event.answers,
        });
        setAccuracy(
          testOutAccuracy({
            id: event.id,
            scope: "practice",
            createdAt: new Date().toISOString(),
            answers: event.answers,
          }),
        );
      } else {
        if (auth.owner?.id !== scope.current) throw new Error("Scope mismatch");
        const response = await queueMutation(
          "testout",
          {
            p_event_id: event.id,
            p_unit_slug: "unit-1",
            p_content_version: 1,
            p_answers: event.answers,
            p_duration_seconds: 0,
          },
          auth.client,
          failed,
        );
        const result = responseSchema.parse(response);
        if (result.event_id !== event.id) throw new Error("Mismatched event");
        setAccuracy(result.accuracy);
        await learningQueryClient.invalidateQueries({
          queryKey: ["owner", scope.current],
        });
      }
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }
  return (
    <Page eyebrow="UNIT 1" title={t.testout} description={t.testBody}>
      {!allowed ? (
        <p>{t.testUnavailable}</p>
      ) : (
        <section className="setting-card">
          <p className="mode-label">{progress.owner ? t.cloud : t.local}</p>
          {accepted && accuracy === null ? (
            <p role="status">
              {t.cloud} ·{" "}
              <Link className="text-link" to="/statistik">
                {t.stats}
              </Link>
            </p>
          ) : accuracy !== null ? (
            <>
              <h2 ref={resultHeading} tabIndex={-1}>
                {Math.round(accuracy * 100)}% ·{" "}
                {accuracy >= 0.9 ? t.testPass : t.testFail}
              </h2>
              {!progress.owner && (
                <p>
                  {t.noXP}{" "}
                  {language === "ms"
                    ? "Ujian setempat ini tidak membuka kemajuan akaun."
                    : "This local test does not unlock account progress."}
                </p>
              )}
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setAccuracy(null);
                  setAnswers({});
                  request.current = null;
                }}
              >
                {t.again}
              </button>
            </>
          ) : (
            <form
              className="auth-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              {items.map(({ item }, index) => (
                <label key={item.id}>
                  {index + 1}. <span lang="zh-CN">{item.hanzi}</span> ·{" "}
                  {t.meaning}
                  <input
                    ref={index === 0 ? firstAnswer : undefined}
                    required
                    maxLength={2000}
                    value={answers[item.id] ?? ""}
                    disabled={pending || failed || accepted}
                    onChange={(event) =>
                      setAnswers((old) => ({
                        ...old,
                        [item.id]: event.target.value,
                      }))
                    }
                  />
                </label>
              ))}
              <button
                className="button primary"
                type="submit"
                disabled={pending || failed || accepted}
              >
                {pending ? t.saving : t.check}
              </button>
            </form>
          )}
          {rejected ? (
            <div className="notice" role="alert">
              <p>
                {language === "ms"
                  ? "Percubaan ini ditolak. Selesaikan konflik di atas sebelum mencuba semula. Permintaan terdahulu dikekalkan sebagai rekod keputusan."
                  : "This attempt was rejected. Resolve the conflict above before trying again. The earlier request remains an outcome record."}
              </p>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  request.current = null;
                  setAnswers({});
                  setAccuracy(null);
                  setFailed(false);
                  setPending(false);
                  setAttemptNumber((value) => value + 1);
                }}
              >
                {t.again}
              </button>
            </div>
          ) : (
            failed && (
              <div className="notice" role="alert">
                <p>{t.pending}</p>
                <button
                  className="button secondary"
                  type="button"
                  disabled={rejected}
                  onClick={() => void submit()}
                >
                  {t.retry}
                </button>
              </div>
            )
          )}
        </section>
      )}
      <Link className="text-link" to="/belajar">
        {t.back}
      </Link>
    </Page>
  );
}
