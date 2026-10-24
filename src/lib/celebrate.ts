// Optional, quiet feedback generated locally; no audio download or microphone access.
export function celebrate(enabled: boolean) {
  if (!enabled || typeof window.AudioContext !== "function") return;
  try {
    const context = new AudioContext();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.025, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18);
    gain.connect(context.destination);
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, context.currentTime);
    oscillator.frequency.setValueAtTime(880, context.currentTime + 0.08);
    oscillator.connect(gain);
    oscillator.onended = () => {
      void context.close().catch(() => {});
    };
    oscillator.start();
    oscillator.stop(context.currentTime + 0.18);
    void context.resume().catch(() => {
      void context.close().catch(() => {});
    });
  } catch {
    /* Audio may be unavailable or blocked; learning continues. */
  }
}
