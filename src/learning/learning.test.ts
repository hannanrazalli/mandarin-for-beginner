import { describe, expect, it } from "vitest";
import { canonicalAnswer, isLessonUnlocked, lessons } from "../lib/curriculum";
import { readPractice, recordFirstAnswer, scoreLesson } from "./store";

describe("canonical learning events", () => {
  it("retains the first grade when retries correct an answer", () => {
    const lesson = lessons[0];
    const first = recordFirstAnswer([], lesson.items[0].id, "wrong");
    const retried = recordFirstAnswer(
      first,
      lesson.items[0].id,
      canonicalAnswer(lesson.items[0]),
    );
    expect(retried).toEqual(first);
    const answers = lesson.items
      .slice(1)
      .reduce(
        (all, item) => recordFirstAnswer(all, item.id, canonicalAnswer(item)),
        retried,
      );
    expect(scoreLesson(lesson, answers).correct).toBe(lesson.items.length - 1);
    expect(scoreLesson(lesson, answers).completed).toBe(false);
  });
  it("requires every Unit0 lesson before vocabulary and all earlier lessons in order", () => {
    const firstVocabulary = lessons.find((lesson) => lesson.unit === 1);
    expect(firstVocabulary).toBeTruthy();
    expect(isLessonUnlocked(lessons[0].id, [])).toBe(true);
    expect(isLessonUnlocked(lessons[1].id, [])).toBe(false);
    expect(
      isLessonUnlocked(
        firstVocabulary?.id ?? "",
        lessons
          .filter((lesson) => lesson.unit === 0)
          .map((lesson) => lesson.id),
      ),
    ).toBe(true);
    expect(
      isLessonUnlocked(
        firstVocabulary?.id ?? "",
        lessons
          .filter((lesson) => lesson.unit === 0)
          .slice(1)
          .map((lesson) => lesson.id),
      ),
    ).toBe(false);
  });
  it("rejects corrupt or noncanonical device events", () => {
    expect(readPractice({ getItem: () => "{broken" })).toEqual([]);
    expect(
      readPractice({
        getItem: () =>
          JSON.stringify([
            {
              id: crypto.randomUUID(),
              scope: "practice",
              lessonId: lessons[0].id,
              contentVersion: 1,
              answers: [],
              createdAt: new Date().toISOString(),
              durationSeconds: 3,
            },
          ]),
      }),
    ).toEqual([]);
  });
  it("accepts complete canonical practice with a versioned event", () => {
    const lesson = lessons[0];
    const event = {
      id: crypto.randomUUID(),
      scope: "practice",
      lessonId: lesson.id,
      contentVersion: lesson.content_version,
      answers: lesson.items.map((item) => ({
        item_id: item.id,
        answer: canonicalAnswer(item),
      })),
      createdAt: new Date().toISOString(),
      durationSeconds: 60,
    };
    expect(readPractice({ getItem: () => JSON.stringify([event]) })).toEqual([
      event,
    ]);
    expect(scoreLesson(lesson, event.answers).accuracy).toBe(1);
  });
});
