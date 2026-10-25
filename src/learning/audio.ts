import { useCallback, useEffect, useRef, useState } from "react";
import { registerAccountPurger } from "../auth/purge";
import {
  audioManifest,
  findAudio,
  preferredAudioSource,
} from "./audio-manifest";

const activeStops = new Set<() => void>();
export function useMandarinAudio(text?: string) {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [state, setState] = useState<"idle" | "playing" | "error">("idle");
  const [failedClip, setFailedClip] = useState<string | null>(null);
  const generation = useRef(0);
  const element = useRef<HTMLAudioElement | null>(null);
  const stop = useCallback(() => {
    generation.current++;
    if (element.current) {
      element.current.pause();
      element.current.removeAttribute("src");
      element.current.load();
      element.current = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setState("idle");
  }, []);
  useEffect(() => {
    activeStops.add(stop);
    const unregister = registerAccountPurger(stop);
    const hide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hide);
    if ("speechSynthesis" in window) {
      const synth = window.speechSynthesis;
      const update = () =>
        setVoice(
          synth
            .getVoices()
            .find(
              (candidate) =>
                candidate.lang.toLowerCase().replace("_", "-") === "zh-cn",
            ) ?? null,
        );
      update();
      synth.addEventListener("voiceschanged", update);
      return () => {
        stop();
        activeStops.delete(stop);
        unregister();
        document.removeEventListener("visibilitychange", hide);
        synth.removeEventListener("voiceschanged", update);
      };
    }
    return () => {
      stop();
      activeStops.delete(stop);
      unregister();
      document.removeEventListener("visibilitychange", hide);
    };
  }, [stop]);
  const play = useCallback(
    (value: string, rate = 1) => {
      for (const halt of activeStops) halt();
      const token = generation.current;
      const speak = () => {
        if (token !== generation.current) return;
        if (!voice || !("speechSynthesis" in window)) {
          setState("error");
          return;
        }
        const utterance = new SpeechSynthesisUtterance(value);
        utterance.lang = "zh-CN";
        utterance.voice = voice;
        utterance.rate = rate;
        utterance.onend = () => {
          if (token === generation.current) setState("idle");
        };
        utterance.onerror = () => {
          if (token === generation.current) setState("error");
        };
        setState("playing");
        try {
          window.speechSynthesis.speak(utterance);
        } catch {
          setState("error");
        }
      };
      const clip = findAudio(value);
      if (!clip) {
        speak();
        return;
      }
      setFailedClip(null);
      const media = new Audio(clip.src);
      element.current = media;
      media.playbackRate = Math.max(0.5, Math.min(1.5, rate));
      media.onended = () => {
        if (token === generation.current) setState("idle");
      };
      let fallbackStarted = false;
      const fallback = () => {
        if (token !== generation.current || fallbackStarted) return;
        fallbackStarted = true;
        media.onerror = null;
        media.onended = null;
        media.pause();
        setFailedClip(value);
        speak();
      };
      media.onerror = fallback;
      setState("playing");
      void media.play().catch(fallback);
    },
    [voice],
  );
  const source: "recording" | "device" | "none" =
    text && failedClip === text
      ? voice
        ? "device"
        : "none"
      : text
        ? preferredAudioSource(text, !!voice)
        : audioManifest.clips.length
          ? "recording"
          : voice
            ? "device"
            : "none";
  return {
    available: source !== "none",
    state,
    play,
    stop,
    source,
    recordingFailed: !!text && failedClip === text,
  };
}
