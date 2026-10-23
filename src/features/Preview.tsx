import { ArrowRight, AudioLines, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { Page } from "../components/Page";
import { Pipit } from "../components/Pipit";
import { useLearningProgress } from "../learning/cloud";
import { learningCopy } from "../learning/copy";
import { isLessonUnlocked, lessons } from "../lib/curriculum";
import { useSettings } from "../lib/settings";
export default function Preview() {
  const t = learningCopy(useSettings().language);
  const progress = useLearningProgress();
  const lesson = lessons[0];
  return (
    <Page eyebrow="UNIT 0" title={t.intro} description={t.introBody}>
      <section className="unit-intro">
        <div>
          <span className="pill">
            <AudioLines size={17} />
            1–3 min
          </span>
          <h2>{lesson.title_ms}</h2>
          <p>{t.overviewBody}</p>
          <p className="mode-label">{progress.owner ? t.cloud : t.local}</p>
          {isLessonUnlocked(lesson.id, progress.completed) && (
            <Link className="button primary" to={`/belajar/${lesson.id}`}>
              {t.start}
              <ArrowRight size={18} />
            </Link>
          )}
        </div>
        <Pipit />
      </section>
      <div className="notice">
        <Info size={20} />
        <p>{t.notAudio}</p>
      </div>
    </Page>
  );
}
