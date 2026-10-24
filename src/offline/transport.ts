import { z } from "../lib/zod-config";
export type RpcTransport = { eventId: string; status: number; retryAt: number };
export function retryAfterDeadline(header: string | null, now = Date.now()) {
  if (!header) return 0;
  const numeric = Number(header);
  const delay = Number.isFinite(numeric)
    ? numeric * 1000
    : Date.parse(header) - now;
  return Number.isFinite(delay) && delay > 0
    ? now + Math.min(300000, delay)
    : 0;
}
export function createRpcTransport(
  baseFetch: typeof fetch = globalThis.fetch.bind(globalThis),
) {
  let sealed = false;
  const responses = new Map<string, RpcTransport>();
  const wrapped: typeof fetch = async (input, init) => {
    let eventId: string | null = null;
    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (
        /\/rest\/v1\/rpc\/(complete_lesson|review_word|test_out_unit)(?:\?|$)/.test(
          url,
        ) &&
        typeof init?.body === "string"
      ) {
        const body: unknown = JSON.parse(init.body);
        if (body && typeof body === "object") {
          const id = (body as Record<string, unknown>).p_event_id;
          if (z.uuid().safeParse(id).success) eventId = String(id);
        }
      }
    } catch {
      /* Never retain request bodies or credentials. */
    }
    const response = await baseFetch(input, init);
    if (!sealed && eventId) {
      if (responses.size >= 1000 && !responses.has(eventId))
        responses.delete(responses.keys().next().value ?? "");
      responses.set(eventId, {
        eventId,
        status: response.status,
        retryAt: retryAfterDeadline(response.headers.get("Retry-After")),
      });
    }
    return response;
  };
  return {
    fetch: wrapped,
    take(eventId: string) {
      if (sealed) return null;
      const value = responses.get(eventId) ?? null;
      responses.delete(eventId);
      return value;
    },
    seal() {
      sealed = true;
      responses.clear();
    },
  };
}
