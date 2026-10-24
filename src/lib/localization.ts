import {
  canonicalAnswer,
  type LearningItem,
  type Lesson,
  lessons,
} from "./curriculum";
import type { Language } from "./settings";
import { z } from "./zod-config";

const text = z.string().min(1).max(4000);
export const localizationSchema = z
  .object({
    lessons: z.record(z.string(), z.object({ title_en: text }).strict()),
    items: z.record(
      z.string(),
      z
        .object({
          meaning_ms: text,
          meaning_en: text,
          explanation_en: text.optional(),
          tone_note_en: text,
          example_meaning_en: text.optional(),
        })
        .strict(),
    ),
    topics: z.record(z.string(), z.object({ ms: text, en: text }).strict()),
  })
  .strict();
const assets = import.meta.glob("/content/localization.json", {
  eager: true,
  import: "default",
});
export const localization = localizationSchema.parse(
  assets["/content/localization.json"] ?? {
    lessons: {},
    items: {},
    topics: {},
  },
);
export class MissingLocalizationError extends Error {
  constructor(key: string) {
    super(`Missing localization: ${key}`);
  }
}
function required(value: string | undefined, key: string) {
  if (!value) throw new MissingLocalizationError(key);
  return value;
}
export const itemsById = new Map(
  lessons.flatMap((lesson) => lesson.items).map((item) => [item.id, item]),
);
export function localizedTitle(lesson: Lesson, language: Language) {
  return language === "ms"
    ? lesson.title_ms
    : required(
        localization.lessons[lesson.id]?.title_en,
        `lessons.${lesson.id}.title_en`,
      );
}
export function localizedMeaning(item: LearningItem, language: Language) {
  if (language === "ms" && item.kind === "vocabulary") return item.meaning_ms;
  return required(
    localization.items[item.id]?.[
      language === "ms" ? "meaning_ms" : "meaning_en"
    ],
    `items.${item.id}.meaning_${language}`,
  );
}
export function localizedExplanation(item: LearningItem, language: Language) {
  return item.kind === "pronunciation"
    ? language === "ms"
      ? item.explanation_ms
      : required(
          localization.items[item.id]?.explanation_en,
          `items.${item.id}.explanation_en`,
        )
    : localizedMeaning(item, language);
}
export function localizedTone(item: LearningItem, language: Language) {
  return language === "ms"
    ? item.tone_note_ms
    : required(
        localization.items[item.id]?.tone_note_en,
        `items.${item.id}.tone_note_en`,
      );
}
export function localizedExample(item: LearningItem, language: Language) {
  if (item.kind !== "vocabulary")
    throw new MissingLocalizationError(`items.${item.id}.example`);
  return language === "ms"
    ? item.example.meaning_ms
    : required(
        localization.items[item.id]?.example_meaning_en,
        `items.${item.id}.example_meaning_en`,
      );
}
export function localizedTopic(topic: string, language: Language) {
  return required(
    localization.topics[topic]?.[language],
    `topics.${topic}.${language}`,
  );
}
const normalized = (value: string) => value.trim().toLowerCase();
export function canonicalMeaningInput(
  item: LearningItem,
  language: Language,
  input: string,
) {
  if (item.kind !== "vocabulary")
    throw new Error("Meaning answer requires vocabulary");
  if (language === "ms") return input;
  const displayed = localizedMeaning(item, "en");
  const accepted = [
    displayed,
    ...displayed
      .split(";")
      .map((value) => value.trim())
      .filter(Boolean),
  ];
  if (accepted.some((value) => normalized(input) === normalized(value)))
    return item.meaning_ms;
  const incorrect = `[incorrect-en] ${input}`.slice(0, 2000);
  if (normalized(incorrect) !== normalized(item.meaning_ms)) return incorrect;
  return normalized(item.meaning_ms) === "!" ? "!!" : "!";
}
export function localizedOptions(item: LearningItem, language: Language) {
  const values = [
    item,
    ...lessons
      .flatMap((lesson) => lesson.items)
      .filter(
        (candidate) => candidate.kind === item.kind && candidate.id !== item.id,
      ),
  ];
  const canonical = new Set<string>();
  const labels = new Set<string>();
  const choices: { canonical: string; label: string }[] = [];
  for (const candidate of values) {
    const answer = canonicalAnswer(candidate);
    const label =
      candidate.kind === "pronunciation"
        ? candidate.pinyin
        : localizedMeaning(candidate, language);
    if (canonical.has(normalized(answer)) || labels.has(normalized(label)))
      continue;
    canonical.add(normalized(answer));
    labels.add(normalized(label));
    choices.push({ canonical: answer, label });
    if (choices.length === 4) break;
  }
  const offset =
    [...item.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    choices.length;
  return [...choices.slice(offset), ...choices.slice(0, offset)];
}
export function requireItem(id: string) {
  const item = itemsById.get(id);
  if (!item) throw new MissingLocalizationError(`items.${id}`);
  return item;
}
export function validateLocalizationCoverage() {
  for (const lesson of lessons) {
    localizedTitle(lesson, "en");
    for (const item of lesson.items) {
      localizedMeaning(item, "ms");
      localizedMeaning(item, "en");
      localizedTone(item, "en");
      localizedExplanation(item, "en");
      if (item.kind === "vocabulary") {
        localizedExample(item, "en");
        localizedTopic(item.topic, "ms");
        localizedTopic(item.topic, "en");
        if (localization.items[item.id]?.meaning_ms !== item.meaning_ms)
          throw new Error(`Canonical meaning mismatch: ${item.id}`);
      }
    }
  }
}
