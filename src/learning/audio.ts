import { useCallback, useEffect, useRef, useState } from "react";
export function useMandarinAudio() {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [state, setState] = useState<"idle" | "playing" | "error">("idle");
  const generation = useRef(0);
  const stop = useCallback(() => {
    generation.current++;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setState("idle");
  }, []);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
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
      generation.current++;
      synth.cancel();
      synth.removeEventListener("voiceschanged", update);
    };
  }, []);
  const play = useCallback(
    (text: string, rate = 1) => {
      if (!voice || !("speechSynthesis" in window)) {
        setState("error");
        return;
      }
      stop();
      const token = generation.current;
      const utterance = new SpeechSynthesisUtterance(text);
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
    },
    [voice, stop],
  );
  return { available: !!voice, state, play, stop };
}
