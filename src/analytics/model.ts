import { z } from "zod";
import { lessons } from "../lib/curriculum";
import { malaysiaDay } from "../reviews/algorithms";

export const sessionSchema = z.object({
  ended_at: z.iso.datetime({ offset: true }),
  duration_seconds: z.number().int().nonnegative(),
  xp_awarded: z.number().int().nonnegative(),
  correct_count: z.number().int().nonnegative(),
  answer_count: z.number().int().nonnegative(),
  lesson_id: z.string().nullable(),
});
export type StudyRecord = z.infer<typeof sessionSchema>;
export const insightSchema = z.object({
  items: z.array(
    z.object({
      lesson_slug: z.string(),
      content_version: z.number().int().positive(),
      item_id: z.string(),
      correct: z.number().int().nonnegative(),
      total: z.number().int().positive(),
    }),
  ),
  reviews: z.array(
    z.object({
      word_id: z.string(),
      modality: z.enum(["meaning", "listening", "tone", "hanzi"]),
      correct: z.number().int().nonnegative(),
      total: z.number().int().positive(),
    }),
  ),
});
export type Insights = z.infer<typeof insightSchema>;

export function itemMetrics(
  insights: Insights,
  wordIds: { id: string; slug: string }[],
) {
  const topics = new Map<
    string,
    { label: string; correct: number; total: number }
  >();
  const words = new Map<
    string,
    { label: string; correct: number; total: number }
  >();
  const tones = new Map<
    string,
    { label: string; correct: number; total: number }
  >();
  const add = (
    map: typeof topics,
    label: string,
    correct: number,
    total: number,
  ) => {
    const value = map.get(label) ?? { label, correct: 0, total: 0 };
    value.correct += correct;
    value.total += total;
    map.set(label, value);
  };
  let excluded = 0;
  for (const row of insights.items) {
    const lesson = lessons.find(
      (l) =>
        l.id === row.lesson_slug && l.content_version === row.content_version,
    );
    const item = lesson?.items.find((i) => i.id === row.item_id);
    if (!item) {
      excluded += row.total;
      continue;
    }
    if (item.kind === "vocabulary") {
      add(topics, item.topic, row.correct, row.total);
      add(words, `${item.hanzi} · ${item.pinyin}`, row.correct, row.total);
    } else
      for (const tone of new Set(item.tones))
        add(tones, String(tone), row.correct, row.total);
  }
  const vocabulary = lessons
    .flatMap((l) => l.items)
    .filter((i) => i.kind === "vocabulary");
  for (const row of insights.reviews) {
    const slug = wordIds.find((w) => w.id === row.word_id)?.slug ?? row.word_id;
    const word = vocabulary.find((w) => w.id === slug);
    if (!word) {
      excluded += row.total;
      continue;
    }
    add(topics, word.topic, row.correct, row.total);
    add(words, `${word.hanzi} · ${word.pinyin}`, row.correct, row.total);
  }
  const sorted = (map: typeof topics) =>
    [...map.values()].sort(
      (a, b) =>
        a.correct / a.total - b.correct / b.total ||
        a.label.localeCompare(b.label),
    );
  return {
    topics: sorted(topics),
    words: sorted(words).slice(0, 8),
    tones: sorted(tones),
    excluded,
  };
}

export function dailyTotals(records: StudyRecord[]) {
  const days = new Map<
    string,
    {
      date: string;
      xp: number;
      seconds: number;
      correct: number;
      total: number;
    }
  >();
  for (const record of records) {
    const date = malaysiaDay(record.ended_at);
    const day = days.get(date) ?? {
      date,
      xp: 0,
      seconds: 0,
      correct: 0,
      total: 0,
    };
    day.xp += record.xp_awarded;
    day.seconds += record.duration_seconds;
    day.correct += record.correct_count;
    day.total += record.answer_count;
    days.set(date, day);
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// Count distinct words, not modalities. This is an explicit learning heuristic.
export function masteredWords(
  rows: { word_id: string; repetitions: number; interval_days: number }[],
) {
  return new Set(
    rows
      .filter((row) => row.repetitions >= 3 && row.interval_days >= 6)
      .map((row) => row.word_id),
  ).size;
}

export function csvCell(value: unknown) {
  let text =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  // Quoting alone does not stop spreadsheet formulas, including after control characters.
  if (
    // biome-ignore lint/suspicious/noControlCharactersInRegex: strip formula-leading control characters deliberately
    /^[\s\u0000-\u001f\u007f\ufeff]*[=+\-@]/u.test(text) ||
    /^[\t\r\n]/u.test(text)
  )
    text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function recordsCsv(tables: Record<string, unknown[]>) {
  const rows = Object.entries(tables).flatMap(([table, records]) =>
    records.map((record) => ({
      table,
      fields:
        record !== null && typeof record === "object" && !Array.isArray(record)
          ? (Object.fromEntries(Object.entries(record)) as Record<
              string,
              unknown
            >)
          : { value: record },
    })),
  );
  const fields = [
    ...new Set(rows.flatMap((row) => Object.keys(row.fields))),
  ].sort();
  return `\ufeff${["table", ...fields].map(csvCell).join(",")}\r\n${rows.map((row) => [row.table, ...fields.map((field) => row.fields[field])].map(csvCell).join(",")).join("\r\n")}\r\n`;
}

export function downloadExport(text: string, type: "json" | "csv") {
  const url = URL.createObjectURL(
    new Blob([text], {
      type:
        type === "json"
          ? "application/json;charset=utf-8"
          : "text/csv;charset=utf-8",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `belajarmandarin-${malaysiaDay(Date.now())}.${type}`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
