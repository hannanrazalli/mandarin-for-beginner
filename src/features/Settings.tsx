import { Check, Globe2, Monitor, Volume2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Page } from "../components/Page";
import { contentReviewCounts } from "../lib/content-status";
import { copy } from "../lib/copy";
import {
  type Language,
  type Theme,
  updateSettings,
  useSettings,
} from "../lib/settings";
import Goal from "../reviews/Goal";
export default function Settings() {
  const settings = useSettings();
  const t = copy(settings.language);
  const [changed, setChanged] = useState(false);
  function change(patch: Parameters<typeof updateSettings>[0]) {
    updateSettings(patch);
    setChanged(true);
  }
  return (
    <Page
      eyebrow={t.settings}
      title={t.settingsTitle}
      description={t.settingsBody}
    >
      <div className="settings-stack">
        <Goal />
        <fieldset className="setting-card">
          <legend>
            <Globe2 size={21} />
            {t.language}
          </legend>
          <div className="option-group">
            {(
              [
                ["ms", "Bahasa Melayu"],
                ["en", "English"],
              ] as const
            ).map(([value, label]) => (
              <label className="radio-option" key={value}>
                <input
                  type="radio"
                  name="language"
                  value={value}
                  checked={settings.language === value}
                  onChange={() => change({ language: value as Language })}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="setting-card">
          <legend>
            <Monitor size={21} />
            {t.theme}
          </legend>
          <div className="option-group">
            {(
              [
                ["system", t.system],
                ["light", t.light],
                ["dark", t.dark],
              ] as const
            ).map(([value, label]) => (
              <label className="radio-option" key={value}>
                <input
                  type="radio"
                  name="theme"
                  value={value}
                  checked={settings.theme === value}
                  onChange={() => change({ theme: value as Theme })}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <section className="setting-card sound-setting">
          <div>
            <h2>
              <Volume2 size={21} />
              {t.effects}
            </h2>
            <p>{t.effectsBody}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.effects}
            aria-label={t.effects}
            className="switch"
            onClick={() => change({ effects: !settings.effects })}
          >
            <span />
          </button>
        </section>
        <p className="save-status" role="status">
          {changed && (
            <>
              <Check size={18} />
              {settings.stored ? t.saved : t.notSaved}
            </>
          )}
        </p>
        <div className="device-note">
          <h2>{t.device}</h2>
          <p>{t.accountDeviceBody}</p>
        </div>
        <section className="account-settings">
          <h2>{t.account}</h2>
          <p>{t.accountSettingsBody}</p>
          <Link className="text-link" to="/akaun">
            {t.account} →
          </Link>
        </section>
        <details className="install-help">
          <summary>{t.install}</summary>
          <p>{t.installBody}</p>
        </details>
        <details className="install-help">
          <summary>
            {settings.language === "ms"
              ? "Status semakan bahan"
              : "Content review status"}
          </summary>
          <p>
            {settings.language === "ms"
              ? "Bacaan teks dalam 370 kad asal. Padanan mesin bukan pengesahan terjemahan, audio atau ketepatan oleh manusia."
              : "Text readings in the original 370 cards. Machine agreement does not verify translations, audio or correctness by a human."}
          </p>
          <ul>
            <li>
              {settings.language === "ms" ? "Belum disahkan" : "Unverified"}:{" "}
              {contentReviewCounts.unverified}
            </li>
            <li>
              {settings.language === "ms"
                ? "Disemak mesin (bacaan sahaja)"
                : "Machine-checked (readings only)"}
              : {contentReviewCounts["machine-checked"]}
            </li>
            <li>
              {settings.language === "ms"
                ? "Disahkan manusia"
                : "Human-verified"}
              : {contentReviewCounts["human-verified"]}
            </li>
          </ul>
          <p>
            {settings.language === "ms"
              ? "Dialog baharu dan audio suara peranti belum disahkan. Perbezaan bacaan dalam audit memerlukan semakan konteks; ia tidak semestinya kesalahan."
              : "New dialogues and device audio are unverified. Audit reading differences need contextual review; they are not necessarily errors."}
          </p>
        </details>
      </div>
    </Page>
  );
}
