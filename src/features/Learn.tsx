import { ArrowRight, Check, LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";
import { Page } from "../components/Page";
import { useLearningProgress } from "../learning/cloud";
import { learningCopy } from "../learning/copy";
import { curriculum, getLesson, isLessonUnlocked } from "../lib/curriculum";
import { localizedTitle } from "../lib/localization";
import { useSettings } from "../lib/settings";
import { reviewCopy } from "../reviews/copy";
export default function Learn() {
  const { language } = useSettings();
  const t = learningCopy(language);
  const progress = useLearningProgress();
  return (
    <Page
      eyebrow={language === "ms" ? "Laluan belajar" : "Learning path"}
      title={t.overview}
      description={t.overviewBody}
    >
      <p className="mode-label">{progress.owner ? t.cloud : t.local}</p>
      {progress.owner && !progress.offline && progress.query.isPending && (
        <p role="status">{t.loading}</p>
      )}
      {!progress.offline && progress.query.isError && (
        <p role="alert">{t.cloudError}</p>
      )}
      <div className="result-actions">
        <Link className="button secondary" to="/latihan">
          {reviewCopy(language).practice}
        </Link>
        <Link className="button secondary" to="/uji-unit-1">
          {reviewCopy(language).testout}
        </Link>
      </div>
      <div className="curriculum-units">
        {curriculum.units.map((unit) => (
          <section key={unit.id} className="curriculum-unit">
            <p className="eyebrow">
              UNIT {unit.position} {unit.position === 1 ? "· HSK 1" : ""}
            </p>
            <h2>{language === "ms" ? unit.title_ms : unit.title_en}</h2>
            <ol className="lesson-list">
              {unit.lesson_ids.map((slug, index) => {
                const lesson = getLesson(slug);
                const done = progress.completed.includes(slug);
                const unlocked =
                  isLessonUnlocked(slug, progress.completed) &&
                  !(!progress.offline && progress.query.isError) &&
                  !(
                    progress.owner &&
                    !progress.offline &&
                    progress.query.isPending
                  );
                return (
                  <li key={slug}>
                    <span className={`lesson-marker ${done ? "done" : ""}`}>
                      {done ? (
                        <Check size={18} />
                      ) : unlocked ? (
                        String(index + 1).padStart(2, "0")
                      ) : (
                        <LockKeyhole size={17} />
                      )}
                    </span>
                    <div>
                      <h3>{lesson ? localizedTitle(lesson, language) : ""}</h3>
                      <p>
                        {done
                          ? t.complete
                          : unlocked
                            ? `${Math.round((lesson?.duration_seconds ?? 120) / 60)} min · ${t.ready}`
                            : t.locked}
                      </p>
                    </div>
                    {unlocked ? (
                      <Link
                        className="lesson-open"
                        to={`/belajar/${slug}`}
                        aria-label={`${t.start}: ${lesson ? localizedTitle(lesson, language) : ""}`}
                      >
                        <ArrowRight size={21} />
                      </Link>
                    ) : (
                      <span className="locked-label">{t.locked}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </Page>
  );
}
