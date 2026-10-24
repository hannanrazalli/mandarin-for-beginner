import { z } from "zod";

// Keep browser validation compatible with strict script-src without eval/new Function.
z.config({ jitless: true });

export { z };
