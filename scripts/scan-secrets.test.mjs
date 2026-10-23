import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("scanner checks indexed blobs even when the working copy is clean", () => {
  const fixture = mkdtempSync(join(tmpdir(), "belajarmandarin-scan-test-"));
  try {
    mkdirSync(join(fixture, "scripts"));
    copyFileSync(
      join(root, "scripts/scan-secrets.mjs"),
      join(fixture, "scripts/scan-secrets.mjs"),
    );
    copyFileSync(
      join(root, ".secretlintrc.json"),
      join(fixture, ".secretlintrc.json"),
    );
    symlinkSync(
      join(root, "node_modules"),
      join(fixture, "node_modules"),
      "junction",
    );
    const git = (args) =>
      execFileSync("git", args, { cwd: fixture, stdio: "ignore" });
    const scan = (...args) =>
      spawnSync(process.execPath, ["scripts/scan-secrets.mjs", ...args], {
        cwd: fixture,
        encoding: "utf8",
      });
    git(["init", "--quiet"]);
    const empty = scan("--staged");
    assert.equal(empty.status, 0, `empty index should pass: ${empty.stderr}`);
    writeFileSync(join(fixture, "note.txt"), "This is a harmless note.\n");
    git(["add", "note.txt"]);
    assert.equal(scan("--staged").status, 0, "safe staged text should pass");
    // A synthetic, nonfunctional token fixture. Assemble it so the real repo has no token.
    const fake = ["ghp", "Ab9Cd8Ef7Gh6Ij5Kl4Mn3Op2Qr1St0Uv9Wx8"].join("_");
    writeFileSync(join(fixture, "note.txt"), `token=${fake}\n`);
    git(["add", "note.txt"]);
    writeFileSync(
      join(fixture, "note.txt"),
      "Working copy has been cleaned.\n",
    );
    assert.equal(
      scan("--staged").status,
      1,
      "staged secret must be rejected despite clean worktree",
    );
    assert.equal(scan().status, 1, "whole-index CI scan must also reject it");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
