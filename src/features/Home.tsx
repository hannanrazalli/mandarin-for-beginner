import { ArrowRight, AudioLines, Leaf, Sprout } from "lucide-react";
import { Link } from "react-router-dom";
import { Page } from "../components/Page";
import { Pipit } from "../components/Pipit";
import { useLearningProgress } from "../learning/cloud";
import { learningCopy } from "../learning/copy";
import { useLessonPlayer } from "../learning/store";
import { copy } from "../lib/copy";
import { nextLesson } from "../lib/curriculum";
import { useSettings } from "../lib/settings";
export default function Home() {
  const { language } = useSettings();
  const t = copy(language);
  const l = learningCopy(language);
  const progress = useLearningProgress();
  const active = useLessonPlayer((state) =>
    state.stage === "result" ? null : state.slug,
  );
  const next = nextLesson(progress.completed);
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
            <Link
              className="button primary"
              to={`/belajar/${active ?? next.id}`}
            >
              {progress.completed.length || active ? l.resume : l.start}
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
      <section className="daily-mission">
        <div>
          <p className="eyebrow">
            {language === "ms" ? "Latihan kendiri" : "Self-study practice"}
          </p>
          <h2>
            {language === "ms"
              ? "Bawa perkataan ke dalam perbualan."
              : "Bring words into conversation."}
          </h2>
          <p>
            {language === "ms"
              ? "Dialog, dengar beza dan misi 3 / 5 / 10 minit. Latihan tambahan tanpa XP."
              : "Dialogues, sound contrasts and 3 / 5 / 10-minute missions. Extra practice without XP."}
          </p>
        </div>
        <Link className="button primary" to="/interaktif">
          {language === "ms" ? "Buka taman latihan" : "Open practice garden"}
          <ArrowRight size={18} />
        </Link>
      </section>
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
      <p className="page-note">{progress.owner ? l.cloud : l.local}</p>
    </Page>
  );
}
