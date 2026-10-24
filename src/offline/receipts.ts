import { useSyncExternalStore } from "react";
import { registerAccountPurger } from "../auth/purge";
import {
  eventOutcome,
  type Intent,
  type lease,
  notifyOffline,
  offlineTick,
  subscribeOffline,
} from "./store";

type SavedReceipt = {
  kind: Intent["kind"];
  data: unknown;
  valid: () => boolean;
};
const receipts = new Map<string, SavedReceipt>();
registerAccountPurger(() => {
  receipts.clear();
});
export function rememberReceipt(
  event: Intent,
  data: unknown,
  token: NonNullable<ReturnType<typeof lease>>,
) {
  if (
    !token.valid() ||
    token.session.ownerId !== event.ownerId ||
    token.session.sessionId !== event.sessionId
  )
    return false;
  if (receipts.size >= 1000)
    receipts.delete(receipts.keys().next().value ?? "");
  receipts.set(event.args.p_event_id, {
    kind: event.kind,
    data,
    valid: token.valid,
  });
  return true;
}
export function receiptFor(eventId: string | null, kind: Intent["kind"]) {
  if (!eventId) return null;
  const value = receipts.get(eventId);
  if (!value || value.kind !== kind || !value.valid()) return null;
  return value.data;
}
export function useEventResolution(
  eventId: string | null,
  kind: Intent["kind"],
) {
  useSyncExternalStore(subscribeOffline, offlineTick);
  return { outcome: eventOutcome(eventId), receipt: receiptFor(eventId, kind) };
}
export function clearReceipts() {
  receipts.clear();
  notifyOffline();
}
