import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pinyin, polyphonic } from "pinyin-pro";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));
export const compact = (value) =>
  value
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\s\p{P}]/gu, "");

// Compare lexical tones. Surface sandhi is reported separately, never used to rewrite answers.
export function inspectReading(hanzi, declared) {
  const characters = [...hanzi].filter((c) => /\p{Script=Han}/u.test(c));
  const chinese = characters.join("");
  const dictionary = pinyin(chinese, { toneSandhi: false, type: "array" });
  const spoken = pinyin(chinese, {
    toneSandhi: { yi: true, bu: true, thirdTone: true },
    type: "array",
  });
  const alternatives = polyphonic(chinese, { type: "array" });
  const heteronyms = characters.flatMap((char, i) =>
    alternatives[i]?.length > 1
      ? [`${char}: ${alternatives[i].join("/")}`]
      : [],
  );
  const issues = [];
  if (!characters.length)
    issues.push("No hanzi: sound-only item requires human phonetics review");
  if (/[0-5]/u.test(declared)) issues.push("Numbered or mixed tone notation");
  if (declared !== declared.normalize("NFC"))
    issues.push("Pinyin is not NFC normalized");
  if (characters.length && compact(declared) !== compact(dictionary.join(" ")))
    issues.push(
      "Reading differs: check context, neutral tone, spacing and dictionary limitations",
    );
  return {
    dictionary: dictionary.join(" "),
    spoken: spoken.join(" "),
    heteronyms,
    issues,
    tones: pinyin(chinese, { type: "all", toneSandhi: false })
      .filter((v) => v.isZh)
      .map((v) => (v.num === 5 ? 0 : v.num)),
  };
}

export function buildAudit() {
  const rows = [];
  const statuses = {};
  const lessons = readdirSync(join(root, "content/lessons"))
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => read(`content/lessons/${f}`));
  for (const lesson of lessons)
    for (const item of lesson.items) {
      const head = inspectReading(item.hanzi ?? "", item.pinyin);
      const example = item.example
        ? inspectReading(item.example.hanzi, item.example.pinyin)
        : null;
      const issues = [
        ...head.issues,
        ...(example?.issues.map((issue) => `Example: ${issue}`) ?? []),
      ];
      if (
        item.kind === "pronunciation" &&
        item.tones.length &&
        head.tones.length === item.tones.length &&
        head.tones.some((tone, i) => tone !== item.tones[i])
      )
        issues.push(
          "Declared tone vector differs from dictionary; human review needed",
        );
      const ambiguous = head.heteronyms.length || example?.heteronyms.length;
      // Machine-checked is narrowly a matching reading, not a correctness or translation certificate.
      statuses[item.id] = {
        reviewStatus:
          issues.length || ambiguous ? "unverified" : "machine-checked",
      };
      rows.push({
        id: item.id,
        lesson: lesson.id,
        item,
        head,
        example,
        issues,
        ambiguous,
      });
    }
  const practicePath = join(root, "content/practice-dialogues.json");
  const practice = [];
  if (existsSync(practicePath)) {
    const walk = (value, path) => {
      if (!value || typeof value !== "object") return;
      if (typeof value.hanzi === "string" && typeof value.pinyin === "string")
        practice.push({
          path,
          hanzi: value.hanzi,
          declared: value.pinyin,
          ...inspectReading(value.hanzi, value.pinyin),
        });
      for (const [key, child] of Object.entries(value))
        if (typeof child === "object") walk(child, `${path}.${key}`);
    };
    walk(read("content/practice-dialogues.json"), "practice");
  }
  const count = Object.values(statuses).filter(
    (s) => s.reviewStatus === "machine-checked",
  ).length;
  const lines = [
    "# Content audit / Audit kandungan",
    "",
    "Reproducible source: pinyin-pro 3.29.5 (MIT), installed as a development-only dependency.",
    "Run `node scripts/audit-content.mjs` to regenerate; `--check` checks drift without writing.",
    "",
    `Scope: ${lessons.length} lessons, ${rows.length} items; ${count} machine-checked readings, ${rows.length - count} unverified. ${practice.length} new practice text readings inspected; all new practice remains unverified.`,
    "",
    "This is an independent software comparison, not a native-speaker or translation review. Machine agreement can share errors. Neutral-tone variants and polyphonic context need a human. Original lessons, answer keys, versions and progress are never rewritten.",
    "",
    "## Reading discrepancies / Perbezaan bacaan",
    "",
    "Candidates below are suggestions, not accepted corrections. Confidence: medium for a machine discrepancy, low that the proposed reading is the correct teaching choice. Check lexical vs connected-speech forms before editing.",
    "",
    "| Item | Current | Machine dictionary | Finding / suggested review |",
    "| --- | --- | --- | --- |",
  ];
  for (const row of rows.filter((r) => r.issues.length))
    lines.push(
      `| ${row.id} | ${row.item.pinyin} | ${row.head.dictionary || "—"}${row.example ? `; example: ${row.example.dictionary}` : ""} | ${row.issues.join("; ")} |`,
    );
  lines.push(
    "",
    "## Polyphonic context / Bacaan berbilang",
    "",
    "These labels list possible dictionary readings, not acceptable interchangeable answers. Every listed item stays unverified pending context review.",
    "",
    "| Item | Possible readings |",
    "| --- | --- |",
  );
  for (const row of rows.filter((r) => r.ambiguous))
    lines.push(
      `| ${row.id} | ${[...row.head.heteronyms, ...(row.example?.heteronyms ?? [])].join("; ")} |`,
    );
  lines.push(
    "",
    "## Sandhi / Perubahan nada",
    "",
    "Dictionary pinyin stays the answer contract. For 3+3, the first third tone usually rises; 不 is normally bú before tone 4; 一 changes before following tones but counting, ordinal and emphatic contexts differ. Software surface predictions are hints only and cannot validate TTS output. Unit 0 already distinguishes lexical and connected speech.",
    "",
    "| Item | Lexical form | Possible connected speech |",
    "| --- | --- | --- |",
  );
  for (const row of rows.filter(
    (r) => compact(r.head.dictionary) !== compact(r.head.spoken),
  ))
    lines.push(`| ${row.id} | ${row.head.dictionary} | ${row.head.spoken} |`);
  lines.push(
    "",
    "## New practice readings / Bacaan latihan baharu",
    "",
    "| Location | Hanzi | Draft pinyin | Machine suggestion | Review |",
    "| --- | --- | --- | --- | --- |",
  );
  for (const row of practice)
    lines.push(
      `| ${row.path} | ${row.hanzi} | ${row.declared} | ${row.dictionary} | ${row.issues.length ? row.issues.join("; ") : "Machine match; still unverified"}${row.heteronyms.length ? `; ${row.heteronyms.join("; ")}` : ""} |`,
    );
  lines.push(
    "",
    "## Malay / English translation review",
    "",
    "No automatic translation validator is claimed. All 370 bilingual meanings and all 300 example translations remain candidates for human review. Prioritize sound samples (standalone initials have no word meaning), neutral-tone variants above, polyphonic words, measure words, aspect 了/着, particles, kinship, and Malaysian food/currency terms. Review full meaning and natural usage together, not word-for-word translations.",
    "",
    "| Item | Hanzi | Malay draft | English draft |",
    "| --- | --- | --- | --- |",
  );
  const translations = read("content/localization.json").items;
  for (const row of rows.filter(
    (r) => r.issues.length || r.ambiguous || r.item.kind === "pronunciation",
  ))
    lines.push(
      `| ${row.id} | ${row.item.hanzi ?? "—"} | ${translations[row.id].meaning_ms} | ${translations[row.id].meaning_en} |`,
    );
  lines.push(
    "",
    "All device TTS and draft practice audio remain unverified. No human-verified content/audio is asserted. Review status describes textual machine comparison only; existing teacher drafting is not relabelled as human listening verification.",
    "",
  );
  return {
    statuses: `${JSON.stringify({ schema_version: 1, source: "pinyin-pro@3.29.5; lexical readings only", items: statuses }, null, 2)}\n`,
    report: lines.join("\n"),
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const output = buildAudit();
  for (const [path, value] of [
    ["content/review-status.json", output.statuses],
    ["docs/CONTENT_AUDIT.md", output.report],
  ]) {
    if (process.argv.includes("--check"))
      assert.equal(
        readFileSync(join(root, path), "utf8"),
        value,
        `Stale audit: ${path}`,
      );
    else writeFileSync(join(root, path), value);
  }
  console.log(
    "PASS: independent reading audit and review-status overlay; no canonical content modified.",
  );
}
