import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Page } from "../components/Page";
import { AudioSource } from "../learning/AudioSource";
import { useMandarinAudio } from "../learning/audio";
import { type Language, useSettings } from "../lib/settings";
import { useReviewData } from "../reviews/cloud";
import {
  type Contrast,
  type Dialogue,
  dailyMission,
  practice,
  type Utterance,
} from "./content";
import Recorder from "./Recorder";
import { normalizeDictation } from "./scoring";

const pick = (ms: boolean, a: string, b: string) => (ms ? a : b);
function useGoal() {
  const data = useReviewData();
  let local = 5;
  try {
    const value = Number(localStorage.getItem("bm-daily-goal"));
    if (value === 3 || value === 10) local = value;
  } catch {}
  return data.progress.owner ? (data.query.data?.goal ?? 5) : local;
}
export default function Practice() {
  const language = useSettings().language,
    ms = language === "ms",
    goal = useGoal();
  const [selected, setSelected] = useState<{
    kind: "dialogue" | "contrast";
    index: number;
    mission: boolean;
  } | null>(null);
  const [finished, setFinished] = useState(false);
  const returnFocus = useRef<string | null>(null);
  useEffect(() => {
    if (!selected && returnFocus.current) {
      document.getElementById(returnFocus.current)?.focus();
      returnFocus.current = null;
    }
  }, [selected]);
  const mission = dailyMission(goal);
  const dayNumber = Math.floor((Date.now() + 8 * 3600000) / 86400000);
  const dailyDialogue = dayNumber % practice.dialogues.length;
  const dailyContrasts = Array.from(
    { length: mission.contrasts },
    (_, i) => (dayNumber + i) % practice.listening_contrasts.length,
  );
  return (
    <Page
      eyebrow={pick(ms, "Taman latihan", "Practice garden")}
      title={pick(
        ms,
        "Dengar. Balas. Cuba sendiri.",
        "Listen. Respond. Try it yourself.",
      )}
      description={pick(ms, practice.intro_ms, practice.intro_en)}
    >
      <p className="mode-label">
        {pick(
          ms,
          "Latihan tambahan setempat • tiada XP, rentetan, pemarkahan sebutan atau penyegerakan.",
          "Local extra practice • no XP, streak, pronunciation scoring or syncing.",
        )}
      </p>
      <p className="notice">
        {pick(
          ms,
          "Bahan dan audio belum disahkan oleh pengajar. Gunakan sebagai latihan kendiri.",
          "Content and audio have not been verified by a teacher. Use for self-study practice.",
        )}
      </p>
      {selected ? (
        <>
          <button
            className="button secondary"
            type="button"
            onClick={() => {
              returnFocus.current = selected.mission
                ? "practice-mission"
                : `practice-${selected.kind}-${selected.index}`;
              setSelected(null);
              setFinished(false);
            }}
          >
            {pick(ms, "Kembali ke taman latihan", "Back to practice garden")}
          </button>
          {selected.kind === "dialogue" ? (
            <DialoguePractice
              key={`d${selected.index}`}
              dialogue={practice.dialogues[selected.index]}
              language={language}
              limit={selected.mission ? mission.dialogueTurns : 99}
              onFinish={() => setFinished(true)}
            />
          ) : (
            <ContrastPractice
              key={`c${selected.index}`}
              contrast={practice.listening_contrasts[selected.index]}
              language={language}
              onFinish={() => setFinished(true)}
            />
          )}{" "}
          {finished && selected.mission && (
            <section className="notice">
              <h2>
                {pick(ms, "Bahagian ini selesai", "This part is complete")}
              </h2>
              <p>
                {pick(
                  ms,
                  "Teruskan dengan cabaran mendengar ringkas, atau berhenti di sini.",
                  "Continue with a short listening challenge, or stop here.",
                )}
              </p>
              {dailyContrasts.map((contrastIndex, i) => (
                <button
                  key={practice.listening_contrasts[contrastIndex].id}
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setSelected({
                      kind: "contrast",
                      index: contrastIndex,
                      mission: true,
                    });
                    setFinished(false);
                  }}
                >
                  {pick(ms, "Cabaran", "Challenge")} {i + 1}
                </button>
              ))}
            </section>
          )}
        </>
      ) : (
        <>
          <section className="daily-mission">
            <div>
              <p className="eyebrow">
                {pick(ms, "Laluan hari ini", "Today's route")}
              </p>
              <h2>
                {goal}{" "}
                {pick(
                  ms,
                  "minit mengikut sasaran anda",
                  "minutes based on your goal",
                )}
              </h2>
              <p>
                {pick(
                  ms,
                  "Cadangan masa, bukan ujian tahap: ulang kaji dahulu, kemudian dialog dan dengar beza.",
                  "A suggested time budget, not a level assessment: review first, then a dialogue and sound contrast.",
                )}
              </p>
            </div>
            <ol>
              <li>
                <Link className="text-link" to="/ulang-kaji">
                  {pick(
                    ms,
                    "Buka ulang kaji yang tiba masa",
                    "Open due reviews",
                  )}
                </Link>
              </li>
              <li>
                {pick(
                  ms,
                  "Baca dan balas dialog",
                  "Read and respond to a dialogue",
                )}
              </li>
              <li>
                {mission.contrasts}{" "}
                {pick(
                  ms,
                  "cabaran mendengar ringkas",
                  "short listening challenges",
                )}
              </li>
            </ol>
            <button
              id="practice-mission"
              type="button"
              className="button primary"
              onClick={() =>
                setSelected({
                  kind: "dialogue",
                  index: dailyDialogue,
                  mission: true,
                })
              }
            >
              {pick(ms, "Mulakan misi ringkas", "Start short mission")}
            </button>
          </section>
          <h2>
            {pick(ms, "Lima perbualan harian", "Five everyday conversations")}
          </h2>
          <div className="practice-grid">
            {practice.dialogues.map((dialogue, index) => (
              <button
                id={`practice-dialogue-${index}`}
                className="practice-tile"
                type="button"
                key={dialogue.id}
                onClick={() =>
                  setSelected({ kind: "dialogue", index, mission: false })
                }
              >
                <span className="eyebrow">
                  0{index + 1} · 4 {pick(ms, "minit", "min")}
                </span>
                <strong>
                  {pick(ms, dialogue.title_ms, dialogue.title_en)}
                </strong>
                <span>
                  {pick(ms, dialogue.context_ms, dialogue.context_en)}
                </span>
                <span className="text-link">
                  {pick(ms, "Buka dialog →", "Open dialogue →")}
                </span>
              </button>
            ))}
          </div>
          <h2>
            {pick(
              ms,
              "Dengar beza & imlak pinyin",
              "Sound contrasts & pinyin dictation",
            )}
          </h2>
          <div className="practice-grid">
            {practice.listening_contrasts.map((contrast, index) => (
              <button
                id={`practice-contrast-${index}`}
                className="practice-tile"
                type="button"
                key={contrast.id}
                onClick={() =>
                  setSelected({ kind: "contrast", index, mission: false })
                }
              >
                <strong>
                  {pick(ms, contrast.title_ms, contrast.title_en)}
                </strong>
                <span>{pick(ms, contrast.focus_ms, contrast.focus_en)}</span>
                <span className="text-link">
                  {pick(ms, "Cuba cabaran →", "Try challenge →")}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </Page>
  );
}
function UtteranceCard({
  value,
  language,
}: {
  value: Utterance;
  language: Language;
}) {
  const audio = useMandarinAudio(value.audio.text);
  const ms = language === "ms";
  return (
    <div className="utterance-card">
      <p className="practice-hanzi" lang="zh-CN">
        {value.hanzi}
      </p>
      <p className="pinyin" lang="zh-Latn">
        {value.pinyin}
      </p>
      <p className="flash-meaning">
        {pick(ms, value.meaning_ms, value.meaning_en)}
      </p>
      <div className="audio-controls">
        <button
          type="button"
          className="button secondary"
          disabled={!audio.available}
          onClick={() => audio.play(value.audio.text)}
        >
          {pick(ms, "Dengar", "Listen")}
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={!audio.available}
          onClick={() => audio.play(value.audio.text, value.audio.slow_rate)}
        >
          {pick(ms, "Perlahan", "Slow")}
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={audio.state !== "playing"}
          onClick={audio.stop}
        >
          {pick(ms, "Henti", "Stop")}
        </button>
      </div>
      <AudioSource
        source={audio.source}
        language={language}
        error={audio.state === "error"}
        recordingFailed={audio.recordingFailed}
      />
    </div>
  );
}
function DialoguePractice({
  dialogue,
  language,
  limit,
  onFinish,
}: {
  dialogue: Dialogue;
  language: Language;
  limit: number;
  onFinish: () => void;
}) {
  const ms = language === "ms",
    heading = useRef<HTMLHeadingElement>(null);
  const firstResponse = useRef<HTMLButtonElement>(null);
  const [retryFocus, setRetryFocus] = useState(0);
  useEffect(() => {
    if (retryFocus > 0) firstResponse.current?.focus();
  }, [retryFocus]);
  const [stage, setStage] = useState<"read" | "respond" | "recall">("read"),
    [turn, setTurn] = useState(0),
    [question, setQuestion] = useState(0),
    [answer, setAnswer] = useState<string | null>(null),
    [recall, setRecall] = useState(false);
  const firstQuestionTurn =
    dialogue.turns.findIndex(
      (t) => t.id === dialogue.questions[0].after_turn_id,
    ) + 1;
  const turns = dialogue.turns.slice(0, Math.max(limit, firstQuestionTurn));
  const questions = dialogue.questions.filter((value) =>
    turns.some((t) => t.id === value.after_turn_id),
  );
  const q = questions[question];
  useEffect(() => {
    if (stage && question >= 0 && turn >= 0) heading.current?.focus();
  }, [stage, question, turn]);
  function restart() {
    setStage("read");
    setTurn(0);
    setQuestion(0);
    setAnswer(null);
    setRecall(false);
    heading.current?.focus();
  }
  return (
    <section className="practice-session">
      <h2 ref={heading} tabIndex={-1}>
        {pick(ms, dialogue.title_ms, dialogue.title_en)}
      </h2>
      <p className="eyebrow">
        {stage === "read"
          ? pick(ms, "1 · Dengar / baca", "1 · Listen / read")
          : stage === "respond"
            ? pick(ms, "2 · Pilih balasan", "2 · Choose a response")
            : pick(
                ms,
                "3 · Ingat & cakap sendiri",
                "3 · Recall & speak yourself",
              )}
      </p>
      {stage === "read" ? (
        <>
          <p>{pick(ms, dialogue.context_ms, dialogue.context_en)}</p>
          <p>
            {pick(ms, turns[turn].speaker_ms, turns[turn].speaker_en)} ·{" "}
            {turn + 1}/{turns.length}
          </p>
          <UtteranceCard key={turn} value={turns[turn]} language={language} />
          <button
            type="button"
            className="button primary"
            onClick={() =>
              turn + 1 < turns.length ? setTurn(turn + 1) : setStage("respond")
            }
          >
            {turn + 1 < turns.length
              ? pick(ms, "Ayat seterusnya", "Next line")
              : pick(ms, "Cuba balas", "Try responding")}
          </button>
        </>
      ) : stage === "respond" ? (
        <>
          <p className="practice-prompt">
            {pick(ms, q.prompt_ms, q.prompt_en)}
          </p>
          <p>
            {pick(
              ms,
              "Pilih balasan yang sesuai. Maksud ditunjukkan selepas anda menjawab.",
              "Choose a suitable response. Meanings appear after you answer.",
            )}
          </p>
          <div className="answer-options">
            {q.options.map((option, index) => (
              <button
                ref={index === 0 ? firstResponse : undefined}
                className="answer-option"
                type="button"
                key={option.id}
                disabled={answer !== null}
                onClick={() => setAnswer(option.id)}
              >
                <span lang="zh-CN">{option.hanzi}</span>
                <span lang="zh-Latn">{option.pinyin}</span>
                {answer !== null && (
                  <span>{pick(ms, option.meaning_ms, option.meaning_en)}</span>
                )}
              </button>
            ))}
          </div>
          {answer !== null && (
            <div className="notice" role="status">
              <strong>
                {answer === q.correct_option_id
                  ? pick(ms, "Sesuai!", "That fits!")
                  : pick(
                      ms,
                      "Cuba perhatikan konteks.",
                      "Look at the context again.",
                    )}
              </strong>
              <p>{pick(ms, q.feedback_ms, q.feedback_en)}</p>
              {answer !== q.correct_option_id ? (
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => {
                    setAnswer(null);
                    setRetryFocus((value) => value + 1);
                  }}
                >
                  {pick(ms, "Cuba lagi", "Try again")}
                </button>
              ) : (
                <button
                  className="button primary"
                  type="button"
                  onClick={() => {
                    setAnswer(null);
                    if (question + 1 < questions.length)
                      setQuestion(question + 1);
                    else {
                      setStage("recall");
                    }
                  }}
                >
                  {pick(ms, "Seterusnya", "Next")}
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <p>
            {pick(
              ms,
              "Tanpa melihat teks, cuba ucapkan satu balasan yang sesuai. Ini latihan kendiri, bukan ujian sebutan.",
              "Without looking at the text, say one suitable response. This is self-practice, not a pronunciation test.",
            )}
          </p>
          <button
            className="button secondary"
            type="button"
            onClick={() => setRecall(!recall)}
          >
            {recall
              ? pick(ms, "Sembunyikan contoh", "Hide example")
              : pick(ms, "Semak contoh balasan", "Check sample response")}
          </button>
          {recall && (
            <UtteranceCard
              value={
                dialogue.questions[0].options.find(
                  (o) => o.id === dialogue.questions[0].correct_option_id,
                ) ?? dialogue.turns[0]
              }
              language={language}
            />
          )}
          <button type="button" className="button primary" onClick={onFinish}>
            {pick(
              ms,
              "Saya sudah cuba mengingat dan bercakap",
              "I tried recalling and speaking",
            )}
          </button>
          <Recorder language={language} />
          {dialogue.grammar_notes.map((note) => (
            <p key={note.id} className="notice">
              {pick(ms, note.text_ms, note.text_en)}
            </p>
          ))}
        </>
      )}
      <button type="button" className="button secondary" onClick={restart}>
        {pick(ms, "Mula semula dialog", "Restart dialogue")}
      </button>
    </section>
  );
}
function ContrastPractice({
  contrast,
  language,
  onFinish,
}: {
  contrast: Contrast;
  language: Language;
  onFinish: () => void;
}) {
  const contrastHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    contrastHeading.current?.focus();
  }, []);
  const ms = language === "ms",
    target =
      contrast.options.find(
        (option) => option.id === contrast.target_option_id,
      ) ?? contrast.options[0];
  const audio = useMandarinAudio(target.audio.text);
  const [mode, setMode] = useState<"choice" | "dictation">("choice"),
    [answer, setAnswer] = useState(""),
    [result, setResult] = useState<boolean | null>(null),
    [read, setRead] = useState(false);
  const reading = read || !audio.available || audio.state === "error";
  function reset() {
    audio.stop();
    setAnswer("");
    setResult(null);
    setRead(false);
  }
  return (
    <section className="practice-session">
      <h2 ref={contrastHeading} tabIndex={-1}>
        {pick(ms, contrast.title_ms, contrast.title_en)}
      </h2>
      <p>{pick(ms, contrast.focus_ms, contrast.focus_en)}</p>
      <div className="exercise-tabs">
        {(["choice", "dictation"] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={`button ${mode === value ? "primary" : "secondary"}`}
            aria-pressed={mode === value}
            onClick={() => {
              setMode(value);
              reset();
            }}
          >
            {value === "choice"
              ? pick(ms, "Pilih bunyi", "Choose sound")
              : pick(ms, "Imlak pinyin", "Pinyin dictation")}
          </button>
        ))}
      </div>
      <p>
        {reading
          ? pick(
              ms,
              "Mod membaca: lihat hanzi dan taip pinyin atau pilih padanannya. Ini bukan ujian mendengar.",
              "Reading mode: look at the hanzi and type pinyin or choose its match. This is not a listening test.",
            )
          : pick(ms, contrast.prompt_ms, contrast.prompt_en)}
      </p>
      {reading && (
        <p className="practice-hanzi" lang="zh-CN">
          {target.hanzi}
        </p>
      )}
      <div className="audio-controls">
        <button
          className="button primary"
          type="button"
          disabled={!audio.available}
          onClick={() => audio.play(target.audio.text)}
        >
          {pick(ms, "Dengar sasaran", "Listen to target")}
        </button>
        <button
          className="button secondary"
          type="button"
          disabled={!audio.available}
          onClick={() => audio.play(target.audio.text, 0.7)}
        >
          {pick(ms, "Perlahan", "Slow")}
        </button>
        <button
          className="button secondary"
          type="button"
          disabled={audio.state !== "playing"}
          onClick={audio.stop}
        >
          {pick(ms, "Henti", "Stop")}
        </button>
        {!reading && (
          <button
            className="button secondary"
            type="button"
            onClick={() => {
              audio.stop();
              setRead(true);
            }}
          >
            {pick(ms, "Guna mod membaca", "Use reading mode")}
          </button>
        )}
      </div>
      <AudioSource
        source={audio.source}
        language={language}
        error={audio.state === "error"}
        recordingFailed={audio.recordingFailed}
      />
      {mode === "choice" ? (
        <div className="answer-options">
          {contrast.options.map((option) => (
            <button
              className="answer-option"
              key={option.id}
              type="button"
              disabled={result !== null}
              onClick={() => {
                setAnswer(option.id);
                setResult(option.id === target.id);
                if (option.id === target.id) onFinish();
              }}
              lang="zh-Latn"
            >
              {option.pinyin}
            </button>
          ))}
        </div>
      ) : (
        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            const correct =
              normalizeDictation(answer) === normalizeDictation(target.pinyin);
            setResult(correct);
            if (correct) onFinish();
          }}
        >
          <label htmlFor="dictation-answer">
            {pick(
              ms,
              "Taip pinyin dengan tanda nada atau nombor nada",
              "Type pinyin with tone marks or tone numbers",
            )}
          </label>
          <input
            id="dictation-answer"
            value={answer}
            maxLength={200}
            onChange={(event) => setAnswer(event.target.value)}
            disabled={result !== null}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          <button
            className="button primary"
            type="submit"
            disabled={!answer.trim() || result !== null}
          >
            {pick(ms, "Semak", "Check")}
          </button>
        </form>
      )}
      {result !== null && (
        <div className="notice" role="status">
          <strong>
            {result
              ? pick(ms, "Betul!", "Correct!")
              : pick(
                  ms,
                  "Belum tepat — dengar atau baca semula.",
                  "Not quite — listen or read again.",
                )}
          </strong>
          <UtteranceCard value={target} language={language} />
          <p>{pick(ms, contrast.feedback_ms, contrast.feedback_en)}</p>
        </div>
      )}
      <button type="button" className="button secondary" onClick={reset}>
        {pick(ms, "Mula semula cabaran", "Restart challenge")}
      </button>
    </section>
  );
}
