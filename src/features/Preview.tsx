import { ArrowRight, Info, Volume2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Page } from "../components/Page";
import { copy } from "../lib/copy";
import { useSettings } from "../lib/settings";
export default function Preview() {
  const t = copy(useSettings().language);
  return (
    <Page
      eyebrow={`UNIT 0 · ${t.preview}`}
      title={t.previewTitle}
      description={t.previewBody}
    >
      <section className="preview-card">
        <span className="sample-label">
          <Info size={17} />
          {t.sample}
        </span>
        <div className="character" lang="zh-CN">
          你好
        </div>
        <p className="pinyin" lang="zh-Latn">
          nǐ hǎo
        </p>
        <p className="translation">{t.hello}</p>
        <button
          className="button unavailable"
          type="button"
          disabled
          aria-describedby="audio-note"
        >
          <Volume2 size={20} />
          {t.unavailable}
        </button>
        <p id="audio-note" className="audio-note">
          {t.audio}
        </p>
      </section>
      <div className="notice">
        <Info size={21} />
        <p>{t.audioBody}</p>
      </div>
      <section className="next-card">
        <div>
          <h2>{t.next}</h2>
          <p>{t.nextBody}</p>
        </div>
        <Link className="text-link" to="/belajar">
          {t.back}
          <ArrowRight size={18} />
        </Link>
      </section>
    </Page>
  );
}
