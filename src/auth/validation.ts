import { z } from "zod";
export const loginSchema = z.object({
  email: z.string().trim().max(254).pipe(z.email()),
  password: z.string().min(8).max(128),
});
