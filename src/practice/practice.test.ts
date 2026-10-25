import { describe, expect, it } from "vitest";
import {
  audioManifestSchema,
  preferredAudioSource,
} from "../learning/audio-manifest";
import { dailyMission, practice, practiceSchema } from "./content";
import { normalizeDictation } from "./scoring";

describe("bounded bilingual self-study", () => {
  it("validates all authored bilingual dialogues and question references", () => {
    expect(practice.dialogues).toHaveLength(5);
    expect(practice.listening_contrasts).toHaveLength(10);
    const invalid = structuredClone(practice);
    invalid.dialogues[0].questions[0].after_turn_id = "missing";
    expect(practiceSchema.safeParse(invalid).success).toBe(false);
  });
  it("keeps short missions bounded and numbered pinyin tone-sensitive", () => {
    expect(dailyMission(3)).toEqual({ dialogueTurns: 2, contrasts: 1 });
    expect(dailyMission(10).contrasts).toBe(4);
    expect(normalizeDictation("ni3 hao3")).toBe("nǐ hǎo");
    expect(normalizeDictation("lü4")).toBe("lǜ");
    expect(normalizeDictation("shui3")).toBe("shuǐ");
    expect(normalizeDictation("ma1")).not.toBe(normalizeDictation("ma3"));
  });
  it("prefers validated local audio and rejects remote/traversal sources", () => {
    const clips = [
      {
        text: "你好",
        src: "/audio/hello.mp3",
        reviewStatus: "unverified" as const,
        license: "Owner recording",
        source: "Owner",
      },
    ];
    expect(preferredAudioSource("你好", true, clips)).toBe("recording");
    expect(preferredAudioSource("再见", true, clips)).toBe("device");
    expect(preferredAudioSource("再见", false, clips)).toBe("none");
    for (const src of [
      "https://evil.example/a.mp3",
      "/audio/../a.mp3",
      "/audio/a.mp3?token=x",
    ]) {
      expect(
        audioManifestSchema.safeParse({
          schema_version: 1,
          clips: [{ ...clips[0], src }],
        }).success,
      ).toBe(false);
    }
    expect(
      audioManifestSchema.safeParse({
        schema_version: 1,
        clips: [...clips, ...clips],
      }).success,
    ).toBe(false);
  });
});
