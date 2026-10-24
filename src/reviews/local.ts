import { create } from "zustand";
import { practiceCompleted, usePractice } from "../learning/store";
import { testOutCompleted, useLocalTestOut } from "../learning/testout";
import { lessons } from "../lib/curriculum";
import { z } from "../lib/zod-config";
import { type Schedule, sm2 } from "./algorithms";
export const vocabulary = lessons.flatMap((lesson) =>
  lesson.items
    .filter((item) => item.kind === "vocabulary")
    .map((item) => ({ ...item, lessonId: lesson.id })),
);
export type Word = (typeof vocabulary)[number];
export type Modality = "meaning" | "listening" | "tone" | "hanzi";
export type ReviewCard = {
  word_id: string;
  slug: string;
  hanzi: string;
  pinyin: string;
  meaning_ms: string;
  modality: Modality;
  schedule: Schedule;
};
const eventSchema = z.object({
  id: z.uuid(),
  scope: z.literal("practice"),
  word_id: z.string(),
  modality: z.enum(["meaning", "listening", "tone", "hanzi"]),
  correct: z.boolean(),
  hints: z.number().int().min(0).max(2),
  createdAt: z.iso.datetime(),
  schedule: z.object({
    ease_factor: z.number().min(1.3).max(5),
    repetitions: z.number().int().nonnegative(),
    interval_days: z.number().int().min(0).max(36500),
    due_at: z.iso.datetime(),
    version: z.number().int().nonnegative(),
  }),
});
export type LocalReview = z.infer<typeof eventSchema>;
function read() {
  try {
    return z
      .array(eventSchema)
      .max(5000)
      .parse(JSON.parse(localStorage.getItem("bm-review-practice") || "[]"));
  } catch {
    return [];
  }
}
export const useLocalReviews = create<{
  events: LocalReview[];
  stored: boolean;
  add: (card: ReviewCard, correct: boolean, hints: number, id: string) => void;
}>((set, get) => ({
  events: read(),
  stored: true,
  add(card, correct, hints, id) {
    const event: LocalReview = {
      id,
      scope: "practice",
      word_id: card.word_id,
      modality: card.modality,
      correct,
      hints,
      createdAt: new Date().toISOString(),
      schedule: sm2(card.schedule, correct, hints),
    };
    const events = [
      ...get().events.filter((old) => old.id !== id),
      event,
    ].slice(-5000);
    let stored = true;
    try {
      localStorage.setItem("bm-review-practice", JSON.stringify(events));
    } catch {
      stored = false;
    }
    set({ events, stored });
  },
}));
export function localCards(events: LocalReview[], now = Date.now()) {
  const done = [
    ...practiceCompleted(usePractice.getState().events),
    ...testOutCompleted(useLocalTestOut.getState().events),
  ];
  return vocabulary
    .filter((word) => done.includes(word.lessonId))
    .flatMap((word) =>
      (["meaning", "listening", "tone", "hanzi"] as const).map((modality) => {
        const old = events
          .filter(
            (event) => event.word_id === word.id && event.modality === modality,
          )
          .at(-1);
        return {
          word_id: word.id,
          slug: word.id,
          hanzi: word.hanzi,
          pinyin: word.pinyin,
          meaning_ms: word.meaning_ms,
          modality,
          schedule: old?.schedule ?? {
            ease_factor: 2.5,
            repetitions: 0,
            interval_days: 0,
            due_at: new Date(now).toISOString(),
            version: 0,
          },
        };
      }),
    )
    .filter((card) => Date.parse(card.schedule.due_at) <= now)
    .sort((a, b) => a.schedule.ease_factor - b.schedule.ease_factor);
}
export function reviewAnswer(card: ReviewCard) {
  return card.modality === "meaning"
    ? card.meaning_ms
    : card.modality === "hanzi"
      ? card.hanzi
      : card.pinyin;
}
