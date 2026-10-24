import { useEffect, useRef, useState } from "react";
import { registerAccountPurger } from "../auth/purge";
import { localizedTopic } from "../lib/localization";
import { useSettings } from "../lib/settings";
import { lease } from "../offline/store";
import { malaysiaDay } from "../reviews/algorithms";
import Statistics from "../reviews/Statistics";
import { useAnalytics } from "./data";
import {
  dailyTotals,
  downloadExport,
  itemMetrics,
  masteredWords,
  recordsCsv,
} from "./model";

export default function AnalyticsPage() {
  const data = useAnalytics();
  const ms = useSettings().language === "ms";
  const [range, setRange] = useState(30);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const authRef = useRef(data.auth);
  authRef.current = data.auth;
  const epoch = useRef(0);
  useEffect(
    () =>
      registerAccountPurger(() => {
        epoch.current++;
        setMessage("");
        setExporting(false);
      }),
    [],
  );
  useEffect(
    () => () => {
      epoch.current++;
    },
    [],
  );
  const verifying =
    data.progress.verifying || data.progress.scope === "verifying";
  const owner = data.progress.owner;
  const source = owner ? data.query.data : data.local;
  const ready =
    data.auth.status !== "ownerOffline" &&
    !verifying &&
    (!owner || data.query.isSuccess) &&
    !!source;
  const days = dailyTotals(source?.sessions ?? []);
  const totals = days.reduce(
    (sum, day) => ({
      xp: sum.xp + day.xp,
      seconds: sum.seconds + day.seconds,
      correct: sum.correct + day.correct,
      total: sum.total + day.total,
    }),
    { xp: 0, seconds: 0, correct: 0, total: 0 },
  );
  const today = malaysiaDay(Date.now());
  const end = Date.parse(`${today}T12:00:00Z`);
  const dates = Array.from({ length: 35 }, (_, index) =>
    new Date(end - (34 - index) * 86400000).toISOString().slice(0, 10),
  );
  const visible = days.filter(
    (day) =>
      day.date >=
      new Date(end - (range - 1) * 86400000).toISOString().slice(0, 10),
  );
  const metrics = itemMetrics(
    source?.insights ?? { items: [], reviews: [] },
    source?.words ?? [],
  );
  const schedules = owner
    ? (source?.tables.review_schedule ?? []).flatMap((row) => {
        if (!row || typeof row !== "object") return [];
        const value = row as Record<string, unknown>;
        return typeof value.word_id === "string" &&
          typeof value.repetitions === "number" &&
          typeof value.interval_days === "number"
          ? [
              {
                word_id: value.word_id,
                repetitions: value.repetitions,
                interval_days: value.interval_days,
              },
            ]
          : [];
      })
    : [];
  async function exportData(type: "json" | "csv") {
    if (!ready || !source || exporting) return;
    const offlineLease = owner ? lease() : null;
    const token = epoch.current;
    const scope = data.progress.scope;
    setExporting(true);
    setMessage("");
    try {
      let tables = source.tables;
      if (owner) {
        const fresh = await data.query.refetch({ throwOnError: true });
        if (!fresh.data) throw new Error("Export unavailable");
        tables = fresh.data.tables;
      }
      if (
        token !== epoch.current ||
        (owner && offlineLease && !offlineLease.valid()) ||
        (owner &&
          (authRef.current.status !== "owner" ||
            authRef.current.owner?.id !== scope))
      )
        return;
      const text =
        type === "json"
          ? JSON.stringify(
              {
                schema_version: 1,
                scope: owner ? "owner" : "practice",
                generated_at: new Date().toISOString(),
                timezone: "Asia/Kuala_Lumpur",
                tables,
              },
              null,
              2,
            )
          : recordsCsv(tables);
      downloadExport(text, type);
      setMessage(
        ms ? "Fail eksport telah disediakan." : "Export file prepared.",
      );
    } catch {
      if (token === epoch.current)
        setMessage(
          ms
            ? "Eksport belum berjaya. Sambung internet dan cuba lagi."
            : "Export failed. Reconnect and retry.",
        );
    } finally {
      if (token === epoch.current) setExporting(false);
    }
  }
  return (
    <>
      {data.auth.status === "ownerOffline" ? (
        <h1 tabIndex={-1}>
          {ms ? "Statistik akaun luar talian" : "Account statistics offline"}
        </h1>
      ) : (
        <Statistics />
      )}
      <section className="analytics-details" aria-labelledby="analytics-title">
        <h2 id="analytics-title">
          {ms ? "Corak pembelajaran" : "Learning patterns"}
        </h2>
        {data.auth.status === "ownerOffline" ? (
          <p role="status">
            {ms
              ? "Analitik akaun tidak tersedia di luar talian."
              : "Account analytics are unavailable offline."}
          </p>
        ) : verifying || (owner && data.query.isPending) ? (
          <p role="status">
            {ms ? "Mengesahkan data akaun…" : "Verifying account data…"}
          </p>
        ) : owner && data.query.isError ? (
          <div role="alert">
            <p>
              {ms
                ? "Statistik akaun belum dapat dimuatkan."
                : "Account statistics could not load."}
            </p>
            <button
              className="button secondary"
              type="button"
              onClick={() => void data.query.refetch()}
            >
              {ms ? "Cuba lagi" : "Retry"}
            </button>
          </div>
        ) : (
          ready && (
            <>
              <div className="metric-grid">
                {[
                  [
                    owner ? "XP" : ms ? "Jawapan tepat" : "Correct answers",
                    owner ? totals.xp : totals.correct,
                  ],
                  [
                    ms ? "Minit direkod" : "Recorded minutes",
                    Math.floor(totals.seconds / 60),
                  ],
                  [
                    ms ? "Ketepatan" : "Accuracy",
                    totals.total
                      ? `${Math.round((totals.correct / totals.total) * 100)}%`
                      : "—",
                  ],
                  [
                    ms ? "Perkataan dikuasai" : "Mastered words",
                    owner ? masteredWords(schedules) : "—",
                  ],
                ].map(([label, value]) => (
                  <section className="metric-card" key={label}>
                    <p className="metric-label">{label}</p>
                    <strong>{value}</strong>
                  </section>
                ))}
              </div>
              <p className="voice-note">
                {ms
                  ? "Dikuasai = sekurang-kurangnya 3 ulang kaji berjaya dan sela 6 hari pada satu jenis latihan. Masa ialah tempoh yang direkod; percubaan lama tanpa pemasa tidak menambah minit."
                  : "Mastered = at least 3 successful reviews and a 6-day interval in one modality. Time uses recorded duration; older untimed attempts add no minutes."}
              </p>
              <section className="setting-card">
                <h3>
                  {ms
                    ? "35 hari terakhir · waktu Malaysia"
                    : "Last 35 days · Malaysia time"}
                </h3>
                <p className="voice-note">
                  {dates[0]} → {today}
                </p>
                <ul className="study-calendar">
                  {dates.map((date) => {
                    const day = days.find((value) => value.date === date);
                    return (
                      <li
                        key={date}
                        className={day ? "studied" : ""}
                        aria-label={`${date}: ${day?.xp ?? 0} XP, ${day?.total ?? 0} ${ms ? "jawapan" : "answers"}`}
                      >
                        <span className="calendar-date">{date.slice(5)}</span>
                        <small>{day ? "●" : "·"}</small>
                      </li>
                    );
                  })}
                </ul>
                <p className="voice-note">
                  {ms
                    ? "● = aktiviti sebenar; hari perlindungan streak tidak dikira sebagai hari belajar."
                    : "● = real activity; frozen streak days do not count as study days."}
                </p>
              </section>
              <section className="setting-card">
                <h3>
                  {owner
                    ? ms
                      ? "XP mengikut hari"
                      : "Daily XP"
                    : ms
                      ? "Jawapan mengikut hari"
                      : "Daily answers"}
                </h3>
                <div className="option-group">
                  {[30, 90].map((value) => (
                    <button
                      className="button secondary"
                      type="button"
                      key={value}
                      aria-pressed={range === value}
                      onClick={() => setRange(value)}
                    >
                      {value} {ms ? "hari" : "days"}
                    </button>
                  ))}
                </div>
                {visible.length ? (
                  <>
                    <div className="xp-chart" aria-hidden="true">
                      {visible.map((day) => (
                        <span
                          key={day.date}
                          className="xp-bar"
                          title={day.date}
                          style={{
                            height: `${Math.max(3, ((owner ? day.xp : day.total) / Math.max(1, ...visible.map((d) => (owner ? d.xp : d.total)))) * 100)}%`,
                          }}
                        />
                      ))}
                    </div>
                    <details>
                      <summary>
                        {ms ? "Lihat jadual data" : "View data table"}
                      </summary>
                      <div className="table-scroll">
                        <table>
                          <caption>
                            {ms ? "Aktiviti yang direkod" : "Recorded activity"}
                          </caption>
                          <thead>
                            <tr>
                              <th>{ms ? "Tarikh" : "Date"}</th>
                              <th>XP</th>
                              <th>{ms ? "Jawapan" : "Answers"}</th>
                              <th>{ms ? "Saat" : "Seconds"}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visible.map((day) => (
                              <tr key={day.date}>
                                <td>{day.date}</td>
                                <td>{day.xp}</td>
                                <td>{day.total}</td>
                                <td>{day.seconds}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </>
                ) : (
                  <p>
                    {ms
                      ? "Belum ada aktiviti dalam tempoh ini."
                      : "No activity in this period yet."}
                  </p>
                )}
              </section>
              <MetricTable
                title={ms ? "Ketepatan mengikut topik" : "Accuracy by topic"}
                rows={metrics.topics.map((row) => ({
                  ...row,
                  label: localizedTopic(row.label, ms ? "ms" : "en"),
                }))}
                ms={ms}
              />
              <MetricTable
                title={
                  ms ? "Perkataan untuk diberi perhatian" : "Words to revisit"
                }
                rows={metrics.words}
                ms={ms}
              />
              <MetricTable
                title={ms ? "Item latihan nada Unit 0" : "Unit 0 tone items"}
                rows={metrics.tones.map((row) => ({
                  ...row,
                  label: `${ms ? "Nada" : "Tone"} ${row.label === "0" ? (ms ? "neutral" : "neutral") : row.label}`,
                }))}
                ms={ms}
              />
              <p className="voice-note">
                {ms
                  ? "Butiran topik/nada menggunakan jawapan pelajaran dan ulang kaji yang tersedia, bukan analisis suara. Ujian pintas termasuk dalam jumlah XP/ketepatan, tetapi butiran itemnya tidak disimpan dalam resit lama."
                  : "Topic/tone detail uses available lesson and review answers, not voice analysis. Test-out counts in total XP/accuracy; older receipts lack its per-item detail."}
                {metrics.excluded > 0 &&
                  ` ${metrics.excluded} ${ms ? "jawapan versi kandungan lama tidak dipadankan." : "older-content answers could not be mapped."}`}
              </p>
            </>
          )
        )}
        <section className="setting-card">
          <h3>{ms ? "Eksport data sendiri" : "Export your data"}</h3>
          <p>
            {owner
              ? ms
                ? "Rekod akaun sendiri sahaja. Sesi login, password dan key tidak dieksport."
                : "Only your account records. Login sessions, passwords and keys are excluded."
              : ms
                ? "Latihan setempat pada peranti ini sahaja."
                : "Local practice on this device only."}
          </p>
          <div className="option-group">
            {(["json", "csv"] as const).map((type) => (
              <button
                type="button"
                className="button secondary"
                key={type}
                disabled={!ready || exporting}
                onClick={() => void exportData(type)}
              >
                {exporting ? "…" : type.toUpperCase()}
              </button>
            ))}
          </div>
          <p role="status">{message}</p>
        </section>
      </section>
    </>
  );
}

function MetricTable({
  title,
  rows,
  ms,
}: {
  title: string;
  rows: { label: string; correct: number; total: number }[];
  ms: boolean;
}) {
  return (
    <section className="setting-card">
      <h3>{title}</h3>
      {rows.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{ms ? "Item" : "Item"}</th>
                <th>{ms ? "Tepat / cubaan" : "Correct / attempts"}</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>
                    {row.correct} / {row.total}
                  </td>
                  <td>{Math.round((row.correct / row.total) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>
          {ms
            ? "Belum cukup data. Jawab pelajaran atau ulang kaji dahulu."
            : "Not enough data yet. Complete lessons or reviews first."}
        </p>
      )}
    </section>
  );
}
