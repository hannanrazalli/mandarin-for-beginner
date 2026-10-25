import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Page } from "../components/Page";
import { AudioSource } from "../learning/AudioSource";
import { useMandarinAudio } from "../learning/audio";
import { learningQueryClient } from "../learning/cloud";
import { usePractice } from "../learning/store";
import {
  canonicalMeaningInput,
  localizedMeaning,
  requireItem,
} from "../lib/localization";
import { useSettings } from "../lib/settings";
import { queueMutation } from "../offline/dispatch";
import { useEventResolution } from "../offline/receipts";
import { normalizeReviewAnswer } from "./algorithms";
import { reviewResultSchema, useReviewData } from "./cloud";
import { reviewCopy } from "./copy";
import {
  localCards,
  type ReviewCard,
  reviewAnswer,
  useLocalReviews,
} from "./local";
export default function Reviews() {
  const { language } = useSettings();
  const t = reviewCopy(language);
  const data = useReviewData();
  const local = useLocalReviews();
  usePractice((state) => state.events);
  const cards = data.progress.owner
    ? data.progress.offline
      ? data.offlineDue
      : (data.query.data?.due ?? [])
    : localCards(local.events);
  const scope = data.progress.scope;
  if (data.progress.scope === "verifying")
    return (
      <Page eyebrow={t.review} title={t.title}>
        <p role="status">{t.load}</p>
      </Page>
    );
  if (!data.progress.offline && data.query.isError)
    return (
      <Page eyebrow={t.review} title={t.title}>
        <p role="alert">{t.error}</p>
      </Page>
    );
  return (
    <>
      <div hidden={data.progress.verifying}>
        <ReviewQueue key={scope} cards={cards} scope={scope} />
      </div>
      {data.progress.verifying && <p role="status">{t.load}</p>}
    </>
  );
}
function ReviewQueue({ cards, scope }: { cards: ReviewCard[]; scope: string }) {
  const language = useSettings().language;
  const t = reviewCopy(language);
  const data = useReviewData();
  const [card, setCard] = useState<ReviewCard | null>(null);
  const active = card ?? cards[0];
  const audio = useMandarinAudio(active?.hanzi);
  const [answer, setAnswer] = useState("");
  const [hints, setHints] = useState(0);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const request = useRef<{ id: string; answer: string; hints: number } | null>(
    null,
  );
  const answerInput = useRef<HTMLInputElement>(null);
  const nextHeading = useRef<HTMLHeadingElement>(null);
  const [focusNext, setFocusNext] = useState(0);
  useEffect(() => {
    if (focusNext > 0) {
      if (answerInput.current) answerInput.current.focus();
      else nextHeading.current?.focus();
    }
  }, [focusNext]);
  const resolution = useEventResolution(request.current?.id ?? null, "review");
  const accepted = resolution.outcome?.state === "accepted";
  const rejected = resolution.outcome?.state === "rejected";
  useEffect(() => {
    if (resolution.receipt) {
      const parsed = reviewResultSchema.safeParse(resolution.receipt);
      if (parsed.success) {
        setFeedback(parsed.data.correct);
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
  const authRef = useRef(data.auth);
  authRef.current = data.auth;
  async function submit() {
    if (!active || pending || data.progress.verifying) return;
    setCard(active);
    const event = request.current ?? {
      id: crypto.randomUUID(),
      answer:
        active.modality === "meaning"
          ? canonicalMeaningInput(requireItem(active.slug), language, answer)
          : answer,
      hints,
    };
    request.current = event;
    setPending(true);
    setFailed(false);
    if (scope === "practice") {
      const correct =
        normalizeReviewAnswer(event.answer) ===
        normalizeReviewAnswer(reviewAnswer(active));
      useLocalReviews.getState().add(active, correct, event.hints, event.id);
      setFeedback(correct);
      setPending(false);
      return;
    }
    if (
      (data.auth.status !== "owner" && data.auth.status !== "ownerOffline") ||
      data.auth.owner?.id !== scope
    ) {
      setPending(false);
      return;
    }
    try {
      const response = await queueMutation(
        "review",
        {
          p_event_id: event.id,
          p_word_id: active.word_id,
          p_modality: active.modality,
          p_answer: event.answer,
          p_expected_version: active.schedule.version,
          p_hints_used: event.hints,
          p_duration_seconds: 0,
        },
        data.auth.client,
        failed,
      );
      const result = reviewResultSchema.parse(response);
      if (
        result.event_id !== event.id ||
        result.word_id !== active.word_id ||
        authRef.current.owner?.id !== scope
      )
        throw new Error("Scope mismatch");
      setFeedback(result.correct);
      await learningQueryClient.invalidateQueries({
        queryKey: ["owner", scope],
      });
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }
  function next() {
    audio.stop();
    setCard(null);
    setAnswer("");
    setHints(0);
    setFeedback(null);
    request.current = null;
    setFocusNext((value) => value + 1);
  }
  const available = cards;
  const current = active;
  return (
    <Page eyebrow={t.review} title={t.title}>
      <p className="mode-label">{scope === "practice" ? t.local : t.cloud}</p>
      {!current ? (
        <section className="empty-state">
          <h2 ref={nextHeading} tabIndex={-1}>
            {t.empty}
          </h2>
          <p>{t.emptyBody}</p>
          <Link className="button primary" to="/belajar">
            {t.back}
          </Link>
        </section>
      ) : (
        <section className="exercise-card">
          <p className="eyebrow">
            {t.due}: {available.length} ·{" "}
            {current.modality === "meaning"
              ? t.meaningLabel
              : current.modality === "listening"
                ? t.listen
                : current.modality === "tone"
                  ? t.typing
                  : t.hanzi}
          </p>
          <h2
            ref={nextHeading}
            tabIndex={-1}
            className="lesson-hanzi"
            lang={current.modality === "hanzi" ? language : "zh-CN"}
          >
            {current.modality === "hanzi"
              ? localizedMeaning(requireItem(current.slug), language)
              : current.hanzi}
          </h2>
          <p>
            {current.modality === "meaning"
              ? t.meaning
              : current.modality === "hanzi"
                ? t.hanzi
                : t.pinyin}
          </p>
          {current.modality === "listening" && (
            <>
              <button
                className="button secondary"
                type="button"
                disabled={!audio.available}
                onClick={() => audio.play(current.hanzi)}
              >
                {t.listen}
              </button>
              <AudioSource
                source={audio.source}
                language={language}
                error={audio.state === "error"}
                recordingFailed={audio.recordingFailed}
              />
            </>
          )}
          <form
            className="auth-form review-form"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <label htmlFor="review-answer">{t.answer}</label>
            <input
              ref={answerInput}
              id="review-answer"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              maxLength={2000}
              required
              disabled={pending || feedback !== null || failed || accepted}
            />
            <div className="result-actions">
              <button
                className="button primary"
                type="submit"
                disabled={pending || feedback !== null || failed || accepted}
              >
                {pending ? t.saving : t.submit}
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={hints >= 2 || pending || feedback !== null || failed}
                onClick={() => setHints((value) => value + 1)}
              >
                {t.hint} {hints}/2
              </button>
            </div>
          </form>
          {hints > 0 && (
            <p>
              {hints === 1
                ? `${(current.modality === "meaning" ? localizedMeaning(requireItem(current.slug), language) : reviewAnswer(current)).slice(0, 1)}…`
                : current.modality === "meaning"
                  ? localizedMeaning(requireItem(current.slug), language)
                  : reviewAnswer(current)}
            </p>
          )}
          {accepted && feedback === null && (
            <div role="status">
              <p>
                {t.cloud} ·{" "}
                <Link className="text-link" to="/statistik">
                  {t.stats}
                </Link>
              </p>
              <button className="button primary" type="button" onClick={next}>
                {t.next}
              </button>
            </div>
          )}
          {failed && (
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
          )}
          {feedback !== null && (
            <div role="status">
              <h3>{feedback ? t.correct : t.wrong}</h3>
              <p>
                {t.answer}:{" "}
                {current.modality === "meaning"
                  ? localizedMeaning(requireItem(current.slug), language)
                  : reviewAnswer(current)}
              </p>
              <button className="button primary" type="button" onClick={next}>
                {t.next}
              </button>
            </div>
          )}
        </section>
      )}
      <div className="next-card">
        <p>{t.weak}</p>
        <Link className="text-link" to="/latihan">
          {t.practice} →
        </Link>
      </div>
    </Page>
  );
}
