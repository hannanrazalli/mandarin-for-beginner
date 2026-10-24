import type { PublicAuthClient } from "../lib/supabase";
import { classifyError } from "../offline/dispatch";
export type OwnerVerification =
  | { kind: "verified"; owner: { id: string; email: string } }
  | { kind: "denied" }
  | { kind: "unavailable" };
export async function verifyOwnerResult(
  client: PublicAuthClient,
  isCurrent: () => boolean = () => true,
): Promise<OwnerVerification> {
  let expired = false;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const work = async (): Promise<OwnerVerification> => {
    try {
      const { data, error } = await client.auth.getUser();
      if (expired || !isCurrent()) return { kind: "unavailable" };
      if (error)
        return {
          kind: classifyError(error) === "transient" ? "unavailable" : "denied",
        };
      if (!data.user?.email_confirmed_at) return { kind: "denied" };
      const query = client.from("profiles").select("id").eq("id", data.user.id);
      const profile = await (typeof query.abortSignal === "function"
        ? query.abortSignal(controller.signal)
        : query
      ).maybeSingle();
      if (expired || !isCurrent()) return { kind: "unavailable" };
      if (profile.error)
        return {
          kind:
            classifyError({ ...profile.error, status: profile.status }) ===
            "transient"
              ? "unavailable"
              : "denied",
        };
      if (!profile.data || profile.data.id !== data.user.id)
        return { kind: "denied" };
      return {
        kind: "verified",
        owner: { id: data.user.id, email: data.user.email ?? "" },
      };
    } catch (error) {
      return {
        kind:
          expired || classifyError(error) === "transient"
            ? "unavailable"
            : "denied",
      };
    }
  };
  try {
    return await Promise.race([
      work(),
      new Promise<OwnerVerification>((resolve) => {
        timer = setTimeout(() => {
          expired = true;
          controller.abort();
          resolve({ kind: "unavailable" });
        }, 8000);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
export async function verifiedOwner(client: PublicAuthClient) {
  const result = await verifyOwnerResult(client);
  return result.kind === "verified" ? result.owner : null;
}
