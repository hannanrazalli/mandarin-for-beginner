import assert from "node:assert/strict";
import test from "node:test";
import { compact, inspectReading } from "./audit-content.mjs";

test("lexical tones preserved while connected speech is separately reported", () => {
  const reading = inspectReading("不是", "bù shì");
  assert.equal(reading.dictionary, "bù shì");
  assert.equal(reading.spoken, "bú shì");
  assert.equal(reading.issues.length, 0);
  assert.ok(reading.heteronyms.length);
  assert.equal(compact("Zhōngguó"), compact("zhōng guó"));
});
test("mismatch, numbered tones and sound-only items cannot pass unnoticed", () => {
  assert.ok(inspectReading("妈", "mǎ").issues.length);
  assert.ok(inspectReading("妈", "ma1").issues.length);
  assert.ok(inspectReading("", "b").issues.length);
  assert.deepEqual(inspectReading("你好", "nǐ hǎo").tones, [3, 3]);
});
