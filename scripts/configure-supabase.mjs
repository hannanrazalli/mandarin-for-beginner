import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Accept a PUBLIC project URL only. No keys or passwords are accepted by this script.
const input = process.argv[2] ?? process.env.VITE_SUPABASE_URL ?? "";
let url;
try {
  url = new URL(input);
} catch {
  console.error(
    "Usage: node scripts/configure-supabase.mjs https://PROJECT-REFERENCE.supabase.co",
  );
  process.exit(1);
}
if (
  url.protocol !== "https:" ||
  !/^[a-z0-9]+\.supabase\.co$/.test(url.hostname) ||
  url.username ||
  url.password ||
  url.port ||
  url.pathname !== "/" ||
  url.search ||
  url.hash
) {
  throw new Error(
    "Use only the public https://PROJECT-REFERENCE.supabase.co URL.",
  );
}
const path = fileURLToPath(new URL("../vercel.json", import.meta.url));
const config = JSON.parse(readFileSync(path, "utf8"));
const csp = config.headers[0].headers.find(
  (header) => header.key === "Content-Security-Policy",
);
csp.value = csp.value.replace(
  /connect-src[^;]*/,
  `connect-src 'self' ${url.origin}`,
);
writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
console.log(
  "Allowed the exact public Supabase origin in CSP. Rebuild and redeploy to apply.",
);
