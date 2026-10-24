import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type PublicAuthClient,
  renewPublicClient,
  revokePublicSession,
  sealPublicClient,
  supabase,
} from "../lib/supabase";
import { drainQueue, setDispatchVerifier } from "../offline/dispatch";
import {
  beginCredentialLogin,
  captureMarkerGuard,
  captureOfflinePurgeTarget,
  credentialLoginRequired,
  getOfflineSession,
  liveSession,
  readOwnerMarker,
  requireCredentialLogin,
  restoreOwnerSession,
  setOfflineSession,
  type VerifiedOwnerSession,
  verifyMarker,
} from "../offline/store";
import { verifyOwnerResult } from "./owner";
import { purgeAccountData } from "./purge";
import {
  remainingAppSession,
  SESSION_STARTED_KEY,
  startAppSession,
} from "./session";
import { loginSchema } from "./validation";

type Owner = { id: string; email: string };
type Status =
  | "unconfigured"
  | "initializing"
  | "signedOut"
  | "ownerOffline"
  | "owner"
  | "blocked"
  | "error";
type Message =
  | "invalid"
  | "failed"
  | "loggedOut"
  | "globalOut"
  | "sessionExpired"
  | "logoutFailed"
  | null;
type AuthContextValue = {
  canSync?: boolean;
  ownerSession?: VerifiedOwnerSession | null;
  client: PublicAuthClient | null;
  status: Status;
  owner: Owner | null;
  pending: boolean;
  message: Message;
  login: (email: string, password: string) => Promise<boolean>;
  logout: (global?: boolean) => Promise<void>;
  retry: () => void;
};
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({
  children,
  client: initialClient = supabase,
}: {
  children: ReactNode;
  client?: PublicAuthClient | null;
}) {
  const [client, setClient] = useState(initialClient);
  const [status, setStatus] = useState<Status>(
    client ? "initializing" : "unconfigured",
  );
  const [ownerSession, setOwnerSession] = useState<VerifiedOwnerSession | null>(
    restoreOwnerSession,
  );
  const [owner, setOwner] = useState<Owner | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [attempt, setAttempt] = useState(0);
  const revision = useRef(0);
  const mounted = useRef(true);
  const signingOut = useRef(false);
  const stopSubscription = useRef(() => {});
  const accessToken = useRef<string | null>(null);
  const endSession = useCallback(
    async (global = false, expired = false, blocked = false) => {
      if (!client || signingOut.current) return;
      signingOut.current = true;
      const token = accessToken.current;
      accessToken.current = null;
      ++revision.current;
      setOwner(null);
      setOwnerSession(null);
      setStatus(blocked ? "blocked" : "signedOut");
      setPending(true);
      setMessage(null);
      const priorMarker = restoreOwnerSession() ?? readOwnerMarker();
      captureOfflinePurgeTarget(priorMarker);
      if (priorMarker) setOfflineSession(priorMarker);
      let localFailed = false;
      try {
        sealPublicClient(client);
      } catch {
        localFailed = true;
      }
      stopSubscription.current();
      // Invoke every local purge now, before remote revocation or any await.
      const purge = purgeAccountData();
      let purgeFailed = false;
      void purge.catch(() => {
        purgeFailed = true;
      });
      const revoked = await revokePublicSession(client, token, global);
      // Private stores must clear synchronously; optional asynchronous cleanup cannot hold UI pending.
      if (mounted.current) {
        setMessage(
          localFailed || purgeFailed || !revoked
            ? "logoutFailed"
            : expired
              ? "sessionExpired"
              : global
                ? "globalOut"
                : "loggedOut",
        );
        setPending(false);
        setClient(renewPublicClient(client));
      }
      signingOut.current = false;
    },
    [client],
  );
  const verify = useCallback(async () => {
    if (!client || signingOut.current) return;
    if (remainingAppSession() <= 0) {
      await endSession(false, true);
      return;
    }
    const markerGuard = captureMarkerGuard();
    if (!markerGuard.valid()) {
      requireCredentialLogin();
      await endSession(false, false, true);
      return;
    }
    const revisionAtStart = ++revision.current;
    setStatus("initializing");
    setOwner(null);
    try {
      const verified = await verifyOwnerResult(
        client,
        () =>
          mounted.current &&
          !signingOut.current &&
          revisionAtStart === revision.current &&
          markerGuard.valid(),
      );
      if (
        !mounted.current ||
        signingOut.current ||
        revisionAtStart !== revision.current
      )
        return;
      if (!markerGuard.valid()) {
        requireCredentialLogin();
        await endSession(false, false, true);
        return;
      }
      if (remainingAppSession() <= 0) {
        await endSession(false, true);
        return;
      }
      if (verified.kind === "verified") {
        const old = restoreOwnerSession();
        if (old && old.ownerId !== verified.owner.id) {
          await endSession(false, false, true);
          return;
        }
        let marker: VerifiedOwnerSession | null = null;
        try {
          marker = verifyMarker(verified.owner.id, markerGuard);
        } catch {
          if (!markerGuard.valid()) {
            requireCredentialLogin();
            await endSession(false, false, true);
            return;
          }
          /* Offline storage unavailable; canonical online use remains possible. */
        }
        if (marker && !liveSession(marker)) {
          requireCredentialLogin();
          await endSession(false, false, true);
          return;
        }
        setOwnerSession(marker);
        setOwner(verified.owner);
        setStatus("owner");
      } else if (verified.kind === "unavailable") {
        const marker = restoreOwnerSession();
        if (marker) {
          setOfflineSession(marker);
          setOwnerSession(marker);
          setOwner({ id: marker.ownerId, email: "" });
          setStatus("ownerOffline");
        } else {
          setOwner(null);
          setStatus("error");
        }
      } else {
        await endSession(false, false, true);
      }
    } catch {
      if (mounted.current && revisionAtStart === revision.current) {
        setOwner(null);
        setStatus("error");
      }
    }
  }, [client, endSession]);
  useEffect(() => {
    if (status !== "owner" && status !== "ownerOffline") return;
    const check = () => {
      if (remainingAppSession() <= 0) void endSession(false, true);
    };
    const timer = setTimeout(check, remainingAppSession());
    document.addEventListener("visibilitychange", check);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [status, endSession]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: The retry counter deliberately restarts initialization.
  useEffect(() => {
    mounted.current = true;
    if (!client) return;
    let active = true;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (!active || signingOut.current) return;
      if (event === "SIGNED_OUT") {
        void endSession();
      } else if (session && (navigator.onLine || restoreOwnerSession())) {
        accessToken.current = session.access_token;
        queueMicrotask(() => {
          if (active && !signingOut.current) void verify();
        });
      }
    });
    stopSubscription.current = () => {
      active = false;
      subscription.unsubscribe();
    };
    if (credentialLoginRequired() && !readOwnerMarker()) {
      setOwner(null);
      setStatus("blocked");
      return () => {
        active = false;
        mounted.current = false;
        subscription.unsubscribe();
      };
    }
    const startupGuard = captureMarkerGuard();
    if (!startupGuard.valid()) {
      requireCredentialLogin();
      void endSession(false, false, true);
      return () => {
        active = false;
        mounted.current = false;
        subscription.unsubscribe();
      };
    }
    const offlineMarker = restoreOwnerSession();
    if (!navigator.onLine) {
      if (offlineMarker) {
        setOfflineSession(offlineMarker);
        setOwnerSession(offlineMarker);
        setOwner({ id: offlineMarker.ownerId, email: "" });
        setStatus("ownerOffline");
      } else {
        setOwner(null);
        setStatus("signedOut");
      }
    } else
      void client.auth
        .getSession()
        .then(({ data, error }) => {
          if (!active || signingOut.current) return;
          if (error) {
            void verify();
            return;
          }
          if (!data.session) {
            setStatus((previous) =>
              previous === "blocked" ? "blocked" : "signedOut",
            );
            return;
          }
          accessToken.current = data.session.access_token;
          void verify();
        })
        .catch(() => {
          if (active) setStatus("error");
        });
    return () => {
      active = false;
      mounted.current = false;
      ++revision.current;
      subscription.unsubscribe();
    };
  }, [client, verify, endSession, attempt]);
  useEffect(() => {
    const recheck = () => {
      if (ownerSession && !liveSession(ownerSession)) {
        void endSession(false, true);
        return;
      }
      if (
        document.visibilityState !== "hidden" &&
        navigator.onLine &&
        restoreOwnerSession()
      )
        void verify();
    };
    const epochChange = (event: StorageEvent) => {
      if (
        ownerSession &&
        event.key === `bm-owner-epoch:${ownerSession.ownerId}` &&
        !liveSession(ownerSession)
      )
        void endSession(false, true);
    };
    window.addEventListener("online", recheck);
    window.addEventListener("storage", epochChange);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      window.removeEventListener("online", recheck);
      window.removeEventListener("storage", epochChange);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, [ownerSession, verify, endSession]);
  useEffect(() => {
    if (status !== "owner" || !client || !ownerSession) {
      setDispatchVerifier(null);
      return;
    }
    let active = true;
    setDispatchVerifier(async () => {
      const captured = getOfflineSession();
      if (!active || !captured || !liveSession(captured)) return false;
      const check = await verifyOwnerResult(
        client,
        () => active && liveSession(captured),
      );
      if (!active || !liveSession(captured)) return false;
      if (check.kind !== "verified" || check.owner.id !== captured.ownerId) {
        if (
          check.kind === "denied" ||
          (check.kind === "verified" && check.owner.id !== captured.ownerId)
        )
          void endSession(false, false, true);
        else void verify();
        return false;
      }
      return true;
    });
    const timer = setInterval(() => {
      if (active)
        void drainQueue(client).then((count) => {
          if (count && active)
            void import("../learning/cloud").then(({ learningQueryClient }) => {
              if (active && liveSession(ownerSession))
                void learningQueryClient.invalidateQueries({
                  queryKey: ["owner", ownerSession.ownerId],
                });
            });
        });
    }, 1000);
    return () => {
      active = false;
      clearInterval(timer);
      setDispatchVerifier(null);
    };
  }, [status, client, ownerSession, verify, endSession]);
  const login = useCallback(
    async (email: string, password: string) => {
      if (!client || pending || signingOut.current) return false;
      const parsed = loginSchema.safeParse({ email, password });
      if (!parsed.success) {
        setMessage("invalid");
        return false;
      }
      setPending(true);
      setMessage(null);
      try {
        beginCredentialLogin();
        startAppSession();
        const { data, error } = await client.auth.signInWithPassword(
          parsed.data,
        );
        if (error) {
          sessionStorage.removeItem(SESSION_STARTED_KEY);
          setMessage("failed");
          return false;
        }
        accessToken.current = data.session?.access_token ?? accessToken.current;
        await verify();
        return true;
      } catch {
        setMessage("failed");
        return false;
      } finally {
        if (!signingOut.current) setPending(false);
      }
    },
    [client, pending, verify],
  );
  const logout = useCallback(
    async (global = false) => {
      if (!pending) await endSession(global);
    },
    [endSession, pending],
  );
  const value = useMemo(
    () => ({
      client: status === "owner" ? client : null,
      canSync: status === "owner",
      ownerSession,
      status,
      owner,
      pending,
      message,
      login,
      logout,
      retry: () => setAttempt((value) => value + 1),
    }),
    [client, status, owner, ownerSession, pending, message, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider missing");
  return value;
}
