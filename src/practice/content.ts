import { z } from "../lib/zod-config";

const text = z.string().min(1).max(2000);
const reviewed = z.literal("unverified");
const audio = z
  .object({
    text,
    lang: z.literal("zh-CN"),
    slow_rate: z.number().min(0.5).max(1),
    needs_audio_review: z.literal(true),
  })
  .strict();
const option = z
  .object({
    id: text,
    hanzi: text,
    pinyin: text,
    meaning_ms: text,
    meaning_en: text,
    audio,
    reviewStatus: reviewed,
  })
  .strict();
const question = z
  .object({
    id: text,
    after_turn_id: text,
    prompt_ms: text,
    prompt_en: text,
    options: z.array(option).min(2).max(4),
    correct_option_id: text,
    feedback_ms: text,
    feedback_en: text,
    reviewStatus: reviewed,
  })
  .strict();
const dialogue = z
  .object({
    id: text,
    title_ms: text,
    title_en: text,
    context_ms: text,
    context_en: text,
    duration_minutes: z.literal(4),
    reviewStatus: reviewed,
    turns: z
      .array(option.extend({ speaker_ms: text, speaker_en: text }))
      .min(2)
      .max(12),
    grammar_notes: z
      .array(
        z
          .object({
            id: text,
            text_ms: text,
            text_en: text,
            reviewStatus: reviewed,
          })
          .strict(),
      )
      .max(5),
    questions: z.array(question).min(1).max(6),
  })
  .strict();
const contrast = z
  .object({
    id: text,
    title_ms: text,
    title_en: text,
    duration_seconds: z.literal(30),
    focus_ms: text,
    focus_en: text,
    prompt_ms: text,
    prompt_en: text,
    options: z.array(option).length(2),
    target_option_id: text,
    feedback_ms: text,
    feedback_en: text,
    reviewStatus: reviewed,
  })
  .strict();
export const practiceSchema = z
  .object({
    schema_version: z.literal(1),
    reviewStatus: reviewed,
    duration_minutes: z.literal(25),
    intro_ms: text,
    intro_en: text,
    dialogues: z.array(dialogue).length(5),
    listening_contrasts: z.array(contrast).length(10),
  })
  .strict()
  .superRefine((pack, ctx) => {
    const ids = [...pack.dialogues, ...pack.listening_contrasts].map(
      (item) => item.id,
    );
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: "custom", message: "Duplicate practice ID" });
    for (const item of pack.dialogues) {
      for (const q of item.questions) {
        if (
          !item.turns.some((t) => t.id === q.after_turn_id) ||
          !q.options.some((o) => o.id === q.correct_option_id) ||
          new Set(q.options.map((o) => o.id)).size !== q.options.length
        )
          ctx.addIssue({
            code: "custom",
            message: "Invalid dialogue question reference",
          });
      }
    }
    for (const item of pack.listening_contrasts) {
      if (
        !item.options.some((o) => o.id === item.target_option_id) ||
        new Set(item.options.map((o) => o.id)).size !== 2
      )
        ctx.addIssue({ code: "custom", message: "Invalid contrast target" });
    }
  });
const modules = import.meta.glob<{ default: unknown }>(
  "/content/practice-dialogues.json",
  { eager: true },
);
export const practice = practiceSchema.parse(
  Object.values(modules)[0]?.default,
);
export type Dialogue = z.infer<typeof dialogue>;
export type Contrast = z.infer<typeof contrast>;
export type Utterance = z.infer<typeof option>;
export function dailyMission(minutes: number) {
  return minutes === 3
    ? { dialogueTurns: 2, contrasts: 1 }
    : minutes === 10
      ? { dialogueTurns: 99, contrasts: 4 }
      : { dialogueTurns: 4, contrasts: 2 };
}
