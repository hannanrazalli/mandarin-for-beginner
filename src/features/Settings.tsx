import { Check, Globe2, Monitor, Volume2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Page } from "../components/Page";
import { copy } from "../lib/copy";
import {
  type Language,
  type Theme,
  updateSettings,
  useSettings,
} from "../lib/settings";
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
      </div>
    </Page>
  );
}
