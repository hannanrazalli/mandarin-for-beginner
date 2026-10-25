import type { Language } from "../lib/settings";
export function AudioSource({
  source,
  language,
  error = false,
  recordingFailed = false,
}: {
  source: "recording" | "device" | "none";
  language: Language;
  error?: boolean;
  recordingFailed?: boolean;
}) {
  const ms = language === "ms";
  return (
    <p className="voice-note" role="status">
      {recordingFailed
        ? ms
          ? "Rakaman tidak tersedia. "
          : "Recording unavailable. "
        : ""}
      {error
        ? ms
          ? "Audio gagal. Teruskan latihan membaca; tiada penilaian sebutan."
          : "Audio failed. Continue reading practice; pronunciation is not graded."
        : source === "recording"
          ? ms
            ? "Rakaman setempat • semakan audio belum disahkan."
            : "Local recording • audio review not confirmed."
          : source === "device"
            ? ms
              ? "Suara peranti zh-CN • bukan rakaman penutur yang disemak; mungkin memerlukan internet."
              : "Device zh-CN voice • not a reviewed speaker recording; may require internet."
            : ms
              ? "Tiada audio Mandarin tersedia. Gunakan latihan membaca."
              : "No Mandarin audio available. Use reading practice."}
    </p>
  );
}
