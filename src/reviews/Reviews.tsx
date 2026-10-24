import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Page } from "../components/Page";
import { useMandarinAudio } from "../learning/audio";
import { learningQueryClient } from "../learning/cloud";
import { usePractice } from "../learning/store";
import { useSettings } from "../lib/settings";
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
    ? (data.query.data?.due ?? [])
    : localCards(local.events);
  const scope = data.progress.scope;
  if (data.progress.scope === "verifying")
    return (
      <Page eyebrow={t.review} title={t.title}>
        <p role="status">{t.load}</p>
      </Page>
    );
  if (data.query.isError)
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
  const t = reviewCopy(useSettings().language);
  const data = useReviewData();
  const audio = useMandarinAudio();
  const [card, setCard] = useState<ReviewCard | null>(null);
  const active = card ?? cards[0];
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
  const authRef = useRef(data.auth);
  authRef.current = data.auth;
  async function submit() {
    if (!active || pending || data.progress.verifying) return;
    setCard(active);
    const event = request.current ?? { id: crypto.randomUUID(), answer, hints };
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
      data.auth.status !== "owner" ||
      !data.auth.client ||
      data.auth.owner?.id !== scope
    ) {
      setPending(false);
      return;
    }
    try {
      const response = await data.auth.client.rpc("review_word", {
        p_event_id: event.id,
        p_word_id: active.word_id,
        p_modality: active.modality,
        p_answer: event.answer,
        p_expected_version: active.schedule.version,
        p_hints_used: event.hints,
        p_duration_seconds: 0,
      });
      if (response.error) throw new Error("Unconfirmed review");
      const result = reviewResultSchema.parse(response.data);
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
            {t.due}: {available.length} · {current.modality}
          </p>
          <h2
            ref={nextHeading}
            tabIndex={-1}
            className="lesson-hanzi"
            lang="zh-CN"
          >
            {current.modality === "hanzi" ? current.meaning_ms : current.hanzi}
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
              <p className="voice-note">
                {audio.available ? t.device : t.textFallback}
              </p>
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
              disabled={pending || feedback !== null || failed}
            />
            <div className="result-actions">
              <button
                className="button primary"
                type="submit"
                disabled={pending || feedback !== null || failed}
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
                ? `${reviewAnswer(current).slice(0, 1)}…`
                : reviewAnswer(current)}
            </p>
          )}
          {failed && (
            <div className="notice" role="alert">
              <p>{t.pending}</p>
              <button
                className="button secondary"
                type="button"
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
                {t.answer}: {reviewAnswer(current)}
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
