export type Schedule = {
  ease_factor: number;
  repetitions: number;
  interval_days: number;
  due_at: string;
  version: number;
};
export function sm2(
  old: Schedule,
  correct: boolean,
  hints: number,
  now = Date.now(),
): Schedule {
  const grade = correct ? 5 - Math.max(0, Math.min(2, hints)) : 0;
  const factor = Math.max(
    1.3,
    Math.min(
      5,
      old.ease_factor + 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02),
    ),
  );
  const interval = correct
    ? old.repetitions === 0
      ? 1
      : old.repetitions === 1
        ? 6
        : Math.min(36500, Math.round(old.interval_days * old.ease_factor))
    : 1;
  return {
    ease_factor: Math.round(factor * 1000) / 1000,
    repetitions: correct ? old.repetitions + 1 : 0,
    interval_days: interval,
    due_at: new Date(now + interval * 86400000).toISOString(),
    version: old.version + 1,
  };
}
export function malaysiaDay(value: string | number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
export function streakFromDates(dates: string[]) {
  const days = [...new Set(dates.map(malaysiaDay))].sort();
  let current = 0,
    longest = 0,
    freeze = 1,
    previous = "";
  days.forEach((day, index) => {
    const gap = previous
      ? (Date.parse(day) - Date.parse(previous)) / 86400000
      : 0;
    if (gap === 1) current++;
    else if (gap === 2 && freeze > 0) {
      current += 2;
      freeze--;
    } else current = 1;
    if ((index + 1) % 7 === 0) freeze = Math.min(2, freeze + 1);
    longest = Math.max(longest, current);
    previous = day;
  });
  return {
    current_days: current,
    longest_days: longest,
    freeze_balance: freeze,
    active_days: days.length,
    last_active_date: previous || null,
  };
}
export function normalizePinyin(value: string) {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

// Match the server review contract: lower(trim(value)); preserve internal spaces and accents.
export function normalizeReviewAnswer(value: string) {
  return value.trim().toLowerCase();
}
