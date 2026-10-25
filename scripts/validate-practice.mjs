import { readFile, realpath, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";

z.config({ jitless: true });
const root = resolve(import.meta.dirname, "..");
const pack = JSON.parse(
  await readFile(resolve(root, "content/practice-dialogues.json"), "utf8"),
);
const utterance = z.object({
  id: z.string().min(1),
  hanzi: z.string().min(1),
  pinyin: z.string().min(1),
  meaning_ms: z.string().min(1),
  meaning_en: z.string().min(1),
  audio: z.object({
    text: z.string().min(1),
    lang: z.literal("zh-CN"),
    slow_rate: z.number().min(0.5).max(1),
    needs_audio_review: z.literal(true),
  }),
  reviewStatus: z.literal("unverified"),
});
z.object({
  schema_version: z.literal(1),
  reviewStatus: z.literal("unverified"),
  duration_minutes: z.literal(25),
  intro_ms: z.string().min(1),
  intro_en: z.string().min(1),
  dialogues: z
    .array(
      z.object({
        id: z.string(),
        title_ms: z.string().min(1),
        title_en: z.string().min(1),
        context_ms: z.string().min(1),
        context_en: z.string().min(1),
        duration_minutes: z.literal(4),
        reviewStatus: z.literal("unverified"),
        turns: z
          .array(
            utterance.extend({
              speaker_ms: z.string().min(1),
              speaker_en: z.string().min(1),
            }),
          )
          .min(2),
        grammar_notes: z.array(
          z.object({
            id: z.string(),
            text_ms: z.string().min(1),
            text_en: z.string().min(1),
            reviewStatus: z.literal("unverified"),
          }),
        ),
        questions: z
          .array(
            z.object({
              id: z.string(),
              after_turn_id: z.string(),
              prompt_ms: z.string().min(1),
              prompt_en: z.string().min(1),
              options: z.array(utterance).min(2).max(4),
              correct_option_id: z.string(),
              feedback_ms: z.string().min(1),
              feedback_en: z.string().min(1),
              reviewStatus: z.literal("unverified"),
            }),
          )
          .min(1),
      }),
    )
    .length(5),
  listening_contrasts: z
    .array(
      z.object({
        id: z.string(),
        title_ms: z.string().min(1),
        title_en: z.string().min(1),
        duration_seconds: z.literal(30),
        focus_ms: z.string().min(1),
        focus_en: z.string().min(1),
        prompt_ms: z.string().min(1),
        prompt_en: z.string().min(1),
        options: z.array(utterance).length(2),
        target_option_id: z.string(),
        feedback_ms: z.string().min(1),
        feedback_en: z.string().min(1),
        reviewStatus: z.literal("unverified"),
      }),
    )
    .length(10),
}).parse(pack);
for (const d of pack.dialogues)
  for (const q of d.questions) {
    if (
      !d.turns.some((t) => t.id === q.after_turn_id) ||
      !q.options.some((o) => o.id === q.correct_option_id)
    )
      throw new Error("Invalid question reference");
  }
for (const c of pack.listening_contrasts)
  if (!c.options.some((o) => o.id === c.target_option_id))
    throw new Error("Invalid contrast target");
const manifest = z
  .object({
    schema_version: z.literal(1),
    clips: z
      .array(
        z
          .object({
            text: z.string().min(1).max(500),
            src: z.string().regex(/^\/audio\/[a-zA-Z0-9_-]+\.(mp3|ogg|wav)$/),
            reviewStatus: z.enum([
              "unverified",
              "machine-checked",
              "human-verified",
            ]),
            license: z.string().min(1).max(1000),
            source: z.string().min(1).max(1000),
          })
          .strict(),
      )
      .max(2000),
  })
  .strict()
  .parse(
    JSON.parse(
      await readFile(resolve(root, "public/audio/manifest.json"), "utf8"),
    ),
  );
if (new Set(manifest.clips.map((c) => c.text)).size !== manifest.clips.length)
  throw new Error("Duplicate clip text");
let bytes = 0;
for (const clip of manifest.clips) {
  const clipPath = await realpath(resolve(root, `public${clip.src}`));
  const audioRoot = await realpath(resolve(root, "public/audio"));
  if (!clipPath.startsWith(`${audioRoot}/`))
    throw new Error("Audio escapes local directory");
  const size = (await stat(clipPath)).size;
  if (size > 2 * 1024 * 1024 || size === 0)
    throw new Error("Audio exceeds file limit");
  bytes += size;
}
if (bytes > 20 * 1024 * 1024) throw new Error("Audio exceeds total budget");
console.log(
  `Practice valid: ${pack.dialogues.length} dialogues, ${pack.listening_contrasts.length} contrasts; ${manifest.clips.length} licensed local clips (${bytes} bytes).`,
);
