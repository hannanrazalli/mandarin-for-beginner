import { z } from "zod";

const text = z.string().min(1).max(2000);
const id = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80);
const audio = z.object({
  text,
  lang: z.literal("zh-CN"),
  slow_rate: z.number().min(0.5).max(1),
  needs_audio_review: z.boolean(),
  asset_path: z
    .string()
    .regex(/^\/audio\/[a-zA-Z0-9_/-]+\.(mp3|ogg|wav)$/)
    .optional(),
  license: text.optional(),
});
const common = {
  id,
  pinyin: text,
  tone_note_ms: text,
  source: text,
  needs_review: z.boolean(),
  audio,
};
const pronunciation = z.object({
  ...common,
  kind: z.literal("pronunciation"),
  focus: z.enum([
    "initials",
    "finals",
    "syllables",
    "tones",
    "tone_pairs",
    "sandhi",
  ]),
  hanzi: text.optional(),
  explanation_ms: text,
  tones: z.array(z.number().int().min(0).max(4)).max(2),
});
const vocabulary = z.object({
  ...common,
  kind: z.literal("vocabulary"),
  hanzi: text,
  meaning_ms: text,
  example: z.object({ hanzi: text, pinyin: text, meaning_ms: text }),
  topic: text,
  hsk_level: z.number().int().min(1).max(9).nullable(),
  hsk_edition: text.nullable(),
});
export const lessonSchema = z.object({
  schema_version: z.literal(1),
  content_version: z.number().int().positive(),
  id,
  unit: z.number().int().min(0),
  title_ms: text,
  duration_seconds: z.number().int().min(30).max(600),
  items: z
    .array(z.discriminatedUnion("kind", [pronunciation, vocabulary]))
    .min(1)
    .max(20),
});
export type Lesson = z.infer<typeof lessonSchema>;
export type LearningItem = Lesson["items"][number];
const indexSchema = z.object({
  schema_version: z.literal(1),
  hsk_edition: text,
  units: z.array(
    z.object({
      id,
      position: z.number().int().min(0),
      title_ms: text,
      title_en: text,
      lesson_ids: z.array(id),
    }),
  ),
});
const rawIndex = import.meta.glob("/content/index.json", {
  eager: true,
  import: "default",
});
export const curriculum = indexSchema.parse(rawIndex["/content/index.json"]);
const rawLessons = import.meta.glob("/content/lessons/*.json", {
  eager: true,
  import: "default",
});
const byId = new Map(
  Object.values(rawLessons).map((raw) => {
    const lesson = lessonSchema.parse(raw);
    return [lesson.id, lesson] as const;
  }),
);
export const lessons = curriculum.units.flatMap((unit) =>
  unit.lesson_ids.map((slug) => {
    const lesson = byId.get(slug);
    if (!lesson) throw new Error("Curriculum asset missing");
    return lesson;
  }),
);
export function getLesson(slug: string) {
  return byId.get(slug);
}
export function canonicalAnswer(item: LearningItem) {
  return item.kind === "pronunciation" ? item.pinyin : item.meaning_ms;
}
export function isLessonUnlocked(slug: string, completed: readonly string[]) {
  const index = lessons.findIndex((lesson) => lesson.id === slug);
  return (
    index >= 0 &&
    lessons.slice(0, index).every((lesson) => completed.includes(lesson.id))
  );
}
export function nextLesson(completed: readonly string[]) {
  return lessons.find((lesson) => !completed.includes(lesson.id)) ?? lessons[0];
}
export function answerOptions(item: LearningItem) {
  const answer = canonicalAnswer(item);
  const alternatives = [
    ...new Set(
      lessons
        .flatMap((l) => l.items)
        .filter((other) => other.kind === item.kind)
        .map(canonicalAnswer),
    ),
  ]
    .filter((value) => value !== answer)
    .slice(0, 3);
  const all = [answer, ...alternatives];
  const offset =
    [...item.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    all.length;
  return [...all.slice(offset), ...all.slice(0, offset)];
}
