import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useMandarinAudio } from "./audio";

const fixture = vi.hoisted(() => ({ voice: true, recording: true }));
vi.mock("./audio-manifest", () => ({
  audioManifest: { clips: [{}] },
  findAudio: () => (fixture.recording ? { src: "/audio/test.mp3" } : undefined),
  preferredAudioSource: (_text: string, voice: boolean) =>
    fixture.recording ? "recording" : voice ? "device" : "none",
}));
let media: FakeAudio;
class FakeAudio {
  playbackRate = 1;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  reject: ((reason?: unknown) => void) | null = null;
  pause = vi.fn();
  removeAttribute = vi.fn();
  load = vi.fn();
  constructor(_src: string) {
    media = this;
  }
  play = vi.fn(
    () =>
      new Promise<void>((_resolve, reject) => {
        this.reject = reject;
      }),
  );
}
const speak = vi.fn(),
  cancel = vi.fn();
beforeEach(() => {
  fixture.voice = true;
  fixture.recording = true;
  speak.mockClear();
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(public text: string) {}
    },
  );
  vi.stubGlobal("speechSynthesis", {
    getVoices: () => (fixture.voice ? [{ lang: "zh-CN" }] : []),
    speak,
    cancel,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("prefers the static clip and falls back only once for both media error paths", async () => {
  const { result } = renderHook(() => useMandarinAudio("你好"));
  act(() => result.current.play("你好"));
  expect(media.play).toHaveBeenCalledOnce();
  expect(speak).not.toHaveBeenCalled();
  await act(async () => {
    media.onerror?.();
    media.reject?.(new Error("unavailable"));
    await Promise.resolve();
  });
  expect(speak).toHaveBeenCalledOnce();
  expect(result.current.source).toBe("device");
  expect(result.current.recordingFailed).toBe(true);
});
it("cannot revive playback from cancelled stale media callbacks", async () => {
  const { result } = renderHook(() => useMandarinAudio("你好"));
  act(() => result.current.play("你好"));
  const stale = media.onerror;
  act(() => result.current.stop());
  await act(async () => {
    stale?.();
    media.reject?.();
    await Promise.resolve();
  });
  expect(speak).not.toHaveBeenCalled();
  expect(result.current.state).toBe("idle");
  expect(media.pause).toHaveBeenCalled();
});
it("reports unavailable audio without inventing a Mandarin voice", () => {
  fixture.voice = false;
  fixture.recording = false;
  const { result } = renderHook(() => useMandarinAudio("你好"));
  expect(result.current.available).toBe(false);
  act(() => result.current.play("你好"));
  expect(result.current.state).toBe("error");
  expect(speak).not.toHaveBeenCalled();
});
