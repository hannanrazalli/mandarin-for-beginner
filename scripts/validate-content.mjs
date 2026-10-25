import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));
const schema = read("docs/content.schema.json");
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(
  schema,
);
const index = read("content/index.json");
assert.equal(index.schema_version, 1);
assert.equal(typeof index.hsk_edition, "string");
assert.ok(Array.isArray(index.units) && index.units.length >= 2);
const approved = read("content/approved-words.json");
assert.equal(
  approved.length,
  300,
  "Approved expansion list must contain 300 entries",
);
assert.equal(new Set(approved.map((word) => word.hanzi)).size, approved.length);
const approvedMap = new Map(
  approved.map((word, i) => {
    assert.equal(word.id, `w${String(i + 1).padStart(3, "0")}`);
    assert.ok(word.hanzi && word.topic);
    return [word.id, word];
  }),
);
const lessons = new Map();
const reviewStatuses = read("content/review-status.json");
assert.equal(reviewStatuses.schema_version, 1);
const checkedIds = new Set();
let itemCount = 0;
const activeWords = new Set();
for (const file of readdirSync(join(root, "content/lessons"))) {
  if (!file.endsWith(".json")) continue;
  const lesson = read(`content/lessons/${file}`);
  assert.ok(validate(lesson), `${file}: ${JSON.stringify(validate.errors)}`);
  assert.equal(file, `${lesson.id}.json`);
  assert.ok(!lessons.has(lesson.id), "Duplicate lesson ID");
  assert.equal(
    new Set(lesson.items.map((item) => item.id)).size,
    lesson.items.length,
  );
  for (const item of lesson.items) {
    checkedIds.add(item.id);
    assert.ok(
      ["unverified", "machine-checked", "human-verified"].includes(
        reviewStatuses.items[item.id]?.reviewStatus,
      ),
      `Missing review status: ${item.id}`,
    );
    assert.equal(
      item.needs_review,
      false,
      `Hold uncertain item out of active curriculum: ${item.id}`,
    );
    assert.equal(
      item.pinyin,
      item.pinyin.normalize("NFC"),
      `Normalize pinyin: ${item.id}`,
    );
    assert.ok(!/[0-5]/.test(item.pinyin), `Use marked pinyin: ${item.id}`);
    assert.ok(
      /\p{Script=Han}/u.test(item.audio.text),
      `Audio needs a Chinese sample: ${item.id}`,
    );
    if (item.kind === "vocabulary") {
      assert.ok(
        !activeWords.has(item.id),
        `Duplicate vocabulary ID: ${item.id}`,
      );
      activeWords.add(item.id);
      assert.equal(
        approvedMap.get(item.id)?.hanzi,
        item.hanzi,
        `Word is not approved: ${item.id}`,
      );
      for (const field of ["topic", "hsk_level", "hsk_edition"])
        assert.equal(
          item[field],
          approvedMap.get(item.id)?.[field],
          `Approved metadata changed: ${item.id}/${field}`,
        );
    }
  }
  itemCount += lesson.items.length;
  lessons.set(lesson.id, lesson);
}
const referenced = new Set();
const unitIDs = new Set();
const firstWords = [];
for (const [position, unit] of index.units.entries()) {
  assert.equal(
    unit.position,
    position,
    "Unit ordering must start at 0 without gaps",
  );
  assert.ok(!unitIDs.has(unit.id) && unit.title_ms && unit.title_en);
  unitIDs.add(unit.id);
  assert.ok(Array.isArray(unit.lesson_ids) && unit.lesson_ids.length > 0);
  for (const id of unit.lesson_ids) {
    assert.ok(!referenced.has(id), "Lesson appears in multiple units");
    const lesson = lessons.get(id);
    assert.ok(lesson, `Missing referenced lesson ${id}`);
    assert.equal(lesson.unit, position);
    referenced.add(id);
    if (position === 1)
      firstWords.push(
        ...lesson.items.filter((item) => item.kind === "vocabulary"),
      );
  }
}
assert.equal(
  referenced.size,
  lessons.size,
  "Unindexed lesson files must not be bundled",
);
assert.deepEqual(
  Object.keys(reviewStatuses.items).sort(),
  [...checkedIds].sort(),
  "Review status IDs must match the curriculum exactly",
);
assert.ok(firstWords.length >= 20);
assert.equal(
  activeWords.size,
  approved.length,
  "Publish the complete reviewed 300-word list",
);
assert.deepEqual(
  firstWords.slice(0, 20).map((word) => word.hanzi),
  approved.slice(0, 20).map((word) => word.hanzi),
);
console.log(
  `PASS: ${index.units.length} units, ${lessons.size} lessons, ${itemCount} active items; 300 approved expansion words.`,
);
