import { describe, expect, it } from "vitest";
import { csvCell, dailyTotals, masteredWords, recordsCsv } from "./model";

describe("personal analytics and exports", () => {
  it("attributes actual sessions across Malaysia midnight without synthetic activity", () => {
    const base = {
      duration_seconds: 60,
      xp_awarded: 10,
      correct_count: 1,
      answer_count: 2,
      lesson_id: null,
    };
    expect(
      dailyTotals([
        { ...base, ended_at: "2026-10-23T15:59:59Z" },
        { ...base, ended_at: "2026-10-23T16:00:00Z" },
      ]),
    ).toEqual([
      { date: "2026-10-23", xp: 10, seconds: 60, correct: 1, total: 2 },
      { date: "2026-10-24", xp: 10, seconds: 60, correct: 1, total: 2 },
    ]);
  });
  it("counts a mastered word once across modalities and excludes new or lapsed words", () => {
    expect(
      masteredWords([
        { word_id: "a", repetitions: 3, interval_days: 15 },
        { word_id: "a", repetitions: 4, interval_days: 38 },
        { word_id: "b", repetitions: 0, interval_days: 1 },
      ]),
    ).toBe(1);
  });
  it("neutralizes spreadsheet formulas and escapes commas, quotes and newlines", () => {
    for (const value of ["=1+1", " \t+SUM(A1)", "\r@SUM(A1)", "\ufeff-1+2"])
      expect(csvCell(value)).toMatch(/^"'/);
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
    expect(recordsCsv({ sessions: [{ answer: "=CMD()" }] })).toContain(
      '"sessions","\'=CMD()"',
    );
    const csv = recordsCsv({ sessions: [{ answer: "hello" }] });
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.split("\r\n")).toHaveLength(3);
    expect(csv).not.toContain("\\r\\n");
  });
});
