import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stagedOnly = process.argv.includes("--staged");
const git = (args, options = {}) =>
  execFileSync("git", args, {
    cwd: root,
    maxBuffer: 32 * 1024 * 1024,
    ...options,
  });
const paths = git(
  stagedOnly
    ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]
    : ["ls-files", "--cached", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);

if (paths.length === 0) {
  console.log("No indexed files to scan.");
  process.exit(0);
}

const snapshot = mkdtempSync(join(tmpdir(), "belajarmandarin-secret-scan-"));
let status = 1;
try {
  // Scan the INDEX, including accidentally force-added env files, not a cleaned working copy.
  // A synthetic path outside the repository also prevents project ignore files bypassing checks.
  const files = paths.map((path) => {
    const destination = join(snapshot, path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, git(["show", `:${path}`]), { mode: 0o600 });
    return destination;
  });
  const pkgPath = join(root, "node_modules", "secretlint", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin.secretlint;
  const result = spawnSync(
    process.execPath,
    [
      resolve(dirname(pkgPath), bin),
      "--no-glob",
      "--no-gitignore",
      "--secretlintrc",
      join(root, ".secretlintrc.json"),
      ...files,
    ],
    { cwd: root, stdio: "inherit" },
  );
  if (result.error) throw result.error;
  status = result.status ?? 1;
} finally {
  rmSync(snapshot, { recursive: true, force: true });
}
process.exit(status);
