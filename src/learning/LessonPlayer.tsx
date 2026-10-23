import { ArrowRight, RotateCcw, Square, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { z } from "zod";
import { useAuth } from "../auth/AuthProvider";
import { Page } from "../components/Page";
import {
  answerOptions,
  canonicalAnswer,
  getLesson,
  isLessonUnlocked,
  type Lesson,
} from "../lib/curriculum";
import { useSettings } from "../lib/settings";
import { useMandarinAudio } from "./audio";
import {
  type completionSchema,
  submitLesson,
  useLearningProgress,
} from "./cloud";
import { learningCopy } from "./copy";
import {
  type LearningEvent,
  scoreLesson,
  useLessonPlayer,
  usePractice,
} from "./store";
export default function LessonRoute() {
  const { slug = "" } = useParams();
  const progress = useLearningProgress();
  const lesson = getLesson(slug);
  const t = learningCopy(useSettings().language);
  if (!lesson)
    return (
      <Page eyebrow="Mandarin" title={t.noLesson}>
        <Link className="text-link" to="/belajar">
          {t.back}
        </Link>
      </Page>
    );
  if (
    progress.scope === "verifying" ||
    (progress.owner && progress.query.isPending)
  )
    return (
      <Page eyebrow="Mandarin" title={lesson.title_ms}>
        <p role="status">{t.loading}</p>
      </Page>
    );
  if (progress.query.isError || !isLessonUnlocked(slug, progress.completed))
    return (
      <Page eyebrow="Mandarin" title={lesson.title_ms}>
        <p>{progress.query.isError ? t.cloudError : t.locked}</p>
        <Link className="text-link" to="/belajar">
          {t.back}
        </Link>
      </Page>
    );
  return (
    <>
      {progress.verifying && <p role="status">{t.loading}</p>}
      <div hidden={progress.verifying}>
        <Player
          key={`${progress.scope}:${slug}`}
          lesson={lesson}
          scope={progress.scope}
          suspended={progress.verifying}
        />
      </div>
    </>
  );
}
export function Player({
  lesson,
  scope,
  suspended = false,
}: {
  lesson: Lesson;
  scope: string;
  suspended?: boolean;
}) {
  const auth = useAuth();
  const authRef = useRef(auth);
  authRef.current = auth;
  const t = learningCopy(useSettings().language);
  const player = useLessonPlayer();
  const practice = usePractice();
  const audio = useMandarinAudio();
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [result, setResult] = useState<z.infer<typeof completionSchema> | null>(
    null,
  );
  const alive = useRef(true);
  const heading = useRef<HTMLHeadingElement>(null);
  const explanation = useRef<HTMLElement>(null);
  const saveStarted = useRef<string | null>(null);
  useEffect(() => {
    alive.current = true;
    if (player.slug !== lesson.id || player.scope !== scope) {
      useLessonPlayer.getState().start(lesson.id, scope);
    }
    return () => {
      alive.current = false;
    };
  }, [lesson.id, scope, player.slug, player.scope]);
  const item = lesson.items[player.index];
  const options = item ? answerOptions(item) : [];
  const isListening =
    audio.available &&
    audio.state !== "error" &&
    player.stage === "question" &&
    player.index % 2 === 1;
  const save = useCallback(
    async (event: LearningEvent) => {
      if (
        !auth.client ||
        !auth.owner ||
        auth.status !== "owner" ||
        event.scope !== auth.owner.id ||
        event.scope !== scope ||
        useLessonPlayer.getState().scope !== scope ||
        suspended
      )
        return;
      setSaving(true);
      setFailed(false);
      try {
        const response = await submitLesson(auth.client, auth.owner.id, event);
        if (
          alive.current &&
          useLessonPlayer.getState().scope === event.scope &&
          (authRef.current.status === "initializing" ||
            (authRef.current.status === "owner" &&
              authRef.current.owner?.id === event.scope))
        )
          setResult(response);
      } catch {
        if (alive.current) setFailed(true);
      } finally {
        if (alive.current) setSaving(false);
      }
    },
    [auth.client, auth.owner, auth.status, scope, suspended],
  );
  useEffect(() => {
    if (
      suspended ||
      player.scope !== scope ||
      !player.event ||
      player.event.scope !== scope ||
      useLessonPlayer.getState().event?.id !== player.event.id ||
      useLessonPlayer.getState().scope !== scope ||
      (scope === "practice"
        ? auth.status === "initializing" || auth.status === "owner"
        : auth.status !== "owner" || auth.owner?.id !== scope) ||
      player.stage !== "result" ||
      saveStarted.current === player.event.id
    )
      return;
    saveStarted.current = player.event.id;
    if (scope === "practice") usePractice.getState().add(player.event);
    else void save(player.event);
  }, [
    player.event,
    player.stage,
    player.scope,
    scope,
    save,
    suspended,
    auth.status,
    auth.owner,
  ]);
  useEffect(() => {
    if (player.stage) {
      audio.stop();
      heading.current?.focus();
    }
  }, [player.stage, audio.stop]);
  useEffect(() => {
    if (player.revealed && player.stage === "flash")
      explanation.current?.focus();
  }, [player.revealed, player.stage]);
  function finishOrNext() {
    audio.stop();
    if (player.index < lesson.items.length - 1) {
      player.next();
      return;
    }
    const event: LearningEvent = {
      id: crypto.randomUUID(),
      scope,
      lessonId: lesson.id,
      contentVersion: lesson.content_version,
      answers: player.answers,
      createdAt: new Date().toISOString(),
      durationSeconds: Math.min(
        600,
        Math.max(0, Math.round((Date.now() - player.startedAt) / 1000)),
      ),
    };
    player.finish(event);
  }
  function select(value: string) {
    if (item && player.stage === "question")
      player.answer(item.id, value, value === canonicalAnswer(item));
  }
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        suspended ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest(
          'input,textarea,select,button,a,summary,[contenteditable="true"],[role="button"]',
        )
      )
        return;
      if (event.key === " " && item && audio.available) {
        event.preventDefault();
        audio.play(item.audio.text);
      } else if (/^[1-4]$/.test(event.key) && player.stage === "question") {
        const value = options[Number(event.key) - 1];
        if (value) {
          event.preventDefault();
          select(value);
        }
      } else if (event.key === "Enter" && player.stage === "feedback") {
        event.preventDefault();
        if (player.correct) finishOrNext();
        else player.retry();
      } else if (event.key === "Enter" && player.stage === "flash") {
        event.preventDefault();
        if (player.revealed) player.question();
        else player.reveal();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  });
  const score = scoreLesson(lesson, player.answers);
  if (player.slug !== lesson.id || player.scope !== scope)
    return <p role="status">{t.loading}</p>;
  return (
    <Page
      eyebrow={`UNIT ${lesson.unit} · ${scope === "practice" ? t.local : t.cloud}`}
      title={lesson.title_ms}
    >
      <div className="lesson-toolbar">
        <Link className="text-link" to="/belajar">
          ← {t.back}
        </Link>
        <span>
          {player.stage === "result" ? lesson.items.length : player.index + 1} /{" "}
          {lesson.items.length}
        </span>
      </div>
      <section className="exercise-card">
        {player.stage === "result" ? (
          <>
            <span className="result-sprout">✳</span>
            <h2 ref={heading} tabIndex={-1}>
              {t.result}
            </h2>
            <p className="accuracy-number">
              {Math.round((result?.accuracy ?? score.accuracy) * 100)}
              <span className="percent-sign">%</span>
            </p>
            <p>
              {t.accuracy} · {result?.correct_count ?? score.correct}/
              {score.total}
            </p>
            <p>
              {(result?.completed ?? score.completed) ? t.passed : t.notPassed}
            </p>
            {scope === "practice" ? (
              <p className="mode-label">
                {practice.stored ? t.localSaved : t.storageFailed}
              </p>
            ) : saving ? (
              <p role="status">{t.saving}</p>
            ) : failed ? (
              <div className="notice" role="alert">
                <p>{t.pending}</p>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => player.event && void save(player.event)}
                >
                  {t.send}
                </button>
              </div>
            ) : result ? (
              <p role="status">
                {t.saved} · {t.xp}: {result.xp_awarded}
              </p>
            ) : null}
            <div className="result-actions">
              <button
                type="button"
                className="button primary"
                onClick={() => {
                  setResult(null);
                  setFailed(false);
                  player.start(lesson.id, scope);
                }}
                disabled={saving || failed}
              >
                <RotateCcw size={18} />
                {t.repeat}
              </button>
              <Link className="button secondary" to="/belajar">
                {t.back}
                <ArrowRight size={18} />
              </Link>
            </div>
          </>
        ) : (
          item && (
            <>
              <p className="eyebrow">
                {player.stage === "flash"
                  ? t.card
                  : isListening
                    ? t.listening
                    : item.kind === "pronunciation"
                      ? t.choosePinyin
                      : t.chooseMeaning}
              </p>
              <h2
                ref={heading}
                tabIndex={-1}
                className="lesson-hanzi"
                lang="zh-CN"
              >
                {isListening ? "♪" : (item.hanzi ?? item.pinyin)}
              </h2>
              {player.stage === "flash" && (
                <p className="pinyin" lang="zh-Latn">
                  {item.pinyin}
                </p>
              )}
              <div className="audio-controls">
                <button
                  type="button"
                  className="button secondary"
                  disabled={!audio.available}
                  onClick={() => audio.play(item.audio.text)}
                >
                  <Volume2 size={18} />
                  {t.play}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={!audio.available}
                  onClick={() =>
                    audio.play(item.audio.text, item.audio.slow_rate)
                  }
                >
                  {t.slow}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={audio.state !== "playing"}
                  onClick={audio.stop}
                >
                  <Square size={15} />
                  {t.stop}
                </button>
              </div>
              <p className="voice-note" role="status">
                {audio.state === "error"
                  ? t.audioError
                  : audio.available
                    ? t.audio
                    : t.noVoice}
              </p>
              {player.stage === "flash" ? (
                player.revealed ? (
                  <section
                    ref={explanation}
                    tabIndex={-1}
                    aria-label={t.reveal}
                    className="item-explanation"
                  >
                    <p>
                      {item.kind === "pronunciation"
                        ? item.explanation_ms
                        : item.meaning_ms}
                    </p>
                    {item.kind === "vocabulary" && (
                      <p>
                        <span lang="zh-CN">{item.example.hanzi}</span> ·{" "}
                        {item.example.pinyin}
                        <br />
                        {item.example.meaning_ms}
                      </p>
                    )}
                    <p>
                      <strong>{t.tone}:</strong> {item.tone_note_ms}
                    </p>
                    {item.needs_review && <p>{t.review}</p>}
                    <button
                      type="button"
                      className="button primary"
                      onClick={player.question}
                    >
                      {t.question}
                      <ArrowRight size={18} />
                    </button>
                  </section>
                ) : (
                  <button
                    type="button"
                    className="button primary"
                    onClick={player.reveal}
                  >
                    {t.reveal}
                  </button>
                )
              ) : player.stage === "question" ? (
                <div className="answer-options">
                  {options.map((option, index) => (
                    <button
                      type="button"
                      className="answer-option"
                      key={option}
                      onClick={() => select(option)}
                    >
                      <span className="option-number">{index + 1}</span>
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <div
                  className={`answer-feedback ${player.correct ? "right" : "wrong"}`}
                  role="status"
                >
                  <h3>{player.correct ? t.correct : t.incorrect}</h3>
                  <p>
                    <strong>{t.answer}: </strong>
                    {canonicalAnswer(item)}
                  </p>
                  <p>{item.tone_note_ms}</p>
                  <button
                    type="button"
                    className="button primary"
                    onClick={player.correct ? finishOrNext : player.retry}
                  >
                    {player.correct ? t.next : t.retry}
                    <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </>
          )
        )}
        <p className="lesson-footnote">{t.firstNote}</p>
      </section>
      <p className="page-note">{t.malay}</p>
    </Page>
  );
}
