import { describe, expect, it } from "vitest";
import { lessons } from "./curriculum";
import {
  canonicalMeaningInput,
  localization,
  localizedExplanation,
  localizedMeaning,
  localizedOptions,
  localizedTitle,
  MissingLocalizationError,
  validateLocalizationCoverage,
} from "./localization";

const normal = (value: string) => value.trim().toLowerCase();
describe("complete bilingual content overlay", () => {
  it("covers every title, meaning, note, example and topic without an English fallback", () => {
    expect(() => validateLocalizationCoverage()).not.toThrow();
    expect(Object.keys(localization.lessons)).toHaveLength(lessons.length);
    expect(Object.keys(localization.items)).toHaveLength(
      lessons.flatMap((lesson) => lesson.items).length,
    );
  });
  it("includes sample meanings and sound explanations on Unit0 flashcards", () => {
    const item = lessons[0].items[0];
    expect(localizedMeaning(item, "ms").length).toBeGreaterThan(0);
    expect(localizedMeaning(item, "en").length).toBeGreaterThan(0);
    expect(localizedExplanation(item, "en")).not.toBe(
      item.kind === "pronunciation" ? item.explanation_ms : "",
    );
    expect(localizedTitle(lessons[0], "en")).not.toBe(lessons[0].title_ms);
  });
  it("maps an English displayed meaning to the unchanged Malay canonical answer", () => {
    const item = lessons.find((lesson) => lesson.unit === 1)?.items[0];
    if (item?.kind !== "vocabulary") throw new Error("Vocabulary fixture");
    const english = localizedMeaning(item, "en");
    expect(
      canonicalMeaningInput(item, "en", ` ${english.toUpperCase()} `),
    ).toBe(item.meaning_ms);
    const wrong = canonicalMeaningInput(item, "en", item.meaning_ms);
    expect(normal(wrong)).not.toBe(normal(item.meaning_ms));
    expect(canonicalMeaningInput(item, "ms", item.meaning_ms)).toBe(
      item.meaning_ms,
    );
  });
  it("keeps translated multiple-choice labels paired with canonical answers and avoids duplicate labels", () => {
    const item = lessons.find((lesson) => lesson.unit === 1)?.items[0];
    if (item?.kind !== "vocabulary") throw new Error("Vocabulary fixture");
    const options = localizedOptions(item, "en");
    expect(
      options.find((option) => option.canonical === item.meaning_ms)?.label,
    ).toBe(localizedMeaning(item, "en"));
    expect(new Set(options.map((option) => normal(option.label))).size).toBe(
      options.length,
    );
  });
  it("throws a clear missing-key error instead of showing Malay in English mode", () => {
    expect(() =>
      localizedTitle({ ...lessons[0], id: "missing-translation" }, "en"),
    ).toThrow(MissingLocalizationError);
  });
});

it("accepts explicitly listed English alternatives without accepting unrelated or Malay-only answers", () => {
  const item = lessons.find((lesson) => lesson.unit === 1)?.items[1];
  if (item?.kind !== "vocabulary") throw new Error("Vocabulary fixture");
  const english = localizedMeaning(item, "en");
  expect(english).toContain(";");
  expect(canonicalMeaningInput(item, "en", english.split(";")[0])).toBe(
    item.meaning_ms,
  );
  expect(canonicalMeaningInput(item, "en", "unrelated answer")).not.toBe(
    item.meaning_ms,
  );
});
