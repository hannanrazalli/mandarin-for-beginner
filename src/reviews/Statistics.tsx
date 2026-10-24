import { Link } from "react-router-dom";
import { Page } from "../components/Page";
import { practiceCompleted, scoreLesson, usePractice } from "../learning/store";
import { lessons } from "../lib/curriculum";
import { useSettings } from "../lib/settings";
import { malaysiaDay, streakFromDates } from "./algorithms";
import { useReviewData } from "./cloud";
import { reviewCopy } from "./copy";
import { useLocalReviews } from "./local";
export default function Statistics() {
  const { language } = useSettings();
  const t = reviewCopy(language);
  const data = useReviewData();
  const practice = usePractice((state) => state.events);
  const reviews = useLocalReviews((state) => state.events);
  const dates = [
    ...practice.map((event) => event.createdAt),
    ...reviews.map((event) => event.createdAt),
  ];
  const streak = data.progress.owner
    ? data.query.data?.streak
    : streakFromDates(dates);
  const hasData = data.progress.owner
    ? !!streak?.active_days
    : dates.length > 0;
  const score =
    practice.reduce((sum, event) => {
      const lesson = lessons.find((value) => value.id === event.lessonId);
      return sum + (lesson ? scoreLesson(lesson, event.answers).correct : 0);
    }, 0) + reviews.filter((event) => event.correct).length;
  const level =
    1 +
    Math.floor(
      (data.progress.owner ? (data.progress.query.data?.totalXp ?? 0) : score) /
        100,
    );
  const badges = data.progress.owner
    ? (data.query.data?.badges.map((badge) =>
        language === "ms" ? badge.label_ms : badge.label_en,
      ) ?? [])
    : [
        ...(practiceCompleted(practice).length ? [t.firstBadge] : []),
        ...((streak?.active_days ?? 0) >= 3 ? [t.threeBadge] : []),
      ];
  const seconds = data.progress.owner
    ? (data.query.data?.seconds ?? 0)
    : practice
        .filter(
          (event) => malaysiaDay(event.createdAt) === malaysiaDay(Date.now()),
        )
        .reduce((sum, event) => sum + event.durationSeconds, 0);
  return (
    <Page eyebrow={t.stats} title={t.statsTitle}>
      <p className="mode-label">{data.progress.owner ? t.cloud : t.local}</p>
      {data.progress.verifying ||
      (data.progress.owner &&
        (data.query.isPending || data.progress.query.isPending)) ? (
        <p role="status">{t.load}</p>
      ) : data.query.isError ? (
        <p role="alert">{t.error}</p>
      ) : !hasData ? (
        <section className="empty-state">
          <h2>
            {language === "ms"
              ? "Belum ada data pembelajaran"
              : "No learning data yet"}
          </h2>
          <Link className="text-link" to="/belajar">
            {t.back}
          </Link>
        </section>
      ) : (
        <>
          <div className="metric-grid">
            {[
              [t.level, level],
              [t.streak, streak?.current_days ?? 0],
              [t.active, streak?.active_days ?? 0],
              [t.freeze, streak?.freeze_balance ?? 0],
            ].map(([label, value]) => (
              <section className="metric-card" key={label}>
                <p className="metric-label">{label}</p>
                <strong>{value}</strong>
              </section>
            ))}
          </div>
          <p className="voice-note">
            {data.progress.owner ? t.cloudLevel : t.localLevel}
          </p>
          <section className="setting-card">
            <h2>{t.progress}</h2>
            <p>
              {Math.floor(seconds / 60)} /{" "}
              {data.progress.owner ? (data.query.data?.goal ?? 5) : localGoal()}{" "}
              {t.minutes}
            </p>
            <p>{t.goalNote}</p>
          </section>
          <section className="setting-card">
            <h2>{t.badges}</h2>
            {badges.length ? (
              <ul>
                {badges.map((badge) => (
                  <li key={badge}>{badge}</li>
                ))}
              </ul>
            ) : (
              <p>{t.noBadges}</p>
            )}
          </section>
          <p className="voice-note">
            {streak?.last_active_date} · {t.freezeNote}
          </p>
        </>
      )}
    </Page>
  );
}
function localGoal() {
  try {
    return Number(localStorage.getItem("bm-daily-goal")) || 5;
  } catch {
    return 5;
  }
}
