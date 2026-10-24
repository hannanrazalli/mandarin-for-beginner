import { create } from "zustand";
import { canonicalAnswer, getLesson, type Lesson } from "../lib/curriculum";
import { z } from "../lib/zod-config";
export const PRACTICE_KEY = "bm-learning-practice";
export const answerSchema = z.object({
  item_id: z.string().max(80),
  answer: z.string().max(2000),
});
export const learningEventSchema = z.object({
  id: z.uuid(),
  scope: z.string().min(1).max(100).default("practice"),
  lessonId: z.string().max(80),
  contentVersion: z.number().int().positive(),
  answers: z.array(answerSchema).max(20),
  createdAt: z.iso.datetime(),
  durationSeconds: z.number().int().min(0).max(600),
});
export type LearningEvent = z.infer<typeof learningEventSchema>;
export function scoreLesson(lesson: Lesson, answers: LearningEvent["answers"]) {
  const correct = lesson.items.filter(
    (item) =>
      answers.find((answer) => answer.item_id === item.id)?.answer ===
      canonicalAnswer(item),
  ).length;
  const accuracy = correct / lesson.items.length;
  return {
    correct,
    total: lesson.items.length,
    accuracy,
    completed: accuracy >= 0.8,
  };
}
export function recordFirstAnswer(
  answers: LearningEvent["answers"],
  item_id: string,
  answer: string,
) {
  return answers.some((value) => value.item_id === item_id)
    ? answers
    : [...answers, { item_id, answer }];
}
export function readPractice(storage: Pick<Storage, "getItem">) {
  try {
    const parsed = z
      .array(learningEventSchema)
      .max(1000)
      .parse(JSON.parse(storage.getItem(PRACTICE_KEY) || "[]"));
    return parsed.filter((event) => {
      const lesson = getLesson(event.lessonId);
      return (
        event.scope === "practice" &&
        lesson &&
        event.contentVersion === lesson.content_version &&
        event.answers.length === lesson.items.length &&
        new Set(event.answers.map((answer) => answer.item_id)).size ===
          lesson.items.length &&
        event.answers.every((answer) =>
          lesson.items.some((item) => item.id === answer.item_id),
        )
      );
    });
  } catch {
    return [];
  }
}
let initial: LearningEvent[] = [];
try {
  initial = readPractice(localStorage);
} catch {
  /* Session-only practice remains available. */
}
export const usePractice = create<{
  events: LearningEvent[];
  stored: boolean;
  add: (event: LearningEvent) => void;
}>((set, get) => ({
  events: initial,
  stored: true,
  add(event) {
    if (event.scope !== "practice") return;
    const events = [
      ...get().events.filter((old) => old.id !== event.id),
      event,
    ].slice(-1000);
    let stored = true;
    try {
      localStorage.setItem(PRACTICE_KEY, JSON.stringify(events));
    } catch {
      stored = false;
    }
    set({ events, stored });
  },
}));
export function practiceCompleted(events: LearningEvent[]) {
  return [
    ...new Set(
      events
        .filter((event) => {
          const lesson = getLesson(event.lessonId);
          return lesson && scoreLesson(lesson, event.answers).completed;
        })
        .map((event) => event.lessonId),
    ),
  ];
}
export type LessonStage = "flash" | "question" | "feedback" | "result";
type PlayerState = {
  scope: string | null;
  slug: string | null;
  index: number;
  stage: LessonStage;
  revealed: boolean;
  answers: LearningEvent["answers"];
  picked: string | null;
  correct: boolean;
  startedAt: number;
  event: LearningEvent | null;
  start: (slug: string, scope?: string) => void;
  reveal: () => void;
  question: () => void;
  answer: (itemId: string, value: string, correct: boolean) => void;
  retry: () => void;
  next: () => void;
  finish: (event: LearningEvent) => void;
  clear: () => void;
};
export const useLessonPlayer = create<PlayerState>((set) => ({
  scope: null,
  slug: null,
  index: 0,
  stage: "flash",
  revealed: false,
  answers: [],
  picked: null,
  correct: false,
  startedAt: 0,
  event: null,
  start: (slug, scope = "practice") =>
    set({
      slug,
      scope,
      index: 0,
      stage: "flash",
      revealed: false,
      answers: [],
      picked: null,
      event: null,
      startedAt: Date.now(),
    }),
  reveal: () => set({ revealed: true }),
  question: () => set({ stage: "question" }),
  answer: (itemId, value, correct) =>
    set((state) => ({
      answers: recordFirstAnswer(state.answers, itemId, value),
      picked: value,
      correct,
      stage: "feedback",
    })),
  retry: () => set({ stage: "question", picked: null }),
  next: () =>
    set((state) => ({
      index: state.index + 1,
      stage: "flash",
      revealed: false,
      picked: null,
    })),
  finish: (event) =>
    set((state) =>
      event.scope === state.scope ? { event, stage: "result" } : {},
    ),
  clear: () =>
    set({
      scope: null,
      slug: null,
      answers: [],
      event: null,
      stage: "flash",
      index: 0,
    }),
}));
