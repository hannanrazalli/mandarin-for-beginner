import { useCallback, useEffect, useRef, useState } from "react";
import { registerAccountPurger } from "../auth/purge";
import type { Language } from "../lib/settings";

const MAX_BYTES = 2 * 1024 * 1024;
export default function Recorder({ language }: { language: Language }) {
  const ms = language === "ms";
  const [state, setState] = useState<
    "idle" | "requesting" | "recording" | "ready" | "error"
  >("idle");
  const [url, setUrl] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    blobUrl = useRef<string | null>(null),
    revision = useRef(0),
    playback = useRef<HTMLAudioElement | null>(null);
  const discard = useCallback(() => {
    revision.current++;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (recorder.current) {
      recorder.current.ondataavailable = null;
      recorder.current.onstop = null;
      if (recorder.current.state !== "inactive") recorder.current.stop();
      recorder.current = null;
    }
    stream.current?.getTracks().forEach((track) => {
      track.stop();
    });
    stream.current = null;
    playback.current?.pause();
    if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
    blobUrl.current = null;
    setUrl(null);
    setState("idle");
  }, []);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) discard();
    };
    document.addEventListener("visibilitychange", hide);
    const unregister = registerAccountPurger(discard);
    return () => {
      discard();
      unregister();
      document.removeEventListener("visibilitychange", hide);
    };
  }, [discard]);
  async function start() {
    discard();
    const token = revision.current;
    setState("requesting");
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error("Unavailable");
      const input = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      if (token !== revision.current || document.hidden) {
        input.getTracks().forEach((track) => {
          track.stop();
        });
        return;
      }
      stream.current = input;
      const rec = new MediaRecorder(input);
      recorder.current = rec;
      const chunks: Blob[] = [];
      let bytes = 0;
      rec.ondataavailable = (event) => {
        if (token !== revision.current) return;
        bytes += event.data.size;
        if (bytes > MAX_BYTES) {
          discard();
          setState("error");
          return;
        }
        if (event.data.size) chunks.push(event.data);
      };
      rec.onerror = () => {
        if (token === revision.current) {
          discard();
          setState("error");
        }
      };
      rec.onstop = () => {
        input.getTracks().forEach((track) => {
          track.stop();
        });
        if (timer.current) clearTimeout(timer.current);
        if (token !== revision.current) return;
        if (!chunks.length) {
          setState("error");
          return;
        }
        const value = URL.createObjectURL(
          new Blob(chunks, { type: rec.mimeType }),
        );
        blobUrl.current = value;
        setUrl(value);
        setState("ready");
      };
      rec.start(250);
      setState("recording");
      timer.current = setTimeout(() => {
        if (token === revision.current && rec.state !== "inactive") rec.stop();
      }, 20000);
    } catch {
      if (token === revision.current) {
        discard();
        setState("error");
      }
    }
  }
  return (
    <section
      className="recorder-panel"
      aria-label={ms ? "Rakaman sendiri" : "Self recording"}
    >
      <h3>
        {ms ? "Cakap sendiri, kemudian dengar" : "Say it yourself, then listen"}
      </h3>
      <p>
        {ms
          ? "Pilihan: mikrofon hanya selepas anda tekan Rakam. Maksimum 20 saat / 2 MB, dalam pelayar sahaja; tiada muat naik atau pemarkahan. Rakaman dipadam apabila keluar, sembunyi halaman atau log keluar."
          : "Optional: microphone only after Record. Maximum 20 seconds / 2 MB, browser only; no upload or scoring. Recording is removed on leaving, hiding the page or signing out."}
      </p>
      <div className="result-actions">
        <button
          type="button"
          className="button secondary"
          disabled={state === "requesting" || state === "recording"}
          onClick={() => void start()}
        >
          {ms ? "Rakam" : "Record"}
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={state !== "recording"}
          onClick={() => recorder.current?.stop()}
        >
          {ms ? "Hentikan rakaman" : "Stop recording"}
        </button>
        {url && (
          <button type="button" className="button secondary" onClick={discard}>
            {ms ? "Padam rakaman" : "Delete recording"}
          </button>
        )}
      </div>
      <p role="status">
        {state === "recording"
          ? ms
            ? "Sedang merakam…"
            : "Recording…"
          : state === "requesting"
            ? ms
              ? "Menunggu kebenaran mikrofon…"
              : "Waiting for microphone permission…"
            : state === "error"
              ? ms
                ? "Rakaman tidak tersedia. Berlatih bercakap tanpa mikrofon."
                : "Recording unavailable. Practise speaking without a microphone."
              : ""}
      </p>
      {url && (
        // biome-ignore lint/a11y/useMediaCaption: Untranscribed private user recording; no generated caption or grading is claimed.
        <audio
          ref={playback}
          controls
          src={url}
          aria-label={
            ms ? "Dengar rakaman sendiri" : "Listen to your recording"
          }
        />
      )}
    </section>
  );
}
