import HanziWriter from "hanzi-writer";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Page } from "../components/Page";
import { useLearningProgress } from "../learning/cloud";
import { lessons } from "../lib/curriculum";
import { localizedExample, localizedMeaning } from "../lib/localization";
import { useSettings } from "../lib/settings";
import { z } from "../lib/zod-config";
import { normalizePinyin } from "./algorithms";
import { reviewCopy } from "./copy";
import { useLocalReviews, vocabulary } from "./local";
export default function Exercises() {
  const language = useSettings().language;
  const t = reviewCopy(language);
  const progress = useLearningProgress();
  const reviews = useLocalReviews((state) => state.events);
  const weak = new Set(
    reviews.filter((event) => !event.correct).map((event) => event.word_id),
  );
  const words = vocabulary
    .filter((word) => progress.completed.includes(word.lessonId))
    .sort((a, b) => Number(weak.has(b.id)) - Number(weak.has(a.id)));
  const [tab, setTab] = useState("typing");
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [pairs, setPairs] = useState<string[]>([]);
  const [ordered, setOrdered] = useState<number[]>([]);
  const word = words[index % Math.max(words.length, 1)];
  const foundation = lessons[0].items[index % lessons[0].items.length];
  const current = word ?? foundation;
  const tokens = word?.example.pinyin.split(/\s+/) ?? [];
  function reset() {
    setAnswer("");
    setFeedback(null);
    setOrdered([]);
    setPicked(null);
    setPairs([]);
  }
  return (
    <Page eyebrow={t.practice} title={t.practice}>
      <p className="mode-label">{t.noXP}</p>
      <div className="exercise-tabs">
        {[
          ["typing", t.typing],
          ["match", t.match],
          ["order", t.order],
          ["strokes", t.strokes],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`button ${tab === value ? "primary" : "secondary"}`}
            onClick={() => {
              setTab(value);
              reset();
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <section className="exercise-card">
        {progress.verifying ? (
          <p>{t.load}</p>
        ) : tab === "typing" ? (
          <>
            <h2 className="lesson-hanzi" lang="zh-CN">
              {current.hanzi}
            </h2>
            <form
              className="auth-form review-form"
              onSubmit={(event) => {
                event.preventDefault();
                setFeedback(
                  normalizePinyin(answer) === normalizePinyin(current.pinyin),
                );
              }}
            >
              <label htmlFor="pinyin-answer">{t.pinyin}</label>
              <input
                id="pinyin-answer"
                value={answer}
                maxLength={200}
                onChange={(event) => setAnswer(event.target.value)}
              />
              <fieldset className="tone-keyboard">
                <legend>{t.toneKeys}</legend>
                {[..."āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü"].map((char) => (
                  <button
                    type="button"
                    key={char}
                    onClick={() => setAnswer((value) => value + char)}
                  >
                    {char}
                  </button>
                ))}
              </fieldset>
              <button type="submit" className="button primary">
                {t.check}
              </button>
            </form>
          </>
        ) : !word ? (
          <p>{t.noWords}</p>
        ) : tab === "match" ? (
          <div className="match-grid">
            <div>
              {words.slice(0, 4).map((value) => (
                <button
                  className="answer-option"
                  type="button"
                  key={value.id}
                  disabled={pairs.includes(value.id)}
                  aria-pressed={picked === value.id}
                  onClick={() => setPicked(value.id)}
                  lang="zh-CN"
                >
                  {value.hanzi}
                </button>
              ))}
            </div>
            <div>
              {words
                .slice(0, 4)
                .reverse()
                .map((value) => (
                  <button
                    className="answer-option"
                    type="button"
                    key={value.id}
                    disabled={pairs.includes(value.id)}
                    onClick={() => {
                      if (picked === value.id) {
                        setPairs((old) => [...old, value.id]);
                        setFeedback(true);
                      } else setFeedback(false);
                      setPicked(null);
                    }}
                  >
                    {localizedMeaning(value, language)}
                  </button>
                ))}
            </div>
          </div>
        ) : tab === "order" ? (
          <>
            <p>{localizedExample(word, language)}</p>
            <p className="pinyin">
              {ordered.map((value) => tokens[value]).join(" ") || "…"}
            </p>
            <div className="result-actions">
              {tokens
                .map((token, i) => ({ token, i }))
                .reverse()
                .map(({ token, i }) => (
                  <button
                    className="button secondary"
                    type="button"
                    key={`${i}-${token}`}
                    disabled={ordered.includes(i)}
                    onClick={() => setOrdered((old) => [...old, i])}
                  >
                    {token}
                  </button>
                ))}
            </div>
            <button
              className="button primary"
              type="button"
              onClick={() =>
                setFeedback(
                  ordered.map((value) => tokens[value]).join(" ") ===
                    word.example.pinyin,
                )
              }
            >
              {t.check}
            </button>
          </>
        ) : (
          <Strokes character={Array.from(word.hanzi)[0]} />
        )}{" "}
        {feedback !== null && (
          <p role="status">{feedback ? t.correct : t.wrong}</p>
        )}
        <div className="result-actions">
          <button className="button secondary" type="button" onClick={reset}>
            {t.again}
          </button>
          <button
            className="button primary"
            type="button"
            onClick={() => {
              setIndex((value) => value + 1);
              reset();
            }}
          >
            {t.next}
          </button>
        </div>
      </section>
    </Page>
  );
}
function Strokes({ character }: { character: string }) {
  const t = reviewCopy(useSettings().language);
  const target = useRef<HTMLDivElement>(null);
  const writer = useRef<HanziWriter | null>(null);
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const node = target.current;
    if (!node) return;
    node.replaceChildren();
    setFailed(false);
    const controller = new AbortController();
    writer.current = HanziWriter.create(node, character, {
      width: 240,
      height: 240,
      padding: 14,
      showCharacter: false,
      showOutline: true,
      strokeColor: "#246B55",
      strokeAnimationSpeed: reduced ? 1000 : 1,
      delayBetweenStrokes: reduced ? 0 : 250,
      charDataLoader: (_char, onLoad, onError) => {
        void fetch(`/strokes/${encodeURIComponent(character)}.json`, {
          signal: controller.signal,
          cache: "no-store",
        })
          .then((response) => {
            if (!response.ok) throw new Error("Missing strokes");
            return response.json();
          })
          .then((value) => {
            const parsed = z
              .object({
                strokes: z.array(z.string()),
                medians: z.array(z.array(z.array(z.number()))),
              })
              .parse(value);
            onLoad(parsed);
          })
          .catch(() => {
            if (!controller.signal.aborted) {
              setFailed(true);
              onError();
            }
          });
      },
    });
    return () => {
      controller.abort();
      writer.current?.cancelQuiz();
      node.replaceChildren();
    };
  }, [character, reduced]);
  return (
    <>
      <div
        role="img"
        className="stroke-stage"
        ref={target}
        aria-label={`${t.strokes}: ${character}`}
      />
      <button
        type="button"
        className="button primary"
        disabled={failed}
        onClick={() => void writer.current?.animateCharacter()}
      >
        {t.animate}
      </button>
      <p className="voice-note">{failed ? t.noStroke : t.strokeNote}</p>
    </>
  );
}
