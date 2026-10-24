import { useState } from "react";
import { learningQueryClient } from "../learning/cloud";
import { useSettings } from "../lib/settings";
import { useReviewData } from "./cloud";
import { reviewCopy } from "./copy";

function localGoal() {
  try {
    const value = Number(localStorage.getItem("bm-daily-goal"));
    return value === 3 || value === 10 ? value : 5;
  } catch {
    return 5;
  }
}
export default function Goal() {
  const settings = useSettings();
  const t = reviewCopy(settings.language);
  const data = useReviewData();
  const [local, setLocal] = useState(localGoal);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const goal = data.progress.owner ? (data.query.data?.goal ?? 5) : local;
  async function save(value: number) {
    if (data.progress.verifying || pending) return;
    setPending(true);
    setStatus("");
    try {
      if (data.progress.owner) {
        if (!data.auth.client || !data.auth.owner)
          throw new Error("Owner required");
        const response = await data.auth.client
          .from("profiles")
          .update({
            daily_goal: value,
            locale: settings.language,
            sound_enabled: settings.effects,
          })
          .eq("id", data.auth.owner.id);
        if (response.error) throw new Error("Preference unconfirmed");
        await learningQueryClient.invalidateQueries({
          queryKey: ["owner", data.progress.scope, "reviews"],
        });
      } else {
        localStorage.setItem("bm-daily-goal", String(value));
        setLocal(value);
      }
      setStatus(t.saved);
    } catch {
      setStatus(t.notSaved);
    } finally {
      setPending(false);
    }
  }
  return (
    <fieldset className="setting-card">
      <legend>{t.goal}</legend>
      <p className="mode-label">{data.progress.owner ? t.cloud : t.local}</p>
      <div className="option-group">
        {[3, 5, 10].map((value) => (
          <label key={value} className="radio-option">
            <input
              type="radio"
              name="daily-goal"
              checked={goal === value}
              onChange={() => void save(value)}
              disabled={pending || data.progress.verifying}
            />
            {value} {t.minutes}
          </label>
        ))}
      </div>
      <p className="voice-note">{t.goalNote}</p>
      <p role="status">{status}</p>
    </fieldset>
  );
}
