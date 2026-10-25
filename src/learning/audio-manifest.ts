import { z } from "../lib/zod-config";

const clipSchema = z
  .object({
    text: z.string().min(1).max(500),
    src: z.string().regex(/^\/audio\/[a-zA-Z0-9_-]+\.(mp3|ogg|wav)$/),
    reviewStatus: z.enum(["unverified", "machine-checked", "human-verified"]),
    license: z.string().min(1).max(1000),
    source: z.string().min(1).max(1000),
  })
  .strict();
export const audioManifestSchema = z
  .object({
    schema_version: z.literal(1),
    clips: z.array(clipSchema).max(2000),
  })
  .strict()
  .refine(
    (data) =>
      new Set(data.clips.map((clip) => clip.text)).size === data.clips.length,
    "Duplicate audio text",
  );
const bundled = import.meta.glob<{ default: unknown }>(
  "/public/audio/manifest.json",
  { eager: true },
);
export const audioManifest = audioManifestSchema.parse(
  Object.values(bundled)[0]?.default,
);
export function findAudio(text: string) {
  return audioManifest.clips.find((clip) => clip.text === text);
}
export function preferredAudioSource(
  text: string,
  hasVoice: boolean,
  clips = audioManifest.clips,
) {
  return clips.some((clip) => clip.text === text)
    ? "recording"
    : hasVoice
      ? "device"
      : "none";
}
