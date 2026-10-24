import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const overlay = read("content/localization.json");
const titles = new Set();
const items = new Set();
const topics = new Set();
const text = (value, label) =>
  assert.ok(
    typeof value === "string" && value.trim().length > 0,
    `Missing translation: ${label}`,
  );
for (const file of readdirSync("content/lessons").filter((file) =>
  file.endsWith(".json"),
)) {
  const lesson = read(`content/lessons/${file}`);
  titles.add(lesson.id);
  text(overlay.lessons[lesson.id]?.title_en, `${lesson.id}/title_en`);
  for (const item of lesson.items) {
    items.add(item.id);
    const translated = overlay.items[item.id];
    assert.ok(translated, `Missing item ${item.id}`);
    for (const field of ["meaning_ms", "meaning_en", "tone_note_en"])
      text(translated[field], `${item.id}/${field}`);
    if (item.kind === "pronunciation")
      text(translated.explanation_en, `${item.id}/explanation_en`);
    else {
      assert.equal(
        translated.meaning_ms,
        item.meaning_ms,
        `Canonical meaning changed: ${item.id}`,
      );
      text(translated.example_meaning_en, `${item.id}/example_meaning_en`);
      topics.add(item.topic);
    }
  }
}
assert.deepEqual(Object.keys(overlay.lessons).sort(), [...titles].sort());
assert.deepEqual(Object.keys(overlay.items).sort(), [...items].sort());
for (const topic of topics)
  for (const language of ["ms", "en"])
    text(overlay.topics[topic]?.[language], `${topic}/${language}`);
console.log(
  `PASS: ${titles.size} lesson titles, ${items.size} item meanings/notes and ${topics.size} topics localized; canonical meanings unchanged.`,
);
