import { ArrowRight, AudioLines, Leaf, Sprout } from "lucide-react";
import { Link } from "react-router-dom";
import { Page } from "../components/Page";
import { Pipit } from "../components/Pipit";
import { copy } from "../lib/copy";
import { useSettings } from "../lib/settings";
export default function Home() {
  const { language } = useSettings();
  const t = copy(language);
  return (
    <Page eyebrow={t.welcome} title={t.greeting} description={t.intro}>
      <div className="home-grid">
        <section className="hero">
          <div className="hero-copy">
            <span className="pill">
              <span className="dot" />
              {t.session}
            </span>
            <h2>{t.hero}</h2>
            <p>{t.heroBody}</p>
            <Link className="button primary" to="/unit-0">
              {t.try}
              <ArrowRight size={19} />
            </Link>
          </div>
          <Pipit />
          <div className="hero-footer">
            <Leaf size={16} />
            <span>{t.listenBody}</span>
          </div>
        </section>
        <aside className="first-card">
          <div className="icon-tile">
            <Sprout size={27} />
          </div>
          <p className="eyebrow">01 / UNIT 0</p>
          <h2>{t.first}</h2>
          <p>{t.firstBody}</p>
          <div className="step-line">
            <span>1</span>
            <div>
              <strong>{t.listen}</strong>
              <p>{t.listenBody}</p>
            </div>
          </div>
          <Link className="text-link" to="/belajar">
            {t.path}
            <ArrowRight size={18} />
          </Link>
        </aside>
      </div>
      <section className="support-grid">
        <div className="support-card">
          <span className="round-icon">
            <AudioLines size={23} />
          </span>
          <div>
            <h2>{t.listen}</h2>
            <p>{t.listenBody}</p>
          </div>
        </div>
        <div className="support-card">
          <span className="round-icon honey">
            <Leaf size={23} />
          </span>
          <div>
            <h2>{t.small}</h2>
            <p>{t.smallBody}</p>
          </div>
        </div>
      </section>
      <p className="page-note">{t.note}</p>
    </Page>
  );
}
