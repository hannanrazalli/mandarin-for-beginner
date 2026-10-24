import { useState, useSyncExternalStore } from "react";
import { useAuth } from "../auth/AuthProvider";
import { verifyOwnerResult } from "../auth/owner";
import { useSettings } from "../lib/settings";
import {
  discardPendingAndAcknowledgeRejections,
  getOfflineSession,
  hasRejectedOutcome,
  lease,
  listIntents,
  offlineTick,
  subscribeOffline,
} from "./store";
export default function OfflineStatus() {
  const auth = useAuth();
  const ms = useSettings().language === "ms";
  useSyncExternalStore(subscribeOffline, offlineTick);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState(false);
  const session = getOfflineSession();
  if (!session) return null;
  const pending = listIntents(session).length;
  const conflict = hasRejectedOutcome();
  async function resolveConflicts() {
    const token = lease();
    if (!token || auth.status !== "owner" || !auth.client || resolving) return;
    setResolving(true);
    setError(false);
    try {
      const check = await verifyOwnerResult(auth.client, token.valid);
      if (
        !token.valid() ||
        check.kind !== "verified" ||
        check.owner.id !== token.session.ownerId
      )
        throw new Error("Owner verification unavailable");
      const { learningQueryClient } = await import("../learning/cloud");
      if (!token.valid()) throw new Error("Expired lease");
      await learningQueryClient.refetchQueries(
        { queryKey: ["owner", token.session.ownerId], type: "active" },
        { throwOnError: true },
      );
      if (!token.valid()) throw new Error("Expired lease");
      discardPendingAndAcknowledgeRejections();
    } catch {
      if (token.valid()) setError(true);
    } finally {
      if (token.valid()) setResolving(false);
    }
  }
  return auth.status === "ownerOffline" || pending || conflict ? (
    <aside className="offline-status" role="status">
      <strong>
        {auth.status === "ownerOffline"
          ? ms
            ? "Latihan akaun luar talian"
            : "Offline account practice"
          : ms
            ? "Menunggu pengesahan pelayan"
            : "Awaiting server confirmation"}
      </strong>
      <p className="offline-description">
        {pending}{" "}
        {ms
          ? "percubaan menunggu pengesahan. Laluan seterusnya dibuka sementara; XP dan streak belum disahkan. Data menunggu boleh hilang selepas log keluar, sesi tamat atau tab ditutup."
          : "unconfirmed events. Unlocks are provisional; XP and streaks are unconfirmed. Pending work can be lost after logout, expiry or tab closure."}
      </p>
      {conflict && (
        <>
          <p className="offline-description">
            {ms
              ? "Sebahagian jawapan tidak dapat diselaraskan. Tindakan berikut menyemak kemajuan akaun dan membuang semua jawapan menunggu, termasuk latihan yang bergantung padanya. Kemajuan yang sudah disahkan kekal. Mulakan percubaan baharu selepas itu."
              : "A permanent conflict needs your decision. The action below refreshes server progress and discards all pending answers, including dependent answers. Existing outcome records are preserved. You can then start a new attempt."}
          </p>
          <button
            type="button"
            className="button secondary"
            disabled={resolving || auth.status !== "owner"}
            onClick={() => void resolveConflicts()}
          >
            {resolving
              ? "…"
              : ms
                ? "Segar semula dan buang jawapan menunggu"
                : "Refresh and discard pending answers"}
          </button>
        </>
      )}
      {error && (
        <p className="offline-description">
          {ms
            ? "Tindakan belum dapat disahkan sepenuhnya. Semak kemajuan akaun sebelum mencuba lagi."
            : "The action could not be fully confirmed. Review synced progress before retrying."}
        </p>
      )}
      <button type="button" className="button secondary" onClick={auth.retry}>
        {ms ? "Semak sambungan dan cuba lagi" : "Verify connection and retry"}
      </button>
    </aside>
  ) : null;
}
