import { execFileSync } from "node:child_process";

// No downloads or shell interpolation. Keep someone else's hook setup intact.
if (!process.env.CI) {
  try {
    const existing = execFileSync(
      "git",
      ["config", "--get", "core.hooksPath"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
    if (existing !== ".githooks") {
      console.log(
        "Existing Git hooks retained. Run pnpm secrets:check before commits.",
      );
    }
  } catch (error) {
    if (error.status === 1) {
      execFileSync("git", ["config", "--local", "core.hooksPath", ".githooks"]);
      console.log("Secret-scanning pre-commit hook enabled.");
    } else {
      console.log(
        "Git hooks unavailable here. CI still requires secret scanning.",
      );
    }
  }
}
